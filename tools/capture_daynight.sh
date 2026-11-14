#!/usr/bin/env bash
# tools/capture_daynight.sh — съёмка суток на тестовом участке.
# Выход в docs/previews/:
#   day_0600, day_1200, day_1900, day_2100, day_2300, day_0100 (.png) — 1280×720, часы стоят,
#     герой у северо-западного угла частокола (ракурс — SHOT_POSE в daynight_capture.gd);
#   farm_walk.mp4 — 10 с (30 кадр/с, H.264 yuv420p, < 5 МБ): герой идёт от SpawnStart в дом.
# После кадров tools/check_luminance.py проверяет порядок их яркости и контраст YHIGH − YLOW
# утра и полудня не ниже MIN_CONTRAST (провал — выход 1, не удалось измерить — выход 2).
# Падает, если Godot запустился не на Forward+ (например, откатился на OpenGL).
# Игровое сохранение user://save/slot_1.json не трогается (см. daynight_capture.gd).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/docs/previews"
SCRIPT="res://scenes/dev/daynight_capture.gd"
FPS=30
LEAD_FRAMES=30      # первые кадры видео выбрасываем: туман ещё оседает (= WALK_LEAD_FRAMES)
WALK_FRAMES=300     # 10 с
CRF=24
MAX_BYTES=$((5 * 1024 * 1024))
# Порог контраста: 1.5 × контраст day_1200 до настройки света (26 в том же ракурсе) ≈ 39.
MIN_CONTRAST="${MIN_CONTRAST:-39}"
STILLS=(day_0600 day_1200 day_1900 day_2100 day_2300 day_0100)

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

# Строка движка вида «Vulkan 1.4 - Forward+ - Using Device …». Голый grep «Forward+» не годится:
# в режиме Compatibility Godot пишет «Volumetric fog can only be enabled … Forward+ renderer».
RENDERER_RE='^Vulkan .* - Forward\+ - Using Device'
check_renderer() {
  if ! grep -qE "$RENDERER_RE" "$1"; then
    cat "$1" >&2
    echo "capture_daynight: renderer is not Forward+ (OpenGL fallback?) — aborting" >&2
    exit 1
  fi
  grep -m1 -E "$RENDERER_RE" "$1"
}

run_godot() {  # run_godot <log> <godot args…>
  local log="$1"; shift
  "$ROOT/tools/godot.sh" display "$@" >"$log" 2>&1 || {
    cat "$log" >&2
    echo "capture_daynight: Godot failed" >&2
    exit 1
  }
}

echo "capture_daynight: stills to $OUT"
run_godot "$TMP/stills.log" --fixed-fps "$FPS" --resolution 1280x720 --script "$SCRIPT" -- "$OUT"
check_renderer "$TMP/stills.log"
for n in "${STILLS[@]}"; do
  [ -s "$OUT/$n.png" ] || { cat "$TMP/stills.log" >&2; echo "capture_daynight: $n.png missing" >&2; exit 1; }
done
python3 "$ROOT/tools/check_luminance.py" "$OUT" --min-contrast "$MIN_CONTRAST"

echo "capture_daynight: walk, $((LEAD_FRAMES + WALK_FRAMES)) frames to $TMP/walk.avi"
run_godot "$TMP/walk.log" --write-movie "$TMP/walk.avi" --fixed-fps "$FPS" --resolution 1280x720 \
  --quit-after $((LEAD_FRAMES + WALK_FRAMES + 60)) --script "$SCRIPT" -- --walk
check_renderer "$TMP/walk.log"
grep -m1 "walk done" "$TMP/walk.log" || { cat "$TMP/walk.log" >&2; echo "capture_daynight: walk did not finish" >&2; exit 1; }
[ -s "$TMP/walk.avi" ] || { echo "capture_daynight: Godot wrote no movie file" >&2; exit 1; }

ffmpeg -hide_banner -loglevel error -y -i "$TMP/walk.avi" \
  -vf "trim=start_frame=$LEAD_FRAMES:end_frame=$((LEAD_FRAMES + WALK_FRAMES)),setpts=PTS-STARTPTS" \
  -r "$FPS" -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p -movflags +faststart -an \
  "$OUT/farm_walk.mp4"

size=$(stat -c %s "$OUT/farm_walk.mp4")
dur=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$OUT/farm_walk.mp4")
echo "capture_daynight: farm_walk.mp4 ${dur}s, ${size} bytes"
if [ "$size" -ge "$MAX_BYTES" ]; then
  echo "capture_daynight: farm_walk.mp4 is not under 5 MB" >&2
  exit 1
fi
echo "capture_daynight: wrote ${#STILLS[@]} stills and farm_walk.mp4 to $OUT"
