extends RefCounted

func _inv() -> Inventory:
	var inv := Inventory.new()
	inv.db = ContentDB.load_default()
	inv.reset_to_starter()
	return inv

func _empty_inv() -> Inventory:
	var inv := _inv()
	inv.from_save({"slots": [], "can_water": 10, "selected": 0})
	return inv

func test_starter_kit() -> String:
	var inv := _inv()
	var exp := ["hoe", "watering_can", "seed_silverleaf", "seed_boneroot", "seed_nightbloom"]
	for i in exp.size():
		if inv.slot(i).get("id") != exp[i]:
			return "slot %d: %s" % [i, inv.slot(i)]
	if inv.slot(0)["count"] != 1 or inv.slot(1)["count"] != 1:
		return "tools must be 1"
	for i in range(2, 5):
		if inv.slot(i)["count"] != 6:
			return "seeds must be 6"
	for i in range(5, 8):
		if not inv.slot(i).is_empty():
			return "slot %d not empty" % i
	if inv.can_water != 10 or inv.selected != 0 or inv.selected_id() != "hoe":
		return "can/selected"
	if inv.selected_def() == null or inv.selected_def().tool != &"hoe":
		return "selected_def"
	return ""

func test_add_stacks_then_empty() -> String:
	var inv := _inv()
	if inv.add("seed_silverleaf", 3) != 0:
		return "leftover"
	if inv.slot(2)["count"] != 9:
		return "did not stack: %s" % inv.slot(2)
	if inv.add("silverleaf", 2) != 0 or inv.slot(5).get("id") != "silverleaf":
		return "did not use empty slot"
	if inv.count_of("seed_silverleaf") != 9 or inv.count_of("silverleaf") != 2:
		return "count_of"
	return ""

func test_stack_cap_99_overflows_to_next() -> String:
	var inv := _empty_inv()
	if inv.add("boneroot", 150) != 0:
		return "leftover"
	if inv.slot(0)["count"] != 99 or inv.slot(1)["count"] != 51:
		return "split: %s %s" % [inv.slot(0), inv.slot(1)]
	return ""

func test_tools_do_not_stack() -> String:
	var inv := _empty_inv()
	if inv.add("hoe", 3) != 0:
		return "leftover"
	for i in 3:
		if inv.slot(i).get("id") != "hoe" or inv.slot(i)["count"] != 1:
			return "slot %d: %s" % [i, inv.slot(i)]
	return ""

func test_add_returns_leftover_when_full() -> String:
	var inv := _empty_inv()
	if inv.add("silverleaf", 8 * 99) != 0:
		return "should fit exactly"
	if inv.add("silverleaf", 5) != 5:
		return "full: leftover must be 5"
	if inv.add("boneroot", 1) != 1:
		return "full: other item"
	if inv.add("no_such_item", 2) != 2:
		return "unknown id must be refused"
	if inv.add("silverleaf", 0) != 0:
		return "zero"
	return ""

func test_can_add_all_exact_fit_and_one_over() -> String:
	var inv := _empty_inv()
	inv.add("silverleaf", 7 * 99)
	if not inv.can_add_all([["silverleaf", 99]]):
		return "exact fit"
	if inv.can_add_all([["silverleaf", 100]]):
		return "one over"
	if inv.can_add_all([["silverleaf", 50], ["boneroot", 49]]):
		return "two different items need two slots, only one is free"
	if not inv.can_add_all([["boneroot", 99]]):
		return "other item into the last empty slot"
	return ""

func test_can_add_all_does_not_mutate() -> String:
	var inv := _inv()
	var before := inv.to_save()
	inv.can_add_all([["seed_silverleaf", 10], ["boneroot", 300]])
	if inv.to_save() != before:
		return "mutated"
	if inv.can_add_all([["no_such_item", 1]]):
		return "unknown must be false"
	return ""

func test_remove_clears_slot_at_zero() -> String:
	var inv := _inv()
	if inv.remove_from_slot(2, 7):
		return "removing more than held must fail"
	if not inv.remove_from_slot(2, 5) or inv.slot(2)["count"] != 1:
		return "partial"
	if not inv.remove_from_slot(2, 1) or not inv.slot(2).is_empty():
		return "must clear"
	if inv.remove_from_slot(2, 1) or inv.remove_from_slot(-1, 1) or inv.remove_from_slot(8, 1):
		return "empty/out of range must be false"
	return ""

func test_select_wraps_and_ignores_out_of_range() -> String:
	var inv := _inv()
	inv.select_prev()
	if inv.selected != 7:
		return "prev wrap: %d" % inv.selected
	inv.select_next()
	if inv.selected != 0:
		return "next wrap: %d" % inv.selected
	inv.select(3)
	inv.select(8)
	inv.select(-1)
	if inv.selected != 3:
		return "out of range changed selection"
	return ""

func test_water_use_and_refill() -> String:
	var inv := _inv()
	if inv.refill_can():
		return "full can refill must be false"
	for i in 10:
		if not inv.use_water():
			return "use %d failed" % i
	if inv.can_water != 0 or inv.use_water():
		return "11th use must be false"
	if not inv.refill_can() or inv.can_water != 10:
		return "refill"
	if inv.refill_can():
		return "second refill must be false"
	return ""

func test_save_roundtrip() -> String:
	var inv := _inv()
	inv.add("nightbloom", 12)
	inv.use_water()
	inv.select(4)
	var d := inv.to_save()
	var json := JSON.stringify(d)
	var inv2 := _empty_inv()
	inv2.from_save(JSON.parse_string(json))
	if inv2.to_save() != d:
		return "mismatch: %s vs %s" % [inv2.to_save(), d]
	if (d["slots"] as Array).size() != 8:
		return "slots size"
	return ""

