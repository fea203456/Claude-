class_name GameClock
extends Node
## Игровое время: 1 игровая минута = 1 реальная секунда при speed = 1.0.
## `minutes` — целые минуты от 06:00 текущего дня, 0…DAY_MINUTES (1200 = 02:00).

signal minute_changed(clock_minute: int)
signal hour_changed(hour: int)
signal night_started()
signal day_started(day: int)
signal season_changed(season: int)
signal collapsed()
## Время задано целиком (from_save / new_game), а не прошло: подписчики пересчитывают
## состояние (например, ночь после «Продолжить» в 23:00 — night_started не придёт).
signal time_loaded()

const DAY_MINUTES := 1200
const NIGHT_AT := 840
const SLEEP_FROM := 720
const DAYS_PER_SEASON := 28
const SEASONS := 4
const _DAY_START_CLOCK := 360  # 06:00 в минутах от полуночи
const _EPS := 1e-6

var day: int = 1
var minutes: int = 0
var speed: float = 1.0
var paused: bool = false
var collapsed_last_night: bool = false

var _fraction: float = 0.0


func _process(delta: float) -> void:
	advance(delta)


func advance(real_seconds: float) -> void:
	if paused or real_seconds <= 0.0:
		return
	_fraction += real_seconds * speed
	while _fraction >= 1.0 - _EPS:
		_fraction -= 1.0
		_tick_minute()


func _tick_minute() -> void:
	minutes += 1
	var cm := clock_minute()
	minute_changed.emit(cm)
	if cm % 60 == 0:
		hour_changed.emit(cm / 60)
	if minutes == NIGHT_AT:
		night_started.emit()
	if minutes >= DAY_MINUTES:
		collapsed.emit()
		_start_day(day + 1, true)


func _start_day(new_day: int, collapsed_flag: bool) -> void:
	var old_season := season()
	day = new_day
	minutes = 0
	collapsed_last_night = collapsed_flag
	if season() != old_season:
		season_changed.emit(season())
	day_started.emit(day)


## Игровые минуты с дробной частью — для плавного света.
func minutes_f() -> float:
	return float(minutes) + _fraction


func clock_minute() -> int:
	return (_DAY_START_CLOCK + minutes) % 1440


func hour() -> int:
	return clock_minute() / 60


func season() -> int:
	return ((day - 1) / DAYS_PER_SEASON) % SEASONS


func day_of_season() -> int:
	return (day - 1) % DAYS_PER_SEASON + 1


func year() -> int:
	return (day - 1) / (DAYS_PER_SEASON * SEASONS) + 1


func is_night() -> bool:
	return minutes >= NIGHT_AT


func can_sleep() -> bool:
	return minutes >= SLEEP_FROM


func sleep() -> bool:
	if not can_sleep():
		return false
	_fraction = 0.0
	_start_day(day + 1, false)
	return true


func new_game() -> void:
	day = 1
	minutes = 0
	_fraction = 0.0
	collapsed_last_night = false
	time_loaded.emit()


func to_save() -> Dictionary:
	return {"day": day, "minutes": minutes, "collapsed_last_night": collapsed_last_night}


func from_save(d: Dictionary) -> void:
	day = maxi(1, int(d.get("day", 1)))
	minutes = clampi(int(d.get("minutes", 0)), 0, DAY_MINUTES - 1)
	collapsed_last_night = bool(d.get("collapsed_last_night", false))
	_fraction = 0.0
	time_loaded.emit()
