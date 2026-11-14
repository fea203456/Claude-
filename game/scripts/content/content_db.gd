class_name ContentDB
extends RefCounted
## База контента: предметы и культуры по id.

const ITEMS_DIR := "res://data/items"
const CROPS_DIR := "res://data/crops"

var _items: Dictionary = {}
var _crops: Dictionary = {}


## Загружает все .tres из data/items и data/crops.
static func load_default() -> ContentDB:
	var db := ContentDB.new()
	for res in _load_dir(ITEMS_DIR):
		if res is ItemDef:
			db.add_item(res)
		else:
			push_warning("ContentDB: не ItemDef: %s" % res.resource_path)
	for res in _load_dir(CROPS_DIR):
		if res is CropDef:
			db.add_crop(res)
		else:
			push_warning("ContentDB: не CropDef: %s" % res.resource_path)
	return db


static func _load_dir(dir: String) -> Array[Resource]:
	var out: Array[Resource] = []
	for f in ResourceLoader.list_directory(dir):
		if not f.ends_with(".tres"):
			continue
		var res := ResourceLoader.load(dir.path_join(f))
		if res != null:
			out.append(res)
		else:
			push_warning("ContentDB: не загрузился %s/%s" % [dir, f])
	return out


func add_item(d: ItemDef) -> void:
	_items[d.id] = d


func add_crop(d: CropDef) -> void:
	_crops[d.id] = d


## null, если предмета нет.
func item(id: String) -> ItemDef:
	return _items.get(id)


## null, если культуры нет.
func crop(id: String) -> CropDef:
	return _crops.get(id)


func item_ids() -> Array:
	return _items.keys()


func crop_ids() -> Array:
	return _crops.keys()
