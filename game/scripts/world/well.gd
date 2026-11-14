class_name Well
extends Interactable
## Колодец: наполняет лейку при любом предмете в руке, если лейка есть в инвентаре.
## Без инвентаря молча простаивает.

const CAN_ID := "watering_can"

var inventory: Inventory


func _has_can() -> bool:
	return inventory != null and inventory.db != null and inventory.count_of(CAN_ID) > 0


func prompt(_by: Node) -> String:
	if not _has_can():
		return ""
	return tr("PROMPT_CAN_FULL") if inventory.can_water >= Inventory.CAN_CAPACITY \
			else tr("PROMPT_FILL_CAN")


func can_interact(_by: Node) -> bool:
	return _has_can() and inventory.can_water < Inventory.CAN_CAPACITY


func interact(by: Node) -> void:
	if can_interact(by):
		inventory.refill_can()
		interacted.emit(by)
