extends RefCounted

const CURVE_PATH := "res://world/day_night_curve.tres"


func _key(m: int, pitch: float, e: float, c: Color) -> Dictionary:
	return {"minutes": m, "sun_pitch_deg": pitch, "sun_color": c, "sun_energy": e,
		"ambient_energy": e, "sky_color": c, "fog_density": e, "fog_color": c}


func test_sample_exact_key() -> String:
	var curve := load(CURVE_PATH) as DayNightCurve
	if curve == null:
		return "curve not loaded"
	var k: Dictionary = {}
	for key in curve.keys:
		if int(key["minutes"]) == 360:
			k = key
	var s := curve.sample(360.0)
	for f in ["sun_pitch_deg", "sun_energy", "ambient_energy", "fog_density"]:
		if not is_equal_approx(float(s[f]), float(k[f])):
			return "%s: %s != %s" % [f, s[f], k[f]]
	for f in ["sun_color", "sky_color", "fog_color"]:
		if not (s[f] as Color).is_equal_approx(k[f]):
			return "%s mismatch" % f
	return ""


func test_sample_midpoint() -> String:
	var curve := DayNightCurve.new()
	var ks: Array[Dictionary] = [_key(0, 0.0, 0.0, Color(0, 0, 0)), _key(100, 20.0, 2.0, Color(1, 0.5, 0))]
	curve.keys = ks
	var s := curve.sample(50.0)
	for f in ["sun_pitch_deg", "sun_energy", "ambient_energy", "fog_density"]:
		var want := 10.0 if f == "sun_pitch_deg" else 1.0
		if not is_equal_approx(float(s[f]), want):
			return "%s = %s" % [f, s[f]]
	for f in ["sun_color", "sky_color", "fog_color"]:
		if not (s[f] as Color).is_equal_approx(Color(0.5, 0.25, 0)):
			return "%s = %s" % [f, s[f]]
	return ""


func test_sample_clamped() -> String:
	var curve := DayNightCurve.new()
	var ks: Array[Dictionary] = [_key(0, 1.0, 1.0, Color(1, 0, 0)), _key(100, 9.0, 3.0, Color(0, 0, 1))]
	curve.keys = ks
	var lo := curve.sample(-10.0)
	var hi := curve.sample(5000.0)
	if not is_equal_approx(float(lo["sun_energy"]), 1.0) or not (lo["sun_color"] as Color).is_equal_approx(Color(1, 0, 0)):
		return "low clamp"
	if not is_equal_approx(float(hi["sun_energy"]), 3.0) or not (hi["sun_color"] as Color).is_equal_approx(Color(0, 0, 1)):
		return "high clamp"
	return ""


func test_night_fog_denser_than_day() -> String:
	var curve := load(CURVE_PATH) as DayNightCurve
	if curve == null:
		return "curve not loaded"
	if not (float(curve.sample(1000.0)["fog_density"]) > float(curve.sample(360.0)["fog_density"])):
		return "fog not denser at night"
	var e360 := float(curve.sample(360.0)["sun_energy"])
	var e780 := float(curve.sample(780.0)["sun_energy"])
	var e1000 := float(curve.sample(1000.0)["sun_energy"])
	return "" if e360 > e780 and e780 > e1000 else "energy %s %s %s" % [e360, e780, e1000]


func test_apply_sets_nodes() -> String:
	var root := (Engine.get_main_loop() as SceneTree).root
	var curve := load(CURVE_PATH) as DayNightCurve
	var env := Environment.new()
	env.volumetric_fog_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	var sun := DirectionalLight3D.new()
	var l := DayNightLighting.new()
	l.curve = curve
	l.sun = sun
	l.world_env = we
	root.add_child(we)
	root.add_child(sun)
	root.add_child(l)
	l.apply(360.0)
	var s := curve.sample(360.0)
	var ok: bool = is_equal_approx(sun.light_energy, float(s["sun_energy"])) \
		and is_equal_approx(env.volumetric_fog_density, float(s["fog_density"])) \
		and is_equal_approx(sun.rotation_degrees.x, -float(s["sun_pitch_deg"])) \
		and is_equal_approx(env.ambient_light_energy, float(s["ambient_energy"]))
	var msg := "energy=%s fog=%s" % [sun.light_energy, env.volumetric_fog_density]
	l.queue_free()
	sun.queue_free()
	we.queue_free()
	return "" if ok else msg


func _rig(curve: DayNightCurve) -> Array:
	var root := (Engine.get_main_loop() as SceneTree).root
	var env := Environment.new()
	env.volumetric_fog_enabled = true
	var we := WorldEnvironment.new()
	we.environment = env
	var sun := DirectionalLight3D.new()
	var l := DayNightLighting.new()
	l.curve = curve
	l.sun = sun
	l.world_env = we
	root.add_child(we)
	root.add_child(sun)
	root.add_child(l)
	return [l, sun, we, env]


func _free_rig(r: Array) -> void:
	for n in [r[0], r[1], r[2]]:
		(n as Node).queue_free()


func test_idles_without_clock() -> String:
	var root := (Engine.get_main_loop() as SceneTree).root
	if root.get_node_or_null("Clock") != null or root.get_node_or_null("/root/Clock") != null:
		return "a Clock is reachable; cannot test idling"
	var r := _rig(load(CURVE_PATH) as DayNightCurve)
	var l: DayNightLighting = r[0]
	var sun: DirectionalLight3D = r[1]
	var env: Environment = r[3]
	var e0 := sun.light_energy
	var f0 := env.volumetric_fog_density
	var rot0 := sun.rotation_degrees
	l._process(0.1)
	var ok: bool = l.clock == null and is_equal_approx(sun.light_energy, e0) \
		and is_equal_approx(env.volumetric_fog_density, f0) and sun.rotation_degrees == rot0
	_free_rig(r)
	return "" if ok else "lighting changed without a clock"


func test_process_uses_injected_clock() -> String:
	var curve := load(CURVE_PATH) as DayNightCurve
	var r := _rig(curve)
	var l: DayNightLighting = r[0]
	var sun: DirectionalLight3D = r[1]
	var env: Environment = r[3]
	var clock := GameClock.new()
	clock.advance(500.5)
	l.clock = clock
	l._process(0.0)
	var s := curve.sample(clock.minutes_f())
	var ok: bool = absf(clock.minutes_f() - 500.5) < 1e-4 \
		and is_equal_approx(sun.light_energy, float(s["sun_energy"])) \
		and is_equal_approx(sun.rotation_degrees.x, -float(s["sun_pitch_deg"])) \
		and is_equal_approx(env.volumetric_fog_density, float(s["fog_density"])) \
		and is_equal_approx(env.ambient_light_energy, float(s["ambient_energy"]))
	var msg := "energy=%s want %s" % [sun.light_energy, s["sun_energy"]]
	clock.free()
	_free_rig(r)
	return "" if ok else msg
