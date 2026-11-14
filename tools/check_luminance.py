#!/usr/bin/env python3
"""tools/check_luminance.py <dir> [--min-contrast N] — яркость и контраст кадров суток.

Читает day_0600, day_1200, day_1900, day_2100, day_2300, day_0100 (.png) из <dir> и через
`ffmpeg -vf signalstats,metadata=print` меряет для каждого YAVG (средняя яркость Y) и
контраст YHIGH − YLOW (90-й минус 10-й перцентиль Y). Печатает строку на кадр.

Код выхода:
  0 — порядок яркости day_1200 > day_1900 > day_2300, day_0600 > day_2300 и
      day_1900 > day_2100, day_1900 > day_0100, day_2100 >= day_2300 соблюдён
      и контраст day_0600 и day_1200 не ниже N (без --min-contrast контраст не проверяется);
  1 — порядок или контраст нарушен;
  2 — не удалось измерить: нет файла, ffmpeg упал или не выдал значение, неверные аргументы.
Только стандартная библиотека.
"""
import math
import os
import re
import subprocess
import sys

NAMES = ("day_0600", "day_1200", "day_1900", "day_2100", "day_2300", "day_0100")
CONTRAST_NAMES = ("day_0600", "day_1200")
STATS = ("YAVG", "YLOW", "YHIGH")
STAT_RE = {k: re.compile(r"lavfi\.signalstats\.%s=([0-9.]+)" % k) for k in STATS}
USAGE = "usage: check_luminance.py <dir> [--min-contrast N]  (N — конечное число)"


class MeasureError(Exception):
    pass


def measure(png: str) -> dict:
    """{"YAVG": …, "YLOW": …, "YHIGH": …} первого кадра PNG; MeasureError, если чего-то нет."""
    try:
        r = subprocess.run(
            ["ffmpeg", "-hide_banner", "-nostdin", "-i", png,
             "-vf", "signalstats,metadata=print", "-f", "null", "-"],
            capture_output=True, text=True, check=False)
    except OSError as e:
        raise MeasureError(f"cannot run ffmpeg: {e}") from e
    out = r.stdout + r.stderr
    vals = {}
    for k, rx in STAT_RE.items():
        m = rx.search(out)
        if m is None:
            break
        vals[k] = float(m.group(1))
    if r.returncode != 0 or len(vals) != len(STATS):
        missing = [k for k in STATS if k not in vals]
        raise MeasureError(f"ffmpeg gave no {'/'.join(missing) or 'result'} for {png} "
                           f"(rc={r.returncode}):\n{r.stderr[-800:]}")
    return vals


def parse_args(argv: list[str]):
    """(dir, min_contrast | None) или None при ошибке."""
    args = argv[1:]
    min_c = None
    if "--min-contrast" in args:
        i = args.index("--min-contrast")
        if i + 1 >= len(args):
            return None
        try:
            min_c = float(args[i + 1])
        except ValueError:
            return None
        if not math.isfinite(min_c):
            return None
        del args[i:i + 2]
    if len(args) != 1 or args[0].startswith("--"):
        return None
    return args[0], min_c


def main(argv: list[str]) -> int:
    parsed = parse_args(argv)
    if parsed is None:
        print(USAGE, file=sys.stderr)
        return 2
    d, min_c = parsed
    y = {}
    c = {}
    for n in NAMES:
        png = os.path.join(d, n + ".png")
        if not os.path.isfile(png):
            print(f"check_luminance: missing {png}", file=sys.stderr)
            return 2
        try:
            v = measure(png)
        except MeasureError as e:
            print(f"check_luminance: {e}", file=sys.stderr)
            return 2
        y[n] = v["YAVG"]
        c[n] = v["YHIGH"] - v["YLOW"]
        print(f"{n} YAVG={y[n]:.2f} contrast={c[n]:.0f}")
    fails = []
    if not ((y["day_1200"] > y["day_1900"] > y["day_2300"]) and y["day_0600"] > y["day_2300"]):
        fails.append("need day_1200 > day_1900 > day_2300 and day_0600 > day_2300")
    # Анти-цель «ночь светлее заката» — для каждого ночного кадра, не только 23:00.
    if not (y["day_1900"] > y["day_2100"] and y["day_1900"] > y["day_0100"]):
        fails.append("need day_1900 > day_2100 and day_1900 > day_0100")
    # Сумерки не темнее глубокой ночи.
    if not y["day_2100"] >= y["day_2300"]:
        fails.append("need day_2100 >= day_2300")
    if min_c is not None:
        low = [n for n in CONTRAST_NAMES if c[n] < min_c]
        if low:
            fails.append("contrast below %g: %s" % (min_c, ", ".join(low)))
    print("check_luminance: " + ("OK" if not fails else "FAIL: " + "; ".join(fails)))
    return 0 if not fails else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
