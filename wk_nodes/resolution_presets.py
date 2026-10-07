"""WorkspaceKit video resolution utilities.

WK Video Resolution follows ComfyUI's official ResolutionSelector megapixel math:
    target_pixels = megapixels * 1024 * 1024

The legacy WK Resolution Preset contract remains available only so existing
serialized workflows continue to load with their original widget layout.
"""

from __future__ import annotations

import math


MAX_DIMENSION = 16_384
MIN_MULTIPLE = 8
MAX_MULTIPLE = 128

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
    ("▭ 21:9", 21, 9),
)
ASPECT_RATIO_LABELS = tuple(item[0] for item in ASPECT_RATIOS)
ASPECT_RATIO_VALUES = {label: (width, height) for label, width, height in ASPECT_RATIOS}

SCALE_OPTIONS = ("0.5", "1.0", "1.5", "2.0", "2.5", "3.0", "4.0", "6.0", "8.0")

LEGACY_ASPECT_RATIOS = ASPECT_RATIOS[:-1]
LEGACY_ASPECT_RATIO_LABELS = tuple(item[0] for item in LEGACY_ASPECT_RATIOS)
LEGACY_ASPECT_RATIO_VALUES = {
    label: (width, height) for label, width, height in LEGACY_ASPECT_RATIOS
}
LEGACY_RESOLUTION_LEVELS = ("1K", "2K", "3K", "4K", "6K", "8K")
LEGACY_LONG_EDGE_BY_LEVEL = {
    "1K": 1024,
    "2K": 2048,
    "3K": 3072,
    "4K": 4096,
    "6K": 6144,
    "8K": 8192,
}


def _validate_multiple(value: int) -> int:
    if type(value) is not int:
        raise ValueError("Multiple must be a whole number.")
    if value < MIN_MULTIPLE or value > MAX_MULTIPLE:
        raise ValueError(f"Multiple must be between {MIN_MULTIPLE} and {MAX_MULTIPLE}.")
    return value


def _validate_dimension(value: int, label: str) -> int:
    if type(value) is not int:
        raise ValueError(f"{label} must be a whole number.")
    if value < 1 or value > MAX_DIMENSION:
        raise ValueError(f"{label} must be between 1 and {MAX_DIMENSION}.")
    return value


def _parse_scale(value) -> float:
    text = str(value).strip()
    try:
        scale = float(text)
    except ValueError:
        raise ValueError(f"Unknown scale: {value!r}") from None
    if f"{scale:.1f}" not in SCALE_OPTIONS:
        raise ValueError(f"Unknown scale: {value!r}")
    return scale


def resolve_base_resolution(aspect_ratio, megapixels, multiple):
    """Match ComfyUI ResolutionSelector's megapixel-to-resolution formula."""
    try:
        ratio_width, ratio_height = ASPECT_RATIO_VALUES[aspect_ratio]
    except KeyError:
        raise ValueError(f"Unknown aspect ratio: {aspect_ratio!r}") from None

    try:
        megapixels = float(megapixels)
    except (TypeError, ValueError):
        raise ValueError("Megapixels must be a number.") from None
    if not math.isfinite(megapixels) or megapixels < 0.1 or megapixels > 16.0:
        raise ValueError("Megapixels must be between 0.1 and 16.0.")

    multiple = _validate_multiple(multiple)
    target_pixels = megapixels * 1024 * 1024
    scale = math.sqrt(target_pixels / (ratio_width * ratio_height))
    width = round(ratio_width * scale / multiple) * multiple
    height = round(ratio_height * scale / multiple) * multiple
    return (
        _validate_dimension(width, "Width"),
        _validate_dimension(height, "Height"),
    )


def resolve_scaled_resolution(width, height, scale):
    """Scale a resolved base size by the selected factor exactly."""
    width = _validate_dimension(width, "Width")
    height = _validate_dimension(height, "Height")
    scale_value = _parse_scale(scale)
    scale_width = int(round(width * scale_value))
    scale_height = int(round(height * scale_value))
    return (
        _validate_dimension(scale_width, "Scale width"),
        _validate_dimension(scale_height, "Scale height"),
    )


