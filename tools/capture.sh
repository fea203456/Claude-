#!/usr/bin/env bash
# tools/capture.sh — съёмка витрины NPC: 6 с видео (30 кадр/с, 1280×720) и кадр 90.
# Выход: docs/previews/npc_showcase.mp4 (H.264, yuv420p) и docs/previews/npc_showcase.png.
# Падает, если Godot запустился не на Forward+ (например, откатился на OpenGL).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/docs/previews"
FPS=30
FRAMES=180          # 6 с
STILL_FRAME=90
CRF=23

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$OUT"

echo "capture: recording $FRAMES frames to $TMP/showcase.avi"
"$ROOT/tools/godot.sh" display \
  --write-movie "$TMP/showcase.avi" \
  --fixed-fps "$FPS" \
  --resolution 1280x720 \
  --quit-after "$FRAMES" >"$TMP/godot.log" 2>&1 || {
  cat "$TMP/godot.log" >&2
  echo "capture: Godot failed" >&2
  exit 1
}

# Строка движка вида «Vulkan 1.4 - Forward+ - Using Device …». Голый grep «Forward+» не годится:
# в режиме Compatibility Godot пишет «Volumetric fog can only be enabled … Forward+ renderer».
RENDERER_RE='^Vulkan .* - Forward\+ - Using Device'
if ! grep -qE "$RENDERER_RE" "$TMP/godot.log"; then
  cat "$TMP/godot.log" >&2
  echo "capture: renderer is not Forward+ (OpenGL fallback?) — aborting" >&2
  exit 1
fi
grep -m1 -E "$RENDERER_RE" "$TMP/godot.log"

if [ ! -s "$TMP/showcase.avi" ]; then
  echo "capture: Godot wrote no movie file" >&2
  exit 1
fi

ffmpeg -hide_banner -loglevel error -y -i "$TMP/showcase.avi" \
  -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p -movflags +faststart -an \
  "$OUT/npc_showcase.mp4"

ffmpeg -hide_banner -loglevel error -y -i "$TMP/showcase.avi" \
  -vf "select=eq(n\,$STILL_FRAME)" -frames:v 1 -update 1 \
  "$OUT/npc_showcase.png"

[ -s "$OUT/npc_showcase.png" ] || { echo "capture: frame $STILL_FRAME not extracted" >&2; exit 1; }
echo "capture: wrote $OUT/npc_showcase.mp4 and $OUT/npc_showcase.png"
