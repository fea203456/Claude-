"""
TgMod promo soundtrack: synthwave-leaning music at 120 BPM in A minor plus sound effects, all
synthesized here and placed on the same timeline as index.html. Writes a 48 kHz stereo WAV.

    python3 audio.py out.wav
"""
import sys
import numpy as np
from scipy.signal import butter, sosfilt, fftconvolve

SR = 48000
DUR = 37.0
BEAT = 0.5          # 120 BPM
BAR = 2.0
N = int(SR * DUR)
rng = np.random.default_rng(5)

music = np.zeros((N, 2))
sfx = np.zeros((N, 2))


def t_of(n):
    return np.arange(n) / SR


def add(buf, start, sig, gain=1.0, pan=0.0):
    """Mixes a mono or stereo signal into buf at `start` seconds; pan -1..1."""
    i = int(round(start * SR))
    if i >= N:
        return
    if sig.ndim == 1:
        left = sig * np.sqrt((1 - pan) / 2) * np.sqrt(2)
        right = sig * np.sqrt((1 + pan) / 2) * np.sqrt(2)
        sig = np.stack([left, right], axis=1)
    end = min(N, i + len(sig))
    buf[i:end] += sig[:end - i] * gain


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f / (SR / 2), 'high', output='sos'), x)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), hi / (SR / 2)], 'band', output='sos'), x)


def env_adsr(n, a=0.005, d=0.1, s=0.6, r=0.2, hold=None):
    t = t_of(n)
    hold = hold if hold is not None else n / SR - r
    e = np.where(t < a, t / max(a, 1e-6), 1.0)
    e = np.where((t >= a) & (t < a + d), 1 - (1 - s) * (t - a) / d, e)
    e = np.where((t >= a + d) & (t < hold), s, e)
    e = np.where(t >= hold, s * np.clip(1 - (t - hold) / r, 0, 1), e)
    return e


def note_hz(name):
    names = {'C': -9, 'C#': -8, 'D': -7, 'D#': -6, 'E': -5, 'F': -4, 'F#': -3, 'G': -2, 'G#': -1, 'A': 0, 'A#': 1, 'B': 2}
    pitch, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[pitch] + (octave - 4) * 12) / 12)


def saw(f, n, detune=0.0):
    t = t_of(n)
    out = np.zeros(n)
    for d in (-detune, 0, detune):
        ph = (t * f * (1 + d)) % 1.0
        out += 2 * ph - 1
    return out / 3


def reverb(x, seconds=2.2, mix=0.25, seed=1):
    r = np.random.default_rng(seed)
    n = int(SR * seconds)
    decay = np.exp(-np.linspace(0, 7, n))
    ir_l = r.standard_normal(n) * decay
    ir_r = r.standard_normal(n) * decay
    ir_l, ir_r = lp(ir_l, 6000), lp(ir_r, 6000)
    ir_l /= np.sqrt(np.sum(ir_l ** 2))
    ir_r /= np.sqrt(np.sum(ir_r ** 2))
    wet = np.stack([fftconvolve(x[:, 0], ir_l)[:len(x)], fftconvolve(x[:, 1], ir_r)[:len(x)]], axis=1)
    return x * (1 - mix) + wet * mix * 1.6


# ---------------- music ----------------
CHORDS = [('A', ['A3', 'C4', 'E4', 'B4']), ('F', ['F3', 'A3', 'C4', 'E4']), ('C', ['C4', 'E4', 'G4', 'D5']), ('G', ['G3', 'B3', 'D4', 'A4'])]
BASS = {'A': 'A1', 'F': 'F1', 'C': 'C2', 'G': 'G1'}


def chord_at(bar):
    return CHORDS[bar % 4]


def kick(n=int(0.45 * SR)):
    t = t_of(n)
    f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5) + 0.25 * np.exp(-t * 300) * rng.standard_normal(n)


def clap(n=int(0.3 * SR)):
    t = t_of(n)
    noise = bp(rng.standard_normal(n), 900, 4200)
    e = np.exp(-t * 18) * (1 + 0.6 * (np.sin(2 * np.pi * 90 * t) > 0) * (t < 0.03))
    return noise * e


