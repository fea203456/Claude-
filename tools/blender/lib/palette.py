"""Общая палитра проекта: плоские материалы без текстур.

Цвета заданы в sRGB (0..1, как hex в редакторе), материалы получают их в линейном
пространстве. Godot-сцены берут те же значения (например, ground_ash ≈ #3a3632).
"""
import bpy

PALETTE: dict[str, tuple[float, float, float]] = {
    "skin_pale": (0.741, 0.655, 0.580),     # бледная, сероватая кожа
    "skin_shadow": (0.560, 0.450, 0.400),   # губы, внутренняя часть ушей
    "cloth_ash": (0.545, 0.525, 0.478),     # небелёный пепельный лён
    "cloth_rust": (0.455, 0.290, 0.204),    # выцветшая ржавая шерсть
    "leather_dark": (0.235, 0.173, 0.137),  # старая тёмная кожа
    "hair_soot": (0.145, 0.129, 0.118),     # волосы цвета сажи
    "metal_dull": (0.420, 0.416, 0.400),    # тусклое железо
    "wood_old": (0.353, 0.290, 0.227),      # потемневшее дерево
    "ground_ash": (0.227, 0.212, 0.196),    # пепельная земля #3a3632
}

ROUGHNESS = 0.85


def _to_linear(c: float) -> float:
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def material(name: str) -> bpy.types.Material:
    """Материал палитры `pal_<name>`; повторный вызов возвращает уже созданный."""
    if name not in PALETTE:
        raise KeyError(f"color {name!r} is not in PALETTE")
    mat_name = f"pal_{name}"
    mat = bpy.data.materials.get(mat_name)
    if mat is not None:
        return mat
    rgba = (*(_to_linear(c) for c in PALETTE[name]), 1.0)
    mat = bpy.data.materials.new(mat_name)
    mat.diffuse_color = rgba
    mat.roughness = ROUGHNESS
    mat.metallic = 0.0
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    bsdf.inputs["Base Color"].default_value = rgba
    bsdf.inputs["Roughness"].default_value = ROUGHNESS
    bsdf.inputs["Metallic"].default_value = 0.0
    return mat
