"""Sound for «БЛЭКАУТ. Эпизод 01»: dark drone, heartbeat, per-line SFX from src/script.js -> out/bN_mix.wav (48 kHz stereo).
No samples, no voice. Instruments are reused from ../chto-budet-esli/tools/audio.py."""
import os, sys, json, wave, importlib.util, numpy as np
ROOT = os.path.join(os.path.dirname(__file__), "..")
spec = importlib.util.spec_from_file_location("base", os.path.join(ROOT, "../chto-budet-esli/tools/audio.py")); B = importlib.util.module_from_spec(spec); spec.loader.exec_module(B)
SR = B.SR; tt, hz, noise, band, env = B.tt, B.hz, B.noise, B.band, B.env
BK = json.loads(open(os.path.join(ROOT, "src/script.js"), encoding="utf8").read().split("=", 1)[1])
LN, PARTS, DUR = BK["lines"], BK["parts"], BK["dur"]
M = B.Mix(DUR)

def drone(d, m=38, g=1.0):
    t = tt(d); x = sum(np.sin(2 * np.pi * hz(m + dm) * t * (1 + .0015 * i) + i) / (1 + i * .6) for i, dm in enumerate((0, 0, 7, 12, 19)))
    return x * (.75 + .25 * np.sin(2 * np.pi * .13 * t)) * g / 3
def heart(g=1.0): a = B.thud(1.0, 48, .22); b = B.thud(.6, 42, .22); x = np.zeros(int(.5 * SR)); x[:len(a)] += a; o = int(.2 * SR); x[o:o + len(b)] += b; return x * g
def strings(ms, d, g=1.0):
    t = tt(d); x = sum(sum(np.sin(2 * np.pi * hz(m) * k * t * (1 + .003 * j)) / k for k in (1, 2, 3, 4)) for j, m in enumerate(ms))
    return np.tanh(x * .25) * np.clip(t / (d * .6), 0, 1) ** 1.5 * np.clip((d - t) / .15, 0, 1) * g
