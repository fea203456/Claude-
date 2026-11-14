class_name Hotbar
extends Control
## Панель инвентаря: 8 ячеек с иконкой и подписью, подсветка выбранной, выбор клавишами 1–8
## и D-pad влево/вправо, выбрасывание одной штуки выбранного урожая (discard_item: X / West).
## Инвентарь и базу раздаёт GameFlow после _ready, поэтому всё обновляется из сеттеров;
## без инвентаря панель пустая и ничего не делает.

const SLOT_SIZE := 56.0
const ICON_SIZE := 48.0
const GAP := 6.0
const PAD := 8.0
const COLOR_PANEL := Color(0.05, 0.04, 0.06, 0.72)
const COLOR_SLOT := Color(0.13, 0.11, 0.14, 0.85)
const COLOR_EDGE := Color(0.32, 0.28, 0.32, 1.0)
const COLOR_SELECTED_EDGE := Color(0.93, 0.89, 0.78, 1.0)
const COLOR_TEXT := Color(0.93, 0.89, 0.82, 1.0)

var inventory: Inventory:
	set(value):
		if inventory != null and inventory.changed.is_connected(_refresh):
			inventory.changed.disconnect(_refresh)
		inventory = value
		if inventory != null:
			inventory.changed.connect(_refresh)
		_refresh()
var db: ContentDB:
	set(value):
		db = value
		_refresh()

var _frames: Array[Panel] = []
var _icons: Array[TextureRect] = []
var _counts: Array[Label] = []
var _style_normal: StyleBoxFlat
var _style_selected: StyleBoxFlat


func _ready() -> void:
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_style_normal = _slot_style(COLOR_EDGE, 1)
	_style_selected = _slot_style(COLOR_SELECTED_EDGE, 3)
	var back := Panel.new()
	back.mouse_filter = Control.MOUSE_FILTER_IGNORE
	back.set_anchors_preset(Control.PRESET_FULL_RECT)
	var back_style := StyleBoxFlat.new()
	back_style.bg_color = COLOR_PANEL
	back_style.set_corner_radius_all(6)
	back.add_theme_stylebox_override("panel", back_style)
	add_child(back)
	for i in Inventory.SLOTS:
		var frame := Panel.new()
		frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
		frame.position = Vector2(PAD + i * (SLOT_SIZE + GAP), PAD)
		frame.size = Vector2(SLOT_SIZE, SLOT_SIZE)
		add_child(frame)
		var icon := TextureRect.new()
		icon.mouse_filter = Control.MOUSE_FILTER_IGNORE
		icon.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		icon.position = Vector2.ONE * ((SLOT_SIZE - ICON_SIZE) / 2.0)
		icon.size = Vector2.ONE * ICON_SIZE
		frame.add_child(icon)
		var count := Label.new()
		count.mouse_filter = Control.MOUSE_FILTER_IGNORE
		count.set_anchors_preset(Control.PRESET_FULL_RECT)
		count.offset_right = -4.0
		count.offset_bottom = -1.0
		count.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		count.vertical_alignment = VERTICAL_ALIGNMENT_BOTTOM
		count.add_theme_font_size_override("font_size", 14)
		count.add_theme_color_override("font_color", COLOR_TEXT)
		count.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.9))
		count.add_theme_constant_override("outline_size", 4)
		frame.add_child(count)
		_frames.append(frame)
		_icons.append(icon)
		_counts.append(count)
	_refresh()


func slot_icon(i: int) -> Texture2D:
	if inventory == null or db == null:
		return null
	var id := String(inventory.slot(i).get("id", ""))
	if id == "":
		return null
	var def := db.item(id)
	return def.icon if def != null else null


## Количество (если > 1), запас воды для лейки, «?» для неизвестного предмета.
func slot_text(i: int) -> String:
	if inventory == null:
		return ""
	var s := inventory.slot(i)
	if s.is_empty():
		return ""
	var def: ItemDef = db.item(String(s["id"])) if db != null else null
	if def == null:
		return "?"
	if def.tool == &"can":
		return str(inventory.can_water)
	var n := int(s.get("count", 1))
	return str(n) if n > 1 else ""


func is_slot_selected(i: int) -> bool:
	return inventory != null and inventory.selected == i


func _unhandled_input(event: InputEvent) -> void:
	if inventory == null or event is InputEventMouse:
		return
	if event.is_action_pressed(&"hotbar_prev"):
		inventory.select_prev()
	elif event.is_action_pressed(&"hotbar_next"):
		inventory.select_next()
	elif event.is_action_pressed(&"discard_item"):
		inventory.discard_selected_one()
	else:
		for i in Inventory.SLOTS:
			if event.is_action_pressed(StringName("hotbar_%d" % (i + 1))):
				inventory.select(i)
				get_viewport().set_input_as_handled()
				return
		return
	get_viewport().set_input_as_handled()


func _slot_style(edge: Color, width: int) -> StyleBoxFlat:
	var st := StyleBoxFlat.new()
	st.bg_color = COLOR_SLOT
	st.border_color = edge
	st.set_border_width_all(width)
	st.set_corner_radius_all(4)
	return st


func _refresh() -> void:
	for i in _frames.size():
		_frames[i].add_theme_stylebox_override(
			"panel", _style_selected if is_slot_selected(i) else _style_normal)
		_icons[i].texture = slot_icon(i)
		_counts[i].text = slot_text(i)
