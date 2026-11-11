"""Narration for «БЛЭКАУТ» with Gemini TTS. One request per part (free-tier daily limits are tiny) -> voice/partN.wav (24 kHz mono).
Key comes from env GEMINI_API_KEY and is never stored. usage: GEMINI_API_KEY=... python3 tools/gen_voice.py [1 2 3]"""
import os, sys, json, base64, time, wave, urllib.request, urllib.error
ROOT = os.path.join(os.path.dirname(__file__), ".."); KEY = os.environ["GEMINI_API_KEY"]
MODELS = os.environ.get("TTS_MODEL", "gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts,gemini-3.8-flash-lite-tts").split(","); VOICE = os.environ.get("TTS_VOICE", "Charon")
STYLE = ("Read aloud in Russian as the narrator of a dark survival thriller: low, calm, tense, close to the microphone, measured pace, "
         "clear diction, no theatrics. Each line is a separate short phrase: finish it with a falling intonation and make a full silent pause "
         "of about one second before the next line. Read only the lines, nothing else:\n\n")
VO = json.load(open(os.path.join(ROOT, "src/vo.json"), encoding="utf8")); BK = json.loads(open(os.path.join(ROOT, "src/script.js"), encoding="utf8").read().split("=", 1)[1])
def part_of(i): t = BK["lines"][i]["t"]; return next(k for k, (a, b) in enumerate(BK["parts"]) if a <= t < b)
def gen(p):
    text = "\n".join(s for idx, s in VO if part_of(idx[0]) == p)
    body = {"contents": [{"parts": [{"text": STYLE + text}]}], "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": VOICE}}}}}
    for model in MODELS:
        req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent", data=json.dumps(body).encode(), headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
        try:
            d = json.load(urllib.request.urlopen(req, timeout=300)); pr = d["candidates"][0]["content"]["parts"][0]["inlineData"]
            pcm = base64.b64decode(pr["data"]); rate = int(pr.get("mimeType", "rate=24000").split("rate=")[-1].split(";")[0])
            with wave.open(os.path.join(ROOT, f"voice/part{p + 1}.wav"), "wb") as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(rate); w.writeframes(pcm)
            print("part", p + 1, model, round(len(pcm) / 2 / rate, 2), "s", flush=True); return
        except urllib.error.HTTPError as e: print("part", p + 1, model, "HTTP", e.code, e.read()[:160].decode("utf8", "replace").replace("\n", " "), flush=True)
        except Exception as e: print("part", p + 1, model, "ERR", repr(e)[:160], flush=True)
    print("part", p + 1, "FAILED", flush=True)
if __name__ == "__main__":
    os.makedirs(os.path.join(ROOT, "voice"), exist_ok=True)
    for a in (sys.argv[1:] or ["1", "2", "3"]): gen(int(a) - 1)
