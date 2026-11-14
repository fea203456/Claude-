extends RefCounted
## Поле в мире: вид поля, клетка перед героем, запасной обработчик зонда, колодец, сборка сцены.

const FARM := "res://scenes/world/farm_test.tscn"
const FIELD := Rect2i(-6, 2, 12, 8)

var _db: ContentDB


func _tree() -> SceneTree:
	return Engine.get_main_loop() as SceneTree


func _root() -> Node:
	return _tree().root


func _content() -> ContentDB:
	if _db == null:
		_db = ContentDB.load_default()
	return _db


func _state(plots: Array = []) -> FarmState:
	var s := FarmState.new()
	s.db = _content()
	s.from_save({"plots": plots})
	return s


func _inv() -> Inventory:
	var inv := Inventory.new()
	inv.db = _content()
	inv.reset_to_starter()
	return inv


func _press(probe: InteractionProbe) -> void:
	var ev := InputEventAction.new()
	ev.action = "interact"
	ev.pressed = true
	probe._unhandled_input(ev)


## Выполняет тело в локали ru и возвращает его результат.
func _ru(body: Callable) -> String:
	var old := TranslationServer.get_locale()
	TranslationServer.set_locale("ru")
	var r: String = await body.call()
	TranslationServer.set_locale(old)
	return r


## Герой-контроллер в (x, 0, z) с заданным yaw и FarmInteractor-ребёнком.
func _hero(x: float, z: float, yaw: float) -> Array:
	var hero := PlayerController.new()
	var fi := FarmInteractor.new()
	fi.name = "FarmInteractor"
	hero.add_child(fi)
	_root().add_child(hero)
	hero.set_physics_process(false)
	hero.from_save({"pos": [x, 0.0, z], "yaw": yaw})
	return [hero, fi]


## Настоящая ферма с полем, инвентарём и базой, розданными по именам узлов (как GameFlow).
func _world() -> Dictionary:
	var w := (load(FARM) as PackedScene).instantiate()
	_root().add_child(w)
	var state := _state()
	var inv := _inv()
	for n in ["FarmField", "FarmInteractor", "Well"]:
		var node := w.find_child(n, true, false)
		if node != null:
			node.set("db", _content())
	for n in ["FarmField", "FarmInteractor"]:
		var node := w.find_child(n, true, false)
		if node != null:
			node.set("state", state)
	for n in ["FarmInteractor", "Well"]:
		var node := w.find_child(n, true, false)
		if node != null:
			node.set("inventory", inv)
	await _tree().physics_frame
	await _tree().physics_frame
	var player := w.find_child("Player", true, false) as PlayerController
	return {
		"w": w, "state": state, "inv": inv, "player": player,
		"probe": player.find_child("InteractionProbe", true, false) as InteractionProbe,
		"field": w.find_child("FarmField", true, false) as FarmField,
		"well": w.find_child("Well", true, false) as Node3D,
		"hud": w.find_child("Hud", true, false) as Hud,
	}


func _place(player: PlayerController, x: float, z: float, yaw: float) -> void:
	player.velocity = Vector3.ZERO
	player.from_save({"pos": [x, 0.0, z], "yaw": yaw})


# --- FarmField: геометрия клеток и цвет почвы ---

func test_cell_at_negative() -> String:
	var cases := [[-0.5, -1], [-1.0, -1], [0.0, 0], [5.99, 5]]
	for c in cases:
		var got := FarmField.cell_at(Vector3(c[0], 0.0, c[0]))
		if got != Vector2i(c[1], c[1]):
			return "cell_at(%s) = %s, expected (%d, %d)" % [c[0], got, c[1], c[1]]
	var mixed := FarmField.cell_at(Vector3(-0.01, 3.0, 2.5))
	return "" if mixed == Vector2i(-1, 2) else "cell_at(-0.01, 3, 2.5) = %s" % mixed


func test_cell_center() -> String:
	var got := FarmField.cell_center(Vector2i(-3, 4))
	if not got.is_equal_approx(Vector3(-2.5, 0.0, 4.5)):
		return "cell_center(-3, 4) = %s" % got
	for cell in [Vector2i(-6, 2), Vector2i(5, 9), Vector2i(0, 0)]:
		if FarmField.cell_at(FarmField.cell_center(cell)) != cell:
			return "cell_at(cell_center(%s)) round trip failed" % cell
	return ""


