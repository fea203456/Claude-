extends SceneTree
## Съёмщик фермы для tools/capture_farm.sh.
##   tools/godot.sh display --script res://scenes/dev/farm_capture.gd -- <out_dir> [--pose x,z,yaw_index,distance]
##     новая игра через Game.new_game(), поле-витрина (FIELD_ROWS / SWATCHES: 3 культуры × 4 стадии,
##     земля 100 / 50 / 0%, половина клеток полита), герой у поля; часы стоят на 12:00 и 23:00,
##     после SETTLE_FRAMES кадров пишутся farm_field_day.png и farm_field_night.png (1280×720).
##     --pose — другой ракурс (подбор кадра, проверка рамки на разных цветах земли).
##   ... -- --loop
##     для Movie Maker: новая игра, герой бежит к полю, вскапывает, сажает и поливает две клетки,
##     спит, ещё два дня поливает и спит, утром дня 4 собирает урожай; затем выходит сам.
##     Всё делается вводом, как у игрока: ходьба — действиями move_*, ячейки — hotbar_N,
##     кнопка — interact (Input.action_press / Input.parse_input_event). Скриптом только
##     переводится время (вечер перед сном) и монтажно, в затемнении, переставляется герой
##     между полем и кроватью (вместо долгой ходьбы).
## Игровое сохранение не трогается: GameFlow получает временный путь (сон пишет туда).

const SIZE := Vector2i(1280, 720)
const TMP_SAVE := "user://capture_tmp/farm_slot.json"
const SETTLE_FRAMES := 60
const STILLS := [[360, "farm_field_day"], [1020, "farm_field_night"]]
const CROPS := ["silverleaf", "boneroot", "nightbloom"]
## Ряды поля-витрины (z): плодородие и полив; в каждом — 12 клеток x −6…5:
## культура (x + 6) / 4, стадия (x + 6) % 4.
const FIELD_ROWS := [[2, 100.0, false], [3, 100.0, true], [4, 50.0, false], [5, 50.0, true],
	[6, 0.0, false], [7, 0.0, true]]
## Ряд пустой земли z = 8: пары столбцов 100 / 50 / 0%, сухая и политая.
const SWATCH_Z := 8
const SWATCHES := [[100.0, false], [100.0, true], [50.0, false], [50.0, true], [0.0, false], [0.0, true]]
## Герой (x, z), CameraRig.yaw_index, distance: на пустом ряду z = 9 лицом к полю (на −Z),
## рамка подсветки — на клетке (0, 8).
const SHOT_POSE := [0.5, 9.4, 0, 8.0]

const FPS := 30.0                 # = --fixed-fps в capture_farm.sh
const LEAD_FRAMES := 30           # первые кадры обрезает capture_farm.sh (туман оседает)
const START_MINUTES := 90         # 07:30
const EVENING_MINUTES := 840      # 20:00 — у кровати
const ARRIVE_M := 0.05
const STEP_TIMEOUT_S := 8.0
## Клетки, которые обрабатывает герой. Стоит он западнее клетки лицом на +X: камера (yaw = 0,
## с юга) видит его в профиль, а клетку — сбоку от него, не за ним и не под подсказкой.
const WORK_CELLS: Array[Vector2i] = [Vector2i(0, 3), Vector2i(0, 4)]
## Место героя — центр клетки минус STAND_DX по X; подход — ещё APPROACH_DX западнее, затем
## шаг на восток (герой поворачивается к клетке).
const STAND_DX := 1.0
const APPROACH_DX := 0.3
const FADE_S := 0.25

var _game: GameFlow
var _player: PlayerController
var _fade: ColorRect
var _frame := 0


func _initialize() -> void:
	await process_frame  # root входит в дерево только после _initialize
	var args := OS.get_cmdline_user_args()
	_game = root.get_node_or_null("Game") as GameFlow
	if _game == null:
		_fail("autoload Game not found")
		return
	_game.save_path = TMP_SAVE
	_game.new_game()
	_player = _game.world.find_child("Player", true, false) as PlayerController
	if _player == null:
		_fail("Player not found in farm")
		return
	if args.has("--loop"):
		await _run_loop()
	else:
		await _shoot_stills(args)


func _process(_delta: float) -> bool:
	_frame += 1
	return false


# --------------------------------------------------------------------------- кадры