class WKVideoResolution:
    CATEGORY = "🧩 WorkspaceKit/Utilities"
    FUNCTION = "resolve"
    RETURN_TYPES = ("INT", "INT", "INT", "INT", "STRING")
    RETURN_NAMES = ("width", "height", "scale_width", "scale_height", "resolution")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratio": (ASPECT_RATIO_LABELS, {"default": "▭ 16:9"}),
                "megapixels": (
                    "FLOAT",
                    {"default": 1.0, "min": 0.1, "max": 16.0, "step": 0.1, "round": 0.1},
                ),
                "multiple": (
                    "INT",
                    {"default": 8, "min": MIN_MULTIPLE, "max": MAX_MULTIPLE, "step": 4},
                ),
                "scale": (SCALE_OPTIONS, {"default": "1.0"}),
            }
        }

    def resolve(self, aspect_ratio, megapixels=1.0, multiple=8, scale="1.0"):
        width, height = resolve_base_resolution(aspect_ratio, megapixels, int(multiple))
        scale_width, scale_height = resolve_scaled_resolution(width, height, scale)
        scale_value = _parse_scale(scale)
        resolution = f"{width} × {height} → {scale_width} × {scale_height} · scale {scale_value:.1f}"
        return width, height, scale_width, scale_height, resolution


def _legacy_nearest_multiple(value, multiple=8):
    if value <= 0:
        raise ValueError("Resolution dimension must be greater than 0.")
    rounded = int(math.floor((float(value) / multiple) + 0.5)) * multiple
    return max(multiple, rounded)


def resolve_legacy_ratio_resolution(aspect_ratio, resolution_level):
    try:
        ratio_width, ratio_height = LEGACY_ASPECT_RATIO_VALUES[aspect_ratio]
    except KeyError:
        raise ValueError(f"Unknown aspect ratio: {aspect_ratio!r}") from None
    try:
        long_edge = LEGACY_LONG_EDGE_BY_LEVEL[resolution_level]
    except KeyError:
        raise ValueError(f"Unknown resolution level: {resolution_level!r}") from None

    if ratio_width == ratio_height:
        width = long_edge
        height = long_edge
    elif ratio_width < ratio_height:
        height = long_edge
        width = _legacy_nearest_multiple(long_edge * ratio_width / ratio_height)
    else:
        width = long_edge
        height = _legacy_nearest_multiple(long_edge * ratio_height / ratio_width)
    return width, height


def resolve_legacy_resolution(
    aspect_ratio,
    resolution_level,
    use_custom=False,
    custom_width=1024,
    custom_height=1024,
):
    if use_custom:
        return (
            _validate_dimension(custom_width, "Custom width"),
            _validate_dimension(custom_height, "Custom height"),
        )
    return resolve_legacy_ratio_resolution(aspect_ratio, resolution_level)


class WKResolutionPreset:
    """Legacy serialized node contract retained for existing workflows."""

    CATEGORY = "🧩 WorkspaceKit/Utilities"
    FUNCTION = "resolve"
    RETURN_TYPES = ("INT", "INT", "STRING")
    RETURN_NAMES = ("width", "height", "resolution")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "aspect_ratio": (LEGACY_ASPECT_RATIO_LABELS, {"default": "■ 1:1"}),
                "resolution_level": (LEGACY_RESOLUTION_LEVELS, {"default": "1K"}),
                "use_custom": ("BOOLEAN", {"default": False}),
                "custom_width": (
                    "INT",
                    {"default": 1024, "min": 1, "max": MAX_DIMENSION, "step": 1},
                ),
                "custom_height": (
                    "INT",
                    {"default": 1024, "min": 1, "max": MAX_DIMENSION, "step": 1},
                ),
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
        width, height = resolve_legacy_resolution(
            aspect_ratio,
            resolution_level,
            use_custom=use_custom,
            custom_width=custom_width,
            custom_height=custom_height,
        )
        return width, height, f"{width} × {height}"
