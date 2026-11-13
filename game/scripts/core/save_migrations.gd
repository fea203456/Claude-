class_name SaveMigrations
extends RefCounted
## Миграции сохранений: шаг `from_version` → `from_version + 1`.

## int from_version → Callable(data: Dictionary) -> Dictionary. Для v1 пусто.
static var STEPS: Dictionary = {}


## Применяет шаги по порядку. Нет шага (или шаг вернул не Dictionary) → {}:
## вызвавший считает файл повреждённым.
static func migrate(data: Dictionary, target: int, steps: Dictionary = STEPS) -> Dictionary:
	var v = data.get("save_version", null)
	if typeof(v) != TYPE_INT and typeof(v) != TYPE_FLOAT:
		return {}
	var version := int(v)
	var cur := data
	while version < target:
		if not steps.has(version):
			return {}
		var step: Callable = steps[version]
		var res = step.call(cur)
		if typeof(res) != TYPE_DICTIONARY:
			return {}
		cur = res
		version += 1
		cur["save_version"] = version
	return cur
