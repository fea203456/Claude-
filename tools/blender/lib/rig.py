"""Гуманоидный скелет из 18 костей, жёсткая привязка сеток и ключи поз.

Система координат Blender: +Z вверх, персонаж смотрит по −Y, левая сторона — +X.
Ролл всех костей выставлен так, что их локальная ось X совпадает с мировой +X:
наклоны вперёд/назад — повороты вокруг X, одинаково для всех костей.
"""
import bpy
from mathutils import Quaternion, Vector

REF_HEIGHT = 1.75

# Точки суставов для роста 1.75 м: слегка сутулый, уставший силуэт —
# грудь и шея вынесены вперёд, руки висят чуть впереди корпуса.
_JOINTS_175 = {
    "root": (0.0, 0.0, 0.0),
    "root_tip": (0.0, -0.25, 0.0),
    "pelvis": (0.0, 0.0, 0.93),
    "spine_base": (0.0, 0.0, 1.02),
    "chest_base": (0.0, 0.022, 1.172),
    "neck_base": (0.0, -0.066, 1.392),
    "head_base": (0.0, -0.128, 1.498),
    "head_top": (0.0, -0.128, 1.698),
    "shoulder.L": (0.163, -0.050, 1.362),
    "elbow.L": (0.196, -0.036, 1.100),
    "wrist.L": (0.204, -0.098, 0.872),
    "fingers.L": (0.200, -0.124, 0.712),
    "hip.L": (0.092, 0.0, 0.905),
    "knee.L": (0.090, -0.006, 0.485),
    "ankle.L": (0.090, 0.006, 0.085),
    "ball.L": (0.092, -0.118, 0.022),
}

# (кость, сустав-начало, сустав-конец, родитель, соединена с родителем)
BONES = [
    ("root", "root", "root_tip", None, False),
    ("hips", "pelvis", "spine_base", "root", False),
    ("spine", "spine_base", "chest_base", "hips", True),
    ("chest", "chest_base", "neck_base", "spine", True),
    ("neck", "neck_base", "head_base", "chest", True),
    ("head", "head_base", "head_top", "neck", True),
]
for _s in ("L", "R"):
    BONES += [
        (f"upper_arm.{_s}", f"shoulder.{_s}", f"elbow.{_s}", "chest", False),
        (f"forearm.{_s}", f"elbow.{_s}", f"wrist.{_s}", f"upper_arm.{_s}", True),
        (f"hand.{_s}", f"wrist.{_s}", f"fingers.{_s}", f"forearm.{_s}", True),
        (f"thigh.{_s}", f"hip.{_s}", f"knee.{_s}", "hips", False),
        (f"shin.{_s}", f"knee.{_s}", f"ankle.{_s}", f"thigh.{_s}", True),
        (f"foot.{_s}", f"ankle.{_s}", f"ball.{_s}", f"shin.{_s}", True),
    ]
BONE_NAMES = [b[0] for b in BONES]


def joint_positions(height: float) -> dict[str, Vector]:
    """Суставы скелета для заданного роста; правая сторона — зеркало левой по X."""
    k = height / REF_HEIGHT
    out = {}
    for name, (x, y, z) in _JOINTS_175.items():
        out[name] = Vector((x, y, z)) * k
        if name.endswith(".L"):
            out[name[:-2] + ".R"] = Vector((-x, y, z)) * k
    return out


def build_humanoid(height: float) -> bpy.types.Object:
    """Арматура `Armature` с костями BONE_NAMES; позы в кватернионах."""
    joints = joint_positions(height)
    data = bpy.data.armatures.new("Armature")
    obj = bpy.data.objects.new("Armature", data)
    bpy.context.scene.collection.objects.link(obj)
    view_layer = bpy.context.view_layer
    view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.mode_set(mode="EDIT")
    edit = data.edit_bones
    for name, head, tail, parent, connect in BONES:
        eb = edit.new(name)
        eb.head = joints[head]
        eb.tail = joints[tail]
        eb.align_roll(Vector((1.0, 0.0, 0.0)).cross(eb.tail - eb.head))
        if parent:
            eb.parent = edit[parent]
            eb.use_connect = connect
    bpy.ops.object.mode_set(mode="OBJECT")
    for pb in obj.pose.bones:
        pb.rotation_mode = "QUATERNION"
    return obj


def attach_rigid(mesh, armature, bone_name) -> None:
    """Вся сетка — в одной группе вершин `bone_name` с весом 1 (жёсткая привязка)."""
    if bone_name not in armature.data.bones:
        raise KeyError(f"no bone {bone_name!r}")
    mesh.vertex_groups.clear()
    group = mesh.vertex_groups.new(name=bone_name)
    group.add(range(len(mesh.data.vertices)), 1.0, "REPLACE")
    mod = next((m for m in mesh.modifiers if m.type == "ARMATURE"), None)
    if mod is None:
        mod = mesh.modifiers.new("Armature", "ARMATURE")
    mod.object = armature
    world = mesh.matrix_world.copy()
    mesh.parent = armature
    mesh.matrix_parent_inverse = armature.matrix_world.inverted()
    mesh.matrix_world = world


def key_pose(armature, frame, local=None, world=None, offsets=None) -> None:
    """Ключ позы на кадре `frame` для всех костей.

    Повороты задаются в мировых осях (поза покоя: X — вбок, Y — назад, Z — вверх):
    `local[bone]` — поворот относительно родителя, `world[bone]` — абсолютный поворот
    кости относительно её позы покоя (родитель компенсируется). `offsets[bone]` —
    смещение кости в мировых осях. Кости без значений получают покой.
    """
    local, world, offsets = local or {}, world or {}, offsets or {}
    deltas = {}
    for name, _head, _tail, parent, _connect in BONES:
        rest = armature.data.bones[name].matrix_local.to_quaternion()
        d_parent = deltas.get(parent, Quaternion())
        delta = world.get(name)
        if delta is None:
            delta = d_parent @ local.get(name, Quaternion())
        deltas[name] = delta
        q = rest.inverted() @ d_parent.inverted() @ delta @ rest
        q.normalize()
        if q.w < 0.0:
            q.negate()
        pb = armature.pose.bones[name]
        pb.rotation_quaternion = q
        pb.keyframe_insert("rotation_quaternion", frame=frame, group=name)
        if name in offsets or name == "hips":
            off = Vector(offsets.get(name, (0.0, 0.0, 0.0)))
            pb.location = rest.inverted() @ (d_parent.inverted() @ off)
            pb.keyframe_insert("location", frame=frame, group=name)
