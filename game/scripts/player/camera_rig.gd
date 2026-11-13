class_name CameraRig
extends Node3D
## Камера: 45° вниз, шаги поворота по 45°, зум, плавное следование за героем.
## yaw = 0: камера на +Z за целью, смотрит в −Z; поворот вокруг +Y (как в PlayerController).

const PITCH_DEG := 45.0
const MIN_DIST := 6.0
const MAX_DIST := 14.0
const DEFAULT_DIST := 8.0
const ROTATE_TIME := 0.25
const ZOOM_STEP := 1.0
const FOLLOW_SPEED := 8.0
const LOOK_HEIGHT := 1.0
const STEP_RAD := PI / 4.0

@export var target: Node3D

var yaw_index: int = 0
var distance: float = DEFAULT_DIST

var _yaw := 0.0    ## сглаженный yaw (без нормализации — идём по кратчайшей дуге)
var _goal := 0.0   ## цель в той же развёртке, что и _yaw
var _camera: Camera3D
var _placed := false

func _ready() -> void:
	_ensure_camera()
	_apply_pose()

func _ensure_camera() -> void:
	if _camera != null:
		return
	for c in get_children():
		if c is Camera3D:
			_camera = c
			return
	_camera = Camera3D.new()
	add_child(_camera)

func rotate_step(dir: int) -> void:
	dir = signi(dir)
	if dir == 0:
		return
	yaw_index = posmod(yaw_index + dir, 8)
	_goal += dir * STEP_RAD

func zoom(steps: float) -> void:
	distance = clampf(distance + steps * ZOOM_STEP, MIN_DIST, MAX_DIST)

## Текущий сглаженный yaw, радианы.
func yaw() -> float:
	return _yaw

## Целевой yaw по yaw_index, радианы [0, 2π).
func target_yaw() -> float:
	return yaw_index * STEP_RAD

func update(delta: float) -> void:
	_ensure_camera()
	var diff := _goal - _yaw
	var max_move := STEP_RAD / ROTATE_TIME * delta
	if absf(diff) <= max_move:
		_yaw = _goal
		# держим развёртку ограниченной
		_yaw = fposmod(_yaw, TAU)
		_goal = _yaw
	else:
		_yaw += signf(diff) * max_move
	if target != null and target.is_inside_tree() and is_inside_tree():
		var look := target.global_position + Vector3(0, LOOK_HEIGHT, 0)
		if _placed:
			global_position = global_position.lerp(look, 1.0 - exp(-FOLLOW_SPEED * delta))
		else:
			global_position = look
			_placed = true
	_apply_pose()

func _apply_pose() -> void:
	if _camera == null:
		return
	rotation = Vector3(0, _yaw, 0)
	var p := deg_to_rad(PITCH_DEG)
	_camera.position = Vector3(0, sin(p), cos(p)) * distance
	_camera.rotation = Vector3(-p, 0, 0)

func _process(delta: float) -> void:
	if Input.is_action_just_pressed("camera_rotate_left"):
		rotate_step(-1)
	if Input.is_action_just_pressed("camera_rotate_right"):
		rotate_step(1)
	if Input.is_action_just_pressed("camera_zoom_in"):
		zoom(-1.0)
	if Input.is_action_just_pressed("camera_zoom_out"):
		zoom(1.0)
	update(delta)

func to_save() -> Dictionary:
	return {"yaw_index": yaw_index, "distance": distance}

func from_save(d: Dictionary) -> void:
	yaw_index = posmod(int(d.get("yaw_index", 0)), 8)
	distance = clampf(float(d.get("distance", DEFAULT_DIST)), MIN_DIST, MAX_DIST)
	_yaw = target_yaw()
	_goal = _yaw
	_apply_pose()
