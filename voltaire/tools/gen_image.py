"""Generate images with Gemini image models. usage: python3 gen_image.py jobs.json [name ...]
jobs.json: {name: {"prompt": str, "refs": [paths], "model": str, "aspect": "9:16", "size": "2K"}}
Key comes from env GEMINI_API_KEY (the session proxy may inject it; never stored)."""
import os, sys, json, base64, time, urllib.request, urllib.error, concurrent.futures as cf
KEY = os.environ.get("GEMINI_API_KEY", "dummy")
ROOT = os.path.join(os.path.dirname(__file__), "..")
OUT = os.path.join(ROOT, "assets", "raw")
DEF_MODEL = os.environ.get("IMG_MODEL", "gemini-3-pro-image")
def mime(p): return "image/png" if p.endswith(".png") else "image/jpeg" if p.endswith((".jpg", ".jpeg")) else "image/webp"
def gen(name, job):
    parts = [{"text": job["prompt"]}]
    for r in job.get("refs", []):
        rp = r if os.path.isabs(r) else os.path.join(ROOT, r)
        parts.append({"inlineData": {"mimeType": mime(rp), "data": base64.b64encode(open(rp, "rb").read()).decode()}})
    ic = {"aspectRatio": job.get("aspect", "9:16")}
    model = job.get("model", DEF_MODEL)
    if job.get("size") and "2.5" not in model: ic["imageSize"] = job["size"]
    body = {"contents": [{"role": "user", "parts": parts}],
            "generationConfig": {"responseModalities": ["IMAGE"], "imageConfig": ic}}
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
    err = None
    for attempt in range(3):
        t0 = time.time()
        try:
            req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"x-goog-api-key": KEY, "Content-Type": "application/json"})
            d = json.load(urllib.request.urlopen(req, timeout=300))
            for p in d["candidates"][0]["content"]["parts"]:
                if "inlineData" in p:
                    ext = ".png" if "png" in p["inlineData"]["mimeType"] else ".jpg"
                    fn = os.path.join(OUT, name + ext)
                    open(fn, "wb").write(base64.b64decode(p["inlineData"]["data"]))
                    return name, f"ok {time.time()-t0:.0f}s {fn}"
            err = "no image: " + json.dumps(d)[:400]
        except urllib.error.HTTPError as e:
            err = f"HTTP {e.code} {e.read()[:400]}"
        except Exception as e:
            err = repr(e)[:300]
        time.sleep(5 * (attempt + 1))
    return name, "FAILED " + str(err)
if __name__ == "__main__":
    jobs = json.load(open(sys.argv[1])); names = sys.argv[2:] or list(jobs)
    with cf.ThreadPoolExecutor(int(os.environ.get("PAR", "4"))) as ex:
        for n, r in ex.map(lambda n: gen(n, jobs[n]), names): print(n, r, flush=True)
