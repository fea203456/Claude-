#!/usr/bin/env bash
# tools/godot.sh headless|display <args> | test
# display и test сначала переимпортируют ресурсы (--import), чтобы пересобранный .glb
# не проверялся по устаревшему кэшу game/.godot/imported.
set -euo pipefail
GODOT=/home/user/godot/Godot_v4.5.1-stable_linux.x86_64
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEST_TIMEOUT_S="${GODOT_TEST_TIMEOUT_S:-300}"   # зависший тест не держит прогон вечно
mode="${1:-}"; shift || true

reimport() {
  local log
  if ! log="$("$GODOT" --headless --audio-driver Dummy --path "$ROOT/game" --import 2>&1)"; then
    printf '%s\n' "$log" >&2
    echo "godot.sh: --import failed" >&2
    exit 1
  fi
}

case "$mode" in
  headless) exec "$GODOT" --headless --audio-driver Dummy --path "$ROOT/game" "$@" ;;
  display)  reimport
            exec xvfb-run -a -s "-screen 0 1920x1080x24" "$GODOT" --audio-driver Dummy --path "$ROOT/game" "$@" ;;
  test)     reimport
            exec timeout "$TEST_TIMEOUT_S" "$GODOT" --headless --audio-driver Dummy --path "$ROOT/game" --script res://tests/run_tests.gd ;;
  *) echo "usage: godot.sh headless|display <args> | test" >&2; exit 2 ;;
esac
