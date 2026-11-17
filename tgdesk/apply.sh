#!/usr/bin/env bash
# Applies the TgMod overlay and patches onto a clean tweb checkout.
# Usage: tgdesk/apply.sh <path-to-tweb>
set -euo pipefail

here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
target="${1:?usage: apply.sh <path-to-tweb>}"

if [ ! -f "$target/src/config/app.ts" ]; then
	echo "error: $target is not a tweb checkout" >&2
	exit 1
fi

cp -R "$here/overlay/." "$target/"
for patch in "$here"/patches/*.patch; do
	echo "Applying $(basename "$patch")"
	git -C "$target" apply --whitespace=nowarn "$patch"
done
echo "TgMod applied on top of tweb $(cut -c1-12 "$here/UPSTREAM_COMMIT")."
