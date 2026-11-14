extends RefCounted

const C := Vector2i(0, 3)

func _inv(slots: Array, selected := 0, can := 10) -> Inventory:
	var inv := Inventory.new()
	inv.db = ContentDB.load_default()
	inv.from_save({"slots": slots, "selected": selected, "can_water": can})
	return inv

func _farm(plots: Array = []) -> FarmState:
	var f := FarmState.new()
	f.db = ContentDB.load_default()
	f.from_save({"plots": plots})
	return f

func _plot(crop := "", growth := 0.0, watered := false, fertility := 100.0) -> Array:
	return [{"x": 0, "z": 3, "fertility": fertility, "watered": watered, "crop": crop, "growth": growth}]

func _hoe() -> Dictionary:
	return {"id": "hoe", "count": 1}

func _can() -> Dictionary:
	return {"id": "watering_can", "count": 1}

func _seed(n := 3) -> Dictionary:
	return {"id": "seed_silverleaf", "count": n}

## Выполняет тело в локали ru и возвращает его результат.
func _ru(body: Callable) -> String:
	var old := TranslationServer.get_locale()
	TranslationServer.set_locale("ru")
	var r: String = body.call()
	TranslationServer.set_locale(old)
	return r

func test_till() -> String:
	var f := _farm()
	var inv := _inv([_hoe()])
	return _ru(func():
		var r := FarmActions.resolve(f, inv, C)
		if r["kind"] != &"till" or r["text"] != "E — вскопать":
			return "resolve: %s" % [r]
		if FarmActions.perform(f, inv, C) != &"till" or not f.is_tilled(C):
			return "perform did not till"
		return "")

func test_till_outside_field_refused() -> String:
	var f := _farm()
	var inv := _inv([_hoe()])
	return _ru(func():
		var r := FarmActions.resolve(f, inv, Vector2i(10, 3))
		if r["kind"] != &"none" or r["reason"] != &"cant_till" or r["text"] != "Здесь нельзя копать":
			return "resolve: %s" % [r]
		if FarmActions.perform(f, inv, Vector2i(10, 3)) != &"none" or f.is_tilled(Vector2i(10, 3)):
			return "tilled outside"
		return "")

func test_hoe_on_tilled_cell_does_nothing() -> String:
	var f := _farm(_plot())
	var inv := _inv([_hoe()])
	var r := FarmActions.resolve(f, inv, C)
	if r["kind"] != &"none":
		return "kind: %s" % [r]
	return ""

func test_plant_takes_one_seed() -> String:
	var f := _farm(_plot())
	var inv := _inv([_seed(3)])
	return _ru(func():
		var r := FarmActions.resolve(f, inv, C)
		if r["kind"] != &"plant" or not String(r["text"]).begins_with("E — посадить: Серебрянка"):
			return "resolve: %s" % [r]
		if FarmActions.perform(f, inv, C) != &"plant" or f.plot(C)["crop"] != "silverleaf":
			return "not planted"
		if inv.slot(0)["count"] != 2:
			return "seed count %s" % [inv.slot(0)]
		return "")

func test_plant_last_seed_empties_slot() -> String:
	var f := _farm(_plot())
	var inv := _inv([_seed(1)])
	FarmActions.perform(f, inv, C)
	if not inv.slot(0).is_empty():
		return "slot not freed: %s" % [inv.slot(0)]
	return ""

func test_cannot_plant_on_growing() -> String:
	var f := _farm(_plot("boneroot", 0.0))
	var inv := _inv([_seed(3)])
	var r := FarmActions.resolve(f, inv, C)
	if r["kind"] != &"none" or r["reason"] != &"growing":
		return "resolve: %s" % [r]
	if FarmActions.perform(f, inv, C) != &"none" or inv.slot(0)["count"] != 3 or f.plot(C)["crop"] != "boneroot":
		return "changed something"
	return ""

func test_water_uses_charge() -> String:
	var f := _farm(_plot("silverleaf"))
	var inv := _inv([_can()], 0, 5)
	var r := FarmActions.resolve(f, inv, C)
	if r["kind"] != &"water":
		return "resolve: %s" % [r]
	if FarmActions.perform(f, inv, C) != &"water" or not f.plot(C)["watered"] or inv.can_water != 4:
		return "water: watered=%s can=%d" % [f.plot(C)["watered"], inv.can_water]
	return ""

func test_water_already_watered() -> String:
	var f := _farm(_plot("silverleaf", 0.0, true))
	var inv := _inv([_can()], 0, 5)
	var r := FarmActions.resolve(f, inv, C)
	if r["kind"] != &"none" or r["reason"] != &"already_watered":
		return "resolve: %s" % [r]
	FarmActions.perform(f, inv, C)
	if inv.can_water != 5:
		return "charge spent"
	return ""

func test_water_empty_can() -> String:
	var f := _farm(_plot("silverleaf"))
	var inv := _inv([_can()], 0, 0)
	var r := FarmActions.resolve(f, inv, C)
	if r["kind"] != &"none" or r["reason"] != &"can_empty":
		return "resolve: %s" % [r]
	if FarmActions.perform(f, inv, C) != &"none" or f.plot(C)["watered"]:
		return "watered with empty can"
	return ""

func test_water_empty_tilled_cell_allowed() -> String:
	var f := _farm(_plot())
	var inv := _inv([_can()])
	if FarmActions.resolve(f, inv, C)["kind"] != &"water":
		return "empty tilled cell must be waterable"
	return ""

