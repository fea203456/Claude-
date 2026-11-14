extends RefCounted
## Панель инвентаря: иконки, подписи, подсветка, ввод hotbar_*, пауза, раскладка в HUD.

const HOTBAR := "res://scenes/ui/hotbar.tscn"
const HUD := "res://scenes/ui/hud.tscn"
const FARM := "res://scenes/world/farm_test.tscn"

var _db: ContentDB


func _tree() -> SceneTree:
	return Engine.get_main_loop() as SceneTree


func _content() -> ContentDB:
	if _db == null:
		_db = ContentDB.load_default()
	return _db


func _inv() -> Inventory:
	var inv := Inventory.new()
	inv.db = _content()
	inv.reset_to_starter()
	return inv


## Панель с розданными инвентарём и базой, уже в дереве.
func _bar(inv: Inventory) -> Hotbar:
	var bar := (load(HOTBAR) as PackedScene).instantiate() as Hotbar
	_tree().root.add_child(bar)
	bar.db = _content()
	bar.inventory = inv
	return bar


func _action(name: String) -> InputEventAction:
	var ev := InputEventAction.new()
	ev.action = name
	ev.pressed = true
	return ev


func test_input_map_has_hotbar_actions() -> String:
	for i in 8:
		var a := "hotbar_%d" % (i + 1)
		if not InputMap.has_action(a):
			return "action missing: " + a
		var ok := false
		for e in InputMap.action_get_events(a):
			if e is InputEventKey and (e as InputEventKey).physical_keycode == KEY_1 + i:
				ok = true
		if not ok:
			return a + ": no physical key %d" % (i + 1)
	for pair in [["hotbar_prev", JOY_BUTTON_DPAD_LEFT], ["hotbar_next", JOY_BUTTON_DPAD_RIGHT]]:
		if not InputMap.has_action(pair[0]):
			return "action missing: " + pair[0]
		var ok := false
		for e in InputMap.action_get_events(pair[0]):
			if e is InputEventJoypadButton and (e as InputEventJoypadButton).button_index == pair[1]:
				ok = true
		if not ok:
			return "%s: no d-pad button" % pair[0]
	for pair in [["camera_zoom_in", JOY_BUTTON_DPAD_UP], ["camera_zoom_out", JOY_BUTTON_DPAD_DOWN]]:
		var ok := false
		for e in InputMap.action_get_events(pair[0]):
			if e is InputEventJoypadButton and (e as InputEventJoypadButton).button_index == pair[1]:
				ok = true
		if not ok:
			return "%s lost its d-pad button" % pair[0]
	return ""


func test_shows_starter_kit() -> String:
	var bar := _bar(_inv())
	var texts := ["", "10", "6", "6", "6"]
	var err := ""
	for i in 5:
		if bar.slot_icon(i) == null:
			err = "slot %d has no icon" % i
		elif bar.slot_text(i) != texts[i]:
			err = "slot %d text '%s', expected '%s'" % [i, bar.slot_text(i), texts[i]]
		if err != "":
			break
	if err == "":
		for i in range(5, 8):
			if bar.slot_icon(i) != null or bar.slot_text(i) != "":
				err = "slot %d must be empty" % i
	bar.free()
	return err


func test_updates_on_change() -> String:
	var inv := _inv()
	var bar := _bar(inv)
	inv.remove_from_slot(2, 1)
	var a := bar.slot_text(2)
	inv.use_water()
	var b := bar.slot_text(1)
	bar.free()
	if a != "5":
		return "seed slot text '%s', expected '5'" % a
	if b != "9":
		return "can slot text '%s', expected '9'" % b
	return ""


func test_can_shows_zero() -> String:
	var inv := _inv()
	inv.can_water = 0
	var bar := _bar(inv)
	var t := bar.slot_text(1)
	bar.free()
	return "" if t == "0" else "can text '%s', expected '0'" % t


