"""Pure-Python contract for WK Resolution Preset."""

from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "wk_nodes" / "resolution_presets.py"
SPEC = importlib.util.spec_from_file_location("wk_resolution_presets_contract", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(module)


EXPECTED_RATIOS = (
    "▯ 4:5",
    "▯ 3:4",
    "▯ 2:3",
    "▯ 9:16",
    "■ 1:1",
    "▭ 5:4",
    "▭ 4:3",
    "▭ 3:2",
    "▭ 16:9",
    "▭ 2:1",
)
assert module.ASPECT_RATIO_LABELS == EXPECTED_RATIOS
assert module.RESOLUTION_LEVELS == ("1K", "2K", "3K", "4K", "6K", "8K")
assert module.LONG_EDGE_BY_LEVEL == {
    "1K": 1024,
    "2K": 2048,
    "3K": 3072,
    "4K": 4096,
    "6K": 6144,
    "8K": 8192,
}

# Visual grouping: portrait outline, square solid, landscape outline.
assert all(label.startswith("▯ ") for label in module.ASPECT_RATIO_LABELS[:4])
assert module.ASPECT_RATIO_LABELS[4] == "■ 1:1"
assert all(label.startswith("▭ ") for label in module.ASPECT_RATIO_LABELS[5:])
assert not any("WAN" in label or "Qwen" in label for label in module.ASPECT_RATIO_LABELS)

# 1K means a 1024px target long edge; short edge uses nearest x8 alignment.
assert module.resolve_ratio_resolution("▯ 4:5", "1K") == (816, 1024)
assert module.resolve_ratio_resolution("▯ 3:4", "1K") == (768, 1024)
assert module.resolve_ratio_resolution("▯ 2:3", "1K") == (680, 1024)
assert module.resolve_ratio_resolution("▯ 9:16", "1K") == (576, 1024)
assert module.resolve_ratio_resolution("■ 1:1", "1K") == (1024, 1024)
assert module.resolve_ratio_resolution("▭ 5:4", "1K") == (1024, 816)
assert module.resolve_ratio_resolution("▭ 4:3", "1K") == (1024, 768)
assert module.resolve_ratio_resolution("▭ 3:2", "1K") == (1024, 680)
assert module.resolve_ratio_resolution("▭ 16:9", "1K") == (1024, 576)
assert module.resolve_ratio_resolution("▭ 2:1", "1K") == (1024, 512)

assert module.resolve_ratio_resolution("▯ 2:3", "2K") == (1368, 2048)
assert module.resolve_ratio_resolution("▭ 16:9", "3K") == (3072, 1728)
assert module.resolve_ratio_resolution("▯ 4:5", "4K") == (3280, 4096)
assert module.resolve_ratio_resolution("▭ 16:9", "6K") == (6144, 3456)
assert module.resolve_ratio_resolution("▯ 2:3", "8K") == (5464, 8192)

assert module.resolve_resolution("ignored", "ignored", True, 1234, 987) == (1234, 987)

node = module.WKResolutionPreset()
assert node.resolve("▯ 2:3", "2K") == (1368, 2048, "1368 × 2048")
assert node.resolve("ignored", "ignored", True, 768, 1344) == (768, 1344, "768 × 1344")

required = module.WKResolutionPreset.INPUT_TYPES()["required"]
assert required["aspect_ratio"][0] == module.ASPECT_RATIO_LABELS
assert required["aspect_ratio"][1]["default"] == "■ 1:1"
assert required["resolution_level"][0] == module.RESOLUTION_LEVELS
assert required["resolution_level"][1]["default"] == "1K"

for args in (
    ("missing", "1K", False, 1024, 1024),
    ("■ 1:1", "5K", False, 1024, 1024),
    ("ignored", "ignored", True, 0, 1024),
    ("ignored", "ignored", True, 1024, module.MAX_DIMENSION + 1),
):
    try:
        module.resolve_resolution(*args)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Invalid resolution input was accepted: {args!r}")

print("WK Resolution Preset contract passed")
