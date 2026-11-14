class_name CropDef
extends Resource
## Описание культуры: сроки роста, выход и усталость героя.

@export var id: String = ""
@export var name_key: String = ""
## Дни роста для стадий 0→1, 1→2, 2→3 (три числа).
@export var stage_days: PackedInt32Array = PackedInt32Array()
@export var seed_item: String = ""
@export var produce_item: String = ""
@export var yield_count: int = 1
@export var seed_count: int = 1
@export var fatigue: float = 0.0
## Модели четырёх стадий: росток, побег, взрослое, спелое.
@export var stage_scenes: Array[PackedScene] = []


## Сколько дней от посадки до спелости.
func total_days() -> int:
	var t := 0
	for d in stage_days:
		t += d
	return t
