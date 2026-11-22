"""Ask a Gemini model about media files (verification aid). usage: ask_gemini.py "question" file...  (env ASK_MODEL)"""
import os, sys, json, base64, urllib.request, urllib.error, mimetypes
KEY = os.environ.get("GEMINI_API_KEY", "dummy"); MODEL = os.environ.get("ASK_MODEL", "gemini-2.5-flash")
parts = [{"text": sys.argv[1]}]
for f in sys.argv[2:]:
    mt = mimetypes.guess_type(f)[0] or "application/octet-stream"
    parts += [{"text": "FILE " + os.path.basename(f)}, {"inlineData": {"mimeType": mt, "data": base64.b64encode(open(f, "rb").read()).decode()}}]
req = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent",
    data=json.dumps({"contents": [{"parts": parts}]}).encode(), headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
try:
    d = json.load(urllib.request.urlopen(req, timeout=300)); print("".join(p.get("text", "") for p in d["candidates"][0]["content"]["parts"]))
except urllib.error.HTTPError as e: print(e.code, e.read()[:300]); sys.exit(1)
