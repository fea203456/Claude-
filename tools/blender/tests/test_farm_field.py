"""Тесты моделей поля: собираем build_farm_field.py во временную папку и импортируем glb обратно."""
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[3]
BLENDER_DIR = ROOT / "tools" / "blender"
BLENDER_SH = ROOT / "tools" / "blender.sh"
BUILD = BLENDER_DIR / "build_farm_field.py"
sys.path.insert(0, str(BLENDER_DIR))

MODELS = ["soil_tile", "cell_frame", "field_border", "well"]
STONES = {"pal_stone_old", "pal_stone_dark"}


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    out = tmp_path_factory.mktemp("farm")
    res = subprocess.run(
        [str(BLENDER_SH), str(BUILD), str(out)],
        capture_output=True, text=True, timeout=600,
    )
    assert res.returncode == 0, f"build failed:\n{res.stdout}\n{res.stderr}"
    paths = {name: out / name / f"{name}.glb" for name in MODELS}
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


def _world_verts(bpy, materials=None):
    """Вершины в мировых координатах; materials — только вершины граней этих материалов."""
    out = []
    for obj in _meshes(bpy):
        mw = obj.matrix_world
        me = obj.data
        if materials is None:
            out.extend(mw @ v.co for v in me.vertices)
            continue
        idx = set()
        for p in me.polygons:
            mat = me.materials[p.material_index]
            if mat is not None and mat.name in materials:
                idx.update(p.vertices)
        out.extend(mw @ me.vertices[i].co for i in idx)
    return out


def _bbox(vs):
    assert vs, "no mesh vertices"
    lo = [min(v[i] for v in vs) for i in range(3)]
    hi = [max(v[i] for v in vs) for i in range(3)]
    return lo, hi


def test_soil_tile_size(built):
    bpy = _import(built["soil_tile"])
    lo, hi = _bbox(_world_verts(bpy))
    for axis in (0, 1):
        assert 0.96 <= hi[axis] - lo[axis] <= 1.0, f"axis {axis}: {hi[axis] - lo[axis]:.3f}"
        assert hi[axis] + lo[axis] == pytest.approx(0.0, abs=0.02)
    assert lo[2] == pytest.approx(0.0, abs=0.005)
    assert 0.05 <= hi[2] <= 0.12, f"height {hi[2]:.3f}"
    names = [m.name for m in bpy.data.materials]
    assert names == ["pal_soil_tilled"], f"materials {names}"


def test_cell_frame_flat(built):
    bpy = _import(built["cell_frame"])
    vs = _world_verts(bpy)
    lo, hi = _bbox(vs)
    for axis in (0, 1):
        assert hi[axis] - lo[axis] == pytest.approx(1.0, abs=0.01)
    assert lo[2] == pytest.approx(0.0, abs=0.005)
    assert hi[2] - lo[2] <= 0.03, f"height {hi[2] - lo[2]:.3f}"
    # ширина линии: внутренний край рамки на 0.04…0.08 от внешнего, середина пустая
    inner = min(max(abs(v.x), abs(v.y)) for v in vs)
    assert 0.5 - 0.08 <= inner <= 0.5 - 0.04, f"inner half-size {inner:.3f}"
    assert [m.name for m in bpy.data.materials] == ["pal_highlight_pale"]


def test_border_opening(built):
    bpy = _import(built["field_border"])
    vs = _world_verts(bpy)
    inside = [v for v in vs if abs(v.x) < 5.99 and abs(v.y) < 3.99]
    assert not inside, f"{len(inside)} vertices inside the field, e.g. {tuple(inside[0])}"
    lo, hi = _bbox(vs)
    assert 12.0 < hi[0] - lo[0] <= 12.8, f"width {hi[0] - lo[0]:.3f}"
    assert 8.0 < hi[1] - lo[1] <= 8.8, f"depth {hi[1] - lo[1]:.3f}"
    assert hi[0] + lo[0] == pytest.approx(0.0, abs=0.05)
    assert hi[1] + lo[1] == pytest.approx(0.0, abs=0.05)
    assert lo[2] == pytest.approx(0.0, abs=0.01)
    assert 0.08 <= hi[2] <= 0.2, f"height {hi[2]:.3f}"


def test_well_size(built):
    bpy = _import(built["well"])
    lo, hi = _bbox(_world_verts(bpy))
    assert lo[2] == pytest.approx(0.0, abs=0.01)
    assert 2.2 <= hi[2] <= 2.8, f"total height {hi[2]:.3f}"
    slo, shi = _bbox(_world_verts(bpy, STONES))
    for axis in (0, 1):
        assert 1.4 <= shi[axis] - slo[axis] <= 1.8, f"ring axis {axis}: {shi[axis] - slo[axis]:.3f}"
        assert shi[axis] + slo[axis] == pytest.approx(0.0, abs=0.05)
    assert 0.8 <= shi[2] <= 1.0, f"wall height {shi[2]:.3f}"
    assert slo[2] == pytest.approx(0.0, abs=0.01)


def test_budgets(built):
    from lib.scene import triangle_count

    limits = {"soil_tile": 120, "cell_frame": 60, "field_border": 1500, "well": 1200}
    for name, limit in limits.items():
        tris = triangle_count(_meshes(_import(built[name])))
        assert 0 < tris <= limit, f"{name}: {tris} triangles"


@pytest.mark.parametrize("model", MODELS)
def test_palette_only(built, model):
    from lib.palette import PALETTE

    assert "soil_tilled" in PALETTE and "highlight_pale" in PALETTE
    bpy = _import(built[model])
    allowed = {f"pal_{k}" for k in PALETTE}
    mats = list(bpy.data.materials)
    assert mats, "no materials"
    for mat in mats:
        assert mat.name in allowed, f"non-palette material {mat.name!r}"
