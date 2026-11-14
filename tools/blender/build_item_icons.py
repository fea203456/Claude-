"""build_item_icons.py <out_dir> [--sheet <png>] — иконки предметов из моделей Blender.

<out_dir>/<id>.png — 128 × 128 RGBA с прозрачным фоном, id ∈ ITEMS:
- hoe — мотыга: светлое древко по диагонали, широкое железное лезвие у верхнего конца;
- watering_can — жестяная лейка с обручами, носиком-«розой» вправо и ручкой слева;
- seed_<культура> — мешочек семян: одна модель из мешковины, у горловины горка семян и
  большая бирка цвета культуры (серебрянка — серебристо-голубой, костяной корень —
  костяно-белый, ночецвет — фиолетовый);
- silverleaf — пучок бледных листьев серебрянки, перевязанный шнурком;
- boneroot — выдернутый костяно-белый корень с тёмными листьями;
- nightbloom — фиолетовый цветок ночецвета на коротком стебле (геометрия из build_crops).
Камера ортографическая, чуть сверху и сбоку; кадр подгоняется под силуэт каждой модели
(заполняет ≈ 90 % стороны), свет — ключевой спереди-слева и холодный контровой справа-сзади,
чтобы иконка читалась на тёмной полупрозрачной панели хотбара.

--sheet <png> — контактный лист: 8 иконок в ячейках 128 px и та же восьмёрка в хотбаре 64 px.
"""
import math
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402  (bpy до bmesh: bmesh грузится из модуля bpy)
import numpy as np  # noqa: E402
from mathutils import Vector  # noqa: E402

from build_crops import GOLDEN, bloom, frame, lathe, leaf  # noqa: E402
from build_props_farm import Builder  # noqa: E402
from lib import scene  # noqa: E402

SEED = 1117
SIZE = 128
FILL = 0.9              # доля стороны кадра под большую сторону силуэта
SAMPLES = 24
CAM_YAW = math.radians(18.0)      # камера правее фронта (−Y)…
CAM_PITCH = math.radians(20.0)    # …и чуть сверху
SEED_TAGS = {"silverleaf": "silver_blue", "boneroot": "bone_white", "nightbloom": "bloom_violet"}
ITEMS = ("hoe", "watering_can", "seed_silverleaf", "seed_boneroot", "seed_nightbloom",
         "silverleaf", "boneroot", "nightbloom")


# --------------------------------------------------------------------------- примитивы

def bar(b, p0, p1, r, key, sides=6):
    """Брусок-цилиндр радиуса r от p0 до p1 (произвольное направление)."""
    p0, p1 = Vector(p0), Vector(p1)
    d = p1 - p0
    tilt = math.acos(max(-1.0, min(1.0, d.z / d.length)))
    yaw = math.atan2(d.y, d.x)
    lathe(b, [(r, 0.0), (r, d.length)], key, sides=sides, mat=frame(p0, tilt, yaw))


# --------------------------------------------------------------------------- модели
# Все модели смотрят «лицом» в −Y (к камере); масштаб любой — кадр подгоняется под силуэт.

def build_hoe(rng):
    b = Builder("hoe")
    d = Vector((1.0, 0.0, 1.0)).normalized()              # вдоль древка, вверх-вправо
    top = d * 0.42
    bar(b, -d * 0.36, top, 0.056, "wood_weathered", sides=7)
    bar(b, top - d * 0.1, top + d * 0.03, 0.064, "iron_dark", sides=7)   # втулка
    # лезвие на изогнутой шейке свисает вниз, к древку, — силуэт «Г», не топор
    p = Vector((1.0, 0.0, -1.0)).normalized()
    p = (p * math.cos(math.radians(40)) - d * math.sin(math.radians(40))).normalized()
    neck_end = top + d * 0.03 + Vector((0.13, 0.0, 0.0))
    bar(b, top, neck_end, 0.032, "iron_dark")             # шейка
    near, far = neck_end + p * 0.02, neck_end + p * 0.34
    t = Vector((0.0, 0.02, 0.0))
    s = Vector((p.z, 0.0, -p.x))                           # поперёк лезвия в плоскости кадра
    hw = 0.18                                              # полуширина кромки
    ring = [near - s * 0.1, near + s * 0.1, far + s * hw, far - s * hw]
    b.hexa([tuple(v + t) for v in ring] + [tuple(v - t) for v in ring], "metal_dull")
    # отточенная кромка — светлая полоска по нижнему краю
    edge = [far - s * hw - p * 0.045, far + s * hw - p * 0.045, far + s * hw, far - s * hw]
    t2 = t * 1.15
    b.hexa([tuple(v + t2) for v in edge] + [tuple(v - t2) for v in edge], "silver_ripe")
    return [b.finish()]


