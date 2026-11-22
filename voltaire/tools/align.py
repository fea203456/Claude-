"""Align narration take to phrases: silence segmentation + DP on syllable counts. Writes data/align.json, voice/ph/<id>.wav"""
import wave, json, os, re, numpy as np
ROOT = os.path.join(os.path.dirname(__file__), "..")
SRC = os.path.join(ROOT, "voice", os.environ.get("TAKE", "vo2_31_puck") + ".src.wav")
PH = [l.split("|", 1) for l in open(os.path.join(ROOT, "data", "phrases.txt"), encoding="utf8").read().strip().split("\n")]
w = wave.open(SRC); sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768
hop = sr // 100; e = np.array([np.sqrt((a[i*hop:(i+1)*hop]**2).mean()) for i in range(len(a)//hop)])
sp = e > 0.008; segs = []; i = 0; n = len(sp)
while i < n:
    if sp[i]:
        j = i
        while j < n and (sp[j] or (j + 12 < n and sp[j:j+12].any())): j += 1
        segs.append((i / 100, j / 100)); i = j
    else: i += 1
S = len(segs); P = len(PH)
syl = [len(re.findall("[аеёиоуыэюяАЕЁИОУЫЭЮЯ]", t)) for _, t in PH]
rate = sum(b - a for a, b in segs) / sum(syl)
gapb = [segs[k + 1][0] - segs[k][1] for k in range(S - 1)] + [1.0]
INF = 1e18; D = np.full((S + 1, P + 1), INF); B = np.zeros((S + 1, P + 1), int); D[0, 0] = 0
for j in range(1, P + 1):
    for i in range(1, S + 1):
        for k in range(j - 1, i):
            if D[k, j - 1] >= INF: continue
            dur = segs[i - 1][1] - segs[k][0]; ex = syl[j - 1] * rate
            c = D[k, j - 1] + (dur - ex) ** 2 / max(ex, .3) - 1.2 * min(gapb[i - 1], .8)
            if c < D[i, j]: D[i, j] = c; B[i, j] = k
res = []; i = S
for j in range(P, 0, -1):
    k = B[i, j]; res.append({"id": PH[j-1][0], "text": PH[j-1][1], "start": round(segs[k][0], 2), "end": round(segs[i-1][1], 2)}); i = k
res.reverse()
for r in res: print(f'{r["id"]:4} {r["start"]:6.2f}-{r["end"]:6.2f} {r["end"]-r["start"]:5.2f}  {r["text"]}')
json.dump(res, open(os.path.join(ROOT, "data", "align.json"), "w"), ensure_ascii=False, indent=1)
os.makedirs(os.path.join(ROOT, "voice", "ph"), exist_ok=True)
for r in res:
    x = a[int(r["start"] * sr): int(r["end"] * sr)]
    o = wave.open(os.path.join(ROOT, "voice", "ph", r["id"] + ".wav"), "wb"); o.setnchannels(1); o.setsampwidth(2); o.setframerate(sr); o.writeframes((x * 32767).astype(np.int16).tobytes()); o.close()
