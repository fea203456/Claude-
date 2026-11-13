class_name MainMenu
extends Control
## Главное меню: «Продолжить» (если есть сохранение) / «Новая игра» / «Выход»
## и сообщение GameFlow.last_message (например, о слишком новом сохранении).

var flow: GameFlow  ## пусто → /root/Game

@onready var _continue: Button = %Continue
@onready var _new_game: Button = %NewGame
@onready var _quit: Button = %Quit
@onready var _message: Label = %Message


func _ready() -> void:
	if flow == null:
		flow = get_node_or_null("/root/Game") as GameFlow
	_continue.pressed.connect(_on_continue)
	_new_game.pressed.connect(_on_new_game)
	_quit.pressed.connect(func() -> void: get_tree().quit())
	refresh()
	(_continue if _continue.visible else _new_game).grab_focus()


func refresh() -> void:
	_continue.visible = flow != null and flow.has_save()
	var msg := flow.last_message if flow != null else ""
	_message.text = msg
	_message.visible = msg != ""


func _on_continue() -> void:
	if flow == null:
		return
	flow.continue_game()
	if is_inside_tree() and not is_queued_for_deletion():
		refresh()  # остались в меню (например, сохранение от новой версии)


func _on_new_game() -> void:
	if flow != null:
		flow.new_game()
