"""Contact sheets from rendered frames: every second, and frames around each cut (incl. the loop seam)."""
import os, sys
from PIL import Image, ImageDraw
D = "build/frames"; OUT = sys.argv[1] if len(sys.argv) > 1 else "build"
fs = sorted(os.listdir(D)); N = len(fs)
def img(f, w=216, h=384):
    im = Image.open(os.path.join(D, f"f{f:05d}.jpg")).resize((w, h)); d = ImageDraw.Draw(im); d.text((4, 4), f"{f/60:.2f}", fill=(255, 255, 0)); return im
# every second
ts = list(range(0, N, 60)); cols = 11; rows = (len(ts) + cols - 1) // cols
sh = Image.new("RGB", (216 * cols, 384 * rows)); [sh.paste(img(f), ((i % cols) * 216, (i // cols) * 384)) for i, f in enumerate(ts)]; sh.save(f"{OUT}/sheet_seconds.jpg", quality=85)
cuts = [2.72, 5.06, 9.70, 11.84, 16.56, 21.16, 23.56, 28.06, 31.46, 35.46, 38.68, 41.88, 44.38, 50.06, 53.12]
sh = Image.new("RGB", (160 * 4 * 4, 284 * 4))
for i, c in enumerate(cuts + [62.6]):
    f0 = round(c * 60); fr = [f0 - 2, f0 - 1, f0, f0 + 1] if c < 62.6 else [N - 2, N - 1, 0, 1]
    for j, f in enumerate(fr): sh.paste(img(f % N, 160, 284), (((i % 4) * 4 + j) * 160, (i // 4) * 284))
sh.save(f"{OUT}/sheet_cuts.jpg", quality=85); print("sheets ok", N)
