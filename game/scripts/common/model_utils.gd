class_name ModelUtils
extends RefCounted
## Общие помощники для glb-моделей персонажей.

## Ищет extras.stride_m в узле и потомках; -1.0, если не нашёл.
static func find_stride(n: Node) -> float:
	if n.has_meta("extras"):
		var ex = n.get_meta("extras")
		if ex is Dictionary and ex.has("stride_m") and float(ex["stride_m"]) > 0.0:
			return float(ex["stride_m"])
	for c in n.get_children():
		var r := find_stride(c)
		if r > 0.0:
			return r
	return -1.0

## Первый AnimationPlayer в узле или потомках.
static func find_player(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var r := find_player(c)
		if r:
			return r
	return null
