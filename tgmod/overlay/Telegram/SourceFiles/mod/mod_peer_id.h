/*
This file is part of the TgMod patch set for Telegram Desktop.

For license and copyright information please follow this link:
https://github.com/telegramdesktop/tdesktop/blob/master/LEGAL
*/
#pragma once

#include "ui/text/text_entity.h"

class PeerData;

namespace TgMod {

// botApiFormat: "-<id>" for basic groups, "-100<id>" for channels.
[[nodiscard]] QString PeerIdText(
	not_null<PeerData*> peer,
	bool botApiFormat);

// Empty text while the "show ID" setting is off.
[[nodiscard]] rpl::producer<TextWithEntities> PeerIdTextValue(
	not_null<PeerData*> peer);

} // namespace TgMod
