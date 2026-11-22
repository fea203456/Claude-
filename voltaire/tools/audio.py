"""Music + SFX synthesis on the film's timeline, mixed with the narration -> out/mix.wav (48 kHz stereo).
No samples: every instrument and effect is synthesized here. Event times come from the shared timeline."""
import os, json, wave, numpy as np
ROOT = os.path.join(os.path.dirname(__file__), ".."); SR = 48000; DUR = 62.6; N = int(DUR * SR)
rs = np.random.RandomState(11)
mus, sfx = np.zeros((N, 2)), np.zeros((N, 2))
def put(bus, t, x, g=1.0, pan=0.0, wrap=False):
    i = int(round(t * SR)); x = np.asarray(x, float)
    if x.ndim == 1: l, r = np.cos((pan + 1) * np.pi / 4) * 1.414, np.sin((pan + 1) * np.pi / 4) * 1.414; x2 = np.stack([x * l, x * r], 1)
    else: x2 = x
    x2 = x2 * g
    if i < 0: x2 = x2[-i:]; i = 0
    n = min(len(x2), N - i)
    if n > 0: bus[i:i + n] += x2[:n]
    if wrap and len(x2) > n: rest = x2[n:]; bus[:len(rest)] += rest[:N]   # loop tail wraps to the start
tt = lambda d: np.arange(int(d * SR)) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def band(x, lo, hi, o=6):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = 1 / (1 + (lo / np.maximum(f, 1)) ** o) / (1 + (f / hi) ** o); return np.fft.irfft(X * m, len(x))
def formant(x, peaks):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = sum(a / (1 + ((f - fc) / bw) ** 2) for fc, bw, a in peaks); return np.fft.irfft(X * m, len(x))
noise = lambda d: rs.randn(int(d * SR))
def env(d, a=.003, r=None, curve=4.0):
    t = tt(d); e = np.exp(-curve * t / d) if r is None else np.exp(-t / r); return e * np.clip(t / a, 0, 1) * np.clip((d - t) / .006, 0, 1)
# ---------------- instruments ----------------
def harpsi(m, d=1.2, g=1.0, bright=1.0):
    t = tt(d); f = hz(m); x = np.zeros_like(t); p = .13
    for n in range(1, 26):
        fn = f * n * (1 + .0004 * n * n)
        if fn > 16000: break
        a = abs(np.sin(np.pi * n * p)) / n ** (.55 / bright) * np.exp(-t * (1.6 + n * .55))
        x += a * (np.sin(2 * np.pi * fn * t) + .6 * np.sin(2 * np.pi * fn * 1.0017 * t + n))
    x += band(noise(.03), 1500, 9000)[:len(t)].__array__() * 0 if False else 0
    click = np.zeros_like(t); c = band(noise(.012), 2000, 10000) * env(.012, .0003, .003); click[:len(c)] = c
    return (x * .22 + click * .25) * np.clip(t / .0015, 0, 1) * g
def pizz(m, d=.6, g=1.0):
    t = tt(d); f = hz(m) * (1 + .012 * np.exp(-t / .02)); x = sum((1 / n ** 1.2) * np.exp(-t * (5 + n * 2.2)) * np.sin(2 * np.pi * np.cumsum(f * n) / SR) for n in range(1, 10))
    return x * np.clip(t / .004, 0, 1) * g * .5
def kick(g=1.0): t = tt(.36); f = 44 + 120 * np.exp(-t / .03); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .12) + .2 * band(noise(.36), 1500, 6000) * np.exp(-t / .004)) * g
def snare(g=1.0): t = tt(.25); return (band(noise(.25), 900, 6000) * np.exp(-t / .045) * .9 + np.sin(2 * np.pi * 190 * t) * np.exp(-t / .03) * .5) * g
def rim(g=1.0): t = tt(.08); return (band(noise(.08), 1800, 7000) * np.exp(-t / .008) + np.sin(2 * np.pi * 1700 * t) * np.exp(-t / .012) * .5) * g
def hat(d=.05, g=1.0): return band(noise(d), 7000, 16000) * env(d, .0008, d / 4) * g
def timp(m, d=1.8, g=1.0):
    t = tt(d); f = hz(m) * (1 + .03 * np.exp(-t / .08)); x = sum(a * np.exp(-t * dec) * np.sin(2 * np.pi * np.cumsum(f * r) / SR) for r, a, dec in ((1, 1, 2.2), (1.5, .5, 3.5), (1.98, .35, 4.5), (2.44, .2, 6)))
    return (x + band(noise(d), 80, 1200) * np.exp(-t / .03) * .6) * np.clip(t / .002, 0, 1) * g * .6
