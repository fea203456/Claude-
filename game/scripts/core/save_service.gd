class_name SaveService
extends Node
## Сохранения: версия, миграции, атомарная запись (tmp → rename), предыдущее — .bak.
## Ошибки возвращаются кодами, в лог движка ничего не пишется.

const SAVE_VERSION := 1
const SLOT_PATH := "user://save/slot_1.json"

enum LoadResult { OK, NO_FILE, TOO_NEW, RESTORED_FROM_BAK, CORRUPT }

var target_version: int = SAVE_VERSION
var migration_steps: Dictionary = SaveMigrations.STEPS

var _providers: Dictionary = {}  # key -> Object


func register(key: String, provider: Object) -> void:
	_providers[key] = provider


## Есть что продолжать: основной файл или хотя бы .bak (load_game восстановит из него).
func has_save(path: String = SLOT_PATH) -> bool:
	return FileAccess.file_exists(path) or FileAccess.file_exists(path + ".bak")


func save_game(path: String = SLOT_PATH) -> Error:
	var dir_path := path.get_base_dir()
	var err := DirAccess.make_dir_recursive_absolute(dir_path)
	if err != OK:
		return err
	var game_version := str(ProjectSettings.get_setting("application/config/version", ""))
	if game_version == "":
		game_version = "0.1.0"
	var data := {"save_version": target_version, "game_version": game_version}
	for key in _providers:
		data[key] = (_providers[key] as Object).call("to_save")
	var tmp := path + ".tmp"
	var f := FileAccess.open(tmp, FileAccess.WRITE)
	if f == null:
		return FileAccess.get_open_error()
	f.store_string(JSON.stringify(data, "\t"))
	var werr := f.get_error()
	f.close()
	if werr != OK:
		DirAccess.remove_absolute(tmp)
		return werr
	var dir := DirAccess.open(dir_path)
	if dir == null:
		return DirAccess.get_open_error()
	if FileAccess.file_exists(path):
		err = dir.rename(path.get_file(), path.get_file() + ".bak")
		if err != OK:
			return err
	return dir.rename(tmp.get_file(), path.get_file())


func load_game(path: String = SLOT_PATH) -> LoadResult:
	if not FileAccess.file_exists(path) and not FileAccess.file_exists(path + ".bak"):
		return LoadResult.NO_FILE
	var r := _try_load(path)
	if r == LoadResult.OK or r == LoadResult.TOO_NEW:
		return r
	if FileAccess.file_exists(path + ".bak"):
		var rb := _try_load(path + ".bak")
		if rb == LoadResult.OK:
			return LoadResult.RESTORED_FROM_BAK
	return LoadResult.CORRUPT


## OK / TOO_NEW / CORRUPT (NO_FILE трактуется как CORRUPT вызывающим).
func _try_load(file_path: String) -> LoadResult:
	var f := FileAccess.open(file_path, FileAccess.READ)
	if f == null:
		return LoadResult.CORRUPT
	var text := f.get_as_text()
	f.close()
	var json := JSON.new()
	if json.parse(text) != OK or typeof(json.data) != TYPE_DICTIONARY:
		return LoadResult.CORRUPT
	var data: Dictionary = json.data
	var v = data.get("save_version", null)
	if typeof(v) != TYPE_INT and typeof(v) != TYPE_FLOAT:
		return LoadResult.CORRUPT
	var version := int(v)
	if version > target_version:
		return LoadResult.TOO_NEW
	if version < target_version:
		data = SaveMigrations.migrate(data, target_version, migration_steps)
		if data.is_empty():
			return LoadResult.CORRUPT
	for key in _providers:
		if data.has(key) and typeof(data[key]) == TYPE_DICTIONARY:
			(_providers[key] as Object).call("from_save", data[key])
	return LoadResult.OK