func test_soil_color_monotonic() -> String:
	var rich := FarmField.soil_color(100.0, false)
	var mid := FarmField.soil_color(50.0, false)
	var spent := FarmField.soil_color(0.0, false)
	if not (rich.s > mid.s and mid.s > spent.s):
		return "saturation must fall 100→50→0: %s %s %s" % [rich.s, mid.s, spent.s]
	if not (rich.r > rich.b):
		return "rich soil must be warm (r > b): %s" % rich
	var pairs := [[rich, mid], [mid, spent], [rich, spent]]
	for p in pairs:
		var a: Color = p[0]
		var b: Color = p[1]
		var d := maxf(absf(a.r - b.r), maxf(absf(a.g - b.g), absf(a.b - b.b)))
		if d < 0.08:
			return "colours %s and %s differ by %.3f < 0.08" % [a, b, d]
	for f in [0.0, 37.0, 50.0, 100.0]:
		var dry := FarmField.soil_color(f, false)
		var wet := FarmField.soil_color(f, true)
		if not (wet.v < dry.v):
			return "watered must be darker at %s%%: dry %s wet %s" % [f, dry, wet]
		if not (is_equal_approx(wet.r, dry.r * 0.6) and is_equal_approx(wet.g, dry.g * 0.6) \
				and is_equal_approx(wet.b, dry.b * 0.6)):
			return "watered must be dry × 0.6 at %s%%" % f
	return ""


func test_view_follows_state() -> String:
	var field := FarmField.new()
	field.db = _content()
	var state := _state()
	field.state = state
	_root().add_child(field)
	var c := Vector2i(0, 3)
	var err := ""
	state.till(c)
	if field.plot_count() != 1:
		err = "after till plot_count = %d" % field.plot_count()
	if err == "" and field.crop_node(c) != null:
		err = "crop_node before planting"
	state.plant(c, "silverleaf")
	var sprout := field.crop_node(c)
	if err == "" and sprout == null:
		err = "no crop_node after planting"
	var sprout_id := sprout.get_instance_id() if sprout != null else 0
	if err == "" and sprout.global_position.y < 0.05:
		err = "sprout sunk into the soil: y = %s" % sprout.global_position.y
	state.water(c)
	state.advance_night()
	var shoot := field.crop_node(c)
	if err == "" and (shoot == null or shoot.get_instance_id() == sprout_id):
		err = "stage node did not change after the night"
	for i in 3:
		state.water(c)
		state.advance_night()
	if err == "" and not state.is_ripe(c):
		err = "test setup: not ripe"
	state.harvest(c)
	if err == "" and field.crop_node(c) != null:
		err = "crop_node still there after harvest"
	if err == "" and field.plot_count() != 1:
		err = "plot_count after harvest = %d" % field.plot_count()
	state.clear()
	if err == "" and field.plot_count() != 0:
		err = "plot_count after clear = %d" % field.plot_count()
	field.free()
	return err


func test_unknown_crop_shows_marker() -> String:
	var field := FarmField.new()
	field.db = _content()
	field.state = _state([{"x": 1, "z": 4, "fertility": 80.0, "crop": "mystery_root", "growth": 2.0}])
	_root().add_child(field)
	var c := Vector2i(1, 4)
	var err := ""
	if field.plot_count() != 1:
		err = "plot_count = %d" % field.plot_count()
	elif field.crop_node(c) != null:
		err = "unknown crop must have no stage node"
	else:
		var plot := field.plot_node(c)
		var mark: Label3D = null
		if plot != null:
			for n in plot.find_children("*", "Label3D", true, false):
				mark = n
		if mark == null or mark.text != "?":
			err = "no «?» marker on the unknown crop"
	field.free()
	return err