def hat(open_=False):
    n = int((0.25 if open_ else 0.06) * SR)
    t = t_of(n)
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * (14 if open_ else 70))


def pad(notes, dur, cutoff=1800):
    n = int(dur * SR)
    sig = sum(saw(note_hz(x), n, 0.004) for x in notes) / len(notes)
    sig = lp(sig, cutoff)
    return sig * env_adsr(n, a=0.4, d=0.3, s=0.8, r=0.6)


def pluck(f, dur=0.22, cutoff=3200):
    n = int(dur * SR)
    t = t_of(n)
    sig = saw(f, n, 0.003) * 0.7 + np.sin(2 * np.pi * f * t) * 0.3
    return lp(sig, cutoff) * np.exp(-t * 14)


def bass_note(f, dur):
    n = int(dur * SR)
    t = t_of(n)
    sig = saw(f, n, 0.002) * 0.6 + np.sin(2 * np.pi * f * t) * 0.6
    cut = 200 + 900 * np.exp(-t * 12)
    out = np.zeros(n)
    # * a per-block sweep of the filter
    block = 256
    for i in range(0, n, block):
        out[i:i + block] = lp(sig[i:i + block + 64], cut[i])[:len(out[i:i + block])]
    return out * env_adsr(n, a=0.003, d=0.08, s=0.7, r=0.05)


def section(t):
    if t < 3.0: return 'intro'
    if t < 4.0: return 'title'
    if 12.0 <= t < 16.0: return 'ghost'
    if t >= 32.0: return 'outro'
    return 'full'


drums = np.zeros((N, 2))
bass = np.zeros((N, 2))
keys = np.zeros((N, 2))

for bar in range(int(DUR / BAR)):
    t0 = bar * BAR
    name, notes = chord_at(bar)
    sec = section(t0)
    if sec == 'outro':
        break
    # * pads: under everything, brighter in the full sections
    add(keys, t0, pad(notes, BAR + 0.6, cutoff=900 if sec in ('intro', 'ghost') else 1700), 0.16)
    # * the arpeggio, 16ths, opening its filter through the intro
    for k in range(8):
        tt = t0 + k * BEAT / 2
        f = note_hz(notes[[0, 1, 2, 3, 2, 1, 2, 3][k]]) * 2
        if sec == 'intro':
            cut = 500 + 2500 * (tt / 3.0) ** 2
        elif sec == 'ghost':
            cut = 1200
        else:
            cut = 3400
        add(keys, tt, pluck(f, cutoff=cut), 0.11 if sec != 'ghost' else 0.07, pan=0.35 if k % 2 else -0.35)
    if sec in ('full', 'ghost'):
        for b in range(4):
            tb = t0 + b * BEAT
            if sec == 'full' or b % 2 == 0:
                add(drums, tb, kick(), 0.9)
            if sec == 'full' and b % 2 == 1:
                add(drums, tb, clap(), 0.35)
            for h in range(2):
                add(drums, tb + h * BEAT / 2, hat(open_=(h == 1 and sec == 'full')), 0.12 if h else 0.08, pan=0.2)
            # * bass in 8ths, the root, an octave hop on the last one
            for e in range(2):
                f = note_hz(BASS[name]) * (2 if (b == 3 and e == 1) else 1)
                add(bass, tb + e * BEAT / 2, bass_note(f, BEAT / 2 - 0.01), 0.42 if sec == 'full' else 0.3)

# * the lead from 24 s: a short motif over the decoration scene
MOTIF = [('E5', 0, 0.5), ('D5', 0.5, 0.25), ('C5', 0.75, 0.25), ('B4', 1.0, 0.5), ('C5', 1.5, 0.5)]
for bar in range(12, 16):
    t0 = bar * BAR
    shift = {12: 0, 13: -4, 14: 3, 15: -2}[bar]
    for nm, off, d in MOTIF:
        f = note_hz(nm) * 2 ** (shift / 12)
        n = int((d + 0.15) * SR)
        sig = lp(saw(f, n, 0.006), 2600) * env_adsr(n, a=0.01, d=0.1, s=0.6, r=0.15)
        add(keys, t0 + off, sig, 0.12, pan=0.1)

