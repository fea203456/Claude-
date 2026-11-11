/*
This file is part of the TgMod patch set for Telegram Desktop.

For license and copyright information please follow this link:
https://github.com/telegramdesktop/tdesktop/blob/master/LEGAL
*/
#include "mod/mod_lang.h"

#include "lang/lang_keys.h"

namespace TgMod {

QString Tr(const QString &en, const QString &ru) {
	return Lang::Id().startsWith(u"ru"_q) ? ru : en;
}

} // namespace TgMod
