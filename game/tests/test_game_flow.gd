extends RefCounted
## Игровой цикл на настоящей сцене фермы: свои GameClock/SaveService/путь, без autoload.

const FARM := "res://scenes/world/farm_test.tscn"
const MAIN_MENU := "res://scenes/ui/main_menu.tscn"
const PAUSE_MENU := "res://scenes/ui/pause_menu.tscn"
const DIR := "user://test_saves/"
const PATH := DIR + "flow.json"
const DT := 1.0 / 60.0
## Внутренняя грань частокола: колья по квадрату 36×36 м с центром в начале координат.
const HALF := 18.0


## Считает записи сохранения.
class CountingSaves extends SaveService:
	var writes := 0

	func save_game(path: String = SLOT_PATH) -> Error:
		writes += 1
		return super(path)


func _tree() -> SceneTree:
	return Engine.get_main_loop() as SceneTree


func _root() -> Node:
	return _tree().root


func _clean() -> void:
	DirAccess.make_dir_recursive_absolute(DIR)
	for f in [PATH, PATH + ".bak", PATH + ".tmp"]:
		if FileAccess.file_exists(f) or DirAccess.dir_exists_absolute(f):
			DirAccess.remove_absolute(f)


func _write(path: String, text: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(text)
	f.close()


func _read_save() -> Dictionary:
	if not FileAccess.file_exists(PATH):
		return {}
	var d = JSON.parse_string(FileAccess.get_file_as_string(PATH))
	return d if d is Dictionary else {}


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


## Ферма в root, подключённая к flow.
func _world(flow: GameFlow) -> Node:
	var w := (load(FARM) as PackedScene).instantiate()
	_root().add_child(w)
	flow.attach_world(w)
	await _tree().physics_frame
	await _tree().physics_frame
	return w


func _node(w: Node, n: String) -> Node:
	return w.find_child(n, true, false)


func _near(a: Vector3, b: Vector3, eps := 0.01) -> bool:
	return a.distance_to(b) <= eps


func _bed_spawn(w: Node) -> Vector3:
	return (_node(w, "BedSpawn") as Node3D).global_position


func _player(w: Node) -> PlayerController:
	return _node(w, "Player") as PlayerController


func test_new_game_state() -> String:
	var flow := _flow()
	flow.clock.day = 7
	flow.clock.minutes = 500
	flow.new_game()
	var w := flow.world
	if w == null:
		_free_flow(flow)
		return "new_game did not load the farm"
	var spawn := (_node(w, "SpawnStart") as Node3D).global_position
	var cam := _node(w, "CameraRig") as CameraRig
	var err := ""
	if flow.clock.day != 1 or flow.clock.minutes != 0:
		err = "time day=%d minutes=%d" % [flow.clock.day, flow.clock.minutes]
	elif not _near(_player(w).global_position, spawn):
		err = "player at %s, SpawnStart at %s" % [_player(w).global_position, spawn]
	elif cam.yaw_index != 0 or not is_equal_approx(cam.distance, CameraRig.DEFAULT_DIST):
		err = "camera not default: yaw_index=%d distance=%s" % [cam.yaw_index, cam.distance]
	elif _tree().current_scene != w:
		err = "farm is not the current scene"
	elif flow.clock.paused or _tree().paused:
		err = "game starts paused"
	_free_flow(flow)
	return err


func test_attach_wires_world() -> String:
	var flow := _flow()
	var w: Node = await _world(flow)
	var cam := _node(w, "CameraRig") as CameraRig
	cam.from_save({"yaw_index": 2, "distance": 8.0})
	var probe := _node(_player(w), "InteractionProbe")
	var err := ""
	if (_node(w, "Hud") as Hud).clock != flow.clock:
		err = "Hud clock not injected"
	elif (_node(w, "Hud") as Hud).probe != probe:
		err = "Hud probe not injected"
	elif (_node(w, "Bed") as Bed).clock != flow.clock:
		err = "Bed clock not injected"
	elif (_node(w, "DayNightLighting") as DayNightLighting).clock != flow.clock:
		err = "DayNightLighting clock not injected"
	elif not is_equal_approx(float(_player(w).camera_yaw_provider.call()), PI / 2.0):
		err = "camera_yaw_provider returns %s" % _player(w).camera_yaw_provider.call()
	elif (_node(w, "PauseMenu") as PauseMenu).flow != flow:
		err = "PauseMenu flow not injected"
	_free_flow(flow)
	return err


func test_sleep_saves_and_moves_to_bed() -> String:
	var flow := _flow()
	var w: Node = await _world(flow)
	flow.clock.minutes = 800
	(_node(w, "Bed") as Bed).sleep_requested.emit()
	var save := _read_save()
	var err := ""
	if flow.clock.day != 2 or flow.clock.minutes != 0:
		err = "time day=%d minutes=%d" % [flow.clock.day, flow.clock.minutes]
	elif not _near(_player(w).global_position, _bed_spawn(w)):
		err = "player at %s, BedSpawn at %s" % [_player(w).global_position, _bed_spawn(w)]
	elif save.is_empty():
		err = "no save written"
	elif int(save["time"]["day"]) != 2:
		err = "saved day %s" % save["time"]["day"]
	_free_flow(flow)
	return err


func test_collapse_saves_and_moves_to_bed() -> String:
	var flow := _flow()
	var w: Node = await _world(flow)
	flow.clock.advance(1200)
	var save := _read_save()
	var err := ""
	if flow.clock.day != 2 or not flow.clock.collapsed_last_night:
		err = "day=%d collapsed=%s" % [flow.clock.day, flow.clock.collapsed_last_night]
	elif not _near(_player(w).global_position, _bed_spawn(w)):
		err = "player at %s, BedSpawn at %s" % [_player(w).global_position, _bed_spawn(w)]
	elif save.is_empty():
		err = "no save written"
	elif int(save["time"]["day"]) != 2 or not bool(save["time"]["collapsed_last_night"]):
		err = "saved time %s" % save["time"]
	_free_flow(flow)
	return err


func test_quit_and_continue_restores_everything() -> String:
	var a := _flow()
	var wa: Node = await _world(a)
	_player(wa).from_save({"pos": [5.0, 0.0, 7.0], "yaw": 1.0})
	a.clock.day = 3
	a.clock.minutes = 500
	var cam_a := _node(wa, "CameraRig") as CameraRig
	cam_a.yaw_index = 3
	cam_a.distance = 11.0
	var e := a.save_now()
	a.world.free()
	a.clock.free()
	a.saves.free()
	a.free()
	if e != OK:
		return "save_now returned %d" % e
	var b := GameFlow.new()
	b.clock = GameClock.new()
	b.saves = SaveService.new()
	b.save_path = PATH
	var wb: Node = await _world(b)
	var r := b.saves.load_game(PATH)
	var p := _player(wb)
	var cam := _node(wb, "CameraRig") as CameraRig
	var err := ""
	if r != SaveService.LoadResult.OK:
		err = "load result %d" % r
	elif not _near(p.global_position, Vector3(5, 0, 7)):
		err = "player at %s" % p.global_position
	elif not _near(p.facing(), Vector3(sin(1.0), 0.0, cos(1.0)), 0.001):
		err = "player facing %s" % p.facing()
	elif b.clock.day != 3 or b.clock.minutes != 500:
		err = "time day=%d minutes=%d" % [b.clock.day, b.clock.minutes]
	elif cam.yaw_index != 3 or not is_equal_approx(cam.distance, 11.0):
		err = "camera yaw_index=%d distance=%s" % [cam.yaw_index, cam.distance]
	elif not is_equal_approx(cam.yaw(), 3.0 * PI / 4.0):
		err = "camera yaw %s" % cam.yaw()
	_free_flow(b)
	return err


func test_quit_from_pause_saves_exact_state() -> String:
	var flow := _flow()
	await _world(flow)
	flow.clock.minutes = 300
	flow.set_paused(true)
	var paused := _tree().paused and flow.clock.paused
	flow.clock.advance(100)
	var m := flow.clock.minutes
	var e := flow.save_now()
	flow.set_paused(false)
	var save := _read_save()
	var err := ""
	if not paused:
		err = "set_paused(true) did not pause tree and clock"
	elif _tree().paused or flow.clock.paused:
		err = "set_paused(false) did not unpause"
	elif m != 300:
		err = "time moved on pause: %d" % m
	elif e != OK or save.is_empty():
		err = "save failed: %d" % e
	elif int(save["time"]["minutes"]) != 300:
		err = "saved minutes %s" % save["time"]["minutes"]
	_free_flow(flow)
	return err


func test_continue_too_new_stays_in_menu() -> String:
	var flow := _flow()
	_write(PATH, '{"save_version": 99, "time": {"day": 9, "minutes": 9}}')
	var before := FileAccess.get_file_as_string(PATH)
	var scene_before := _tree().current_scene
	var children := _root().get_child_count()
	flow.continue_game()
	var err := ""
	if flow.last_message != TranslationServer.translate("SAVE_TOO_NEW"):
		err = "last_message = '%s'" % flow.last_message
	elif FileAccess.get_file_as_string(PATH) != before or FileAccess.file_exists(PATH + ".bak"):
		err = "save file was changed"
	elif flow.world != null or _root().get_child_count() != children:
		err = "farm stayed loaded"
	elif _tree().current_scene != scene_before:
		err = "current scene changed"
	elif flow.clock.day != 1:
		err = "too-new save was applied"
	_free_flow(flow)
	return err


func test_continue_corrupt_starts_new_game() -> String:
	var flow := _flow()
	_write(PATH, "{{ garbage")
	flow.clock.day = 5
	flow.continue_game()
	var w := flow.world
	var err := ""
	if w == null:
		err = "farm not loaded"
	elif flow.last_message != TranslationServer.translate("SAVE_CORRUPT"):
		err = "last_message = '%s'" % flow.last_message
	elif flow.clock.day != 1 or flow.clock.minutes != 0:
		err = "not a new game: day=%d minutes=%d" % [flow.clock.day, flow.clock.minutes]
	elif not _near(_player(w).global_position, (_node(w, "SpawnStart") as Node3D).global_position):
		err = "player not at SpawnStart"
	elif not _hud_shows(w, flow.last_message):
		err = "HUD does not show the corrupt-save message"
	_free_flow(flow)
	return err


## Новая игра после «Продолжить» не тащит в сохранение разделы старой игры.
func test_new_game_drops_loaded_sections() -> String:
	var flow := _flow()
	_write(PATH, '{"save_version": 1, "time": {"day": 4, "minutes": 100}, "future": {"k": 1}}')
	flow.continue_game()
	flow.new_game()
	var e := flow.save_now()
	var save := _read_save()
	var err := ""
	if e != OK:
		err = "save_now returned %d" % e
	elif save.has("future"):
		err = "section of the old game survived new_game: %s" % str(save["future"])
	elif int(save["time"]["day"]) != 1:
		err = "saved day %s" % save["time"]["day"]
	_free_flow(flow)
	return err


## Новая игра → выход в меню → «Продолжить» в той же сессии: detach снял героя и камеру
## с регистрации, а после повторного подключения сон пишет одно сохранение и все
## подписки подключены ровно по разу.
func test_reattach_after_quit_to_menu() -> String:
	_clean()
	var flow := GameFlow.new()
	flow.clock = GameClock.new()
	var saves := CountingSaves.new()
	flow.saves = saves
	flow.save_path = PATH
	flow.new_game()
	var first := flow.world
	await _tree().physics_frame
	flow.quit_to_menu()
	var err := ""
	if saves.writes != 1:
		err = "quit_to_menu wrote %d saves" % saves.writes
	elif saves.is_registered("player") or saves.is_registered("camera"):
		err = "player/camera still registered after quit_to_menu"
	elif not saves.is_registered("time"):
		err = "time provider (clock autoload) was unregistered"
	await _tree().process_frame
	await _tree().process_frame
	if err == "" and is_instance_valid(first):
		err = "old farm not freed by the scene change"
	flow.continue_game()
	await _tree().physics_frame
	var w := flow.world
	var bed := _node(w, "Bed") as Bed
	saves.writes = 0
	flow.clock.minutes = 800
	bed.sleep_requested.emit()
	var save := _read_save()
	if err != "":
		pass
	elif saves.writes != 1:
		err = "sleep wrote %d saves" % saves.writes
	elif bed.sleep_requested.get_connections().size() != 1:
		err = "Bed.sleep_requested has %d connections" % bed.sleep_requested.get_connections().size()
	elif flow.clock.collapsed.get_connections().size() != 1:
		err = "clock.collapsed has %d connections" % flow.clock.collapsed.get_connections().size()
	elif flow.clock.day_started.get_connections().size() != 1:
		err = "clock.day_started has %d connections" % flow.clock.day_started.get_connections().size()
	elif not (save.has("player") and save.has("camera")) or int(save["time"]["day"]) != 2:
		err = "save after re-attach: %s" % str(save)
	_free_flow(flow)
	return err


func _hud_shows(w: Node, text: String) -> bool:
	var hud := _node(w, "Hud") as Hud
	return hud != null and hud.message_visible() and hud.message_text() == text


## Запись не удалась (на месте .tmp — папка): сон не теряет ошибку молча.
func test_failed_autosave_reports() -> String:
	var flow := _flow()
	var w: Node = await _world(flow)
	DirAccess.make_dir_recursive_absolute(PATH + ".tmp")
	flow.clock.minutes = 800
	(_node(w, "Bed") as Bed).sleep_requested.emit()
	var want := TranslationServer.translate("SAVE_FAILED")
	var err := ""
	if want == "SAVE_FAILED":
		err = "SAVE_FAILED is not translated"
	elif flow.last_message != want:
		err = "last_message = '%s'" % flow.last_message
	elif not _hud_shows(w, want):
		err = "HUD does not show the save failure"
	elif flow.clock.day != 2:
		err = "sleep itself did not happen"
	_free_flow(flow)
	_clean()
	return err


func test_continue_restored_from_bak() -> String:
	var flow := _flow()
	_write(PATH, "{{ garbage")
	_write(PATH + ".bak", '{"save_version": 1, "time": {"day": 4, "minutes": 100}}')
	flow.continue_game()
	var err := ""
	if flow.world == null:
		err = "farm not loaded"
	elif flow.last_message != TranslationServer.translate("SAVE_RESTORED_BAK"):
		err = "last_message = '%s'" % flow.last_message
	elif flow.clock.day != 4 or flow.clock.minutes != 100:
		err = "bak not applied: day=%d minutes=%d" % [flow.clock.day, flow.clock.minutes]
	_free_flow(flow)
	return err


func test_close_request_saves_only_with_world() -> String:
	var flow := _flow()
	flow.notification(Node.NOTIFICATION_WM_CLOSE_REQUEST)
	if FileAccess.file_exists(PATH):
		_free_flow(flow)
		return "saved on close without a world"
	await _world(flow)
	flow.clock.minutes = 42
	flow.notification(Node.NOTIFICATION_WM_CLOSE_REQUEST)
	var save := _read_save()
	_free_flow(flow)
	if save.is_empty():
		return "close request with a world did not save"
	return "" if int(save["time"]["minutes"]) == 42 else "saved %s" % save["time"]


func test_fence_blocks_player() -> String:
	var flow := _flow()
	var w: Node = await _world(flow)
	var p := _player(w)
	# север (−Z) от центра закрыт домом, поэтому на север идём восточнее дома
	var runs := [
		[Vector3(10, 0, 0), Vector2(0, -1), Vector3(0, 0, -1)],
		[Vector3.ZERO, Vector2(0, 1), Vector3(0, 0, 1)],
		[Vector3.ZERO, Vector2(1, 0), Vector3(1, 0, 0)],
		[Vector3.ZERO, Vector2(-1, 0), Vector3(-1, 0, 0)],
	]
	var err := ""
	for run in runs:
		p.global_position = run[0]
		p.velocity = Vector3.ZERO
		await _tree().physics_frame
		await _tree().physics_frame
		for i in int(30.0 / DT):
			p.step(run[1], false, 0.0, DT)
		var pos := p.global_position
		if absf(pos.x) >= HALF or absf(pos.z) >= HALF:
			err = "walked %s from %s and left the fence: %s" % [run[2], run[0], pos]
			break
		if pos.dot(run[2]) < HALF - 2.0:
			err = "walked %s from %s but stopped early at %s" % [run[2], run[0], pos]
			break
	_free_flow(flow)
	return err


func test_main_menu_continue_needs_save() -> String:
	var flow := _flow()
	var menu := (load(MAIN_MENU) as PackedScene).instantiate() as MainMenu
	menu.flow = flow
	_root().add_child(menu)
	var cont := menu.find_child("Continue", true, false) as Button
	var msg := menu.find_child("Message", true, false) as Label
	var err := ""
	if cont == null or msg == null:
		err = "menu has no Continue button or Message label"
	elif cont.visible:
		err = "Continue visible without a save"
	elif msg.visible:
		err = "message visible while empty"
	if err == "":
		_write(PATH + ".bak", '{"save_version": 1}')
		flow.last_message = "MSG"
		menu.refresh()
		if not cont.visible:
			err = "Continue hidden although a .bak exists"
		elif not msg.visible or msg.text != "MSG":
			err = "message not shown: '%s'" % msg.text
	menu.free()
	_free_flow(flow)
	return err


func test_pause_menu_toggles() -> String:
	var flow := _flow()
	var pm := (load(PAUSE_MENU) as PackedScene).instantiate() as PauseMenu
	pm.flow = flow
	_root().add_child(pm)
	var err := ""
	if pm.process_mode != Node.PROCESS_MODE_ALWAYS:
		err = "pause menu must process while paused"
	elif pm.visible:
		err = "pause menu visible at start"
	if err == "":
		pm.toggle()
		if not (pm.visible and _tree().paused and flow.clock.paused):
			err = "toggle did not open and pause"
		pm.toggle()
		if err == "" and (pm.visible or _tree().paused or flow.clock.paused):
			err = "second toggle did not close and resume"
	flow.set_paused(false)
	pm.free()
	_free_flow(flow)
	return err


func test_autoload_game_is_idle() -> String:
	var game := _root().get_node_or_null("Game")
	if game == null:
		return ""
	if not game is GameFlow:
		return "/root/Game is not a GameFlow"
	return "" if (game as GameFlow).world == null else "autoload Game loaded a world on its own"


# --- Этап 2: поле и инвентарь в игровом цикле ---

## Клетка поля для тестов и её культура.
const CELL := Vector2i(0, 3)
const CROP := "silverleaf"


## Временная замена узлов поля/колодца/хотбара (их сцены появятся позже).
class Receiver extends Node:
	var state: FarmState
	var inventory: Inventory
	var db: ContentDB


## Вскопать, посадить серебрянку (семя из ячейки 2), полить из лейки.
func _plant_watered(flow: GameFlow) -> String:
	if not flow.farm.till(CELL) or not flow.farm.plant(CELL, CROP):
		return "till/plant failed"
	if not flow.inventory.remove_from_slot(2, 1) or not flow.inventory.use_water():
		return "inventory spend failed"
	return "" if flow.farm.water(CELL) else "water failed"


## Пустая вскопанная клетка с усталой почвой (плодородие 30): каждая ночь даёт ровно +3,
## так что вторая ночь видна (36 вместо 33), даже когда у политой клетки рост уже упёрся.
const TIRED := Vector2i(1, 3)
const TIRED_FERTILITY := 30.0


func _add_tired_cell(flow: GameFlow) -> void:
	var d := flow.farm.to_save()
	(d["plots"] as Array).append({"x": TIRED.x, "z": TIRED.y, "fertility": TIRED_FERTILITY,
			"watered": false, "crop": "", "growth": 0.0})
	flow.farm.from_save(d)


## Ровно одна ночь для усталой клетки: в памяти и в файле сохранения. "" — всё верно.
func _check_tired_one_night(flow: GameFlow, save: Dictionary) -> String:
	var want := TIRED_FERTILITY + FarmState.RECOVERY
	var mem: float = flow.farm.plot(TIRED).get("fertility", -1.0)
	if mem != want:
		return "tired cell fertility %s, expected %s (one night)" % [mem, want]
	var saved := _saved_plot(save, TIRED)
	if saved.is_empty() or float(saved["fertility"]) != want:
		return "saved tired cell %s, expected fertility %s" % [saved, want]
	return ""


## Запись клетки cell в файле сохранения ({} если нет).
func _saved_plot(save: Dictionary, cell := CELL) -> Dictionary:
	var farm = save.get("farm")
	if not farm is Dictionary or not farm.get("plots") is Array:
		return {}
	for p in farm["plots"]:
		if p is Dictionary and int(p.get("x", -99)) == cell.x and int(p.get("z", -99)) == cell.y:
			return p
	return {}


func test_attach_hands_out_farm_and_inventory() -> String:
	var flow := _flow()
	var w := (load(FARM) as PackedScene).instantiate()
	var names := ["FarmField", "FarmInteractor", "Well", "Hotbar"]
	for n in names:
		# Настоящие узлы фермы заменяются приёмниками, записывающими всё, что им раздали.
		var real := w.find_child(n, true, false)
		if real != null:
			real.get_parent().remove_child(real)
			real.free()
		var r := Receiver.new()
		r.name = n
		w.add_child(r)
	_root().add_child(w)
	flow.attach_world(w)
	var err := ""
	var r: Dictionary = {}
	for n in names:
		r[n] = _node(w, n)
	if flow.db == null or flow.inventory == null or flow.farm == null:
		err = "db/inventory/farm not created"
	elif flow.inventory.db != flow.db or flow.farm.db != flow.db:
		err = "inventory/farm do not share flow.db"
	elif not flow.saves.is_registered("inventory") or not flow.saves.is_registered("farm"):
		err = "inventory/farm not registered"
	elif r["FarmField"].state != flow.farm or r["FarmInteractor"].state != flow.farm:
		err = "state not handed to FarmField/FarmInteractor"
	elif r["Well"].state != null or r["Hotbar"].state != null:
		err = "state handed to Well/Hotbar"
	elif r["FarmField"].inventory != null:
		err = "inventory handed to FarmField"
	elif r["FarmInteractor"].inventory != flow.inventory or r["Well"].inventory != flow.inventory \
			or r["Hotbar"].inventory != flow.inventory:
		err = "inventory not handed to FarmInteractor/Well/Hotbar"
	else:
		for n in names:
			if r[n].db != flow.db:
				err = "db not handed to %s" % n
	var db := flow.db
	var old_farm := flow.farm
	if err == "":
		flow.detach_world()
		if flow.inventory != null or flow.farm != null:
			err = "detach_world left inventory/farm"
		elif flow.saves.is_registered("inventory") or flow.saves.is_registered("farm"):
			err = "detach_world left inventory/farm registered"
	if err == "":
		flow.attach_world(w)
		if flow.db != db:
			err = "ContentDB loaded again on re-attach"
		elif flow.farm == old_farm or flow.farm == null:
			err = "farm not created anew on attach"
	_free_flow(flow)
	return err


## Файл этапа 1 (v1: time / player / camera) → стартовый набор, пустое поле,
## время и позиция героя из файла.
func test_v1_save_migrates_to_starter_farm() -> String:
	var flow := _flow()
	_write(PATH, JSON.stringify({
		"save_version": 1, "game_version": "0.1.0",
		"time": {"day": 4, "minutes": 300, "collapsed_last_night": false},
		"player": {"pos": [3.0, 0.0, 5.0], "yaw": 0.5},
		"camera": {"yaw_index": 1, "distance": 9.0},
	}, "\t"))
	flow.continue_game()
	var w := flow.world
	var err := ""
	if w == null:
		err = "farm not loaded: %s" % flow.last_message
	elif flow.inventory == null or flow.farm == null:
		err = "no inventory/farm"
	elif flow.inventory.to_save() != Inventory.starter_save():
		err = "inventory %s" % str(flow.inventory.to_save())
	elif not flow.farm.cells().is_empty():
		err = "field not empty: %s" % [flow.farm.cells()]
	elif flow.clock.day != 4 or flow.clock.minutes != 300:
		err = "time day=%d minutes=%d" % [flow.clock.day, flow.clock.minutes]
	elif not _near(_player(w).global_position, Vector3(3, 0, 5)):
		err = "player at %s" % _player(w).global_position
	_free_flow(flow)
	return err


func test_farm_and_inventory_roundtrip_through_flow() -> String:
	var flow := _flow()
	flow.new_game()
	var err := _plant_watered(flow)
	flow.inventory.select(4)
	var inv := flow.inventory.to_save()
	var plot := flow.farm.plot(CELL)
	await _tree().physics_frame
	flow.quit_to_menu()
	await _tree().process_frame
	await _tree().process_frame
	flow.continue_game()
	if err != "":
		pass
	elif flow.world == null or flow.farm == null:
		err = "continue_game did not load the farm: %s" % flow.last_message
	elif flow.inventory.to_save() != inv:
		err = "inventory %s, expected %s" % [flow.inventory.to_save(), inv]
	elif flow.farm.plot(CELL) != plot or flow.farm.cells() != [CELL]:
		err = "plot %s, expected %s" % [flow.farm.plot(CELL), plot]
	elif flow.inventory.count_of("seed_silverleaf") != 5 or flow.inventory.can_water != 9:
		err = "seeds %d, water %d" % [flow.inventory.count_of("seed_silverleaf"), flow.inventory.can_water]
	_free_flow(flow)
	return err


## Политая серебрянка: после сна рост ровно 1.0, усталая клетка +3 (одна ночь),
## и в автосохранении тоже.
func test_night_once_on_sleep() -> String:
	var flow := _flow()
	var w: Node = await _world(flow)
	var err := _plant_watered(flow)
	_add_tired_cell(flow)
	flow.clock.minutes = 800
	(_node(w, "Bed") as Bed).sleep_requested.emit()
	var save := _read_save()
	var saved := _saved_plot(save)
	var plot := flow.farm.plot(CELL)
	if err != "":
		pass
	elif flow.clock.day != 2:
		err = "did not sleep: day %d" % flow.clock.day
	elif plot["growth"] != 1.0 or plot["watered"]:
		err = "plot after sleep %s" % plot
	elif saved.is_empty() or float(saved["growth"]) != 1.0 or saved["watered"]:
		err = "saved plot %s" % saved
	else:
		err = _check_tired_one_night(flow, save)
	_free_flow(flow)
	return err


## То же через обморок в 02:00.
func test_night_once_on_collapse() -> String:
	var flow := _flow()
	await _world(flow)
	var err := _plant_watered(flow)
	_add_tired_cell(flow)
	flow.clock.advance(1200)
	var save := _read_save()
	var saved := _saved_plot(save)
	var plot := flow.farm.plot(CELL)
	if err != "":
		pass
	elif flow.clock.day != 2 or not flow.clock.collapsed_last_night:
		err = "did not collapse: day %d" % flow.clock.day
	elif plot["growth"] != 1.0 or plot["watered"]:
		err = "plot after collapse %s" % plot
	elif saved.is_empty() or float(saved["growth"]) != 1.0 or saved["watered"]:
		err = "saved plot %s" % saved
	else:
		err = _check_tired_one_night(flow, save)
	_free_flow(flow)
	return err


## Загрузка не считает ночь: рост как в файле, клетка всё ещё полита.
func test_load_does_not_grow() -> String:
	var flow := _flow()
	_write(PATH, JSON.stringify({
		"save_version": SaveService.SAVE_VERSION,
		"time": {"day": 3, "minutes": 100, "collapsed_last_night": false},
		"farm": {"plots": [{"x": CELL.x, "z": CELL.y, "fertility": 100.0, "watered": true,
				"crop": CROP, "growth": 1.0}]},
		"inventory": Inventory.starter_save(),
	}))
	flow.continue_game()
	var err := ""
	if flow.world == null or flow.farm == null:
		err = "farm not loaded: %s" % flow.last_message
	else:
		var plot := flow.farm.plot(CELL)
		if plot.is_empty() or plot["growth"] != 1.0 or not plot["watered"]:
			err = "plot after load %s" % plot
		elif flow.clock.day != 3:
			err = "day %d" % flow.clock.day
	_free_flow(flow)
	return err


## Поиграть → выйти в меню → новая игра: пустое поле, стартовый набор, лейка 10.
func test_new_game_resets_farm() -> String:
	var flow := _flow()
	flow.new_game()
	var err := _plant_watered(flow)
	flow.inventory.add("silverleaf", 7)
	await _tree().physics_frame
	flow.quit_to_menu()
	await _tree().process_frame
	await _tree().process_frame
	flow.new_game()
	var e := flow.save_now()
	var save := _read_save()
	if err != "":
		pass
	elif not flow.farm.cells().is_empty():
		err = "field kept: %s" % [flow.farm.cells()]
	elif flow.inventory.to_save() != Inventory.starter_save():
		err = "inventory %s" % str(flow.inventory.to_save())
	elif flow.inventory.can_water != 10:
		err = "can %d" % flow.inventory.can_water
	elif e != OK or save.get("farm") != {"plots": []}:
		err = "saved farm %s" % str(save.get("farm"))
	_free_flow(flow)
	return err


## Новая игра не запускает ночь: day_started не приходит, политая потом клетка не растёт
## и остаётся политой (а поле из старого сохранения не подхватывается).
func test_new_game_does_not_grow_on_start() -> String:
	var flow := _flow()
	_write(PATH, JSON.stringify({
		"save_version": SaveService.SAVE_VERSION,
		"time": {"day": 5, "minutes": 100},
		"farm": {"plots": [{"x": CELL.x, "z": CELL.y, "fertility": 100.0, "watered": true,
				"crop": CROP, "growth": 1.0}]},
	}))
	var days := [0]
	flow.clock.day_started.connect(func(_d: int) -> void: days[0] += 1)
	flow.new_game()
	var err := ""
	if days[0] != 0:
		err = "new_game emitted day_started %d times" % days[0]
	elif not flow.farm.cells().is_empty():
		err = "field from the old save: %s" % [flow.farm.cells()]
	else:
		err = _plant_watered(flow)
	if err == "":
		await _tree().physics_frame
		flow.save_now()
		var saved := _saved_plot(_read_save())
		var plot := flow.farm.plot(CELL)
		if plot["growth"] != 0.0 or not plot["watered"]:
			err = "plot %s" % plot
		elif saved.is_empty() or float(saved["growth"]) != 0.0 or not saved["watered"]:
			err = "saved plot %s" % saved
	_free_flow(flow)
	return err
