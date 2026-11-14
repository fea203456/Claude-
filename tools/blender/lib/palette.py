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
    "roof_thatch": (0.431, 0.404, 0.341),   # старая посеревшая солома кровли
    "soil_tilled": (0.72, 0.70, 0.68),      # вспаханная земля: нейтральная, цвет умножает игра
    "highlight_pale": (0.85, 0.83, 0.74),   # бледная подсветка выбранной клетки
    "soil_bank": (0.290, 0.259, 0.227),     # утоптанная земля межи
    "stone_old": (0.420, 0.404, 0.373),     # старый серый камень
    "stone_dark": (0.298, 0.290, 0.271),    # тёмный, отсыревший камень
    "wood_weathered": (0.400, 0.373, 0.337),  # выбеленное непогодой дерево
    "water_dark": (0.055, 0.071, 0.078),    # тёмная вода в глубине колодца
    "leaf_silver": (0.650, 0.690, 0.650),   # бледный серебристо-шалфейный лист серебрянки
    "silver_ripe": (0.860, 0.880, 0.890),   # холодное серебро спелой серебрянки
    "leaf_dark": (0.200, 0.235, 0.180),     # тёмный острый лист костяного корня
    "root_flesh": (0.540, 0.500, 0.445),    # серая молодая макушка корня
    "bone_white": (0.820, 0.785, 0.690),    # костяно-белая макушка спелого корня
    "stem_dark": (0.150, 0.130, 0.170),     # чёрно-лиловый стебель ночецвета
    "leaf_dusk": (0.380, 0.420, 0.430),     # сизый лист ночецвета
    "bloom_violet": (0.470, 0.200, 0.640),  # насыщенный фиолетовый цветок ночецвета
    "silver_blue": (0.620, 0.720, 0.840),   # бледное серебристо-голубое — метка серебрянки
    "sack_burlap": (0.500, 0.420, 0.320),   # грубая мешковина мешочка семян
    "iron_dark": (0.240, 0.240, 0.250),     # тёмное кованое железо: обручи, втулки
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
