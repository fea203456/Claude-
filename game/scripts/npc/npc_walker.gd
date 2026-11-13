class_name NpcWalker
extends Node3D
## Житель идёт по кругу радиуса `radius` и смотрит по ходу движения.

const WALK_CYCLE_S := 1.0
const DEFAULT_STRIDE_M := 0.70

@export var model_scene: PackedScene
@export var radius: float = 3.0

var _stride_m := DEFAULT_STRIDE_M
var _stride_from_model := false
var _angle := 0.0
var _model: Node3D

func _ready() -> void:
	if model_scene == null:
		return
	_model = model_scene.instantiate() as Node3D
	add_child(_model)
	var found := _find_stride(_model)
	_stride_from_model = found > 0.0
	if _stride_from_model:
		_stride_m = found
	var ap := _find_player(_model)
	if ap and ap.has_animation("Walk"):
		ap.play("Walk")
	_place()

## Шаг (одна нога) = stride_m; за цикл Walk делается два шага.
func walk_speed() -> float:
	return 2.0 * _stride_m / WALK_CYCLE_S

## Загружена ли модель.
func has_model() -> bool:
	return _model != null

## true — шаг взят из extras.stride_m модели, false — запасной DEFAULT_STRIDE_M.
func stride_from_model() -> bool:
	return _stride_from_model

func _process(delta: float) -> void:
	_angle += walk_speed() / radius * delta
	_place()

func _place() -> void:
	position = Vector3(cos(_angle), 0.0, sin(_angle)) * radius
	var tangent := Vector3(-sin(_angle), 0.0, cos(_angle))
	if is_inside_tree():
		look_at(global_position + tangent, Vector3.UP, true)

## Ищет extras.stride_m в узле и потомках; -1.0, если не нашёл.
func _find_stride(n: Node) -> float:
	if n.has_meta("extras"):
		var ex = n.get_meta("extras")
		if ex is Dictionary and ex.has("stride_m") and float(ex["stride_m"]) > 0.0:
			return float(ex["stride_m"])
	for c in n.get_children():
		var r := _find_stride(c)
		if r > 0.0:
			return r
	return -1.0

func _find_player(n: Node) -> AnimationPlayer:
	if n is AnimationPlayer:
		return n
	for c in n.get_children():
		var r := _find_player(c)
		if r:
			return r
	return null
