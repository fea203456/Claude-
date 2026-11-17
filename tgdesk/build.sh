#!/usr/bin/env bash
# Builds TgMod from scratch: tweb at the pinned commit + the mod, then the desktop app.
# Usage: tgdesk/build.sh [win|linux]   (default: win)
# Needs git, Node.js 22+, pnpm 11 (corepack enable) and npm.
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:-win}"
work="$here/.work"
tweb="$work/tweb"

mkdir -p "$work"
if [ ! -d "$tweb/.git" ]; then
	git clone https://github.com/morethanwords/tweb.git "$tweb"
fi
git -C "$tweb" fetch --depth 1 origin "$(cat "$here/UPSTREAM_COMMIT")"
git -C "$tweb" checkout -q --force "$(cat "$here/UPSTREAM_COMMIT")"
git -C "$tweb" clean -fdq -e node_modules -e .env.local
"$here/apply.sh" "$tweb"

# * TGMOD_SYNC_URL: the decoration sync server built in for everyone (see sync-server/README.md)
(cd "$tweb" && pnpm install --frozen-lockfile && VITE_TGMOD_SYNC_URL="${TGMOD_SYNC_URL:-}" pnpm exec vite build)
node "$here/scripts/assemble-app.js" "$tweb" "$here/electron/app"

cd "$here/electron"
npm ci
npm run "dist:$target"
echo "Done: $here/electron/release"