def cymbal(d=2.2, g=1.0, swell=0): t = tt(d); e = np.exp(-t / (d / 4)) if not swell else (t / d) ** 2 * np.clip((d - t) / .02, 0, 1); return band(noise(d), 4000, 15000) * e * g * .5
def brass(m, d=.5, g=1.0, vib=0):
    t = tt(d); f = hz(m) * (1 + vib * .006 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / .2, 0, 1)); ph = 2 * np.pi * np.cumsum(f) / SR
    br = .35 + .65 * np.clip(t / .05, 0, 1) * np.exp(-t / .6)
    x = sum((1 / n) * br ** (n * .5) * np.sin(ph * n) for n in range(1, 14))
    return x * np.clip(t / .02, 0, 1) * np.clip((d - t) / .05, 0, 1) * g * .4
def strings(ms, d, g=1.0, trem=0, att=.3):
    t = tt(d); x = np.zeros_like(t)
    for m in ms:
        for dt in (-.004, 0, .005):
            f = hz(m) * (1 + dt); x += sum((1 / n) * np.sin(2 * np.pi * f * n * t + n * dt * 100) for n in range(1, 9))
    if trem: x *= .55 + .45 * np.sin(2 * np.pi * trem * t)
    x = band(x, 180, 5000, 4)
    return x * np.clip(t / att, 0, 1) * np.clip((d - t) / .25, 0, 1) * g * .06
def choir(ms, d, g=1.0):
    t = tt(d); x = np.zeros_like(t)
    for m in ms:
        for dt in (-.006, -.002, .003, .007):
            f = hz(m) * (1 + dt) * (1 + .004 * np.sin(2 * np.pi * (5 + dt * 300) * t)); ph = 2 * np.pi * np.cumsum(f) / SR; x += sum((1 / n) * np.sin(ph * n) for n in range(1, 30) if hz(m) * n < 12000)
    x = formant(x, [(800, 90, 1.0), (1150, 110, .6), (2900, 200, .25), (3300, 250, .15)])
    return x * np.clip(t / .12, 0, 1) * np.clip((d - t) / .5, 0, 1) * g * .05
def bassoon(m, d, g=1.0):
    t = tt(d); f = hz(m) * (1 + .01 * np.sin(2 * np.pi * 5 * t) * np.clip((t - .15) / .2, 0, 1)); ph = 2 * np.pi * np.cumsum(f) / SR
    x = sum((1 / n ** .8) * np.sin(ph * n) for n in range(1, 16, 1)); x = formant(x, [(480, 120, 1.0), (1150, 200, .35)])
    return x * np.clip(t / .03, 0, 1) * np.clip((d - t) / .06, 0, 1) * g * .35
def bell(m, d=1.4, g=1.0): t = tt(d); f = hz(m); return g * (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .12) + .3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / .05)) * np.exp(-t / (d / 5)) * np.clip(t / .002, 0, 1) * .5
def woodblock(f=900, g=1.0): t = tt(.12); return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 2.3 * t)) * np.exp(-t / .018) * g * .6
# ---------------- SFX ----------------
def whoosh(d=.5, f0=400, f1=5000, peak=.55):
    x = noise(d); n = len(x); t = np.arange(n) / n; fc = f0 * (f1 / f0) ** (1 - np.abs(t - peak) / max(peak, 1 - peak))
    # time-varying bandpass via short-time FFT blocks
    y = np.zeros(n); B = 1024
    for i in range(0, n, B // 2):
        seg = x[i:i + B]; 
        if len(seg) < 16: break
        w = np.hanning(len(seg)); c = fc[min(n - 1, i + len(seg) // 2)]; y[i:i + len(seg)] += band(seg * w, c * .6, c * 1.6, 2)
    return y * np.sin(np.pi * t) ** 1.5 * .9
def thud(g=1.0, f=70, d=.4): t = tt(d); return g * (np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t / .02))) / SR) * np.exp(-t / .09) + .5 * band(noise(d), 150, 1800) * np.exp(-t / .03))
def paper(d=.25, g=1.0, lo=1500, hi=9000): x = band(noise(d), lo, hi); n = len(x); e = np.abs(band(noise(d), 5, 40, 2)); e /= e.max() + 1e-9; return x * e * np.sin(np.pi * np.arange(n) / n) ** .5 * g * .6
def crumple(d=.35, g=1.0): t = tt(d); x = np.zeros(len(t)); r = np.random.RandomState(3)
for_ = None
def crackle(d, rate, g=1.0, lo=1500, hi=8000, seed=1):
    r = np.random.RandomState(seed); x = np.zeros(int(d * SR)); k = int(d * rate)
    for i in range(k): p = r.randint(0, len(x) - 600); c = band(r.randn(500), lo, hi) * np.exp(-np.arange(500) / (40 + r.rand() * 120)) * (.3 + r.rand()); x[p:p + 500] += c
    return x * g
