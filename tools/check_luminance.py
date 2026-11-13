#!/usr/bin/env python3
"""tools/check_luminance.py <dir> — средняя яркость Y кадров суток.

Читает day_0600.png, day_1200.png, day_1900.png, day_2300.png из <dir>, меряет
lavfi.signalstats.YAVG через ffmpeg и печатает 4 значения. Код 0, если
day_1200 > day_1900 > day_2300 и day_0600 > day_2300, иначе 1 (2 — ошибка запуска).
Только стандартная библиотека.
"""
import os
import re
import subprocess
import sys

NAMES = ("day_0600", "day_1200", "day_1900", "day_2300")
YAVG_RE = re.compile(r"lavfi\.signalstats\.YAVG=([0-9.]+)")


def yavg(png: str) -> float:
    r = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostdin", "-i", png,
         "-vf", "signalstats,metadata=print", "-f", "null", "-"],
        capture_output=True, text=True, check=False)
    m = YAVG_RE.search(r.stdout + r.stderr)
    if r.returncode != 0 or m is None:
        raise RuntimeError(f"ffmpeg gave no YAVG for {png} (rc={r.returncode}):\n{r.stderr[-800:]}")
    return float(m.group(1))


def main(argv: list[str]) -> int:
    if len(argv) != 2:
        print("usage: check_luminance.py <dir>", file=sys.stderr)
        return 2
    d = argv[1]
    y = {}
    for n in NAMES:
        png = os.path.join(d, n + ".png")
        if not os.path.isfile(png):
            print(f"check_luminance: missing {png}", file=sys.stderr)
            return 2
        try:
            y[n] = yavg(png)
        except RuntimeError as e:
            print(f"check_luminance: {e}", file=sys.stderr)
            return 2
        print(f"{n} YAVG={y[n]:.2f}")
    ok = (y["day_1200"] > y["day_1900"] > y["day_2300"]) and y["day_0600"] > y["day_2300"]
    print("check_luminance: " + ("OK" if ok else
          "FAIL: need day_1200 > day_1900 > day_2300 and day_0600 > day_2300"))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
