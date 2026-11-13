class_name DayNightCurve
extends Resource
## Ключи света по времени суток (minutes от 06:00), отсортированы по `minutes`.
## Каждый ключ: minutes, sun_pitch_deg, sun_color, sun_energy, ambient_energy,
## sky_color, fog_density, fog_color; необязательные: moon_pitch_deg, moon_color,
## moon_energy, ground_fog_density.

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