def build_watering_can(rng):
    b = Builder("watering_can")
    lathe(b, [(0.0, 0.0), (0.17, 0.0), (0.17, 0.02), (0.165, 0.30), (0.15, 0.32), (0.0, 0.33)],
          "metal_dull", sides=10)
    for z0, z1 in ((0.03, 0.07), (0.26, 0.30)):           # обручи
        lathe(b, [(0.177, z0), (0.177, z1)], "iron_dark", sides=10)
    lathe(b, [(0.07, 0.31), (0.07, 0.345), (0.0, 0.345)], "iron_dark", sides=8)  # горловина
    # носик из низа корпуса вверх-вправо, на конце — «роза» с дырочками
    base = Vector((0.12, 0.0, 0.06))
    tilt, length = math.radians(52.0), 0.42
    lathe(b, [(0.045, 0.0), (0.03, length * 0.6), (0.022, length)], "metal_dull", sides=7,
          mat=frame(base, tilt, 0.0))
    tip = base + Vector((math.sin(tilt), 0.0, math.cos(tilt))) * length
    lathe(b, [(0.02, 0.0), (0.055, 0.05), (0.058, 0.07), (0.0, 0.072)], "iron_dark", sides=8,
          mat=frame(tip, tilt, 0.0))
    # ручка-петля сзади слева
    arc = [Vector((-0.15 - 0.15 * math.sin(math.pi * k / 6), 0.0, 0.29 - 0.22 * k / 6))
           for k in range(7)]
    for a, c in zip(arc, arc[1:]):
        bar(b, a, c, 0.024, "metal_dull", sides=5)
    return [b.finish()]


def build_seed_pouch(crop, rng):
    """Мешочек семян: мешковина, шнурок на горловине, горка семян и бирка цвета культуры."""
    tag = SEED_TAGS[crop]
    b = Builder(f"seed_{crop}")
    lathe(b, [(0.0, 0.0), (0.13, 0.005), (0.19, 0.05), (0.21, 0.12), (0.19, 0.2), (0.12, 0.26),
              (0.07, 0.29), (0.065, 0.31), (0.1, 0.36), (0.12, 0.38), (0.0, 0.38)],
          "sack_burlap", sides=9, rng=rng, jitter=0.06)
    lathe(b, [(0.105, 0.37), (0.075, 0.41), (0.0, 0.43)], tag, sides=9)        # семена
    lathe(b, [(0.08, 0.282), (0.08, 0.316)], "leather_dark", sides=9)          # шнурок
    # бирка на шнурке висит перед мешком, чуть наискось
    knot = Vector((0.02, -0.075, 0.29))
    c = Vector((0.05, -0.235, 0.12))
    ang = math.radians(-12.0)
    u = Vector((math.cos(ang), 0.0, math.sin(ang)))       # вдоль бирки
    v = Vector((-math.sin(ang), 0.0, math.cos(ang)))      # поперёк
    hw, hh = 0.11, 0.1
    bar(b, knot, c + v * hh * 0.85, 0.008, "leather_dark", sides=4)
    ring = [c - u * hw - v * hh, c + u * hw - v * hh, c + u * hw + v * hh, c - u * hw + v * hh]
    t = Vector((0.0, 0.01, 0.0))
    b.hexa([tuple(p + t) for p in ring] + [tuple(p - t) for p in ring], tag)
    return [b.finish()]


