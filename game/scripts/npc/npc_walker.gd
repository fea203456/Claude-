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
	var found := ModelUtils.find_stride(_model)
	_stride_from_model = found > 0.0
	if _stride_from_model:
		_stride_m = found
	var ap := ModelUtils.find_player(_model)
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
