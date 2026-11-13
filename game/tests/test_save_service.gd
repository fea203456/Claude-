extends RefCounted

const DIR := "user://test_saves/"


class Stub extends RefCounted:
	var data: Dictionary = {}
	var loaded := 0

	func to_save() -> Dictionary:
		return data.duplicate(true)

	func from_save(d: Dictionary) -> void:
		data = d
		loaded += 1


## Провайдер-узел: его можно освободить, не сняв с регистрации.
class NodeStub extends Node:
	func to_save() -> Dictionary:
		return {"n": 1}

	func from_save(_d: Dictionary) -> void:
		pass


## Очищает DIR целиком, на любую глубину (сама DIR остаётся).
func _clean() -> void:
	DirAccess.make_dir_recursive_absolute(DIR)
	_remove_contents(DIR)


func _remove_contents(dir: String) -> void:
	for sub in DirAccess.get_directories_at(dir):
		_remove_contents(dir + sub + "/")
		DirAccess.remove_absolute(dir + sub)
	for f in DirAccess.get_files_at(dir):
		DirAccess.remove_absolute(dir + f)


func _write(path: String, text: String) -> void:
	var f := FileAccess.open(path, FileAccess.WRITE)
	f.store_string(text)
	f.close()


func _read(path: String) -> String:
	return FileAccess.get_file_as_string(path)


func _svc(stub: Stub) -> SaveService:
	_clean()
	var s := SaveService.new()
	s.register("stub", stub)
	return s


func test_roundtrip() -> String:
	var p := DIR + "roundtrip.json"
	var a := Stub.new()
	a.data = {"x": 5, "name": "farm"}
	var s := _svc(a)
	if s.save_game(p) != OK:
		s.free()
		return "save failed"
	var parsed = JSON.parse_string(_read(p))
	a.data = {}
	var r := s.load_game(p)
	s.free()
	if r != SaveService.LoadResult.OK:
		return "load result %d" % r
	if int(a.data.get("x", -1)) != 5 or a.data.get("name") != "farm":
		return "data mismatch %s" % str(a.data)
	if int(parsed["save_version"]) != 1 or not parsed.has("game_version"):
		return "header wrong %s" % str(parsed)
	return ""


func test_creates_save_dir() -> String:
	var p := DIR + "newdir/sub/slot.json"
	var s := _svc(Stub.new())
	if DirAccess.dir_exists_absolute(DIR + "newdir"):
		s.free()
		return "_clean left newdir/ from a previous run: the test would prove nothing"
	var e := s.save_game(p)
	s.free()
	if e != OK:
		return "save returned %d" % e
	return "" if FileAccess.file_exists(p) else "no file"


func test_bak_keeps_previous() -> String:
	var p := DIR + "bak.json"
	var a := Stub.new()
	var s := _svc(a)
	a.data = {"v": 1}
	s.save_game(p)
	a.data = {"v": 2}
	s.save_game(p)
	s.free()
	var bak = JSON.parse_string(_read(p + ".bak"))
	var cur = JSON.parse_string(_read(p))
	if bak == null or int(bak["stub"]["v"]) != 1:
		return "bak wrong: %s" % _read(p + ".bak")
	return "" if int(cur["stub"]["v"]) == 2 else "main wrong"


func test_too_new_refused_untouched() -> String:
	var p := DIR + "toonew.json"
	var a := Stub.new()
	var s := _svc(a)
	_write(p, '{"save_version": 99, "stub": {"x": 1}}')
	var before := _read(p)
	var r := s.load_game(p)
	s.free()
	if r != SaveService.LoadResult.TOO_NEW:
		return "result %d" % r
	if _read(p) != before:
		return "file changed"
	return "" if a.loaded == 0 else "from_save called"


