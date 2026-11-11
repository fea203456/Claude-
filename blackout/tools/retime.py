"""Voice-driven timing: speed the phrases up a little, then stretch every subtitle line to its phrase. Rewrites src/script.js."""
import os, json, wave, subprocess
ROOT = os.path.join(os.path.dirname(__file__), ".."); TEMPO = 1.1; GAP = .22
VO = json.load(open(os.path.join(ROOT, "src/vo.json"), encoding="utf8")); src = os.path.join(ROOT, "src/script.js")
BK = json.loads(open(src, encoding="utf8").read().split("=", 1)[1]); L = BK["lines"]
os.makedirs(os.path.join(ROOT, "voice/t"), exist_ok=True); vo = []
for k, (idx, text) in enumerate(VO):
    out = os.path.join(ROOT, f"voice/t/s{k:02d}.wav")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(ROOT, f"voice/s{k:02d}.wav"), "-af", f"atempo={TEMPO},highpass=f=70", "-ar", "48000", "-ac", "1", out], check=True)
    w = wave.open(out); D = w.getnframes() / w.getframerate()
    red = any("^" in L[i]["text"] for i in idx); slot = max(D + GAP + (.12 if red else 0), .85 * len(idx))
    wts = [max(4, len(L[i]["text"].replace("~", "").replace("^", "").replace("|", " "))) for i in idx]
    for i, wt in zip(idx, wts): L[i]["d"] = round(slot * wt / sum(wts), 3)
    vo.append({"k": k, "line": idx[0], "d": round(D, 3)})
t = 0
for l in L: l["t"] = round(t, 3); t += l["d"]
ends = [i for i, l in enumerate(L) if l["scene"] == "end"]; parts = []; s = 0
for e in ends: parts.append([L[s]["t"], round(L[e]["t"] + L[e]["d"], 3)]); s = e + 1
for v in vo: v["t"] = round(L[v["line"]]["t"] + .04, 3)
BK.update(lines=L, parts=parts, dur=round(t, 3), vo=vo)
open(src, "w", encoding="utf8").write("window.BK = " + json.dumps(BK, ensure_ascii=False, indent=0) + "\n")
print("parts", [(round(b - a, 2), round((b - a) * 60)) for a, b in parts], "total", round(t, 2))
