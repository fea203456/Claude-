extends RefCounted

const GLB := "res://assets/characters/npc_test/npc_test.glb"

func _root() -> Node:
	return (Engine.get_main_loop() as SceneTree).root

func _rig(target_pos := Vector3.ZERO) -> Array:
	var t := Node3D.new()
	_root().add_child(t)
	t.global_position = target_pos
	var r := CameraRig.new()
	r.target = t
	_root().add_child(r)
	return [r, t]

func _cam(r: CameraRig) -> Camera3D:
	return r.find_children("*", "Camera3D", true, false)[0]

func _look(t: Node3D) -> Vector3:
	return t.global_position + Vector3(0, 1.0, 0)

func test_default_pose() -> String:
	var n := _rig()
	var r: CameraRig = n[0]
	r.update(1.0)
	var off := _cam(r).global_position - _look(n[1])
	var d := off.length()
	var elev := rad_to_deg(asin(off.y / d))
	var behind := off.z > 0.0
	for x in n:
		x.free()
	if absf(d - 8.0) > 0.05:
		return "distance %f" % d
	if absf(elev - 45.0) > 1.0:
		return "pitch %f" % elev
	if not behind:
		return "camera not on +Z at yaw 0"
	return ""

func test_rotate_step_reaches_target_in_time() -> String:
	var n := _rig()
	var r: CameraRig = n[0]
	r.update(0.0)
	r.rotate_step(1)
	r.update(0.125)
	var mid := r.yaw()
	r.update(0.15)
	var end := rad_to_deg(r.yaw())
	for x in n:
		x.free()
	if mid <= 0.0 or mid >= deg_to_rad(45.0):
		return "mid yaw %f" % mid
	if absf(end - 45.0) > 0.5:
		return "end yaw %f" % end
	return ""

func test_rotation_wraps_shortest() -> String:
	var n := _rig()
	var r: CameraRig = n[0]
	r.update(0.0)
	r.rotate_step(-1)
	r.update(0.125)
	var mid := rad_to_deg(wrapf(r.yaw(), -PI, PI))
	var idx := r.yaw_index
	var tgt := rad_to_deg(r.target_yaw())
	for x in n:
		x.free()
	if idx != 7:
		return "yaw_index %d" % idx
	if absf(fposmod(tgt, 360.0) - 315.0) > 0.01:
		return "target %f" % tgt
	if mid <= -45.0 or mid >= 0.0:
		return "mid %f not in (-45,0)" % mid
	return ""

func test_zoom_clamped() -> String:
	var n := _rig()
	var r: CameraRig = n[0]
	r.zoom(-100)
	var a := r.distance
	r.zoom(100)
	var b := r.distance
	for x in n:
		x.free()
	if a != 6.0 or b != 14.0:
		return "zoom %f %f" % [a, b]
	return ""

func test_follows_target() -> String:
	var n := _rig()
	var r: CameraRig = n[0]
	r.update(1.0)
	n[1].global_position = Vector3(5, 0, 0)
	r.update(2.0)
	var err := (r.global_position - _look(n[1])).length()
	for x in n:
		x.free()
	return "" if err < 0.05 else "look err %f" % err

func test_player_moves_along_smoothed_yaw() -> String:
	var nodes: Array = []
	var floor_body := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = Vector3(20, 0.2, 20)
	cs.shape = sh
	floor_body.add_child(cs)
	floor_body.position = Vector3(0, -0.1, 0)
	_root().add_child(floor_body)
	nodes.append(floor_body)
	var p := PlayerController.new()
	p.model_scene = load(GLB)
	_root().add_child(p)
	nodes.append(p)
	await (Engine.get_main_loop() as SceneTree).physics_frame
	await (Engine.get_main_loop() as SceneTree).physics_frame
	var rr := _rig()
	var r: CameraRig = rr[0]
	r.update(0.0)
	p.camera_yaw_provider = r.yaw
	r.rotate_step(1)
	var start := p.global_position
	for i in 10:
		p.step(Vector2(0, -1), false, p.camera_yaw_provider.call(), 1.0 / 60.0)
	var d := p.global_position - start
	var dot := d.normalized().dot(Vector3(0, 0, -1))
	for x in nodes:
		x.free()
	for x in rr:
		x.free()
	return "" if dot > 0.95 else "dot %f" % dot

func test_save_roundtrip() -> String:
	var n := _rig()
	var r: CameraRig = n[0]
	r.yaw_index = 3
	r.distance = 11.0
	var d := r.to_save()
	var n2 := _rig()
	var r2: CameraRig = n2[0]
	r2.from_save(d)
	var ok := r2.yaw_index == 3 and r2.distance == 11.0 and absf(r2.yaw() - r2.target_yaw()) < 0.0001
	var msg := "yaw_index %d dist %f yaw %f tgt %f" % [r2.yaw_index, r2.distance, r2.yaw(), r2.target_yaw()]
	for x in n + n2:
		x.free()
	return "" if ok else msg

## Соглашение о yaw при ненулевом повороте: yaw_index 2 (90°) ставит камеру на +X от цели,
## а «вперёд» героя при этом yaw направлено от камеры.
func test_nonzero_yaw_convention() -> String:
	var n := _rig()
	var r: CameraRig = n[0]
	r.from_save({"yaw_index": 2, "distance": 8.0})
	r.update(1.0)
	var off := _cam(r).global_position - _look(n[1])
	var p := PlayerController.new()
	_root().add_child(p)
	p.step(Vector2(0, -1), false, r.yaw(), 1.0 / 60.0)
	var fwd := p.facing()
	p.free()
	for x in n:
		x.free()
	var off_xz := Vector3(off.x, 0.0, off.z).normalized()
	var fwd_xz := Vector3(fwd.x, 0.0, fwd.z).normalized()
	if off.x <= 0.5 * 8.0 * cos(deg_to_rad(45.0)):
		return "camera not on +X at yaw_index 2: offset %s" % off
	var dot := fwd_xz.dot(off_xz)
	return "" if dot < -0.95 else "forward %s does not point away from camera (dot %f)" % [fwd_xz, dot]
