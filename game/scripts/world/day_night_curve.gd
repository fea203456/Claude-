class_name DayNightCurve
extends Resource
## Ключи света по времени суток (minutes от 06:00), отсортированы по `minutes`.
## Каждый ключ: minutes, sun_pitch_deg, sun_color, sun_energy, ambient_energy,
## sky_color, fog_density, fog_color; необязательные: moon_pitch_deg, moon_color,
## moon_energy, ground_fog_density.
##
## Заметки по настройке (day_night_curve.tres, ферма):
## - ambient_energy ночью ≈ 5–10 (ключ 840 — 10, 960 — 6, 1200 — 5) против 0.5 днём — это
##   не ошибка. В farm_environment.tres ambient_light_sky_contribution = 0.35: окружающий
##   свет на 65 % — это fog_color × ambient_energy, а ночной fog_color тёмный, грунт фермы
##   тоже очень тёмный (≈0.045 линейно), ACES давит тени. Без такой «заливки» герой ночью —
##   чёрный силуэт (луна у этого ракурса светит в спину). Снижать только вместе с проверкой
##   кадров tools/capture_daynight.sh (герой и двор должны читаться в 23:00 и 01:00).
## - Объёмный туман берёт ambient через volumetric_fog_ambient_inject (0.25): поднимете
##   ambient_energy — вырастет и яркость тумана за частоколом (анти-цель «ночь светлее заката»
##   проверяет check_luminance.py).
## - sun_energy(360) > sun_energy(780) > sun_energy(1000) требует test_day_night.gd.
##   Если pitch < 0 при ненулевой энергии (интерполяция заката), DayNightLighting гасит солнце.
## - Направление луны и солнца по Y задаётся в сцене (узлы Sun/Moon), в кривой только pitch.

@export var keys: Array[Dictionary] = []


func sample(minutes: float) -> Dictionary:
	if keys.is_empty():
		return {}
	var first: Dictionary = keys[0]
	if minutes <= float(first["minutes"]):
		return first.duplicate()
	for i in range(1, keys.size()):
		var b: Dictionary = keys[i]
		var bm := float(b["minutes"])
		if minutes <= bm:
			var a: Dictionary = keys[i - 1]
			var am := float(a["minutes"])
			var t := 0.0 if bm <= am else (minutes - am) / (bm - am)
			return _lerp_key(a, b, t)
	return (keys[keys.size() - 1] as Dictionary).duplicate()


func _lerp_key(a: Dictionary, b: Dictionary, t: float) -> Dictionary:
	var out := {}
	for k in a.keys():
		var va: Variant = a[k]
		var vb: Variant = b.get(k, va)
		if va is Color:
			out[k] = (va as Color).lerp(vb as Color, t)
		else:
			out[k] = lerpf(float(va), float(vb), t)
	return out
