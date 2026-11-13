class_name Bed
extends Interactable
## Кровать: спать можно с 18:00. Без часов молча простаивает.

signal sleep_requested()

var clock: GameClock


func _ready() -> void:
	super()
	_resolve_clock()


func _resolve_clock() -> void:
	if clock == null:
		clock = get_node_or_null("/root/Clock") as GameClock


func _can_sleep() -> bool:
	if clock == null:
		_resolve_clock()
	return clock != null and clock.can_sleep()


func prompt(_by: Node) -> String:
	return tr("PROMPT_SLEEP") if _can_sleep() else tr("PROMPT_TOO_EARLY")


func can_interact(_by: Node) -> bool:
	return _can_sleep()


func interact(by: Node) -> void:
	if can_interact(by):
		interacted.emit(by)
		sleep_requested.emit()
