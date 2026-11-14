class_name FarmState
extends RefCounted
## Состояние поля: вскопанные клетки, рост по ночам, усталость почвы. Чистая логика, без узлов.
## Клетка с культурой, неизвестной базе, хранится дословно и ночью не трогается.

signal changed()

const FERTILITY_MAX := 100.0
const FERTILITY_THRESHOLD := 60.0
const RECOVERY := 3.0
const EPS := 1e-6

var db: ContentDB
var bounds := Rect2i(-6, 2, 12, 8)

## Vector2i -> Dictionary. Известная клетка: {"fertility", "watered", "crop", "growth"};
## клетка с неизвестной культурой: исходный словарь из сохранения.
var _plots: Dictionary = {}


func in_field(cell: Vector2i) -> bool:
	return bounds.has_point(cell)


func is_tilled(cell: Vector2i) -> bool:
	return _plots.has(cell)


## Все вскопанные клетки (в том числе загруженные вне поля).
func cells() -> Array[Vector2i]:
	var out: Array[Vector2i] = []
	for c in _plots:
		out.append(c)
	return out


## Копия клетки: {} если не вскопана. Поля: fertility, watered, crop, growth.
func plot(cell: Vector2i) -> Dictionary:
	if not _plots.has(cell):
		return {}
	var r: Dictionary = _plots[cell]
	return {
		"fertility": _num(r.get("fertility"), FERTILITY_MAX),
		"watered": (r.get("watered") is bool and r["watered"]),
		"crop": _crop_id(cell),
		"growth": _num(r.get("growth"), 0.0),
	}


func till(cell: Vector2i) -> bool:
	if not in_field(cell) or is_tilled(cell):
		return false
	_plots[cell] = {"fertility": FERTILITY_MAX, "watered": false, "crop": "", "growth": 0.0}
	changed.emit()
	return true


func plant(cell: Vector2i, crop_id: String) -> bool:
	if not is_tilled(cell) or has_plant(cell) or db.crop(crop_id) == null:
		return false
	_plots[cell]["crop"] = crop_id
	_plots[cell]["growth"] = 0.0
	changed.emit()
	return true


func water(cell: Vector2i) -> bool:
	if not is_tilled(cell) or is_unknown(cell) or _plots[cell]["watered"]:
		return false
	_plots[cell]["watered"] = true
	changed.emit()
	return true


func has_plant(cell: Vector2i) -> bool:
	return _crop_id(cell) != ""


## Растение есть, но культуры нет в базе.
func is_unknown(cell: Vector2i) -> bool:
	var id := _crop_id(cell)
	return id != "" and db.crop(id) == null


## 0…3; -1 без растения или с неизвестной культурой.
func stage(cell: Vector2i) -> int:
	var def := _known_def(cell)
	if def == null:
		return -1
	var growth: float = _plots[cell]["growth"]
	var s := 0
	var acc := 0.0
	for d in def.stage_days:
		acc += d
		if growth >= acc - EPS:
			s += 1
		else:
			break
	return s


func is_ripe(cell: Vector2i) -> bool:
	var def := _known_def(cell)
	return def != null and float(_plots[cell]["growth"]) >= def.total_days() - EPS


## {} если не спелое; иначе {"crop", "produce", "seeds"}. Клетка становится пустой вскопанной.
func harvest(cell: Vector2i) -> Dictionary:
	if not is_ripe(cell):
		return {}
	var rec: Dictionary = _plots[cell]
	var def := _known_def(cell)
	var fertility: float = rec["fertility"]
	var result := {
		"crop": def.id,
		"produce": yield_for(def.yield_count, fertility),
		"seeds": def.seed_count,
	}
	rec["crop"] = ""
	rec["growth"] = 0.0
	rec["fertility"] = maxf(0.0, fertility - def.fatigue)
	changed.emit()
	return result


## Ночь: рост -> восстановление -> сухо. Вызывать только из обработчика day_started.
func advance_night() -> void:
	for cell in _plots:
		var rec: Dictionary = _plots[cell]
		if is_unknown(cell):
			continue
		var fertility: float = rec["fertility"]
		var def := _known_def(cell)
		if def != null:
			if rec["watered"]:
				rec["growth"] = minf(float(rec["growth"]) + growth_rate(fertility), float(def.total_days()))
		elif fertility < FERTILITY_THRESHOLD:
			rec["fertility"] = minf(FERTILITY_THRESHOLD, fertility + RECOVERY)
		rec["watered"] = false
	changed.emit()


## Скорость роста в сутки: 1.0 при плодородии >= 60, иначе от 0.5 до 1.0.
static func growth_rate(fertility: float) -> float:
	if fertility >= FERTILITY_THRESHOLD:
		return 1.0
	return 0.5 + 0.5 * fertility / FERTILITY_THRESHOLD


## Урожай от базового: множитель 0.5…1 по плодородию, не меньше 1.
static func yield_for(base: int, fertility: float) -> int:
	return maxi(1, int(floor(base * (0.5 + 0.5 * fertility / FERTILITY_MAX))))


func clear() -> void:
	_plots.clear()
	changed.emit()


func to_save() -> Dictionary:
	var out: Array = []
	for cell in _plots:
		var rec: Dictionary = _plots[cell]
		if is_unknown(cell):
			out.append(rec.duplicate(true))
		else:
			out.append({"x": cell.x, "z": cell.y, "fertility": rec["fertility"],
					"watered": rec["watered"], "crop": rec["crop"], "growth": rec["growth"]})
	return {"plots": out}


## Загрузка из JSON: числа бывают float, структура может быть испорчена вручную.
## Ничего не бросает: мусор отбрасывается или заменяется значениями по умолчанию.
func from_save(d: Variant) -> void:
	_plots.clear()
	var warned: Dictionary = {}
	if d is Dictionary and d.get("plots") is Array:
		for entry in d["plots"]:
			if not (entry is Dictionary):
				continue
			var x: Variant = entry.get("x")
			var z: Variant = entry.get("z")
			if not _finite(x) or not _finite(z):
				continue
			var cell := Vector2i(int(clampf(float(x), -100000.0, 100000.0)),
					int(clampf(float(z), -100000.0, 100000.0)))
			var crop: Variant = entry.get("crop")
			var id: String = crop if crop is String else ""
			if id != "" and db.crop(id) == null:
				if not warned.has(id):
					warned[id] = true
					push_warning("FarmState: неизвестная культура «%s» в сохранении, хранится как есть" % id)
				_plots.erase(cell)
				_plots[cell] = (entry as Dictionary).duplicate(true)
				continue
			var fertility := clampf(_num(entry.get("fertility"), FERTILITY_MAX), 0.0, FERTILITY_MAX)
			var growth := maxf(0.0, _num(entry.get("growth"), 0.0))
			if id == "":
				growth = 0.0
			else:
				growth = minf(growth, float(db.crop(id).total_days()))
			_plots.erase(cell)
			_plots[cell] = {"fertility": fertility, "watered": (entry.get("watered") is bool and entry["watered"]),
					"crop": id, "growth": growth}
	changed.emit()


static func _finite(v: Variant) -> bool:
	return (typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT) and is_finite(float(v))


static func _num(v: Variant, fallback: float) -> float:
	return float(v) if _finite(v) else fallback


func _crop_id(cell: Vector2i) -> String:
	if not _plots.has(cell):
		return ""
	var c: Variant = _plots[cell].get("crop")
	return c if c is String else ""


## CropDef растения в клетке; null без растения или с неизвестной культурой.
func _known_def(cell: Vector2i) -> CropDef:
	var id := _crop_id(cell)
	return db.crop(id) if id != "" else null
