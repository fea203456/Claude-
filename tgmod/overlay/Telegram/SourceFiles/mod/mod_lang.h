/*
This file is part of the TgMod patch set for Telegram Desktop.

For license and copyright information please follow this link:
https://github.com/telegramdesktop/tdesktop/blob/master/LEGAL
*/
#pragma once

namespace TgMod {

// Mod strings are not in the cloud language packs,
// so they are picked locally: Russian for "ru*" packs, English otherwise.
[[nodiscard]] QString Tr(const QString &en, const QString &ru);

} // namespace TgMod
