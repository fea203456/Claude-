extends SceneTree
## Съёмщик суток для tools/capture_daynight.sh.
##   tools/godot.sh display --script res://scenes/dev/daynight_capture.gd -- <out_dir>
##     грузит ферму через Game.new_game(), для minutes 0, 360, 780, 1020 ставит время на
##     замороженных часах, ждёт 30 кадров (туман стабилизируется) и пишет
##     day_0600.png, day_1200.png, day_1900.png, day_2300.png (1280×720) в out_dir.
##   ... -- --walk [minutes]
##     для Movie Maker: герой идёт скриптовым маршрутом от SpawnStart в дверь дома и внутрь
##     (через PlayerController.step), затем выходит сам. Часы стоят на [minutes] (по умолчанию 120).
## Игровое сохранение не трогается: GameFlow получает временный путь, а сам съёмщик
## ничего не сохраняет.

const SHOTS := [[0, "day_0600.png"], [360, "day_1200.png"], [780, "day_1900.png"], [1020, "day_2300.png"]]
const SETTLE_FRAMES := 30
const SIZE := Vector2i(1280, 720)
const TMP_SAVE := "user://capture_tmp/slot_1.json"

const FPS := 30.0             # = --fixed-fps в capture_daynight.sh
const WALK_MINUTES := 120     # 08:00 — утро, низкое тёплое солнце
const WALK_LEAD_FRAMES := 30  # первые кадры обрезает capture_daynight.sh (туман оседает)
const WALK_FRAMES := 300      # 10 с при 30 кадр/с
const WALK_IDLE_S := 1.0      # постоять перед стартом
const ARRIVE_M := 0.08
## Маршрут в мировых координатах XZ: от SpawnStart (0, −3.5) прямо в дверь (z = −6.6)
## и внутрь, к кровати (центр (−1.77, −10.82)) и через комнату. Внутри держимся z ≤ −9.3:
## ближе к двери камера 45° видит героя только поверх передней стены.
## ≈9.9 м ≈ 7.1 с при 1.40 м/с.
const ROUTE: Array[Vector2] = [Vector2(0.0, -8.4), Vector2(-0.9, -9.6), Vector2(1.3, -9.6),
	Vector2(0.2, -10.3)]

var _game: GameFlow
var _player: PlayerController
var _walk := false
var _frame := 0
var _route_i := 0


func _initialize() -> void:
	await process_frame  # root входит в дерево только после _initialize
	var args := OS.get_cmdline_user_args()
	_walk = args.has("--walk")
	_game = root.get_node_or_null("Game") as GameFlow
	if _game == null:
		_fail("autoload Game not found")
		return
	_game.save_path = TMP_SAVE
	_game.new_game()
	_game.clock.paused = true
	_player = _game.world.find_child("Player", true, false) as PlayerController
	if _player == null:
		_fail("Player not found in farm")
		return
	if _walk:
		_start_walk(args)
	else:
		await _shoot_stills(args)


func _shoot_stills(args: PackedStringArray) -> void:
	var out_dir := ""
	for a in args:
		if not a.begins_with("--"):
			out_dir = a
	if out_dir == "":
		_fail("usage: -- <out_dir>")
		return
	DirAccess.make_dir_recursive_absolute(out_dir)
	for shot in SHOTS:
		_game.clock.minutes = shot[0]
		for i in SETTLE_FRAMES:
			await process_frame
		await RenderingServer.frame_post_draw
		var img := root.get_texture().get_image()
		if img.get_size() != SIZE:
			push_warning("capture: viewport %s, resizing to %s" % [img.get_size(), SIZE])
			img.resize(SIZE.x, SIZE.y, Image.INTERPOLATE_LANCZOS)
		var path: String = out_dir.path_join(shot[1])
		var err := img.save_png(path)
		if err != OK:
			_fail("save %s: %s" % [path, error_string(err)])
			return
		print("capture: %s minutes=%d" % [path, shot[0]])
	quit(0)


func _start_walk(args: PackedStringArray) -> void:
	var m := WALK_MINUTES
	for a in args:
		if a.is_valid_int():
			m = int(a)
	_game.clock.minutes = m
	# Шагаем сами: стандартный _physics_process героя читает Input и затёр бы скорость.
	_player.set_physics_process(false)
	print("capture: walk minutes=%d frames=%d" % [m, WALK_LEAD_FRAMES + WALK_FRAMES])


func _physics_process(delta: float) -> bool:
	if not _walk or _player == null:
		return false
	var t := float(_frame - WALK_LEAD_FRAMES) / FPS
	_player.step(_route_input(t), false, 0.0, delta)
	return false


func _process(_delta: float) -> bool:
	if not _walk:
		return false
	_frame += 1
	if _frame >= WALK_LEAD_FRAMES + WALK_FRAMES:
		var p := _player.global_position
		print("capture: walk done at (%.2f, %.2f, %.2f)" % [p.x, p.y, p.z])
		quit(0)
	return false


## Камера yaw = 0: input (x, y) совпадает с мировыми (x, z).
func _route_input(t: float) -> Vector2:
	if t < WALK_IDLE_S or _route_i >= ROUTE.size():
		return Vector2.ZERO
	var p := Vector2(_player.global_position.x, _player.global_position.z)
	var to := ROUTE[_route_i] - p
	if to.length() < ARRIVE_M:
		_route_i += 1
		return _route_input(t)
	return to.normalized()


func _fail(msg: String) -> void:
	push_error("capture: " + msg)
	quit(1)
