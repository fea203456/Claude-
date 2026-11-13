#!/usr/bin/env bash
# Устанавливает недостающие инструменты (idempotent). `--check` только проверяет.
set -u
VENV=/home/user/blender-venv
GODOT_DIR=/home/user/godot
GODOT=$GODOT_DIR/Godot_v4.5.1-stable_linux.x86_64
GODOT_URL=https://github.com/godotengine/godot/releases/download/4.5.1-stable/Godot_v4.5.1-stable_linux.x86_64.zip
ICD=/usr/share/vulkan/icd.d/lvp_icd.json

if [ "${1:-}" = "--check" ]; then
  fail=0
  v=$("$VENV/bin/python" -c 'import bpy; print(bpy.app.version_string)' 2>/dev/null | tail -n1)
  if [ "$v" = "5.0.1" ]; then echo "OK blender (bpy) $v"; else echo "MISSING: blender (bpy)"; fail=1; fi
  v=$("$GODOT" --headless --version 2>/dev/null | tail -n1)
  case "$v" in 4.5.1.stable*) echo "OK godot $v";; *) echo "MISSING: godot 4.5.1"; fail=1;; esac
  if [ -f "$ICD" ]; then echo "OK vulkan lavapipe ($ICD)"; else echo "MISSING: mesa-vulkan-drivers (lvp_icd.json)"; fail=1; fi
  if command -v ffmpeg >/dev/null; then echo "OK ffmpeg"; else echo "MISSING: ffmpeg"; fail=1; fi
  if command -v xvfb-run >/dev/null; then echo "OK xvfb-run"; else echo "MISSING: xvfb-run"; fail=1; fi
  exit $fail
fi

set -e
if ! "$VENV/bin/python" -c 'import bpy' 2>/dev/null; then
  python3.11 -m venv "$VENV"
  "$VENV/bin/pip" install bpy==5.0.1
fi
"$VENV/bin/python" -c 'import pytest' 2>/dev/null || "$VENV/bin/pip" install pytest
if [ ! -x "$GODOT" ]; then
  mkdir -p "$GODOT_DIR"
  curl -fL "$GODOT_URL" -o "$GODOT_DIR/godot.zip"
  (cd "$GODOT_DIR" && unzip -o godot.zip && rm godot.zip)
  chmod +x "$GODOT"
fi
[ -f "$ICD" ] || apt-get install -y mesa-vulkan-drivers
command -v ffmpeg >/dev/null || apt-get install -y ffmpeg
command -v xvfb-run >/dev/null || apt-get install -y xvfb
exec "$0" --check
