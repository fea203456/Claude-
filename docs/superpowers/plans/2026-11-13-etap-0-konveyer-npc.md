# Этап 0: конвейер ассетов и тестовый NPC — план реализации

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Доказать, что конвейер «скрипт Blender → .glb → Godot 4 с тёмной атмосферой» даёт приемлемое качество: тестовый житель деревни с анимациями Idle/Walk ходит по пепельной земле в сумеречном тумане, и автор видит это на рендере и видео.

**Architecture:** Ассеты строятся процедурно Python-скриптами в headless Blender (`bpy`) из общей палитры материалов и экспортируются в `game/assets/`. Godot-проект в `game/` импортирует .glb; dev-сцена-витрина показывает NPC и атмосферу. Скриншоты и видео снимаются в облаке через Xvfb + программный Vulkan (lavapipe) и Movie Maker Godot.

**Tech Stack:** Blender 5.0.1 как модуль `bpy` (Python 3.11, venv `/home/user/blender-venv`), pytest; Godot 4.5.1 (Forward+, GDScript); Xvfb, mesa-vulkan-drivers, ffmpeg.

**Spec:** `docs/superpowers/specs/2026-11-13-uvyadayushchiy-krai-design.md`

Это первый из нескольких планов. Следующие этапы (отдельными планами): ядро игры (время суток, ввод, камера, сохранения с версиями), ферма, предметы/рецепты, NPC и квесты, ночь и Порча, мир.

## Global Constraints

- Godot **4.5.1-stable**, рендерер **Forward+**; бинарник `/home/user/godot/Godot_v4.5.1-stable_linux.x86_64`.
- Blender **5.0.1** через `bpy` в `/home/user/blender-venv` (Python 3.11).
- Формат ассетов — **glTF binary (.glb)**; единицы — метры; в Godot +Y вверх; модели смотрят вперёд по **+Z в Godot** (в Blender — по **−Y**).
- Стиль: стилизованное low-poly, плоские материалы только из общей палитры (`tools/blender/lib/palette.py`), без текстур на этапе 0.
- Бюджет персонажа: **≤ 3000 треугольников**, рост **1.75 м ± 0.05**.
- Анимации: имена в Blender `Idle-loop`, `Walk-loop` (Godot снимает суффикс `-loop` и включает цикл); 24 кадра/с; Walk = **24 кадра**, Idle = **48 кадров**.
- Все ассеты и названия — оригинальные.
- Каталог `game/.godot/` не коммитится; файлы `*.import` коммитятся.

## Review Focus

1. **Шов цикла ходьбы** — первый и последний кадр Walk должны совпадать, иначе NPC «дёргается» раз в секунду. → тест `test_walk_loop_seamless` (Task 2).
2. **Скольжение ног** — скорость перемещения NPC должна соответствовать длине шага анимации. → константа `STRIDE_M` и тест `test_walker_speed_matches_stride` (Task 4).
3. **Ориентация** — NPC должен идти лицом вперёд, а не спиной/боком. → тест `test_npc_faces_plus_z` (Task 3).
4. **Повторный запуск скрипта сборки** — не должен копить мусорные объекты или менять результат. → тест `test_build_is_repeatable` (Task 2).
5. **Нет инструмента** — если не установлен Blender/Godot/Vulkan, скрипты должны падать с понятным сообщением, а не молча выдавать пустой рендер. → проверка в `tools/setup.sh --check` (Task 1).

---

## File Structure

```
tools/
  setup.sh                       # установка/проверка bpy, Godot, lavapipe, ffmpeg
  blender.sh                     # запуск скрипта в blender-venv
  godot.sh                       # запуск Godot (headless / под Xvfb)
  blender/
    lib/palette.py               # палитра материалов тёмного фэнтези
    lib/scene.py                 # сброс сцены, экспорт glb, подсчёт треугольников
    lib/rig.py                   # построение скелета и жёсткая привязка частей
    build_npc_test.py            # тестовый житель + анимации
    render_preview.py            # превью-рендер Cycles
    tests/test_npc_test.py       # pytest по готовому .glb
game/
  project.godot
  assets/characters/npc_test/npc_test.glb
  scenes/dev/npc_showcase.tscn   # витрина: земля, частокол, туман, NPC
  scenes/dev/dusk_environment.tres
  scripts/npc/npc_walker.gd      # NPC ходит по кругу, проигрывает Walk
  tests/run_tests.gd             # минимальный раннер тестов (SceneTree)
  tests/test_npc_import.gd
tools/capture.sh                 # скриншот + видео витрины
docs/previews/                   # рендеры и видео для автора
.gitignore
```

