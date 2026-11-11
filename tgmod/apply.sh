#!/usr/bin/env bash
# Applies the TgMod overlay and patches onto a clean tdesktop checkout.
# Usage: tgmod/apply.sh <path-to-tdesktop>
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:?usage: apply.sh <path-to-tdesktop>}"

if [ ! -f "$target/Telegram/CMakeLists.txt" ]; then
	echo "error: $target is not a tdesktop checkout" >&2
	exit 1
fi

cp -R "$here/overlay/." "$target/"
for patch in "$here"/patches/*.patch; do
	echo "Applying $(basename "$patch")"
	git -C "$target" apply --whitespace=nowarn "$patch"
done
echo "TgMod applied on top of $(cat "$here/UPSTREAM_TAG")."