def build_silverleaf_item(rng):
    """Пучок листьев веером, черешки перевязаны шнурком; строится лёжа и ставится лицом к камере."""
    b = Builder("silverleaf")
    n = 7
    for i in range(n):
        yaw = math.radians(35.0 + 110.0 * i / (n - 1)) + rng.uniform(-0.06, 0.06)
        inner = abs(i - (n - 1) / 2) < 1.6
        leaf(b, (0.0, 0.03, 0.0), yaw, math.radians(8 + 4 * inner), 0.36 * rng.uniform(0.9, 1.05)
             * (1.08 if inner else 1.0), 0.16, "silver_ripe" if inner else "leaf_silver",
             droop=0.12, fold=0.3)
    for dx in (-0.025, 0.0, 0.025):                       # черешки
        bar(b, (0.0, 0.03, 0.0), (dx * 2.0, -0.17, -0.01), 0.012, "leaf_silver", sides=5)
    bar(b, (0.0, -0.01, 0.0), (0.0, -0.05, 0.0), 0.03, "leather_dark", sides=7)
    obj = b.finish()
    obj.rotation_euler = (math.radians(90.0), math.radians(-20.0), 0.0)
    return [obj]


def build_boneroot_item(rng):
    """Выдернутый корень: бугристое костяно-белое тело остриём вниз, пучок тёмных листьев."""
    b = Builder("boneroot")
    lathe(b, [(0.0, 0.0), (0.045, 0.08), (0.1, 0.17), (0.135, 0.26), (0.125, 0.33), (0.07, 0.37),
              (0.0, 0.38)], "bone_white", sides=7, rng=rng, jitter=0.12)
    for k in range(3):                                    # «костяшки» по бокам
        yaw = k * 2.0 * math.pi / 3.0 - 0.6
        pos = (0.11 * math.cos(yaw), 0.11 * math.sin(yaw), 0.2 + 0.04 * k)
        lathe(b, [(0.035, 0.0), (0.033, 0.035), (0.02, 0.06), (0.0, 0.07)], "bone_white",
              sides=5, mat=frame(pos, math.radians(70), yaw))
    for k in range(3):                                    # корешки у острия
        yaw = k * 2.0 * math.pi / 3.0 + 0.3
        bar(b, (0.0, 0.0, 0.03), (0.07 * math.cos(yaw), 0.07 * math.sin(yaw), -0.06), 0.006,
            "root_flesh", sides=4)
    for i in range(7):
        yaw = i * GOLDEN + rng.uniform(-0.2, 0.2)
        bent = i % 3 == 2
        e = math.radians(72 - (28 if bent else 0)) + rng.uniform(-0.06, 0.06)
        leaf(b, (0.012 * math.cos(yaw), 0.012 * math.sin(yaw), 0.35), yaw, e,
             0.27 * rng.uniform(0.85, 1.1), 0.08, "leaf_dark", droop=0.35 if bent else 0.06,
             fold=0.4, sections=((0.3, 1.0), (0.65, 0.6)))
    obj = b.finish()
    obj.rotation_euler = (0.0, math.radians(28.0), 0.0)
    return [obj]


def build_nightbloom_item(rng):
    """Цветок ночецвета на коротком стебле с одним листом, чашей к камере."""
    b = Builder("nightbloom")
    bar(b, (0.03, 0.0, -0.38), (0.0, 0.0, 0.0), 0.02, "stem_dark", sides=5)
    leaf(b, (0.02, 0.0, -0.24), 0.2, math.radians(30), 0.2, 0.075, "leaf_dusk", droop=0.45,
         fold=0.35)
    bloom(b, rng, (0.0, 0.0, 0.0))
    obj = b.finish()
    obj.rotation_euler = (math.radians(38.0), math.radians(25.0), 0.0)
    return [obj]


