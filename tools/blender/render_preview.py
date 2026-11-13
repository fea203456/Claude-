"""render_preview.py <glb> <out.png> — превью-лист персонажа: Cycles, 64 сэмпла, 1024×1024.

Модель импортируется трижды и ставится в ряд: спереди, 3/4 и сбоку (поза — кадр 0 Idle).
Камера ортографическая, смотрит по +Y (модели в Blender смотрят по −Y, т. е. в камеру).
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import bpy  # noqa: E402
from mathutils import Vector  # noqa: E402

from lib import palette, scene  # noqa: E402

RES = 1024
SAMPLES = 64
SPACING = 1.05                      # м между фигурами
VIEWS = [("front", 0.0), ("three_quarter", 45.0), ("side", 90.0)]  # поворот вокруг Z, град


def import_copy(glb: str, name: str, x: float, yaw_deg: float) -> bpy.types.Object:
    """Импортирует glb, вешает корни на пустышку и ставит её в (x, 0, 0) с поворотом."""
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=glb, disable_bone_shape=True)
    new = [o for o in bpy.data.objects if o not in before]
    pivot = bpy.data.objects.new(f"view_{name}", None)
    bpy.context.scene.collection.objects.link(pivot)
    for o in new:
        if o.parent is None:
            o.parent = pivot
        if o.type == "ARMATURE":
            idle = next((a for a in bpy.data.actions if a.name.startswith("Idle")), None)
            if idle is not None:
                o.animation_data_create()
                o.animation_data.action = idle
    pivot.location = (x, 0.0, 0.0)
    pivot.rotation_euler = (0.0, 0.0, math.radians(yaw_deg))
    return pivot


def emission_world(color, strength) -> None:
    world = bpy.data.worlds.new("preview_world")
    bg = world.node_tree.nodes["Background"]
    bg.inputs["Color"].default_value = (*color, 1.0)
    bg.inputs["Strength"].default_value = strength
    bpy.context.scene.world = world


def add_light(name, kind, energy, color, loc, rot_deg, size=1.0):
    data = bpy.data.lights.new(name, kind)
    data.energy = energy
    data.color = color
    if kind == "AREA":
        data.size = size
    else:
        data.angle = math.radians(3.0)
    obj = bpy.data.objects.new(name, data)
    obj.location = loc
    obj.rotation_euler = tuple(math.radians(a) for a in rot_deg)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def look_at(obj, target) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def main(glb: str, out: str) -> None:
    scene.reset()
    scn = bpy.context.scene

    for i, (name, yaw) in enumerate(VIEWS):
        import_copy(glb, name, (i - 1) * SPACING, yaw)
    scn.frame_set(0)

    # Пол из палитры (пепельная земля) — чтобы видна была контактная тень.
    bpy.ops.mesh.primitive_plane_add(size=30.0, location=(0.0, 0.0, 0.0))
    floor = bpy.context.active_object
    floor.data.materials.append(palette.material("ground_ash"))

    # Сумеречный свет: тёплый низкий ключ слева-спереди, холодная заливка справа, тёмное небо.
    emission_world((0.05, 0.06, 0.08), 1.0)
    add_light("key", "SUN", 3.5, (1.0, 0.72, 0.48), (0, 0, 10), (62.0, 0.0, -35.0))
    fill = add_light("fill", "AREA", 250.0, (0.55, 0.65, 0.85), (5.0, -5.0, 3.0), (0, 0, 0), size=4.0)
    look_at(fill, (0.0, 0.0, 1.0))
    rim = add_light("rim", "AREA", 200.0, (0.7, 0.78, 0.95), (-3.0, 5.0, 3.5), (0, 0, 0), size=3.0)
    look_at(rim, (0.0, 0.0, 1.2))

    cam_data = bpy.data.cameras.new("preview_cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 3.25
    cam = bpy.data.objects.new("preview_cam", cam_data)
    cam.location = (0.0, -12.0, 1.9)
    look_at(cam, (0.0, 0.0, 0.95))
    scn.collection.objects.link(cam)
    scn.camera = cam

    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = SAMPLES
    scn.cycles.use_adaptive_sampling = False
    try:
        scn.cycles.use_denoising = True
        scn.cycles.denoiser = "OPENIMAGEDENOISE"
    except (AttributeError, TypeError):
        scn.cycles.use_denoising = False
    scn.render.resolution_x = RES
    scn.render.resolution_y = RES
    scn.render.resolution_percentage = 100
    scn.render.film_transparent = False
    scn.view_settings.view_transform = "AgX"
    scn.render.image_settings.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGB"

    Path(out).parent.mkdir(parents=True, exist_ok=True)
    scn.render.filepath = str(Path(out).resolve())
    bpy.ops.render.render(write_still=True)
    print(f"render_preview: wrote {out}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit("usage: render_preview.py <glb> <out.png>")
    main(sys.argv[1], sys.argv[2])
