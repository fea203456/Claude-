extends RefCounted


func _counter(clock: GameClock, sig: String) -> Array:
	var c := [0]
	clock.get(sig).connect(func(_a = null): c[0] += 1)
	return c


func test_one_minute_per_second() -> String:
	var c := GameClock.new()
	c.advance(60.0)
	var ok: bool = c.minutes == 60 and c.hour() == 7 and c.clock_minute() == 420
	c.free()
	return "" if ok else "minutes=%d" % c.minutes


func test_frame_rate_independent() -> String:
	var a := GameClock.new()
	var b := GameClock.new()
	for i in 600:
		a.advance(0.1)
	b.advance(60.0)
	var ok: bool = a.minutes == 60 and b.minutes == 60
	var msg := "a=%d b=%d" % [a.minutes, b.minutes]
	a.free()
	b.free()
	return "" if ok else msg


func test_speed_multiplier() -> String:
	var c := GameClock.new()
	c.speed = 2.0
	c.advance(30.0)
	var m: int = c.minutes
	c.free()
	return "" if m == 60 else "minutes=%d" % m


func test_paused_does_not_advance() -> String:
	var c := GameClock.new()
	c.paused = true
	c.advance(100.0)
	var m: int = c.minutes
	c.free()
	return "" if m == 0 else "minutes=%d" % m


func test_night_starts_at_2000() -> String:
	var c := GameClock.new()
	var n := _counter(c, "night_started")
	c.advance(839.0)
	if c.is_night():
		c.free()
		return "night too early"
	c.advance(1.0)
	var ok: bool = c.is_night() and n[0] == 1
	c.free()
	return "" if ok else "night_started=%d" % n[0]


func test_collapse_at_0200() -> String:
	var c := GameClock.new()
	var col := _counter(c, "collapsed")
	var ds := [0]
	c.day_started.connect(func(d: int): ds[0] = d)
	c.advance(1200.0)
	var ok: bool = col[0] == 1 and c.day == 2 and c.minutes == 0 \
			and c.collapsed_last_night and ds[0] == 2
	var msg := "col=%d day=%d min=%d" % [col[0], c.day, c.minutes]
	c.free()
	return "" if ok else msg


func test_big_delta_does_not_skip_events() -> String:
	var c := GameClock.new()
	var n := _counter(c, "night_started")
	var col := _counter(c, "collapsed")
	var h := _counter(c, "hour_changed")
	c.advance(1300.0)
	var ok: bool = n[0] == 1 and col[0] == 1 and h[0] == 21 and c.day == 2 and c.minutes == 100
	var msg := "n=%d col=%d h=%d day=%d min=%d" % [n[0], col[0], h[0], c.day, c.minutes]
	c.free()
	return "" if ok else msg


func test_collapse_after_load_at_0159() -> String:
	var c := GameClock.new()
	c.from_save({"day": 3, "minutes": 1199, "collapsed_last_night": false})
	var col := _counter(c, "collapsed")
	c.advance(1.0)
	var ok: bool = col[0] == 1 and c.day == 4
	c.free()
	return "" if ok else "col=%d" % col[0]


func test_sleep_refused_before_1800() -> String:
	var c := GameClock.new()
	c.minutes = 719
	var r := c.sleep()
	var ok: bool = not r and c.day == 1 and c.minutes == 719
	c.free()
	return "" if ok else "sleep allowed too early"


func test_sleep_after_1800() -> String:
	var c := GameClock.new()
	c.collapsed_last_night = true
	c.minutes = 720
	var r := c.sleep()
	var ok: bool = r and c.day == 2 and c.minutes == 0 and not c.collapsed_last_night
	c.free()
	return "" if ok else "sleep failed"


func test_season_and_year_rollover() -> String:
	var c := GameClock.new()
	var seasons := []
	c.season_changed.connect(func(s: int): seasons.append(s))
	for i in 28:
		c.minutes = 720
		c.sleep()
	if c.season() != 1 or c.day_of_season() != 1 or seasons != [1]:
		var m := "season=%d dos=%d seasons=%s" % [c.season(), c.day_of_season(), seasons]
		c.free()
		return m
	c.day = 112
	c.minutes = 720
	c.sleep()
	var ok: bool = c.day == 113 and c.year() == 2 and c.season() == 0 and seasons == [1, 0]
	var msg := "day=%d year=%d season=%d" % [c.day, c.year(), c.season()]
	c.free()
	return "" if ok else msg


func test_save_roundtrip() -> String:
	var a := GameClock.new()
	a.day = 7
	a.minutes = 345
	a.collapsed_last_night = true
	var b := GameClock.new()
	b.from_save(a.to_save())
	var ok: bool = b.day == 7 and b.minutes == 345 and b.collapsed_last_night
	a.free()
	b.free()
	return "" if ok else "mismatch"


func test_minutes_f_includes_fraction() -> String:
	var c := GameClock.new()
	c.advance(10.5)
	var ok: bool = c.minutes == 10 and absf(c.minutes_f() - 10.5) < 1e-4
	var msg := "minutes_f=%f" % c.minutes_f()
	c.free()
	return "" if ok else msg
