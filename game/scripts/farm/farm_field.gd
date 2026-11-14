class_name FarmField
extends Node3D
## Вид поля: плитка на каждой вскопанной клетке (цвет — по плодородию и поливу), модель текущей
## стадии растения, метка «?» у неизвестной культуры и рамка подсветки клетки.
## Перестраивается по state.changed, меняя только изменившиеся клетки. Без state — пусто.

const SOIL_TILE := preload("res://assets/farm/soil_tile/soil_tile.glb")
const CELL_FRAME := preload("res://assets/farm/cell_frame/cell_frame.glb")

## Верх плитки в центре клетки: сюда ставятся растения (их начало координат — у земли).
const TILE_TOP := 0.09
## Плитка высотой до ~0.107 м: рамка над вскопанной клеткой — выше неё, над землёй — чуть выше нуля.
const FRAME_Y_TILLED := 0.115
const FRAME_Y_GROUND := 0.006
const MARKER_Y := 0.45
## Сухая почва: 100% — тёмно-бурая, 0% — пепельно-серая (sRGB). Политая — тот же цвет × WET.
const SOIL_RICH := Color(0.34, 0.21, 0.12)
const SOIL_SPENT := Color(0.34, 0.33, 0.32)
const WET := 0.6

var state: FarmState: set = set_state
var db: ContentDB: set = set_db

## Vector2i -> {"node": Node3D, "tile": MeshInstance3D, "soil": String, "crop_key": String,
## "crop": Node3D (модель стадии или null), "marker": Label3D или null}.
var _plots: Dictionary = {}
## "плодородие:полив" -> материал плитки (общий для одинаковых клеток).
var _materials: Dictionary = {}
var _tile_material: Material
var _plots_root: Node3D
var _frame: Node3D
var _highlight: Variant = null


## Клетка, в которую попадает точка: floor по x и z (x = −0.5 → −1).
static func cell_at(p: Vector3) -> Vector2i:
	return Vector2i(floori(p.x), floori(p.z))


static func cell_center(cell: Vector2i) -> Vector3:
	return Vector3(cell.x + 0.5, 0.0, cell.y + 0.5)


static func soil_color(fertility: float, watered: bool) -> Color:
	var c := SOIL_SPENT.lerp(SOIL_RICH, clampf(fertility / FarmState.FERTILITY_MAX, 0.0, 1.0))
	if watered:
		c = Color(c.r * WET, c.g * WET, c.b * WET, 1.0)
	return c


func set_state(s: FarmState) -> void:
	if state == s:
		return
	if state != null and state.changed.is_connected(_rebuild):
		state.changed.disconnect(_rebuild)
	state = s
	if state != null:
		state.changed.connect(_rebuild)
	_rebuild()


func set_db(d: ContentDB) -> void:
	db = d
	_rebuild()


func plot_count() -> int:
	return _plots.size()


## Узел клетки (плитка и всё на ней) или null, если клетка не вскопана.
func plot_node(cell: Vector2i) -> Node3D:
	return _plots[cell]["node"] if _plots.has(cell) else null


## Модель текущей стадии растения или null (нет растения или культура неизвестна).
func crop_node(cell: Vector2i) -> Node3D:
	return _plots[cell]["crop"] if _plots.has(cell) else null


func set_highlight(cell: Vector2i, on: bool) -> void:
	_ensure_nodes()
	_highlight = cell if on else null
	_place_frame()


## Подсвеченная клетка (Vector2i) или null, если рамка скрыта.
func highlight_cell() -> Variant:
	return _highlight


func _ensure_nodes() -> void:
	if _plots_root != null:
		return
	_plots_root = Node3D.new()
	_plots_root.name = "Plots"
	add_child(_plots_root)
	_frame = CELL_FRAME.instantiate() as Node3D
	_frame.name = "Highlight"
	_frame.visible = false
	add_child(_frame)


