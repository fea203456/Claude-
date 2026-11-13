class_name PlayerController
extends CharacterBody3D
## Герой: движение относительно камеры, бег, поворот модели по ходу, анимации Idle/Walk.

const WALK_CYCLE_S := 1.0
const DEFAULT_STRIDE_M := 0.70
const RUN_MULT := 1.8

@export var model_scene: PackedScene
## Возвращает yaw камеры в радианах.
var camera_yaw_provider: Callable = func() -> float: return 0.0

var _stride_m := DEFAULT_STRIDE_M
var _model: Node3D
var _anim: AnimationPlayer
var _yaw := 0.0

func _ready() -> void:
	var cs := CollisionShape3D.new()
	var cap := CapsuleShape3D.new()
	cap.radius = 0.3
	cap.height = 1.75
	cs.shape = cap
	cs.position = Vector3(0, 0.875, 0)
	add_child(cs)
	if model_scene == null:
		return
	_model = model_scene.instantiate() as Node3D
	add_child(_model)
	var found := ModelUtils.find_stride(_model)
	if found > 0.0:
		_stride_m = found
	_anim = ModelUtils.find_player(_model)
	_model.rotation.y = _yaw
	_play("Idle", 1.0)

## Скорость ходьбы: за цикл Walk делается два шага по stride_m.
func walk_speed() -> float:
	return 2.0 * _stride_m / WALK_CYCLE_S

func _physics_process(delta: float) -> void:
	var input := Input.get_vector("move_left", "move_right", "move_forward", "move_back")
	var yaw: float = camera_yaw_provider.call() if camera_yaw_provider.is_valid() else 0.0
	step(input, Input.is_action_pressed("run"), yaw, delta)

func step(input: Vector2, running: bool, camera_yaw: float, delta: float) -> void:
	if input.length() > 1.0:
		input = input.normalized()
	var dir := Vector3(input.x, 0.0, input.y).rotated(Vector3.UP, camera_yaw)
	var speed := walk_speed() * (RUN_MULT if running else 1.0) * input.length()
	var vy := velocity.y
	velocity = dir * walk_speed() * (RUN_MULT if running else 1.0)
	velocity.y = vy
	if not is_on_floor():
		velocity.y -= 9.8 * delta
	move_and_slide()
	if input.length() > 0.001:
		_yaw = atan2(dir.x, dir.z)
		if _model:
			_model.rotation.y = _yaw
		_play("Walk", speed / walk_speed())
	else:
		_play("Idle", 1.0)

func _play(anim: String, scale: float) -> void:
	if _anim == null or not _anim.has_animation(anim):
		return
	if _anim.current_animation != anim:
		_anim.play(anim)
	_anim.speed_scale = scale

func to_save() -> Dictionary:
	return {"pos": [global_position.x, global_position.y, global_position.z], "yaw": _yaw}

func from_save(d: Dictionary) -> void:
	var p: Array = d.get("pos", [0.0, 0.0, 0.0])
	global_position = Vector3(float(p[0]), float(p[1]), float(p[2]))
	_yaw = float(d.get("yaw", 0.0))
	if _model:
		_model.rotation.y = _yaw
