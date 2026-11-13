#!/usr/bin/env bash
# tools/godot.sh headless|display <args> | test
GODOT=/home/user/godot/Godot_v4.5.1-stable_linux.x86_64
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mode="${1:-}"; shift || true
case "$mode" in
  headless) exec "$GODOT" --headless --audio-driver Dummy --path "$ROOT/game" "$@" ;;
  display)  exec xvfb-run -a -s "-screen 0 1920x1080x24" "$GODOT" --audio-driver Dummy --path "$ROOT/game" "$@" ;;
  test)     exec "$GODOT" --headless --audio-driver Dummy --path "$ROOT/game" --script res://tests/run_tests.gd ;;
  *) echo "usage: godot.sh headless|display <args> | test" >&2; exit 2 ;;
esac
