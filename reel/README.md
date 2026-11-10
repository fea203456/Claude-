# «День 1 из 30» — Алекс vs Семён

Вертикальный анимационный ролик (1080×1920, 60 fps, 44 с) на тему «Вечный дедлайн против иллюзии продуктивности».

- `out/day1-of-30.mp4` — готовое видео (H.264, yuv420p, звук AAC).
- `src/` — анимация: чистый Canvas 2D с детерминированным таймлайном (`renderAt(t)`), без фреймворков.
  `timeline.js` — общий тайминг для картинки и звука, `voice.js` — длительности реплик и данные для движения ртов.
- `voice/` — реплики персонажей, сгенерированные Gemini TTS (голоса Puck и Algenib) и обработанные `tools/voice_prep.py`.
- `tools/` — сборка:
  - `gen_voice.py` — запись реплик через Gemini API (ключ берётся из переменной окружения `GEMINI_API_KEY`);
  - `voice_prep.py` — обрезка тишины, темп, тон, огибающие для ртов;
  - `audio.py` — синтез музыки и звуковых эффектов, сведение с голосом в `out/mix.wav`;
  - `render.js` — покадровый рендер через Playwright (нужен Chromium).

## Пересборка

```bash
python3 tools/voice_prep.py            # если менялись реплики
python3 tools/audio.py                 # музыка + эффекты + голос -> out/mix.wav
node tools/render.js build/frames 0 2640
ffmpeg -framerate 60 -i build/frames/f%05d.jpg -i out/mix.wav \
  -c:v libx264 -preset slow -crf 19 -pix_fmt yuv420p -c:a aac -b:a 256k -movflags +faststart out/day1-of-30.mp4
```

Предпросмотр: открыть `src/index.html` в браузере.

Шрифт Unbounded распространяется по лицензии SIL OFL (см. `src/fonts/Unbounded-LICENSE.txt`).
