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
	env = we.environment  # _ready подменил окружение копией
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
	l.use_global_clock = false  # autoload /root/Clock не должен подменять «нет часов»
	l.curve = curve
	l.sun = sun
	l.world_env = we
	root.add_child(we)
	root.add_child(sun)
	root.add_child(l)
	return [l, sun, we, we.environment]  # копия, сделанная в _ready


func _free_rig(r: Array) -> void:
	for n in [r[0], r[1], r[2]]:
		(n as Node).queue_free()


func test_idles_without_clock() -> String:
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


func test_sun_never_up_at_night() -> String:
	var curve := load(CURVE_PATH) as DayNightCurve
	var m := 840
	while m <= 1200:
		var s := curve.sample(float(m))
		if not (float(s["sun_pitch_deg"]) < 0.0):
			return "sun up at %d: pitch %s" % [m, s["sun_pitch_deg"]]
		if not is_zero_approx(float(s["sun_energy"])):
			return "sun energy at %d: %s" % [m, s["sun_energy"]]
		m += 5
	# Закат 780…840: кривая опускает солнце за горизонт раньше, чем гасит энергию;
	# свет на сцене не должен светить из-под горизонта (pitch < 0 ⇒ energy == 0).
	var r := _rig(curve)
	var l: DayNightLighting = r[0]
	var sun: DirectionalLight3D = r[1]
	var msg := ""
	m = 780
	while m <= 840 and msg == "":
		l.apply(float(m))
		var pitch := float(curve.sample(float(m))["sun_pitch_deg"])
		if pitch < 0.0 and not is_zero_approx(sun.light_energy):
			msg = "sun below horizon at %d (pitch %s) with energy %s" % [m, pitch, sun.light_energy]
		m += 1
	_free_rig(r)
	return msg


func test_sun_hidden_when_off() -> String:
	var curve := load(CURVE_PATH) as DayNightCurve
	var r := _rig(curve)
	var l: DayNightLighting = r[0]
	var sun: DirectionalLight3D = r[1]
	var msg := ""
	l.apply(360.0)
	if not sun.visible:
		msg = "sun hidden at noon"
	if msg == "":
		l.apply(1000.0)
		if sun.visible:
			msg = "sun visible at night (energy %s)" % sun.light_energy
	if msg == "":
		l.apply(360.0)
		if not sun.visible:
			msg = "sun not shown again in the morning"
	_free_rig(r)
	return msg


func test_moon_only_at_night() -> String:
	var curve := load(CURVE_PATH) as DayNightCurve
	var day := float(curve.sample(360.0).get("moon_energy", -1.0))
	var n1 := float(curve.sample(960.0).get("moon_energy", -1.0))
	var n2 := float(curve.sample(1200.0).get("moon_energy", -1.0))
	if not is_zero_approx(day):
		return "moon at day: %s" % day
	if not (n1 > 0.0 and n2 > 0.0):
		return "no moon at night: %s %s" % [n1, n2]
	return ""


func test_ground_fog_night_only() -> String:
	var curve := load(CURVE_PATH) as DayNightCurve
	var day := float(curve.sample(360.0).get("ground_fog_density", -1.0))
	var night := float(curve.sample(1000.0).get("ground_fog_density", -1.0))
	return "" if day >= 0.0 and night > 4.0 * day else "ground fog day=%s night=%s" % [day, night]


func test_apply_sets_moon_and_ground_fog() -> String:
	var curve := load(CURVE_PATH) as DayNightCurve
	var r := _rig(curve)
	var l: DayNightLighting = r[0]
	var moon := DirectionalLight3D.new()
	var gf := FogMaterial.new()
	(Engine.get_main_loop() as SceneTree).root.add_child(moon)
	l.moon = moon
	l.ground_fog = gf
	l.apply(960.0)
	var s := curve.sample(960.0)
	var msg := ""
	if not is_equal_approx(moon.light_energy, float(s["moon_energy"])):
		msg = "moon energy %s" % moon.light_energy
	elif not is_equal_approx(moon.rotation_degrees.x, -float(s["moon_pitch_deg"])):
		msg = "moon pitch %s" % moon.rotation_degrees.x
	elif not moon.light_color.is_equal_approx(s["moon_color"]):
		msg = "moon color"
	elif not is_equal_approx(gf.density, float(s["ground_fog_density"])):
		msg = "ground fog %s" % gf.density
	elif not moon.visible:
		msg = "moon hidden at night"
	if msg == "":
		l.apply(360.0)
		if moon.visible:
			msg = "moon visible at day"
	moon.queue_free()
	_free_rig(r)
	return msg


func test_missing_new_fields_ok() -> String:
	var curve := DayNightCurve.new()
	var ks: Array[Dictionary] = [_key(0, 0.0, 0.0, Color(0, 0, 0)), _key(100, 20.0, 2.0, Color(1, 0.5, 0))]
	curve.keys = ks
	var r := _rig(curve)
	var l: DayNightLighting = r[0]
	var moon := DirectionalLight3D.new()
	var gf := FogMaterial.new()
	(Engine.get_main_loop() as SceneTree).root.add_child(moon)
	l.moon = moon
	l.ground_fog = gf
	var d0 := gf.density
	l.apply(50.0)
	var ok: bool = not moon.visible and is_equal_approx(gf.density, d0)
	moon.queue_free()
	_free_rig(r)
	return "" if ok else "visible=%s density=%s want %s" % [moon.visible, gf.density, d0]


func test_env_not_shared() -> String:
	var root := (Engine.get_main_loop() as SceneTree).root
	var res := load("res://scenes/dev/dusk_environment.tres") as Environment
	var before := res.volumetric_fog_density
	var we := WorldEnvironment.new()
	we.environment = res
	var l := DayNightLighting.new()
	l.use_global_clock = false
	l.curve = load(CURVE_PATH) as DayNightCurve
	l.world_env = we
	root.add_child(we)
	root.add_child(l)
	l.apply(1000.0)
	var ok: bool = is_equal_approx(res.volumetric_fog_density, before) \
		and we.environment != res \
		and not is_equal_approx(we.environment.volumetric_fog_density, before)
	var msg := "shared=%s copy=%s before=%s" % [res.volumetric_fog_density, we.environment.volumetric_fog_density, before]
	l.queue_free()
	we.queue_free()
	return "" if ok else msg
