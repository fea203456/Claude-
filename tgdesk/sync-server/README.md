# TgMod Sync — сервер оформления профилей

Хранит рамку, баннер и витрину каждого пользователя мода, чтобы их видели другие пользователи TgMod.
Работает на Cloudflare Workers: бесплатного тарифа хватает на старт, сервер в аренду не нужен.

## Как это защищено

- **Кто есть кто, подтверждает сам Telegram.** Мод просит у сервера одноразовый код и отправляет
  его вашему боту командой `/start <код>` с аккаунта пользователя. Telegram сообщает боту настоящий
  ID отправителя, и только после этого сервер выдаёт токен. Поменять оформление чужого профиля нельзя.
- **Вебхук бота проверяется** секретным заголовком, который знает только Telegram.
- **Файлы проверяются по содержимому:** PNG, JPEG, GIF, WebP, WebM и стикеры `.tgs`, до 2 МБ.
  SVG и HTML не принимаются, файлы отдаются с `nosniff` и `CSP: sandbox`.
- **Модерация:** жалобы пользователей, удаление профиля вместе с файлами и бан.

## Развёртывание (один раз, около 15 минут)

Нужны Node.js 22+ и бесплатный аккаунт Cloudflare.

1. Создайте бота у [@BotFather](https://t.me/BotFather): `/newbot`. Сохраните токен и имя бота.
2. Впишите имя бота (без `@`) в `wrangler.toml` → `BOT_USERNAME`.
3. В этой папке:

```bash
npx wrangler login
```

```bash
npx wrangler kv namespace create TGMOD
```

   Скопируйте выданный `id` в `wrangler.toml` → `[[kv_namespaces]]`.

4. Задайте секреты (каждая команда спросит значение; для трёх последних подойдёт любая длинная
   случайная строка):

```bash
npx wrangler secret put BOT_TOKEN
```

```bash
npx wrangler secret put WEBHOOK_SECRET
```

```bash
npx wrangler secret put TOKEN_SECRET
```

```bash
npx wrangler secret put ADMIN_TOKEN
```

5. Опубликуйте:

```bash
npx wrangler deploy
```

   Wrangler напишет адрес вида `https://tgmod-sync.<имя>.workers.dev`.

6. Подключите бота: откройте в браузере `https://tgmod-sync.<имя>.workers.dev/setup?token=<ADMIN_TOKEN>`.
   В ответе должно быть `"webhook": {"ok": true, ...}`.

7. В моде: **Настройки → Настройки мода → Оформление профиля → Сервер синхронизации**, вставьте адрес.
   Чтобы адрес был сразу у всех, кто скачает вашу сборку, соберите мод с ним:
   `TGMOD_SYNC_URL=https://tgmod-sync.<имя>.workers.dev tgdesk/build.sh win`.

Если `workers.dev` у ваших пользователей открывается плохо, привяжите к воркеру свой домен в панели
Cloudflare (Workers → Settings → Domains & Routes).

## Модерация

```bash
curl -H "Authorization: Bearer <ADMIN_TOKEN>" https://<адрес>/v1/admin/reports
```

```bash
curl -X DELETE -H "Authorization: Bearer <ADMIN_TOKEN>" "https://<адрес>/v1/admin/profiles/<user_id>?ban=1"
```

## Локально и тесты

```bash
npm test
```

```bash
node dev-server.mjs
```

`dev-server.mjs` поднимает тот же сервер на `http://127.0.0.1:8787` с данными в памяти — для проверки
мода без Cloudflare. Бот там не настоящий, вход подтверждается вручную вызовом `/bot/webhook`.

## Лимиты бесплатного тарифа Cloudflare

KV: 100 000 чтений и 1 000 записей в день. Чтение профиля — одно чтение, загрузка файла — две-три
записи. На первые сотни пользователей хватит; дальше — платный тариф Workers ($5 в месяц).