func test_unknown_ids_roundtrip() -> String:
	var inv := _inv()
	var orig := {"id": "moon_dust", "count": 4, "extra": 1}
	var slots: Array = [orig.duplicate(), null, null, null, null, null, null, null]
	inv.from_save({"slots": slots, "can_water": 10, "selected": 0})
	if inv.slot(0) != orig:
		return "slot(0) differs: %s" % inv.slot(0)
	if inv.selected_def() != null:
		return "unknown def must be null"
	if inv.add("moon_dust", 1) != 1:
		return "unknown add must be refused"
	if inv.add("silverleaf", 5) != 0 or inv.add("hoe", 1) != 0:
		return "add other"
	if inv.slot(0) != orig or inv.slot(1).get("id") != "silverleaf":
		return "unknown slot disturbed"
	if inv.remove_from_slot(0, 1):
		return "unknown slot must be inert"
	if inv.to_save()["slots"][0] != orig:
		return "to_save differs"
	return ""

func test_from_save_tolerates_garbage() -> String:
	var inv := _inv()
	inv.from_save({"slots": [{"id": "hoe", "count": 1}, {"id": "silverleaf", "count": 3.0}], "can_water": 10, "selected": 0})
	if (inv.to_save()["slots"] as Array).size() != 8:
		return "short array must pad to 8"
	if inv.slot(1)["count"] != 3 or typeof(inv.slot(1)["count"]) != TYPE_INT:
		return "3.0 must become int 3"
	var many: Array = []
	for i in 11:
		many.append({"id": "silverleaf", "count": 1})
	inv.from_save({"slots": many, "can_water": 10, "selected": 0})
	if (inv.to_save()["slots"] as Array).size() != 8:
		return "long array must cut to 8"
	var bad := [
		{"id": "silverleaf", "count": 0}, {"id": "silverleaf", "count": -2},
		{"id": "silverleaf", "count": 500}, null, "text", 5, {"count": 3},
		{"id": 7, "count": 1},
	]
	inv.from_save({"slots": bad, "can_water": -1, "selected": 42})
	if not inv.slot(0).is_empty() or not inv.slot(1).is_empty():
		return "0 and -2 must be empty"
	if inv.slot(2)["count"] != 99:
		return "500 must clamp to 99"
	for i in range(3, 8):
		if not inv.slot(i).is_empty():
			return "garbage slot %d must be empty" % i
	if inv.selected != 0 or inv.can_water != 0:
		return "selected/can_water -1"
	inv.from_save({"slots": [], "can_water": 99, "selected": 2.0})
	if inv.can_water != 10 or inv.selected != 2:
		return "can 99 -> 10, selected 2.0"
	for junk in [null, "x", 5, [], {"slots": "no", "can_water": "no", "selected": []}]:
		inv.from_save(junk)
		if (inv.to_save()["slots"] as Array).size() != 8 or inv.selected != 0:
			return "junk top level"
	return ""

## Раздел без массива ячеек (или вовсе не словарь) — стартовый набор: игрок не остаётся
## без инструментов и семян.
func test_from_save_without_slots_gives_starter_kit() -> String:
	var starter := Inventory.starter_save()
	for junk in [null, "x", 5, [], {}, {"slots": "no"}, {"slots": null, "can_water": 4},
			{"slots": "no", "can_water": "no", "selected": []}]:
		var inv := _empty_inv()
		inv.from_save(junk)
		if inv.to_save()["slots"] != starter["slots"]:
			return "%s: slots %s" % [str(junk), inv.to_save()["slots"]]
		if inv.selected != 0:
			return "%s: selected %d" % [str(junk), inv.selected]
	var inv := _empty_inv()
	inv.from_save({"slots": null, "can_water": 4, "selected": 3})
	if inv.can_water != 4 or inv.selected != 3:
		return "valid can_water/selected next to missing slots must load: %d %d" % [inv.can_water, inv.selected]
	inv.from_save({"slots": []})
	if inv.to_save()["slots"] != [null, null, null, null, null, null, null, null]:
		return "an empty slots array is a real empty inventory"
	return ""

## Нет лейки в разделе (или не число) — лейка полная, а не пустая.
func test_from_save_missing_can_water_is_full() -> String:
	for d in [{"slots": []}, {"slots": [], "can_water": "no"}, {"slots": [], "can_water": null},
			{"slots": [], "can_water": NAN}, null]:
		var inv := _empty_inv()
		inv.use_water()
		inv.from_save(d)
		if inv.can_water != Inventory.CAN_CAPACITY:
			return "%s: can_water %d" % [str(d), inv.can_water]
	return ""

func test_changed_emitted() -> String:
	var inv := _inv()
	var n := [0]
	inv.changed.connect(func(): n[0] += 1)
	inv.add("silverleaf", 1)
	inv.remove_from_slot(0, 1)
	inv.select(2)
	inv.use_water()
	inv.refill_can()
	inv.from_save(Inventory.starter_save())
	if n[0] != 6:
		return "expected 6 emissions, got %d" % n[0]
	n[0] = 0
	inv.add("hoe", 0)
	inv.select(inv.selected)
	inv.remove_from_slot(7, 1)
	inv.refill_can()
	if n[0] != 0:
		return "no-op emitted %d" % n[0]
	return ""
