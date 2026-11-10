"""Synthesize music + SFX for the reel and mix with the Gemini voice lines -> out/mix.wav (48 kHz stereo).
Everything is generated here from the shared timeline (src/timeline.js); no samples are used."""
import os, json, wave, numpy as np
ROOT = os.path.join(os.path.dirname(__file__), ".."); SR = 48000
TL = json.loads(open(os.path.join(ROOT, "src/timeline.js")).read().split("=", 1)[1].rstrip().rstrip(";"))
M, DUR = TL["m"], TL["dur"]; N = int(DUR * SR); BEAT = 60 / TL["bpm"]
rs = np.random.RandomState(7)
mus, sfx, vox = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))
def put(bus, t, x, g=1.0, pan=0.0):
    i = int(round(t * SR));
    if i >= N or i + len(x) <= 0: return
    if i < 0: x = x[-i:]; i = 0
    x = x[:N - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[i:i + len(x), 0] += x * g * l * 1.414; bus[i:i + len(x), 1] += x * g * r * 1.414
tt = lambda d: np.arange(int(d * SR)) / SR
hz = lambda m: 440 * 2 ** ((m - 69) / 12)
def env(d, a=.003, r=None, curve=4.0):
    t = tt(d); e = np.exp(-curve * t / d) if r is None else np.exp(-t / r); return e * np.clip(t / a, 0, 1) * np.clip((d - t) / .004, 0, 1)
def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); m = 1 / (1 + (lo / np.maximum(f, 1)) ** 6) / (1 + (f / hi) ** 6); return np.fft.irfft(X * m, len(x))
noise = lambda d: rs.randn(int(d * SR))
def kick(g=1.0): t = tt(.32); f = 46 + 110 * np.exp(-t / .035); return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / .11) + .25 * band(noise(.32), 1500, 6000) * np.exp(-t / .004)) * g
def snap(): return band(noise(.14), 1100, 5200) * env(.14, .001, .028) * .9 + band(noise(.14), 2500, 9000) * np.roll(env(.14, .001, .02), 480) * .35
def hat(d=.045): return band(noise(d), 7000, 16000) * env(d, .001, d / 4)
def tone(f, d, harm=(1, .5, .25, .12), r=None, curve=5, vib=0):
    t = tt(d); ph = 2 * np.pi * f * t + (vib * np.sin(2 * np.pi * 5.5 * t) if vib else 0)
    return sum(a * np.sin(ph * (k + 1)) for k, a in enumerate(harm)) * env(d, .004, r, curve)
def bassn(m, d): t = tt(d); f = hz(m); x = sum(np.sin(2 * np.pi * f * k * t) / k * np.exp(-t * (k - 1) * 9) for k in range(1, 7)); return np.tanh(x * 1.6) * env(d, .004, None, 3.0)
def pluck(m, d=.3): return tone(hz(m), d, (1, .45, .3, .12, .06), None, 7)
def bell(m, d=1.2, g=1): t = tt(d); f = hz(m); return g * (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t / .12) + .3 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t / .05)) * np.exp(-t / (d / 5)) * np.clip(t / .002, 0, 1)
def whoosh(d=.5, f0=400, f1=5000, peak=.55):
    x = noise(d); n = len(x); y = np.zeros(n); lo = bp = 0.0; t = np.arange(n) / n
    fc = f0 * (f1 / f0) ** (1 - np.abs(t - peak) / max(peak, 1 - peak)); k = 2 * np.sin(np.pi * np.minimum(fc, 11000) / SR)
    for i in range(n): lo += k[i] * bp; hp = x[i] - lo - .45 * bp; bp += k[i] * hp; y[i] = bp
    return y * np.sin(np.pi * np.clip(t, 0, 1)) ** 1.6 * np.where(t < peak, (t / peak) ** 1.5, 1) * .5
