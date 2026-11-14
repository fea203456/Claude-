extends RefCounted
## Сквозной цикл фермы на настоящей сцене через GameFlow (свои часы, сохранения и путь):
## вскопать → посадить → полить → спать через кровать → собрать → выйти в меню → продолжить.
## Ввод — события действий (hotbar_N, interact) в корневой вьюпорт, как у игрока; часы
## переводятся напрямую только для того, чтобы можно было лечь спать.

const DIR := "user://test_saves/"
const PATH := DIR + "farm_loop.json"
## Клетка поля и откуда на неё смотрит герой: на метр южнее её центра, лицом на +Z.
const CELL := Vector2i(0, 3)
const STAND := Vector3(0.5, 0.0, 2.5)
## Спать можно с 18:00 (GameClock.SLEEP_FROM = 720); 800 — вечер.
const EVENING := 800


func _tree() -> SceneTree:
	return Engine.get_main_loop() as SceneTree


func _clean() -> void:
	DirAccess.make_dir_recursive_absolute(DIR)
	for f in [PATH, PATH + ".bak", PATH + ".tmp"]:
		if FileAccess.file_exists(f):
			DirAccess.remove_absolute(f)


func _flow() -> GameFlow:
	_clean()
	var flow := GameFlow.new()
	flow.clock = GameClock.new()
	flow.saves = SaveService.new()
	flow.save_path = PATH
	return flow


func _free_flow(flow: GameFlow) -> void:
	if is_instance_valid(flow.world):
		flow.world.free()
	flow.clock.free()
	flow.saves.free()
	flow.free()
	_clean()


func _node(flow: GameFlow, n: String) -> Node:
	return flow.world.find_child(n, true, false)


func _player(flow: GameFlow) -> PlayerController:
	return _node(flow, "Player") as PlayerController


## Нажатие действия так, как его получает игра: событие в корневой вьюпорт.
func _press(action: String) -> void:
	var ev := InputEventAction.new()
	ev.action = StringName(action)
	ev.pressed = true
	_tree().root.push_input(ev)
	var up := InputEventAction.new()
	up.action = StringName(action)
	up.pressed = false
	_tree().root.push_input(up)


func _place(flow: GameFlow, pos: Vector3, yaw: float) -> void:
	var p := _player(flow)
	p.velocity = Vector3.ZERO
	p.from_save({"pos": [pos.x, pos.y, pos.z], "yaw": yaw})


func _stand_at_cell(flow: GameFlow) -> String:
	_place(flow, STAND, 0.0)
	var fi := _node(flow, "FarmInteractor") as FarmInteractor
	return "" if fi.target_cell() == CELL else "hero targets %s, not %s" % [fi.target_cell(), CELL]


## Подсказка HUD так, как её видит игрок.
func _hud_prompt(flow: GameFlow) -> String:
	var hud := _node(flow, "Hud") as Hud
	hud.refresh()
	return hud.prompt_text() if hud.prompt_visible() else ""


## Вечер → к кровати лицом → E. "" — уснул и наступил следующий день.
func _sleep(flow: GameFlow) -> String:
	var day := flow.clock.day
	flow.clock.minutes = EVENING
	var bed := _node(flow, "Bed") as Bed
	var spawn := (_node(flow, "BedSpawn") as Node3D).global_position
	var to := bed.global_position - spawn
	_place(flow, spawn, atan2(to.x, to.z))
	var probe := _node(flow, "InteractionProbe") as InteractionProbe
	if probe.current() != bed:
		return "the bed is not in reach from BedSpawn"
	_press("interact")
	return "" if flow.clock.day == day + 1 else "did not sleep: day %d" % flow.clock.day


## Встать к клетке, взять лейку (hotbar_2) и полить (E).
func _water(flow: GameFlow) -> String:
	var err := _stand_at_cell(flow)
	if err != "":
		return err
	_press("hotbar_2")
	_press("interact")
	return "" if flow.farm.plot(CELL).get("watered", false) else "cell not watered on day %d" % flow.clock.day


