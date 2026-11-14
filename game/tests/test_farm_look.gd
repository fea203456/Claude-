extends RefCounted

const FARM := "res://scenes/world/farm_test.tscn"
const BANDS := ["FogBandN", "FogBandE", "FogBandS", "FogBandW"]

func _tree() -> SceneTree:
	return Engine.get_main_loop() as SceneTree

func _spawn() -> Node:
	var farm := (load(FARM) as PackedScene).instantiate()
	_tree().root.add_child(farm)
	await _tree().physics_frame
	await _tree().physics_frame
	return farm

func _aabb(v: FogVolume) -> AABB:
	return AABB(v.global_position - v.size / 2.0, v.size)

func test_farm_has_moon_and_fog_wired() -> String:
	var farm := await _spawn()
	var msg := ""
	var dn := farm.get_node_or_null("DayNightLighting") as DayNightLighting
	var moon := farm.get_node_or_null("Moon") as DirectionalLight3D
	var band := farm.get_node_or_null("FogBandN") as FogVolume
	if dn == null or moon == null or band == null:
		msg = "DayNightLighting/Moon/FogBandN missing"
	elif dn.moon != moon:
		msg = "DayNightLighting.moon is not the Moon node"
	elif not moon.shadow_enabled:
		msg = "Moon shadows disabled"
	elif dn.ground_fog == null or dn.ground_fog != band.material:
		msg = "ground_fog is not the FogBandN material"
	elif not (dn.ground_fog.height_falloff > 0.0 and dn.ground_fog.edge_fade > 0.0):
		msg = "fog material needs height_falloff > 0 and edge_fade > 0"
	farm.free()
	return msg

func test_fog_volumes_outside_yard() -> String:
	var farm := await _spawn()
	var msg := ""
	var yard := AABB(Vector3(-17, -100, -17), Vector3(34, 200, 34))
	for n in BANDS:
		var v := farm.get_node_or_null(n) as FogVolume
		if v == null:
			msg = "%s missing" % n
			break
		if v.shape != RenderingServer.FOG_VOLUME_SHAPE_BOX:
			msg = "%s is not BOX" % n
			break
		if _aabb(v).intersects(yard):
			msg = "%s intersects the yard %s" % [n, _aabb(v)]
			break
	farm.free()
	return msg

func test_fog_bands_surround_farm() -> String:
	var farm := await _spawn()
	var msg := ""
	for p in [Vector3(0, 1, 20), Vector3(0, 1, -20), Vector3(20, 1, 0), Vector3(-20, 1, 0)]:
		var hit := false
		for n in BANDS:
			var v := farm.get_node_or_null(n) as FogVolume
			if v != null and _aabb(v).has_point(p):
				hit = true
		if not hit:
			msg = "point %s not covered by fog bands" % p
			break
	farm.free()
	return msg

func test_farm_environment_ashen() -> String:
	var farm := await _spawn()
	var msg := ""
	var env := (farm.get_node("WorldEnvironment") as WorldEnvironment).environment
	if not (env.fog_enabled and env.fog_aerial_perspective > 0.0):
		msg = "distance haze/aerial perspective missing"
	elif not (env.adjustment_enabled and env.adjustment_saturation < 1.0):
		msg = "adjustment (ashen grade) missing"
	elif not (env.volumetric_fog_enabled and env.volumetric_fog_temporal_reprojection_enabled):
		msg = "volumetric fog / temporal reprojection off"
	farm.free()
	return msg
