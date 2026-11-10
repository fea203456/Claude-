"""Synthesize cartoon music + SFX for each part from the shared cue sheet (src/cues.js) -> out/pN_mix.wav (48 kHz stereo).
No samples: everything is generated here. usage: python3 tools/audio.py [1 2 3]"""
import os, sys, json, wave, numpy as np
ROOT = os.path.join(os.path.dirname(__file__), ".."); SR = 48000
CUES = json.loads(open(os.path.join(ROOT, "src/cues.js")).read().split("=", 1)[1].strip().rstrip(";"))
BEAT = 0.5
rs = np.random.RandomState(11)
tt = lambda d: np.arange(int(d * SR)) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
noise = lambda d: rs.randn(int(d * SR))

def env(d, a=.003, r=None, curve=4.0):
    t = tt(d); e = np.exp(-curve * t / d) if r is None else np.exp(-t / r)
    return e * np.clip(t / a, 0, 1) * np.clip((d - t) / .004, 0, 1)
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = 1 / (1 + (lo / np.maximum(f, 1)) ** 4) / (1 + (f / hi) ** 4)
    return np.fft.irfft(X * m, len(x))
def sweep(f0, f1, d, shape=(1, .4, .2), curve='exp', a=.01, vib=0):
    t = tt(d); k = t / d; f = f0 * (f1 / f0) ** k if curve == 'exp' else f0 + (f1 - f0) * k
    f = f * (1 + vib * np.sin(2 * np.pi * 6 * t)); ph = 2 * np.pi * np.cumsum(f) / SR
    return sum(g * np.sin(ph * (i + 1)) for i, g in enumerate(shape)) * np.clip(t / a, 0, 1) * np.clip((d - t) / .03, 0, 1)

# ---------- instruments ----------
def kick(g=1.0): t = tt(.3); f = 50 + 120 * np.exp(-t / .03); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .1) + .2 * band(noise(.3), 1500, 6000) * np.exp(-t / .004)) * g
def snare(): x = band(noise(.18), 900, 7000) * env(.18, .001, .04) * .8; t = tt(.18); return x + np.sin(2 * np.pi * 190 * t) * np.exp(-t / .03) * .5
def hat(d=.04, g=1): return band(noise(d), 7000, 15000) * env(d, .001, d / 4) * g
def shaker(): return band(noise(.08), 4000, 12000) * env(.08, .02, .02) * .5
def pluck(m, d=.28, bright=1.0): t = tt(d); f = hz(m); return sum(a * np.sin(2 * np.pi * f * (k + 1) * t) * np.exp(-t * (6 + k * 6 / bright)) for k, a in enumerate((1, .5, .3, .15, .08))) * np.clip(t / .002, 0, 1)
def marimba(m, d=.35): t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + .25 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t / .02)) * np.exp(-t / .12) * np.clip(t / .001, 0, 1)
def pizz(m, d=.3): t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + .4 * np.sin(4 * np.pi * f * t) * np.exp(-t / .05)) * np.exp(-t / .09) * np.clip(t / .002, 0, 1)
def bass(m, d): t = tt(d); f = hz(m); x = sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (k - 1) * 8) for k in range(1, 6)); return np.tanh(x * 1.4) * env(d, .004, None, 2.5)
def bell(m, d=1.0): t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + .45 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .15) + .25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / .05)) * np.exp(-t / (d / 4)) * np.clip(t / .002, 0, 1)
def musicbox(m, d=.9): t = tt(d); f = hz(m); return (np.sin(2 * np.pi * f * t) + .3 * np.sin(2 * np.pi * f * 3 * t) * np.exp(-t / .08)) * np.exp(-t / .3) * np.clip(t / .001, 0, 1)
def pad(ms, d, g=1.0): t = tt(d); x = sum(np.sin(2 * np.pi * hz(m) * t * (1 + .002 * i)) + .3 * np.sin(4 * np.pi * hz(m) * t) for i, m in enumerate(ms)); return x * np.clip(t / .4, 0, 1) * np.clip((d - t) / .5, 0, 1) * g / len(ms)
def brass(ms, d=.5): t = tt(d); x = sum(sum(a * np.sin(2 * np.pi * hz(m) * (k + 1) * t) for k, a in enumerate((1, .7, .5, .35, .2))) for m in ms); return np.tanh(x * .5) * env(d, .01, None, 3)

