extends RefCounted

const HOUSE := "res://scenes/world/house.tscn"
const HERO := "res://assets/characters/npc_test/npc_test.glb"
const DT := 1.0 / 60.0
## Дом сдвинут от начала координат, чтобы проверка шла в его локальных координатах.
const HOUSE_POS := Vector3(10.0, 0.0, -5.0)

func _root() -> Node:
	return (Engine.get_main_loop() as SceneTree).root

func _floor() -> StaticBody3D:
	var b := StaticBody3D.new()
	var cs := CollisionShape3D.new()
	var sh := BoxShape3D.new()
	sh.size = Vector3(40, 0.2, 40)
	cs.shape = sh
	b.add_child(cs)
	b.position = HOUSE_POS + Vector3(0, -0.1, 0)
	_root().add_child(b)
	return b

## Внутри дома: в локальных координатах |x| < 2.8 и z < 2.3 (за передней стеной, дверь на +Z).
static func _inside(local: Vector3) -> bool:
	return absf(local.x) < 2.8 and local.z < 2.3

## Герой стартует снаружи перед передней стеной (локально x, z = 3.5) и идёт 3 с к −Z.
func _walk_in(x: float) -> Vector3:
	var floor_body := _floor()
	var house := (load(HOUSE) as PackedScene).instantiate() as Node3D
	house.position = HOUSE_POS
	_root().add_child(house)
	var p := PlayerController.new()
	p.model_scene = load(HERO)
	_root().add_child(p)
	p.global_position = house.to_global(Vector3(x, 0.0, 3.5))
	await (Engine.get_main_loop() as SceneTree).physics_frame
	await (Engine.get_main_loop() as SceneTree).physics_frame
	for i in int(3.0 / DT):
		p.step(Vector2(0, -1), false, 0.0, DT)
	var local := house.to_local(p.global_position)
	p.free()
	house.free()
	floor_body.free()
	return local

func test_house_collision_has_door_gap() -> String:
	var through: Vector3 = await _walk_in(0.0)
	if not _inside(through) or through.z >= 0.0:
		return "walked through the door but ended at %s (house-local), expected inside, z < 0" % through
	var blocked: Vector3 = await _walk_in(1.5)
	if _inside(blocked):
		return "walked into the wall 1.5 m from the door and got inside: %s" % blocked
	if blocked.z > 3.0:
		return "barely moved toward the wall (%s); setup suspect" % blocked
	return ""

func test_house_nodes() -> String:
	var house := (load(HOUSE) as PackedScene).instantiate() as Node3D
	var msg := ""
	if house.name != "House":
		msg = "root is %s, expected House" % house.name
	var bed := house.find_child("Bed", true, false)
	var spawn := house.find_child("BedSpawn", true, false) as Marker3D
	if msg == "" and bed == null:
		msg = "no Bed node"
	elif msg == "" and spawn == null:
		msg = "no BedSpawn Marker3D"
	elif msg == "" and not _inside(spawn.position):
		msg = "BedSpawn %s is not inside the house" % spawn.position
	elif msg == "" and house.find_children("*", "StaticBody3D", true, false).is_empty():
		msg = "no StaticBody3D collision"
	house.free()
	return msg

## Крыша скрыта, пока герой в доме (камера 45° иначе не видит интерьер), и снова видна снаружи.
func test_roof_hides_while_player_inside() -> String:
	var tree := Engine.get_main_loop() as SceneTree
	var floor_body := _floor()
	var house := (load(HOUSE) as PackedScene).instantiate() as Node3D
	house.position = HOUSE_POS
	_root().add_child(house)
	var roof := house.find_child("HouseRoof", true, false) as Node3D
	var p := PlayerController.new()
	_root().add_child(p)
	p.global_position = house.to_global(Vector3(0.0, 0.0, 6.0))
	await tree.physics_frame
	await tree.physics_frame
	var err := ""
	if roof == null:
		err = "no HouseRoof"
	elif not roof.visible:
		err = "roof hidden while the player is outside"
	if err == "":
		p.global_position = house.to_global(Vector3(-1.0, 0.0, -0.5))
		await tree.physics_frame
		await tree.physics_frame
		if roof.visible:
			err = "roof visible while the player is inside"
	if err == "":
		p.global_position = house.to_global(Vector3(0.0, 0.0, 6.0))
		await tree.physics_frame
		await tree.physics_frame
		if not roof.visible:
			err = "roof stays hidden after the player left"
	p.free()
	house.free()
	floor_body.free()
	return err