# * intro riser into the pop at 3.0, the title's snare roll, and the ending
n = int(1.5 * SR)
riser = hp(rng.standard_normal(n), 2000) * np.linspace(0, 1, n) ** 2
add(music, 1.5, riser, 0.18)
for k in range(8):
    add(drums, 3.5 + k * 0.0625, clap(int(0.1 * SR)), 0.08 + k * 0.03)
add(drums, 3.0, kick(), 1.0)
n = int(1.2 * SR)
add(music, 3.0, hp(rng.standard_normal(n), 3000) * np.exp(-t_of(n) * 3.5), 0.12)   # crash

n = int(1.0 * SR)
riser2 = hp(rng.standard_normal(n), 1500) * np.linspace(0, 1, n) ** 2
add(music, 32.0, riser2, 0.2)
# * the final chord on 33.0, ringing out
final = pad(['A2', 'E3', 'A3', 'C4', 'E4', 'B4'], 4.0, cutoff=2200)
add(keys, 33.0, final, 0.34)
add(drums, 33.0, kick(), 1.0)
n = int(2.5 * SR)
add(music, 33.0, hp(rng.standard_normal(n), 3500) * np.exp(-t_of(n) * 2), 0.14)
for k, nm in enumerate(['A4', 'C5', 'E5', 'B5', 'E6']):
    add(keys, 33.0 + k * 0.125, pluck(note_hz(nm), 1.2, 5000), 0.1, pan=(k - 2) * 0.25)

music += drums + bass + keys

# ---------------- sound effects ----------------
def pop(size=1.0):
    n = int(0.09 * SR)
    t = t_of(n)
    f = (1400 - 900 * np.minimum(t / 0.04, 1)) / size
    blip = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 60)
    click = hp(rng.standard_normal(n), 3000) * np.exp(-t * 400)
    return blip * 0.8 + click * 0.4


def spray(dur=0.5):
    n = int(dur * SR)
    t = t_of(n)
    return bp(rng.standard_normal(n), 3000, 9000) * np.exp(-t * 9) * (1 - np.exp(-t * 200))


def whoosh(dur=0.6, rise=True):
    n = int(dur * SR)
    t = t_of(n)
    shape = np.sin(np.pi * t / dur) ** 2
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    block = 512
    for i in range(0, n, block):
        p = i / n
        f = 400 + (2600 if rise else 2600 * (1 - p)) * (p if rise else 1)
        out[i:i + block] = bp(noise[i:i + block + 256], max(200, f * 0.6), f * 1.4)[:len(out[i:i + block])]
    return out * shape


def click():
    n = int(0.04 * SR)
    t = t_of(n)
    return (np.sin(2 * np.pi * 2200 * t) * 0.5 + hp(rng.standard_normal(n), 4000)) * np.exp(-t * 180)


def sigh(dur=0.5):
    n = int(dur * SR)
    t = t_of(n)
    return lp(rng.standard_normal(n), 1400) * np.sin(np.pi * t / dur) ** 2 * 0.6


def bell(f, dur=1.4):
    n = int(dur * SR)
    t = t_of(n)
    return (np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 12)) * np.exp(-t * 3.2)


def buzz(dur=0.12):
    n = int(dur * SR)
    t = t_of(n)
    return lp(saw(140, n), 900) * np.exp(-t * 22)


def shimmer(dur=0.5):
    n = int(dur * SR)
    out = np.zeros(n)
    for k, f in enumerate([2093, 2637, 3136, 3951]):
        i = int(k * 0.05 * SR)
        m = n - i
        out[i:] += np.sin(2 * np.pi * f * t_of(m)) * np.exp(-t_of(m) * 9)
    return out * 0.3