# ---------- SFX ----------
def whoosh(d=.45, f0=300, f1=4000, g=1.0):
    x = noise(d); n = len(x); t = np.arange(n) / n; y = np.zeros(n); lo = bp = 0.0
    fc = f0 * (f1 / f0) ** np.sin(np.pi * t); k = 2 * np.sin(np.pi * np.minimum(fc, 11000) / SR)
    for i in range(n): lo += k[i] * bp; hp = x[i] - lo - .5 * bp; bp += k[i] * hp; y[i] = bp
    return y * np.sin(np.pi * t) ** 1.5 * .5 * g
def pop(f=600, d=.09, g=1): t = tt(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t / .01))) / SR) * env(d, .001, .025) * g
def thud(g=1.0, f=70, d=.3): t = tt(d); return g * (np.sin(2 * np.pi * np.cumsum(f * (1 + 1.6 * np.exp(-t / .02))) / SR) * np.exp(-t / .08) + .4 * band(noise(d), 150, 2000) * np.exp(-t / .025))
def slap(g=1.0): t = tt(.25); return g * (band(noise(.25), 800, 6000) * np.exp(-t / .018) * 1.2 + thud(.8, 90, .25)[:len(t)])
def boing(f0=180, f1=520, d=.35): t = tt(d); f = f0 + (f1 - f0) * (1 - np.exp(-t / .05)); f = f * (1 + .25 * np.sin(2 * np.pi * 14 * t) * np.exp(-t / .12)); return np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, .002, .12)
def alarm(d):  # mechanical twin-bell ring: hammer at ~22 Hz on two inharmonic bells
    n = int(d * SR); x = np.zeros(n); per = int(SR / 22); b1 = bell(88, .25) + .7 * bell(91, .25)
    for i in range(0, n, per):
        seg_ = b1[: n - i] * (.8 + .2 * rs.rand()) * (1 if (i // per) % 2 else .8); x[i:i + len(seg_)] += seg_
    return np.tanh(x * .6) * np.clip(np.arange(n) / (.01 * SR), 0, 1) * np.clip((n - np.arange(n)) / (.02 * SR), 0, 1)
def scratch(): t = tt(.35); f = 900 * np.exp(-t / .1) + 120 + 600 * np.sin(2 * np.pi * 9 * t) * np.exp(-t / .15); return band(noise(.35), 300, 4000) * .6 * env(.35, .002, .15) + sweep(1200, 200, .35, (1, .5)) * .3 * np.exp(-t / .1)
def click(): x = pop(1600, .04, .4); x[:int(.03 * SR)] += band(noise(.03), 2000, 9000) * env(.03, .0005, .005) * 1.2; return x
def ding(m=96): return bell(m, 1.2)
def swish(d=.5): return band(noise(d), 2500, 9000) * np.sin(np.pi * tt(d) / d) ** 2 * .6
def hiss(d=.7): return band(noise(d), 3000, 10000) * env(d, .05, None, 2) * .6
def engine(d): t = tt(d); f = 40 + 50 * np.clip(t / d, 0, 1); x = np.sin(2 * np.pi * np.cumsum(f) / SR); x = np.tanh(x * 3 + .3 * band(noise(d), 60, 400)); return x * np.clip(t / .2, 0, 1) * np.clip((d - t) / 1.0, 0, 1)
def kettle(d): t = tt(d); return sweep(1900, 2300, d, (1, .1)) * np.clip(t / .6, 0, 1) * np.clip((d - t) / .2, 0, 1) * (.6 + .4 * np.sin(2 * np.pi * 5 * t)) + band(noise(d), 3000, 8000) * .15
def brush(d): t = tt(d); return band(noise(d), 2500, 8000) * (.5 + .5 * np.sin(2 * np.pi * 9 * t)) * .5 * np.clip((d - t) / .05, 0, 1)
def tick(): return band(noise(.02), 3000, 9000) * env(.02, .0005, .003) + pop(2400, .02, .3)[:int(.02 * SR)]
def door_slam(): x = thud(1.3, 55, .5); x[:int(.4 * SR)] += band(noise(.4), 200, 3000) * env(.4, .001, .05) * .6; return x
def wahwah(start):  # sad trombone: 4 descending notes with wah
    x = []; notes = [(58, .42), (57, .42), (56, .42), (55, 1.3)]
    for m, d in notes:
        t = tt(d); f = hz(m) * (1 + (.03 * np.sin(2 * np.pi * 6 * t) if d > 1 else 0)); ph = 2 * np.pi * np.cumsum(f) / SR
        wah = .5 + .5 * np.sin(np.pi * np.clip(t / min(d, .4), 0, 1))
        y = sum(a * np.sin(ph * (k + 1)) for k, a in enumerate((1, .8 * wah, .6 * wah, .4 * wah, .25 * wah))); x.append(np.tanh(y * .6) * env(d, .02, None, 1.5))
    return np.concatenate(x)
def yawn(): return sweep(330, 160, 1.0, (1, .5, .25), vib=.03) * .5
def slidewhistle(f0, f1, d): return sweep(f0, f1, d, (1, .05), vib=.01) * .5

class Mix:
    def __init__(self, dur): self.N = int(dur * SR); self.bus = {k: np.zeros((self.N, 2)) for k in ('mus', 'sfx')}
    def put(self, bus, t, x, g=1.0, pan=0.0):
        i = int(round(t * SR)); x = np.asarray(x, float)
        if i >= self.N: return
        if i < 0: x = x[-i:]; i = 0
        x = x[: self.N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        self.bus[bus][i:i + len(x), 0] += x * g * l * 1.414; self.bus[bus][i:i + len(x), 1] += x * g * r * 1.414
    def m(self, *a, **k): self.put('mus', *a, **k)
    def s(self, *a, **k): self.put('sfx', *a, **k)
    def duck(self, t0, t1, depth=.3, fade=.08):
        t = np.arange(self.N) / SR; g = 1 - (1 - depth) * np.clip(np.minimum((t - t0) / fade, (t1 - t) / fade), 0, 1)
        self.bus['mus'] *= g[:, None]
    def render(self, path):
        x = self.bus['mus'] * .8 + self.bus['sfx']
        # gentle glue: soft knee limiter + normalise
        pk = np.max(np.abs(x)) + 1e-9; x = x / pk * 1.4; x = np.tanh(x) / np.tanh(1.4) * .89
        n = len(x); fade = int(.02 * SR); x[:fade] *= np.linspace(0, 1, fade)[:, None]
        y = (np.clip(x, -1, 1) * 32767).astype('<i2')
        with wave.open(path, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())

# chord helpers (C major world): roots + triads in MIDI
CH = {'C': (48, [60, 64, 67]), 'G': (43, [59, 62, 67]), 'Am': (45, [60, 64, 69]), 'F': (41, [60, 65, 69]), 'Dm': (38, [62, 65, 69]), 'E': (40, [59, 64, 68])}
def groove(M, t0, t1, prog, level=1.0, drums=True, hats=True, melody=None, inst=pluck, bassline=True, kick4=False, sixteenth=False):
    nb = int(round((t1 - t0) / BEAT))
    for b in range(nb):
        t = t0 + b * BEAT; root, tri = CH[prog[(b // 4) % len(prog)]]
        if drums:
            if kick4 or b % 2 == 0: M.m(t, kick(), .8 * level)
            if b % 2 == 1: M.m(t, snare(), .45 * level)
        if hats:
            for h in range(4 if sixteenth else 2): M.m(t + h * BEAT / (4 if sixteenth else 2), hat(.03), (.22 if h % 2 else .12) * level, pan=.3)
        if bassline: M.m(t, bass(root + (12 if b % 2 else 0), BEAT * .9), .42 * level, pan=-.1)
        if melody is None:
            for j, mm in enumerate([tri[0], tri[2], tri[1], tri[2]][:2]): M.m(t + j * BEAT / 2, inst(mm + 12), .22 * level, pan=.25 * (1 if j else -1))
    if melody:
        for (bt, mm, d) in melody:
            tm = t0 + bt * BEAT
            if tm < t1: M.m(tm, inst(mm, d), .35 * level, pan=.15)

def part1():
    C = CUES['p1']; M = Mix(C['dur'])
    # night: ticking + music box lullaby
    for b in range(int(C['ring'] / BEAT)): M.s(b * BEAT, tick(), .25, pan=.5)
    for i, mm in enumerate([79, 76, 72, 76, 79, 84]): M.m(.25 + i * .45, musicbox(mm), .3, pan=-.2)
    # title letters landing
    for i in range(10): M.s(.25 + i * .05 + .22, pop(500 + i * 40, .07), .25, pan=-.3 + i * .06)
    for i in range(5): M.s(.75 + i * .05 + .22, pop(700 + i * 50, .07), .25)
    M.s(C['q'], pop(380, .14), .6); M.s(C['q'] + .05, swish(.3), .3)
    M.s(C['ring'] - .45, whoosh(.5, 200, 5000), .9)
    # ALARM 7:00
    r0, fz = C['ring'], C['freeze']
    M.s(r0, alarm(fz - r0), .32, pan=.35); M.m(r0, brass([60, 64, 67, 72], .5), .5); M.m(r0, kick(1.2), .9)
    groove(M, r0, C['armIn'], ['C', 'Am', 'F', 'G'], 1.0, sixteenth=True)
    for i in range(int((C['armIn'] - r0) / (BEAT * 2))): M.s(r0 + i * BEAT * 2, pop(300, .05), .0)
    M.s(C['mmm'], sweep(220, 180, .9, (1, .6, .3), vib=.02) * .25, 1.0, pan=-.4)
    # sneaky creep: pizzicato walk, no drums, rising tension
    walk = [45, 48, 50, 51, 52, 51, 50, 48]
    nb = int((fz - C['armIn']) / (BEAT / 2))
    for i in range(nb): M.m(C['armIn'] + i * BEAT / 2, pizz(walk[i % 8] + 12 * (i // 16)), .5, pan=-.2)
    for i in range(nb // 2): M.m(C['armIn'] + i * BEAT, hat(.02), .15)
    M.m(C['armIn'], slidewhistle(300, 700, fz - C['armIn']) * .25, 1.0)
    # FREEZE
    M.s(fz, scratch(), .9); M.duck(fz, fz + .7, 0.0, .02)
    M.s(fz + .05, thud(1.0, 60, .5), .7)
    M.s(C['split'], whoosh(.45, 400, 6000), .8); M.s(C['split'] + .3, pop(520, .12), .5, pan=-.4); M.s(C['split'] + .55, pop(420, .12), .5, pan=.4)
    for i in range(13): M.s(C['ask'] + i * .035 + .22, pop(600 + i * 30, .06), .18)
    # question groove: unresolved, ends on G
    groove(M, C['split'], C['dur'] - BEAT * 2, ['F', 'G', 'Am', 'G'], .75, inst=marimba, kick4=False)
    M.m(C['dur'] - BEAT * 2, brass([55, 59, 62, 67], 1.0), .4)
    M.s(C['cta'], pop(400, .14), .5)
    for tp, pan in ((C['tapA'], -.4), (C['tapB'], .4), (C['tapA2'], -.4)): M.s(tp, click(), .8, pan=pan); M.s(tp, marimba(84 if pan < 0 else 79), .4, pan=pan)
    M.s(C['next'], ding(91), .3)
    M.render(os.path.join(ROOT, 'out/p1_mix.wav'))

def part2():
    C = CUES['p2']; M = Mix(C['dur'])
    M.s(0, alarm(C['press']), .25, pan=.35)
    M.s(C['stamp'], thud(1.2, 60, .4), .9); M.s(C['stamp'], slap(.5), .5)
    M.s(C['color'], whoosh(.4, 500, 7000), .5)
    M.s(C['press'], click(), 1.0, pan=.35); M.m(C['press'], bell(84, 1.5), .35)
    M.s(C['kick'], whoosh(.45, 300, 3000), 1.0, pan=.4); M.s(C['kick'] + .1, boing(150, 600, .4), .6)
    M.s(C['kick'] + .55, thud(.7, 90, .25), .6)
    M.s(C['stretch'], yawn(), .9)
    M.s(C['hop'], boing(200, 500, .3), .5); M.s(C['hop'] + .45, thud(.8, 80, .3), .7)
    for i in range(3): M.s(C['hop'] + .6 + i * .3, pop(250, .05), .25)
    M.s(C['open'], swish(.6), .8); M.s(C['open'] + .1, swish(.5), .6, pan=.3)
    # sunny groove from press -> end, brighter after curtains
    M.m(C['press'], pad([60, 64, 67], C['open'] - C['press'], .5), .6)
    groove(M, C['press'], C['open'], ['C', 'F'], .5, drums=False, inst=marimba)
    M.m(C['open'], pad([72, 76, 79, 84], 2.5, .6), .5)
    for i, mm in enumerate([84, 88, 91, 96]): M.s(C['open'] + .05 + i * .07, bell(mm, 1.2), .2, pan=-.3 + i * .2)
    mel = [(0, 76, .3), (1, 79, .3), (2, 81, .3), (3, 79, .5), (4, 77, .3), (5, 76, .3), (6, 74, .3), (7, 72, .6),
           (8, 76, .3), (9, 79, .3), (10, 84, .4), (11, 83, .3), (12, 81, .3), (13, 79, .3), (14, 77, .3), (15, 76, .6)]
    groove(M, C['open'], C['dur'] - 1.0, ['C', 'Am', 'F', 'G'], .9, melody=[(b, m_, d) for b, m_, d in mel] + [(b + 16, m_, d) for b, m_, d in mel], inst=pluck)
    M.m(C['dur'] - 1.0, brass([48, 60, 64, 67, 72], 1.0), .55); M.m(C['dur'] - 1.0, kick(1.1), .8)
    M.s(C['whip'], whoosh(.55, 200, 7000), 1.1)
    M.s(C['pop'] - 1.2, kettle(1.8), .12, pan=-.5)
    M.s(C['pop'], pop(300, .12), .9); M.s(C['pop'] + .02, ding(100), .3); M.s(C['pop'], boing(250, 700, .3), .3)
    M.s(C['catch'], slap(.4), .5); M.s(C['catch'] + .3, band(noise(.12), 1500, 6000) * env(.12, .002, .03), .3)
    M.s(C['catch'] + .55, band(noise(.12), 1500, 6000) * env(.12, .002, .03), .3)
    M.s(C['plate'], pop(420, .14), .5)
    M.s(C['end'], thud(1.2, 60, .4), .8); M.s(C['end'] + 1.2, pop(380, .14), .5)
    M.render(os.path.join(ROOT, 'out/p2_mix.wav'))

def part3():
    C = CUES['p3']; M = Mix(C['dur']); SL, RG = C['slaps'], C['rings']
    M.s(C['stamp'], thud(1.2, 60, .4), .9); M.s(C['stamp'], slap(.5), .5); M.s(C['color'], whoosh(.4, 500, 7000), .5)
    M.s(0, alarm(SL[0]), .3, pan=.35)
    for i in range(1, len(SL)): M.s(RG[i], alarm(SL[i] - RG[i]), .32, pan=.35)
    for i, s in enumerate(SL): M.s(s, slap(1.0), .95, pan=.3); M.s(s + .02, pop(900 + i * 60, .1), .35)
    # lullaby that keeps getting interrupted and speeds up a semitone each loop
    for i in range(len(SL) - 1):
        a, b = SL[i] + .05, RG[i + 1]
        for j, mm in enumerate([72, 76, 79, 76, 72, 74]):
            tj = a + j * .18 * (1 - i * .08)
            if tj < b: M.m(tj, musicbox(mm + i), .3, pan=-.2)
    M.m(SL[0], pad([48, 55, 64], C['lastRing'] - SL[0], .4), .5)
    M.s(C['lastRing'], alarm(C['out'] - C['lastRing']), .3, pan=.35)
    M.s(C['zoomLCD'] - .2, whoosh(.35, 400, 6000), .9)
    M.s(C['shock'] - .2, whoosh(.25, 600, 8000), .8)
    M.s(C['shock'], brass([49, 55, 61, 67], .9), .9); M.s(C['shock'], kick(1.4), 1.0); M.s(C['shock'], scratch(), .3)
    M.s(C['shock'] + .1, slidewhistle(1200, 300, .5), .6)
    M.s(C['out'], whoosh(.4, 300, 3000), 1.0); M.s(C['out'] + .35, thud(.8, 80, .3), .7)
    # panic groove: double-time hats, minor
    groove(M, C['out'], C['close'], ['Am', 'F', 'Dm', 'E'], 1.0, sixteenth=True, kick4=True)
    for i in range(int((C['close'] - C['out']) / BEAT)): M.m(C['out'] + i * BEAT + BEAT / 2, pizz([69, 72, 76, 75][i % 4]), .35, pan=.3)
    M.s(C['out'] + .4, brush(C['socks'] - C['out'] - .4), .35, pan=-.2)
    n = int((C['toastT'] - C['socks']) * 11 / np.pi)
    for i in range(n): M.s(C['socks'] + i * np.pi / 11, boing(200 + i * 25, 420 + i * 25, .22), .3)
    M.s(C['toastT'], pop(300, .12), .8); M.s(C['toastT'] + .45, slap(.4), .4)
    M.s(C['door'], door_slam(), .8); M.s(C['door'] + .05, whoosh(.5, 200, 6000), .9)
    # street: running steps
    for i in range(int((C['stop'] - C['door']) / .15)): M.s(C['door'] + .3 + i * .15, thud(.25, 120, .08), .3, pan=(-.2 if i % 2 else .2))
    M.s(C['close'], hiss(.7), .7, pan=-.3); M.s(C['close'] + .25, thud(.6, 140, .2), .5, pan=-.3)
    M.s(C['busGo'] - .3, engine(3.2), .45, pan=-.5)
    M.m(C['close'] + .2, wahwah(0), .55); M.duck(C['close'], C['end'], .0, .05)
    M.s(C['stop'], thud(.5, 70, .3), .5)
    for i in range(3): M.s(C['stop'] + .3 + i * .7, sweep(260, 200, .35, (1, .4)) * .2, 1.0)
    # end card: comic cadence
    M.s(C['end'], thud(1.2, 60, .4), .8)
    groove(M, C['end'], C['dur'] - 1.0, ['F', 'G', 'C', 'C'], .65, inst=marimba)
    M.m(C['dur'] - 1.0, brass([48, 55, 60, 64, 67], 1.0), .5)
    M.s(C['end'] + .35, pop(420, .14), .5); M.s(C['end'] + 1.1, pop(380, .14), .5)
    M.render(os.path.join(ROOT, 'out/p3_mix.wav'))

if __name__ == '__main__':
    os.makedirs(os.path.join(ROOT, 'out'), exist_ok=True)
    for p in (sys.argv[1:] or ['1', '2', '3']): {'1': part1, '2': part2, '3': part3}[p](); print('part', p, 'ok')
