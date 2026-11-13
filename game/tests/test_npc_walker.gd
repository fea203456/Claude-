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
	var loaded: bool = w.has_model()
	var from_model: bool = w.stride_from_model()
	var s: float = w.walk_speed()
	w.free()
	if not loaded:
		return "model not loaded from " + GLB
	if not from_model:
		return "stride is the %.2f fallback, not extras.stride_m from the model" % NpcWalker.DEFAULT_STRIDE_M
	if absf(s - 1.40) > 0.01:
		return "walk_speed %f, expected 1.40" % s
	return ""

func test_walker_faces_motion() -> String:
	var w := _make()
	if w == null:
		return "npc_walker.gd missing"
	if not w.has_model():
		w.free()
		return "model not loaded from " + GLB
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

func test_walker_fallback_without_extras() -> String:
	var scr = load("res://scripts/npc/npc_walker.gd")
	if scr == null:
		return "npc_walker.gd missing"
	var bare := PackedScene.new()
	var root := Node3D.new()
	bare.pack(root)
	root.free()
	var w = scr.new()
	w.model_scene = bare
	((Engine.get_main_loop() as SceneTree).root).add_child(w)
	var loaded: bool = w.has_model()
	var from_model: bool = w.stride_from_model()
	var s: float = w.walk_speed()
	w.free()
	if not loaded:
		return "bare model not loaded"
	if from_model:
		return "stride_from_model() true for a model without extras"
	if absf(s - 2.0 * NpcWalker.DEFAULT_STRIDE_M) > 0.001:
		return "fallback walk_speed %f" % s
	return ""
