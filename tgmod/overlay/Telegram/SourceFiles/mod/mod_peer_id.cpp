/*
This file is part of the TgMod patch set for Telegram Desktop.

For license and copyright information please follow this link:
https://github.com/telegramdesktop/tdesktop/blob/master/LEGAL
*/
#include "mod/mod_peer_id.h"

#include "data/data_peer.h"
#include "data/data_peer_id.h"
#include "mod/mod_config.h"

namespace TgMod {

QString PeerIdText(not_null<PeerData*> peer, bool botApiFormat) {
	const auto id = peer->id;
	if (peerIsUser(id)) {
		return QString::number(qulonglong(peerToUser(id).bare));
	} else if (peerIsChat(id)) {
		const auto bare = QString::number(qulonglong(peerToChat(id).bare));
		return botApiFormat ? (u"-"_q + bare) : bare;
	} else if (peerIsChannel(id)) {
		const auto bare = QString::number(
			qulonglong(peerToChannel(id).bare));
		return botApiFormat ? (u"-100"_q + bare) : bare;
	}
	return QString();
}

rpl::producer<TextWithEntities> PeerIdTextValue(not_null<PeerData*> peer) {
	auto &config = Config::Instance();
	return rpl::combine(
		config.showPeerIdValue(),
		config.peerIdBotApiFormatValue()
	) | rpl::map([=](bool show, bool botApiFormat) {
		return show
			? TextWithEntities{ PeerIdText(peer, botApiFormat) }
			: TextWithEntities();
	});
}

} // namespace TgMod
