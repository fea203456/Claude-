# Доводка света и тумана — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Картинка суток читается как тёмное фэнтези: чёткий «пепельный» день с дальней дымкой, отдельная холодная луна, стелющийся ночной туман за частоколом без полос, свежее утро.

**Architecture:** Кривая суток (`DayNightCurve`) получает поля луны и наземного тумана; `DayNightLighting` применяет их к новому `Moon` (DirectionalLight3D) и к общему `FogMaterial` объёмов тумана за частоколом, работая с копией окружения сцены. Проверка — скриншоты суток + автопроверки яркости и контраста.

**Tech Stack:** Godot 4.5.1 Forward+ (GDScript, FogVolume, FogMaterial), ffmpeg `signalstats`, python3 stdlib.

**Spec:** `docs/superpowers/specs/2026-11-13-svet-i-tuman-design.md`

## Global Constraints

- Всё из Global Constraints этапа 1 (`docs/superpowers/plans/2026-11-13-etap-1-yadro.md`) в силе: тест-раннер `tools/godot.sh test` (любая ошибка движка = FAIL), часы — `minutes` 0…1200 от 06:00, цвета в `.tres/.tscn` — sRGB.
- Ночь = `minutes ≥ 840` (20:00). Ночью солнце: `sun_pitch_deg < 0` **и** `sun_energy == 0` на всём отрезке 840…1200.
- Камера и герой не меняются; герой виден во всех кадрах.
- Не изменять `game/scenes/dev/dusk_environment.tres` в рантайме (сцена работает с копией).
- Существующие тесты `test_day_night.gd` остаются зелёными и осмысленными.

## Review Focus

1. **Переход 19:00→20:00** — между ключами 780 и 840 солнце не должно «прыгать» через горизонт с ненулевой энергией и не должно появляться ночью. → `test_sun_never_up_at_night` (Task 1, сэмплы каждые 5 мин на 840…1200).
2. **Кривая без новых полей** (старый `.tres`, ручная правка) — `apply()` не падает, луна гасится, наземный туман не меняется. → `test_missing_new_fields_ok` (Task 1).
3. **Общий ресурс окружения** — после работы фермы витрина не должна получить ночной туман. → `test_env_not_shared` (Task 1).
4. **Туман во дворе** — объёмы тумана не накрывают двор, иначе герой тонет. → `test_fog_volumes_outside_yard` (Task 2).
5. **Проверка контраста не пропускает пустой результат** — сбой ffmpeg/парсинга = ошибка, не PASS. → шаг проверки в Task 3.

---

### Task 1: Луна, поля кривой и копия окружения

**Files:** Modify `game/scripts/world/day_night_lighting.gd`, `game/world/day_night_curve.tres`, `game/tests/test_day_night.gd`

**Interfaces — Produces:**
- Новые необязательные поля ключа кривой: `moon_pitch_deg: float`, `moon_color: Color`, `moon_energy: float`, `ground_fog_density: float`. `DayNightCurve.sample()` уже интерполирует любые поля; при отсутствии поля в ключе — значение по умолчанию в `apply()`: `moon_energy = 0.0`, `ground_fog_density` — не трогать материал.
- `DayNightLighting`: `@export var moon: DirectionalLight3D`, `@export var ground_fog: FogMaterial`; `apply(minutes)` дополнительно ставит `moon.rotation_degrees.x = -moon_pitch_deg`, `moon.light_color`, `moon.light_energy`, `moon.visible = moon_energy > 0.0`, `ground_fog.density = ground_fog_density`; в `_ready()` заменяет `world_env.environment` на `environment.duplicate(true)` (один раз).
- `day_night_curve.tres`: ночные ключи (840, 960, 1200) — `sun_pitch_deg` отрицательный, `sun_energy = 0.0`; луна: 0 днём, > 0 с 840; `ground_fog_density` днём ≈ 0, ночью максимум. Направление луны по Y задаётся в сцене (Task 2), не в кривой.

- [ ] **Step 1: Failing tests** (добавить в `test_day_night.gd`):
  - `test_sun_never_up_at_night` — на `day_night_curve.tres` для m = 840, 845, …, 1200: `sun_pitch_deg < 0` и `sun_energy == 0`.
  - `test_moon_only_at_night` — `moon_energy(360) == 0`, `moon_energy(960) > 0`, `moon_energy(1200) > 0`.
  - `test_ground_fog_night_only` — `ground_fog_density(1000) > 4 × ground_fog_density(360)`.
  - `test_apply_sets_moon_and_ground_fog` — `apply(960)`: `moon.light_energy`, `moon.rotation_degrees.x`, `ground_fog.density` равны сэмплу; `moon.visible == true`; `apply(360)` → `moon.visible == false`.
  - `test_missing_new_fields_ok` — кривая из двух ключей только со старыми полями; `apply(50)` без ошибок, `moon.visible == false`, `ground_fog.density` не изменилась.
  - `test_env_not_shared` — `WorldEnvironment` с `environment = load("res://scenes/dev/dusk_environment.tres")`, узел освещения в дереве (после `_ready`), `apply(1000)` → у загруженного ресурса `volumetric_fog_density` не изменилась, у `world_env.environment` — изменилась.