def popb(f=700, d=.09): t = tt(d); return np.sin(2 * np.pi * np.cumsum(f * (1 + 1.2 * np.exp(-t / .012))) / SR) * env(d, .001, .022)
def thud(g=1.0, f=70, d=.35): t = tt(d); return g * (np.sin(2 * np.pi * np.cumsum(f * (1 + 1.5 * np.exp(-t / .02))) / SR) * np.exp(-t / .09) + .5 * band(noise(d), 150, 1800) * np.exp(-t / .03))
def kaching():
    d = 1.0; x = np.zeros(int(d * SR)); a = bell(95, .9, .5); b = bell(100, .9, .5); x[:len(a)] += a; o = int(.085 * SR); x[o:o + len(b[:len(x) - o])] += b[:len(x) - o]
    sh = band(noise(.25), 5000, 14000) * env(.25, .002, .05) * .35; x[:len(sh)] += sh; th = thud(.35, 110, .15); x[:len(th)] += th; return x
def keyclick(m): x = np.zeros(int(.5 * SR)); c = band(noise(.02), 1800, 9000) * env(.02, .0005, .004) * 1.2; x[:len(c)] += c; c2 = band(noise(.03), 300, 1500) * env(.03, .0005, .008) * .9; x[:len(c2)] += c2; n = tone(hz(m), .5, (1, .35, .15), .11); x += n * .55; return x

# ---------------- music ----------------
def groove(t0, t1, level=1.0, hats16=False, arp=False, pad=False, kick4=False, bass=True):
    prog = [45, 41, 38, 40]  # Am F Dm E (roots, octave 2)
    nb = int(round((t1 - t0) / BEAT))
    for b in range(nb):
        t = t0 + b * BEAT; bar = int(round((t / BEAT))) // 4; bb = int(round(t / BEAT)) % 4; root = prog[(bar // 2) % 4]
        if kick4 or bb in (0, 2): put(mus, t, kick(), .95 * level)
        if bb == 2 and not kick4: put(mus, t + BEAT * .75, kick(.6), .6 * level)
        if bb in (1, 3): put(mus, t, snap(), .5 * level, .1)
        for s in range(4 if hats16 else 2): put(mus, t + s * BEAT / (4 if hats16 else 2), hat(.05 if s % 2 == 0 else .03), (.22 if s % 2 == 0 else .13) * level, -.25 if s % 2 else .25)
        if bass:
            pat = {0: [(0, 0, .22), (.5, 0, .12)], 1: [(.25, 12, .1), (.75, 0, .14)], 2: [(0, 0, .2), (.5, 3, .12)], 3: [(.0, 7, .12), (.5, 10, .2)]}[bb]
            for off, iv, d in pat: put(mus, t + off * BEAT, bassn(root - 12 + iv, d + .1), .5 * level)
        if arp:
            ch = {45: [57, 60, 64, 67], 41: [57, 60, 65, 69], 38: [57, 62, 65, 69], 40: [56, 59, 64, 68]}[root]
            for s in range(4): put(mus, t + s * BEAT / 4, pluck(ch[(s + b) % 4] + (12 if (s + b) % 3 == 0 else 0), .28), .17 * level, .5 * np.sin(b + s))
        if pad and bb == 0:
            ch = {45: [57, 60, 64], 41: [53, 57, 60], 38: [50, 53, 57], 40: [52, 56, 59]}[root]; d = BEAT * 4.2; t_ = tt(d)
            x = sum(np.sin(2 * np.pi * hz(n) * dt * t_) for n in ch for dt in (.996, 1.004, 2.002)) * np.sin(np.pi * np.clip(t_ / d, 0, 1)) ** .6 * .05; put(mus, t, x, level)
def riser(t0, d, g=.3):
    x = noise(d); n = len(x); t = np.arange(n) / n; y = np.zeros(n); lo = bp = 0.0; k = 2 * np.sin(np.pi * np.minimum(300 * 30 ** t, 10000) / SR)
    for i in range(n): lo += k[i] * bp; hp = x[i] - lo - .3 * bp; bp += k[i] * hp; y[i] = bp
    put(mus, t0, y * t ** 2 * g)