## Новая игра → вскопать, посадить серебрянку, полить. "" — всё как в спеке.
func _start_and_plant(flow: GameFlow) -> String:
	flow.new_game()
	if flow.world == null:
		return "new_game did not load the farm"
	await _tree().physics_frame
	var inv := flow.inventory
	if inv.selected != 0 or inv.selected_id() != "hoe":
		return "new game starts with slot %d (%s) selected, expected slot 1 (hoe)" % [
				inv.selected + 1, inv.selected_id()]
	var err := _stand_at_cell(flow)
	if err != "":
		return err
	_press("hotbar_1")
	if _hud_prompt(flow) != "E — вскопать":
		return "till prompt «%s»" % _hud_prompt(flow)
	_press("interact")
	if not flow.farm.is_tilled(CELL):
		return "E with the hoe did not till %s" % CELL
	_press("hotbar_3")
	_press("interact")
	if flow.farm.plot(CELL).get("crop") != "silverleaf" or inv.count_of("seed_silverleaf") != 5:
		return "plant: plot %s, seeds %d" % [flow.farm.plot(CELL), inv.count_of("seed_silverleaf")]
	_press("hotbar_2")
	_press("interact")
	if not flow.farm.plot(CELL)["watered"] or inv.can_water != 9:
		return "water: plot %s, can %d" % [flow.farm.plot(CELL), inv.can_water]
	return ""


## Собранная клетка и инвентарь после сбора урожая (в памяти). "" — как в спеке.
func _check_harvested(flow: GameFlow, where: String) -> String:
	var inv := flow.inventory
	var plot := flow.farm.plot(CELL)
	if inv.count_of("silverleaf") != 2 or inv.count_of("seed_silverleaf") != 7:
		return "%s: silverleaf %d, seeds %d" % [where, inv.count_of("silverleaf"),
				inv.count_of("seed_silverleaf")]
	if plot.is_empty() or plot["crop"] != "" or plot["growth"] != 0.0:
		return "%s: plot %s, expected empty tilled" % [where, plot]
	if not is_equal_approx(plot["fertility"], 90.0):
		return "%s: fertility %s, expected 90" % [where, plot["fertility"]]
	return ""


## Утром у клетки: подсказка начинается с «E — собрать». "" — да.
func _harvest_prompt(flow: GameFlow) -> String:
	var err := _stand_at_cell(flow)
	if err != "":
		return err
	var text := _hud_prompt(flow)
	return "" if text.begins_with("E — собрать") else "day %d prompt «%s»" % [flow.clock.day, text]


## Выполняет тело в локали ru и возвращает его результат.
func _ru(body: Callable) -> String:
	var old := TranslationServer.get_locale()
	TranslationServer.set_locale("ru")
	var r: String = await body.call()
	TranslationServer.set_locale(old)
	return r


func test_full_loop_silverleaf() -> String:
	return await _ru(func():
		var flow := _flow()
		var err: String = await _start_and_plant(flow)
		# серебрянка: стадии по 1 дню → после трёх политых ночей спелая утром дня 4
		for night in 3:
			if err == "" and night > 0:
				err = _water(flow)
			if err == "":
				err = _sleep(flow)
		if err == "" and flow.clock.day != 4:
			err = "day %d after three nights" % flow.clock.day
		if err == "":
			err = _harvest_prompt(flow)
		if err == "":
			_press("interact")
			err = _check_harvested(flow, "after harvest")
		if err == "":
			await _tree().physics_frame
			flow.quit_to_menu()
			await _tree().process_frame
			await _tree().process_frame
			flow.continue_game()
			if flow.world == null or flow.farm == null:
				err = "continue_game did not load the farm: %s" % flow.last_message
			else:
				err = _check_harvested(flow, "after continue")
		_free_flow(flow)
		return err)


## Один день без полива: серебрянка поспевает на день позже (утром дня 5, а не 4).
func test_loop_survives_unwatered_day() -> String:
	return await _ru(func():
		var flow := _flow()
		var err: String = await _start_and_plant(flow)
		# день 1 полит (при посадке), день 2 — нет, дни 3 и 4 политы
		for night in 4:
			if err == "" and night >= 2:
				err = _water(flow)
			if err == "":
				err = _sleep(flow)
			if err == "" and flow.clock.day == 4:
				_stand_at_cell(flow)
				if flow.farm.is_ripe(CELL) or _hud_prompt(flow).begins_with("E — собрать"):
					err = "ripe on day 4 although day 2 was not watered"
		if err == "" and flow.clock.day != 5:
			err = "day %d after four nights" % flow.clock.day
		if err == "":
			err = _harvest_prompt(flow)
		if err == "":
			_press("interact")
			err = _check_harvested(flow, "after harvest")
		_free_flow(flow)
		return err)
