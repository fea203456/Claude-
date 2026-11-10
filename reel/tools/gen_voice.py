"""Generate voice lines with Gemini TTS. Key is read from env GEMINI_API_KEY (never stored)."""
import time, os, sys, json, base64, subprocess, urllib.request, concurrent.futures as cf
KEY = os.environ["GEMINI_API_KEY"]
MODEL = os.environ.get("TTS_MODEL", "gemini-3.8-flash-tts")
OUT = os.path.join(os.path.dirname(__file__), "..", "voice")
ALEX = ("Puck", "Say in Russian, very fast, in a high, upbeat, cocky young-influencer voice, {m}: ")
SEM = ("Algenib", "Say in Russian, in a low, lazy, completely calm deadpan voice, {m}: ")
LINES = {
 "a1": (ALEX, "smug", "Я не прокрастинирую. Я выстраиваю систему."),
 "a2": (ALEX, "lecturing", "Сначала — система. Потом — результат."),
 "s1": (SEM, "yawning", "Одна строчка. Я спать."),
 "a3": (ALEX, "thoughtful then worried", "Жёлтый — срочное. Нет, жёлтый тревожный."),
 "a4": (ALEX, "condescending, mocking", "Серьёзно?! Одна строчка в день?"),
 "s2": (SEM, "dry", "Вчера тоже была одна."),
 "a5": (ALEX, "in a blissful whisper", "Я... в потоке."),
 "s3": (SEM, "slightly ironic", "Красиво. А проект где?"),
 "a6": (ALEX, "rapid-fire corporate patter", "В бэклоге этапа подготовки к планированию."),
 "a7": (ALEX, "nervous, fake-cheerful", "Спокойно! Ночь — мой пик."),
 "a8": (ALEX, "delighted, as if finding treasure", "О-о! Вот ЭТО мне и нужно!"),
 "a9": (ALEX, "lecturing", "Сначала — система."),
 "s4": (SEM, "pleased, smirking", "Спасибо за покупку."),
}
def gen(k):
    (voice, tpl), mood, text = LINES[k]
    body = {"contents": [{"parts": [{"text": text}]}],
            "generationConfig": {"responseModalities": ["AUDIO"],
              "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": voice}}}}}
    req = urllib.request.Request(
        f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(), headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
    for attempt in range(1):
        try:
            d = json.load(urllib.request.urlopen(req, timeout=120))
            p = d["candidates"][0]["content"]["parts"][0]["inlineData"]
            raw = base64.b64decode(p["data"]); mt = p["mimeType"]
            tmp = os.path.join(OUT, k + ".raw")
            open(tmp, "wb").write(raw)
            os.replace(tmp, os.path.join(OUT, k + ".src.wav"))
            return k, mt
        except Exception as e:
            err = e
    return k, "FAILED " + repr(err)[:300]
keys = sys.argv[1:] or list(LINES)
import time
for k in keys:
    print(*gen(k), flush=True); time.sleep(float(os.environ.get('GAP','7')))
