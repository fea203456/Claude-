"""Сцена Blender: сброс, экспорт .glb, подсчёт треугольников."""
import os

import bpy

FPS = 24


def reset() -> None:
    """Пустая сцена с заводскими настройками, 24 кадра/с."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.fps = FPS
    scn.render.fps_base = 1.0
    scn.frame_start = 0
    scn.frame_set(0)


def export_glb(path: str, objects: list) -> None:
    """Экспорт только переданных объектов и их действий (каждое действие — анимация)."""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    view_layer = bpy.context.view_layer
    for obj in view_layer.objects:
        obj.select_set(False)
    for obj in objects:
        obj.select_set(True)
    view_layer.objects.active = objects[0]
    bpy.ops.export_scene.gltf(
        filepath=path,
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=False,
        export_extras=True,
        export_materials="EXPORT",
        export_skins=True,
        export_def_bones=False,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_frame_range=False,
        export_reset_pose_bones=True,
        export_anim_slide_to_zero=False,
        export_optimize_animation_size=False,
        export_morph=False,
        export_lights=False,
        export_cameras=False,
    )


def triangle_count(objects) -> int:
    """Сумма треугольников после триангуляции полигонов (n-угольник = n-2)."""
    total = 0
    for obj in objects:
        if obj.type != "MESH":
            continue
        total += sum(len(p.vertices) - 2 for p in obj.data.polygons)
    return total
