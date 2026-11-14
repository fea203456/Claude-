"""Тесты моделей культур: собираем build_crops.py во временную папку и импортируем glb обратно."""
import itertools
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
BLENDER_DIR = ROOT / "tools" / "blender"
BLENDER_SH = ROOT / "tools" / "blender.sh"
BUILD = BLENDER_DIR / "build_crops.py"
sys.path.insert(0, str(BLENDER_DIR))

CROPS = ["silverleaf", "boneroot", "nightbloom"]
STAGES = range(4)
MODELS = [(c, s) for c in CROPS for s in STAGES]
RIPE_HEIGHT = {"silverleaf": (0.25, 0.45), "boneroot": (0.35, 0.6), "nightbloom": (0.7, 1.1)}


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    out = tmp_path_factory.mktemp("crops")
    res = subprocess.run(
        [str(BLENDER_SH), str(BUILD), str(out)],
        capture_output=True, text=True, timeout=600,
    )
    assert res.returncode == 0, f"build failed:\n{res.stdout}\n{res.stderr}"
    return {(c, s): out / c / f"{c}_s{s}.glb" for c, s in MODELS}


def _import(path: Path):
    import bpy
    from lib import scene

    scene.reset()
    bpy.ops.import_scene.gltf(filepath=str(path), disable_bone_shape=True)
    return bpy


def _meshes(bpy):
    return [o for o in bpy.data.objects if o.type == "MESH"]


def _bbox(bpy):
    vs = [o.matrix_world @ v.co for o in _meshes(bpy) for v in o.data.vertices]
    assert vs, "no mesh vertices"
    lo = [min(v[i] for v in vs) for i in range(3)]
    hi = [max(v[i] for v in vs) for i in range(3)]
    return lo, hi


def _used_materials(bpy):
    """Материалы, на которых реально есть грани."""
    out = set()
    for obj in _meshes(bpy):
        me = obj.data
        for p in me.polygons:
            mat = me.materials[p.material_index]
            if mat is not None:
                out.add(mat.name)
    return out


@pytest.fixture(scope="module")
def heights(built):
    return {key: _bbox(_import(path))[1][2] for key, path in built.items()}


def test_all_12_exist(built):
    missing = [str(p) for p in built.values() if not p.is_file()]
    assert not missing, f"missing glb: {missing}"
    assert len(built) == 12


@pytest.mark.parametrize("crop,stage", MODELS)
def test_footprint(built, crop, stage):
    lo, hi = _bbox(_import(built[(crop, stage)]))
    for axis in (0, 1):
        assert hi[axis] - lo[axis] <= 0.9, f"axis {axis}: {hi[axis] - lo[axis]:.3f}"
        assert -0.45 <= lo[axis] and hi[axis] <= 0.45, f"axis {axis}: {lo[axis]:.3f}…{hi[axis]:.3f}"
    # начало координат — центр основания на земле
    assert lo[2] == pytest.approx(0.0, abs=0.01), f"bottom {lo[2]:.3f}"


@pytest.mark.parametrize("crop", CROPS)
def test_heights_grow(heights, crop):
    h = [heights[(crop, s)] for s in STAGES]
    assert h[0] >= 0.05, f"s0 {h[0]:.3f}"
    assert h[0] < h[1] < h[2] <= h[3], f"heights {[round(x, 3) for x in h]}"
    lo, hi = RIPE_HEIGHT[crop]
    assert lo <= h[3] <= hi, f"ripe {h[3]:.3f} not in {lo}…{hi}"


@pytest.mark.parametrize("crop", CROPS)
def test_ripe_has_new_material(built, crop):
    grown = _used_materials(_import(built[(crop, 2)]))
    ripe = _used_materials(_import(built[(crop, 3)]))
    assert ripe - grown, f"ripe materials {sorted(ripe)} add nothing to grown {sorted(grown)}"


@pytest.mark.parametrize("crop,stage", MODELS)
def test_budgets(built, crop, stage):
    from lib.scene import triangle_count

    tris = triangle_count(_meshes(_import(built[(crop, stage)])))
    assert 0 < tris <= 600, f"{crop}_s{stage}: {tris} triangles"


@pytest.mark.parametrize("crop,stage", MODELS)
def test_palette_only(built, crop, stage):
    from lib.palette import PALETTE

    bpy = _import(built[(crop, stage)])
    allowed = {f"pal_{k}" for k in PALETTE}
    mats = list(bpy.data.materials)
    assert mats, "no materials"
    for mat in mats:
        assert mat.name in allowed, f"non-palette material {mat.name!r}"


def test_crops_differ(heights):
    for a, b in itertools.combinations(CROPS, 2):
        ha, hb = heights[(a, 3)], heights[(b, 3)]
        assert abs(ha - hb) >= 0.1, f"ripe {a} {ha:.3f} vs {b} {hb:.3f}"
