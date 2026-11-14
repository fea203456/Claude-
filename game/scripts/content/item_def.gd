class_name ItemDef
extends Resource
## Описание предмета: инструмент, семена или урожай.

@export var id: String = ""
@export var name_key: String = ""
## &"tool" / &"seed" / &"produce"
@export var kind: StringName = &""
@export var icon: Texture2D
## Для инструментов: &"hoe" / &"can", иначе &"".
@export var tool: StringName = &""
## Для семян: id культуры, которая из них вырастает.
@export var crop_id: String = ""
