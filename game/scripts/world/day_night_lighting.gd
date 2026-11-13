class_name DayNightLighting
extends Node
## Применяет кривую света к солнцу и окружению по игровому времени.
## Без часов (тесты без autoload) молча простаивает.

@export var curve: DayNightCurve
@export var sun: DirectionalLight3D
@export var world_env: WorldEnvironment
@export var clock_path: NodePath

var clock: GameClock
## false — не брать /root/Clock, если часы не переданы (тесты «без часов» при autoload).
var use_global_clock := true


func _ready() -> void:
	_resolve_clock()


func _resolve_clock() -> void:
	if clock != null:
		return
	if not clock_path.is_empty():
		clock = get_node_or_null(clock_path) as GameClock
	if clock == null and use_global_clock:
		clock = get_node_or_null("/root/Clock") as GameClock


func _process(_delta: float) -> void:
	if clock == null:
		_resolve_clock()
	if clock == null or curve == null:
		return
	apply(clock.minutes_f())


func apply(minutes: float) -> void:
	if curve == null:
		return
	var s := curve.sample(minutes)
	if s.is_empty():
		return
	if sun != null:
		sun.rotation_degrees.x = -float(s["sun_pitch_deg"])
		sun.light_color = s["sun_color"]
		sun.light_energy = float(s["sun_energy"])
	if world_env == null or world_env.environment == null:
		return
	var env := world_env.environment
	var sky_color: Color = s["sky_color"]
	var fog_color: Color = s["fog_color"]
	env.ambient_light_energy = float(s["ambient_energy"])
	env.ambient_light_color = fog_color
	env.background_color = sky_color
	env.fog_light_color = fog_color
	env.volumetric_fog_density = float(s["fog_density"])
	env.volumetric_fog_albedo = fog_color
	if env.sky != null and env.sky.sky_material is ProceduralSkyMaterial:
		var m := env.sky.sky_material as ProceduralSkyMaterial
		m.sky_top_color = sky_color
		m.sky_horizon_color = sky_color.lerp(fog_color, 0.5)
		m.ground_horizon_color = m.sky_horizon_color
		m.ground_bottom_color = sky_color.darkened(0.3)
