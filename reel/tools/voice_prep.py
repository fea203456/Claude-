"""Trim, retime and pitch the Gemini voice lines; write voice/<id>.wav (48k) + src/voice.js (durations, mouth envelopes)."""
import os, json, subprocess, wave, numpy as np
D = os.path.join(os.path.dirname(__file__), "..", "voice"); SR = 48000
CFG = {"a": dict(tempo=1.22, pitch=2 ** (0.4 / 12)), "s": dict(tempo=1.0, pitch=2 ** (-2.0 / 12))}
def rd(p):
    if open(p, "rb").read(4) != b"RIFF":  # some Gemini TTS models return raw 24 kHz 16-bit PCM
        return np.frombuffer(open(p, "rb").read(), dtype=np.int16).astype(np.float32) / 32768, 24000
    w = wave.open(p); a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    return a.reshape(-1, w.getnchannels()).mean(1), w.getframerate()
out = {}
for f in sorted(os.listdir(D)):
    if not f.endswith(".src.wav"): continue
    k = f[:-8]; c = CFG[k[0]]; a, sr = rd(os.path.join(D, f))
    env = np.convolve(np.abs(a), np.ones(480) / 480, "same"); idx = np.where(env > 0.012)[0]
    a = a[max(0, idx[0] - 600): idx[-1] + 2400]
    tmp = os.path.join(D, k + ".tmp.wav"); w = wave.open(tmp, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((a * 32767).astype(np.int16).tobytes()); w.close()
    dst = os.path.join(D, k + ".wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", tmp, "-af", f"asetrate={sr * c['pitch']:.0f},aresample={SR},atempo={c['tempo'] / c['pitch']:.5f},highpass=f=90", "-ac", "1", dst], check=True); os.remove(tmp)
    b, _ = rd(dst); b /= max(1e-6, np.abs(b).max()) / 0.9
    w = wave.open(dst, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((b * 32767).astype(np.int16).tobytes()); w.close()
    hop = SR // 60; n = len(b) // hop; e = np.array([np.sqrt((b[i * hop:(i + 1) * hop] ** 2).mean()) for i in range(n)])
    e = np.clip(e / (np.percentile(e, 92) + 1e-6), 0, 1) ** 0.7; e = np.convolve(e, [.25, .5, .25], "same")
    out[k] = {"dur": round(len(b) / SR, 3), "env": [round(float(x), 2) for x in e]}
    print(k, out[k]["dur"])
open(os.path.join(D, "..", "src", "voice.js"), "w").write("window.VOICE=" + json.dumps(out) + ";")
