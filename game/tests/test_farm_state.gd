extends RefCounted

func _farm() -> FarmState:
	var f := FarmState.new()
	f.db = ContentDB.load_default()
	return f

## Поле с одной вскопанной клеткой (0, 3) с заданными параметрами.
func _with_plot(fertility: float, crop := "", watered := false, growth := 0.0) -> FarmState:
	var f := _farm()
	f.from_save({"plots": [{"x": 0, "z": 3, "fertility": fertility, "watered": watered,
			"crop": crop, "growth": growth}]})
	return f

const C := Vector2i(0, 3)

func _night(f: FarmState, n: int, water := true) -> void:
	for i in n:
		if water:
			f.water(C)
		f.advance_night()

func test_till_only_in_field_once() -> String:
	var f := _farm()
	if not f.till(C) or not f.is_tilled(C):
		return "till in field"
	if f.plot(C)["fertility"] != 100.0 or f.plot(C)["crop"] != "" or f.plot(C)["watered"]:
		return "fresh plot: %s" % f.plot(C)
	if f.till(C):
		return "second till"
	if f.till(Vector2i(-7, 3)) or f.till(Vector2i(0, 1)) or f.till(Vector2i(6, 3)) or f.till(Vector2i(0, 10)):
		return "till outside"
	if not f.in_field(Vector2i(-6, 2)) or not f.in_field(Vector2i(5, 9)) or f.in_field(Vector2i(6, 9)):
		return "in_field edges"
	if not f.plot(Vector2i(1, 3)).is_empty():
		return "plot of untilled must be {}"
	if f.cells() != [C]:
		return "cells: %s" % [f.cells()]
	return ""

func test_plant_needs_tilled_empty_known() -> String:
	var f := _farm()
	if f.plant(C, "silverleaf"):
		return "planted on untilled"
	f.till(C)
	if f.plant(C, "void_melon"):
		return "planted unknown crop"
	if not f.plant(C, "silverleaf") or not f.has_plant(C):
		return "plant failed"
	if f.plant(C, "boneroot"):
		return "planted on occupied"
	if f.stage(C) != 0 or f.is_ripe(C) or f.is_unknown(C):
		return "state after plant"
	if f.stage(Vector2i(1, 1)) != -1:
		return "stage without plant"
	return ""

func test_water_once_per_day() -> String:
	var f := _farm()
	if f.water(C):
		return "watered untilled"
	f.till(C)
	f.plant(C, "silverleaf")
	if not f.water(C) or not f.plot(C)["watered"]:
		return "water failed"
	if f.water(C):
		return "watered twice"
	return ""

func test_silverleaf_ripe_after_3_watered_nights() -> String:
	var f := _farm()
	f.till(C)
	f.plant(C, "silverleaf")
	for expected in [1, 2, 3]:
		if f.is_ripe(C):
			return "ripe too early"
		_night(f, 1)
		if f.stage(C) != expected:
			return "stage %d after night %d" % [f.stage(C), expected]
	if not f.is_ripe(C):
		return "not ripe"
	return ""

func test_unwatered_night_no_growth_no_death() -> String:
	var f := _farm()
	f.till(C)
	f.plant(C, "silverleaf")
	_night(f, 3, false)
	if f.plot(C)["growth"] != 0.0 or not f.has_plant(C) or f.stage(C) != 0:
		return "unwatered changed: %s" % f.plot(C)
	return ""

func test_planted_and_watered_today_grows_tonight() -> String:
	var f := _farm()
	f.till(C)
	f.plant(C, "silverleaf")
	f.water(C)
	f.advance_night()
	if f.stage(C) != 1:
		return "stage %d" % f.stage(C)
	return ""

func test_growth_rate() -> String:
	for p in [[100.0, 1.0], [60.0, 1.0], [30.0, 0.75], [0.0, 0.5]]:
		if not is_equal_approx(FarmState.growth_rate(p[0]), p[1]):
			return "rate(%s) = %s" % [p[0], FarmState.growth_rate(p[0])]
	return ""

