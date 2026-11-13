class_name Hud
extends CanvasLayer
## HUD: время, дата, подсказка взаимодействия и временное сообщение (например, о
## неудачном сохранении). Без часов/зонда молча простаивает.

const MESSAGE_SECONDS := 5.0

var clock: GameClock
var probe: InteractionProbe
## false — не брать /root/Clock, если часы не переданы (тесты «без часов» при autoload).
var use_global_clock := true

@onready var _time: Label = $Margin/Top/TimeLabel
@onready var _date: Label = $Margin/Top/DateLabel
@onready var _prompt: Label = $PromptLabel
@onready var _message: Label = $MessageLabel

var _message_left := 0.0


static func format_time(clock_minute: int) -> String:
	return "%02d:%02d" % [(clock_minute / 60) % 24, clock_minute % 60]


static func format_date(day_of_season: int, season: int) -> String:
	return TranslationServer.translate("DATE_FMT").format({
		"day": day_of_season,
		"season": TranslationServer.translate("SEASON_%d" % season),
	})


func _ready() -> void:
	_prompt.visible = false
	_message.visible = false
	refresh()


func time_text() -> String:
	return _time.text


func prompt_visible() -> bool:
	return _prompt.visible


## Уже переведённый текст на MESSAGE_SECONDS секунд.
func show_message(text: String) -> void:
	_message.text = text
	_message.visible = text != ""
	_message_left = MESSAGE_SECONDS if text != "" else 0.0


func message_visible() -> bool:
	return _message.visible


func message_text() -> String:
	return _message.text


func refresh() -> void:
	if clock == null and use_global_clock:
		clock = get_node_or_null("/root/Clock") as GameClock
	if probe == null:
		probe = get_tree().root.find_child("InteractionProbe", true, false) as InteractionProbe
	if clock != null:
		_time.text = format_time(clock.clock_minute())
		_date.text = format_date(clock.day_of_season(), clock.season())
	var it: Interactable = probe.current() if probe != null else null
	_prompt.visible = it != null
	if it != null:
		_prompt.text = it.prompt(probe.actor())


func _process(delta: float) -> void:
	if _message_left > 0.0:
		_message_left -= delta
		if _message_left <= 0.0:
			_message.visible = false
	refresh()
