class_name Interactable
extends Area3D
## Объект, с которым герой взаимодействует клавишей `interact`.

signal interacted(by: Node)

const GROUP := &"interactable"


func _ready() -> void:
	add_to_group(GROUP)


func can_interact(_by: Node) -> bool:
	return true


## Уже переведённый текст подсказки.
func prompt(_by: Node) -> String:
	return ""


func interact(by: Node) -> void:
	if can_interact(by):
		interacted.emit(by)