func test_slow_growth_on_tired_soil() -> String:
	var f := _with_plot(30.0, "silverleaf")
	_night(f, 3)
	if f.is_ripe(C):
		return "ripe after 3 nights"
	_night(f, 1)
	if not f.is_ripe(C):
		return "not ripe after 4 nights, growth %s" % f.plot(C)["growth"]
	return ""

func test_yield_for() -> String:
	for p in [[2, 100.0, 2], [2, 50.0, 1], [2, 0.0, 1], [3, 100.0, 3], [3, 60.0, 2], [3, 0.0, 1]]:
		if FarmState.yield_for(p[0], p[1]) != p[2]:
			return "yield_for(%s, %s) = %s" % [p[0], p[1], FarmState.yield_for(p[0], p[1])]
	return ""

func test_harvest_reduces_fertility_and_empties() -> String:
	var f := _farm()
	f.till(C)
	f.plant(C, "silverleaf")
	if not f.harvest(C).is_empty():
		return "harvested unripe"
	_night(f, 3)
	var r := f.harvest(C)
	if r != {"crop": "silverleaf", "produce": 2, "seeds": 2}:
		return "result %s" % [r]
	var p := f.plot(C)
	if p["fertility"] != 90.0 or p["crop"] != "" or p["growth"] != 0.0 or not f.is_tilled(C) or f.has_plant(C):
		return "after harvest: %s" % [p]
	if not f.harvest(C).is_empty():
		return "harvested empty"
	return ""

func test_harvest_uses_fertility_before_reduction() -> String:
	# boneroot: база 3, усталость 20; при 100 -> 3 (после снижения было бы 80 -> floor(2.7) = 2)
	var f := _with_plot(100.0, "boneroot", false, 5.0)
	var r := f.harvest(C)
	if r.get("produce") != 3 or r.get("seeds") != 2:
		return "result %s" % [r]
	if f.plot(C)["fertility"] != 80.0:
		return "fertility %s" % f.plot(C)["fertility"]
	return ""

func test_fertility_floor_zero() -> String:
	var f := _with_plot(20.0, "nightbloom", false, 8.0)
	if f.harvest(C).is_empty():
		return "not harvested"
	if f.plot(C)["fertility"] != 0.0:
		return "fertility %s" % f.plot(C)["fertility"]
	return ""

func test_recovery_plus_3_cap_60() -> String:
	for p in [[45.0, 48.0], [59.0, 60.0], [60.0, 60.0], [100.0, 100.0]]:
		var f := _with_plot(p[0])
		f.advance_night()
		if f.plot(C)["fertility"] != p[1]:
			return "%s -> %s" % [p[0], f.plot(C)["fertility"]]
	var g := _with_plot(45.0, "silverleaf")
	g.advance_night()
	if g.plot(C)["fertility"] != 45.0:
		return "planted cell recovered"
	return ""

func test_night_dries_all() -> String:
	var f := _farm()
	f.till(C)
	f.till(Vector2i(1, 3))
	f.plant(C, "silverleaf")
	f.water(C)
	f.water(Vector2i(1, 3))
	f.advance_night()
	if f.plot(C)["watered"] or f.plot(Vector2i(1, 3))["watered"]:
		return "still wet"
	return ""

func test_night_order() -> String:
	var f := _with_plot(67.0, "silverleaf", true, 3.0)
	if f.harvest(C).is_empty():
		return "harvest"
	if f.plot(C)["fertility"] != 57.0:
		return "fertility %s" % f.plot(C)["fertility"]
	f.advance_night()
	if f.plot(C)["fertility"] != 60.0 or f.plot(C)["watered"]:
		return "morning: %s" % [f.plot(C)]
	return ""

func test_save_roundtrip() -> String:
	var f := _farm()
	f.till(C)
	f.till(Vector2i(-6, 2))
	f.plant(C, "boneroot")
	f.water(C)
	f.advance_night()
	f.water(C)
	var d := f.to_save()
	var g := _farm()
	g.from_save(JSON.parse_string(JSON.stringify(d)))
	if g.to_save() != d:
		return "differs: %s vs %s" % [g.to_save(), d]
	if g.plot(C) != f.plot(C) or not g.is_tilled(Vector2i(-6, 2)):
		return "plots differ"
	var p: Dictionary = d["plots"][0]
	for k in ["x", "z", "fertility", "watered", "crop", "growth"]:
		if not p.has(k):
			return "missing key " + k
	return ""

