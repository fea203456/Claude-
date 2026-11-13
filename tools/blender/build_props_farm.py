"""build_props_farm.py <out_dir> — пропы фермы: дом-заглушка и кровать.

<out_dir>/house_stub/house_stub.glb — дощатая изба 6 (X) × 5 (Y) м, 2.6 м до карниза, с
двускатной соломенной крышей (конёк вдоль X, фронтоны на ±X). Дверной проём 1.1 × 2.1 м по
центру стены −Y (в Godot это +Z) в наличнике, створка распахнута внутрь к стене. Свесов
почти нет: габарит по горизонтали должен остаться 6 × 5 м.
<out_dir>/bed/bed.glb — дощатая кровать 2.0 (X) × 0.9 (Y) × 0.5 м с соломенным тюфяком,
изголовье на −X, открытая длинная сторона смотрит в −Y.
Начало координат обоих — центр основания на полу. Всё low-poly, плоское затенение,
случайные «износы» (перекос досок, провис конька) — с фиксированным зерном.
"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402  (bpy до bmesh: bmesh грузится из модуля bpy)
import bmesh  # noqa: E402
from mathutils import Vector  # noqa: E402

from lib import palette, scene  # noqa: E402

SEED = 1113

# --- дом
HALF_X = 3.0              # внешние полуразмеры стен
HALF_Y = 2.5
WALL_T = 0.2
EAVE_Z = 2.6              # высота до карниза
DOOR_HALF_W = 0.55        # проём 1.1 м
DOOR_H = 2.1
ROOF_PITCH_DEG = 30.0
ROOF_OVERHANG = 0.035     # больше нельзя: габарит 6 × 5 ± 0.1
ROOF_END_X = 3.03         # торцы соломы над фронтонами
RIDGE_SAG = 0.06          # провис старого конька посередине
SILL_TOP = 0.2            # нижний венец
PLATE_BOTTOM = 2.44       # верхняя обвязка до EAVE_Z
BOARD_ROWS = 7            # горизонтальные доски от венца до верха проёма
CLAP_KICK = 0.015         # низ доски выступает наружу (внахлёст)

# --- кровать
BED_L, BED_W, BED_H = 2.0, 0.9, 0.5

TAN = math.tan(math.radians(ROOF_PITCH_DEG))
COS = math.cos(math.radians(ROOF_PITCH_DEG))
RIDGE_Z = EAVE_Z + HALF_Y * TAN           # низ кровли на коньке


class Builder:
    """Один меш из замкнутых оболочек; материалы — ключи палитры."""

    def __init__(self, name: str):
        self.name = name
        self.bm = bmesh.new()
        self.keys: list[str] = []

    def _mi(self, key: str) -> int:
        if key not in self.keys:
            self.keys.append(key)
        return self.keys.index(key)

    def face(self, verts, key):
        f = self.bm.faces.new(verts)
        f.material_index = self._mi(key)
        return f

    def hexa(self, pts, key):
        """Шестигранник: pts[0..3] — нижнее кольцо, pts[4..7] — верхнее над ними."""
        v = [self.bm.verts.new(Vector(p)) for p in pts]
        for idx in ((0, 1, 2, 3), (4, 5, 6, 7), (0, 1, 5, 4),
                    (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)):
            self.face([v[i] for i in idx], key)

    def box(self, lo, hi, key):
        (x0, y0, z0), (x1, y1, z1) = lo, hi
        self.hexa([(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0),
                   (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], key)

    def strip(self, rings, key, caps=True):
        """Призма по сечениям (списки точек одинаковой длины), торцы — n-угольники."""
        loops = [[self.bm.verts.new(Vector(p)) for p in r] for r in rings]
        n = len(loops[0])
        for a, b in zip(loops, loops[1:]):
            for k in range(n):
                self.face((a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]), key)
        if caps:
            self.face(loops[0], key)
            self.face(list(reversed(loops[-1])), key)

    def lumpy_slab(self, x0, x1, y0, y1, z0, top, nx, ny, key):
        """Плита с неровным верхом: top(i, j, x, y) -> z; низ плоский на z0."""
        xs = [x0 + (x1 - x0) * i / (nx - 1) for i in range(nx)]
        ys = [y0 + (y1 - y0) * j / (ny - 1) for j in range(ny)]
        grid = [[self.bm.verts.new((x, y, top(i, j, x, y))) for j, y in enumerate(ys)]
                for i, x in enumerate(xs)]
        for i in range(nx - 1):
            for j in range(ny - 1):
                self.face((grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]), key)
        rim = ([grid[i][0] for i in range(nx)] + [grid[nx - 1][j] for j in range(1, ny)]
               + [grid[i][ny - 1] for i in range(nx - 2, -1, -1)]
               + [grid[0][j] for j in range(ny - 2, 0, -1)])
        low = [self.bm.verts.new((v.co.x, v.co.y, z0)) for v in rim]
        m = len(rim)
        for k in range(m):
            self.face((rim[k], low[k], low[(k + 1) % m], rim[(k + 1) % m]), key)
        self.face(low, key)

    def finish(self) -> bpy.types.Object:
        bmesh.ops.recalc_face_normals(self.bm, faces=self.bm.faces)
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for key in self.keys:
            me.materials.append(palette.material(key))
        for p in me.polygons:
            p.use_smooth = False
        obj = bpy.data.objects.new(self.name, me)
        bpy.context.scene.collection.objects.link(obj)
        return obj


# --------------------------------------------------------------------------- стены

class Wall:
    """Стена в своих координатах: a — вдоль стены, d — вглубь от наружной грани
    (0 — снаружи, WALL_T — внутри, < 0 — выступ наружу), z — вверх."""

    def __init__(self, name):
        self.name = name

    def p(self, a, d, z):
        if self.name == "front":    # y = −HALF_Y, a вдоль +X (дверь)
            return (a, -HALF_Y + d, z)
        if self.name == "back":
            return (-a, HALF_Y - d, z)
        if self.name == "left":     # x = −HALF_X
            return (-HALF_X + d, -a, z)
        return (HALF_X - d, a, z)   # right


def wall_piece(b, wall, a0, a1, z0, z1, key, d_top=0.0, d_bot=0.0, d_in=WALL_T, dz=(0, 0, 0, 0)):
    """Брус/доска от a0 до a1; dz — сдвиги углов по z (низ a0, низ a1, верх a0, верх a1)."""
    p = wall.p
    b.hexa([p(a0, d_bot, z0 + dz[0]), p(a1, d_bot, z0 + dz[1]),
            p(a1, d_in, z0 + dz[1]), p(a0, d_in, z0 + dz[0]),
            p(a0, d_top, z1 + dz[2]), p(a1, d_top, z1 + dz[3]),
            p(a1, d_in, z1 + dz[3]), p(a0, d_in, z1 + dz[2])], key)


def board_rows():
    step = (DOOR_H - SILL_TOP) / BOARD_ROWS
    rows = [(SILL_TOP + i * step, SILL_TOP + (i + 1) * step) for i in range(BOARD_ROWS)]
    rows.append((DOOR_H, PLATE_BOTTOM))
    return rows


def plank_wall(b, rng, wall, half, gaps=()):
    """Венец, доски внахлёст и верхняя обвязка; gaps — интервалы a без досок ниже DOOR_H."""
    def spans(z1):
        if z1 > DOOR_H + 1e-6:
            return [(-half, half)]
        out, start = [], -half
        for g0, g1 in sorted(gaps):
            out.append((start, g0))
            start = g1
        out.append((start, half))
        return out

    for a0, a1 in spans(SILL_TOP):
        wall_piece(b, wall, a0, a1, 0.0, SILL_TOP, "wood_old", d_top=-0.01, d_bot=-0.01)
    for z0, z1 in board_rows():
        for a0, a1 in spans(z1):
            j = rng.uniform(0.0, 0.006)
            skew = rng.uniform(-0.008, 0.008)
            wall_piece(b, wall, a0, a1, z0, z1 + 0.01, "wood_old",
                       d_top=j, d_bot=j - CLAP_KICK, d_in=WALL_T - rng.uniform(0.0, 0.004),
                       dz=(skew, -skew, skew * 0.5, -skew * 0.5))
    wall_piece(b, wall, -half, half, PLATE_BOTTOM, EAVE_Z, "wood_old", d_top=-0.01, d_bot=-0.01)


def roof_bottom_z(y):
    return EAVE_Z + (HALF_Y - abs(y)) * TAN


def gable(b, rng, wall, boards=10):
    """Фронтон из вертикальных досок над обвязкой, верх утоплен в солому."""
    w = 2.0 * HALF_Y / boards
    for i in range(boards):
        a0, a1 = -HALF_Y + i * w, -HALF_Y + (i + 1) * w
        z0 = PLATE_BOTTOM + 0.05
        top0, top1 = roof_bottom_z(a0) + 0.03, roof_bottom_z(a1) + 0.03
        j = rng.uniform(-0.01, 0.0)
        wall_piece(b, wall, a0 + 0.004, a1 - 0.004, z0, z0, "wood_old",
                   d_top=j, d_bot=j, dz=(0.0, 0.0, top0 - z0, top1 - z0))
    # стыки досок закрыты нащельниками: по одному на каждый шов
    for i in range(1, boards):
        a = -HALF_Y + i * w
        top = roof_bottom_z(a) + 0.02
        wall_piece(b, wall, a - 0.03, a + 0.03, PLATE_BOTTOM + 0.05, top, "wood_old",
                   d_top=-0.022, d_bot=-0.022, d_in=0.0)


def corner_posts(b):
    t = WALL_T + 0.01
    for sx in (-1, 1):
        for sy in (-1, 1):
            xs = sorted((sx * (HALF_X + 0.01), sx * (HALF_X + 0.01 - t)))
            ys = sorted((sy * (HALF_Y + 0.01), sy * (HALF_Y + 0.01 - t)))
            b.box((xs[0], ys[0], 0.0), (xs[1], ys[1], EAVE_Z), "wood_old")


def door(b):
    """Наличник, порог и распахнутая внутрь дощатая створка с жиковинами."""
    front = Wall("front")
    jamb = 0.14
    for s in (-1, 1):
        a0, a1 = sorted((s * DOOR_HALF_W, s * (DOOR_HALF_W + jamb)))
        wall_piece(b, front, a0, a1, 0.0, DOOR_H + 0.16, "wood_old",
                   d_top=-0.035, d_bot=-0.035, d_in=WALL_T + 0.015)
    wall_piece(b, front, -DOOR_HALF_W - jamb - 0.06, DOOR_HALF_W + jamb + 0.06,
               DOOR_H, DOOR_H + 0.17, "wood_old", d_top=-0.04, d_bot=-0.04, d_in=WALL_T + 0.015)
    wall_piece(b, front, -DOOR_HALF_W, DOOR_HALF_W, 0.0, 0.03, "wood_old")   # порог

    # створка: петли на +X, распахнута внутрь почти до стены (зазор 10°)
    hinge = Vector((DOOR_HALF_W + 0.01, -HALF_Y + WALL_T + 0.025, 0.0))
    g = math.radians(10.0)
    u = Vector((math.cos(g), math.sin(g), 0.0))        # вдоль створки
    v = Vector((-math.sin(g), math.cos(g), 0.0))       # от стены в комнату
    zup = Vector((0.0, 0.0, 1.0))

    def leaf_box(u0, u1, v0, v1, z0, z1, key):
        q = lambda uu, vv, zz: tuple(hinge + u * uu + v * vv + zup * zz)  # noqa: E731
        b.hexa([q(u0, v0, z0), q(u1, v0, z0), q(u1, v1, z0), q(u0, v1, z0),
                q(u0, v0, z1), q(u1, v0, z1), q(u1, v1, z1), q(u0, v1, z1)], key)

    width = 2 * DOOR_HALF_W - 0.04
    for k in range(3):                                 # три доски
        u0, u1 = width * k / 3 + 0.004, width * (k + 1) / 3 - 0.004
        leaf_box(u0, u1, 0.03, 0.075, 0.02, DOOR_H - 0.03 - 0.01 * k, "wood_old")
    for z in (0.35, 1.6):                              # шпонки со стороны стены
        leaf_box(0.05, width - 0.05, 0.0, 0.03, z, z + 0.14, "wood_old")
        leaf_box(-0.02, 0.7, 0.075, 0.085, z + 0.04, z + 0.10, "metal_dull")  # жиковины
    leaf_box(width - 0.16, width - 0.10, 0.075, 0.09, 1.0, 1.12, "metal_dull")  # скоба


def window(b, rng):
    """Глухое окно справа от двери: рама и закрытые ставни на наружной стене."""
    front = Wall("front")
    c, z0, z1, hw = 1.75, 1.0, 1.66, 0.36
    wall_piece(b, front, c - hw - 0.06, c + hw + 0.06, z0 - 0.08, z0, "wood_old",
               d_top=-0.05, d_bot=-0.05, d_in=0.0)                     # подоконная доска
    wall_piece(b, front, c - hw - 0.03, c + hw + 0.03, z1, z1 + 0.07, "wood_old",
               d_top=-0.035, d_bot=-0.035, d_in=0.0)
    for s in (-1, 1):
        a0, a1 = sorted((c + s * hw, c + s * (hw + 0.06)))
        wall_piece(b, front, a0, a1, z0, z1, "wood_old", d_top=-0.035, d_bot=-0.035, d_in=0.0)
    for s in (-1, 1):                                  # ставни, одна чуть перекошена
        a0, a1 = sorted((c, c + s * hw))
        sk = rng.uniform(0.01, 0.025) if s > 0 else 0.0
        wall_piece(b, front, a0 + 0.006, a1 - 0.006, z0 + 0.01, z1 - 0.01, "wood_old",
                   d_top=-0.03, d_bot=-0.03, d_in=-0.005, dz=(0.0, -sk, 0.0, -sk))


# --------------------------------------------------------------------------- крыша

def sag(x, u):
    """Провис: сильнее к коньку и к середине дома."""
    return -RIDGE_SAG * math.sin(math.pi * (x + ROOF_END_X) / (2 * ROOF_END_X)) * (0.3 + 0.7 * u)


def roof_point(side, u, x, lift=0.0):
    """Точка нижней плоскости ската side (−1 перед, +1 зад) на доле u от свеса к коньку."""
    y_eave = side * (HALF_Y + ROOF_OVERHANG)
    z_eave = EAVE_Z - ROOF_OVERHANG * TAN
    y = y_eave * (1.0 - u)
    z = z_eave + (RIDGE_Z - z_eave) * u + sag(x, u) + lift
    return Vector((x, y, z))


def thatch(b, rng, side, courses=(0.0, 0.36, 0.69, 1.0), t_lo=0.24, t_hi=0.14, segs=6):
    """Скат из трёх ярусов соломы: каждый ярус — клин, нижний край толще, края неровные."""
    for k in range(len(courses) - 1):
        # торцы ярусов уступами: совпавшие торцы мерцали бы (z-fighting)
        end_x = ROOF_END_X - 0.012 * k
        xs = [-end_x + 2 * end_x * i / segs for i in range(segs + 1)]
        u_lo, u_hi = courses[k], min(1.0, courses[k + 1] + 0.06)
        rings = []
        for i, x in enumerate(xs):
            # неровный нижний край яруса; у свеса — только внутрь, чтобы не раздуть габарит
            ju = rng.uniform(0.0, 0.03) if k == 0 else rng.uniform(-0.02, 0.02)
            jt = rng.uniform(-0.03, 0.03) if 0 < i < segs else 0.0
            u0 = u_lo + ju / (HALF_Y + ROOF_OVERHANG)
            b0 = roof_point(side, u0, x)
            b1 = roof_point(side, u_hi, x)
            t0 = b0 + Vector((0.0, 0.0, (t_lo + jt) / COS))
            t1 = b1 + Vector((0.0, 0.0, t_hi / COS))
            rings.append([tuple(b0), tuple(b1), tuple(t1), tuple(t0)])
        b.strip(rings, "roof_thatch")


def ridge(b, rng, segs=6, sides=6, r=0.13):
    """Соломенный валик по коньку и пары перекрещённых жердей-«ветренниц» поверх."""
    top = RIDGE_Z + 0.14 / COS
    rings = []
    for i in range(segs + 1):
        x = -(ROOF_END_X - 0.05) + 2 * (ROOF_END_X - 0.05) * i / segs
        c = Vector((x, 0.0, top - 0.05 + sag(x, 1.0)))
        ring = []
        for k in range(sides):
            a = 2 * math.pi * k / sides
            ring.append(tuple(c + Vector((0.0, r * math.cos(a), 0.75 * r * math.sin(a)))))
        rings.append(ring)
    b.strip(rings, "roof_thatch")

    stick = 0.045
    for x in (-2.15, -0.72, 0.72, 2.15):
        x += rng.uniform(-0.06, 0.06)
        for side in (-1, 1):
            # жердь лежит на скате side и выходит за конёк в воздух над другим скатом
            lo = roof_point(side, 0.72, x, lift=t_surface(0.72) + 0.01)
            hi_u = 1.0 + 0.22 / (HALF_Y + ROOF_OVERHANG)
            hi = roof_point(side, hi_u, x, lift=t_surface(1.0) + 0.03)
            n = Vector((0.0, side * math.sin(math.radians(ROOF_PITCH_DEG)), COS))  # нормаль ската
            w = Vector((stick / 2, 0.0, 0.0))
            h = n * stick
            shift = Vector((side * 0.03, 0.0, 0.0))  # жерди пары разведены, чтобы не слипались
            lo, hi = lo + shift, hi + shift
            b.hexa([tuple(pt) for pt in (lo - w, lo + w, lo + w + h, lo - w + h,
                                         hi - w, hi + w, hi + w + h, hi - w + h)], "wood_old")


def t_surface(u):
    """Вертикальная толщина соломы над нижней плоскостью у верхнего яруса."""
    return 0.14 / COS + (0.04 if u < 1.0 else 0.0)


def bargeboards(b):
    """Причелины по краям фронтонов, перекрещены над коньком."""
    depth, extra = 0.13, 0.42
    for sx in (-1, 1):
        for side, (x0, x1) in ((-1, (3.0, 3.016)), (1, (3.016, 3.032))):
            xa, xb = sorted((sx * x0, sx * x1))
            pts = []
            for y in (side * (HALF_Y + 0.02), -side * extra):
                z = EAVE_Z + (HALF_Y - side * y) * TAN
                pts.append((y, z))
            (y0, z0), (y1, z1) = pts
            b.hexa([(xa, y0, z0 - depth), (xb, y0, z0 - depth), (xb, y1, z1 - depth), (xa, y1, z1 - depth),
                    (xa, y0, z0 + 0.06), (xb, y0, z0 + 0.06), (xb, y1, z1 + 0.06), (xa, y1, z1 + 0.06)],
                   "wood_old")


# --------------------------------------------------------------------------- сборка

def build_house():
    rng = random.Random(SEED)
    walls = Builder("HouseWalls")
    inner_x, inner_y = HALF_X - WALL_T, HALF_Y - WALL_T
    walls.face([walls.bm.verts.new(v) for v in (
        (-inner_x, -inner_y, 0.01), (inner_x, -inner_y, 0.01),
        (inner_x, inner_y, 0.01), (-inner_x, inner_y, 0.01))], "ground_ash")   # земляной пол
    plank_wall(walls, rng, Wall("front"), inner_x, gaps=[(-DOOR_HALF_W, DOOR_HALF_W)])
    plank_wall(walls, rng, Wall("back"), inner_x)
    plank_wall(walls, rng, Wall("left"), inner_y)
    plank_wall(walls, rng, Wall("right"), inner_y)
    gable(walls, rng, Wall("left"))
    gable(walls, rng, Wall("right"))
    corner_posts(walls)
    door(walls)
    window(walls, rng)

    roof = Builder("HouseRoof")
    thatch(roof, rng, -1)
    thatch(roof, rng, 1)
    ridge(roof, rng)
    bargeboards(roof)
    return [walls.finish(), roof.finish()]


def build_bed():
    rng = random.Random(SEED + 1)
    b = Builder("BedMesh")
    hx, hy = BED_L / 2, BED_W / 2
    post = 0.07
    for sx in (-1, 1):
        for sy in (-1, 1):
            top = BED_H if sx < 0 else 0.36          # изголовье на −X
            xs = sorted((sx * hx, sx * (hx - post)))
            ys = sorted((sy * hy, sy * (hy - post)))
            b.box((xs[0], ys[0], 0.0), (xs[1], ys[1], top), "wood_old")
    for sy in (-1, 1):                               # царги
        ys = sorted((sy * (hy - 0.01), sy * (hy - 0.05)))
        b.box((-hx + post, ys[0], 0.16), (hx - post, ys[1], 0.30), "wood_old")
    b.box((-hx + 0.01, -hy + post, 0.26), (-hx + 0.05, hy - post, BED_H - 0.03), "wood_old")
    b.box((hx - 0.05, -hy + post, 0.18), (hx - 0.01, hy - post, 0.34), "wood_old")

    def lump(base, amp):
        return lambda i, j, x, y: base + rng.uniform(-amp, amp) * (1.0 if 0 < j < 2 else 0.4)

    b.lumpy_slab(-hx + post, hx - post, -hy + 0.06, hy - 0.06, 0.24, lump(0.40, 0.015), 5, 3,
                 "cloth_ash")                        # соломенный тюфяк
    b.lumpy_slab(-hx + 0.09, -hx + 0.45, -hy + 0.14, hy - 0.14, 0.38,
                 lambda i, j, x, y: 0.46 + (0.025 if j == 1 else 0.0), 3, 3, "cloth_ash")  # подушка
    b.lumpy_slab(-0.35, hx - 0.06, -hy + 0.005, hy - 0.005, 0.28,
                 lambda i, j, x, y: (0.43 + rng.uniform(-0.012, 0.012)) if j == 1 else 0.33,
                 5, 3, "cloth_ash")                  # сбитое одеяло, свисает с боков
    return [b.finish()]


def build(out_dir):
    out = Path(out_dir)
    scene.reset()
    house = build_house()
    print(f"house triangles: {scene.triangle_count(house)}")
    scene.export_glb(str(out / "house_stub" / "house_stub.glb"), house)
    scene.reset()
    bed = build_bed()
    print(f"bed triangles: {scene.triangle_count(bed)}")
    scene.export_glb(str(out / "bed" / "bed.glb"), bed)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: build_props_farm.py <out_dir>")
    build(sys.argv[1])
