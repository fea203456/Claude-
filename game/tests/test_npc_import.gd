extends RefCounted

const GLB := "res://assets/characters/npc_test/npc_test.glb"

func _inst() -> Node:
	var scene = load(GLB)
	if scene == null:
		return null
	return scene.instantiate()

func _find(n: Node, cls: String) -> Node:
	if n.is_class(cls):
		return n
	for c in n.get_children():
		var r := _find(c, cls)
		if r:
			return r
	return null

func _meshes(n: Node, out: Array) -> void:
	if n is MeshInstance3D:
		out.append(n)
	for c in n.get_children():
		_meshes(c, out)

func test_animations_loop() -> String:
	var inst := _inst()
	if inst == null:
		return "cannot load " + GLB
	var ap := _find(inst, "AnimationPlayer") as AnimationPlayer
	if ap == null:
		inst.free()
		return "no AnimationPlayer"
	var err := ""
	for pair in [["Idle", 2.0], ["Walk", 1.0]]:
		if not ap.has_animation(pair[0]):
			err = "missing animation " + pair[0] + " have " + str(ap.get_animation_list())
			break
		var a := ap.get_animation(pair[0])
		if a.loop_mode != Animation.LOOP_LINEAR:
			err = pair[0] + " loop_mode=" + str(a.loop_mode)
			break
		if absf(a.length - pair[1]) > 0.01:
			err = pair[0] + " length=" + str(a.length)
			break
	inst.free()
	return err

func test_has_skeleton() -> String:
	var inst := _inst()
	if inst == null:
		return "cannot load " + GLB
	var sk := _find(inst, "Skeleton3D") as Skeleton3D
	var err := ""
	if sk == null:
		err = "no Skeleton3D"
	elif sk.find_bone("head") < 0:
		err = "no bone head"
	inst.free()
	return err

func test_npc_faces_plus_z() -> String:
	var inst := _inst()
	if inst == null:
		return "cannot load " + GLB
	var root := (Engine.get_main_loop() as SceneTree).root
	root.add_child(inst)
	var err := ""
	var sk := _find(inst, "Skeleton3D") as Skeleton3D
	var nose: MeshInstance3D = null
	var ms := []
	_meshes(inst, ms)
	for m in ms:
		if m.name == &"Nose":
			nose = m
	if sk == null or nose == null:
		err = "missing skeleton or Nose mesh"
	else:
		var idx := sk.find_bone("head")
		var head_z := (sk.global_transform * sk.get_bone_global_rest(idx)).origin.z
		var box := nose.global_transform * nose.get_aabb()
		var nose_z := box.get_center().z
		if not nose_z > head_z:
			err = "nose z %f not > head z %f" % [nose_z, head_z]
	root.remove_child(inst)
	inst.free()
	return err

func test_height_in_godot() -> String:
	var inst := _inst()
	if inst == null:
		return "cannot load " + GLB
	var root := (Engine.get_main_loop() as SceneTree).root
	root.add_child(inst)
	var ms := []
	_meshes(inst, ms)
	var box := AABB()
	var first := true
	for m in ms:
		var b: AABB = m.global_transform * m.get_aabb()
		box = b if first else box.merge(b)
		first = false
	root.remove_child(inst)
	inst.free()
	if first:
		return "no meshes"
	if absf(box.size.y - 1.75) > 0.05:
		return "height %f" % box.size.y
	return ""

func _stride_meta(n: Node) -> Variant:
	if n.has_meta("extras"):
		var ex = n.get_meta("extras")
		if ex is Dictionary and ex.has("stride_m"):
			return ex["stride_m"]
	for c in n.get_children():
		var r = _stride_meta(c)
		if r != null:
			return r
	return null

func test_stride_in_extras() -> String:
	var inst := _inst()
	if inst == null:
		return "cannot load " + GLB
	var v = _stride_meta(inst)
	inst.free()
	if v == null:
		return "no node with meta extras.stride_m"
	if absf(float(v) - 0.70) > 0.005:
		return "extras.stride_m %s, expected 0.70" % str(v)
	return ""