func test_migration_chain_applied_in_order() -> String:
	var p := DIR + "migr.json"
	var a := Stub.new()
	var s := _svc(a)
	s.target_version = 3
	s.migration_steps = {
		1: func(d: Dictionary) -> Dictionary:
			d["stub"]["m"] = str(d["stub"].get("m", "")) + "a"
			return d,
		2: func(d: Dictionary) -> Dictionary:
			d["stub"]["m"] = str(d["stub"].get("m", "")) + "b"
			return d,
	}
	_write(p, '{"save_version": 1, "stub": {"x": 1}}')
	var r := s.load_game(p)
	s.free()
	if r != SaveService.LoadResult.OK:
		return "result %d" % r
	return "" if a.data.get("m") == "ab" else "m=%s" % str(a.data.get("m"))


func test_corrupt_main_restores_bak() -> String:
	var p := DIR + "restore.json"
	var a := Stub.new()
	var s := _svc(a)
	_write(p, "{{ garbage")
	_write(p + ".bak", '{"save_version": 1, "stub": {"x": 7}}')
	var r := s.load_game(p)
	s.free()
	if r != SaveService.LoadResult.RESTORED_FROM_BAK:
		return "result %d" % r
	return "" if int(a.data.get("x", -1)) == 7 else "data %s" % str(a.data)


func test_corrupt_both() -> String:
	var p := DIR + "both.json"
	var s := _svc(Stub.new())
	_write(p, "garbage")
	_write(p + ".bak", "")
	var r := s.load_game(p)
	s.free()
	return "" if r == SaveService.LoadResult.CORRUPT else "result %d" % r


func test_failed_write_keeps_old_save() -> String:
	var p := DIR + "failw.json"
	var a := Stub.new()
	var s := _svc(a)
	a.data = {"v": 1}
	if s.save_game(p) != OK:
		s.free()
		return "first save failed"
	var before := _read(p)
	DirAccess.make_dir_recursive_absolute(p + ".tmp")
	a.data = {"v": 2}
	var e := s.save_game(p)
	s.free()
	if e == OK:
		return "save should fail"
	return "" if _read(p) == before else "main changed"


func test_missing_section_not_applied() -> String:
	var p := DIR + "missing.json"
	var a := Stub.new()
	var s := _svc(a)
	_write(p, '{"save_version": 1, "other": {"x": 1}}')
	var r := s.load_game(p)
	s.free()
	if r != SaveService.LoadResult.OK:
		return "result %d" % r
	return "" if a.loaded == 0 else "from_save called"


func test_has_save_with_only_bak() -> String:
	var p := DIR + "onlybak.json"
	var s := _svc(Stub.new())
	var none := s.has_save(p)
	_write(p + ".bak", '{"save_version": 1}')
	var with_bak := s.has_save(p)
	s.free()
	if none:
		return "has_save true without any file"
	return "" if with_bak else "has_save false although .bak exists"


## Битый основной файл не затирает хороший .bak: после восстановления первое сохранение
## уводит битый файл в .corrupt, а .bak остаётся прежним.
func test_corrupt_main_does_not_replace_good_bak() -> String:
	var p := DIR + "keepbak.json"
	var a := Stub.new()
	var s := _svc(a)
	var good := '{"save_version": 1, "stub": {"x": 7}}'
	_write(p, "{{ garbage")
	_write(p + ".bak", good)
	var r := s.load_game(p)
	a.data = {"x": 8}
	var e := s.save_game(p)
	s.free()
	if r != SaveService.LoadResult.RESTORED_FROM_BAK:
		return "load result %d" % r
	if e != OK:
		return "save returned %d" % e
	if _read(p + ".bak") != good:
		return ".bak replaced: %s" % _read(p + ".bak")
	if _read(p + ".corrupt") != "{{ garbage":
		return "corrupt main not kept as .corrupt: '%s'" % _read(p + ".corrupt")
	var cur = JSON.parse_string(_read(p))
	return "" if cur is Dictionary and int(cur["stub"]["x"]) == 8 else "main wrong: %s" % _read(p)


