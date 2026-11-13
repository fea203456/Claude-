extends SceneTree
## Запуск: tools/godot.sh test. Каждый метод test_* в res://tests/test_*.gd возвращает
## "" (PASS) или текст ошибки (FAIL). Тест также падает, если во время него движок
## записал ошибку (например, ошибку скрипта: типизированная функция тогда молча
## возвращает "", и без логгера это выглядело бы как PASS).


## Считает ошибки (не предупреждения), которые движок пишет в лог.
class ErrorCounter extends Logger:
	var count := 0
	var last := ""
	var _mutex := Mutex.new()

	func _log_error(function: String, file: String, line: int, code: String,
			rationale: String, _editor_notify: bool, error_type: int,
			_script_backtraces: Array[ScriptBacktrace]) -> void:
		if error_type == ERROR_TYPE_WARNING:
			return
		_mutex.lock()
		count += 1
		var what := rationale if rationale != "" else code
		last = "%s (%s:%d in %s)" % [what, file, line, function]
		_mutex.unlock()

	func snapshot() -> Array:
		_mutex.lock()
		var r := [count, last]
		_mutex.unlock()
		return r


func _initialize() -> void:
	await process_frame  # root enters the tree only after _initialize
	var errors := ErrorCounter.new()
	OS.add_logger(errors)
	var failures := 0
	var total := 0
	var dir := DirAccess.open("res://tests/")
	var files: Array[String] = []
	for f in dir.get_files():
		if f.begins_with("test_") and f.ends_with(".gd"):
			files.append(f)
	files.sort()
	for f in files:
		var scr = load("res://tests/" + f)
		if scr == null or not scr.can_instantiate():
			print("FAIL ", f, ": script failed to load or parse")
			failures += 1
			continue
		var inst = scr.new()
		var methods: Array[String] = []
		for m in inst.get_method_list():
			if String(m["name"]).begins_with("test_"):
				methods.append(m["name"])
		methods.sort()
		for name in methods:
			total += 1
			var before: int = errors.snapshot()[0]
			var msg = await inst.call(name)
			var after: Array = errors.snapshot()
			if after[0] > before:
				print("FAIL ", name, ": %d engine/script error(s) logged, last: %s" % [after[0] - before, after[1]])
				failures += 1
			elif typeof(msg) != TYPE_STRING:
				print("FAIL ", name, ": returned non-String (", type_string(typeof(msg)), "), probably a script error")
				failures += 1
			elif msg == "":
				print("PASS ", name)
			else:
				print("FAIL ", name, ": ", msg)
				failures += 1
	if total == 0:
		print("FAIL no tests found in res://tests/")
		failures += 1
	print("%d tests, %d failures" % [total, failures])
	OS.remove_logger(errors)
	quit(mini(failures, 255))