def hum(d): t = tt(d); return (np.sin(2 * np.pi * 50 * t) + .5 * np.sin(2 * np.pi * 100 * t) + .25 * np.sin(2 * np.pi * 150 * t)) * .5
def boom(g=1.0): t = tt(1.6); return g * (np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-t / .05)) / SR) * np.exp(-t / .45) + .5 * band(noise(1.6), 60, 900) * np.exp(-t / .12))
def swell(d=.45): x = band(noise(d), 300, 5000); t = tt(d); return x * (t / d) ** 3 * .5
def powerdown(d=1.1, f0=420): t = tt(d); f = f0 * np.exp(-t * 3.2) + 30; return (np.sin(2 * np.pi * np.cumsum(f) / SR) + .4 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.clip((d - t) / .3, 0, 1) * .7
def buzz(d=.5): t = tt(d); gate = (np.sin(2 * np.pi * 17 * t + 3 * np.sin(2 * np.pi * 3 * t)) > .1); return np.tanh(np.sin(2 * np.pi * 100 * t) * 4) * gate * .35 * np.clip((d - t) / .05, 0, 1)
def softtick(): return band(noise(.03), 1500, 6000) * env(.03, .0005, .006) * .8
def tone(f, d, g=1.0): t = tt(d); return np.sin(2 * np.pi * f * t) * np.clip(t / .008, 0, 1) * np.clip((d - t) / .02, 0, 1) * g
def knock3():
    x = np.zeros(int(.8 * SR)); k = B.thud(.9, 150, .12); c = band(noise(.05), 400, 2500) * env(.05, .001, .012)
    for i in range(3): o = int(i * .19 * SR); x[o:o + len(k)] += k; x[o:o + len(c)] += c
    return x
def clunk(): x = B.thud(1.3, 70, .5); c = band(noise(.3), 300, 3000) * env(.3, .001, .05); x[:len(c)] += c; r = B.bell(52, .5) * .25; x[:len(r)] += r[:len(x)]; return x

# ---------- music bed ----------
wave_i = next(i for i, l in enumerate(LN) if l["fx"] == "wave"); T_OFF = LN[wave_i - 1]["t"] + .3   # the moment the light goes out
M.m(0, drone(DUR, 38), .5)
M.m(0, hum(T_OFF) * np.clip(tt(T_OFF) / 2, 0, 1), .12)                      # mains hum: only while there is power
for i in range(int(T_OFF / 2)): M.m(i * 2 + 1.0, B.musicbox([74, 77, 81, 77][i % 4], 1.5), .12, pan=.3)   # last calm notes
# heartbeat: starts after the blackout, speeds up through part 3
t = T_OFF + 1.0
while t < DUR - 3.4:
    prog = (t - T_OFF) / (DUR - T_OFF); M.m(t, heart(), .5 + .35 * prog); t += 1.15 - .45 * prog
for (a, b), root in zip(PARTS, (50, 51, 53)):                                # a rising cluster through every part
    M.m(a + 2, strings([root, root + 1, root + 7], b - a - 4.4), .16); M.m((a + b) / 2, strings([root + 12, root + 13], (b - a) / 2 - 2.4), .12)
for i in range(int((DUR - T_OFF) / .5)):                                      # clock tick, the only "tempo"
    tk = T_OFF + i * .5; M.m(tk, softtick(), .12 if i % 2 else .2, pan=-.4 if i % 2 else .4)

# ---------- per-line sound ----------
for l in LN:
    t0, s, red = l["t"], l["sfx"], "^" in l["text"]
    if l["text"]: M.s(t0, softtick(), .5)
    if s == "chime": M.s(t0, B.bell(86, 1.0), .22); M.s(t0 + .08, B.bell(93, 1.0), .14)
    if s == "card": M.s(t0, band(noise(.12), 600, 5000) * env(.12, .001, .03), .7); M.s(t0, B.thud(.5, 110, .12), .5)
    if s == "buzz": M.s(t0 + .1, buzz(l["d"] - .2), .6)
    if s in ("hit", "hit2"): M.s(t0 - .42, swell(.42), .7); M.s(t0, boom(), 1.0 if s == "hit" else .8); M.duck(t0 - .5, t0 - .02, .15, .1)
    if s == "whoosh": M.s(t0, B.whoosh(.7, 200, 3000), .7)
    if s == "msg": M.s(t0 + .05, tone(1175, .09), .3); M.s(t0 + .16, tone(1568, .14), .3)
    if s == "liftrun": M.s(t0, hum(2.2) * np.clip(tt(2.2) / .3, 0, 1) * np.clip((2.2 - tt(2.2)) / .1, 0, 1), .25); M.s(t0 + .5, tone(880, .12), .2)
    if s == "powerdown": M.s(t0 + .3, powerdown(1.0), .8); M.s(t0 + .3, B.click(), .6)
    if s == "powerdown2": M.s(t0, powerdown(1.5, 300), 1.0); M.s(t0 + .4, boom(.7), .8)
    if s == "clunk": M.s(t0 + .1, clunk(), 1.0)
    if s == "rule": M.s(t0, B.thud(1.1, 70, .3), .8); M.s(t0, B.brass([50, 57], .5), .25)
    if s == "drain": [M.s(t0 + .15 + i * .14, tone(900 - i * 90, .07), .22) for i in range(6)]
    if s == "dial": [M.s(t0 + .1 + i * .11, tone([697, 770, 852, 941][i % 4] , .07), .2) for i in range(5)]
    if s == "beep": M.s(t0 + .05, tone(425, .45), .25); M.s(t0 + .65, tone(425, .35), .25)
    if s == "beepfail": [M.s(t0 + .05 + i * .22, tone(425, .13), .28) for i in range(4)]
    if s == "deadclick": [M.s(t0 + dt, B.click(), .7) for dt in ((.3, .75) if l["fx"] == "press" else (.15, .4, .65))]
    if s == "thud": M.s(t0 + .15, B.thud(1.2, 60, .35), .9); M.s(t0 + .55, B.thud(.8, 60, .3), .7)
    if s == "knock": M.s(t0 + .08, knock3(), .9, pan=.3)
    if s == "lowbat": M.s(t0 + .1, tone(660, .12), .3); M.s(t0 + .28, tone(440, .22), .3)
    if s == "end": M.s(t0, boom(1.1), 1.0); M.s(t0 + .1, B.bell(50, 2.5), .3); M.duck(t0 + .1, t0 + l["d"], .35, .3)
# the instant of the blackout: everything electric drops out
M.duck(T_OFF, T_OFF + .9, .0, .03)

x = M.bus['mus'] * .9 + M.bus['sfx']; pk = np.max(np.abs(x)) + 1e-9; x = np.tanh(x / pk * 1.5) / np.tanh(1.5) * .89
os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
for i, (a, b) in enumerate(PARTS):
    y = x[int(a * SR):int(b * SR)].copy(); f = int(.03 * SR); y[:f] *= np.linspace(0, 1, f)[:, None]; g = int(.25 * SR); y[-g:] *= np.linspace(1, 0, g)[:, None]
    with wave.open(os.path.join(ROOT, f'out/b{i + 1}_mix.wav'), 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
    print('part', i + 1, round(b - a, 2), 's')
