class_name PauseMenu
extends CanvasLayer
## Меню паузы (Esc/Start): «Вернуться в игру» / «В главное меню» (с сохранением).
## Работает и на паузе (process_mode = ALWAYS в сцене).

var flow: GameFlow  ## пусто → /root/Game

@onready var _resume: Button = %Resume
@onready var _to_main: Button = %ToMain


func _ready() -> void:
	visible = false
	_resume.pressed.connect(func() -> void: set_open(false))
	_to_main.pressed.connect(_on_to_main)


func _resolve() -> void:
	if flow == null:
		flow = get_node_or_null("/root/Game") as GameFlow


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		toggle()
		get_viewport().set_input_as_handled()


func toggle() -> void:
	set_open(not visible)


func set_open(open: bool) -> void:
	_resolve()
	if flow != null:
		flow.set_paused(open)
	visible = open
	if open:
		_resume.grab_focus()


func _on_to_main() -> void:
	_resolve()
	visible = false
	if flow != null:
		flow.quit_to_menu()
