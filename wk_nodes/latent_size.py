"""WK Latent Size: ratio-aware latent dimensions with batch output.

The calculation is deliberately backend-only.  It uses ComfyUI's standard
``INPUT_TYPES`` / ``RETURN_TYPES`` contract and therefore does not depend on
LiteGraph, DOM coordinates, or a specific node renderer.
"""

from __future__ import annotations

import math


ASPECT_RATIOS = (
    "1:1",
    "3:4",
    "2:3",
    "3:5",
    "4:5",
    "5:7",
    "5:8",
    "7:9",
    "9:16",
    "9:19",
    "9:21",
    "9:32",
    "3:2",
    "4:3",
    "5:3",
    "5:4",
    "7:5",
    "8:5",
    "9:7",
    "16:9",
    "19:9",
    "21:9",
    "32:9",
)
MEGAPIXEL_OPTIONS = tuple(f"{value:.1f}" for value in (0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.5, 1.8, 2.0, 2.5))
DIVISIBILITY_OPTIONS = ("8", "16", "32", "64")
MAX_DIMENSION = 16_384


def parse_aspect_ratio(value: str) -> tuple[float, float]:
    """Parse a positive ``width:height`` ratio without accepting expressions."""
    try:
        width_text, height_text = str(value).strip().split(":", 1)
        width = float(width_text.strip())
        height = float(height_text.strip())
    except (TypeError, ValueError):
        raise ValueError("Custom aspect ratio must use the form width:height, for example 16:9.") from None
    if not math.isfinite(width) or not math.isfinite(height) or width <= 0 or height <= 0:
        raise ValueError("Custom aspect ratio values must be positive finite numbers.")
    return width, height


def round_dimension(value: float, divisible_by: int) -> int:
    """Round to the nearest valid latent dimension, never below one block."""
    return max(divisible_by, int(round(value / divisible_by)) * divisible_by)


def calculate_dimensions(megapixels: float, aspect_ratio: str, divisible_by: int) -> tuple[int, int]:
    """Return width/height for a target pixel count and ``width:height`` ratio."""
    if megapixels <= 0:
        raise ValueError("Megapixels must be greater than zero.")
    if divisible_by < 8 or divisible_by % 8:
        raise ValueError("Divisible By must be a multiple of 8.")

    ratio_width, ratio_height = parse_aspect_ratio(aspect_ratio)
    target_pixels = megapixels * 1_000_000
    width = round_dimension(math.sqrt(target_pixels * ratio_width / ratio_height), divisible_by)
    height = round_dimension(math.sqrt(target_pixels * ratio_height / ratio_width), divisible_by)
    if width > MAX_DIMENSION or height > MAX_DIMENSION:
        raise ValueError(f"Calculated dimensions must not exceed {MAX_DIMENSION}px on either side.")
    return width, height


class WKLatentSize:
    """Create a ComfyUI latent while also exposing the resolved dimensions."""

    CATEGORY = "🧩 WorkspaceKit/Utilities"
    FUNCTION = "create_latent"
    RETURN_TYPES = ("LATENT", "INT", "INT", "STRING")
    RETURN_NAMES = ("latent", "width", "height", "resolution")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "megapixels": (MEGAPIXEL_OPTIONS, {"default": "1.0"}),
                "aspect_ratio": (ASPECT_RATIOS, {"default": "1:1"}),
                "divisible_by": (DIVISIBILITY_OPTIONS, {"default": "64"}),
                "batch_size": ("INT", {"default": 1, "min": 1, "max": 4096, "step": 1}),
                "use_custom_ratio": ("BOOLEAN", {"default": False}),
                "custom_aspect_ratio": ("STRING", {"default": "1:1", "multiline": False}),
            }
        }

    def create_latent(
        self,
        megapixels="1.0",
        aspect_ratio="1:1",
        divisible_by="64",
        batch_size=1,
        use_custom_ratio=False,
        custom_aspect_ratio="1:1",
    ):
        # Imports stay inside execution: static tooling and module discovery do
        # not need a live torch/ComfyUI runtime merely to inspect this node.
        import torch
        import comfy.model_management

        selected_ratio = custom_aspect_ratio if use_custom_ratio else aspect_ratio
        width, height = calculate_dimensions(float(megapixels), selected_ratio, int(divisible_by))
        batch_size = int(batch_size)
        if batch_size < 1:
            raise ValueError("Batch Size must be at least 1.")
        latent = torch.zeros(
            [batch_size, 4, height // 8, width // 8],
            device=comfy.model_management.intermediate_device(),
        )
        return ({"samples": latent}, width, height, f"{width} × {height}")
