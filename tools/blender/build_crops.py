"""build_crops.py <out_dir> [--sheet <png>] — модели культур фермы: 3 культуры × 4 стадии.

<out_dir>/<id>/<id>_s<0-3>.glb, id ∈ silverleaf, boneroot, nightbloom; стадии 0 росток,
1 побег, 2 взрослое, 3 спелое.
- серебрянка (silverleaf) — низкая розетка бледных серебристых листьев; спелая: внутренние
  листья светлеют до холодного серебра (silver_ripe), над розеткой три колоска с серебряными
  «серёжками», высота ≈ 0.38 м;
- костяной корень (boneroot) — пучок тёмных острых листьев над серой макушкой корня; спелый:
  крупная бугристая костяно-белая макушка (bone_white) с «костяшками» вокруг, ≈ 0.52 м;
- ночецвет (nightbloom) — высокий тёмный стебель с сизыми листьями, у взрослого — поникший
  бутон; спелый: крупный фиолетовый цветок (bloom_violet), ≈ 0.9 м.
Каждая модель — один меш в пределах 0.9 × 0.9 м, начало координат — центр основания на земле.
Листья — одинарные плоскости со сгибом по средней жилке (материалы палитры двусторонние).

--sheet <png> — контактный лист 3 × 4 (строки — культуры, столбцы — стадии) на тёмных
плитках вспаханной земли под холодной луной, камера сверху под 45°, как в игре.
"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402  (bpy до bmesh: bmesh грузится из модуля bpy)
from mathutils import Euler, Matrix, Vector  # noqa: E402

from build_props_farm import Builder  # noqa: E402
from lib import scene  # noqa: E402

SEED = 1115
CROPS = ("silverleaf", "boneroot", "nightbloom")
STAGES = range(4)
GOLDEN = math.radians(137.5)          # шаг листьев по кругу — без повторяющихся рядов
ROOT = Path(__file__).resolve().parents[2]
SOIL_TILE_GLB = ROOT / "game" / "assets" / "farm" / "soil_tile" / "soil_tile.glb"
UP = Vector((0.0, 0.0, 1.0))


# --------------------------------------------------------------------------- примитивы

def leaf(b, base, yaw, elev, length, width, key, droop=0.0, fold=0.3,
         sections=((0.35, 1.0), (0.7, 0.7))):
    """Лист от base по азимуту yaw (рад), поднят на elev (рад) и провисает к кончику.

    Средняя линия: z(t) = L·t·sin(elev) − droop·L·t²; сечения (t, доля ширины) — три точки
    (край, жилка, край), края приподняты на fold·полуширины — лист сложен лодочкой.
    """
    base = Vector(base)
    d = Vector((math.cos(yaw), math.sin(yaw), 0.0))
    side = Vector((-math.sin(yaw), math.cos(yaw), 0.0))
    ce, se = math.cos(elev), math.sin(elev)

    def center(t):
        return base + d * (length * t * ce) + UP * (length * t * se - droop * length * t * t)

    new = b.bm.verts.new
    root = new(center(0.0))
    tip = new(center(1.0))
    rows = []
    for t, wf in sections:
        c, half = center(t), 0.5 * width * wf
        rows.append((new(c - side * half + UP * fold * half), new(c),
                     new(c + side * half + UP * fold * half)))
    left, mid, right = rows[0]
    b.face((root, left, mid), key)
    b.face((root, mid, right), key)
    for (l0, m0, r0), (l1, m1, r1) in zip(rows, rows[1:]):
        b.face((l0, l1, m1, m0), key)
        b.face((m0, m1, r1, r0), key)
    left, mid, right = rows[-1]
    b.face((left, tip, mid), key)
    b.face((mid, tip, right), key)


def lathe(b, profile, key, sides=6, mat=None, rng=None, jitter=0.0, phase=0.0):
    """Тело вращения вокруг локальной оси Z: profile — [(r, z)], r = 0 — острие.

    mat — переход в мир (поворот + сдвиг); jitter — случайный разброс радиуса (бугры).
    """
    mat = mat or Matrix.Identity(4)
    new = b.bm.verts.new
    loops = []
    for r, z in profile:
        if r < 1e-6:
            loops.append([new(mat @ Vector((0.0, 0.0, z)))])
            continue
        ring = []
        for k in range(sides):
            a = phase + 2.0 * math.pi * k / sides
            rr = r * (1.0 + (rng.uniform(-jitter, jitter) if rng else 0.0))
            ring.append(new(mat @ Vector((rr * math.cos(a), rr * math.sin(a), z))))
        loops.append(ring)
    for lo, hi in zip(loops, loops[1:]):
        if len(lo) == 1 and len(hi) == 1:
            continue
        if len(lo) == 1:
            for k in range(sides):
                b.face((lo[0], hi[k], hi[(k + 1) % sides]), key)
        elif len(hi) == 1:
            for k in range(sides):
                b.face((lo[k], lo[(k + 1) % sides], hi[0]), key)
        else:
            for k in range(sides):
                b.face((lo[k], lo[(k + 1) % sides], hi[(k + 1) % sides], hi[k]), key)
    if len(loops[0]) > 1:
        b.face(list(reversed(loops[0])), key)
    if len(loops[-1]) > 1:
        b.face(loops[-1], key)


def tube(b, pts, radii, key, sides=5):
    """Стебель: горизонтальные кольца по точкам pts с радиусами radii; r = 0 — острие."""
    new = b.bm.verts.new
    loops = []
    for p, r in zip(pts, radii):
        p = Vector(p)
        if r < 1e-6:
            loops.append([new(p)])
        else:
            loops.append([new(p + Vector((r * math.cos(a), r * math.sin(a), 0.0)))
                          for a in (2.0 * math.pi * k / sides for k in range(sides))])
    for lo, hi in zip(loops, loops[1:]):
        if len(hi) == 1:
            for k in range(sides):
                b.face((lo[k], lo[(k + 1) % sides], hi[0]), key)
        else:
            for k in range(sides):
                b.face((lo[k], lo[(k + 1) % sides], hi[(k + 1) % sides], hi[k]), key)
    b.face(list(reversed(loops[0])), key)
    if len(loops[-1]) > 1:
        b.face(loops[-1], key)


def frame(pos, tilt, yaw):
    """Поворот локальной оси Z на tilt от вертикали в сторону азимута yaw, затем сдвиг в pos."""
    rot = Euler((0.0, tilt, yaw), "XYZ").to_matrix().to_4x4()
    return Matrix.Translation(Vector(pos)) @ rot


def ring_of_leaves(b, rng, count, length, width, elev, key, droop=0.2, base_r=0.0,
                   base_z=0.0, phase=0.0, sections=((0.35, 1.0), (0.7, 0.7)), fold=0.3):
    """Венчик листьев по золотому углу со случайным разбросом длины и наклона."""
    for i in range(count):
        yaw = phase + i * GOLDEN + rng.uniform(-0.15, 0.15)
        base = (base_r * math.cos(yaw), base_r * math.sin(yaw), base_z)
        leaf(b, base, yaw, elev + rng.uniform(-0.08, 0.08), length * rng.uniform(0.88, 1.08),
             width, key, droop=droop, fold=fold, sections=sections)


# --------------------------------------------------------------------------- серебрянка

SILVER_RINGS = {
    # (листьев, длина, ширина, подъём°, провис, ключ)
    0: [(3, 0.11, 0.065, 55, 0.2, "leaf_silver")],
    1: [(5, 0.2, 0.1, 34, 0.3, "leaf_silver"), (3, 0.14, 0.075, 64, 0.15, "leaf_silver")],
    2: [(7, 0.31, 0.15, 24, 0.3, "leaf_silver"), (5, 0.23, 0.12, 46, 0.3, "leaf_silver"),
        (3, 0.17, 0.085, 70, 0.15, "leaf_silver")],
    3: [(8, 0.36, 0.16, 22, 0.3, "leaf_silver"), (5, 0.25, 0.13, 44, 0.3, "silver_ripe"),
        (3, 0.18, 0.09, 70, 0.15, "leaf_silver")],
}


def build_silverleaf(stage, rng):
    b = Builder(f"silverleaf_s{stage}")
    for i, (n, length, width, elev, droop, key) in enumerate(SILVER_RINGS[stage]):
        ring_of_leaves(b, rng, n, length, width, math.radians(elev), key, droop=droop,
                       base_r=0.012, base_z=0.004 * i, phase=i * 0.6)
    if stage == 3:
        # три колоска с семенами: тёмный стебель над розеткой и серебряная «серёжка» на конце
        for k in range(3):
            yaw = k * 2.0 * math.pi / 3.0 + 0.4
            lean = math.radians(12 + 6 * k)
            top_h = 0.23 + 0.025 * k
            d = Vector((math.cos(yaw), math.sin(yaw), 0.0))
            top = d * (top_h * math.tan(lean)) + UP * top_h
            tube(b, [(0, 0, 0.0), (d * 0.5 * top_h * math.tan(lean) + UP * 0.5 * top_h), top],
                 [0.008, 0.007, 0.006], "stem_dark", sides=4)
            lathe(b, [(0.0, 0.0), (0.03, 0.025), (0.036, 0.065), (0.022, 0.1), (0.0, 0.125)],
                  "silver_ripe", sides=6, mat=frame(top, lean, yaw))
    return b.finish()


# --------------------------------------------------------------------------- костяной корень

BONE_CROWN = {
    # профиль макушки над землёй (r, z); s0 — только крошечный бугорок
    0: [(0.028, 0.0), (0.026, 0.016), (0.0, 0.026)],
    1: [(0.05, 0.0), (0.056, 0.025), (0.04, 0.05), (0.0, 0.06)],
    2: [(0.08, 0.0), (0.09, 0.04), (0.068, 0.08), (0.0, 0.095)],
    3: [(0.12, 0.0), (0.138, 0.05), (0.128, 0.10), (0.088, 0.145), (0.035, 0.168), (0.0, 0.172)],
}
BONE_LEAVES = {
    # (листьев, длина, ширина, подъём°)
    0: (3, 0.08, 0.026, 74),
    1: (5, 0.17, 0.034, 72),
    2: (7, 0.27, 0.044, 71),
    3: (8, 0.4, 0.052, 74),
}


def build_boneroot(stage, rng):
    b = Builder(f"boneroot_s{stage}")
    crown = BONE_CROWN[stage]
    key = "bone_white" if stage == 3 else "root_flesh"
    lathe(b, crown, key, sides=7, rng=rng, jitter=0.12 if stage == 3 else 0.06)
    top_z = crown[-1][1]
    n, length, width, elev = BONE_LEAVES[stage]
    # острые листья пучком из макушки; пара отогнута — растрёпанный, неуютный вид
    for i in range(n):
        yaw = i * GOLDEN + rng.uniform(-0.2, 0.2)
        bent = i % 3 == 2
        e = math.radians(elev - (25 if bent else 0)) + rng.uniform(-0.06, 0.06)
        base = (0.01 * math.cos(yaw), 0.01 * math.sin(yaw), top_z * 0.8)
        leaf(b, base, yaw, e, length * rng.uniform(0.85, 1.1), width, "leaf_dark",
             droop=0.35 if bent else 0.06, fold=0.5, sections=((0.3, 1.0), (0.65, 0.6)))
    if stage == 3:
        # «костяшки» — боковые отростки корня, вылезшие из земли вокруг макушки
        for k in range(3):
            yaw = k * 2.0 * math.pi / 3.0 + 0.9
            r = 0.17 + 0.02 * k
            tilt = math.radians(28)
            pos = (r * math.cos(yaw), r * math.sin(yaw), 0.034 * math.sin(tilt))  # край не под землёй
            lathe(b, [(0.03, 0.0), (0.03, 0.03), (0.02, 0.055), (0.0, 0.065)], "bone_white",
                  sides=5, mat=frame(pos, tilt, yaw))
    return b.finish()


# --------------------------------------------------------------------------- ночецвет

NIGHT_STEM = {
    # (высота, радиус у земли, листья на стебле [(доля высоты, длина)])
    0: (0.12, 0.012, [(0.5, 0.1), (0.8, 0.085)]),
    1: (0.34, 0.017, [(0.15, 0.17), (0.4, 0.18), (0.62, 0.16), (0.82, 0.12)]),
    2: (0.70, 0.022, [(0.18, 0.2), (0.34, 0.2), (0.5, 0.18), (0.65, 0.15), (0.8, 0.11)]),
    3: (0.74, 0.024, [(0.18, 0.21), (0.34, 0.21), (0.5, 0.19), (0.65, 0.16), (0.8, 0.12)]),
}
STEM_BEND = Vector((0.05, -0.03, 0.0))   # стебель чуть изогнут — не палка


def stem_point(h, t):
    """Точка на изогнутом стебле высотой h на доле t (S-образный изгиб)."""
    return STEM_BEND * (math.sin(math.pi * t) * 0.6 + t * t * 0.4) * (h / 0.74) + UP * (h * t)


def build_nightbloom(stage, rng):
    b = Builder(f"nightbloom_s{stage}")
    h, r0, leaves = NIGHT_STEM[stage]
    ts = [0.0, 0.2, 0.45, 0.7, 0.88, 1.0]
    pts = [stem_point(h, t) for t in ts]
    radii = [r0 * (1.0 - 0.55 * t) for t in ts]
    if stage < 2:
        radii[-1] = 0.0                  # у ростка и побега стебель кончается острием
    tube(b, pts, radii, "stem_dark", sides=5)
    # листья вдоль стебля поочерёдно, узкие и поникшие
    for i, (t, length) in enumerate(leaves):
        yaw = i * GOLDEN + rng.uniform(-0.2, 0.2)
        leaf(b, stem_point(h, t), yaw, math.radians(38) + rng.uniform(-0.1, 0.1), length,
             length * 0.32, "leaf_dusk", droop=0.55, fold=0.35)
    if stage >= 2:
        # прикорневые листья — чтобы основание читалось на земле
        ring_of_leaves(b, rng, 3, 0.17 if stage == 2 else 0.18, 0.06, math.radians(30),
                       "leaf_dusk", droop=0.35, base_r=0.01, phase=1.1)
    top = pts[-1]
    if stage == 2:
        # закрытый тёмный бутон, поникший набок
        lathe(b, [(0.0, -0.01), (0.03, 0.02), (0.034, 0.06), (0.02, 0.1), (0.0, 0.13)],
              "stem_dark", sides=6, mat=frame(top, math.radians(40), math.radians(-60)))
    elif stage == 3:
        # чашелистики вниз, два венчика фиолетовых лепестков, бледные тычинки в центре
        for k in range(5):
            yaw = k * 2.0 * math.pi / 5.0
            leaf(b, top, yaw, math.radians(-40), 0.07, 0.03, "stem_dark", droop=0.0, fold=0.2,
                 sections=((0.5, 1.0),))
        center = top + UP * 0.02
        for k in range(6):
            yaw = k * 2.0 * math.pi / 6.0 + rng.uniform(-0.12, 0.12)
            leaf(b, center, yaw, math.radians(34), 0.21 * rng.uniform(0.92, 1.05), 0.13,
                 "bloom_violet", droop=0.32, fold=0.45, sections=((0.35, 1.0), (0.72, 0.8)))
        for k in range(5):
            yaw = (k + 0.5) * 2.0 * math.pi / 5.0
            leaf(b, center + UP * 0.005, yaw, math.radians(62), 0.13, 0.09, "bloom_violet",
                 droop=0.2, fold=0.5, sections=((0.4, 1.0), (0.75, 0.75)))
        lathe(b, [(0.018, 0.0), (0.016, 0.04), (0.028, 0.06), (0.0, 0.075)], "silver_ripe",
              sides=5, mat=frame(center, 0.0, 0.0))
    return b.finish()


BUILDERS = {"silverleaf": build_silverleaf, "boneroot": build_boneroot,
            "nightbloom": build_nightbloom}


# --------------------------------------------------------------------------- контактный лист

SHEET_COL = 1.25        # шаг столбцов (стадии), м
SHEET_ROW = 1.5         # шаг строк (культуры), м
SHEET_RES = (1600, 1040)


def _linear(c):
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def _flat_material(name, srgb, emission=0.0):
    mat = bpy.data.materials.new(name)
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = (*_linear(srgb), 1.0)
    bsdf.inputs["Roughness"].default_value = 0.9
    if emission:
        bsdf.inputs["Emission Color"].default_value = (*_linear(srgb), 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission
    return mat


def _import(glb, loc):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(glb), disable_bone_shape=True)
    for o in set(bpy.data.objects) - before:
        if o.parent is None:
            o.location = Vector(loc) + o.location
    return [o for o in set(bpy.data.objects) - before]


def _surface_z(x, y):
    """Высота верха плитки в (x, y): растение стоит на гребне, а не тонет в земле."""
    bpy.context.view_layer.update()
    hit, loc, *_ = bpy.context.scene.ray_cast(
        bpy.context.evaluated_depsgraph_get(), Vector((x, y, 1.0)), Vector((0.0, 0.0, -1.0)))
    return loc.z if hit else 0.0


def _look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def _label(text, loc, size, mat):
    curve = bpy.data.curves.new(f"label_{text}", "FONT")
    curve.body = text
    curve.size = size
    curve.align_x = "CENTER"
    obj = bpy.data.objects.new(f"label_{text}", curve)
    obj.location = Vector(loc) + Vector((0.0, 0.0, 0.12))   # хвосты букв не уходят в землю
    obj.rotation_euler = (math.radians(45.0), 0.0, 0.0)   # лицом к камере
    obj.data.materials.append(mat)
    obj.visible_shadow = False
    bpy.context.scene.collection.objects.link(obj)


def render_sheet(out_dir, png):
    scene.reset()
    scn = bpy.context.scene
    soil = _flat_material("sheet_soil", (0.17, 0.145, 0.125))      # сырая тёмная пашня
    ground = _flat_material("sheet_ground", (0.10, 0.095, 0.09))
    ink = _flat_material("sheet_ink", (0.75, 0.75, 0.78), emission=0.6)

    bpy.ops.mesh.primitive_plane_add(size=40.0, location=(0.0, 0.0, -0.002))
    bpy.context.active_object.data.materials.append(ground)
    for r, crop in enumerate(CROPS):
        y = (1 - r) * SHEET_ROW
        _label(crop, (-2.85, y - 0.05, 0.0), 0.2, ink)
        for s in STAGES:
            x = (s - 1.5) * SHEET_COL
            z = 0.0
            if SOIL_TILE_GLB.is_file():
                for o in _import(SOIL_TILE_GLB, (x, y, 0.0)):
                    if o.type == "MESH":
                        o.data.materials.clear()
                        o.data.materials.append(soil)
                z = _surface_z(x, y)
            _import(Path(out_dir) / crop / f"{crop}_s{s}.glb", (x, y, z))
    for s in STAGES:
        _label(f"s{s}", ((s - 1.5) * SHEET_COL, SHEET_ROW + 0.75, 0.0), 0.2, ink)

    # ночь: тёмное небо, холодная луна сзади-слева сверху, слабая холодная заливка от камеры
    world = bpy.data.worlds.new("sheet_world")
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.02, 0.026, 0.04, 1.0)
    bg.inputs["Strength"].default_value = 1.0
    scn.world = world
    moon_data = bpy.data.lights.new("moon", "SUN")
    moon_data.energy = 3.2
    moon_data.color = (0.66, 0.76, 1.0)
    moon_data.angle = math.radians(2.0)
    moon = bpy.data.objects.new("moon", moon_data)
    moon.location = (-4.0, 6.0, 7.0)
    _look_at(moon, (0.0, 0.0, 0.0))
    scn.collection.objects.link(moon)
    fill_data = bpy.data.lights.new("fill", "AREA")
    fill_data.energy = 400.0
    fill_data.size = 6.0
    fill_data.color = (0.55, 0.62, 0.8)
    fill = bpy.data.objects.new("fill", fill_data)
    fill.location = (2.0, -7.0, 6.0)
    _look_at(fill, (0.0, 0.0, 0.0))
    scn.collection.objects.link(fill)

    target = Vector((-0.45, 0.25, 0.25))
    cam_data = bpy.data.cameras.new("sheet_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 6.15
    cam = bpy.data.objects.new("sheet_cam", cam_data)
    cam.location = target + Vector((0.0, -8.0, 8.0))       # 45° вниз, как камера игры
    _look_at(cam, target)
    scn.collection.objects.link(cam)
    scn.camera = cam

    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = 48
    scn.cycles.use_adaptive_sampling = False
    try:
        scn.cycles.use_denoising = True
        scn.cycles.denoiser = "OPENIMAGEDENOISE"
    except (AttributeError, TypeError):
        scn.cycles.use_denoising = False
    scn.render.resolution_x, scn.render.resolution_y = SHEET_RES
    scn.render.resolution_percentage = 100
    scn.view_settings.view_transform = "AgX"
    scn.render.image_settings.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGB"
    Path(png).parent.mkdir(parents=True, exist_ok=True)
    scn.render.filepath = str(Path(png).resolve())
    bpy.ops.render.render(write_still=True)
    print(f"crops sheet: wrote {png}")


# --------------------------------------------------------------------------- сборка

def build(out_dir):
    out = Path(out_dir)
    for crop in CROPS:
        for stage in STAGES:
            scene.reset()
            obj = BUILDERS[crop](stage, random.Random(f"{SEED}-{crop}-{stage}"))
            name = f"{crop}_s{stage}"
            print(f"{name} triangles: {scene.triangle_count([obj])}")
            scene.export_glb(str(out / crop / f"{name}.glb"), [obj])


if __name__ == "__main__":
    args = sys.argv[1:]
    sheet = None
    if len(args) == 3 and args[1] == "--sheet":
        sheet = args[2]
        args = args[:1]
    if len(args) != 1:
        sys.exit("usage: build_crops.py <out_dir> [--sheet <png>]")
    build(args[0])
    if sheet:
        render_sheet(args[0], sheet)
