/*
This file is part of the TgMod patch set for Telegram Desktop.

For license and copyright information please follow this link:
https://github.com/telegramdesktop/tdesktop/blob/master/LEGAL
*/
#include "mod/mod_settings_section.h"

#include "mod/mod_config.h"
#include "mod/mod_lang.h"
#include "settings/settings_common.h"
#include "ui/vertical_list.h"
#include "ui/widgets/buttons.h"
#include "ui/wrap/vertical_layout.h"
#include "styles/style_settings.h"

namespace Settings {
namespace {

void AddToggle(
		not_null<Ui::VerticalLayout*> container,
		const QString &text,
		rpl::producer<bool> value,
		Fn<void(bool)> changed) {
	const auto button = AddButtonWithIcon(
		container,
		rpl::single(text),
		st::settingsButtonNoIcon);
	button->toggleOn(std::move(value));
	button->toggledChanges(
	) | rpl::on_next(std::move(changed), button->lifetime());
}

} // namespace

ModSection::ModSection(
	QWidget *parent,
	not_null<Window::SessionController*> controller)
: Section(parent, controller) {
	setupContent();
}

rpl::producer<QString> ModSection::title() {
	return rpl::single(TgMod::Tr(u"Mod settings"_q, u"Настройки мода"_q));
}

void ModSection::setupContent() {
	using TgMod::Tr;

	const auto content = Ui::CreateChild<Ui::VerticalLayout>(this);
	const auto config = &TgMod::Config::Instance();

	Ui::AddSkip(content);
	Ui::AddSubsectionTitle(
		content,
		rpl::single(Tr(u"Profile"_q, u"Профиль"_q)));
	AddToggle(
		content,
		Tr(u"Show ID in profile"_q, u"Показывать ID в профиле"_q),
		config->showPeerIdValue(),
		[=](bool value) { config->setShowPeerId(value); });
	AddToggle(
		content,
		Tr(u"ID in Bot API format"_q, u"ID в формате Bot API"_q),
		config->peerIdBotApiFormatValue(),
		[=](bool value) { config->setPeerIdBotApiFormat(value); });
	Ui::AddSkip(content);
	Ui::AddDividerText(
		content,
		rpl::single(Tr(
			u"Bot API format adds the -100 prefix to channels "
			"and supergroups and a minus sign to basic groups."_q,
			u"Формат Bot API добавляет префикс -100 каналам "
			"и супергруппам и минус обычным группам."_q)));

	Ui::ResizeFitChild(this, content);
}

} // namespace Settings
