class_name Inventory
extends RefCounted
## Инвентарь-хотбар на 8 ячеек и запас воды в лейке. Чистая логика, без узлов.
## Ячейка с id, неизвестным базе, хранится дословно: она занята, add() её не трогает.

signal changed()

const SLOTS := 8
const STACK_MAX := 99
const CAN_CAPACITY := 10

var db: ContentDB
var selected: int = 0
var can_water: int = CAN_CAPACITY

## null (пусто) или Dictionary. Известный предмет: {"id", "count"}; неизвестный: исходный словарь.
var _slots: Array = []


func _init() -> void:
	_slots.resize(SLOTS)
	_slots.fill(null)


## Копия содержимого ячейки: {} для пустой или несуществующей.
func slot(i: int) -> Dictionary:
	if i < 0 or i >= SLOTS or _slots[i] == null:
		return {}
	return (_slots[i] as Dictionary).duplicate(true)


func selected_id() -> String:
	var s := slot(selected)
	return String(s.get("id", ""))


## null для пустой и неизвестной ячейки.
func selected_def() -> ItemDef:
	var id := selected_id()
	if id == "":
		return null
	return db.item(id)


func select(i: int) -> void:
	if i < 0 or i >= SLOTS or i == selected:
		return
	selected = i
	changed.emit()


func select_next() -> void:
	select((selected + 1) % SLOTS)


func select_prev() -> void:
	select((selected - 1 + SLOTS) % SLOTS)


## Сколько предметов id во всех ячейках.
func count_of(id: String) -> int:
	var n := 0
	for s in _slots:
		if s != null and s.get("id") == id and db.item(id) != null:
			n += int(s["count"])
	return n


## Поместились бы все предметы [[id, count], …]. Ничего не меняет.
func can_add_all(items: Array) -> bool:
	var sim: Array = _slots.duplicate(true)
	for it in items:
		if not (it is Array) or it.size() != 2 or not (it[0] is String):
			return false
		if db.item(it[0]) == null:
			return false
		if _place(sim, it[0], int(it[1])) > 0:
			return false
	return true


## Кладёт предметы: сначала в неполные стопки, потом в пустые ячейки.
## Возвращает остаток, который не влез.
func add(id: String, count: int) -> int:
	if count <= 0:
		return 0
	if db.item(id) == null:
		push_warning("Inventory: неизвестный предмет «%s», не добавлен" % id)
		return count
	var left := _place(_slots, id, count)
	if left < count:
		changed.emit()
	return left


## Снимает count предметов из ячейки; пустая ячейка освобождается.
## false, если ячейки нет, она пуста, неизвестна или в ней меньше count.
func remove_from_slot(i: int, count: int) -> bool:
	if i < 0 or i >= SLOTS or count <= 0 or _slots[i] == null:
		return false
	var s: Dictionary = _slots[i]
	if db.item(s["id"]) == null or int(s["count"]) < count:
		return false
	s["count"] = int(s["count"]) - count
	if s["count"] <= 0:
		_slots[i] = null
	changed.emit()
	return true


func use_water() -> bool:
	if can_water <= 0:
		return false
	can_water -= 1
	changed.emit()
	return true


## false, если лейка уже полная.
func refill_can() -> bool:
	if can_water >= CAN_CAPACITY:
		return false
	can_water = CAN_CAPACITY
	changed.emit()
	return true


func reset_to_starter() -> void:
	from_save(starter_save())


static func starter_save() -> Dictionary:
	return {
		"slots": [
			{"id": "hoe", "count": 1},
			{"id": "watering_can", "count": 1},
			{"id": "seed_silverleaf", "count": 6},
			{"id": "seed_boneroot", "count": 6},
			{"id": "seed_nightbloom", "count": 6},
			null, null, null,
		],
		"can_water": CAN_CAPACITY,
		"selected": 0,
	}


func to_save() -> Dictionary:
	var out: Array = []
	for s in _slots:
		out.append(null if s == null else (s as Dictionary).duplicate(true))
	return {"slots": out, "can_water": can_water, "selected": selected}


## Загрузка из JSON: числа бывают float, структура может быть испорчена вручную.
## Ничего не бросает: мусор превращается в пустые ячейки, значения зажимаются.
## Нет массива ячеек (или раздел не словарь) — стартовый набор; нет лейки — она полная:
## игрок не должен остаться без инструментов и семян.
func from_save(d: Variant) -> void:
	_slots.fill(null)
	selected = 0
	can_water = CAN_CAPACITY
	var src: Dictionary = d if d is Dictionary else {}
	var raw: Variant = src.get("slots")
	if not (raw is Array):
		raw = starter_save()["slots"]
	for i in mini(raw.size(), SLOTS):
		_slots[i] = _load_slot(raw[i])
	var sel: Variant = src.get("selected")
	if _is_number(sel) and is_finite(float(sel)):
		var si := int(sel)
		selected = si if si >= 0 and si < SLOTS else 0
	var cw: Variant = src.get("can_water")
	if _is_number(cw) and is_finite(float(cw)):
		can_water = clampi(int(clampf(float(cw), -1.0, 1000.0)), 0, CAN_CAPACITY)
	changed.emit()


static func _is_number(v: Variant) -> bool:
	return typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT


## Ячейка из сохранения: null (пусто), чистая запись или неизвестная дословно.
func _load_slot(entry: Variant) -> Variant:
	if not (entry is Dictionary) or not (entry.get("id") is String) or entry["id"] == "":
		return null
	var id: String = entry["id"]
	if db.item(id) == null:
		push_warning("Inventory: неизвестный предмет «%s» в сохранении, хранится как есть" % id)
		return (entry as Dictionary).duplicate(true)
	var c: Variant = entry.get("count")
	if not _is_number(c) or not is_finite(float(c)):
		return null
	var n := int(clampf(float(c), -1.0, 1000.0))
	n = mini(n, _limit(id))
	if n <= 0:
		return null
	return {"id": id, "count": n}


## Предел стопки известного предмета: инструмент 1, остальное 99.
func _limit(id: String) -> int:
	var def := db.item(id)
	if def != null and def.kind == &"tool":
		return 1
	return STACK_MAX


## Раскладывает count предметов id (известного базе) по ячейкам slots. Возвращает остаток.
func _place(slots: Array, id: String, count: int) -> int:
	var limit := _limit(id)
	for i in SLOTS:
		if count <= 0:
			return 0
		var s: Variant = slots[i]
		if s != null and s["id"] == id:
			var put := mini(count, limit - int(s["count"]))
			if put > 0:
				s["count"] = int(s["count"]) + put
				count -= put
	for i in SLOTS:
		if count <= 0:
			return 0
		if slots[i] == null:
			var put := mini(count, limit)
			slots[i] = {"id": id, "count": put}
			count -= put
	return maxi(count, 0)