add(sfx, 2.85, pop(2.2), 0.5)
add(sfx, 3.0, pop(0.6), 0.9)
add(sfx, 3.0, spray(0.7), 0.35)
for i, tt in enumerate([3.08 + k * 0.055 for k in range(5)]):
    add(sfx, tt + 0.14, click(), 0.12, pan=(i - 2) * 0.2)
add(sfx, 3.75, whoosh(0.7), 0.25)
add(sfx, 4.2, whoosh(0.8), 0.3, pan=-0.3)
for k, tt in enumerate([5.9, 7.3, 8.7]):
    add(sfx, tt, whoosh(0.5), 0.14, pan=-0.5 + k * 0.5)
add(sfx, 10.2, whoosh(1.1, rise=False), 0.22)
add(sfx, 11.55, whoosh(0.8), 0.28, pan=0.2)
add(sfx, 12.45, pop(1.2), 0.3, pan=-0.3)
add(sfx, 12.83, pop(1.1), 0.3, pan=-0.3)
for k, tt in enumerate([13.25, 13.75, 14.25]):
    add(sfx, tt, click(), 0.5, pan=0.4)
    add(sfx, tt + 0.05, sigh(0.55), 0.22, pan=-0.2)
add(sfx, 15.6, whoosh(0.8), 0.28, pan=-0.4)
add(sfx, 16.4, whoosh(0.9), 0.18)
add(sfx, 16.95, shimmer(0.5), 0.5, pan=0.3)
add(sfx, 17.2, click(), 0.4, pan=0.3)
add(sfx, 18.1, bell(note_hz('E6')), 0.28, pan=-0.3)
add(sfx, 18.32, bell(note_hz('A6')), 0.24, pan=-0.3)
add(sfx, 19.8, whoosh(0.8), 0.24)
for k in range(5):
    add(sfx, 20.35 + k * 0.06, click(), 0.12, pan=-0.6 + k * 0.3)
for k, tt in enumerate([20.85, 21.05, 21.25, 21.45]):
    add(sfx, tt, buzz(), 0.28, pan=-0.4 + k * 0.25)
for k, nm in enumerate(['A5', 'C#6', 'E6', 'A6']):
    add(sfx, 21.78 + k * 0.06, bell(note_hz(nm), 1.0), 0.13, pan=0.4)
add(sfx, 22.0, pop(1.0), 0.3)
add(sfx, 23.75, whoosh(0.9), 0.28, pan=0.3)
for k, tt in enumerate([24.6, 25.25, 25.9, 26.55]):
    add(sfx, tt, pop(1.0 + k * 0.1), 0.3, pan=-0.5)
add(sfx, 28.4, whoosh(0.8), 0.3, pan=0.4)
add(sfx, 29.2, pop(0.9), 0.32, pan=-0.5)
for k in range(7):
    add(sfx, 29.65 + k * 0.07, click(), 0.16, pan=-0.6 + k * 0.15)
add(sfx, 31.7, whoosh(0.9, rise=False), 0.3)
for k in range(10):
    add(sfx, 32.2 + k * 0.08, pop(2.0 - k * 0.12), 0.08 + k * 0.012, pan=(k % 2) * 0.6 - 0.3)
add(sfx, 33.05, pop(0.5), 0.6)
for k in range(5):
    add(sfx, 33.45 + k * 0.05 + 0.12, click(), 0.12, pan=(k - 2) * 0.2)

# ---------------- mix ----------------
music = reverb(music, 2.0, 0.22, seed=2)
sfx = reverb(sfx, 1.2, 0.18, seed=3)
mix = music * 0.85 + sfx

# * a gentle fade at the very end, after the chord has rung out
fade = int(1.2 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None] ** 1.5
mix[: int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))[:, None]

# * soft clip, then a peak of -1 dBFS
mix = np.tanh(mix * 1.4) / np.tanh(1.4)
mix *= 10 ** (-1 / 20) / np.max(np.abs(mix))

out = sys.argv[1] if len(sys.argv) > 1 else 'soundtrack.wav'
pcm = (mix * 32767).astype('<i2')
import wave
with wave.open(out, 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
print('wrote', out, f'{len(mix) / SR:.2f} s')
