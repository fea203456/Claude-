#!/usr/bin/env bash
# tools/capture_farm.sh — съёмка фермы.
# Выход в docs/previews/:
#   farm_field_day.png, farm_field_night.png — 1280×720, 12:00 и 23:00: поле-витрина (3 культуры ×
#     4 стадии, земля 100 / 50 / 0%, половина клеток полита), герой у поля, панель видна;
#   farm_loop.mp4 — 20–40 с (30 кадр/с, H.264 yuv420p, ≤ 5 МБ): герой вскапывает, сажает, поливает,
#     спит (время переводит скрипт), три дня поливает и утром дня 4 собирает урожай.
# Сценарий кадров и видео — game/scenes/dev/farm_capture.gd.
# Падает, если Godot запустился не на Forward+ (например, откатился на OpenGL).
# Игровое сохранение user://save/slot_1.json не трогается (см. farm_capture.gd).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/docs/previews"
SCRIPT="res://scenes/dev/farm_capture.gd"
FPS=30
LEAD_FRAMES=30      # первые кадры видео выбрасываем: туман ещё оседает (= LEAD_FRAMES в farm_capture.gd)
MAX_FRAMES=1500     # предохранитель: сценарий сам выходит раньше (≈ 35 с)
CRF=26
MAX_BYTES=$((5 * 1024 * 1024))
MIN_S=20
MAX_S=40
STILLS=(farm_field_day farm_field_night)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# Строка движка вида «Vulkan 1.4 - Forward+ - Using Device …». Голый grep «Forward+» не годится:
# в режиме Compatibility Godot пишет «Volumetric fog can only be enabled … Forward+ renderer».
RENDERER_RE='^Vulkan .* - Forward\+ - Using Device'
check_renderer() {
  if ! grep -qE "$RENDERER_RE" "$1"; then
    cat "$1" >&2
    echo "capture_farm: renderer is not Forward+ (OpenGL fallback?) — aborting" >&2
    exit 1
  fi
  grep -m1 -E "$RENDERER_RE" "$1"
}

run_godot() {  # run_godot <log> <godot args…>
  local log="$1"; shift
  "$ROOT/tools/godot.sh" display "$@" >"$log" 2>&1 || {
    cat "$log" >&2
    echo "capture_farm: Godot failed" >&2
    exit 1
  }
  # сценарий пишет «WARNING: capture: …», если герой не дошёл или действие не сработало
  if grep -qE "^(ERROR|SCRIPT ERROR)|^WARNING: capture:" "$log"; then
    cat "$log" >&2
    echo "capture_farm: Godot logged warnings or errors" >&2
    exit 1
  fi
}

echo "capture_farm: stills to $OUT"
run_godot "$TMP/stills.log" --fixed-fps "$FPS" --resolution 1280x720 --script "$SCRIPT" -- "$OUT"
check_renderer "$TMP/stills.log"
for n in "${STILLS[@]}"; do
  [ -s "$OUT/$n.png" ] || { cat "$TMP/stills.log" >&2; echo "capture_farm: $n.png missing" >&2; exit 1; }
done

echo "capture_farm: farming loop to $TMP/loop.avi"
run_godot "$TMP/loop.log" --write-movie "$TMP/loop.avi" --fixed-fps "$FPS" --resolution 1280x720 \
  --quit-after "$MAX_FRAMES" --script "$SCRIPT" -- --loop
check_renderer "$TMP/loop.log"
grep -m1 "loop done" "$TMP/loop.log" || { cat "$TMP/loop.log" >&2; echo "capture_farm: loop did not finish" >&2; exit 1; }
[ -s "$TMP/loop.avi" ] || { echo "capture_farm: Godot wrote no movie file" >&2; exit 1; }

ffmpeg -hide_banner -loglevel error -y -i "$TMP/loop.avi" \
  -vf "trim=start_frame=$LEAD_FRAMES,setpts=PTS-STARTPTS" \
  -r "$FPS" -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p -movflags +faststart -an \
  "$OUT/farm_loop.mp4"

size=$(stat -c %s "$OUT/farm_loop.mp4")
dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT/farm_loop.mp4")
echo "capture_farm: farm_loop.mp4 ${dur}s, ${size} bytes"
if [ "$size" -gt "$MAX_BYTES" ]; then
  echo "capture_farm: farm_loop.mp4 is over 5 MB" >&2
  exit 1
fi
if ! awk -v d="$dur" -v lo="$MIN_S" -v hi="$MAX_S" 'BEGIN { exit !(d >= lo && d <= hi) }'; then
  echo "capture_farm: farm_loop.mp4 is ${dur}s, expected ${MIN_S}–${MAX_S}s" >&2
  exit 1
fi
echo "capture_farm: wrote ${#STILLS[@]} stills and farm_loop.mp4 to $OUT"
