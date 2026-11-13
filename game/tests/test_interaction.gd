extends RefCounted

const KEYS := ["PROMPT_SLEEP", "PROMPT_TOO_EARLY", "DATE_FMT", "SEASON_0", "SEASON_1", "SEASON_2",
	"SEASON_3", "MENU_CONTINUE", "MENU_NEW_GAME", "MENU_QUIT", "MENU_RESUME", "MENU_TO_MAIN",
	"SAVE_TOO_NEW", "SAVE_CORRUPT", "SAVE_RESTORED_BAK"]

func _root() -> Node:
	return (Engine.get_main_loop() as SceneTree).root

## Герой-заглушка в начале координат, смотрит на +Z; зонд — его ребёнок.
func _rig() -> Array:
	var hero := Node3D.new()
	var probe := InteractionProbe.new()
	hero.add_child(probe)
	_root().add_child(hero)
	return [hero, probe]

func _interactable(pos: Vector3) -> Interactable:
	var a := Interactable.new()
	_root().add_child(a)
	a.global_position = pos
	return a

func test_probe_finds_in_front_within_radius() -> String:
	var rig := _rig()
	var probe: InteractionProbe = rig[1]
	var front := _interactable(Vector3(0, 0, 1.0))
	var back := _interactable(Vector3(0, 0, -1.0))
	var err := ""
	if probe.current() != front:
		err = "expected front interactable"
	front.global_position = Vector3(0, 0, 2.0)
	if err == "" and probe.current() != null:
		err = "interactable at 2.0 m must be out of range"
	front.free()
	back.free()
	rig[0].free()
	return err

func test_probe_picks_nearest() -> String:
	var rig := _rig()
	var probe: InteractionProbe = rig[1]
	var far := _interactable(Vector3(0, 0, 1.2))
	var near := _interactable(Vector3(0, 0, 0.6))
	var err := "" if probe.current() == near else "expected nearest interactable"
	far.free()
	near.free()
	rig[0].free()
	return err

func test_probe_respects_facing() -> String:
	var hero := PlayerController.new()
	var probe := InteractionProbe.new()
	hero.add_child(probe)
	_root().add_child(hero)
	hero.from_save({"pos": [0.0, 0.0, 0.0], "yaw": PI / 2.0})  # смотрит на +X
	var side := _interactable(Vector3(1.0, 0, 0))
	var z := _interactable(Vector3(0, 0, 1.0))
	var err := "" if probe.current() == side else "facing +X must pick the +X interactable"
	side.free()
	z.free()
	hero.free()
	return err

func _bed(minutes: int) -> Array:
	var clock := GameClock.new()
	clock.minutes = minutes
	var bed := Bed.new()
	bed.clock = clock
	_root().add_child(bed)
	return [clock, bed]

func test_bed_prompt_too_early() -> String:
	var r := _bed(300)
	var bed: Bed = r[1]
	var count := [0]
	bed.sleep_requested.connect(func(): count[0] += 1)
	var err := ""
	if bed.prompt(null) != TranslationServer.translate("PROMPT_TOO_EARLY"):
		err = "wrong prompt: " + bed.prompt(null)
	bed.interact(null)
	if err == "" and count[0] != 0:
		err = "sleep_requested emitted too early"
	bed.free()
	r[0].free()
	return err

func test_bed_prompt_sleep() -> String:
	var r := _bed(720)
	var bed: Bed = r[1]
	var count := [0]
	bed.sleep_requested.connect(func(): count[0] += 1)
	var err := ""
	if bed.prompt(null) != TranslationServer.translate("PROMPT_SLEEP"):
		err = "wrong prompt: " + bed.prompt(null)
	bed.interact(null)
	if err == "" and count[0] != 1:
		err = "sleep_requested count = %d, expected 1" % count[0]
	bed.free()
	r[0].free()
	return err

func test_bed_without_clock_idles() -> String:
	var bed := Bed.new()
	_root().add_child(bed)
	bed.interact(null)
	var p := bed.prompt(null)
	bed.free()
	return "" if p == TranslationServer.translate("PROMPT_TOO_EARLY") else "unexpected prompt without clock"

func test_format_time() -> String:
	var cases := {360: "06:00", 1439: "23:59", 0: "00:00", 120: "02:00"}
	for k in cases:
		if Hud.format_time(k) != cases[k]:
			return "%d -> %s, expected %s" % [k, Hud.format_time(k), cases[k]]
	return ""

func test_format_date_ru() -> String:
	var old := TranslationServer.get_locale()
	TranslationServer.set_locale("ru")
	var s := Hud.format_date(3, 1)
	TranslationServer.set_locale(old)
	return "" if s == "День 3, Лето" else "got: " + s

func test_strings_have_ru_and_en() -> String:
	var old := TranslationServer.get_locale()
	var err := ""
	for loc in ["ru", "en"]:
		TranslationServer.set_locale(loc)
		for k in KEYS:
			if TranslationServer.translate(k) == k:
				err = "%s not translated in %s" % [k, loc]
				break
		if err != "":
			break
	TranslationServer.set_locale(old)
	return err

func test_hud_idles_without_clock_and_probe() -> String:
	var hud := (load("res://scenes/ui/hud.tscn") as PackedScene).instantiate() as Hud
	_root().add_child(hud)
	await (Engine.get_main_loop() as SceneTree).process_frame
	hud.free()
	return ""

func test_hud_shows_time_and_prompt() -> String:
	var hud := (load("res://scenes/ui/hud.tscn") as PackedScene).instantiate() as Hud
	var clock := GameClock.new()
	clock.minutes = 720
	hud.clock = clock
	var rig := _rig()
	hud.probe = rig[1]
	var bed := Bed.new()
	bed.clock = clock
	_root().add_child(bed)
	bed.global_position = Vector3(0, 0, 1.0)
	_root().add_child(hud)
	hud.refresh()
	var err := ""
	if hud.time_text() != "18:00":
		err = "time: " + hud.time_text()
	elif not hud.prompt_visible():
		err = "prompt should be visible"
	bed.free()
	hud.refresh()
	if err == "" and hud.prompt_visible():
		err = "prompt should hide with nothing in range"
	hud.free()
	rig[0].free()
	clock.free()
	return err
