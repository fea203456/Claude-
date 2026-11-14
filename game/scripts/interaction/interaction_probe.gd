class_name InteractionProbe
extends Node3D
## Ребёнок героя: выбирает ближайший Interactable в радиусе и в конусе перед героем.
## Если такого нет — обращается к запасному обработчику (клетка поля перед героем).

const RADIUS := 1.5
const MAX_ANGLE := deg_to_rad(60.0)

## Запасной обработчик с prompt(by), can_interact(by), interact(by); пусто — соседний
## узел FarmInteractor, если он есть.
var fallback: Node


func _ready() -> void:
	if fallback == null and get_parent() != null:
		fallback = get_parent().get_node_or_null("FarmInteractor")


## Кто взаимодействует: ближайший предок-PlayerController, иначе родитель.
## (owner не годится: в сцене это её корень, а не герой.)
func actor() -> Node:
	var n := get_parent()
	while n != null:
		if n is PlayerController:
			return n
		n = n.get_parent()
	return get_parent()


## Направление взгляда героя в плоскости XZ: facing() героя, иначе свой +Z.
func _facing() -> Vector3:
	var a := actor()
	if a != null and a.has_method("facing"):
		return a.facing()
	var f := global_transform.basis.z
	f.y = 0.0
	return f.normalized() if f.length() > 0.0001 else Vector3.BACK


func current() -> Interactable:
	var origin := global_position
	var fwd := _facing()
	var best: Interactable = null
	var best_d := INF
	for n in get_tree().get_nodes_in_group(Interactable.GROUP):
		var it := n as Interactable
		if it == null or not it.is_inside_tree():
			continue
		var to := it.global_position - origin
		to.y = 0.0
		var d := to.length()
		if d > RADIUS:
			continue
		if d > 0.0001 and fwd.angle_to(to) > MAX_ANGLE:
			continue
		if d < best_d:
			best_d = d
			best = it
	return best


## Уже переведённая подсказка: найденного Interactable, иначе запасного обработчика.
func prompt_text() -> String:
	var it := current()
	if it != null:
		return it.prompt(actor())
	if is_instance_valid(fallback):
		return fallback.prompt(actor())
	return ""


## Одно нажатие — одно действие: Interactable в досягаемости всегда важнее поля.
func _unhandled_input(event: InputEvent) -> void:
	if not event.is_action_pressed("interact"):
		return
	var it := current()
	if it != null:
		it.interact(actor())
		get_viewport().set_input_as_handled()
	elif is_instance_valid(fallback) and fallback.can_interact(actor()):
		fallback.interact(actor())
		get_viewport().set_input_as_handled()