func _shoot_stills(args: PackedStringArray) -> void:
	var out_dir := ""
	for i in args.size():
		if not args[i].begins_with("--") and (i == 0 or args[i - 1] != "--pose"):
			out_dir = args[i]
	if out_dir == "":
		_fail("usage: -- <out_dir> [--pose x,z,yaw_index,distance]")
		return
	DirAccess.make_dir_recursive_absolute(out_dir)
	_game.clock.paused = true
	_game.farm.from_save({"plots": _showcase_plots()})
	_game.inventory.select(2)  # семена серебрянки в руке: подпись «6» и подсветка ячейки 3
	var pose: Array = SHOT_POSE.duplicate()
	var i_pose := args.find("--pose")
	if i_pose >= 0 and i_pose + 1 < args.size():
		var parts := args[i_pose + 1].split(",")
		for k in mini(parts.size(), 4):
			pose[k] = float(parts[k])
	_place(pose)
	for shot in STILLS:
		_game.clock.minutes = shot[0]
		for i in SETTLE_FRAMES:
			await process_frame
		await RenderingServer.frame_post_draw
		var img := root.get_texture().get_image()
		if img.get_size() != SIZE:
			push_warning("capture: viewport %s, resizing to %s" % [img.get_size(), SIZE])
			img.resize(SIZE.x, SIZE.y, Image.INTERPOLATE_LANCZOS)
		var path: String = out_dir.path_join(shot[1] + ".png")
		var err := img.save_png(path)
		if err != OK:
			_fail("save %s: %s" % [path, error_string(err)])
			return
		print("capture: %s minutes=%d" % [path, shot[0]])
	quit(0)


## Записи поля-витрины в формате сохранения FarmState.
func _showcase_plots() -> Array:
	var plots: Array = []
	var db := _game.db
	for row in FIELD_ROWS:
		for x in range(-6, 6):
			var crop: String = CROPS[(x + 6) / 4]
			var stage := (x + 6) % 4
			var days := db.crop(crop).stage_days
			var growth := 0.0
			for s in stage:
				growth += days[s]
			plots.append({"x": x, "z": row[0], "fertility": row[1], "watered": row[2],
					"crop": crop, "growth": growth})
	for i in SWATCHES.size():
		for dx in 2:
			plots.append({"x": -6 + 2 * i + dx, "z": SWATCH_Z, "fertility": SWATCHES[i][0],
					"watered": SWATCHES[i][1], "crop": "", "growth": 0.0})
	return plots


## Ставит героя в (x, z) лицом на −Z (к полю), камеру — на yaw_index и distance.
func _place(pose: Array) -> void:
	_player.velocity = Vector3.ZERO
	_player.from_save({"pos": [pose[0], _player.global_position.y, pose[1]], "yaw": PI})
	var rig := _game.world.find_child("CameraRig", true, false) as CameraRig
	if rig != null:
		rig.from_save({"yaw_index": int(pose[2]), "distance": pose[3]})


# --------------------------------------------------------------------------- видео

func _run_loop() -> void:
	_game.clock.minutes = START_MINUTES
	_make_fade()
	print("capture: loop start")
	await _frames(LEAD_FRAMES)
	await _seconds(0.6)
	# к полю бегом: от SpawnStart (0, −3.5) на юг, мимо будущих грядок
	Input.action_press("run")
	await _walk_to(_approach(WORK_CELLS[0]))
	Input.action_release("run")
	var back := WORK_CELLS.duplicate()
	back.reverse()
	# вскопать (мотыга, hotbar_1) → посадить серебрянку (hotbar_3) на обратном ходу → полить (hotbar_2)
	for step in [["hotbar_1", WORK_CELLS], ["hotbar_3", back], ["hotbar_2", WORK_CELLS]]:
		for cell in step[1]:
			await _stand_at(cell)
			if cell == step[1][0]:
				await _tap(step[0])
			await _act()
	await _seconds(0.4)
	await _sleep_in_bed()
	# дни 2 и 3: утром полить обе клетки (лейка уже в руке), вечером спать
	for day in 2:
		await _cut_to_field()
		for cell in WORK_CELLS:
			await _stand_at(cell)
			await _act()
		await _sleep_in_bed()
	# утро дня 4: спелая серебрянка — собрать
	await _cut_to_field()
	await _seconds(0.5)
	for cell in WORK_CELLS:
		await _stand_at(cell)
		await _act(0.8)
	await _seconds(1.5)
	var p := _player.global_position
	print("capture: loop done at frame %d, day %d, silverleaf %d, seeds %d, hero (%.2f, %.2f)" % [
			_frame, _game.clock.day, _game.inventory.count_of("silverleaf"),
			_game.inventory.count_of("seed_silverleaf"), p.x, p.z])
	quit(0)


