/*
This file is part of the TgMod patch set for Telegram Desktop.

For license and copyright information please follow this link:
https://github.com/telegramdesktop/tdesktop/blob/master/LEGAL
*/
#include "mod/mod_config.h"

#include "logs.h"
#include "settings.h"

#include <QtCore/QDir>
#include <QtCore/QFile>
#include <QtCore/QJsonDocument>
#include <QtCore/QJsonObject>
#include <QtCore/QSaveFile>

namespace TgMod {
namespace {

constexpr auto kVersion = 1;

[[nodiscard]] QString ConfigPath() {
	return cWorkingDir() + u"tdata/tgmod.json"_q;
}

} // namespace

Config &Config::Instance() {
	static auto result = Config();
	return result;
}

Config::Config() {
	load();
}

bool Config::showPeerId() const {
	return _showPeerId.current();
}

rpl::producer<bool> Config::showPeerIdValue() const {
	return _showPeerId.value();
}

void Config::setShowPeerId(bool value) {
	if (_showPeerId.current() != value) {
		_showPeerId = value;
		save();
	}
}

bool Config::peerIdBotApiFormat() const {
	return _peerIdBotApiFormat.current();
}

rpl::producer<bool> Config::peerIdBotApiFormatValue() const {
	return _peerIdBotApiFormat.value();
}

void Config::setPeerIdBotApiFormat(bool value) {
	if (_peerIdBotApiFormat.current() != value) {
		_peerIdBotApiFormat = value;
		save();
	}
}

void Config::load() {
	auto file = QFile(ConfigPath());
	if (!file.open(QIODevice::ReadOnly)) {
		return;
	}
	auto error = QJsonParseError();
	const auto document = QJsonDocument::fromJson(file.readAll(), &error);
	if (error.error != QJsonParseError::NoError || !document.isObject()) {
		LOG(("TgMod Error: Could not parse tgmod.json: %1"
			).arg(error.errorString()));
		return;
	}
	const auto object = document.object();
	const auto readBool = [&](const QString &key, bool fallback) {
		const auto value = object.value(key);
		return value.isBool() ? value.toBool() : fallback;
	};
	_showPeerId = readBool(u"show_peer_id"_q, _showPeerId.current());
	_peerIdBotApiFormat = readBool(
		u"peer_id_bot_api_format"_q,
		_peerIdBotApiFormat.current());
}

void Config::save() const {
	auto object = QJsonObject();
	object.insert(u"version"_q, kVersion);
	object.insert(u"show_peer_id"_q, _showPeerId.current());
	object.insert(
		u"peer_id_bot_api_format"_q,
		_peerIdBotApiFormat.current());

	QDir().mkpath(cWorkingDir() + u"tdata"_q);
	auto file = QSaveFile(ConfigPath());
	if (!file.open(QIODevice::WriteOnly)) {
		LOG(("TgMod Error: Could not open tgmod.json for writing."));
		return;
	}
	file.write(QJsonDocument(object).toJson(QJsonDocument::Indented));
	if (!file.commit()) {
		LOG(("TgMod Error: Could not write tgmod.json."));
	}
}

} // namespace TgMod
