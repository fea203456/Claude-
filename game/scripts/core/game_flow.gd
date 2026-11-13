class_name GameFlow
extends Node
## Игровой цикл: меню → ферма → сон/обморок (автосохранение) → выход в меню → продолжение.
## Autoload `Game`. Сам по себе ничего не грузит и не сохраняет: всё — по вызовам из меню.
## Тесты создают свой GameFlow со своими часами, сохранениями и путём и зовут attach_world.

const FARM_SCENE := "res://scenes/world/farm_test.tscn"
const MENU_SCENE := "res://scenes/ui/main_menu.tscn"

var clock: GameClock      ## пусто → /root/Clock
var saves: SaveService    ## пусто → /root/Saves
var save_path := SaveService.SLOT_PATH
var last_message: String = ""
## Подключённый мир (ферма) или null, пока мы в меню.
var world: Node

var _hud: Hud
var _player: PlayerController
var _camera: CameraRig
var _bed: Bed
var _spawn_start: Node3D
var _bed_spawn: Node3D
var _collapse_pending := false


func _ready() -> void:
	TranslationServer.set_locale("ru")  # до появления меню настроек
	_resolve()
	if world == null and clock != null:
		clock.paused = true  # в меню время стоит


func _tree() -> SceneTree:
	return Engine.get_main_loop() as SceneTree


func _resolve() -> void:
	var root := _tree().root
	if clock == null:
		clock = root.get_node_or_null("Clock") as GameClock
	if saves == null:
		saves = root.get_node_or_null("Saves") as SaveService


func has_save() -> bool:
	_resolve()
	return saves != null and saves.has_save(save_path)


func new_game() -> void:
	_resolve()
	last_message = ""
	saves.forget_loaded()
	var w := _instance_world()
	attach_world(w)
	_reset_world_to_new_game()
	_make_current(w)


func continue_game() -> void:
	_resolve()
	last_message = ""
	var w := _instance_world()
	attach_world(w)
	match saves.load_game(save_path):
		SaveService.LoadResult.TOO_NEW:
			detach_world()
			w.free()
			last_message = tr("SAVE_TOO_NEW")
			return
		SaveService.LoadResult.CORRUPT:
			_reset_world_to_new_game()
			post_message(tr("SAVE_CORRUPT"))
		SaveService.LoadResult.NO_FILE:
			_reset_world_to_new_game()
		SaveService.LoadResult.RESTORED_FROM_BAK:
			post_message(tr("SAVE_RESTORED_BAK"))
	set_paused(false)
	_make_current(w)


## Находит в мире узлы по именам, раздаёт им часы/зонд/камеру, регистрирует сохраняемых
## и подписывается на сон и обморок. Сцену не меняет.
func attach_world(w: Node) -> void:
	_resolve()
	detach_world()
	world = w
	_player = w.find_child("Player", true, false) as PlayerController
	_camera = w.find_child("CameraRig", true, false) as CameraRig
	_bed = w.find_child("Bed", true, false) as Bed
	_spawn_start = w.find_child("SpawnStart", true, false) as Node3D
	_bed_spawn = w.find_child("BedSpawn", true, false) as Node3D
	for n in ["DayNightLighting", "Bed", "Hud"]:
		var node := w.find_child(n, true, false)
		if node != null:
			node.set("clock", clock)
	_hud = w.find_child("Hud", true, false) as Hud
	if _hud != null and _player != null:
		_hud.probe = _player.find_child("InteractionProbe", true, false) as InteractionProbe
	if _player != null and _camera != null:
		_player.camera_yaw_provider = _camera.yaw
	var pause_menu := w.find_child("PauseMenu", true, false) as PauseMenu
	if pause_menu != null:
		pause_menu.flow = self
	saves.register("time", clock)
	if _player != null:
		saves.register("player", _player)
	if _camera != null:
		saves.register("camera", _camera)
	if _bed != null:
		_bed.sleep_requested.connect(_on_sleep_requested)
	clock.collapsed.connect(_on_collapsed)
	clock.day_started.connect(_on_day_started)


func detach_world() -> void:
	if clock != null:
		if clock.collapsed.is_connected(_on_collapsed):
			clock.collapsed.disconnect(_on_collapsed)
		if clock.day_started.is_connected(_on_day_started):
			clock.day_started.disconnect(_on_day_started)
	if is_instance_valid(_bed) and _bed.sleep_requested.is_connected(_on_sleep_requested):
		_bed.sleep_requested.disconnect(_on_sleep_requested)
	# Герой и камера уходят вместе с миром; часы — autoload, их раздел остаётся.
	if saves != null:
		saves.unregister("player")
		saves.unregister("camera")
	world = null
	_hud = null
	_player = null
	_camera = null
	_bed = null
	_spawn_start = null
	_bed_spawn = null
	_collapse_pending = false


## Сохраняет, только если мир подключён (в меню сохранять нечего).
func save_now() -> Error:
	if not is_instance_valid(world) or saves == null:
		return ERR_UNCONFIGURED
	return saves.save_game(save_path)


## Сохранение из игрового цикла (сон, обморок, выход): ошибку не теряем — warning в лог
## (не push_error: это не сбой движка) и сообщение игроку. Без мира — ничего.
func _autosave() -> void:
	if not is_instance_valid(world):
		return
	var e := save_now()
	if e != OK:
		push_warning("GameFlow: save to %s failed: %s (%d)" % [save_path, error_string(e), e])
		post_message(tr("SAVE_FAILED"))


## last_message; если мир подключён — ещё и в HUD на несколько секунд.
func post_message(text: String) -> void:
	last_message = text
	if is_instance_valid(_hud):
		_hud.show_message(text)


func set_paused(p: bool) -> void:
	_tree().paused = p
	if clock != null:
		clock.paused = p


## После неудачного сохранения всё равно уходим в меню: оно покажет last_message.
func quit_to_menu() -> void:
	_autosave()
	set_paused(false)
	detach_world()
	if clock != null:
		clock.paused = true
	_tree().change_scene_to_file(MENU_SCENE)


func _notification(what: int) -> void:
	# Выход окном: auto_accept_quit закроет игру сам, здесь только сохранение.
	if what == NOTIFICATION_WM_CLOSE_REQUEST:
		_autosave()


func _instance_world() -> Node:
	var w := (load(FARM_SCENE) as PackedScene).instantiate()
	_tree().root.add_child(w)
	return w


func _make_current(w: Node) -> void:
	var tree := _tree()
	var old := tree.current_scene
	tree.current_scene = w
	if old != null and old != w:
		old.queue_free()


func _reset_world_to_new_game() -> void:
	clock.new_game()
	set_paused(false)
	if _player != null and _spawn_start != null:
		_player.velocity = Vector3.ZERO
		var p := _spawn_start.global_position
		_player.from_save({"pos": [p.x, p.y, p.z], "yaw": _spawn_start.global_rotation.y})
	if _camera != null:
		_camera.from_save({})


func _move_to_bed() -> void:
	if _player == null or _bed_spawn == null:
		return
	_player.velocity = Vector3.ZERO
	_player.global_position = _bed_spawn.global_position


func _on_sleep_requested() -> void:
	if clock.sleep():
		_move_to_bed()
		_autosave()


## collapsed приходит до перехода на новый день, поэтому само действие — в day_started,
## чтобы в сохранение попал уже следующий день.
func _on_collapsed() -> void:
	_collapse_pending = true


func _on_day_started(_day: int) -> void:
	if not _collapse_pending:
		return
	_collapse_pending = false
	_move_to_bed()
	_autosave()