func test_selection_highlight_follows_inventory() -> String:
	var inv := _inv()
	var bar := _bar(inv)
	var err := ""
	if not bar.is_slot_selected(0) or bar.is_slot_selected(1):
		err = "initially only slot 0 must be selected"
	inv.select(3)
	if err == "" and (bar.is_slot_selected(0) or not bar.is_slot_selected(3)):
		err = "selection did not follow inventory to slot 3"
	bar.free()
	return err


func test_hotbar_action_selects_slot() -> String:
	var inv := _inv()
	var bar := _bar(inv)
	bar._unhandled_input(_action("hotbar_3"))
	var got := inv.selected
	bar.free()
	return "" if got == 2 else "selected %d after hotbar_3, expected 2" % got


func test_prev_next_wrap() -> String:
	var inv := _inv()
	var bar := _bar(inv)
	bar._unhandled_input(_action("hotbar_prev"))
	var a := inv.selected
	bar._unhandled_input(_action("hotbar_next"))
	var b := inv.selected
	bar.free()
	if a != 7:
		return "prev from 0 gave %d, expected 7" % a
	return "" if b == 0 else "next from 7 gave %d, expected 0" % b


func test_unknown_item_shows_question() -> String:
	var inv := _inv()
	inv.from_save({"slots": [{"id": "mystery", "count": 3}], "can_water": 10, "selected": 0})
	var bar := _bar(inv)
	var t := bar.slot_text(0)
	var icon := bar.slot_icon(0)
	bar.free()
	if t != "?":
		return "unknown slot text '%s', expected '?'" % t
	return "" if icon == null else "unknown slot must have no icon"


func test_tolerates_missing_inventory() -> String:
	var bar := (load(HOTBAR) as PackedScene).instantiate() as Hotbar
	_tree().root.add_child(bar)
	var ok := bar.slot_text(0) == "" and bar.slot_icon(0) == null and not bar.is_slot_selected(0)
	bar._unhandled_input(_action("hotbar_2"))
	bar.free()
	return "" if ok else "empty hotbar must show nothing"


func test_pause_blocks_hotbar_and_actions() -> String:
	var w := (load(FARM) as PackedScene).instantiate()
	_tree().root.add_child(w)
	await _tree().process_frame
	var nodes: Array = [w.find_child("Hotbar", true, false),
		w.find_child("InteractionProbe", true, false), w.find_child("FarmInteractor", true, false)]
	var err := ""
	for n in nodes:
		if n == null:
			err = "node missing in farm scene"
	if err == "":
		_tree().paused = true
		for n in nodes:
			if (n as Node).can_process():
				err = "%s processes while paused" % (n as Node).name
		_tree().paused = false
	_tree().paused = false
	w.free()
	return err


func test_hud_scene_has_hotbar_and_prompt_not_overlapping() -> String:
	var hud := (load(HUD) as PackedScene).instantiate() as CanvasLayer
	hud.set("use_global_clock", false)
	# Раскладка проверяется на 1280×720, а не на размере окна тестового запуска.
	var port := SubViewport.new()
	port.size = Vector2i(1280, 720)
	_tree().root.add_child(port)
	port.add_child(hud)
	await _tree().process_frame
	var bar := hud.find_child("Hotbar", true, false) as Control
	var prompt := hud.find_child("PromptLabel", true, false) as Label
	var err := ""
	if bar == null or prompt == null:
		err = "Hotbar or PromptLabel missing in hud.tscn"
	else:
		prompt.text = "E\nx"
		prompt.visible = true
		await _tree().process_frame
		var view := Rect2(Vector2.ZERO, Vector2(1280, 720))
		var rb := bar.get_global_rect()
		var rp := prompt.get_global_rect()
		if rb.intersects(rp):
			err = "hotbar %s overlaps prompt %s" % [rb, rp]
		elif not view.encloses(rb):
			err = "hotbar %s outside the screen" % rb
		elif absf(rb.get_center().x - 640.0) > 1.0:
			err = "hotbar is not horizontally centred: %s" % rb
		elif rb.position.y < 360.0 + 60.0:
			err = "hotbar reaches the hero zone: %s" % rb
	port.free()
	return err
