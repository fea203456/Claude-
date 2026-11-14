class_name FarmActions
extends RefCounted
## Что делает кнопка E на клетке поля: чистые правила, подсказки и отказы без узлов.
## resolve() ничего не меняет; perform() сам вызывает resolve() и действует только по его ответу.


## {"kind": &"harvest"/&"plant"/&"water"/&"till"/&"none", "reason": StringName, "text": String}.
static func resolve(state: FarmState, inv: Inventory, cell: Vector2i) -> Dictionary:
	var r := _rule(state, inv, cell)
	if state.is_tilled(cell):
		var soil := TranslationServer.translate("SOIL_FMT").format(
				{"pct": int(round(state.plot(cell)["fertility"]))})
		r["text"] = soil if r["text"] == "" else "%s\n%s" % [r["text"], soil]
	return r


## Выполняет то, что вернул resolve(); возвращает kind.
static func perform(state: FarmState, inv: Inventory, cell: Vector2i) -> StringName:
	var kind: StringName = resolve(state, inv, cell)["kind"]
	match kind:
		&"till":
			state.till(cell)
		&"plant":
			var def := inv.selected_def()
			if state.plant(cell, def.crop_id):
				inv.remove_from_slot(inv.selected, 1)
		&"water":
			if inv.use_water():
				state.water(cell)
		&"harvest":
			var crop := state.db.crop(state.plot(cell)["crop"])
			var got := state.harvest(cell)
			if not got.is_empty():
				inv.add(crop.produce_item, got["produce"])
				inv.add(crop.seed_item, got["seeds"])
	return kind


static func _result(kind: StringName, reason := &"", key := "") -> Dictionary:
	return {"kind": kind, "reason": reason, "text": "" if key == "" else TranslationServer.translate(key)}


static func _rule(state: FarmState, inv: Inventory, cell: Vector2i) -> Dictionary:
	var tilled := state.is_tilled(cell)
	var def := inv.selected_def()  # null для пустой и неизвестной ячейки: как пустая рука
	var tool: StringName = def.tool if def != null and def.kind == &"tool" else &""
	# 1. спелое растение
	if state.is_ripe(cell):
		var crop := state.db.crop(state.plot(cell)["crop"])
		var n := FarmState.yield_for(crop.yield_count, state.plot(cell)["fertility"])
		if not inv.can_add_all([[crop.produce_item, n], [crop.seed_item, crop.seed_count]]):
			return _result(&"none", &"no_room", "PROMPT_NO_ROOM")
		return _result(&"harvest", &"", "PROMPT_HARVEST")
	# 2. посадка
	if tilled and not state.has_plant(cell) and def != null and def.kind == &"seed" \
			and state.db.crop(def.crop_id) != null:
		var text := TranslationServer.translate("PROMPT_PLANT_FMT").format(
				{"crop": TranslationServer.translate(state.db.crop(def.crop_id).name_key)})
		return {"kind": &"plant", "reason": &"", "text": text}
	# 3. полив
	if tilled and not state.is_unknown(cell) and tool == &"can":
		if state.plot(cell)["watered"]:
			return _result(&"none", &"already_watered", "PROMPT_ALREADY_WATERED")
		if inv.can_water <= 0:
			return _result(&"none", &"can_empty", "PROMPT_CAN_EMPTY")
		return _result(&"water", &"", "PROMPT_WATER")
	# 4. мотыга
	if tool == &"hoe" and not tilled:
		if state.in_field(cell):
			return _result(&"till", &"", "PROMPT_TILL")
		return _result(&"none", &"cant_till", "PROMPT_CANT_TILL")
	# 5. неспелое и неизвестное растение
	if state.is_unknown(cell):
		return _result(&"none", &"unknown", "PROMPT_UNKNOWN_PLANT")
	if state.has_plant(cell):
		var crop := state.db.crop(state.plot(cell)["crop"])
		var text := TranslationServer.translate("PROMPT_GROWING_FMT").format({
				"crop": TranslationServer.translate(crop.name_key),
				"stage": TranslationServer.translate("STAGE_%d" % state.stage(cell))})
		return {"kind": &"none", "reason": &"growing", "text": text}
	return _result(&"none")
