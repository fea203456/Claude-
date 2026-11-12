#!/usr/bin/env python3
"""Монитор встроенного маркета подарков Telegram.

Только читает данные (каталог подарков и лоты на перепродаже) через
официальный MTProto API и присылает алерты. Ничего не покупает и не продаёт.

Запуск:  python monitor.py            (цикл)
         python monitor.py --once     (один проход)
         python monitor.py --list     (показать подарки с ценами флора)
"""
import argparse
import asyncio
import json
import os
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

from telethon import TelegramClient
from telethon.errors import FloodWaitError
from telethon.tl import functions, types

import analyze

HERE = Path(__file__).resolve().parent
DEFAULTS = {
    "interval_sec": 300,          # пауза между проходами
    "request_pause_sec": 2.0,     # пауза между запросами (бережём аккаунт)
    "watchlist": [],              # названия подарков; пусто = все в бюджете
    "max_floor_stars": 5000,      # при пустом watchlist: следим за флором до N звёзд
    "max_gifts_per_cycle": 25,
    "listings_per_gift": 20,
    "min_profit_pct": 10.0,       # порог алерта «лот дешевле соседей»
    "floor_drop_pct": 15.0,       # порог алерта «флор упал»
    "rare_permille": 15,          # редкость модели/фона, ‰ (15 = 1.5%)
    "rare_over_floor_pct": 20.0,
    "alert_cooldown_sec": 6 * 3600,
}


def load_config():
    cfg = dict(DEFAULTS)
    path = HERE / "config.json"
    if path.exists():
        cfg.update(json.loads(path.read_text(encoding="utf-8")))
    return cfg


def open_db():
    db = sqlite3.connect(HERE / "monitor.sqlite3")
    db.executescript("""
        CREATE TABLE IF NOT EXISTS floors(gift_id INTEGER, ts INTEGER, stars INTEGER, on_sale INTEGER);
        CREATE TABLE IF NOT EXISTS gifts(gift_id INTEGER PRIMARY KEY, title TEXT, first_seen INTEGER);
        CREATE TABLE IF NOT EXISTS alerts(key TEXT PRIMARY KEY, ts INTEGER);
    """)
    return db


def rarity_permille(rarity):
    """Редкость в промилле; у именных градаций точного числа нет."""
    p = getattr(rarity, "permille", None)
    if p is not None:
        return p
    named = {"StarGiftAttributeRarityLegendary": 1, "StarGiftAttributeRarityEpic": 5,
             "StarGiftAttributeRarityRare": 15, "StarGiftAttributeRarityUncommon": 50}
    return named.get(type(rarity).__name__)


def to_listing(g):
    """StarGiftUnique -> простой словарь для analyze.py."""
    out = {"slug": g.slug, "num": g.num, "title": g.title, "stars": None, "ton": None,
           "ton_only": bool(getattr(g, "resale_ton_only", False))}
    for amount in g.resell_amount or []:
        if isinstance(amount, types.StarsTonAmount):
            out["ton"] = amount.amount / 1e9
        elif isinstance(amount, types.StarsAmount):
            out["stars"] = amount.amount
    for a in g.attributes or []:
        if isinstance(a, types.StarGiftAttributeModel):
            out["model"], out["model_permille"] = a.name, rarity_permille(a.rarity)
        elif isinstance(a, types.StarGiftAttributeBackdrop):
            out["backdrop"], out["backdrop_permille"] = a.name, rarity_permille(a.rarity)
    return out


class Notifier:
    """Алерты: через бота (если задан BOT_TOKEN) или в «Избранное»."""

    def __init__(self, client, db, cooldown):
        self.client, self.db, self.cooldown = client, db, cooldown
        self.bot_token = os.environ.get("TG_BOT_TOKEN")
        self.chat_id = os.environ.get("TG_ALERT_CHAT_ID")

    async def send(self, key, text):
        now = int(time.time())
        row = self.db.execute("SELECT ts FROM alerts WHERE key=?", (key,)).fetchone()
        if row and now - row[0] < self.cooldown:
            return
        self.db.execute("INSERT OR REPLACE INTO alerts VALUES(?,?)", (key, now))
        self.db.commit()
        print(time.strftime("[%H:%M:%S]"), text.replace("\n", " | "), flush=True)
        if self.bot_token and self.chat_id:
            data = urllib.parse.urlencode({"chat_id": self.chat_id, "text": text,
                                           "disable_web_page_preview": "true"}).encode()
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            try:
                await asyncio.to_thread(urllib.request.urlopen, url, data, 15)
                return
            except Exception as e:  # бот недоступен — шлём в «Избранное»
                print("бот не ответил:", e, file=sys.stderr)
        await self.client.send_message("me", text, link_preview=False)


async def call(client, request):
    """Запрос с уважением к FloodWait."""
    while True:
        try:
            return await client(request)
        except FloodWaitError as e:
            print(f"Telegram просит подождать {e.seconds} c", file=sys.stderr)
            await asyncio.sleep(e.seconds + 1)


async def fetch_catalog(client):
    res = await call(client, functions.payments.GetStarGiftsRequest(hash=0))
    return [g for g in getattr(res, "gifts", []) if isinstance(g, types.StarGift)]


async def fetch_listings(client, gift_id, limit):
    res = await call(client, functions.payments.GetResaleStarGiftsRequest(
        gift_id=gift_id, offset="", limit=limit, sort_by_price=True))
    return [to_listing(g) for g in res.gifts if isinstance(g, types.StarGiftUnique)]


