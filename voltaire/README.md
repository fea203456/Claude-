# «Ошибка министра» — Вольтер и лотерея 1729 года

Вертикальный ролик 9:16 (1080×1920, 60 fps, 62.6 с, H.264 + AAC) в стиле 2.5D бумажной диорамы.
Сюжет: Вольтер и Ла Кондамин нашли ошибку в государственной лотерее и законно выиграли у казны.
Ролик закольцован: последний кадр совпадает с первым, а последняя фраза («Потому что однажды…») переходит в первую.

- `out/voltaire-lottery.mp4` — готовое видео.
- `src/` — анимация: Canvas 2D, детерминированный таймлайн `renderAt(t)`, без фреймворков.
  - `core.js` — математика, кривые, треки камеры; `paper.js` — фактура крафта, вырезанные контуры, карточки, плашки;
  - `puppet.js` — бумажные персонажи (риг: тонкие чёрные конечности, лица, парики);
  - `props.js`, `sets.js` — реквизит и декорации; `scenes_a…d.js` — 16 сцен;
  - `main.js` — 2.5D-камера с параллаксом, глубина резкости, тени слоёв, смаз движения (субкадры), субтитры.
- `voice/vo2_31_puck.src.wav` — исходный дубль озвучки (Gemini TTS, голос Puck, модель gemini-3.1-flash-tts-preview); `voice/vo.wav` — он же после `tools/align.py` и `tools/voice_prep.py` (паузы, темп ×1.14).
- `tools/audio.py` — синтез музыки (клавесин, пиццикато, бум-бэп, литавры, медь, хор) и звуковых эффектов, сведение с голосом.
- `tools/render.js` — покадровый рендер через Playwright (Chromium); `tools/encode.sh` — сборка MP4.

## Пересборка

```bash
python3 tools/voice_prep.py        # если менялась нарезка голоса
python3 tools/audio.py             # музыка + SFX + голос -> out/mix.wav
node tools/render.js build/frames 4
tools/encode.sh out/voltaire-lottery.mp4
```

Предпросмотр: открыть `src/index.html` в браузере.

Шрифты (Playfair Display, Old Standard TT, IM Fell English, Pinyon Script, Marck Script, Yeseva One) — SIL Open Font License, лицензии в `src/fonts/`.