---

### Task 1: Инструменты и пустой проект Godot

**Files:**
- Create: `tools/setup.sh`, `tools/blender.sh`, `tools/godot.sh`, `game/project.godot`, `game/tests/run_tests.gd`, `game/tests/test_smoke.gd`, `.gitignore`

**Interfaces:**
- Produces:
  - `tools/setup.sh` — без аргументов устанавливает недостающее (idempotent); `tools/setup.sh --check` печатает версии и выходит с кодом ≠0, называя отсутствующий компонент.
  - `tools/blender.sh <script.py> [args...]` — запускает `/home/user/blender-venv/bin/python <script.py> args`.
  - `tools/godot.sh headless <args>` / `tools/godot.sh display <args>` — Godot с `--path game`; `display` оборачивает в `xvfb-run -a -s "-screen 0 1920x1080x24"`.
  - `tools/godot.sh test` — запускает `res://tests/run_tests.gd`, код выхода = число упавших тестов.
  - Раннер: каждый файл `res://tests/test_*.gd` — `extends RefCounted`, методы `test_*()` возвращают `""` при успехе или текст ошибки.

- [ ] **Step 1:** Написать `tools/setup.sh`: venv `python3.11 -m venv /home/user/blender-venv` + `pip install bpy==5.0.1`; Godot 4.5.1 из `https://github.com/godotengine/godot/releases/download/4.5.1-stable/Godot_v4.5.1-stable_linux.x86_64.zip` в `/home/user/godot/`; `apt-get install -y mesa-vulkan-drivers` если нет `/usr/share/vulkan/icd.d/lvp_icd.json`. Режим `--check` проверяет `bpy.app.version_string == "5.0.1"`, `godot --version` начинается с `4.5.1.stable`, наличие `lvp_icd.json`, `ffmpeg`, `xvfb-run`.
- [ ] **Step 2:** Проверить: `tools/setup.sh --check` → печатает 5 строк `OK …`, код 0. Временно переименовать venv → вывод `MISSING: blender (bpy)` и код ≠0; вернуть.
- [ ] **Step 3:** Написать `tools/blender.sh`, `tools/godot.sh`, `game/project.godot` (имя «Увядающий край», `renderer/rendering_method="forward_plus"`), `.gitignore` (`game/.godot/`, `/tools/blender/**/__pycache__/`).
- [ ] **Step 4:** Написать `game/tests/run_tests.gd` (`extends SceneTree`, в `_init` обходит `res://tests/`, вызывает `test_*`, печатает `PASS`/`FAIL name: msg`, `quit(failures)`) и `test_smoke.gd` с `test_truth()` → `""` и `test_fails()` → `"expected failure"`.
- [ ] **Step 5:** `tools/godot.sh test` → `FAIL test_fails: expected failure`, код 1. Удалить `test_fails`, повторить → `PASS test_truth`, код 0.
- [ ] **Step 6:** Commit: `git add tools game .gitignore && git commit -m "Этап 0: инструменты и пустой проект Godot"`.

### Task 2: Палитра, библиотека сцены, тестовый житель с анимациями

**Files:**
- Create: `tools/blender/lib/palette.py`, `tools/blender/lib/scene.py`, `tools/blender/lib/rig.py`, `tools/blender/build_npc_test.py`, `tools/blender/tests/test_npc_test.py`
- Output: `game/assets/characters/npc_test/npc_test.glb`

**Interfaces:**
- Consumes: `tools/blender.sh` (Task 1).
- Produces:
  - `palette.PALETTE: dict[str, tuple[float,float,float]]` — ключи как минимум `skin_pale`, `cloth_ash`, `cloth_rust`, `leather_dark`, `hair_soot`, `metal_dull`, `wood_old`, `ground_ash`; `palette.material(name: str) -> bpy.types.Material` (кэширует, имя материала = `pal_<name>`, roughness 0.85).
  - `scene.reset() -> None`; `scene.export_glb(path: str, objects: list) -> None` (экспорт только переданных объектов + их действий, `export_animation_mode='ACTIONS'`); `scene.triangle_count(objects) -> int`.
  - `rig.build_humanoid(height: float) -> bpy.types.Object` — арматура с костями `root, hips, spine, chest, neck, head, upper_arm.L/R, forearm.L/R, hand.L/R, thigh.L/R, shin.L/R, foot.L/R`.
  - `rig.attach_rigid(mesh, armature, bone_name) -> None` — вся сетка в одной группе вершин = кость (жёсткая привязка; дёшево и стабильно для low-poly).
  - `build_npc_test.py <out.glb>` — строит житель (рубаха `cloth_ash`, жилет `leather_dark`, штаны `cloth_rust`, голова `skin_pale`, волосы `hair_soot`, нос — отдельный меш с именем `Nose`), действия `Idle-loop` (48 кадров: дыхание грудью ±2°, лёгкое покачивание головы) и `Walk-loop` (24 кадра: бёдра ±25°, колени 0…40°, руки в противофазе ±20°, покачивание hips по Z ±0.03 м; кадр 24 = кадр 0). Длина шага `STRIDE_M = 0.70` м за полцикла → записать в custom property арматуры `stride_m`.

