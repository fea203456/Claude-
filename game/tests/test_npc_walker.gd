extends RefCounted

const GLB := "res://assets/characters/npc_test/npc_test.glb"

func _make() -> Node3D:
	var scr = load("res://scripts/npc/npc_walker.gd")
	if scr == null:
		return null
	var w = scr.new()
	w.model_scene = load(GLB)
	((Engine.get_main_loop() as SceneTree).root).add_child(w)
	return w

func test_walker_speed_matches_stride() -> String:
	var w := _make()
	if w == null:
		return "npc_walker.gd missing"
	var s: float = w.walk_speed()
	w.free()
	if absf(s - 1.40) > 0.01:
		return "walk_speed %f, expected 1.40" % s
	return ""

func test_walker_faces_motion() -> String:
	var w := _make()
	if w == null:
		return "npc_walker.gd missing"
	var model: Node3D = w.get_child(0)
	var p0 := w.global_position
	w._process(0.25)
	w._process(0.25)
	var p1 := w.global_position
	var motion := (p1 - p0).normalized()
	var fwd := model.global_transform.basis.z.normalized()
	var d := fwd.dot(motion)
	w.free()
	if d <= 0.95:
		return "dot %f <= 0.95" % d
	return ""