func _place_frame() -> void:
	if _frame == null:
		return
	_frame.visible = _highlight != null
	if _highlight == null:
		return
	var p := cell_center(_highlight)
	p.y = FRAME_Y_TILLED if _plots.has(_highlight) else FRAME_Y_GROUND
	_frame.position = p


## Определения культур: своя база, иначе база поля.
func _content() -> ContentDB:
	if db != null:
		return db
	return state.db if state != null else null


func _rebuild() -> void:
	_ensure_nodes()
	var want: Dictionary = {}
	if state != null:
		for c in state.cells():
			want[c] = true
	for c in _plots.keys():
		if not want.has(c):
			(_plots[c]["node"] as Node).free()
			_plots.erase(c)
	for c in want:
		_sync_plot(c)
	_place_frame()


func _sync_plot(cell: Vector2i) -> void:
	var p := state.plot(cell)
	var rec: Dictionary = _plots.get(cell, {})
	if rec.is_empty():
		var node := Node3D.new()
		node.name = "Plot_%d_%d" % [cell.x, cell.y]
		node.position = cell_center(cell)
		var tile := SOIL_TILE.instantiate() as Node3D
		node.add_child(tile)
		_plots_root.add_child(node)
		rec = {"node": node, "tile": _find_mesh(tile), "soil": "", "crop_key": "", "crop": null,
				"marker": null}
		_plots[cell] = rec
	var fertility := float(roundi(p["fertility"]))
	var watered: bool = p["watered"]
	var soil := "%d:%d" % [int(fertility), int(watered)]
	if rec["soil"] != soil and rec["tile"] != null:
		(rec["tile"] as MeshInstance3D).material_override = _material(fertility, watered, rec["tile"])
		rec["soil"] = soil
	_sync_crop(cell, p["crop"], rec)


func _sync_crop(cell: Vector2i, crop_id: String, rec: Dictionary) -> void:
	var def: CropDef = null
	var content := _content()
	if crop_id != "" and content != null and state.db != null:
		def = content.crop(crop_id)
	var key := ""
	var scene: PackedScene = null
	if crop_id != "" and def == null:
		key = "?"
	elif def != null:
		var s := state.stage(cell)
		key = "%s:%d" % [crop_id, s]
		if s >= 0 and s < def.stage_scenes.size():
			scene = def.stage_scenes[s]
	if key == rec["crop_key"]:
		return
	rec["crop_key"] = key
	for k in ["crop", "marker"]:
		if rec[k] != null:
			(rec[k] as Node).free()
			rec[k] = null
	var node := rec["node"] as Node3D
	if scene != null:
		var crop := scene.instantiate() as Node3D
		crop.position.y = TILE_TOP
		node.add_child(crop)
		rec["crop"] = crop
	elif key == "?":
		var mark := Label3D.new()
		mark.name = "UnknownMarker"
		mark.text = "?"
		mark.auto_translate_mode = Node.AUTO_TRANSLATE_MODE_DISABLED
		mark.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		mark.font_size = 96
		mark.outline_size = 16
		mark.modulate = Color(0.85, 0.83, 0.74)
		mark.position.y = MARKER_Y
		node.add_child(mark)
		rec["marker"] = mark


## Материал плитки нужного цвета: копия её исходного материала (шероховатость и пр. те же).
func _material(fertility: float, watered: bool, tile: MeshInstance3D) -> Material:
	var key := "%d:%d" % [int(fertility), int(watered)]
	if not _materials.has(key):
		if _tile_material == null and tile.mesh != null and tile.mesh.get_surface_count() > 0:
			_tile_material = tile.mesh.surface_get_material(0)
		var m: StandardMaterial3D
		if _tile_material is StandardMaterial3D:
			m = _tile_material.duplicate() as StandardMaterial3D
		else:
			m = StandardMaterial3D.new()
		m.albedo_color = soil_color(fertility, watered)
		_materials[key] = m
	return _materials[key]


static func _find_mesh(n: Node) -> MeshInstance3D:
	if n is MeshInstance3D:
		return n
	for c in n.get_children():
		var r := _find_mesh(c)
		if r != null:
			return r
	return null