- [ ] **Step 1: Write the failing tests** в `tests/test_npc_test.py` (фикстура: запускает `build_npc_test.py` во временный путь, затем `bpy.ops.import_scene.gltf`):
  - `test_has_armature_and_bones` — ровно одна арматура, все 18 костей из списка выше.
  - `test_actions` — есть действия, имена которых начинаются с `Idle` и `Walk`; длины 48 и 24 кадра.
  - `test_walk_loop_seamless` — для каждой кости: поворот на кадре 0 и 24 совпадает с точностью 1e-4.
  - `test_triangle_budget` — `triangle_count ≤ 3000`.
  - `test_height` — верх bounding box всех мешей `1.75 ± 0.05`, низ `0 ± 0.02`.
  - `test_palette_only` — каждый материал называется `pal_<ключ PALETTE>`.
  - `test_build_is_repeatable` — два запуска подряд дают одинаковые число объектов, число треугольников и имена действий.
  - `test_stride_property` — `armature["stride_m"] == 0.70`.
- [ ] **Step 2:** `tools/blender.sh -m pytest tools/blender/tests -q` → все FAIL (нет `build_npc_test.py`).
- [ ] **Step 3:** Реализовать `palette.py`, `scene.py`, `rig.py`, `build_npc_test.py` с интерфейсами выше. Формы — из примитивов с bevel/низким числом сегментов; персонаж смотрит по −Y в Blender.
- [ ] **Step 4:** Тесты → все PASS.
- [ ] **Step 5:** `tools/blender.sh tools/blender/build_npc_test.py game/assets/characters/npc_test/npc_test.glb` → файл существует, < 1 МБ.
- [ ] **Step 6:** Commit: «Этап 0: палитра и тестовый житель с Idle/Walk».

### Task 3: Импорт в Godot

**Files:**
- Create: `game/tests/test_npc_import.gd`
- Output: `game/assets/characters/npc_test/npc_test.glb.import` (генерирует Godot)

**Interfaces:**
- Consumes: `npc_test.glb` (Task 2), раннер (Task 1).
- Produces: сцена `res://assets/characters/npc_test/npc_test.glb`, содержащая `AnimationPlayer` с анимациями `Idle` и `Walk` (обе `loop_mode == Animation.LOOP_LINEAR`) и `Skeleton3D`.

- [ ] **Step 1: Write the failing tests** в `test_npc_import.gd`:
  - `test_animations_loop` — `Idle` и `Walk` существуют, `loop_mode == LOOP_LINEAR`, длительности 2.0 и 1.0 с.
  - `test_has_skeleton` — найден `Skeleton3D` с костью `head`.
  - `test_npc_faces_plus_z` — после инстанцирования глобальная Z центра меша `Nose` больше Z кости `head`.
  - `test_height_in_godot` — AABB всех `MeshInstance3D`: высота `1.75 ± 0.05`.
- [ ] **Step 2:** `tools/godot.sh test` до импорта → FAIL (ресурс не найден).
- [ ] **Step 3:** `tools/godot.sh headless --import` — Godot создаёт `.import`. Если суффикс `-loop` не дал цикл, задать цикл в `.import` (`_subresources` → animations → `loop_mode=1`).
- [ ] **Step 4:** `tools/godot.sh test` → все PASS.
- [ ] **Step 5:** Commit: «Этап 0: импорт NPC в Godot».

### Task 4: Витрина — житель ходит в сумеречном тумане

**Files:**
- Create: `game/scripts/npc/npc_walker.gd`, `game/scenes/dev/dusk_environment.tres`, `game/scenes/dev/npc_showcase.tscn`, `game/tests/test_npc_walker.gd`
- Modify: `game/project.godot` (main_scene = витрина)

