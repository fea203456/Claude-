class_name Hud
extends CanvasLayer
## HUD: время, дата и подсказка взаимодействия. Без часов/зонда молча простаивает.

var clock: GameClock
var probe: InteractionProbe

@onready var _time: Label = $Margin/Top/TimeLabel
@onready var _date: Label = $Margin/Top/DateLabel
@onready var _prompt: Label = $PromptLabel


static func format_time(clock_minute: int) -> String:
	return "%02d:%02d" % [(clock_minute / 60) % 24, clock_minute % 60]


static func format_date(day_of_season: int, season: int) -> String:
	return TranslationServer.translate("DATE_FMT").format({
		"day": day_of_season,
		"season": TranslationServer.translate("SEASON_%d" % season),
	})


func _ready() -> void:
	_prompt.visible = false
	refresh()


func time_text() -> String:
	return _time.text


func prompt_visible() -> bool:
	return _prompt.visible


func refresh() -> void:
	if clock == null:
		clock = get_node_or_null("/root/Clock") as GameClock
	if probe == null:
		probe = get_tree().root.find_child("InteractionProbe", true, false) as InteractionProbe
	if clock != null:
		_time.text = format_time(clock.clock_minute())
		_date.text = format_date(clock.day_of_season(), clock.season())
	var it: Interactable = probe.current() if probe != null else null
	_prompt.visible = it != null
	if it != null:
		_prompt.text = it.prompt(probe.owner if probe.owner != null else probe.get_parent())


func _process(_delta: float) -> void:
	refresh()
