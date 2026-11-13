"""build_npc_test.py <out.glb> — тестовый житель: сутулый уставший селянин.

Сетка собирается из «лофтов» (колец с эллиптическим сечением) — низкополигональные,
но округлые формы. Каждая деталь жёстко привязана к своей кости, затем все детали,
кроме носа, сливаются в один меш `Villager`. Нос — отдельный меш `Nose` на кости head.
Анимации: Idle-loop (48 кадров) и Walk-loop (24 кадра, ноги по простой IK без
проскальзывания при скорости 2 * STRIDE_M / 1 с).
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402  (bpy до bmesh: bmesh грузится из модуля bpy)
import bmesh  # noqa: E402
from mathutils import Quaternion, Vector  # noqa: E402

from lib import palette, rig, scene  # noqa: E402

HEIGHT = 1.75
STRIDE_M = 0.70          # длина шага за полцикла
WALK_FRAMES = 24         # 1.0 с при 24 кадр/с
IDLE_FRAMES = 48         # 2.0 с
SHARP_DEG = 48.0         # рёбра острее этого угла — жёсткие (low-poly грани)

FRONT = Vector((0.0, -1.0, 0.0))
UP = Vector((0.0, 0.0, 1.0))
X = Vector((1.0, 0.0, 0.0))
Y = Vector((0.0, 1.0, 0.0))
Z = UP

K = HEIGHT / rig.REF_HEIGHT


def v(x, y, z):
    return Vector((x, y, z)) * K


# --------------------------------------------------------------------------- геометрия

def ring(c, rx, rf, rb=None):
    """Сечение: центр, полуширина вбок, полуглубина вперёд/назад."""
    return (Vector(c), rx * K, rf * K, (rf if rb is None else rb) * K)


def loft(bm, rings, sides, front=FRONT, offset=None, cap0="fill", cap1="fill"):
    """Тело вращения по кольцам. cap: 'fill' (n-угольник), Vector (вершина-шпиль) или None."""
    if offset is None:
        offset = math.pi / sides
    loops = []
    n = len(rings)
    for i, (c, rx, rf, rb) in enumerate(rings):
        t = (rings[min(i + 1, n - 1)][0] - rings[max(i - 1, 0)][0]).normalized()
        f = (front - t * front.dot(t)).normalized()
        lat = t.cross(f).normalized()
        loop = []
        for k in range(sides):
            a = offset + 2.0 * math.pi * k / sides
            ca, sa = math.cos(a), math.sin(a)
            r = rf if sa > 0.0 else rb
            loop.append(bm.verts.new(c + lat * (rx * ca) + f * (r * sa)))
        loops.append(loop)
    for a, b in zip(loops, loops[1:]):
        for k in range(sides):
            bm.faces.new((a[k], a[(k + 1) % sides], b[(k + 1) % sides], b[k]))
    for loop, cap in ((loops[0], cap0), (loops[-1], cap1)):
        if cap == "fill":
            bm.faces.new(loop)
        elif isinstance(cap, Vector):
            tip = bm.verts.new(cap)
            for k in range(sides):
                bm.faces.new((loop[k], loop[(k + 1) % sides], tip))
    return loops


def along(a, b, t):
    return a.lerp(b, t)


def box(bm, center, size, rot=None, bevel=0.0):
    """Брусок (по желанию — со скошенными рёбрами)."""
    res = bmesh.ops.create_cube(bm, size=1.0)
    verts = res["verts"]
    sx, sy, sz = size
    for vert in verts:
        co = Vector((vert.co.x * sx, vert.co.y * sy, vert.co.z * sz)) * K
        if rot is not None:
            co = rot @ co
        vert.co = co + Vector(center)
    if bevel > 0.0:
        edges = list({e for vert in verts for e in vert.link_edges})
        bmesh.ops.bevel(bm, geom=verts + edges, offset=bevel * K, segments=1,
                        affect="EDGES", profile=0.5)
    return verts


def spike(bm, base, tip, width, normal):
    """Треугольная прядь: основание поперёк `normal`, вершина в `tip`."""
    d = (tip - base).normalized()
    side = d.cross(normal).normalized() * width * K
    lift = normal.normalized() * width * 0.6 * K
    a = bm.verts.new(base + side)
    b = bm.verts.new(base - side)
    c = bm.verts.new(base + lift)
    t = bm.verts.new(tip)
    for face in ((a, b, t), (b, c, t), (c, a, t), (a, c, b)):
        bm.faces.new(face)


# --------------------------------------------------------------------------- детали

_SPINE = [rig.joint_positions(rig.REF_HEIGHT)[n]
          for n in ("pelvis", "spine_base", "chest_base", "neck_base", "head_base")]


def spine_y(z):
    """Ось сутулого позвоночника (по суставам рига): смещение по Y на высоте z (для 1.75)."""
    pts = [(0.80, 0.0)] + [(p.z, p.y) for p in _SPINE]
    if z <= pts[0][0]:
        return pts[0][1]
    for (z0, y0), (z1, y1) in zip(pts, pts[1:]):
        if z <= z1:
            return y0 + (y1 - y0) * (z - z0) / (z1 - z0)
    return pts[-1][1]


def torso_ring(z, rx, rf, rb, dy=0.0):
    return ring((0.0, (spine_y(z) + dy) * K, z * K), rx, rf, rb)


def parts_torso(add):
    # Рубаха: грудь (сутулая спина — глубже сзади) и живот.
    add("shirt_chest", "cloth_ash", "chest", lambda bm: loft(bm, [
        torso_ring(1.08, 0.142, 0.099, 0.099),
        torso_ring(1.24, 0.150, 0.100, 0.108),
        torso_ring(1.32, 0.158, 0.094, 0.122),
        torso_ring(1.385, 0.162, 0.082, 0.114),
        torso_ring(1.425, 0.142, 0.066, 0.082, dy=0.006),
        torso_ring(1.450, 0.062, 0.046, 0.052, dy=0.004),
    ], 10))
    add("shirt_belly", "cloth_ash", "spine", lambda bm: loft(bm, [
        torso_ring(0.93, 0.140, 0.094, 0.100),
        torso_ring(1.04, 0.136, 0.102, 0.094),
        torso_ring(1.16, 0.138, 0.091, 0.093),
    ], 10))

    # Жилет из тёмной кожи: открытый спереди V-вырезом, без рукавов.
    def vest(bm):
        rows = [
            (0.975, 0.152, 0.106, 0.110),
            (1.06, 0.151, 0.121, 0.108),
            (1.18, 0.157, 0.120, 0.110),
            (1.27, 0.160, 0.117, 0.120),
            (1.335, 0.170, 0.109, 0.132),
            (1.395, 0.168, 0.091, 0.123),
            (1.432, 0.140, 0.074, 0.090),
        ]
        sides = 20
        loops = loft(bm, [torso_ring(*r) for r in rows], sides, offset=0.0, cap0=None, cap1=None)
        front = sides // 4                  # вершина ровно спереди
        # Полы жилета расходятся V-образно: снизу почти сходятся, у ворота шире.
        for (z, rx, rf, _rb), loop in zip(rows, loops):
            w = 0.022 + 0.046 * ((z - rows[0][0]) / (rows[-1][0] - rows[0][0])) ** 1.4
            for k, sign in ((front - 1, 1.0), (front + 1, -1.0)):
                vert = loop[k]
                x = min(w, rx * 0.9)
                vert.co.x = sign * x * K
                vert.co.y = (spine_y(z) - rf * math.sqrt(1.0 - (x / rx) ** 2)) * K
        bmesh.ops.delete(bm, geom=[loop[front] for loop in loops], context="VERTS")
        return loops
    add("vest", "leather_dark", "chest", vest)

    # Ворот рубахи.
    add("collar", "cloth_ash", "chest", lambda bm: loft(bm, [
        torso_ring(1.415, 0.074, 0.062, 0.070, dy=0.004),
        torso_ring(1.462, 0.066, 0.058, 0.060, dy=-0.004),
    ], 10, cap0=None, cap1=None))

    # Таз в штанах, пояс, пряжка, кошель.
    add("pants_pelvis", "cloth_rust", "hips", lambda bm: loft(bm, [
        torso_ring(1.0, 0.142, 0.094, 0.100),
        torso_ring(0.93, 0.150, 0.098, 0.112),
        torso_ring(0.855, 0.146, 0.090, 0.104),
        torso_ring(0.795, 0.110, 0.068, 0.080),
    ], 10))
    add("belt", "leather_dark", "hips", lambda bm: loft(bm, [
        torso_ring(0.950, 0.154, 0.104, 0.114),
        torso_ring(0.992, 0.150, 0.103, 0.108),
    ], 12, cap0=None, cap1=None))
    add("buckle", "metal_dull", "hips", lambda bm: box(
        bm, v(0.0, -0.104, 0.971), (0.040, 0.012, 0.036), bevel=0.004))
    add("pouch", "leather_dark", "hips", lambda bm: box(
        bm, v(-0.128, -0.060, 0.918), (0.060, 0.034, 0.075),
        rot=Quaternion(Z, math.radians(-38)), bevel=0.008))


HEAD_REF = Vector((0.0, -0.088, 1.525))   # основание головы, в котором нарисована голова
HEAD_TILT_DEG = 6.0                        # голова чуть опущена — усталый взгляд в землю


def head_frame(joints):
    """Перенос детали головы из системы рисования (HEAD_REF) на кость head."""
    base = joints["head_base"]
    tilt = lean(HEAD_TILT_DEG)

    def place(bm):
        for vert in bm.verts:
            vert.co = base + tilt @ (vert.co - HEAD_REF * K)
    return place


def parts_head(add):
    hb = HEAD_REF

    def head(bm):
        rows = [  # z, dy, rx, rf, rb — от подбородка к макушке
            (1.497, -0.040, 0.030, 0.020, 0.028),
            (1.518, -0.028, 0.054, 0.044, 0.050),
            (1.552, -0.016, 0.064, 0.060, 0.066),
            (1.594, -0.012, 0.073, 0.073, 0.080),
            (1.632, -0.010, 0.078, 0.078, 0.088),
            (1.672, -0.004, 0.076, 0.074, 0.088),
            (1.706, 0.000, 0.061, 0.056, 0.070),
        ]
        loft(bm, [ring(v(0.0, hb.y + dy, z), rx, rf, rb) for z, dy, rx, rf, rb in rows],
             12, offset=0.0, cap1=v(0.0, hb.y, 1.727))
    add("head", "skin_pale", "head", head)

    for side in (1, -1):
        add(f"ear.{side}", "skin_pale", "head", lambda bm, s=side: loft(bm, [
            ring(v(s * 0.077, -0.083, 1.578), 0.010, 0.012, 0.010),
            ring(v(s * 0.081, -0.080, 1.603), 0.012, 0.019, 0.016),
            ring(v(s * 0.079, -0.076, 1.628), 0.009, 0.014, 0.012),
        ], 6, cap0=v(s * 0.076, -0.085, 1.565), cap1=v(s * 0.078, -0.073, 1.640)))
        # Глубоко посаженные глаза под тяжёлыми бровями; внутренний край брови
        # приподнят — лицо уставшее, а не злое.
        add(f"eye.{side}", "hair_soot", "head", lambda bm, s=side: box(
            bm, v(s * 0.030, -0.163, 1.627), (0.022, 0.010, 0.011),
            rot=Quaternion(Y, math.radians(s * 8)), bevel=0.003))
        add(f"brow.{side}", "hair_soot", "head", lambda bm, s=side: box(
            bm, v(s * 0.031, -0.167, 1.641), (0.032, 0.013, 0.009),
            rot=Quaternion(Y, math.radians(s * 12)), bevel=0.002))

    def hair(bm):
        loops = loft(bm, [
            ring(v(0.0, hb.y + 0.004, 1.640), 0.085, 0.081, 0.097),
            ring(v(0.0, hb.y + 0.002, 1.698), 0.082, 0.077, 0.094),
            ring(v(0.0, hb.y, 1.728), 0.059, 0.053, 0.071),
        ], 12, offset=0.0, cap0=None, cap1=v(0.0, hb.y + 0.004, 1.748))
        # Линия волос: над лбом выше, на висках ниже, на затылке ниже всего.
        for k, vert in enumerate(loops[0]):
            ff = math.sin(2.0 * math.pi * k / 12)
            vert.co.z += (0.032 * ff ** 2 if ff > 0 else -0.05 * ff ** 2) * K
            vert.co.z -= 0.02 * (1.0 - abs(ff)) * K
        # Нечёсаные пряди, прижатые к голове: чёлка и вихры на затылке.
        for base, tip, normal in (
            (v(0.012, -0.160, 1.690), v(0.036, -0.170, 1.660), v(0.0, -1.0, 0.4)),
            (v(-0.022, -0.158, 1.692), v(-0.044, -0.166, 1.664), v(0.0, -1.0, 0.4)),
            (v(0.050, -0.142, 1.684), v(0.072, -0.142, 1.650), v(0.6, -1.0, 0.2)),
            (v(0.030, 0.000, 1.590), v(0.034, 0.012, 1.548), v(0.0, 1.0, 0.0)),
            (v(-0.030, 0.002, 1.592), v(-0.040, 0.010, 1.552), v(0.0, 1.0, 0.0)),
            (v(0.000, 0.004, 1.600), v(0.004, 0.016, 1.556), v(0.0, 1.0, 0.0)),
        ):
            spike(bm, base, tip, 0.018, normal)
        return loops
    add("hair", "hair_soot", "head", hair)

    # Неопрятная короткая борода: от висков по челюсти, спереди — ниже рта.
    def beard(bm):
        loops = loft(bm, [
            ring(v(0.0, hb.y - 0.044, 1.488), 0.034, 0.028, 0.032),
            ring(v(0.0, hb.y - 0.030, 1.514), 0.060, 0.052, 0.056),
            ring(v(0.0, hb.y - 0.016, 1.552), 0.070, 0.067, 0.071),
            ring(v(0.0, hb.y - 0.012, 1.596), 0.078, 0.078, 0.084),
        ], 12, offset=0.0, cap0=v(0.0, hb.y - 0.052, 1.478), cap1=None)
        for k, vert in enumerate(loops[-1]):  # спереди край бороды опускается под рот
            ff = math.sin(2.0 * math.pi * k / 12)
            if ff > 0:
                vert.co.z -= 0.056 * ff ** 3 * K
        for k, vert in enumerate(loops[-2]):
            ff = math.sin(2.0 * math.pi * k / 12)
            if ff > 0:
                vert.co.z -= 0.018 * ff ** 3 * K
        doomed = [f for f in bm.faces if f.calc_center_median().y > (hb.y + 0.01) * K]
        bmesh.ops.delete(bm, geom=doomed, context="FACES")
        return loops
    add("beard", "hair_soot", "head", beard)
    add("moustache", "hair_soot", "head", lambda bm: box(
        bm, v(0.0, -0.157, 1.563), (0.046, 0.014, 0.012), bevel=0.004))
    add("mouth", "skin_shadow", "head", lambda bm: box(
        bm, v(0.0, -0.152, 1.549), (0.026, 0.010, 0.006), bevel=0.002))


def nose(bm):
    """Длинный, чуть крючковатый нос: клин из 7 вершин."""
    p = {
        "root": v(0.0, -0.160, 1.634),
        "bridge_l": v(0.008, -0.172, 1.608),
        "bridge_r": v(-0.008, -0.172, 1.608),
        "tip": v(0.0, -0.190, 1.584),
        "wing_l": v(0.014, -0.164, 1.580),
        "wing_r": v(-0.014, -0.164, 1.580),
        "base": v(0.0, -0.170, 1.574),
    }
    q = {k: bm.verts.new(co) for k, co in p.items()}
    for face in (
        ("root", "bridge_r", "bridge_l"),
        ("bridge_l", "bridge_r", "tip"),
        ("root", "bridge_l", "wing_l"),
        ("root", "wing_r", "bridge_r"),
        ("bridge_l", "tip", "wing_l"),
        ("bridge_r", "wing_r", "tip"),
        ("tip", "base", "wing_l"),
        ("tip", "wing_r", "base"),
        ("root", "wing_l", "base"),
        ("root", "base", "wing_r"),
    ):
        bm.faces.new([q[k] for k in face])


def parts_neck(add, joints):
    a, b = joints["neck_base"], joints["head_base"]
    add("neck", "skin_pale", "neck", lambda bm: loft(bm, [
        ring(along(a, b, -0.15), 0.046, 0.044, 0.046),
        ring(along(a, b, 0.55), 0.043, 0.040, 0.044),
        ring(along(a, b, 1.25), 0.042, 0.038, 0.044),
    ], 8))


def parts_limbs(add, joints):
    for s, sfx in ((1, "L"), (-1, "R")):
        hip, knee, ankle = (joints[f"{n}.{sfx}"] for n in ("hip", "knee", "ankle"))
        sh, el, wr, fi = (joints[f"{n}.{sfx}"] for n in ("shoulder", "elbow", "wrist", "fingers"))
        out = Vector((s * 0.006 * K, 0.0, 0.0))

        # Бедро в мешковатой штанине и латка на колене (у левой ноги).
        add(f"thigh.{sfx}", "cloth_rust", f"thigh.{sfx}", lambda bm, a=hip, b=knee, o=out: loft(bm, [
            ring(along(a, b, -0.10) + o * 0.5, 0.080, 0.082, 0.090),
            ring(along(a, b, 0.12) + o, 0.084, 0.084, 0.092),
            ring(along(a, b, 0.45) + o, 0.074, 0.074, 0.076),
            ring(along(a, b, 0.80), 0.063, 0.064, 0.064),
            ring(along(a, b, 1.02), 0.058, 0.060, 0.058),
        ], 8, cap1=along(a, b, 1.12)))
        if s == 1:
            add("patch", "cloth_ash", f"thigh.{sfx}", lambda bm, a=hip, b=knee: box(
                bm, along(a, b, 0.86) + Vector((0.004, -0.056, 0.0)) * K,
                (0.050, 0.010, 0.060), rot=Quaternion(Y, math.radians(9)), bevel=0.003))

        # Голень: штанина, заправленная в сапог.
        add(f"shin.{sfx}", "cloth_rust", f"shin.{sfx}", lambda bm, a=knee, b=ankle: loft(bm, [
            ring(along(a, b, -0.10), 0.054, 0.058, 0.054),
            ring(along(a, b, 0.05), 0.058, 0.060, 0.060),
            ring(along(a, b, 0.25), 0.058, 0.058, 0.064),
            ring(along(a, b, 0.48), 0.052, 0.054, 0.056),
        ], 8, cap0=along(a, b, -0.17)))
        add(f"boot_shaft.{sfx}", "leather_dark", f"shin.{sfx}", lambda bm, a=knee, b=ankle: loft(bm, [
            ring(along(a, b, 0.40), 0.063, 0.066, 0.068),
            ring(along(a, b, 0.48), 0.059, 0.062, 0.062),
            ring(along(a, b, 0.75), 0.048, 0.050, 0.050),
            ring(along(a, b, 0.97), 0.050, 0.054, 0.054),
        ], 8))

        # Стопа-сапог: сечения поперёк оси Y, «перед» сечения — верх.
        def boot(bm, an=ankle, side=s):
            toe_out = Quaternion(Z, math.radians(-side * 6))
            rows = [  # смещение по Y от лодыжки, высота центра, rx, верх, низ
                (0.062, 0.050, 0.038, 0.036, 0.056),
                (0.030, 0.062, 0.046, 0.050, 0.068),
                (-0.040, 0.052, 0.050, 0.040, 0.058),
                (-0.110, 0.040, 0.049, 0.030, 0.045),
                (-0.160, 0.034, 0.040, 0.022, 0.038),
            ]
            rings = []
            for dy, zc, rx, top, bot in rows:
                c = an + toe_out @ Vector((0.0, dy * K, 0.0))
                rings.append(ring((c.x, c.y, zc * K), rx, top, bot))
            loops = loft(bm, rings, 8, front=UP,
                         cap0=an + toe_out @ v(0.0, 0.072, -0.040),
                         cap1=an + toe_out @ v(0.0, -0.178, -0.053))
            for vert in bm.verts:  # плоская подошва
                if vert.co.z < 0.0:
                    vert.co.z = 0.0
            return loops
        add(f"boot.{sfx}", "leather_dark", f"foot.{sfx}", boot)

        # Рука: рукав рубахи, закатанный до середины предплечья.
        add(f"upper_arm.{sfx}", "cloth_ash", f"upper_arm.{sfx}", lambda bm, a=sh, b=el: loft(bm, [
            ring(along(a, b, 0.0), 0.036, 0.042, 0.042),
            ring(along(a, b, 0.25), 0.045, 0.047, 0.047),
            ring(along(a, b, 0.70), 0.040, 0.042, 0.042),
            ring(along(a, b, 1.02), 0.038, 0.040, 0.039),
        ], 8, cap0=along(a, b, -0.045), cap1=along(a, b, 1.11)))
        add(f"sleeve.{sfx}", "cloth_ash", f"forearm.{sfx}", lambda bm, a=el, b=wr: loft(bm, [
            ring(along(a, b, -0.06), 0.040, 0.042, 0.042),
            ring(along(a, b, 0.28), 0.041, 0.043, 0.043),
            ring(along(a, b, 0.30), 0.048, 0.050, 0.050),
            ring(along(a, b, 0.44), 0.047, 0.049, 0.049),
        ], 8, cap0=along(a, b, -0.14)))
        add(f"forearm.{sfx}", "skin_pale", f"forearm.{sfx}", lambda bm, a=el, b=wr: loft(bm, [
            ring(along(a, b, 0.38), 0.036, 0.038, 0.038),
            ring(along(a, b, 0.75), 0.031, 0.034, 0.032),
            ring(along(a, b, 1.04), 0.024, 0.028, 0.026),
        ], 7))

        # Кисть-«варежка»: ладонь смотрит к бедру, пальцы подогнуты.
        def hand(bm, a=wr, b=fi, side=s):
            inward = Vector((-side * 1.0, 0.0, 0.0))
            loft(bm, [
                ring(along(a, b, -0.06), 0.019, 0.026, 0.026),
                ring(along(a, b, 0.30), 0.022, 0.044, 0.040),
                ring(along(a, b, 0.62) + inward * 0.004 * K, 0.021, 0.045, 0.040),
                ring(along(a, b, 0.88) + inward * 0.012 * K, 0.017, 0.038, 0.034),
            ], 6, cap1=along(a, b, 1.0) + inward * 0.022 * K)
            loft(bm, [  # большой палец
                ring(along(a, b, 0.22) + v(0.0, -0.030, 0.0) + inward * 0.004 * K, 0.010, 0.012, 0.012),
                ring(along(a, b, 0.50) + v(0.0, -0.046, 0.0) + inward * 0.010 * K, 0.009, 0.010, 0.010),
            ], 5, cap0="fill", cap1=along(a, b, 0.64) + v(0.0, -0.044, 0.0) + inward * 0.016 * K)
        add(f"hand.{sfx}", "skin_pale", f"hand.{sfx}", hand)


def finish_mesh(name, bm, mat_key):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    if any(e.is_boundary for e in bm.edges):
        # Открытая «трубка» вокруг вертикали (жилет, пояс, ворот, борода): нормали —
        # от оси наружу; recalc_face_normals на открытых сетках ненадёжен.
        mid = sum((vt.co for vt in bm.verts), Vector()) / len(bm.verts)
        for face in bm.faces:
            out = face.calc_center_median() - mid
            out.z = 0.0
            if face.normal.dot(out) < 0.0:
                face.normal_flip()
    else:
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    sharp = math.radians(SHARP_DEG)
    for face in bm.faces:
        face.smooth = True
    for edge in bm.edges:
        if len(edge.link_faces) == 2 and edge.calc_face_angle(0.0) > sharp:
            edge.smooth = False
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    me.materials.append(palette.material(mat_key))
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def build_body(arm, joints):
    parts = []

    def add(name, mat_key, bone, fn):
        bm = bmesh.new()
        fn(bm)
        obj = finish_mesh(name, bm, mat_key)
        rig.attach_rigid(obj, arm, bone)
        parts.append(obj)

    place_head = head_frame(joints)

    def add_head(name, mat_key, bone, fn):
        add(name, mat_key, bone, lambda bm: (fn(bm), place_head(bm)))

    parts_torso(add)
    parts_neck(add, joints)
    parts_head(add_head)
    parts_limbs(add, joints)

    body = parts[0]
    view_layer = bpy.context.view_layer
    for obj in view_layer.objects:
        obj.select_set(obj in parts)
    view_layer.objects.active = body
    with bpy.context.temp_override(active_object=body, object=body,
                                   selected_objects=parts, selected_editable_objects=parts):
        bpy.ops.object.join()
    body.name = body.data.name = "Villager"

    bm = bmesh.new()
    nose(bm)
    place_head(bm)
    nose_obj = finish_mesh("Nose", bm, "skin_pale")
    rig.attach_rigid(nose_obj, arm, "head")
    return [body, nose_obj]


# --------------------------------------------------------------------------- анимация

def rx(deg):
    return Quaternion(X, math.radians(deg))


def ry(deg):
    return Quaternion(Y, math.radians(deg))


def rz(deg):
    return Quaternion(Z, math.radians(deg))


def limb_fwd(deg):
    """Висящая вниз кость: конец вперёд (−Y). Для стопы — носок вверх."""
    return rx(-deg)


def lean(deg):
    """Стоящая вверх кость: верх вперёд (−Y)."""
    return rx(deg)


def wrap(x):
    return x - math.floor(x)


def smooth(x):
    x = min(1.0, max(0.0, x))
    return x * x * (3.0 - 2.0 * x)


class Gait:
    """Шаг. В опоре стопа неподвижна относительно земли (двухзвенная IK ноги),
    в переносе бедро и колено интерполируются в пространстве углов.

    Земля уходит назад со скоростью 2 * STRIDE_M за цикл — та же скорость, с которой
    NpcWalker двигает модель, поэтому ступни не «едут».
    """

    SPEED = 2.0 * STRIDE_M          # м за цикл (цикл = 1 с)
    THIGH_MAX = 25.0                # бёдра в пределах ±25° (вперёд +25°, назад ≈ −10°:
                                    # отставленная нога уходит назад подъёмом пятки)
    KNEE_MAX = 40.0                 # колени 0…40°
    BOB = 0.03                      # покачивание таза по Z, ±0.03 м
    # Параметры подобраны перебором: опорная стопа стоит на месте (недолёт ≤ 2 мм),
    # бедро при ударе пяткой +25°, колено ≤ 40°, естественный размах таза ≈ ±0.03 м.
    CONTACT = 0.49                  # доля цикла, когда стопа на земле
    HEEL0 = 0.28                    # пятка при ударе: на столько впереди таза, м
    KNEE_STANCE = 6.0               # колено опорной ноги до отрыва пятки
    HEEL_STRIKE_DEG = 8.0           # носок поднят при ударе пяткой
    TOE_OFF_DEG = 25.0              # пятка поднята при отрыве
    HEEL_RISE = 0.25                # с этой фазы пятка начинает отрываться
    PRE_STRIKE = 0.04               # за столько до удара пяткой таз начинает опускаться
    SAMPLES = 96                    # точек на цикл для таблицы высоты таза

    def __init__(self, joints):
        self.j = joints
        # (вперёд, вверх): от пятки и от подушечки стопы до лодыжки
        self.heel_to_ankle = Vector((0.050 * K, 0.085 * K))
        self.ball_to_ankle = Vector((-0.120 * K, 0.085 * K))
        self.heel_to_ball = 0.170 * K
        self.speed = self.SPEED * K
        self.l1 = (joints["knee.L"] - joints["hip.L"]).length
        self.l2 = (joints["ankle.L"] - joints["knee.L"]).length
        self.slip = 0.0     # наибольший недолёт лодыжки до цели в опоре, м
        self.heel0 = self.HEEL0 * K
        # Высота таза «как у перевёрнутого маятника»: её задают опорные ноги.
        # Затем размах приводится ровно к ±BOB вокруг среднего.
        n = self.SAMPLES
        h = [self.support_height(i / n) for i in range(n)]
        for _ in range(6):  # сглаживание изломов в двойной опоре (цикл замкнут)
            h = [0.25 * h[i - 1] + 0.5 * h[i] + 0.25 * h[(i + 1) % n] for i in range(n)]
        mid = 0.5 * (max(h) + min(h))
        scale = self.BOB * K / (0.5 * (max(h) - min(h)))
        self.height_table = [mid + (x - mid) * scale for x in h]
        self.bob_scale = scale

    def leg_length(self, knee_deg):
        k = math.radians(knee_deg)
        return math.sqrt(self.l1 ** 2 + self.l2 ** 2 + 2.0 * self.l1 * self.l2 * math.cos(k))

    def support_height(self, u):
        """Высота таза, при которой опорные ноги стоят с коленом KNEE_STANCE
        (нога после отрыва пятки — не выше прямой)."""
        pelvis = self.j["pelvis"]
        heights = []
        for sfx in ("L", "R"):
            ul = wrap(u - self.phase(sfx))
            if ul > 1.0 - self.PRE_STRIKE:
                ul -= 1.0           # нога вот-вот встанет на пятку: таз уже опускается
            elif ul > self.CONTACT:
                continue
            fwd, up, _ = self.ankle_stance(ul)
            hip = self.j[f"hip.{sfx}"]
            dx = fwd + hip.y
            knee = self.KNEE_STANCE if ul <= self.HEEL_RISE else 0.0
            d = self.leg_length(knee) * 0.999
            if d > abs(dx):
                heights.append(up + math.sqrt(d * d - dx * dx) + (pelvis.z - hip.z))
        return min(heights)

    # -- таз
    def hips(self, u):
        tau = 2.0 * math.pi
        x = wrap(u) * self.SAMPLES
        i = int(x)
        t = self.height_table
        z = t[i % len(t)] + (t[(i + 1) % len(t)] - t[i % len(t)]) * (x - i)
        sway = 0.014 * K * math.sin(tau * (u - 0.06))        # к опорной ноге
        yaw = -5.0 * math.cos(tau * u)                       # левое бедро вперёд с левой ногой
        roll = -2.0 * math.sin(tau * u)                      # проседает сторона маховой ноги
        offset = Vector((sway, 0.0, z - self.j["pelvis"].z))
        return rz(yaw) @ ry(roll), offset, yaw, roll

    def hip_world(self, sfx, u):
        hips_d, offset, _, _ = self.hips(u)
        pelvis = self.j["pelvis"]
        return pelvis + offset + hips_d @ (self.j[f"hip.{sfx}"] - pelvis)

    @staticmethod
    def phase(sfx):
        return 0.0 if sfx == "L" else 0.5

    # -- опора
    @staticmethod
    def rot2(vec, deg):
        a = math.radians(deg)
        c, s = math.cos(a), math.sin(a)
        return Vector((vec.x * c - vec.y * s, vec.x * s + vec.y * c))

    def pitch_stance(self, u):
        if u < 0.10:
            return self.HEEL_STRIKE_DEG * (1.0 - smooth(u / 0.10))
        if u < self.HEEL_RISE:
            return 0.0
        return -self.TOE_OFF_DEG * smooth((u - self.HEEL_RISE) / (self.CONTACT - self.HEEL_RISE))

    def ankle_stance(self, u):
        """Лодыжка (вперёд, вверх) относительно точки под тазом и угол стопы в опоре."""
        p = self.pitch_stance(u)
        heel = self.heel0 - self.speed * u
        if p >= 0.0:
            a = Vector((heel, 0.0)) + self.rot2(self.heel_to_ankle, p)
        else:
            a = Vector((heel + self.heel_to_ball, 0.0)) + self.rot2(self.ball_to_ankle, p)
        return a.x, a.y, p

    def rest_angles(self, sfx):
        j = self.j
        hip, knee, ankle = j[f"hip.{sfx}"], j[f"knee.{sfx}"], j[f"ankle.{sfx}"]
        thigh = math.atan2(-(knee - hip).y, -(knee - hip).z)
        shin = math.atan2(-(ankle - knee).y, -(ankle - knee).z)
        return thigh, shin

    def stance(self, sfx, u):
        """IK опорной ноги: (бедро°, колено°, наклон вбок°, стопа°) от позы покоя."""
        fwd, up, pitch = self.ankle_stance(u)
        ankle_rest = self.j[f"ankle.{sfx}"]
        d = Vector((ankle_rest.x, -fwd, up)) - self.hip_world(sfx, wrap(u + self.phase(sfx)))
        d_fwd, d_down = -d.y, -d.z
        rest = ankle_rest - self.j[f"hip.{sfx}"]
        lat = math.degrees(math.atan2(d.x, d_down) - math.atan2(rest.x, -rest.z))
        vert = math.hypot(d_down, d.x)
        dist = min(math.hypot(d_fwd, vert), (self.l1 + self.l2) * 0.9995)
        cos_hip = (self.l1 ** 2 + dist ** 2 - self.l2 ** 2) / (2 * self.l1 * dist)
        cos_knee = (self.l1 ** 2 + self.l2 ** 2 - dist ** 2) / (2 * self.l1 * self.l2)
        thigh = math.atan2(d_fwd, vert) + math.acos(max(-1.0, min(1.0, cos_hip)))
        knee = math.pi - math.acos(max(-1.0, min(1.0, cos_knee)))
        rest_thigh, rest_shin = self.rest_angles(sfx)
        rest_knee = rest_thigh - rest_shin
        # Пределы из ТЗ: бедро ±THIGH_MAX, колено 0…KNEE_MAX. Если IK за них выходит,
        # бедро фиксируется на пределе, а голень тянется к цели (остаток — «проскальзывание»).
        lim = math.radians(self.THIGH_MAX)
        thigh = rest_thigh + max(-lim, min(lim, thigh - rest_thigh))
        kf, kz = self.l1 * math.sin(thigh), -self.l1 * math.cos(thigh)
        shin = math.atan2(d_fwd - kf, -(-vert - kz))
        knee = thigh - shin
        knee = rest_knee + max(0.0, min(math.radians(self.KNEE_MAX), knee - rest_knee))
        shin = thigh - knee
        af, az = kf + self.l2 * math.sin(shin), kz - self.l2 * math.cos(shin)
        self.slip = max(self.slip, math.hypot(af - d_fwd, az + vert))
        return (math.degrees(thigh - rest_thigh), math.degrees(knee - rest_knee), lat, pitch)

    # -- перенос
    def swing(self, sfx, u):
        """Перенос: бедро плавно выносится вперёд, колено сгибается до KNEE_MAX."""
        c = self.CONTACT
        s = (u - c) / (1.0 - c)
        a0, a1 = self.stance(sfx, c), self.stance(sfx, 0.0)
        e = smooth(s)
        thigh = a0[0] + (a1[0] - a0[0]) * e
        # пик сгиба колена (= KNEE_MAX) в начале переноса, при s = 0.5 ** (4/3)
        s_peak = 0.5 ** (4.0 / 3.0)
        bump = math.sin(math.pi * s ** 0.75) ** 2
        knee = a0[1] + (a1[1] - a0[1]) * e
        knee += (self.KNEE_MAX - (a0[1] + (a1[1] - a0[1]) * smooth(s_peak))) * bump
        knee = min(self.KNEE_MAX, knee)
        lat = a0[2] + (a1[2] - a0[2]) * e
        pitch = a0[3] + (a1[3] - a0[3]) * smooth(min(1.0, s * 1.6))
        return thigh, knee, lat, pitch

    def angles(self, sfx, u):
        return self.stance(sfx, u) if u <= self.CONTACT else self.swing(sfx, u)

    def leg(self, sfx, u):
        thigh, knee, lat, pitch = self.angles(sfx, u)
        side = ry(lat)
        return {
            f"thigh.{sfx}": side @ limb_fwd(thigh),
            f"shin.{sfx}": side @ limb_fwd(thigh - knee),
            f"foot.{sfx}": limb_fwd(pitch),
        }

    def pose(self, frame):
        u = wrap(frame / WALK_FRAMES)
        tau = 2.0 * math.pi
        hips_d, offset, yaw, roll = self.hips(u)
        world = {}
        for sfx in ("L", "R"):
            world.update(self.leg(sfx, wrap(u - self.phase(sfx))))
        # Голова стабилизирована: смотрит вперёд, чуть кивает в такт шагу.
        world["head"] = lean(1.5 + 1.2 * math.cos(2.0 * tau * (u - 0.1)))
        local = {
            "hips": hips_d,
            "spine": rz(-0.7 * yaw) @ ry(-0.8 * roll) @ lean(2.0),
            "chest": rz(-0.9 * yaw) @ ry(-0.3 * roll) @ lean(3.0 + 1.0 * math.cos(2.0 * tau * u)),
            "neck": lean(-2.0),
        }
        # Руки в противофазе ногам, ±20°, с небольшим запаздыванием локтя и кисти.
        for sfx, side in (("L", 1), ("R", -1)):
            w = tau * (u - self.phase(sfx) - 0.5 - 0.05)
            local[f"upper_arm.{sfx}"] = ry(side * -3.0) @ limb_fwd(20.0 * math.cos(w))
            local[f"forearm.{sfx}"] = limb_fwd(16.0 + 9.0 * (0.5 + 0.5 * math.cos(w - 0.5)))
            local[f"hand.{sfx}"] = limb_fwd(4.0 + 5.0 * math.cos(w - 0.9))
        return {"local": local, "world": world, "offsets": {"hips": offset}}


def idle_pose(frame):
    u = wrap(frame / IDLE_FRAMES)
    tau = 2.0 * math.pi
    breath = math.sin(tau * u)
    local = {
        "hips": Quaternion(),
        "spine": lean(0.6 * breath),
        "chest": lean(-2.0 * breath),                           # дыхание ±2°
        "neck": lean(1.2 * breath + 0.8 * math.sin(2 * tau * u + 0.4)),
        "head": rz(2.5 * math.sin(tau * u + 1.9))
                @ ry(1.6 * math.sin(tau * u + 0.6))
                @ lean(1.0 * math.sin(2 * tau * u + 1.2)),
    }
    for sfx, side in (("L", 1), ("R", -1)):
        local[f"upper_arm.{sfx}"] = limb_fwd(1.4 * breath) @ ry(side * -0.8 * breath)
        local[f"forearm.{sfx}"] = limb_fwd(1.0 + 1.0 * math.sin(tau * u - 0.5))
        local[f"hand.{sfx}"] = limb_fwd(1.0 * math.sin(tau * u - 1.0))
    return {"local": local}


def make_action(arm, name, frames, pose_fn):
    act = bpy.data.actions.new(name)
    arm.animation_data.action = act
    for f in range(frames + 1):
        rig.key_pose(arm, f, **pose_fn(f))
    act.use_frame_range = True
    act.frame_start = 0
    act.frame_end = frames
    act.use_cyclic = True
    arm.animation_data.action = None
    track = arm.animation_data.nla_tracks.new()
    track.name = name
    track.strips.new(name, 0, act)
    track.mute = True
    return act


# --------------------------------------------------------------------------- сборка

def build(out_path):
    scene.reset()
    arm = rig.build_humanoid(HEIGHT)
    joints = rig.joint_positions(HEIGHT)
    meshes = build_body(arm, joints)

    arm.animation_data_create()
    gait = Gait(joints)
    # Шаг, с которым реально идёт походка (скорость земли масштабирована на K):
    # NpcWalker берёт из него скорость, иначе при HEIGHT ≠ REF_HEIGHT ступни поедут.
    arm["stride_m"] = gait.speed / 2.0
    make_action(arm, "Idle-loop", IDLE_FRAMES, idle_pose)
    make_action(arm, "Walk-loop", WALK_FRAMES, gait.pose)
    for pb in arm.pose.bones:
        pb.rotation_quaternion = Quaternion()
        pb.location = Vector()

    legs = [gait.angles("L", f / WALK_FRAMES) for f in range(WALK_FRAMES)]
    print(f"walk: thigh {min(a[0] for a in legs):.1f}..{max(a[0] for a in legs):.1f} deg, "
          f"knee {min(a[1] for a in legs):.1f}..{max(a[1] for a in legs):.1f} deg, "
          f"max foot slip {gait.slip * 1000:.1f} mm, "
          f"bob ±{Gait.BOB:.2f} m (natural x{1.0 / gait.bob_scale:.2f})")
    print(f"triangles: {scene.triangle_count(meshes)}")
    scene.export_glb(out_path, [arm] + meshes)


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit("usage: build_npc_test.py <out.glb>")
    build(sys.argv[1])