def pick_gifts(catalog, cfg):
    on_sale = [g for g in catalog if g.resell_min_stars]
    wl = [w.lower() for w in cfg["watchlist"]]
    if wl:
        chosen = [g for g in on_sale if (g.title or "").lower() in wl]
    else:
        chosen = [g for g in on_sale if g.resell_min_stars <= cfg["max_floor_stars"]]
    # самые ликвидные (много лотов) — первыми
    chosen.sort(key=lambda g: -(g.availability_resale or 0))
    return chosen[:cfg["max_gifts_per_cycle"]]


def link(l):
    return f"https://t.me/nft/{l['slug']}"


async def cycle(client, db, notifier, cfg, first_run):
    now = int(time.time())
    catalog = await fetch_catalog(client)

    # 1. Новые подарки в каталоге
    known = {r[0] for r in db.execute("SELECT gift_id FROM gifts")}
    for g in catalog:
        if g.id not in known:
            db.execute("INSERT INTO gifts VALUES(?,?,?)", (g.id, g.title, now))
            if not first_run and not g.sold_out:
                left = f", осталось {g.availability_remains}/{g.availability_total}" if g.limited else ""
                await notifier.send(f"new:{g.id}",
                                    f"🆕 Новый подарок: {g.title or g.id} — {g.stars}⭐{left}")
    db.commit()

    for g in pick_gifts(catalog, cfg):
        title = g.title or str(g.id)

        # 2. Падение флора относительно своей истории
        hist = [r[0] for r in db.execute(
            "SELECT stars FROM floors WHERE gift_id=? AND ts>? ORDER BY ts", (g.id, now - 86400))]
        drop = analyze.floor_drop(hist, g.resell_min_stars, cfg["floor_drop_pct"])
        db.execute("INSERT INTO floors VALUES(?,?,?,?)",
                   (g.id, now, g.resell_min_stars, g.availability_resale or 0))
        db.commit()
        if drop:
            await notifier.send(f"drop:{g.id}:{g.resell_min_stars}",
                                f"📉 {title}: флор {drop['current']}⭐ "
                                f"(−{drop['drop_pct']:.0f}% к медиане за сутки {drop['base']:.0f}⭐)")

        await asyncio.sleep(cfg["request_pause_sec"])
        listings = await fetch_listings(client, g.id, cfg["listings_per_gift"])

        # 3. Лот заметно дешевле соседних (в звёздах и в TON отдельно)
        for cur, fee, sign in (("stars", analyze.FEE_STARS, "⭐"), ("ton", analyze.FEE_TON, " TON")):
            hit = analyze.find_underpriced(listings, cur, fee, cfg["min_profit_pct"])
            if hit:
                l = hit["listing"]
                await notifier.send(
                    f"under:{l['slug']}:{cur}:{l[cur]}",
                    f"🎯 {title} #{l['num']}: {l[cur]:g}{sign}, соседние лоты ~{hit['ref_price']:g}{sign}\n"
                    f"После комиссии {fee:.0%}: +{hit['profit']:.1f}{sign} ({hit['profit_pct']:.0f}%)\n"
                    f"{link(l)}")

        # 4. Редкая модель/фон по цене около флора
        for hit in analyze.find_rare_near_floor(listings, "stars", cfg["rare_permille"],
                                                cfg["rare_over_floor_pct"]):
            l = hit["listing"]
            rare = ", ".join(f"{name} ({p / 10:g}%)" for _, name, p in hit["rare"])
            await notifier.send(
                f"rare:{l['slug']}:{l['stars']}",
                f"💎 {title} #{l['num']}: {l['stars']}⭐ при флоре {hit['floor']}⭐\n"
                f"Редкое: {rare}\n{link(l)}")

    db.execute("DELETE FROM floors WHERE ts<?", (now - 30 * 86400,))
    db.commit()


async def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--once", action="store_true", help="один проход и выход")
    ap.add_argument("--list", action="store_true", help="показать подарки с флором и выйти")
    args = ap.parse_args()

    api_id, api_hash = os.environ.get("TG_API_ID"), os.environ.get("TG_API_HASH")
    if not api_id or not api_hash:
        sys.exit("Задай TG_API_ID и TG_API_HASH (получить: https://my.telegram.org → API development tools)")

    cfg, db = load_config(), open_db()
    client = TelegramClient(str(HERE / "monitor"), int(api_id), api_hash)
    await client.start()  # при первом запуске спросит телефон и код

    if args.list:
        cat = [g for g in await fetch_catalog(client) if g.resell_min_stars]
        for g in sorted(cat, key=lambda g: g.resell_min_stars):
            print(f"{g.resell_min_stars:>8}⭐  лотов {g.availability_resale or 0:>6}  {g.title or g.id}")
        return

    notifier = Notifier(client, db, cfg["alert_cooldown_sec"])
    first_run = db.execute("SELECT COUNT(*) FROM gifts").fetchone()[0] == 0
    while True:
        try:
            await cycle(client, db, notifier, cfg, first_run)
        except (ConnectionError, OSError) as e:
            print("сеть:", e, file=sys.stderr)
        first_run = False
        if args.once:
            break
        await asyncio.sleep(cfg["interval_sec"])


if __name__ == "__main__":
    asyncio.run(main())