BUILDERS = {
    "hoe": build_hoe,
    "watering_can": build_watering_can,
    "seed_silverleaf": lambda rng: build_seed_pouch("silverleaf", rng),
    "seed_boneroot": lambda rng: build_seed_pouch("boneroot", rng),
    "seed_nightbloom": lambda rng: build_seed_pouch("nightbloom", rng),
    "silverleaf": build_silverleaf_item,
    "boneroot": build_boneroot_item,
    "nightbloom": build_nightbloom_item,
}


# --------------------------------------------------------------------------- рендер

def _aim(obj, direction):
    """Повернуть объект (камеру, свет) так, чтобы его −Z смотрел вдоль direction."""
    obj.rotation_euler = Vector(direction).to_track_quat("-Z", "Y").to_euler()


def _light(name, kind, energy, color, direction):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if kind == "SUN":
        data.angle = math.radians(3.0)
    obj = bpy.data.objects.new(name, data)
    _aim(obj, direction)
    bpy.context.scene.collection.objects.link(obj)


def _setup_stage():
    """Свет, мир и рендер: прозрачный фон, без видовой кривой — цвета палитры как есть."""
    scn = bpy.context.scene
    world = bpy.data.worlds.new("icon_world")
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (0.32, 0.34, 0.38, 1.0)     # мягкая заливка теней
    bg.inputs["Strength"].default_value = 1.0
    scn.world = world
    _light("key", "SUN", 3.2, (1.0, 0.96, 0.9), (0.55, 0.75, -0.75))     # спереди-слева сверху
    _light("rim", "SUN", 4.0, (0.72, 0.82, 1.0), (-0.7, -0.9, -0.35))    # контровой справа-сзади

    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = SAMPLES
    scn.cycles.use_adaptive_sampling = False
    scn.cycles.use_denoising = False
    scn.render.film_transparent = True
    scn.render.resolution_x = scn.render.resolution_y = SIZE
    scn.render.resolution_percentage = 100
    scn.view_settings.view_transform = "Standard"
    scn.render.image_settings.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGBA"
    scn.render.image_settings.color_depth = "8"


def _fit_camera(objects):
    """Ортокамера под CAM_YAW / CAM_PITCH, центр и масштаб — по силуэту объектов."""
    scn = bpy.context.scene
    flat = math.cos(CAM_PITCH)
    view = Vector((-math.sin(CAM_YAW) * flat, math.cos(CAM_YAW) * flat,
                   -math.sin(CAM_PITCH)))                 # направление взгляда камеры
    data = bpy.data.cameras.new("icon_cam")
    data.type = "ORTHO"
    cam = bpy.data.objects.new("icon_cam", data)
    cam.location = -view * 10.0
    _aim(cam, view)
    scn.collection.objects.link(cam)
    scn.camera = cam
    bpy.context.view_layer.update()

    to_cam = cam.matrix_world.inverted()
    pts = [to_cam @ (o.matrix_world @ v.co) for o in objects for v in o.data.vertices]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts)))
    mid = (lo + hi) / 2.0
    cam.location = cam.matrix_world @ Vector((mid.x, mid.y, 0.0))
    data.ortho_scale = max(hi.x - lo.x, hi.y - lo.y) / FILL


def render_item(item, png):
    scene.reset()
    objects = BUILDERS[item](random.Random(f"{SEED}-{item}"))
    print(f"{item} triangles: {scene.triangle_count(objects)}")
    _setup_stage()
    _fit_camera(objects)
    scn = bpy.context.scene
    Path(png).parent.mkdir(parents=True, exist_ok=True)
    scn.render.filepath = str(Path(png).resolve())
    bpy.ops.render.render(write_still=True)


# --------------------------------------------------------------------------- контактный лист

PANEL = (0.07, 0.075, 0.09)       # тёмный фон листа
SLOT = (0.13, 0.13, 0.15)         # ячейка крупного ряда
SLOT_EDGE = (0.27, 0.25, 0.22)
WORLD = (0.20, 0.19, 0.17)        # «земля» под хотбаром
HOTBAR_DIM = 0.6                  # затемнение полупрозрачной панели хотбара
HOTBAR_SLOT = (0.3, 0.3, 0.3, 0.2)  # ячейка хотбара: светлая подложка (RGB, непрозрачность)
GAP = 12


