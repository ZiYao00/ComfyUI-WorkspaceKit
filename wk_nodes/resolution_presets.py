"""WorkspaceKit ratio-first resolution utility.

The public UI is intentionally model-agnostic: users choose a visual aspect ratio
and a ComfyUI-style K level where 1K means a target long edge of about 1024 px.
The derived short edge is rounded to the nearest multiple of 8.
"""

from __future__ import annotations

import math


MAX_DIMENSION = 16_384
ALIGNMENT = 8

ASPECT_RATIOS = (
    ("▯ 4:5", 4, 5),
    ("▯ 3:4", 3, 4),
    ("▯ 2:3", 2, 3),
    ("▯ 9:16", 9, 16),
    ("■ 1:1", 1, 1),
    ("▭ 5:4", 5, 4),
    ("▭ 4:3", 4, 3),
    ("▭ 3:2", 3, 2),
    ("▭ 16:9", 16, 9),
    ("▭ 2:1", 2, 1),
)
ASPECT_RATIO_LABELS = tuple(item[0] for item in ASPECT_RATIOS)
ASPECT_RATIO_VALUES = {label: (width, height) for label, width, height in ASPECT_RATIOS}

RESOLUTION_LEVELS = ("1K", "2K", "3K", "4K", "6K", "8K")
LONG_EDGE_BY_LEVEL = {
    "1K": 1024,
    "2K": 2048,
    "3K": 3072,
    "4K": 4096,
    "6K": 6144,
    "8K": 8192,
}


def _validated_dimension(value, label):
    if type(value) is not int:
        raise ValueError(f"{label} must be a whole number.")
    if value < 1 or value > MAX_DIMENSION:
        raise ValueError(f"{label} must be between 1 and {MAX_DIMENSION}.")
    return value


def _nearest_multiple(value, multiple=ALIGNMENT):
    """Round a positive number to the nearest positive multiple."""
    if value <= 0:
        raise ValueError("Resolution dimension must be greater than 0.")
    rounded = int(math.floor((float(value) / multiple) + 0.5)) * multiple
    return max(multiple, rounded)


def resolve_ratio_resolution(aspect_ratio, resolution_level):
    """Resolve ratio + K level using long-edge K semantics and nearest x8 alignment."""
    try:
        ratio_width, ratio_height = ASPECT_RATIO_VALUES[aspect_ratio]
    except KeyError:
        raise ValueError(f"Unknown aspect ratio: {aspect_ratio!r}") from None

    try:
        long_edge = LONG_EDGE_BY_LEVEL[resolution_level]
    except KeyError:
        raise ValueError(f"Unknown resolution level: {resolution_level!r}") from None

    if ratio_width == ratio_height:
        width = long_edge
        height = long_edge
    elif ratio_width < ratio_height:
        height = long_edge
        width = _nearest_multiple(long_edge * ratio_width / ratio_height)
    else:
        width = long_edge
        height = _nearest_multiple(long_edge * ratio_height / ratio_width)

    return width, height


def resolve_resolution(
    aspect_ratio,
    resolution_level,
    use_custom=False,
    custom_width=1024,
    custom_height=1024,
):
    if use_custom:
        width = _validated_dimension(custom_width, "Custom width")
        height = _validated_dimension(custom_height, "Custom height")
        return width, height
    return resolve_ratio_resolution(aspect_ratio, resolution_level)


class WKResolutionPreset:
    CATEGORY = "🧩 WorkspaceKit/Utilities"
    FUNCTION = "resolve"
    RETURN_TYPES = ("INT", "INT", "STRING")
    RETURN_NAMES = ("width", "height", "resolution")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratio": (ASPECT_RATIO_LABELS, {"default": "■ 1:1"}),
                "resolution_level": (RESOLUTION_LEVELS, {"default": "1K"}),
                "use_custom": ("BOOLEAN", {"default": False}),
                "custom_width": ("INT", {"default": 1024, "min": 1, "max": MAX_DIMENSION, "step": 1}),
                "custom_height": ("INT", {"default": 1024, "min": 1, "max": MAX_DIMENSION, "step": 1}),
            }
        }

    def resolve(
        self,
        aspect_ratio,
        resolution_level,
        use_custom=False,
        custom_width=1024,
        custom_height=1024,
    ):
        width, height = resolve_resolution(
            aspect_ratio,
            resolution_level,
            use_custom=use_custom,
            custom_width=custom_width,
            custom_height=custom_height,
        )
        return width, height, f"{width} × {height}"
