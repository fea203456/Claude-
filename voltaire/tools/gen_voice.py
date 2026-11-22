"""Gemini TTS for the narrator. usage: python3 gen_voice.py lines.json [id ...]  (env VOICE, TTS_MODEL)
Writes voice/<id>.src.wav. Key from env GEMINI_API_KEY (proxy may inject it)."""
import os, sys, json, base64, time, wave, urllib.request, urllib.error
KEY = os.environ.get("GEMINI_API_KEY", "dummy"); MODEL = os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts")
ROOT = os.path.join(os.path.dirname(__file__), ".."); OUT = os.path.join(ROOT, "voice")
def gen(i, line, voice):
    body = {"contents": [{"parts": [{"text": (line["style"] + "\n" + line["text"] if line["style"].startswith("#") else line["style"] + ": " + line["text"])}]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
    for a in range(4):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=180))
            p = d["candidates"][0]["content"]["parts"][0]["inlineData"]; raw = base64.b64decode(p["data"])
            fn = os.path.join(OUT, i + ".src.wav")
            if raw[:4] == b"RIFF": open(fn, "wb").write(raw)
            else:
                w = wave.open(fn, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(raw); w.close()
            return "ok"
        except urllib.error.HTTPError as e: err = f"HTTP {e.code} {e.read().decode()[-900:]}"
        except Exception as e: err = repr(e)[:300]
        time.sleep(15 * (a + 1))
    return "FAILED " + err
if __name__ == "__main__":
    L = json.load(open(sys.argv[1])); ids = sys.argv[2:] or list(L)
    for i in ids:
        v = L[i].get("voice", os.environ.get("VOICE", "Charon")); print(i, v, gen(i, L[i], v), flush=True); time.sleep(float(os.environ.get("GAP", "4")))