def _load_rgba(path):
    """PNG → массив h × w × 4 (строки сверху вниз, значения как в файле)."""
    img = bpy.data.images.load(str(path), check_existing=False)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    bpy.data.images.remove(img)
    return np.flipud(px.reshape(h, w, 4))


def _over(canvas, y, x, icon):
    """Наложить иконку (прямая альфа) на холст в точке (y, x) — левый верхний угол."""
    h, w = icon.shape[:2]
    a = icon[..., 3:4]
    region = canvas[y:y + h, x:x + w]
    region[:] = icon[..., :3] * a + region * (1.0 - a)


def _half(icon):
    """Уменьшение вдвое усреднением 2 × 2 в предумноженной альфе."""
    pm = np.concatenate([icon[..., :3] * icon[..., 3:4], icon[..., 3:4]], axis=-1)
    h, w = pm.shape[:2]
    pm = pm.reshape(h // 2, 2, w // 2, 2, 4).mean(axis=(1, 3))
    a = pm[..., 3:4]
    rgb = np.divide(pm[..., :3], a, out=np.zeros_like(pm[..., :3]), where=a > 0)
    return np.concatenate([rgb, a], axis=-1)


def render_sheet(out_dir, png):
    scene.reset()
    icons = [_load_rgba(Path(out_dir) / f"{item}.png") for item in ITEMS]
    big, small = SIZE + 16, SIZE // 2 + 8
    width = GAP + len(ITEMS) * (big + GAP)
    bar_w = len(ITEMS) * small + (len(ITEMS) - 1) * 4 + 16
    height = GAP + big + 2 * GAP + small + 16 + GAP
    canvas = np.empty((height, width, 3), dtype=np.float32)
    canvas[:] = PANEL

    # ряд 1: иконки в натуральную величину в ячейках с рамкой
    for i, icon in enumerate(icons):
        x, y = GAP + i * (big + GAP), GAP
        canvas[y:y + big, x:x + big] = SLOT_EDGE
        canvas[y + 2:y + big - 2, x + 2:x + big - 2] = SLOT
        _over(canvas, y + 8, x + 8, icon)

    # ряд 2: хотбар — полупрозрачная тёмная панель поверх «земли», иконки 64 px
    y0 = GAP + big + 2 * GAP
    x0 = (width - bar_w) // 2
    canvas[y0 - GAP:height, :] = WORLD
    canvas[y0:y0 + small + 16, x0:x0 + bar_w] *= 1.0 - HOTBAR_DIM
    for i, icon in enumerate(icons):
        x, y = x0 + 8 + i * (small + 4), y0 + 8
        slot = canvas[y:y + small, x:x + small]
        slot[:] = slot * (1.0 - HOTBAR_SLOT[3]) + np.array(HOTBAR_SLOT[:3]) * HOTBAR_SLOT[3]
        _over(canvas, y + 4, x + 4, _half(icon))

    img = bpy.data.images.new("item_icons_sheet", width, height, alpha=False)
    rgba = np.concatenate([np.flipud(canvas), np.ones((height, width, 1), np.float32)], axis=-1)
    img.pixels.foreach_set(np.clip(rgba, 0.0, 1.0).ravel())
    Path(png).parent.mkdir(parents=True, exist_ok=True)
    img.filepath_raw = str(Path(png).resolve())
    img.file_format = "PNG"
    img.save()
    print(f"item icons sheet: wrote {png}")


# --------------------------------------------------------------------------- сборка

def build(out_dir):
    for item in ITEMS:
        render_item(item, Path(out_dir) / f"{item}.png")


if __name__ == "__main__":
    args = sys.argv[1:]
    sheet = None
    if len(args) == 3 and args[1] == "--sheet":
        sheet = args[2]
        args = args[:1]
    if len(args) != 1:
        sys.exit("usage: build_item_icons.py <out_dir> [--sheet <png>]")
    build(args[0])
    if sheet:
        render_sheet(args[0], sheet)
