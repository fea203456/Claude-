class_name FarmInteractor
extends Node
## Ребёнок героя: клетка поля в метре перед ним. Даёт зонду подсказку и действие кнопки E
## (запасной обработчик, когда рядом нет Interactable) и каждый кадр подсвечивает клетку,
## если она в поле. Без поля/инвентаря молча простаивает.

const REACH := 1.0

var state: FarmState
var inventory: Inventory
var db: ContentDB
## Вид поля для подсветки; пусто — ищется узел FarmField в сцене героя.
var field: FarmField


## Герой — родитель.
func hero() -> Node3D:
	return get_parent() as Node3D


## Клетка точки «герой + взгляд × 1 м».
func target_cell() -> Vector2i:
	var h := hero()
	if h == null or not h.is_inside_tree():
		return Vector2i.ZERO
	var f: Vector3 = h.facing() if h.has_method("facing") else Vector3.BACK
	return FarmField.cell_at(h.global_position + f * REACH)


func _usable() -> bool:
	return state != null and inventory != null and state.db != null and inventory.db != null \
			and hero() != null and hero().is_inside_tree()


## Уже переведённый текст: подсказка действия на клетке и строка «Земля: N%».
func prompt(_actor: Node) -> String:
	if not _usable():
		return ""
	return FarmActions.resolve(state, inventory, target_cell())["text"]


func can_interact(_actor: Node) -> bool:
	return _usable() and FarmActions.resolve(state, inventory, target_cell())["kind"] != &"none"


func interact(actor: Node) -> void:
	if can_interact(actor):
		FarmActions.perform(state, inventory, target_cell())


func _process(_delta: float) -> void:
	if field == null:
		field = _find_field()
	if field == null:
		return
	var cell := target_cell()
	field.set_highlight(cell, state != null and hero() != null and hero().is_inside_tree() \
			and state.in_field(cell))


## FarmField в сцене героя: от владельца (корня сцены), иначе от самого верхнего предка.
func _find_field() -> FarmField:
	var top: Node = owner
	if top == null:
		top = self
		while top.get_parent() != null and top.get_parent() != get_tree().root:
			top = top.get_parent()
	return top.find_child("FarmField", true, false) as FarmField