func test_field_without_state_or_db_idles() -> String:
	var field := FarmField.new()
	_root().add_child(field)
	field.set_highlight(Vector2i(0, 3), true)
	var err := ""
	if field.plot_count() != 0:
		err = "plot_count without state = %d" % field.plot_count()
	elif field.highlight_cell() != Vector2i(0, 3):
		err = "highlight without state: %s" % field.highlight_cell()
	field.set_highlight(Vector2i(0, 3), false)
	if err == "" and field.highlight_cell() != null:
		err = "highlight not hidden"
	field.state = null
	field.free()
	return err


# --- FarmInteractor ---

func test_target_cell_one_meter_ahead() -> String:
	var h := _hero(0.5, 0.5, 0.0)
	var fi: FarmInteractor = h[1]
	var err := ""
	if fi.target_cell() != Vector2i(0, 1):
		err = "facing +Z: %s, expected (0, 1)" % fi.target_cell()
	(h[0] as PlayerController).from_save({"pos": [0.5, 0.0, 0.5], "yaw": -PI / 2.0})
	if err == "" and fi.target_cell() != Vector2i(-1, 0):
		err = "facing -X: %s, expected (-1, 0)" % fi.target_cell()
	h[0].free()
	return err


func test_highlight_only_in_field() -> String:
	var field := FarmField.new()
	_root().add_child(field)
	var h := _hero(0.5, 1.5, 0.0)
	var fi: FarmInteractor = h[1]
	fi.state = _state()
	fi.field = field
	fi._process(0.0)
	var err := ""
	if field.highlight_cell() != Vector2i(0, 2):
		err = "in field: highlight %s, expected (0, 2)" % field.highlight_cell()
	(h[0] as PlayerController).from_save({"pos": [0.5, 0.0, 0.5], "yaw": 0.0})
	fi._process(0.0)
	if err == "" and field.highlight_cell() != null:
		err = "outside field: highlight %s, expected none" % field.highlight_cell()
	h[0].free()
	field.free()
	return err


# --- InteractionProbe + FarmInteractor + Well на настоящей ферме ---

func test_probe_prefers_interactable_over_farm() -> String:
	var r := await _world()
	var state: FarmState = r["state"]
	var inv: Inventory = r["inv"]
	var well: Node3D = r["well"]
	if well == null:
		r["w"].free()
		return "no Well in the farm"
	# Поле расширено до колодца, чтобы клетка перед героем была пригодна для мотыги.
	state.bounds = Rect2i(-6, 2, 20, 8)
	_place(r["player"], well.global_position.x, well.global_position.z - 1.3, 0.0)
	var cell: Vector2i = (r["w"].find_child("FarmInteractor", true, false) as FarmInteractor).target_cell()
	inv.use_water()
	inv.use_water()
	var err := ""
	if not state.in_field(cell):
		err = "test setup: cell %s ahead not in field" % cell
	elif (r["probe"] as InteractionProbe).current() != well:
		err = "probe does not see the well"
	else:
		_press(r["probe"])
		if inv.can_water != Inventory.CAN_CAPACITY:
			err = "well did not refill: %d" % inv.can_water
		elif state.is_tilled(cell):
			err = "the same press also tilled the cell"
	r["w"].free()
	return err


func test_probe_falls_back_to_farm() -> String:
	var r := await _world()
	var state: FarmState = r["state"]
	var probe: InteractionProbe = r["probe"]
	_place(r["player"], 0.5, 2.2, 0.0)
	var cell := Vector2i(0, 3)
	var err := ""
	if probe.current() != null:
		err = "test setup: an interactable is in reach"
	elif probe.prompt_text() != FarmActions.resolve(state, r["inv"], cell)["text"] \
			or probe.prompt_text() == "":
		err = "prompt_text = «%s»" % probe.prompt_text()
	else:
		_press(probe)
		if not state.is_tilled(cell):
			err = "interact did not till %s" % cell
		elif (r["field"] as FarmField).plot_count() != 1:
			err = "field view did not follow: %d" % (r["field"] as FarmField).plot_count()
	r["w"].free()
	return err