## Встать перед клеткой: подойти с запада, затем шаг на восток, чтобы герой смотрел на клетку.
func _stand_at(cell: Vector2i) -> void:
	await _walk_to(_approach(cell))
	await _walk_to(_approach(cell) + Vector2(APPROACH_DX, 0.0))
	var fi := _game.world.find_child("FarmInteractor", true, false) as FarmInteractor
	if fi.target_cell() != cell:
		push_warning("capture: hero targets %s, expected %s" % [fi.target_cell(), cell])


## Точка подхода к клетке (XZ).
func _approach(cell: Vector2i) -> Vector2:
	return Vector2(cell.x + 0.5 - STAND_DX - APPROACH_DX, cell.y + 0.5)


## Показать подсказку, нажать E, дать увидеть результат.
func _act(after := 0.4) -> void:
	await _seconds(0.4)
	await _tap("interact")
	await _seconds(after)


## Затемнение → вечер у кровати → E (сон: GameFlow переводит день и ставит героя к кровати)
## → затемнение.
func _sleep_in_bed() -> void:
	await _fade_to(1.0)
	_game.clock.minutes = EVENING_MINUTES
	var bed := _game.world.find_child("Bed", true, false) as Node3D
	var spawn := (_game.world.find_child("BedSpawn", true, false) as Node3D).global_position
	var to := bed.global_position - spawn
	_teleport(Vector2(spawn.x, spawn.z), atan2(to.x, to.z))
	await _frames(6)
	await _fade_to(0.0)
	await _seconds(0.7)
	var day := _game.clock.day
	await _tap("interact")
	if _game.clock.day != day + 1:
		push_warning("capture: sleep did not happen on day %d" % day)
	await _seconds(0.3)


## Затемнение → утро, герой у поля → проявление.
func _cut_to_field() -> void:
	await _fade_to(1.0)
	_game.clock.minutes = START_MINUTES
	_teleport(_approach(WORK_CELLS[0]), PI / 2.0)
	await _frames(8)
	await _fade_to(0.0)


func _teleport(p: Vector2, yaw: float) -> void:
	_player.velocity = Vector3.ZERO
	_player.from_save({"pos": [p.x, _player.global_position.y, p.y], "yaw": yaw})


## Идти к точке XZ, держа move_* (камера yaw = 0: ввод (x, y) = мировые (x, z)).
## Шаг за физический тик ≤ 0.04 м (бегом) < ARRIVE_M: герой останавливается в пределах ARRIVE_M.
func _walk_to(target: Vector2) -> void:
	var left := int(STEP_TIMEOUT_S * Engine.physics_ticks_per_second)  # шаг цикла — физический тик
	while left > 0:
		left -= 1
		var p := Vector2(_player.global_position.x, _player.global_position.z)
		var to := target - p
		if to.length() < ARRIVE_M:
			break
		_steer(to.normalized())  # полный ход: слабее мёртвой зоны (0.5) ввод обнуляется
		await physics_frame
	if left <= 0:
		push_warning("capture: did not reach %s, hero at %s" % [target, _player.global_position])
	_steer(Vector2.ZERO)
	await physics_frame


func _steer(v: Vector2) -> void:
	for a in [["move_right", v.x], ["move_left", -v.x], ["move_back", v.y], ["move_forward", -v.y]]:
		if a[1] > 0.0:
			Input.action_press(a[0], a[1])
		else:
			Input.action_release(a[0])


## Нажать и отпустить действие через общий конвейер ввода.
func _tap(action: String) -> void:
	for pressed in [true, false]:
		var ev := InputEventAction.new()
		ev.action = StringName(action)
		ev.pressed = pressed
		Input.parse_input_event(ev)
		await process_frame


func _make_fade() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 100
	_fade = ColorRect.new()
	_fade.color = Color(0.0, 0.0, 0.0, 0.0)
	_fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_fade.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(_fade)
	root.add_child(layer)


func _fade_to(alpha: float) -> void:
	var start := _fade.color.a
	var n := maxi(1, int(FADE_S * FPS))
	for i in n:
		_fade.color.a = lerpf(start, alpha, float(i + 1) / n)
		await process_frame


func _seconds(s: float) -> void:
	await _frames(int(round(s * FPS)))


func _frames(n: int) -> void:
	for i in n:
		await process_frame


func _fail(msg: String) -> void:
	push_error("capture: " + msg)
	quit(1)