func test_unknown_ids_roundtrip() -> String:
	var raw := {"x": 1, "z": 4, "fertility": 80, "watered": true, "crop": "void_melon",
			"growth": 2.5, "extra": {"a": [1, 2]}}
	var f := _farm()
	f.from_save({"plots": [raw.duplicate(true)]})
	var c := Vector2i(1, 4)
	if not f.is_unknown(c) or not f.has_plant(c) or f.stage(c) != -1 or f.is_ripe(c):
		return "unknown state"
	if f.water(c) or f.plant(c, "silverleaf") or not f.harvest(c).is_empty() or f.till(c):
		return "unknown cell accepted an action"
	var p := f.plot(c)
	if p.get("crop") != "void_melon" or not p.has("fertility") or not p.has("watered") or not p.has("growth"):
		return "plot view %s" % [p]
	f.advance_night()
	f.advance_night()
	if f.to_save() != {"plots": [raw]}:
		return "not verbatim: %s" % [f.to_save()]
	return ""

func test_from_save_tolerates_garbage() -> String:
	var f := _farm()
	f.from_save({"plots": [
		{"x": 3.0, "z": 4.0, "fertility": 250, "watered": true, "crop": "silverleaf", "growth": 1.0},
		{"x": 2.0, "z": 4.0, "fertility": -5, "watered": false, "crop": "", "growth": 0.0},
		{"x": 3, "z": 4, "fertility": 40, "watered": false, "crop": "", "growth": 0},
		{"x": 20, "z": 20, "fertility": 100, "watered": false, "crop": "", "growth": 0},
		"garbage", null, 7, [1, 2],
		{"x": "a", "z": 1},
		{"z": 1},
		{"x": 1, "z": 1, "fertility": "lots", "watered": "yes", "crop": 5, "growth": "x"},
	]})
	if f.plot(Vector2i(3, 4))["fertility"] != 40.0 or f.plot(Vector2i(3, 4))["crop"] != "":
		return "duplicate must be last: %s" % [f.plot(Vector2i(3, 4))]
	if f.plot(Vector2i(2, 4))["fertility"] != 0.0:
		return "negative fertility not clamped"
	if not f.is_tilled(Vector2i(20, 20)) or f.in_field(Vector2i(20, 20)):
		return "out-of-field plot must stay but not be in_field"
	if f.till(Vector2i(20, 20)):
		return "till on out-of-field"
	if not f.is_tilled(Vector2i(1, 1)):
		return "plot with bad fields should survive with defaults"
	var g := _farm()
	g.from_save({"plots": [{"x": 0, "z": 0, "fertility": 250, "watered": false, "crop": "", "growth": 0}]})
	if g.plot(Vector2i(0, 0))["fertility"] != 100.0:
		return "250 not clamped to 100"
	var n: int = f.to_save()["plots"].size()
	if n != 4:
		return "plots kept: %d" % n
	for bad in [null, 5, "x", [], {}, {"plots": 5}, {"plots": null}]:
		g.from_save(bad)
		if not g.cells().is_empty():
			return "garbage produced cells"
	# вне поля клетка с известной культурой растёт
	g.from_save({"plots": [{"x": 20, "z": 20, "fertility": 100, "watered": true, "crop": "silverleaf", "growth": 0}]})
	g.advance_night()
	if g.plot(Vector2i(20, 20))["growth"] != 1.0:
		return "out-of-field known crop must grow"
	return ""

func test_changed_signal_and_clear() -> String:
	var f := _farm()
	var n := [0]
	f.changed.connect(func(): n[0] += 1)
	f.till(C)
	f.till(C)
	if n[0] != 1:
		return "till emits: %d" % n[0]
	f.advance_night()
	f.clear()
	if n[0] != 3 or not f.cells().is_empty():
		return "advance/clear: %d" % n[0]
	return ""