func test_hud_shows_farm_prompt() -> String:
	var r := await _world()
	var hud: Hud = r["hud"]
	hud.probe = r["probe"]
	_place(r["player"], 0.5, 2.2, 0.0)
	hud.refresh()
	var want := (r["probe"] as InteractionProbe).prompt_text()
	var err := ""
	if want == "":
		err = "test setup: empty farm prompt"
	elif not hud.prompt_visible() or hud.prompt_text() != want:
		err = "hud prompt «%s» visible=%s, expected «%s»" % [hud.prompt_text(), hud.prompt_visible(), want]
	(r["inv"] as Inventory).select(6)  # пустая рука
	_place(r["player"], 0.5, -3.5, PI)  # смотрит от поля, рядом ничего
	hud.refresh()
	if err == "" and hud.prompt_visible():
		err = "hud prompt visible with nothing to do: «%s»" % hud.prompt_text()
	r["w"].free()
	return err


func test_well_refills_and_reports_full() -> String:
	return await _ru(func():
		var well := Well.new()
		var inv := _inv()
		well.inventory = inv
		_root().add_child(well)
		inv.select(2)  # семена в руке — всё равно наполняет
		inv.use_water()
		var err := ""
		if well.prompt(null) != "E — набрать воды" or not well.can_interact(null):
			err = "not full: prompt «%s»" % well.prompt(null)
		well.interact(null)
		if err == "" and inv.can_water != Inventory.CAN_CAPACITY:
			err = "not refilled: %d" % inv.can_water
		if err == "" and (well.prompt(null) != "Лейка полна" or well.can_interact(null)):
			err = "full: prompt «%s»" % well.prompt(null)
		inv.from_save({"slots": [{"id": "hoe", "count": 1}], "can_water": 0})
		if err == "" and well.can_interact(null):
			err = "refills without a watering can in the inventory"
		well.free()
		return err)


func test_well_at_least_2m_from_field() -> String:
	var r := await _world()
	var well: Node3D = r["well"]
	var err := ""
	if well == null:
		err = "no Well"
	else:
		var wp := Vector3(well.global_position.x, 0.0, well.global_position.z)
		for x in range(FIELD.position.x, FIELD.end.x):
			for z in range(FIELD.position.y, FIELD.end.y):
				var d := FarmField.cell_center(Vector2i(x, z)).distance_to(wp)
				if d <= 2.0 and err == "":
					err = "cell (%d, %d) is %.2f m from the well" % [x, z, d]
	r["w"].free()
	return err


func test_field_clear_of_house_and_spawn() -> String:
	var r := await _world()
	var w: Node = r["w"]
	var spawn := (w.find_child("SpawnStart", true, false) as Node3D).global_position
	var field := Rect2(Vector2(FIELD.position), Vector2(FIELD.size))
	var err := ""
	# Ближайшая к точке появления точка поля.
	var p := Vector2(clampf(spawn.x, field.position.x, field.end.x),
			clampf(spawn.z, field.position.y, field.end.y))
	if p.distance_to(Vector2(spawn.x, spawn.z)) < 2.0:
		err = "field is %.2f m from SpawnStart" % p.distance_to(Vector2(spawn.x, spawn.z))
	var walls := w.find_child("Walls", true, false) as Node3D
	if err == "" and walls == null:
		err = "house walls not found"
	elif err == "":
		for cs in walls.get_children():
			var box := (cs as CollisionShape3D).shape as BoxShape3D
			var c := (cs as Node3D).global_position
			var foot := Rect2(c.x - box.size.x / 2.0, c.z - box.size.z / 2.0, box.size.x, box.size.z)
			if foot.intersects(field):
				err = "field overlaps house wall %s" % cs.name
				break
	w.free()
	return err


func test_player_blocked_by_well() -> String:
	var r := await _world()
	var player: PlayerController = r["player"]
	var well: Node3D = r["well"]
	if well == null:
		r["w"].free()
		return "no Well"
	player.set_physics_process(false)
	var start_z := well.global_position.z - 3.0
	_place(player, well.global_position.x, start_z, 0.0)
	for i in 150:
		player.step(Vector2(0, 1), false, 0.0, 1.0 / 60.0)
		await _tree().physics_frame
	var z := player.global_position.z
	var err := ""
	if z - start_z < 1.0:
		err = "player did not walk: z = %.2f" % z
	elif z > well.global_position.z - 0.6:
		err = "player walked into the well: z = %.2f, well at %.2f" % [z, well.global_position.z]
	r["w"].free()
	return err
