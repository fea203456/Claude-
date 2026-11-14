extends RefCounted

const CROPS := {
	"silverleaf": [[1, 1, 1], 2, 2, 10.0],
	"boneroot": [[1, 2, 2], 3, 2, 20.0],
	"nightbloom": [[2, 3, 3], 2, 1, 35.0],
}

func test_default_db_has_8_items_3_crops() -> String:
	var db := ContentDB.load_default()
	if db.item_ids().size() != 8:
		return "items: %d" % db.item_ids().size()
	if db.crop_ids().size() != 3:
		return "crops: %d" % db.crop_ids().size()
	return ""

func test_crop_values_match_spec() -> String:
	var db := ContentDB.load_default()
	for id in CROPS:
		var c := db.crop(id)
		if c == null:
			return "no crop " + id
		var exp: Array = CROPS[id]
		if Array(c.stage_days) != exp[0]:
			return "%s stage_days %s" % [id, c.stage_days]
		if c.yield_count != exp[1] or c.seed_count != exp[2] or not is_equal_approx(c.fatigue, exp[3]):
			return "%s yield/seed/fatigue mismatch" % id
		if c.total_days() != int(exp[0][0]) + int(exp[0][1]) + int(exp[0][2]):
			return "%s total_days %d" % [id, c.total_days()]
		if c.seed_item != "seed_" + id or c.produce_item != id or c.name_key != "ITEM_" + id.to_upper():
			return "%s ids/name_key mismatch" % id
	return ""

func test_crops_reference_existing_items() -> String:
	var db := ContentDB.load_default()
	for id in db.crop_ids():
		var c := db.crop(id)
		var s := db.item(c.seed_item)
		if s == null or db.item(c.produce_item) == null:
			return "%s: seed/produce missing" % id
		if s.kind != &"seed" or s.crop_id != id:
			return "%s: seed does not point back" % id
		if db.item(c.produce_item).kind != &"produce":
			return "%s: produce kind" % id
	return ""

func test_every_item_has_icon_and_name() -> String:
	var db := ContentDB.load_default()
	var old := TranslationServer.get_locale()
	var err := ""
	for loc in ["ru", "en"]:
		TranslationServer.set_locale(loc)
		for id in db.item_ids():
			var d := db.item(id)
			if d.icon == null:
				err = id + ": no icon"
			elif TranslationServer.translate(d.name_key) == d.name_key:
				err = "%s: %s not translated in %s" % [id, d.name_key, loc]
			if err != "":
				break
		if err == "":
			for k in ["STAGE_0", "STAGE_1", "STAGE_2", "STAGE_3"]:
				if TranslationServer.translate(k) == k:
					err = "%s not translated in %s" % [k, loc]
					break
		if err != "":
			break
	TranslationServer.set_locale(old)
	return err

func test_stage_scenes_instantiate() -> String:
	var db := ContentDB.load_default()
	for id in db.crop_ids():
		var c := db.crop(id)
		if c.stage_scenes.size() != 4:
			return "%s: %d scenes" % [id, c.stage_scenes.size()]
		for sc in c.stage_scenes:
			var n := sc.instantiate()
			if n == null:
				return id + ": instantiate failed"
			n.free()
	return ""

func test_unknown_id_returns_null() -> String:
	var db := ContentDB.load_default()
	if db.item("nope") != null or db.crop("nope") != null:
		return "unknown id must give null"
	return ""

func test_locale_complete() -> String:
	var f := FileAccess.open("res://locale/strings.csv", FileAccess.READ)
	if f == null:
		return "cannot open csv"
	var seen := {}
	f.get_csv_line()  # заголовок
	while not f.eof_reached():
		var row := f.get_csv_line()
		if row.size() == 1 and row[0] == "":
			continue
		if row.size() < 3 or row[0] == "" or row[1] == "" or row[2] == "":
			return "incomplete row: %s" % [row]
		if seen.has(row[0]):
			return "duplicate key " + row[0]
		seen[row[0]] = true
	return ""
