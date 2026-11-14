"""Тесты иконок предметов: собираем build_item_icons.py во временную папку и читаем PNG через bpy."""
import itertools
import subprocess
import sys
from pathlib import Path

import numpy as np
import pytest

ROOT = Path(__file__).resolve().parents[3]
BLENDER_DIR = ROOT / "tools" / "blender"
BLENDER_SH = ROOT / "tools" / "blender.sh"
BUILD = BLENDER_DIR / "build_item_icons.py"
sys.path.insert(0, str(BLENDER_DIR))

ITEMS = ["hoe", "watering_can", "seed_silverleaf", "seed_boneroot", "seed_nightbloom",
         "silverleaf", "boneroot", "nightbloom"]
SEEDS = ["seed_silverleaf", "seed_boneroot", "seed_nightbloom"]
SIZE = 128
OPAQUE = 0.5            # пиксель «непрозрачный», если alpha выше


@pytest.fixture(scope="module")
def built(tmp_path_factory):
    out = tmp_path_factory.mktemp("items")
    res = subprocess.run(
        [str(BLENDER_SH), str(BUILD), str(out)],
        capture_output=True, text=True, timeout=600,
    )
    assert res.returncode == 0, f"build failed:\n{res.stdout}\n{res.stderr}"
    return {i: out / f"{i}.png" for i in ITEMS}


def _load(path: Path):
    """PNG → (w, h, каналы, массив h × w × 4 значений 0..1 как записаны в файле)."""
    import bpy

    img = bpy.data.images.load(str(path), check_existing=False)
    try:
        w, h = img.size
        px = np.empty(w * h * img.channels, dtype=np.float32)
        img.pixels.foreach_get(px)
        return w, h, img.channels, px.reshape(h, w, img.channels)
    finally:
        bpy.data.images.remove(img)


@pytest.fixture(scope="module")
def pixels(built):
    out = {}
    for item, path in built.items():
        assert path.is_file(), f"missing {path}"
        w, h, ch, px = _load(path)
        assert ch == 4, f"{item}: {ch} channels"
        out[item] = px
    return out


def _opaque(px):
    return px[..., 3] > OPAQUE


def test_all_8_exist_128(built):
    for item, path in built.items():
        assert path.is_file(), f"missing {path}"
        w, h, ch, _ = _load(path)
        assert (w, h) == (SIZE, SIZE), f"{item}: {w}×{h}"
        assert ch == 4, f"{item}: {ch} channels, want RGBA"


@pytest.mark.parametrize("item", ITEMS)
def test_background_transparent(pixels, item):
    a = pixels[item][..., 3]
    corners = [a[0, 0], a[0, -1], a[-1, 0], a[-1, -1]]
    assert all(c == 0.0 for c in corners), f"{item}: corner alpha {corners}"


@pytest.mark.parametrize("item", ITEMS)
def test_fill(pixels, item):
    share = _opaque(pixels[item]).mean()
    assert 0.15 <= share <= 0.85, f"{item}: opaque share {share:.3f}"


def test_seed_icons_differ(pixels):
    for a, b in itertools.combinations(SEEDS, 2):
        mask = _opaque(pixels[a]) | _opaque(pixels[b])
        diff = np.abs(pixels[a][..., :3] - pixels[b][..., :3])[mask].mean()
        assert diff >= 0.03, f"{a} vs {b}: mean RGB diff {diff:.4f}"


@pytest.mark.parametrize("item", ITEMS)
def test_readable_on_dark(pixels, item):
    px = pixels[item]
    rgb = px[..., :3][_opaque(px)]
    luma = (rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)).mean()
    assert luma >= 0.25, f"{item}: mean brightness {luma:.3f}"
