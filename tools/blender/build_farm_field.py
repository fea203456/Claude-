"""build_farm_field.py <out_dir> — модели поля фермы: плитка земли, рамка клетки, межа, колодец.

<out_dir>/soil_tile/soil_tile.glb — рыхлая вспаханная плитка 0.98 × 0.98 м, высота ≤ 0.11 м:
три борозды вдоль X, комья. Один нейтральный светло-серый материал soil_tilled — цвет
(сухая/влажная/истощённая земля) игра задаёт умножением.
<out_dir>/cell_frame/cell_frame.glb — плоская рамка выбранной клетки 1.0 × 1.0 м, линия 0.06,
высота 0.02, материал highlight_pale.
<out_dir>/field_border/field_border.glb — межа вокруг поля 12 (X) × 8 (Y) м: низкий земляной вал
с камнями; внутренний край ровно по прямоугольнику поля, внутрь ничего не заходит, снаружи
не дальше 0.4 м.
<out_dir>/well/well.glb — старый колодец: кольцо из неровных камней ⌀ ≈ 1.6 м и высотой 0.9 м,
вода внутри, два столба с двускатным навесом из выбеленных досок, ворот с ручкой на +X,
ведро на верёвке над срубом. Общая высота ≈ 2.55 м.
Начало координат всех моделей — центр основания на земле. Low-poly, плоское затенение,
неровности — с фиксированным зерном.
"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402,F401  (bpy до bmesh: bmesh грузится из модуля bpy)
from mathutils import Vector  # noqa: E402

from build_props_farm import Builder  # noqa: E402
from lib import scene  # noqa: E402

SEED = 1114

# --- плитка и рамка
TILE_HALF = 0.49
FURROWS = (0.040, 0.082, 0.058, 0.094, 0.058, 0.082, 0.040)  # профиль поперёк борозд (по Y)
FRAME_HALF = 0.5
FRAME_LINE = 0.06
FRAME_H = 0.02

# --- межа
FIELD_HALF_X = 6.0
FIELD_HALF_Y = 4.0
BANK_W = 0.4                      # ширина вала наружу от края поля
BANK_STEP = 0.6                   # шаг сечений вала вдоль края
# сечение вала: (расстояние от края поля, доля высоты)
BANK_PROFILE = ((0.0, 0.0), (0.07, 0.65), (0.2, 1.0), (0.33, 0.55), (0.4, 0.0))

# --- колодец
R_IN, R_OUT = 0.55, 0.78
COURSES, COURSE_H, BLOCKS = 4, 0.2, 9
CAP_TOP = 0.9
WATER_Z = 0.4
POST_X, POST_HALF, POST_TOP = 0.665, 0.065, 2.42
RIDGE_Z = 2.46                    # низ досок навеса на коньке
EAVE_Y = 0.78
ROOF_PITCH_DEG = 35.0
ROOF_HALF_X = 0.86
BOARD_T = 0.035
AXLE_Z, AXLE_R = 1.25, 0.065


# --------------------------------------------------------------------------- плитка и рамка

def build_soil_tile():
    rng = random.Random(SEED)
    b = Builder("SoilTile")
    nx, ny = 5, len(FURROWS)

    def top(i, j, x, y):
        if i in (0, nx - 1) or j in (0, ny - 1):    # края грядки осыпаны почти до земли
            return 0.022 + rng.uniform(0.0, 0.012)
        return FURROWS[j] + rng.uniform(-0.016, 0.014)

    b.lumpy_slab(-TILE_HALF, TILE_HALF, -TILE_HALF, TILE_HALF, 0.0, top, nx, ny, "soil_tilled")
    # гребни борозд не по линейке: внутренние вершины верха сдвинуты в плане
    inner = TILE_HALF - 1e-4
    for v in b.bm.verts:
        if v.co.z > 0.0 and abs(v.co.x) < inner and abs(v.co.y) < inner:
            v.co.x += rng.uniform(-0.05, 0.05)
            v.co.y += rng.uniform(-0.035, 0.035)
    return [b.finish()]


def build_cell_frame():
    b = Builder("CellFrame")
    o, i = FRAME_HALF, FRAME_HALF - FRAME_LINE
    sq = ((-1, -1), (1, -1), (1, 1), (-1, 1))
    rings = {}
    for name, h, z in (("ob", o, 0.0), ("ib", i, 0.0), ("ot", o, FRAME_H), ("it", i, FRAME_H)):
        rings[name] = [b.bm.verts.new((sx * h, sy * h, z)) for sx, sy in sq]
    for k in range(4):
        n = (k + 1) % 4
        for a, c in (("ot", "it"), ("ib", "ob"), ("ob", "ot"), ("it", "ib")):
            b.face((rings[a][k], rings[a][n], rings[c][n], rings[c][k]), "highlight_pale")
    return [b.finish()]


# --------------------------------------------------------------------------- межа

def border_path():
    """Точки внутреннего края поля против часовой и направление «наружу» в каждой.
    В углах направление — диагональ (1, 1): смещение d даёт угол со стороной d по обеим осям."""
    hx, hy = FIELD_HALF_X, FIELD_HALF_Y
    corners = [(-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)]
    normals = [(0.0, -1.0), (1.0, 0.0), (0.0, 1.0), (-1.0, 0.0)]   # наружу от сторон 0..3
    path = []
    for k in range(4):
        (x0, y0), (x1, y1) = corners[k], corners[(k + 1) % 4]
        prev_n, n = normals[k - 1], normals[k]
        path.append(((x0, y0), (prev_n[0] + n[0], prev_n[1] + n[1])))
        segs = max(1, round(math.hypot(x1 - x0, y1 - y0) / BANK_STEP))
        for s in range(1, segs):
            t = s / segs
            path.append(((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t), n))
    return path


def bank(b, rng):
    """Земляной вал: замкнутая трубка из сечений BANK_PROFILE, низ на z = 0."""
    sections = []
    for (px, py), (nx, ny) in border_path():
        h = rng.uniform(0.08, 0.15)
        reach = rng.uniform(0.85, 1.0)              # внешний край — только внутрь габарита
        sec = []
        for k, (d, f) in enumerate(BANK_PROFILE):
            d = d if k < 2 else d * reach
            sec.append(b.bm.verts.new((px + nx * d, py + ny * d, h * f * rng.uniform(0.85, 1.0))))
        sec[0].co.z = sec[-1].co.z = 0.0
        sections.append(sec)
    m, n = len(sections), len(BANK_PROFILE)
    for s in range(m):
        a, c = sections[s], sections[(s + 1) % m]
        for k in range(n - 1):
            b.face((a[k], c[k], c[k + 1], a[k + 1]), "soil_bank")
        b.face((a[n - 1], c[n - 1], c[0], a[0]), "soil_bank")   # дно


def keep_outside(x, y):
    """Сдвигает точку из проёма поля на его ближайший край и не даёт уйти за габарит."""
    hx, hy = FIELD_HALF_X, FIELD_HALF_Y
    if abs(x) < hx and abs(y) < hy:
        if hx - abs(x) < hy - abs(y):
            x = math.copysign(hx, x)
        else:
            y = math.copysign(hy, y)
    lim_x, lim_y = hx + BANK_W - 0.02, hy + BANK_W - 0.02
    return max(-lim_x, min(lim_x, x)), max(-lim_y, min(lim_y, y))


def stone(b, rng, cx, cy, a, c, yaw, top, key, clamp=None):
    """Валун: неровный усечённый «кирпич» с полуразмерами a × c, низ на z = 0."""
    cs, sn = math.cos(yaw), math.sin(yaw)
    pts = []
    for z, shrink in ((0.0, 1.0), (top, rng.uniform(0.55, 0.75))):
        for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            u = sx * a * shrink * rng.uniform(0.8, 1.15)
            v = sy * c * shrink * rng.uniform(0.8, 1.15)
            x, y = cx + u * cs - v * sn, cy + u * sn + v * cs
            if clamp:
                x, y = clamp(x, y)
            pts.append((x, y, z if z == 0.0 else z + rng.uniform(-0.02, 0.0)))
    b.hexa(pts, key)


def border_stones(b, rng):
    hx, hy = FIELD_HALF_X, FIELD_HALF_Y
    # по крупному валуну в каждом углу
    for sx in (-1, 1):
        for sy in (-1, 1):
            stone(b, rng, sx * (hx + 0.2), sy * (hy + 0.2), 0.13, 0.11, rng.uniform(0, math.pi),
                  rng.uniform(0.16, 0.19), "stone_dark", keep_outside)
    # редкие камни вдоль сторон
    sides = [((-hx, -hy), (1, 0), (0, -1), 2 * hx), ((hx, -hy), (0, 1), (1, 0), 2 * hy),
             ((hx, hy), (-1, 0), (0, 1), 2 * hx), ((-hx, hy), (0, -1), (-1, 0), 2 * hy)]
    for (x0, y0), (tx, ty), (nx, ny), length in sides:
        s = rng.uniform(0.4, 1.0)
        while s < length - 0.4:
            if rng.random() > 0.2:
                d = rng.uniform(0.2, 0.24)
                cx, cy = x0 + tx * s + nx * d, y0 + ty * s + ny * d
                yaw = math.atan2(ty, tx) + rng.uniform(-0.3, 0.3)
                key = "stone_old" if rng.random() < 0.65 else "stone_dark"
                stone(b, rng, cx, cy, rng.uniform(0.07, 0.12), rng.uniform(0.06, 0.1), yaw,
                      rng.uniform(0.12, 0.19), key, keep_outside)
            s += rng.uniform(0.4, 1.3)


def build_field_border():
    rng = random.Random(SEED + 1)
    b = Builder("FieldBorder")
    bank(b, rng)
    border_stones(b, rng)
    return [b.finish()]


# --------------------------------------------------------------------------- колодец

def polar(r, a, z):
    return (r * math.cos(a), r * math.sin(a), z)


def ring_block(b, rng, a0, a1, r0, r1, z0, z1, key, jr=0.015, jz=0.02):
    """Камень кольца между углами a0..a1, радиусами r0..r1 и высотами z0..z1 с перекосом."""
    def jz_(z):
        return z if z == 0.0 else z + rng.uniform(-jz, jz * 0.5)

    def jr_(r):
        return r + rng.uniform(-jr, jr)

    bot = [polar(r0, a0, jz_(z0)), polar(jr_(r1), a0, jz_(z0)),
           polar(jr_(r1), a1, jz_(z0)), polar(r0, a1, jz_(z0))]
    tz = [z1 + rng.uniform(-jz, 0.0) for _ in range(4)]
    top = [polar(r0, a0, tz[0]), polar(jr_(r1), a0, tz[1]),
           polar(jr_(r1), a1, tz[2]), polar(r0, a1, tz[3])]
    b.hexa(bot + top, key)


def well_ring(b, rng):
    step = 2 * math.pi / BLOCKS
    for k in range(COURSES):
        z0, z1 = k * COURSE_H, (k + 1) * COURSE_H
        damp = 0.55 if k == 0 else 0.25             # у земли камень темнее, сырее
        for i in range(BLOCKS):
            a0 = step * (i + 0.5 * (k % 2)) + rng.uniform(-0.04, 0.04)
            key = "stone_dark" if rng.random() < damp else "stone_old"
            ring_block(b, rng, a0, a0 + step + 0.02, R_IN, R_OUT, z0, z1, key)
    # венец из крупных плит с напуском
    cap = 2 * math.pi / 8
    for i in range(8):
        a0 = cap * i + 0.2 + rng.uniform(-0.03, 0.03)
        key = "stone_old" if rng.random() < 0.7 else "stone_dark"
        ring_block(b, rng, a0, a0 + cap + 0.015, R_IN - 0.03, R_OUT + 0.025,
                   COURSES * COURSE_H, CAP_TOP + 0.01, key, jr=0.01, jz=0.012)


def water(b):
    n = 10
    rings = [[polar(R_IN + 0.01, 2 * math.pi * k / n, z) for k in range(n)]
             for z in (WATER_Z - 0.03, WATER_Z)]
    b.strip(rings, "water_dark")


def posts(b, rng):
    for sx in (-1, 1):
        lean = rng.uniform(-0.025, 0.025)
        x, h = sx * POST_X, POST_HALF
        b.hexa([(x - h, -h, 0.0), (x + h, -h, 0.0), (x + h, h, 0.0), (x - h, h, 0.0),
                (x - h + lean, -h, POST_TOP), (x + h + lean, -h, POST_TOP),
                (x + h + lean, h, POST_TOP), (x - h + lean, h, POST_TOP)], "wood_old")
    b.box((-ROOF_HALF_X + 0.04, -0.05, RIDGE_Z - 0.1), (ROOF_HALF_X - 0.04, 0.05, RIDGE_Z),
          "wood_old")                                # коньковый брус


def roof_point(side, y, x, lift=0.0):
    tan = math.tan(math.radians(ROOF_PITCH_DEG))
    return Vector((x, side * y, RIDGE_Z - y * tan + lift))


def roof(b, rng):
    """Два ската из выбеленных досок вдоль ската; одна доска обломана у края."""
    cos = math.cos(math.radians(ROOF_PITCH_DEG))
    t = Vector((0.0, 0.0, BOARD_T / cos))
    boards = 5
    w = 2 * ROOF_HALF_X / boards
    broken = (rng.choice((-1, 1)), rng.randrange(boards))
    for side in (-1, 1):
        for i in range(boards):
            x0, x1 = -ROOF_HALF_X + i * w + 0.006, -ROOF_HALF_X + (i + 1) * w - 0.006
            lift = rng.uniform(0.0, 0.012)
            skew = rng.uniform(-0.02, 0.02)
            y_end = EAVE_Y + rng.uniform(-0.04, 0.0)
            if (side, i) == broken:
                y_end -= 0.22
            pts = [roof_point(side, 0.0, x0, lift), roof_point(side, 0.0, x1, lift),
                   roof_point(side, y_end, x1 + skew, lift), roof_point(side, y_end, x0 + skew, lift)]
            b.hexa([tuple(p) for p in pts] + [tuple(p + t) for p in pts], "wood_weathered")
        # стропила под досками над столбами
        for sx in (-1, 1):
            x = sx * POST_X
            lo, hi = roof_point(side, EAVE_Y - 0.06, x), roof_point(side, 0.04, x)
            d = Vector((0.0, 0.0, -0.08))
            pts = [lo + Vector((-0.035, 0, 0)), lo + Vector((0.035, 0, 0)),
                   hi + Vector((0.035, 0, 0)), hi + Vector((-0.035, 0, 0))]
            b.hexa([tuple(p) for p in pts] + [tuple(p + d) for p in pts], "wood_old")
    top = RIDGE_Z + BOARD_T / cos + 0.012
    b.box((-ROOF_HALF_X - 0.02, -0.07, top - 0.02), (ROOF_HALF_X + 0.02, 0.07, top + 0.05),
          "wood_weathered")                          # коньковая доска


def cylinder_x(b, x0, x1, r, key, sides=6, z=AXLE_Z):
    rings = [[(x, r * math.cos(2 * math.pi * k / sides), z + r * math.sin(2 * math.pi * k / sides))
              for k in range(sides)] for x in (x0, x1)]
    b.strip(rings, key)


def cylinder_z(b, cx, cy, z0, z1, r0, r1, key, sides=6):
    rings = [[(cx + r * math.cos(2 * math.pi * k / sides), cy + r * math.sin(2 * math.pi * k / sides), z)
              for k in range(sides)] for z, r in ((z0, r0), (z1, r1))]
    b.strip(rings, key)


def windlass(b):
    """Ворот между столбами, намотанная верёвка, ручка на +X и ведро на верёвке."""
    cylinder_x(b, -POST_X - 0.1, POST_X + 0.14, AXLE_R, "wood_old")
    cylinder_x(b, -0.22, 0.22, AXLE_R + 0.03, "cloth_ash")            # намотка
    x = POST_X + 0.14
    b.box((x, -0.025, AXLE_Z - 0.26), (x + 0.045, 0.025, AXLE_Z + 0.03), "wood_old")  # рычаг
    b.box((x + 0.045, -0.02, AXLE_Z - 0.26), (x + 0.2, 0.02, AXLE_Z - 0.22), "metal_dull")
    b.box((-0.012, -0.012, 1.05), (0.012, 0.012, AXLE_Z), "cloth_ash")  # верёвка
    cylinder_z(b, 0.0, 0.0, 0.74, 0.98, 0.11, 0.13, "wood_old")          # ведро
    cylinder_z(b, 0.0, 0.0, 0.86, 0.89, 0.128, 0.13, "metal_dull")       # обруч
    b.box((-0.14, -0.01, 0.92), (-0.125, 0.01, 1.06), "metal_dull")      # дужка
    b.box((0.125, -0.01, 0.92), (0.14, 0.01, 1.06), "metal_dull")
    b.box((-0.14, -0.01, 1.045), (0.14, 0.01, 1.06), "metal_dull")


def build_well():
    rng = random.Random(SEED + 2)
    b = Builder("Well")
    well_ring(b, rng)
    water(b)
    posts(b, rng)
    roof(b, rng)
    windlass(b)
    return [b.finish()]


# --------------------------------------------------------------------------- сборка

def build(out_dir):
    out = Path(out_dir)
    for name, make in (("soil_tile", build_soil_tile), ("cell_frame", build_cell_frame),
                       ("field_border", build_field_border), ("well", build_well)):
        scene.reset()
        objs = make()
        print(f"{name} triangles: {scene.triangle_count(objs)}")
        scene.export_glb(str(out / name / f"{name}.glb"), objs)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: build_farm_field.py <out_dir>")
    build(sys.argv[1])
