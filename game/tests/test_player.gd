extends RefCounted

const GLB := "res://assets/characters/npc_test/npc_test.glb"
const ACTIONS := ["move_forward", "move_back", "move_left", "move_right", "run", "interact",
	"camera_rotate_left", "camera_rotate_right", "camera_zoom_in", "camera_zoom_out", "pause"]
const DT := 1.0 / 60.0

func _root() -> Node:
	return (Engine.get_main_loop() as SceneTree).root

func _static_box(size: Vector3, pos: Vector3) -> StaticBody3D:
	var b := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = size
	cs.shape = sh
	b.add_child(cs)
	b.position = pos
	_root().add_child(b)
	return b

## Мир: пол 20×0.2×20 (верх на y=0), герой в начале координат. Нужен await physics_frame.
func _world(extra_wall := false) -> Array:
	var nodes: Array = []
	nodes.append(_static_box(Vector3(20, 0.2, 20), Vector3(0, -0.1, 0)))
	if extra_wall:
		nodes.append(_static_box(Vector3(4, 2, 0.2), Vector3(0, 1, -1.0)))
	var p := PlayerController.new()
	p.model_scene = load(GLB)
	_root().add_child(p)
	nodes.append(p)
	await (Engine.get_main_loop() as SceneTree).physics_frame
	await (Engine.get_main_loop() as SceneTree).physics_frame
	return nodes

func _free(nodes: Array) -> void:
	for n in nodes:
		n.free()

func _run(p: PlayerController, input: Vector2, running: bool, yaw: float, seconds: float) -> void:
	for i in int(seconds / DT):
		p.step(input, running, yaw, DT)

func test_input_map_has_keyboard_and_joypad() -> String:
	for a in ACTIONS:
		if not InputMap.has_action(a):
			return "action missing: " + a
		var kb := false
		var pad := false
		for e in InputMap.action_get_events(a):
			if e is InputEventKey or e is InputEventMouseButton:
				kb = true
			elif e is InputEventJoypadButton or e is InputEventJoypadMotion:
				pad = true
		if not kb:
			return a + ": no keyboard/mouse event"
		if not pad:
			return a + ": no joypad event"
	return ""

func test_walk_speed_from_model() -> String:
	var w = await _world()
	var s: float = w[-1].walk_speed()
	_free(w)
	if absf(s - 1.40) > 0.01:
		return "walk_speed %f, expected 1.40" % s
	return ""

func test_forward_follows_camera_yaw() -> String:
	var w = await _world()
	var p: PlayerController = w[-1]
	var p0 := p.global_position
	p.step(Vector2(0, -1), false, PI / 2, 0.5)
	p.step(Vector2(0, -1), false, PI / 2, 0.5)
	var d := p.global_position - p0
	d.y = 0
	_free(w)
	if d.length() < 0.001:
		return "did not move"
	var dot := d.normalized().dot(Vector3(-1, 0, 0))
	if dot <= 0.95:
		return "dot %f <= 0.95 (d=%s)" % [dot, d]
	return ""

func test_run_speed() -> String:
	var w = await _world()
	var p: PlayerController = w[-1]
	p.step(Vector2(0, -1), true, 0.0, DT)
	var v := Vector2(p.velocity.x, p.velocity.z).length()
	_free(w)
	if absf(v - 2.52) > 0.02:
		return "run speed %f, expected 2.52" % v
	return ""

func test_diagonal_not_faster() -> String:
	var w = await _world()
	var p: PlayerController = w[-1]
	p.step(Vector2(1, -1), false, 0.0, DT)
	var v := Vector2(p.velocity.x, p.velocity.z).length()
	_free(w)
	if absf(v - 1.40) > 0.02:
		return "diagonal speed %f, expected 1.40" % v
	return ""

func test_blocked_by_wall() -> String:
	var w = await _world(true)
	var p: PlayerController = w[-1]
	_run(p, Vector2(0, -1), false, 0.0, 2.0)
	var dist := -p.global_position.z
	_free(w)
	if dist > 0.75:
		return "went %f m into the wall, expected <= 0.75" % dist
	if dist < 0.3:
		return "barely moved (%f m); collision setup suspect" % dist
	return ""

func test_idle_when_no_input() -> String:
	var w = await _world()
	var p: PlayerController = w[-1]
	p.step(Vector2(0, -1), false, 0.0, DT)
	p.step(Vector2.ZERO, false, 0.0, DT)
	var ap := ModelUtils.find_player(p)
	var cur := ap.current_animation if ap else "<no player>"
	var sc := ap.speed_scale if ap else 0.0
	_free(w)
	if cur != "Idle":
		return "animation %s, expected Idle" % cur
	if absf(sc - 1.0) > 0.001:
		return "idle speed_scale %f" % sc
	return ""

func test_faces_motion() -> String:
	var w = await _world()
	var p: PlayerController = w[-1]
	_run(p, Vector2(1, 0), false, 0.0, 0.5)
	var model: Node3D = p.get_child(p.get_child_count() - 1)
	for c in p.get_children():
		if c is Node3D and not (c is CollisionShape3D):
			model = c
	var fwd := model.global_transform.basis.z.normalized()
	var dot := fwd.dot(Vector3(1, 0, 0))
	var ap := ModelUtils.find_player(p)
	var cur := ap.current_animation if ap else ""
	_free(w)
	if dot <= 0.95:
		return "dot %f <= 0.95" % dot
	if cur != "Walk":
		return "animation %s, expected Walk" % cur
	return ""

func test_save_roundtrip() -> String:
	var w = await _world()
	var p: PlayerController = w[-1]
	p.global_position = Vector3(3.5, 0.0, -2.25)
	p.step(Vector2(-1, 0), false, 0.0, DT)  # развернуть модель
	var d := p.to_save()
	var pos := p.global_position
	var q := PlayerController.new()
	q.model_scene = load(GLB)
	_root().add_child(q)
	q.from_save(d)
	var d2 := q.to_save()
	var ok := q.global_position.distance_to(pos) < 0.001 and absf(float(d2["yaw"]) - float(d["yaw"])) < 0.001
	var shape_ok: bool = d.has("pos") and d["pos"].size() == 3 and d.has("yaw")
	q.free()
	_free(w)
	if not shape_ok:
		return "bad save shape: %s" % [d]
	if not ok:
		return "roundtrip mismatch %s vs %s" % [d, d2]
	return ""