# hook: three hits under the three text slams, then lift into the groove
for i, th in enumerate([.03, .5, 1.0]): put(mus, th, kick(1.2), 1.0); put(mus, th, bassn(33, .45), .7); put(sfx, th, thud(.5, 60 + i * 12, .3), .5)
for b in range(7): put(mus, b * BEAT / 2 + 0.0, hat(), .14)
put(mus, 1.5, snap(), .5); put(mus, 2.0, kick(), .8); put(mus, 2.5, snap(), .5); put(mus, 3.0, kick(), .8); put(mus, 3.25, snap(), .4); riser(2.0, 1.5, .22)
groove(3.5, 9.0, .85)
groove(9.0, 17.5, 1.0, hats16=True, arp=True)
groove(17.5, 21.5, .9, hats16=True, arp=True, pad=True, kick4=True)
groove(21.5, 26.5, 1.0, hats16=True, arp=True, pad=True)
put(mus, 26.5, kick(), .9); put(mus, 26.5, bassn(33, .3), .6)                      # last hit, then dead air
groove(33.5, 36.5, 1.0, hats16=True, arp=True)                                      # collapse: groove slams back
riser(35.5, 1.0, .2); put(mus, 36.5, kick(1.1), 1.0)                                 # ...then a breath of silence on the reveal
groove(37.5, 40.5, 1.0, hats16=True, arp=True, pad=True)
groove(40.5, 44.0, .9, hats16=True, arp=False, pad=True); riser(42.5, 1.5, .25)

# ---------------- SFX ----------------
SCALE = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16, 17, 19, 23, 24]                          # one step per click, resolves on the last
for i, c in enumerate(TL["clicks"]):
    offscreen = M["s3"] + .3 < c["t"] < M["tunnelOut"]
    put(sfx, c["t"], keyclick(69 + SCALE[i]), .33 if offscreen else .62, .25)
put(sfx, M["final"] + .06, bell(93, 2.2, .5) + bell(100, 2.2, .3), .7, .2)            # 100%: the melody lands
for tb in (M["buy1"], M["buy2"], M["buy3"], M["buy4"]): put(sfx, tb, kaching(), .62, -.2)
for tw, d, g in ((M["hookOut"], .9, .5), (M["notion"], .5, .45), (M["s3"], .6, .7), (M["tunnelOut"], .6, .7), (M["zoomIn"] - .05, .85, .6), (M["zoomOut"], .7, .6), (M["pushIn"], .9, .6), (M["jump"] - .1, .4, .35)): put(sfx, tw, whoosh(d), g)
put(sfx, M["s6"], whoosh(.7, 300, 6000, .8)[::-1], .7)                                # rewind
for i in range(12): put(sfx, M["stick"] + .08 + i * .125, popb(520 + i * 45), .28, -.3 + i * .05)   # sticky notes
for i in range(5): put(sfx, M["notion"] + .05 + i * .09, band(noise(.08), 2000, 9000) * env(.08, .002, .02), .3, -.4)  # pages
for t0, f in ((4.1, 900), (4.5, 620), (5.6, 760), (15.2, 840), (16.3, 500), (16.5, 560), (M["tunnelOut"] + .2, 900), (M["tunnelOut"] + .25, 520), (M["tunnelOut"] + .3, 580), (M["tunnelOut"] + .35, 700)): put(sfx, t0, popb(f), .3, -.2)
for i in range(4): put(sfx, M["alarm"] + .25 + i * .16, tone(1975, .09, (1, .3), .05), .2, .1)     # 5:00 alarm
put(sfx, M["alarm"] + .95, thud(.5, 140, .12), .5)                                                  # ...slapped off
for i, n in enumerate((76, 81, 85, 88, 93)): put(sfx, M["badge"] + i * .07, bell(n, .7, .5), .3, .3 * (i - 2) / 2)  # 98% badge
t_ = tt(.5); put(sfx, M["whistle"], np.sin(2 * np.pi * np.cumsum(1500 * (.2) ** (t_ / .5) * (1 + .02 * np.sin(2 * np.pi * 9 * t_))) / SR) * np.sin(np.pi * t_ / .5) ** .5 * .28, 1, -.2)  # slide whistle
for th in (M["lampOff1"], M["lampOff2"]): put(sfx, th, band(noise(.03), 900, 5000) * env(.03, .0005, .006), .7, .3)
k = 0; t0 = M["s4"] + .5                                                             # the silence: clock ticks, growing
while t0 < M["s5"] - .1: g = .18 + .3 * (t0 - M["s4"]) / 6; put(sfx, t0, band(noise(.03), 1800 if k % 2 else 2600, 7000) * env(.03, .0005, .006) + tone(1100 if k % 2 else 1500, .03, (1,), .008) * .3, g); k += 1; t0 += .5
td = tt(6.0); put(sfx, M["s4"], np.sin(2 * np.pi * 43 * td) * (td / 6) ** 2 * .22 * (1 + .5 * np.sin(2 * np.pi * 1.0 * td)), 1)   # low dread
tb = tt(1.6); put(sfx, M["s5"] + .13, np.sin(2 * np.pi * np.cumsum(38 + 60 * np.exp(-tb / .06)) / SR) * np.exp(-tb / .45) * 1.0 + band(noise(1.6), 60, 900) * np.exp(-tb / .12) * .7, .95)  # DEADLINE stamp
for i in range(22): tc = M["collapse"] + .1 + rs.rand() * 1.5; put(sfx, tc, thud(.5 + rs.rand() * .5, 60 + rs.rand() * 160, .25) + .4 * np.pad(band(noise(.12), 800, 6000) * env(.12, .001, .03), (0, int(.13 * SR)))[:int(.25 * SR)], .32, rs.rand() * 1.2 - .6)
put(sfx, M["send"], keyclick(81), .6, .25); put(sfx, M["send"] + .02, popb(900, .12), .4)
for i, a in enumerate((.55, .8, 1.0, 1.25, 1.5)): put(sfx, M["send"] + a, popb(600 + 90 * i), .3)                # cover elements
put(sfx, M["notif"], bell(88, .6, .5), .5, .0); put(sfx, M["notif"] + .12, bell(93, .8, .5), .5, .0)              # notification
put(sfx, M["buy4"] + .45, bell(100, .5, .4), .3, .3)                                                              # coin lands
for i in range(4): put(sfx, M["s6"] + .1 + i * .15, popb(900 - i * 90, .05), .3)                                  # counter flips back
put(sfx, M["endText"], thud(.6, 80, .25), .5); put(sfx, M["endText"] + .22, popb(700), .35); put(sfx, M["endText"] + .6, popb(950), .35)