## Третье сохранение перезаписывает .bak предыдущим: A, B, C → .bak == B.
func test_third_save_overwrites_bak() -> String:
	var p := DIR + "third.json"
	var a := Stub.new()
	var s := _svc(a)
	var errs := []
	for v in ["A", "B", "C"]:
		a.data = {"v": v}
		errs.append(s.save_game(p))
	s.free()
	if errs != [OK, OK, OK]:
		return "save results %s" % str(errs)
	var bak = JSON.parse_string(_read(p + ".bak"))
	var cur = JSON.parse_string(_read(p))
	if not bak is Dictionary or bak["stub"]["v"] != "B":
		return ".bak = %s" % _read(p + ".bak")
	return "" if cur is Dictionary and cur["stub"]["v"] == "C" else "main = %s" % _read(p)


## Раздел без провайдера (например, из будущей подсистемы) переживает загрузку и сохранение.
func test_unknown_section_survives_save() -> String:
	var p := DIR + "future.json"
	var a := Stub.new()
	var s := _svc(a)
	_write(p, '{"save_version": 1, "stub": {"x": 1}, "future": {"seeds": [1, 2], "k": "v"}}')
	var r := s.load_game(p)
	a.data = {"x": 2}
	var e := s.save_game(p)
	s.free()
	if r != SaveService.LoadResult.OK or e != OK:
		return "load %d save %d" % [r, e]
	var cur = JSON.parse_string(_read(p))
	if not cur is Dictionary:
		return "main unreadable"
	if cur.get("future") != {"seeds": [1.0, 2.0], "k": "v"}:
		return "future section lost or changed: %s" % str(cur.get("future"))
	return "" if int(cur["stub"]["x"]) == 2 else "provider section not written: %s" % str(cur["stub"])


## Неудачная загрузка не оставляет разделов от прошлой удачной.
func test_failed_load_forgets_previous_sections() -> String:
	var p := DIR + "forget.json"
	var a := Stub.new()
	var s := _svc(a)
	_write(p, '{"save_version": 1, "future": {"k": 1}}')
	s.load_game(p)
	_write(p, "garbage")
	var r := s.load_game(p)
	var e := s.save_game(p)
	s.free()
	if r != SaveService.LoadResult.CORRUPT or e != OK:
		return "load %d save %d" % [r, e]
	var cur = JSON.parse_string(_read(p))
	return "" if cur is Dictionary and not cur.has("future") else "stale section kept: %s" % _read(p)


## Освобождённый провайдер молча (warning) снимается, остальные разделы пишутся.
func test_freed_provider_pruned_on_save() -> String:
	var p := DIR + "freed.json"
	var a := Stub.new()
	a.data = {"x": 3}
	var s := _svc(a)
	var node := NodeStub.new()
	s.register("node", node)
	node.free()
	var e := s.save_game(p)
	var e2 := s.save_game(p)
	s.free()
	if e != OK or e2 != OK:
		return "save returned %d, %d" % [e, e2]
	var cur = JSON.parse_string(_read(p))
	if not cur is Dictionary:
		return "no save written"
	if cur.has("node"):
		return "freed provider section written: %s" % str(cur["node"])
	return "" if int(cur["stub"]["x"]) == 3 else "live provider section missing: %s" % _read(p)


func test_freed_provider_pruned_on_load() -> String:
	var p := DIR + "freedload.json"
	var a := Stub.new()
	var s := _svc(a)
	var node := NodeStub.new()
	s.register("node", node)
	node.free()
	_write(p, '{"save_version": 1, "node": {"n": 2}, "stub": {"x": 4}}')
	var r := s.load_game(p)
	s.free()
	if r != SaveService.LoadResult.OK:
		return "load result %d" % r
	return "" if int(a.data.get("x", -1)) == 4 else "live provider not loaded: %s" % str(a.data)


func test_unregister_removes_provider() -> String:
	var p := DIR + "unreg.json"
	var a := Stub.new()
	var s := _svc(a)
	var node := NodeStub.new()
	s.register("node", node)
	var before := s.is_registered("node")
	s.unregister("node")
	s.unregister("never_registered")
	var after := s.is_registered("node")
	node.free()
	var e := s.save_game(p)
	s.free()
	if not before or after:
		return "is_registered before=%s after=%s" % [before, after]
	var cur = JSON.parse_string(_read(p))
	if e != OK or not cur is Dictionary:
		return "save returned %d" % e
	return "" if not cur.has("node") else "unregistered provider written"
