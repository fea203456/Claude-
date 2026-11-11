"""Split voice/partN.wav into phrases by the longest silences -> voice/sNN.wav (trimmed) + voice/segments.json."""
import os, json, wave, numpy as np
ROOT = os.path.join(os.path.dirname(__file__), "..")
VO = json.load(open(os.path.join(ROOT, "src/vo.json"), encoding="utf8")); BK = json.loads(open(os.path.join(ROOT, "src/script.js"), encoding="utf8").read().split("=", 1)[1])
def part_of(i): t = BK["lines"][i]["t"]; return next(k for k, (a, b) in enumerate(BK["parts"]) if a <= t < b)
out = {}; ok = True
for p in range(3):
    ids = [k for k, (idx, s) in enumerate(VO) if part_of(idx[0]) == p]
    w = wave.open(os.path.join(ROOT, f"voice/part{p + 1}.wav")); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), "<i2") / 32768
    hop = sr // 100; e = np.sqrt(np.convolve(x ** 2, np.ones(hop * 3) / (hop * 3), "same"))[::hop]; thr = max(.012, e.max() * .035); loud = e > thr
    # runs of silence
    gaps = []; i = 0; n = len(loud)
    while i < n:
        if not loud[i]:
            j = i
            while j < n and not loud[j]: j += 1
            if i > 0 and j < n: gaps.append((j - i, i, j))
            i = j
        else: i += 1
    first = int(np.argmax(loud)); last = n - int(np.argmax(loud[::-1]))
    cuts = sorted(sorted(gaps, reverse=True)[: len(ids) - 1], key=lambda g: g[1])
    bounds = [first] + [v for g in cuts for v in (g[1], g[2])] + [last]
    segs = [(bounds[2 * k], bounds[2 * k + 1]) for k in range(len(ids))]
    gl = sorted([g[0] / 100 for g in gaps], reverse=True)
    print(f"part {p + 1}: need {len(ids)} phrases; gaps found {len(gaps)}; shortest used gap {gl[len(ids) - 2]:.2f}s, longest unused {gl[len(ids) - 1] if len(gl) >= len(ids) else 0:.2f}s")
    for k, (a, b) in zip(ids, segs):
        a2, b2 = max(0, a * hop - int(.03 * sr)), min(len(x), b * hop + int(.06 * sr)); y = x[a2:b2].copy(); f = int(.01 * sr); y[:f] *= np.linspace(0, 1, f); y[-f:] *= np.linspace(1, 0, f)
        with wave.open(os.path.join(ROOT, f"voice/s{k:02d}.wav"), "wb") as o: o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((y * 32767).astype("<i2").tobytes())
        d = len(y) / sr; cps = len(VO[k][1]) / d; flag = "" if 6 < cps < 24 else "  <-- CHECK"; ok = ok and not flag
        out[k] = round(d, 3); print(f"  s{k:02d} {d:5.2f}s {cps:4.1f} ch/s  {VO[k][1]}{flag}")
json.dump(out, open(os.path.join(ROOT, "voice/segments.json"), "w")); print("ALL OK" if ok else "SOME SUSPICIOUS")