func test_harvest_with_any_item_selected() -> String:
	for item in [_hoe(), _can(), _seed(2), {}]:
		var f := _farm(_plot("silverleaf", 3.0))
		var inv := _inv([item, {"id": "boneroot", "count": 1}] if not item.is_empty() else [null])
		var r := FarmActions.resolve(f, inv, C)
		if r["kind"] != &"harvest":
			return "%s: %s" % [item, r]
	return ""

func test_harvest_adds_produce_and_seeds() -> String:
	var f := _farm(_plot("silverleaf", 3.0))
	var inv := _inv([_hoe()])
	return _ru(func():
		if FarmActions.resolve(f, inv, C)["text"].begins_with("E — собрать") == false:
			return "prompt"
		if FarmActions.perform(f, inv, C) != &"harvest":
			return "not harvested"
		if inv.count_of("silverleaf") != 2 or inv.count_of("seed_silverleaf") != 2:
			return "inventory: %d %d" % [inv.count_of("silverleaf"), inv.count_of("seed_silverleaf")]
		if f.has_plant(C) or not f.is_tilled(C):
			return "cell state"
		return "")

## Все 8 ячеек заняты; produce и seeds серебрянки лежат стопками заданного размера.
func _full_inv(produce_n: int, seed_n: int) -> Inventory:
	return _inv([_hoe(), _can(), {"id": "silverleaf", "count": produce_n},
			{"id": "seed_silverleaf", "count": seed_n}, {"id": "boneroot", "count": 1},
			{"id": "nightbloom", "count": 1}, {"id": "seed_boneroot", "count": 1},
			{"id": "seed_nightbloom", "count": 1}])

func _atomic_case(produce_n: int, seed_n: int) -> String:
	var f := _farm(_plot("silverleaf", 3.0))
	var inv := _full_inv(produce_n, seed_n)
	var before := inv.to_save()
	var plot_before := f.plot(C)
	return _ru(func():
		var r := FarmActions.resolve(f, inv, C)
		if r["kind"] != &"none" or r["reason"] != &"no_room" or r["text"] != "Нет места\nЗемля: 100%":
			return "resolve: %s" % [r]
		if FarmActions.perform(f, inv, C) != &"none":
			return "perform not none"
		if inv.to_save() != before or f.plot(C) != plot_before or not f.is_ripe(C):
			return "state changed"
		return "")

## Урожай (97 + 2) помещается, семена (99 + 2) нет: не собрано ничего.
func test_harvest_is_atomic() -> String:
	return _atomic_case(97, 99)

## Зеркально: семена (97 + 2) помещаются, урожай (99 + 2) нет.
func test_harvest_is_atomic_seeds_fit_produce_does_not() -> String:
	return _atomic_case(99, 97)

func test_unknown_crop_cell_inert() -> String:
	var f := _farm(_plot("void_melon", 5.0))
	for item in [_hoe(), _can(), _seed(2), {"id": "mystery", "count": 1}]:
		var inv := _inv([item])
		var before := inv.to_save()
		var plot_before := f.to_save()
		var r := FarmActions.resolve(f, inv, C)
		if r["kind"] != &"none" or r["reason"] != &"unknown":
			return "%s: %s" % [item, r]
		if FarmActions.perform(f, inv, C) != &"none" or inv.to_save() != before or f.to_save() != plot_before:
			return "%s: changed" % [item]
	return ""

func test_unknown_item_selected_acts_as_empty() -> String:
	var f := _farm(_plot())
	var inv := _inv([{"id": "mystery", "count": 1}])
	var r := FarmActions.resolve(f, inv, C)
	if r["kind"] != &"none":
		return "resolve: %s" % [r]
	return ""

func test_growing_prompt_names_crop_and_stage() -> String:
	var f := _farm(_plot("silverleaf", 1.0, false, 60.0))
	var inv := _inv([null])
	return _ru(func():
		var t: String = FarmActions.resolve(f, inv, C)["text"]
		if not t.begins_with("Серебрянка — побег"):
			return "text: %s" % t
		return "")

func test_soil_percent_in_prompt() -> String:
	var inv := _inv([_can()])
	var f := _farm(_plot("silverleaf", 0.0, false, 60.0))
	var e := _ru(func():
		var t: String = FarmActions.resolve(f, inv, C)["text"]
		if t != "E — полить\nЗемля: 60%":
			return "text: %s" % t
		return "")
	if e != "":
		return e
	var f2 := _farm(_plot())
	var inv2 := _inv([_hoe()])
	return _ru(func():
		var t: String = FarmActions.resolve(f2, inv2, C)["text"]
		if t != "Земля: 100%":
			return "text: %s" % t
		return "")

func test_resolve_is_pure() -> String:
	var cases := [
		[_plot(), [_seed(2)]], [_plot("silverleaf", 3.0), [_hoe()]],
		[_plot("silverleaf"), [_can()]], [[], [_hoe()]],
	]
	for c in cases:
		var f := _farm(c[0])
		var inv := _inv(c[1])
		var fs := f.to_save()
		var is_ := inv.to_save()
		FarmActions.resolve(f, inv, C)
		if f.to_save() != fs or inv.to_save() != is_:
			return "resolve mutated state: %s" % [c]
	return ""

func test_perform_returns_none_changes_nothing() -> String:
	var f := _farm(_plot("boneroot"))
	var inv := _inv([_hoe()])
	var fs := f.to_save()
	var is_ := inv.to_save()
	if FarmActions.perform(f, inv, C) != &"none" or f.to_save() != fs or inv.to_save() != is_:
		return "changed"
	return ""
