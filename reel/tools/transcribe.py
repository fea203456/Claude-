"""Ask Gemini to transcribe + describe voice clips (verification aid; key from env)."""
import os, sys, json, base64, urllib.request
KEY = os.environ["GEMINI_API_KEY"]; MODEL = os.environ.get("ASR_MODEL", "gemini-2.5-flash")
parts = [{"text": sys.argv[1]}]
for f in sys.argv[2:]:
    parts += [{"text": "FILE " + os.path.basename(f)}, {"inlineData": {"mimeType": "audio/wav", "data": base64.b64encode(open(f, "rb").read()).decode()}}]
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
    data=json.dumps({"contents": [{"parts": parts}]}).encode(), headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
try:
    d = json.load(urllib.request.urlopen(req, timeout=180)); print(d["candidates"][0]["content"]["parts"][0]["text"])
except urllib.error.HTTPError as e: print(e.code, e.read()[:500])
