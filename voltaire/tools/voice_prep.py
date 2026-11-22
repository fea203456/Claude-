"""Build the final narration track from the chosen take: re-time pauses, global tempo, per-phrase fixes.
Writes voice/vo.wav (48 kHz mono) and data/vo_timeline.json (phrase + word timings on the final timeline)."""
import wave, json, os, re, subprocess, numpy as np
ROOT = os.path.join(os.path.dirname(__file__), ".."); SR = 48000
TAKE = os.path.join(ROOT, "voice", "vo2_31_puck.src.wav")
TEMPO = float(os.environ.get("TEMPO", "1.08"))
A = {r["id"]: r for r in json.load(open(os.path.join(ROOT, "data", "align.json")))}
# manual fixes verified by utterance transcription (court -> ending area)
for k, (s, e) in {"p25": (56.43, 58.71), "p26": (59.31, 61.00), "p27": (61.86, 62.86), "p28": (63.08, 64.93), "p29": (65.15, 67.22)}.items():
    A[k]["start"], A[k]["end"] = s, e
IDS = sorted(A)
GAP_AFTER = {"p01": .10, "p02": .42, "p03": .12, "p04": .14, "p05": .30, "p06": .10, "p07": .22, "p08": .14, "p09": .38,
             "p10": .16, "p11": .38, "p12": .12, "p13": .10, "p14": .40, "p15": .34, "p16": .55, "p17": .32, "p18": .24,
             "p19": .20, "p20": .36, "p21": .10, "p22": .40, "p23": .40, "p24": .60, "p25": .30, "p26": .50, "p27": .22,
             "p28": .08, "p29": .36, "p30": .22, "p31": .40, "p32": .30, "p33": 0}
LOCAL = {"p27": .90}   # slow the mumbled 'Министра вскоре сняли' a little
def rd(p):
    w = wave.open(p); return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768, w.getframerate()
src, ssr = rd(TAKE)
def stretch(x, sr, tempo):
    tmp = "/tmp/_vp_in.wav"; out = "/tmp/_vp_out.wav"
    w = wave.open(tmp, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"aresample={SR}:resampler=soxr,atempo={tempo:.4f}", "-ac", "1", out], check=True)
    y, _ = rd(out); return y
def squeeze_internal(x, sr):
    """shorten silences inside a phrase to 60% (min 60 ms)"""
    hop = sr // 100; e = np.array([np.sqrt((x[i*hop:(i+1)*hop]**2).mean()) for i in range(len(x)//hop)]); sp = e > .008
    keep = np.ones(len(x), bool); i = 0
    while i < len(sp):
        if not sp[i]:
            j = i
            while j < len(sp) and not sp[j]: j += 1
            L = (j - i) / 100
            if L > .12 and i > 0 and j < len(sp):
                newL = max(.06, L * .6); cut = int((L - newL) * sr); mid = (i * hop + j * hop) // 2
                keep[mid - cut // 2: mid + cut // 2] = False
            i = j
        else: i += 1
    return x[keep]
out = []; t = 0.20; TL = []
for k in IDS:
    r = A[k]; s0, s1 = int((r["start"] - .03) * ssr), int((r["end"] + .05) * ssr)
    x = squeeze_internal(src[s0:s1], ssr)
    fade = int(.012 * ssr); x[:fade] *= np.linspace(0, 1, fade); x[-fade:] *= np.linspace(1, 0, fade)
    y = stretch(x, ssr, TEMPO * LOCAL.get(k, 1.0))
    TL.append({"id": k, "text": r["text"], "start": round(t, 3), "end": round(t + len(y) / SR, 3)})
    out.append((t, y)); t += len(y) / SR + GAP_AFTER[k] / TEMPO
N = int((t + .05) * SR); vo = np.zeros(N, np.float32)
for t0, y in out: i = int(t0 * SR); vo[i:i + len(y)] += y[:N - i]
vo /= np.abs(vo).max() / .9
w = wave.open(os.path.join(ROOT, "voice", "vo.wav"), "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((vo * 32767).astype(np.int16).tobytes()); w.close()
# word timings by syllable share inside each phrase (approximate, for captions)
for p in TL:
    words = p["text"].split(); syl = [max(1, len(re.findall("[аеёиоуыэюяАЕЁИОУЫЭЮЯ]", wd))) for wd in words]
    tot = sum(syl); d = p["end"] - p["start"]; acc = 0; p["words"] = []
    for wd, s in zip(words, syl): p["words"].append([wd, round(p["start"] + d * acc / tot, 3)]); acc += s
json.dump({"tempo": TEMPO, "dur": round(t, 3), "phrases": TL}, open(os.path.join(ROOT, "data", "vo_timeline.json"), "w"), ensure_ascii=False, indent=1)
for p in TL: print(f'{p["id"]} {p["start"]:6.2f}-{p["end"]:6.2f}  {p["text"]}')
print("total", round(t, 2))