- [ ] **Step 2:** `tools/godot.sh test` → новые FAIL.
- [ ] **Step 3:** Реализовать, обновить `.tres` (сохранить ключ 360 и порядок `sun_energy(360) > sun_energy(780) > sun_energy(1000)` для старого теста).
- [ ] **Step 4:** `tools/godot.sh test` → всё PASS.
- [ ] **Step 5:** Commit «Свет: луна, наземный туман в кривой, копия окружения».

### Task 2: Туман за частоколом и «пепельный» день в сцене фермы

**Files:** Modify `game/scenes/world/farm_test.tscn`, `game/project.godot`, `game/tests/test_game_flow.gd` (или новый `game/tests/test_farm_look.gd`)

**Interfaces — Consumes:** `DayNightLighting.moon`, `.ground_fog` (Task 1).
**Produces:**
- В `farm_test.tscn`: узел `Moon` (DirectionalLight3D, холодный, тени включены, направление по Y противоположно солнцу ± 30°), подключён к `DayNightLighting.moon`; 4 узла `FogVolume` (`FogBandN/E/S/W`, форма BOX) — полосы шириной 10 м сразу за частоколом (внутренняя граница на |x| или |z| = 18), высота 3 м, общий `FogMaterial` с `height_falloff > 0` и `edge_fade` (мягкий край), подключён к `DayNightLighting.ground_fog`.
- В окружении фермы (копия-источник может быть своим `farm_environment.tres` — **разрешено** вынести окружение фермы в отдельный ресурс): дистанционная дымка `fog_enabled = true` с малой плотностью и `fog_aerial_perspective` для дали; `adjustment_enabled = true`, `contrast ≈ 1.1`, `saturation ≈ 0.85`; `volumetric_fog_temporal_reprojection_enabled = true`.
- `project.godot`: `rendering/environment/volumetric_fog/volume_depth = 128`, `volume_size = 128`, `use_filter = 1` (против полос).

- [ ] **Step 1: Failing tests**:
  - `test_farm_has_moon_and_fog_wired` — в инстансе фермы `DayNightLighting.moon` = узел `Moon`, `ground_fog` = материал `FogBandN`.
  - `test_fog_volumes_outside_yard` — у каждого `FogVolume` AABB (позиция ± size/2) не пересекает квадрат двора |x| < 17, |z| < 17.
  - `test_fog_bands_surround_farm` — объединение 4 полос покрывает точки (0, 1, ±20) и (±20, 1, 0).
- [ ] **Step 2:** FAIL. **Step 3:** собрать сцену и настройки. **Step 4:** `tools/godot.sh test` → PASS; `tools/godot.sh display --quit-after 60` без `ERROR`, `Forward+`.
- [ ] **Step 5:** Commit «Свет: туман за частоколом, луна и пепельный день на ферме».

### Task 3: Съёмка, проверка контраста и настройка на глаз

**Files:** Modify `game/scenes/dev/daynight_capture.gd`, `tools/check_luminance.py`, `tools/capture_daynight.sh`, `game/world/day_night_curve.tres` (тюнинг), `game/scenes/world/farm_test.tscn` / окружение (тюнинг); Output `docs/previews/day_0600.png`, `day_1200.png`, `day_1900.png`, `day_2100.png`, `day_2300.png`, `day_0100.png`, `farm_walk.mp4`

**Interfaces — Produces:**
- `SHOTS` = 0/`day_0600`, 360/`day_1200`, 780/`day_1900`, 900/`day_2100`, 1020/`day_2300`, 1140/`day_0100`.
- `check_luminance.py <dir> [--min-contrast N]` — для каждого PNG печатает `YAVG` и контраст `YHIGH − YLOW` (оба из `ffmpeg … -vf signalstats,metadata=print`); код 0, если порядок яркости как раньше (`1200 > 1900 > 2300`, `0600 > 2300`) **и** контраст `day_0600` и `day_1200` ≥ N; 1 — нарушение; 2 — не удалось измерить (нет файла, нет значения).
- Порог N: **сначала** измерить контраст текущих кадров (до тюнинга) и записать в отчёт; N = контраст текущего `day_1200` × 1.5 (округлить), зашить как значение по умолчанию в `capture_daynight.sh`.

- [ ] **Step 1:** Измерить текущие `day_0600/1200` (`YHIGH−YLOW`), записать числа и выбранный N в отчёт.
- [ ] **Step 2:** Доработать `check_luminance.py`; проверить на синтетике: плоский серый PNG → 1 (контраст), градиент → 0, отсутствующий файл → 2.
- [ ] **Step 3:** Добавить кадры, прогнать `tools/capture_daynight.sh`; тюнить кривую/окружение до прохождения проверок **и** глазами (Read): день чёткий и приглушённый, утро свежее (холодное небо, тёплое солнце, не бурое), закат с длинными тенями, 21:00 — сумерки с поднимающимся туманом за частоколом, 23:00 и 01:00 — тёмная ночь, холодная луна, плотный туман за частоколом, двор читается, без полос; герой виден во всех кадрах.
- [ ] **Step 4:** `tools/godot.sh test` → PASS.
- [ ] **Step 5:** Commit «Свет: съёмка шести кадров суток и проверка контраста».
