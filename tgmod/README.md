# TgMod — патч-сет для Telegram Desktop

Мод хранится не форком, а набором изменений поверх конкретного тега
[telegramdesktop/tdesktop](https://github.com/telegramdesktop/tdesktop)
(тег записан в `UPSTREAM_TAG`).

| Путь | Что это |
|---|---|
| `overlay/` | Новые файлы мода, копируются в дерево tdesktop как есть (`Telegram/SourceFiles/mod/`). |
| `patches/` | Минимальные врезки в существующие файлы tdesktop. |
| `apply.sh` | Накладывает overlay и патчи на чистый checkout. |

## Этап 1 (готово)

- `mod/mod_config.*` — глобальные настройки мода, JSON в `tdata/tgmod.json`.
- `mod/mod_settings_section.*` — экран «Настройки мода» (пункт в главном меню настроек).
- `mod/mod_peer_id.*` — строка «ID» в профиле пользователя, группы и канала
  (обычный формат или формат Bot API), копируется через контекстное меню.
- `mod/mod_lang.*` — локальные строки мода (ru/en).

## Сборка

Сборка идёт в GitHub Actions: workflow **TgMod Desktop (Linux)**
(`.github/workflows/tgmod-desktop.yml`) запускается при изменениях в `tgmod/`
или вручную. Готовый бинарник лежит в артефакте `TgMod-linux-x86_64`.

Автообновление в сборке отключено, иначе мод заменил бы себя официальным клиентом.

### API-ключи

Без секретов сборка использует публичные тестовые `api_id`/`api_hash`, с которыми
Telegram может отказать во входе. Свои ключи получите на
<https://my.telegram.org> и добавьте в секреты репозитория
`TDESKTOP_API_ID` и `TDESKTOP_API_HASH`.

### Локально (Linux, Docker)

```bash
git clone --recursive --branch "$(cat tgmod/UPSTREAM_TAG)" https://github.com/telegramdesktop/tdesktop.git
tgmod/apply.sh tdesktop
cd tdesktop
docker run --rm -u $(id -u) -v "$PWD:/usr/src/tdesktop" \
    ghcr.io/telegramdesktop/tdesktop/centos_env:latest \
    /usr/src/tdesktop/Telegram/build/docker/centos_env/build.sh \
    -D TDESKTOP_API_ID=YOUR_API_ID -D TDESKTOP_API_HASH=YOUR_API_HASH \
    -D DESKTOP_APP_DISABLE_AUTOUPDATE=ON
```

## Обновление на новый тег

Поменяйте `UPSTREAM_TAG`, наложите `apply.sh` на новый checkout, поправьте
конфликты и пересоздайте патч через `git diff`.
