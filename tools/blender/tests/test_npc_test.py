"""Тесты тестового жителя: собираем build_npc_test.py во временный .glb и импортируем обратно."""
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
BLENDER_DIR = ROOT / "tools" / "blender"
BLENDER_SH = ROOT / "tools" / "blender.sh"
BUILD = BLENDER_DIR / "build_npc_test.py"
sys.path.insert(0, str(BLENDER_DIR))

BONES = [
    "root", "hips", "spine", "chest", "neck", "head",
    "upper_arm.L", "upper_arm.R", "forearm.L", "forearm.R", "hand.L", "hand.R",
    "thigh.L", "thigh.R", "shin.L", "shin.R", "foot.L", "foot.R",
]
REQUIRED_PALETTE = [
    "skin_pale", "cloth_ash", "cloth_rust", "leather_dark",
    "hair_soot", "metal_dull", "wood_old", "ground_ash",
]


def _build(out: Path) -> Path:
    res = subprocess.run(
        [str(BLENDER_SH), str(BUILD), str(out)],
        capture_output=True, text=True, timeout=600,
    )
    assert res.returncode == 0, f"build failed:\n{res.stdout}\n{res.stderr}"
    assert out.is_file(), "build produced no .glb"
    return out


def _import(path: Path):
    import bpy
    from lib import scene

    scene.reset()
    bpy.ops.import_scene.gltf(filepath=str(path), disable_bone_shape=True)
    return bpy


def _meshes(bpy):
    return [o for o in bpy.data.objects if o.type == "MESH"]


def _fcurves(action):
    """F-кривые действия: слоистые действия Blender 4.4+/5.x и старый API."""
    curves = list(getattr(action, "fcurves", None) or [])
    for layer in getattr(action, "layers", []):
        for strip in layer.strips:
            for bag in strip.channelbags:
                curves.extend(bag.fcurves)
    return curves


def _action(bpy, prefix):
    found = [a for a in bpy.data.actions if a.name.startswith(prefix)]
    assert found, f"no action starting with {prefix!r}: {[a.name for a in bpy.data.actions]}"
    return found[0]


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    return _build(tmp_path_factory.mktemp("npc") / "npc_test.glb")


@pytest.fixture
def imported(built):
    return _import(built)


def test_has_armature_and_bones(imported):
    arms = [o for o in imported.data.objects if o.type == "ARMATURE"]
    assert len(arms) == 1
    names = {b.name for b in arms[0].data.bones}
    assert set(BONES) <= names, f"missing bones: {set(BONES) - names}"


def test_actions(imported):
    idle = _action(imported, "Idle")
    walk = _action(imported, "Walk")
    assert idle.frame_range[1] - idle.frame_range[0] == pytest.approx(48)
    assert walk.frame_range[1] - walk.frame_range[0] == pytest.approx(24)


def test_walk_loop_seamless(imported):
    walk = _action(imported, "Walk")
    start = walk.frame_range[0]
    per_bone = {}
    for fc in _fcurves(walk):
        if not fc.data_path.endswith("rotation_quaternion"):
            continue
        bone = re.search(r'pose\.bones\["([^"]+)"\]', fc.data_path).group(1)
        per_bone.setdefault(bone, {})[fc.array_index] = fc
    for must in ("thigh.L", "thigh.R", "shin.L", "shin.R", "upper_arm.L", "upper_arm.R"):
        assert must in per_bone, f"{must} not animated in Walk"
    for bone, curves in per_bone.items():
        for idx, fc in curves.items():
            a, b = fc.evaluate(start), fc.evaluate(start + 24)
            assert abs(a - b) <= 1e-4, f"{bone}[{idx}]: frame0={a} frame24={b}"


def test_triangle_budget(imported):
    from lib.scene import triangle_count

    tris = triangle_count(_meshes(imported))
    assert 0 < tris <= 3000


def _world_z(bpy):
    zs = []
    for obj in _meshes(bpy):
        mw = obj.matrix_world
        zs.extend((mw @ v.co).z for v in obj.data.vertices)
    return zs


def test_height(imported):
    zs = _world_z(imported)
    assert max(zs) == pytest.approx(1.75, abs=0.05)
    assert min(zs) == pytest.approx(0.0, abs=0.02)


def test_palette_only(imported):
    from lib.palette import PALETTE

    assert set(REQUIRED_PALETTE) <= set(PALETTE)
    allowed = {f"pal_{k}" for k in PALETTE}
    mats = list(imported.data.materials)
    assert mats, "no materials"
    for mat in mats:
        assert mat.name in allowed, f"non-palette material {mat.name!r}"


def test_nose_in_front_of_head(imported):
    nose = imported.data.objects.get("Nose")
    assert nose is not None and nose.type == "MESH"
    arm = next(o for o in imported.data.objects if o.type == "ARMATURE")
    head = arm.matrix_world @ arm.data.bones["head"].head_local
    ys = [(nose.matrix_world @ v.co).y for v in nose.data.vertices]
    # персонаж смотрит по −Y: нос впереди кости головы
    assert sum(ys) / len(ys) < head.y
    names = {g.index: g.name for g in nose.vertex_groups}
    weighted = {names[g.group] for v in nose.data.vertices for g in v.groups if g.weight > 0}
    assert weighted == {"head"}


def _summary(bpy):
    from lib.scene import triangle_count

    return (
        len(bpy.data.objects),
        triangle_count(_meshes(bpy)),
        sorted(a.name for a in bpy.data.actions),
    )


def test_build_is_repeatable(built, tmp_path):
    first = _summary(_import(built))
    second = _summary(_import(_build(tmp_path / "again.glb")))
    assert first == second


def test_stride_property(imported):
    import build_npc_test as b

    arm = next(o for o in imported.data.objects if o.type == "ARMATURE")
    assert arm.get("stride_m") == pytest.approx(0.70)
    # В модель пишется шаг, с которым реально идёт походка (скорость земли / 2).
    assert arm.get("stride_m") == pytest.approx(b.Gait.SPEED * b.K / 2.0)
