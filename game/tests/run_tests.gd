extends SceneTree

func _initialize() -> void:
	await process_frame  # root enters the tree only after _initialize
	var failures := 0
	var dir := DirAccess.open("res://tests/")
	var files: Array[String] = []
	for f in dir.get_files():
		if f.begins_with("test_") and f.ends_with(".gd"):
			files.append(f)
	files.sort()
	for f in files:
		var inst = load("res://tests/" + f).new()
		var methods: Array[String] = []
		for m in inst.get_method_list():
			if String(m["name"]).begins_with("test_"):
				methods.append(m["name"])
		methods.sort()
		for name in methods:
			var msg = inst.call(name)
			if typeof(msg) != TYPE_STRING:
				print("FAIL ", name, ": returned non-String (", type_string(typeof(msg)), "), probably a script error")
				failures += 1
			elif msg == "":
				print("PASS ", name)
			else:
				print("FAIL ", name, ": ", msg)
				failures += 1
	quit(failures)
