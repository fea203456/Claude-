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