**Interfaces:**
- Consumes: сцена NPC (Task 3).
- Produces:
  - `class_name NpcWalker extends Node3D`; `@export var model_scene: PackedScene`; `@export var radius: float = 3.0`; `const WALK_CYCLE_S := 1.0`; `func walk_speed() -> float` = `2.0 * stride_m / WALK_CYCLE_S` (stride_m из метаданных модели, по умолчанию 0.70); NPC движется по кругу радиуса `radius`, поворачивается по направлению движения (`look_at(..., Vector3.UP, true)`), проигрывает `Walk`.

- [ ] **Step 1: Write the failing test** `test_npc_walker.gd`:
  - `test_walker_speed_matches_stride` — `walk_speed()` ≈ 1.40 м/с (±0.01).
  - `test_walker_faces_motion` — после 0.5 с симуляции (`_process` вручную) вектор +Z модели совпадает с направлением движения (dot > 0.95).
- [ ] **Step 2:** `tools/godot.sh test` → FAIL.
- [ ] **Step 3:** Реализовать `npc_walker.gd`. Собрать `npc_showcase.tscn`: земля 30×30 м (материал `ground_ash` #3a3632-ish), кольцо кольев частокола (цилиндры, `wood_old`), DirectionalLight3D (тёплый закат, низкий угол, тени), `dusk_environment.tres` (фон — тёмное сине-серое небо, volumetric fog density 0.03 холодного оттенка, glow, tonemap Filmic/ACES, лёгкая виньетка не нужна), Camera3D в изометрическом ракурсе (~45° вниз, 8 м от центра), NpcWalker с моделью.
- [ ] **Step 4:** `tools/godot.sh test` → PASS.
- [ ] **Step 5:** Commit: «Этап 0: витрина NPC с сумеречной атмосферой».

### Task 5: Съёмка и показ автору

**Files:**
- Create: `tools/capture.sh`, `tools/blender/render_preview.py`
- Output: `docs/previews/npc_test_blender.png`, `docs/previews/npc_showcase.png`, `docs/previews/npc_showcase.mp4`

**Interfaces:**
- Consumes: всё выше.
- Produces: `tools/capture.sh` — (1) `tools/godot.sh display --write-movie /tmp/…/showcase.avi --fixed-fps 30 --resolution 1280x720 --quit-after 180` (6 с), (2) `ffmpeg` → `docs/previews/npc_showcase.mp4` (H.264, yuv420p), (3) кадр 90 → `npc_showcase.png`. Падает с сообщением, если Godot переключился на OpenGL (grep `Forward+` в логе).
  `render_preview.py <glb> <out.png>` — Cycles, 64 сэмпла, 1024×1024, три вида (спереди, 3/4, сбоку) на одном кадре.

- [ ] **Step 1:** Реализовать `render_preview.py`; запустить → PNG существует, размер 1024×1024.
- [ ] **Step 2:** Реализовать `capture.sh`; запустить → mp4 ~6 с (`ffprobe` duration 5.5–6.5), PNG существует, в логе `Forward+`.
- [ ] **Step 3:** Посмотреть картинки самому: NPC виден, идёт лицом вперёд, туман и тени есть, ноги не «едут». При дефектах — вернуться к Task 2/4.
- [ ] **Step 4:** Commit: «Этап 0: превью и видео витрины»; push.
- [ ] **Step 5:** Отправить автору PNG и MP4, спросить: нравится ли стиль, что поменять (пропорции, детализация, цвета, атмосфера). Ответ — вход в следующий план.

---

## Итог выполнения (2026-11-13)

Все 5 задач выполнены, каждая прошла проверку; финальная проверка ветки + волна исправлений — чисто. Blender pytest 9/9, Godot 9/9.

**Отложено на следующий план:**
- Вынести `Gait`, `idle_pose`, `make_action` из `tools/blender/build_npc_test.py` в `tools/blender/lib/anim.py` (иначе второй NPC = копирование ~300 строк).
- `WALK_CYCLE_S` читать из длины анимации `Walk`, а не хардкодить.
- Носок сапога уходит в землю на ~1.5 см при отталкивании.
- Тест костей проверяет подмножество, а не ровно 18; `test_actions` не проверяет начало диапазона; шов цикла проверяется только по поворотам.
- `setup.sh`: `--check` не проверяет pytest, нет `apt-get update`, нет контрольной суммы zip Godot.
- `NpcWalker` смешивает локальные и глобальные координаты (сломается под повёрнутым родителем); деление на ноль при `radius = 0`.
- Палитра для Godot генерировать из `palette.py`, а не переписывать вручную.
- Освещение витрины проверено только на глаз.
- Внешний вид модели — ждёт отзыва автора (размах рук, сутулость, кисти, мелкий NPC в кадре).