def scratch(d, g=1.0): t = tt(d); x = band(noise(d), 2500, 8000) * (.5 + .5 * np.abs(np.sin(2 * np.pi * 7 * t))) * (.6 + .4 * np.abs(np.sin(2 * np.pi * 2.3 * t))); return x * np.clip(t / .02, 0, 1) * np.clip((d - t) / .05, 0, 1) * g * .5
def coin(g=1.0, f=2800):
    t = tt(.8); x = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t / dec) for r, a, dec in ((1, 1, .25), (1.47, .6, .18), (2.09, .4, .12), (2.76, .3, .08))); return x * np.clip(t / .001, 0, 1) * g * .25
def coins(n, d, g=1.0, seed=2):
    r = np.random.RandomState(seed); x = np.zeros(int((d + .8) * SR))
    for i in range(n): p = int(r.rand() * d * SR); c = coin(.4 + r.rand() * .6, 2200 + r.rand() * 1800); x[p:p + len(c)] += c
    return x * g
def kaching(): x = np.zeros(int(1.2 * SR)); a = bell(95, 1.1, .7); b = bell(100, 1.1, .7); x[:len(a)] += a; o = int(.08 * SR); x[o:o + len(b)] += b[:len(x) - o]; c = coins(8, .25, .8, 5); x[:len(c)] += c[:len(x)]; return x
def pop(f=700, d=.09): t = tt(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-t / .012))) / SR) * env(d, .001, .022)
def knock(): return thud(.8, 160, .18) + .4 * band(noise(.18), 300, 2500) * env(.18, .001, .02)
def creak(d=.6, f=320, g=1.0): t = tt(d); fm = f * (1 + .3 * np.sin(2 * np.pi * 3 * t)); x = np.sign(np.sin(2 * np.pi * np.cumsum(fm) / SR)) * (.5 + .5 * np.sin(2 * np.pi * 37 * t)); return band(x, 400, 3000) * np.sin(np.pi * t / d) * g * .15
def rumble(d, g=1.0): t = tt(d); return band(noise(d), 40, 300, 3) * (.7 + .3 * np.sin(2 * np.pi * 6 * t)) * np.sin(np.pi * t / d) ** .3 * g
def murmur(d, g=1.0, seed=4):
    r = np.random.RandomState(seed); x = np.zeros(int(d * SR))
    for i in range(int(d * 14)):
        L = int((.12 + r.rand() * .25) * SR); p = r.randint(0, max(1, len(x) - L)); f0 = 110 + r.rand() * 120; tl = np.arange(L) / SR
        v = sum((1 / n) * np.sin(2 * np.pi * f0 * n * tl * (1 + .05 * np.sin(2 * np.pi * 4 * tl))) for n in range(1, 12)); v = formant(v, [(500 + r.rand() * 400, 120, 1), (1200 + r.rand() * 800, 200, .5)])
        x[p:p + L] += v * np.sin(np.pi * tl / tl[-1]) * (.3 + r.rand() * .4)
    return band(x, 150, 3500) * g * .25
