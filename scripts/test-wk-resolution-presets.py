"""Pure-Python contracts for WK Video Resolution and its legacy predecessor."""

from __future__ import annotations

import importlib.util
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "wk_nodes" / "resolution_presets.py"
SPEC = importlib.util.spec_from_file_location("wk_video_resolution_contract", MODULE_PATH)
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
    "▭ 21:9",
)
assert module.ASPECT_RATIO_LABELS == EXPECTED_RATIOS
assert module.SCALE_OPTIONS == ("0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "4.0", "6.0", "8.0")

# H3 reference values with multiple=32 must match ComfyUI's official formula.
EXPECTED_16_9_X32 = {
    0.2: (608, 352),
    0.3: (736, 416),
    0.4: (864, 480),
    0.5: (960, 544),
    0.6: (1056, 608),
    0.7: (1152, 640),
    0.8: (1216, 672),
    0.9: (1280, 736),
    1.0: (1376, 768),
    1.2: (1504, 832),
    1.5: (1664, 928),
    1.8: (1824, 1024),
    2.0: (1920, 1088),
}
for megapixels, expected in EXPECTED_16_9_X32.items():
    assert module.resolve_base_resolution("▭ 16:9", megapixels, 32) == expected

assert module.resolve_scaled_resolution(1376, 768, "0.5") == (688, 384)
assert module.resolve_scaled_resolution(1376, 768, "1.5") == (2064, 1152)
assert module.resolve_scaled_resolution(1376, 768, "2.0") == (2752, 1536)

node = module.WKVideoResolution()
assert node.resolve("▭ 16:9", 1.0, 32, "1.5") == (
    1376,
    768,
    2064,
    1152,
    "1376 × 768 → 2064 × 1152 · scale 1.5",
)

assert module.WKVideoResolution.RETURN_TYPES == ("INT", "INT", "INT", "INT", "STRING")
assert module.WKVideoResolution.RETURN_NAMES == (
    "width",
    "height",
    "scale_width",
    "scale_height",
    "resolution",
)

required = module.WKVideoResolution.INPUT_TYPES()["required"]
assert tuple(required) == ("aspect_ratio", "megapixels", "multiple", "scale")
assert required["aspect_ratio"][0] == module.ASPECT_RATIO_LABELS
assert required["aspect_ratio"][1]["default"] == "▭ 16:9"
assert required["megapixels"][0] == "FLOAT"
assert required["megapixels"][1] == {
    "default": 1.0,
    "min": 0.1,
    "max": 16.0,
    "step": 0.1,
    "round": 0.1,
}
assert required["multiple"][0] == "INT"
assert required["multiple"][1] == {
    "default": 8,
    "min": 8,
    "max": 128,
    "step": 4,
}
assert required["scale"][0] == module.SCALE_OPTIONS
assert required["scale"][1]["default"] == "1.0"

# The serialized legacy node must keep the previous widget/output contract.
legacy_required = module.WKResolutionPreset.INPUT_TYPES()["required"]
assert tuple(legacy_required) == (
    "aspect_ratio",
    "resolution_level",
    "use_custom",
    "custom_width",
    "custom_height",
)
assert legacy_required["aspect_ratio"][0] == module.LEGACY_ASPECT_RATIO_LABELS
assert legacy_required["resolution_level"][0] == module.LEGACY_RESOLUTION_LEVELS
assert module.WKResolutionPreset.RETURN_TYPES == ("INT", "INT", "STRING")
assert module.WKResolutionPreset().resolve("▭ 16:9", "3K") == (
    3072,
    1728,
    "3072 × 1728",
)
assert module.WKResolutionPreset().resolve(
    "ignored",
    "ignored",
    True,
    768,
    1344,
) == (768, 1344, "768 × 1344")

for callable_, args in (
    (module.resolve_base_resolution, ("missing", 1.0, 32)),
    (module.resolve_base_resolution, ("▭ 16:9", 0.0, 32)),
    (module.resolve_base_resolution, ("▭ 16:9", 16.1, 32)),
    (module.resolve_base_resolution, ("▭ 16:9", 1.0, 4)),
    (module.resolve_scaled_resolution, (1376, 768, "5.0")),
    (module.resolve_scaled_resolution, (4096, 2304, "8.0")),
):
    try:
        callable_(*args)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Invalid video resolution input was accepted: {callable_.__name__}{args!r}")

print("WK Video Resolution contracts passed")
