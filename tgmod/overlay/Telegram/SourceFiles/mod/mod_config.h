/*
This file is part of the TgMod patch set for Telegram Desktop.

For license and copyright information please follow this link:
https://github.com/telegramdesktop/tdesktop/blob/master/LEGAL
*/
#pragma once

namespace TgMod {

// Global (not per-account) mod configuration.
// Stored as JSON in <working dir>/tdata/tgmod.json, main thread only.
class Config final {
public:
	[[nodiscard]] static Config &Instance();

	[[nodiscard]] bool showPeerId() const;
	[[nodiscard]] rpl::producer<bool> showPeerIdValue() const;
	void setShowPeerId(bool value);

	[[nodiscard]] bool peerIdBotApiFormat() const;
	[[nodiscard]] rpl::producer<bool> peerIdBotApiFormatValue() const;
	void setPeerIdBotApiFormat(bool value);

private:
	Config();

	void load();
	void save() const;

	rpl::variable<bool> _showPeerId = true;
	rpl::variable<bool> _peerIdBotApiFormat = false;

};

} // namespace TgMod