# ---------------- voice ----------------
def rd(p): w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
duck = np.ones(N)
for v in TL["vo"]:
    x = rd(os.path.join(ROOT, "voice", v["id"] + ".wav")); act = x[np.abs(x) > .02]; x = np.tanh(x * (.2 / np.sqrt((act ** 2).mean())) * 1.4) / 1.4  # level every line the same, soft-limit peaks
    put(vox, v["t"], x, 1.0, -.12 if v["who"] == "a" else .12)
    i0, i1 = int((v["t"] - .08) * SR), min(N, int((v["t"] + len(x) / SR + .12) * SR)); duck[max(0, i0):i1] = .36
kk = np.hanning(int(.16 * SR)); duck = np.convolve(duck, kk / kk.sum(), "same"); duck[:2000] = duck[2000]; duck[-2000:] = duck[-2001]

mix = mus * duck[:, None] * .78 + sfx * (.55 + .45 * duck[:, None]) * .9 + vox * 1.15
fade = np.ones(N); fade[:240] = np.linspace(0, 1, 240); fade[-720:] = np.linspace(1, 0, 720); mix *= fade[:, None]
mix = np.tanh(mix * 1.15) ; mix *= .84 / np.abs(mix).max()
def wr(p, x): w = wave.open(p, "wb"); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
wr(os.path.join(ROOT, "out/mix.wav"), mix)
if os.environ.get("STEMS"):
    for n, b in (("music", mus * .78), ("sfx", sfx * .9), ("voice", vox * 1.15)): wr(os.path.join(ROOT, f"out/stem_{n}.wav"), np.tanh(b))
print("peak", np.abs(mix).max().round(3), "rms dB", (20 * np.log10(np.sqrt((mix ** 2).mean()))).round(1))
