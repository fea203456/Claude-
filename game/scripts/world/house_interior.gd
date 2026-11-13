class_name HouseInterior
extends Area3D
## Объём внутри дома: пока там герой, крыша скрыта — камера 45° сверху иначе не видит
## интерьер и кровать. Ловит только PlayerController (стены дома тоже тела).

@export var roof_path: NodePath = ^"../HouseModel/HouseRoof"

var _roof: Node3D
var _inside := 0


func _ready() -> void:
	_roof = get_node_or_null(roof_path) as Node3D
	body_entered.connect(_on_body_entered)
	body_exited.connect(_on_body_exited)


func _on_body_entered(body: Node3D) -> void:
	if body is PlayerController:
		_inside += 1
		_apply()


func _on_body_exited(body: Node3D) -> void:
	if body is PlayerController:
		_inside = maxi(0, _inside - 1)
		_apply()


func _apply() -> void:
	if _roof != null:
		_roof.visible = _inside == 0
