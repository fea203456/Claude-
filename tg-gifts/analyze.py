"""Чистая логика монитора: без сети, поэтому её можно проверять тестами.

Цены везде в «единицах сравнения»: для Stars это звёзды, для TON — тонкоины.
Листинг — словарь вида:
    {"slug": "PlushPepe-123", "num": 123, "stars": 900, "ton": 4.5,
     "model": "Pumpkin", "model_permille": 5, "backdrop": "Onyx Black",
     "backdrop_permille": 20}
"""
from statistics import median

# Комиссии встроенного маркета Telegram (по публичным гайдам на осень 2026;
# сверяй с тем, что показывает приложение при выставлении лота).
FEE_STARS = 0.20
FEE_TON = 0.10


def break_even(cost: float, fee: float) -> float:
    """Минимальная цена продажи, при которой сделка выходит в ноль."""
    return cost / (1 - fee)


def net_profit(buy: float, sell: float, fee: float, extra: float = 0.0) -> float:
    """Чистая прибыль: продажа за вычетом комиссии минус покупка и доп. расходы."""
    return sell * (1 - fee) - buy - extra


def find_underpriced(listings, currency="stars", fee=FEE_STARS,
                     min_profit_pct=10.0, ref_depth=3):
    """Ищет лот заметно дешевле соседних.

    Берём самый дешёвый лот и сравниваем с «опорной» ценой — медианой
    следующих ref_depth лотов. Считаем, что перепродать получится чуть ниже
    опорной цены (на 1%), и вычитаем комиссию. Возвращает dict или None.
    """
    priced = sorted((l for l in listings if l.get(currency)),
                    key=lambda l: l[currency])
    if len(priced) < ref_depth + 1:
        return None  # стакан слишком тонкий — опорной цене нельзя верить
    cheapest = priced[0]
    ref = median(l[currency] for l in priced[1:ref_depth + 1])
    resale = ref * 0.99
    profit = net_profit(cheapest[currency], resale, fee)
    pct = profit / cheapest[currency] * 100
    if pct < min_profit_pct:
        return None
    return {"listing": cheapest, "ref_price": ref, "resale_price": resale,
            "profit": profit, "profit_pct": pct, "currency": currency}


def find_rare_near_floor(listings, currency="stars", max_permille=15,
                         max_over_floor_pct=20.0):
    """Лоты с редкой моделью или фоном, которые стоят почти как флор."""
    priced = sorted((l for l in listings if l.get(currency)),
                    key=lambda l: l[currency])
    if not priced:
        return []
    floor = priced[0][currency]
    limit = floor * (1 + max_over_floor_pct / 100)
    hits = []
    for l in priced:
        if l[currency] > limit:
            break
        rare = [(k, l.get(k), l.get(k + "_permille"))
                for k in ("model", "backdrop")
                if l.get(k + "_permille") is not None
                and l[k + "_permille"] <= max_permille]
        if rare:
            hits.append({"listing": l, "floor": floor, "rare": rare,
                         "currency": currency})
    return hits


def floor_drop(history, current, min_drop_pct=15.0, min_points=4):
    """Флор упал относительно медианы прошлых замеров. history — список цен."""
    if current is None or len(history) < min_points:
        return None
    base = median(history)
    if base <= 0:
        return None
    drop = (base - current) / base * 100
    if drop < min_drop_pct:
        return None
    return {"base": base, "current": current, "drop_pct": drop}
