class_name InteractionProbe
extends Node3D
## Ребёнок героя: выбирает ближайший Interactable в радиусе и в конусе перед героем.

const RADIUS := 1.5
const MAX_ANGLE := deg_to_rad(60.0)


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


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("interact"):
		var it := current()
		if it != null:
			it.interact(actor())
			get_viewport().set_input_as_handled()
