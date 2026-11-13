"""Тесты пропов фермы: собираем build_props_farm.py во временную папку и импортируем glb обратно."""
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
BLENDER_DIR = ROOT / "tools" / "blender"
BLENDER_SH = ROOT / "tools" / "blender.sh"
BUILD = BLENDER_DIR / "build_props_farm.py"
sys.path.insert(0, str(BLENDER_DIR))


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    out = tmp_path_factory.mktemp("props")
    res = subprocess.run(
        [str(BLENDER_SH), str(BUILD), str(out)],
        capture_output=True, text=True, timeout=600,
    )
    assert res.returncode == 0, f"build failed:\n{res.stdout}\n{res.stderr}"
    paths = {
        "house": out / "house_stub" / "house_stub.glb",
        "bed": out / "bed" / "bed.glb",
    }
    for name, p in paths.items():
        assert p.is_file(), f"build produced no {name} glb at {p}"
    return paths


def _import(path: Path):
    import bpy
    from lib import scene

    scene.reset()
    bpy.ops.import_scene.gltf(filepath=str(path), disable_bone_shape=True)
    return bpy


def _meshes(bpy):
    return [o for o in bpy.data.objects if o.type == "MESH"]


def _world_verts(bpy):
    out = []
    for obj in _meshes(bpy):
        mw = obj.matrix_world
        out.extend(mw @ v.co for v in obj.data.vertices)
    return out


def _bbox(bpy):
    vs = _world_verts(bpy)
    assert vs, "no mesh vertices"
    lo = [min(v[i] for v in vs) for i in range(3)]
    hi = [max(v[i] for v in vs) for i in range(3)]
    return lo, hi


def _bvh(bpy):
    from mathutils.bvhtree import BVHTree

    verts, polys = [], []
    for obj in _meshes(bpy):
        mw = obj.matrix_world
        base = len(verts)
        verts.extend(mw @ v.co for v in obj.data.vertices)
        polys.extend([base + i for i in p.vertices] for p in obj.data.polygons)
    return BVHTree.FromPolygons(verts, polys)


def test_house_size(built):
    bpy = _import(built["house"])
    lo, hi = _bbox(bpy)
    assert hi[0] - lo[0] == pytest.approx(6.0, abs=0.1)
    assert hi[1] - lo[1] == pytest.approx(5.0, abs=0.1)
    assert lo[2] == pytest.approx(0.0, abs=0.02)
    assert 3.4 <= hi[2] <= 4.5, f"ridge height {hi[2]:.3f}"


def test_doorway_open(built):
    from mathutils import Vector

    bpy = _import(built["house"])
    tree = _bvh(bpy)
    into = Vector((0.0, 1.0, 0.0))  # дверь в стене −Y, луч снаружи внутрь
    _, _, _, door = tree.ray_cast(Vector((0.0, -3.0, 1.0)), into, 20.0)
    assert door is None or door > 2.5, f"doorway blocked at {door:.3f} m"
    _, _, _, wall = tree.ray_cast(Vector((-1.0, -3.0, 1.0)), into, 20.0)
    assert wall is not None and wall < 0.6, f"front wall hit at {wall}"


def test_bed_size(built):
    bpy = _import(built["bed"])
    lo, hi = _bbox(bpy)
    assert hi[0] - lo[0] == pytest.approx(2.0, abs=0.05)
    assert hi[1] - lo[1] == pytest.approx(0.9, abs=0.05)
    assert hi[2] - lo[2] == pytest.approx(0.5, abs=0.05)
    assert lo[2] == pytest.approx(0.0, abs=0.02)


def test_budgets(built):
    from lib.scene import triangle_count

    house = triangle_count(_meshes(_import(built["house"])))
    assert 0 < house <= 2000, f"house: {house} triangles"
    bed = triangle_count(_meshes(_import(built["bed"])))
    assert 0 < bed <= 400, f"bed: {bed} triangles"


@pytest.mark.parametrize("prop", ["house", "bed"])
def test_palette_only(built, prop):
    from lib.palette import PALETTE

    assert "roof_thatch" in PALETTE
    bpy = _import(built[prop])
    allowed = {f"pal_{k}" for k in PALETTE}
    mats = list(bpy.data.materials)
    assert mats, "no materials"
    for mat in mats:
        assert mat.name in allowed, f"non-palette material {mat.name!r}"