# ---------------- MUSIC ----------------
BPM = 100; BEAT = 60 / BPM; S16 = BEAT / 4
DM = {'Dm': (50, [62, 65, 69]), 'Bb': (46, [62, 65, 70]), 'Gm': (43, [62, 67, 70]), 'A7': (45, [61, 64, 67]), 'D': (50, [62, 66, 69]), 'G': (43, [62, 67, 71]), 'A': (45, [61, 64, 69]), 'Bm': (47, [62, 66, 71]), 'F': (41, [60, 65, 69]), 'C': (48, [60, 64, 67])}
def chord_at(prog, b): return DM[prog[(b // 4) % len(prog)]]
def section(t0, t1, prog, drums='bap', harp='arp', bass='walk', level=1.0, hat16=False):
    nb = int((t1 - t0) / BEAT + 1e-6)
    for b in range(nb):
        t = t0 + b * BEAT; root, ch = chord_at(prog, b); bb = b % 4
        if drums == 'bap':
            if bb in (0,) or (bb == 2): put(mus, t, kick(), .8 * level)
            if bb == 2: put(mus, t + BEAT * .5, kick(.55), .55 * level)
            if bb in (1, 3): put(mus, t, snare(), .5 * level, .1)
            for s in range(4 if hat16 else 2): put(mus, t + s * BEAT / (4 if hat16 else 2), hat(), (.2 if s % 2 == 0 else .11) * level, -.3)
        elif drums == 'light':
            if bb == 0: put(mus, t, kick(.6), .5 * level)
            if bb in (1, 3): put(mus, t, rim(), .32 * level, .2)
            for s in range(2): put(mus, t + s * BEAT / 2, hat(.04), .1 * level, -.3)
        elif drums == 'half':
            if bb == 0: put(mus, t, kick(.7), .55 * level)
            if bb == 2: put(mus, t, snare(.6), .32 * level, .1)
            put(mus, t, hat(.04), .08 * level, -.3)
        if harp == 'arp':
            pat = [0, 2, 1, 2, 0, 2, 1, 2]
            for s in range(4):
                n = ch[pat[(b * 4 + s) % 8]] + (12 if (b * 4 + s) % 8 in (2, 6) else 0)
                put(mus, t + s * S16, harpsi(n, .9), .34 * level, .25)
        elif harp == 'sneak':
            seq = [ch[0], ch[1] + 12, ch[2], ch[1] + 12]
            for s in range(4): put(mus, t + s * S16, harpsi(seq[s] - (12 if s % 2 == 0 else 0), .7, bright=.8), .3 * level, .3)
        elif harp == 'chords' and bb in (0, 2): 
            for k, n in enumerate(ch): put(mus, t + k * .012, harpsi(n, 1.4), .2 * level, .2)
        if bass == 'walk':
            notes = {0: root, 1: root + 7, 2: root + 12, 3: root + 7}
            put(mus, t, pizz(notes[bb] - 12, .5), .9 * level, -.15)
            if bb == 3: put(mus, t + BEAT / 2, pizz(root - 12 + 10, .3), .5 * level, -.15)
        elif bass == 'pulse': put(mus, t, pizz(root - 12, .45), .8 * level, -.15)
# 1) sneak intro (also the loop outro)
SNEAK = ['Dm', 'Dm', 'Gm', 'A7']
section(0, 2.93, SNEAK, drums=None, harp='sneak', bass='pulse', level=.9)
for i in range(int(2.93 / (BEAT / 2))): put(mus, i * BEAT / 2, rim(.4), .18, .4)
# 2) groove A from the drop
put(mus, 2.93, kick(1.3), 1.0); put(mus, 2.93, timp(38, 1.6), .9); put(mus, 2.93, cymbal(1.6), .5); put(mus, 2.93, pizz(26, .8), 1.0)
section(2.93, 16.6, ['Dm', 'Bb', 'Gm', 'A7'], 'bap', 'arp', 'walk', 1.0)
put(mus, 5.15, bell(86, 2.0), .25, .4); put(mus, 5.15 + .3, bell(81, 2.0), .2, .4)   # Paris bells
put(mus, 9.13, cymbal(.9), .25)
for i, m in enumerate((69, 74, 78)): put(mus, 11.87 + i * .12, brass(m, .14 if i < 2 else .5, 1, vib=i == 2), .55, .1)   # lottery ta-da
put(mus, 15.77, bell(93, 1.6), .45, .2)                                                                                # bonus ding
# 3) explainer
section(16.66, 25.06, ['Dm', 'Bb', 'C', 'A7'], 'light', 'chords', 'walk', .85)
for i in range(int((25.06 - 16.66) / S16)):
    t = 16.66 + i * S16; root, ch = chord_at(['Dm', 'Bb', 'C', 'A7'], int(i / 4)); put(mus, t, pizz(ch[i % 3] + 12, .25), .18, .35)
x = np.linspace(0, 1, int(1.48 * SR)); put(mus, 25.06, band(noise(1.48), 800, 9000) * x ** 2.5 * .35)                  # riser into the slam
put(mus, 25.06, strings([62, 65, 69], 1.48, .7, trem=14, att=1.2), 1)
# 4) the slam
put(mus, 26.54, timp(38, 2.0), 1.2); put(mus, 26.54, kick(1.4), 1.0); put(mus, 26.54, cymbal(2.5), .6); put(mus, 26.54, brass(50, .6), .6); put(mus, 26.54, brass(57, .6), .5)
put(mus, 26.9, strings([50, 57], 1.3, .6, att=.05), 1)
# 5) the reveal: sparse notes
put(mus, 28.19, harpsi(62, 2.0), .5); put(mus, 28.2, harpsi(65, 2.0), .35); put(mus, 28.7, pizz(38, 1.0), .7)
put(mus, 28.19, strings([38, 45], 3.0, .5, att=.8), 1)
put(mus, 29.71, harpsi(69, 2.0), .45); put(mus, 29.71, harpsi(74, 2.0), .45); put(mus, 29.72, bell(98, 1.8), .25)
put(mus, 30.57, harpsi(73, 1.2), .35); put(mus, 30.8, harpsi(74, 1.2), .3)
# 6) heist
put(mus, 31.62, kick(1.3), .9); put(mus, 31.62, strings([50, 57, 62], .35, 1.2, att=.01), 1)
section(31.62, 35.53, ['Dm', 'Dm', 'Bb', 'A7'], 'bap', 'arp', 'walk', 1.05, hat16=True)
for k in range(int((35.53 - 31.62) / BEAT / 4) + 1): put(mus, 31.62 + k * 4 * BEAT, strings([62, 69], .3, 1.2, att=.01), 1)
# 7) month hits
for th in (35.57, 37.20, 37.83): put(mus, th, timp(38, 1.0), 1.0); put(mus, th, brass(62, .35), .6); put(mus, th, brass(57, .35), .5); put(mus, th, kick(1.2), .8); put(mus, th, cymbal(.8), .3)
for i in range(int((38.7 - 35.57) / (BEAT / 2))): put(mus, 35.57 + i * BEAT / 2, hat(), .12, -.3)
put(mus, 35.57, pizz(38, .8), .9); put(mus, 37.2, pizz(45, .8), .9); put(mus, 37.83, pizz(38, .8), .9)
# 8) pompous motto: trumpet fanfare in D under the motto, then a sour note
section(38.78, 41.88, ['D', 'G', 'A', 'D'], 'light', 'chords', 'pulse', .7)
mel = [(39.97, 69, .2), (40.17, 74, .2), (40.37, 78, .35), (40.72, 76, .2), (40.92, 74, .2), (41.12, 81, .5)]
for t, m, d in mel: put(mus, t, brass(m, d + .05, vib=d > .3), .38, .15)
put(mus, 41.55, brass(80, .35, vib=1), .3, .15)
# 9) court: timpani roll + tremolo crescendo
d = 44.5 - 41.97; t = tt(d); roll = np.zeros(len(t))
for i in range(int(d / .055)): c = timp(38, .3, .3 + .7 * i * .055 / d); p = int(i * .055 * SR); roll[p:p + len(c)] += c[:len(roll) - p]
put(mus, 41.97, roll, .55); put(mus, 41.97, strings([50, 53, 56], d, 1.1, trem=12, att=d * .8), 1); put(mus, 42.13, kick(1.3), .8)
# 10) tension: clock + heartbeat, then silence
for i in range(int((48.4 - 44.5) / BEAT)): put(mus, 44.5 + i * BEAT, kick(.5), .35); put(mus, 44.5 + i * BEAT + .16, kick(.35), .22)
put(mus, 44.5, strings([74, 77], 3.6, .6, trem=8, att=2.5), 1)
put(mus, 48.41, pizz(50, .4), .7)
# 11) the verdict
put(mus, 49.09, timp(38, 2.4), 1.2); put(mus, 49.09, cymbal(3.0), .5); put(mus, 48.6, cymbal(.5, swell=1), .25)
for k, n in enumerate((50, 57, 62, 66, 69, 74)): put(mus, 49.09 + k * .015, harpsi(n, 2.2), .35, .2)
put(mus, 49.09, choir([62, 66, 69, 74], 2.6, 1.3), 1); put(mus, 49.09, brass(62, 1.2, vib=1), .4); put(mus, 49.09, brass(66, 1.2, vib=1), .3)
section(49.9, 53.17, ['D', 'G', 'A', 'D'], 'bap', 'arp', 'walk', .75)
for i, m in enumerate((57, 56, 55)): put(mus, 50.25 + i * .32, bassoon(m, .3 if i < 2 else .9), .9, -.2)   # the minister leaves
for i in range(int((53.0 - 51.35) / (BEAT / 2))): put(mus, 51.35 + i * BEAT / 2, woodblock(820 if i % 2 else 1080), .45, .3)   # hooves
# 12) warm: half-time, melody in D major
section(53.17, 60.19, ['D', 'Bm', 'G', 'A'], 'half', 'chords', 'pulse', .8)
melody = [74, 76, 78, 81, 79, 78, 76, 74, 76, 78, 74, 73, 74]
for i, m in enumerate(melody): put(mus, 53.6 + i * BEAT * .5 * (2 if i in (3, 7, 12) else 1) + (BEAT * .5 if i > 3 else 0) + (BEAT * .5 if i > 7 else 0), harpsi(m, 1.4), .32, -.1)
put(mus, 53.17, strings([62, 66, 69], 7.0, .9, att=1.5), 1)
# 13) sneak returns for the loop (4 beats -> lands on the downbeat of t=0)
section(60.2, 62.6, SNEAK, drums=None, harp='sneak', bass='pulse', level=.9)
for i in range(int(2.4 / (BEAT / 2))): put(mus, 60.2 + i * BEAT / 2, rim(.4), .18, .4)
put(mus, 58.44, cymbal(2.0, swell=1), .18)
# ---------------- SFX events ----------------
put(sfx, 0.32, scratch(1.18, 1.0), .55, .2)                                     # quill circles the number
put(sfx, 2.08, thud(.9, 90, .35), .7); put(sfx, 2.08, paper(.2, 1.2), .5)        # stamp lands
put(sfx, 2.2, whoosh(.55, 300, 4000, .7), .55)                                   # camera flies up
for i in range(5): put(sfx, 2.85 + i * .42, thud(.35, 110, .15), .35, -.1)      # steps
put(sfx, 2.9, coins(10, 2.0, .6, 7), .35, .2)                                    # coins in sacks
put(sfx, 2.98, thud(.8, 80, .3), .55); put(sfx, 2.98, paper(.15, 1.0), .4)       # LEGAL stamp
put(sfx, 3.75, whoosh(1.2, 600, 5000, .7), .4, -.3); put(sfx, 6.0, coin(1, 3100), .5, .3)   # coin flies into the wig
for th in (5.69, 6.09, 6.36, 6.63): put(sfx, th, pop(600 + (th * 97 % 300), .1), .35); put(sfx, th, paper(.12, .8), .3)
put(sfx, 7.1, crackle(2.5, 18, .5, 2000, 8000, 3), .35, -.2)                    # paper notes fluttering
put(sfx, 9.05, whoosh(.7, 300, 6000, .8), .6)
put(sfx, 9.72, whoosh(.4, 800, 4000, .3), .35)
for i in range(16): put(sfx, 9.8 + i * .085, thud(.25, 140 + (i % 3) * 30, .08), .3, -.1)      # chest rattle
put(sfx, 9.95, crackle(.9, 40, .5, 1000, 4000, 5), .3, .3)                      # moth wings
put(sfx, 11.12, band(noise(.25), 200, 3000) * env(.25, .005, .06), .6); put(sfx, 11.12, harpsi(86, .6), .3)    # candle-idea
put(sfx, 11.55, whoosh(.3, 500, 7000, .6), .7)                                  # whip pan
put(sfx, 11.84, murmur(4.6, 1.0, 4), .5)
put(sfx, 11.84, crackle(4.5, 10, .4, 300, 1500, 6), .4, -.2)                    # drum creaks
put(sfx, 13.81, pop(900, .1), .4); put(sfx, 15.7, whoosh(.85, 300, 3000, .9), .45)
for th in (17.12, 17.43, 17.73): put(sfx, th, band(noise(.05), 3000, 12000) * env(.05, .0005, .008) + 0.6 * np.pad(band(noise(.03), 2000, 9000) * env(.03, .0005, .005), (0, int(.02 * SR)))[:int(.05 * SR)], .7, .1); put(sfx, th + .02, crackle(.6, 50, .5, 3000, 9000, int(th * 10)), .3)
put(sfx, 17.84, thud(.8, 90, .3), .55); put(sfx, 19.4, creak(1.2, 260), .5, -.2); put(sfx, 20.7, crackle(.6, 80, .6, 2500, 9000, 8), .35)
put(sfx, 21.16, murmur(2.4, 1.0, 9), .4); put(sfx, 21.16, scratch(1.8, .7), .3, .2)
for i in range(4): put(sfx, 21.3 + i * .5, coin(.4, 4200 + i * 300), .25, -.4 + i * .3)                   # glasses clink
put(sfx, 21.78, band(noise(.3), 300, 2500) * env(.3, .02, .1), .35)
for i in range(8): put(sfx, 21.36 + i * .08, pop(700 + i * 60, .07), .18)
put(sfx, 22.44, pop(820, .1), .3); put(sfx, 23.2, whoosh(.4, 600, 6000, .8), .5)
put(sfx, 23.56, whoosh(.45, 4000, 600, .2), .4); put(sfx, 23.8, crackle(2.0, 60, .7, 2500, 9000, 12), .4, -.3)
put(sfx, 26.25, whoosh(.3, 2000, 400, .9), .4); put(sfx, 26.54, thud(1.2, 60, .6), .9); put(sfx, 26.54, coins(14, .4, 1.0, 9), .5); put(sfx, 26.56, crackle(1.0, 90, .8, 2500, 9000, 13), .5, -.3); put(sfx, 26.5, creak(.5, 200), .4)
put(sfx, 28.08, paper(.3, 1.0), .35); put(sfx, 28.32, thud(.6, 100, .25), .45); put(sfx, 29.68, paper(.15, 1), .3); put(sfx, 29.72, kaching(), .4, .1)
put(sfx, 28.06, crackle(3.2, 6, .4, 800, 4000, 14), .25, -.4)                   # candle crackle
put(sfx, 30.95, band(noise(.35), 300, 3500) * env(.35, .03, .12), .6); put(sfx, 31.15, band(noise(.2), 1500, 7000) * env(.2, .002, .04), .4)
for i in range(4): put(sfx, 31.55 + i * .07, band(noise(.4), 100, 1500) * env(.4, .02, .12), .25, -.6 + i * .4)   # lanterns ignite
for i in range(8): put(sfx, 31.7 + i * .55, thud(.4, 95, .14), .35); put(sfx, 31.98 + i * .55, thud(.3, 120, .12), .25)   # crew footsteps
put(sfx, 31.6, creak(3.6, 380, .7), .25, .3)
for th in (32.36, 33.06, 33.54, 34.33): put(sfx, th, pop(760, .1), .35)
put(sfx, 35.08, whoosh(.4, 400, 3000, .8), .5)
for th in (35.62, 37.20, 37.83): put(sfx, th, paper(.25, 1.6, 1200, 7000), .6, -.3)
for k, th in enumerate((35.62, 37.20, 37.83)):
    for j in range(3): put(sfx, th + .16 + j * .07, thud(.6, 70 + j * 9, .25), .45); put(sfx, th + .18, coins(5, .2, .6, 20 + k), .35)
put(sfx, 36.46, kaching(), .45, .2); put(sfx, 38.38, whoosh(.3, 600, 6000, .5), .5); put(sfx, 38.4, paper(.3, 1.2), .4)
put(sfx, 38.93, scratch(1.0, .9), .5, .1); put(sfx, 38.7, murmur(3.2, 1.0, 21), .35)
put(sfx, 40.58, band(noise(1.3), 2000, 9000) * env(1.3, .3, None, 1.5), .15, .3)   # smouldering wig hiss
put(sfx, 41.43, crackle(.35, 120, .9, 1500, 8000, 22), .5)
put(sfx, 41.9, murmur(1.0, 1.0, 23), .4); put(sfx, 42.13, thud(1.0, 85, .35), .8); put(sfx, 42.13, paper(.15, 1.0), .4)
for i in range(10): put(sfx, 42.4 + i * .19, band(noise(.08), 2500, 9000) * env(.08, .002, .03), .25, .3)   # quill sharpening
for i in range(5): put(sfx, 44.55 + i * .3, paper(.18, 1.0, 1000, 6000), .45, -.2 + i * .1)                 # pages flip
for i in range(int((48.3 - 45.9) / BEAT)): put(sfx, 45.9 + i * BEAT, band(noise(.03), 1800, 7000) * env(.03, .0005, .006), .3)   # clock
put(sfx, 48.41, paper(.18, 1.2, 900, 6000), .5); put(sfx, 48.41, pop(500, .12), .4)
put(sfx, 49.09, paper(.22, 1.4, 900, 6000), .55); put(sfx, 49.09, thud(1.2, 70, .5), .8); put(sfx, 49.12, knock() * 1.5, .5)   # pop-up + gavel
put(sfx, 49.34, whoosh(.5, 1500, 400, .5), .35); put(sfx, 49.9, thud(.5, 200, .12), .4)                      # wig flops
put(sfx, 50.1, creak(.8, 900, .8), .4, .3); put(sfx, 50.91, coin(.8, 1400), .5, .3); put(sfx, 51.1, thud(.6, 160, .15), .4, .3)
put(sfx, 51.3, rumble(1.8, 1.0), .7); put(sfx, 52.1, bell(103, .8), .3, .2); put(sfx, 52.8, whoosh(.35, 400, 3000, .8), .5)
put(sfx, 53.2, knock(), .55, -.5); put(sfx, 53.42, knock(), .55, -.5); put(sfx, 53.3, creak(.5, 240), .4, -.5)
put(sfx, 53.87, coin(.8, 3300), .5, .1); put(sfx, 54.42, coin(.6, 3000), .45, -.5); put(sfx, 55.0, thud(.5, 120, .2), .4, -.5)
put(sfx, 55.0, scratch(3.0, .6), .3, .1)
for i in range(18): put(sfx, 55.3 + i * .155, band(noise(.025), 1800, 7000) * env(.025, .0005, .005), .2, .2)   # time-lapse clock
for i in range(12): put(sfx, 55.4 + i * .23, thud(.3, 140 + i * 6, .1), .25, (-1) ** i * .5)                     # books stack up
put(sfx, 58.4, whoosh(2.2, 300, 3000, .8), .35); put(sfx, 61.27, paper(.7, 1.0, 600, 5000), .5, -.3)
# ---------------- reverb (circular convolution: the tail of the end wraps into the start, the film loops) ----------------
def reverb(bus, dec=1.5, wet=.25, pre=.015, lo=300, hi=7000, seed=3):
    r = np.random.RandomState(seed); L = int(dec * 1.6 * SR); out = np.zeros_like(bus)
    for ch in range(2):
        t = np.arange(L) / SR; ir = r.randn(L) * np.exp(-t * 6.9 / dec); ir = band(ir, lo, hi, 2); ir[:int(pre * SR)] = 0; ir /= np.sqrt((ir ** 2).sum())
        H = np.fft.rfft(np.pad(ir, (0, N - L))); out[:, ch] = np.fft.irfft(np.fft.rfft(bus[:, ch]) * H, N)
    return bus + out * wet * (np.abs(bus).max() / (np.abs(out).max() + 1e-9))
put(mus, 2.93, np.sin(2 * np.pi * 49 * tt(.5)) * np.exp(-tt(.5) / .18), .8)   # sub lift on the drop
mus = reverb(mus, 1.6, .28, seed=3); sfx = reverb(sfx, .9, .16, lo=400, hi=6000, seed=5)
# ---------------- narration + mix ----------------
w = wave.open(os.path.join(ROOT, "voice", "vo.wav")); vo = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(float) / 32768
vo = np.tanh(vo * 1.25) / np.tanh(1.25); vox = np.zeros((N, 2)); n = min(len(vo), N); vox[:n, 0] = vo[:n]; vox[:n, 1] = vo[:n]
envv = np.convolve(np.abs(vo[:N]), np.ones(2400) / 2400, "same"); act = np.zeros(N); act[:len(envv)] = envv > .02
hk = np.hanning(9600); hk /= hk.sum(); duck = 1 - .55 * np.fft.irfft(np.fft.rfft(act) * np.fft.rfft(np.roll(np.pad(hk, (0, N - len(hk))), -len(hk) // 2)), N)   # circular: the seam is ducked like the rest
mus_ = mus * duck[:, None]; sfx_ = sfx * (1 - .25 * (1 - duck[:, None]))
# soft-clip each bus, then mix
def norm(b, peak): m = np.abs(b).max(); return b / m * peak if m > 0 else b
mix = norm(mus_, .68) + norm(sfx_, .5) + vox * 1.0
# loop-safe edges: tiny fades only (music is composed to continue across the loop)
f = int(.0015 * SR); mix[:f] *= np.linspace(.3, 1, f)[:, None]; mix[-f:] *= np.linspace(1, .3, f)[:, None]
mix = np.tanh(mix * 1.1) / np.tanh(1.1); mix *= .8 / np.abs(mix).max()
def wr(p, x): w = wave.open(p, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
os.makedirs(os.path.join(ROOT, "out"), exist_ok=True); wr(os.path.join(ROOT, "out", "mix.wav"), mix)
for nm, b in (("music", norm(mus_, .8)), ("sfx", norm(sfx_, .8)), ("voice", vox)): wr(os.path.join(ROOT, "build", f"stem_{nm}.wav"), b)
print("ok peak", round(float(np.abs(mix).max()), 3), "rms dB", round(float(20 * np.log10(np.sqrt((mix ** 2).mean()))), 1))
