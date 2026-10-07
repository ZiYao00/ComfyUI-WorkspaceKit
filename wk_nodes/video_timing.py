"""WorkspaceKit video timing profiles and utility nodes.

The profile labels are serialized by classic ComfyUI combo widgets and therefore
act as compatibility contracts. Each profile owns its FPS and frame-grid timing
rule so users only choose a model profile and target duration.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional


MAX_FRAME_COUNT = 1_000_000
MAX_DURATION_SECONDS = 86_400.0


@dataclass(frozen=True)
class VideoTimingProfile:
    profile_id: str
    label: str
    grid: int
    offset: int
    fps: float
    duration_strategy: str
    min_frames: int = 1
    max_frames: Optional[int] = None
    recommended_min: Optional[int] = None
    recommended_max: Optional[int] = None


VIDEO_TIMING_PROFILES = (
    VideoTimingProfile(
        profile_id="wan_2x_local",
        label="WAN 2.x Local · 4n+1",
        grid=4,
        offset=1,
        fps=16.0,
        duration_strategy="floor_plus_one",
    ),
    VideoTimingProfile(
        profile_id="ltx_25_local",
        label="LTX 2.5 Local · 8n+1",
        grid=8,
        offset=1,
        fps=24.0,
        duration_strategy="linear_plus_one",
    ),
    VideoTimingProfile(
        profile_id="minimax_h3_local",
        label="MiniMax H3 Local · 17n+5",
        grid=17,
        offset=5,
        fps=24.0,
        duration_strategy="round_then_align",
        min_frames=5,
        max_frames=3600,
        recommended_min=124,
        recommended_max=362,
    ),
)

PROFILE_LABELS = tuple(profile.label for profile in VIDEO_TIMING_PROFILES)
PROFILES_BY_LABEL = {profile.label: profile for profile in VIDEO_TIMING_PROFILES}
PROFILES_BY_ID = {profile.profile_id: profile for profile in VIDEO_TIMING_PROFILES}


def get_profile(profile):
    if isinstance(profile, VideoTimingProfile):
        return profile
    try:
        return PROFILES_BY_LABEL[str(profile)]
    except KeyError:
        try:
            return PROFILES_BY_ID[str(profile)]
        except KeyError:
            raise ValueError(f"Unknown video timing profile: {profile!r}") from None


def _finite_number(value, label):
    try:
        number = float(value)
    except (TypeError, ValueError):
        raise ValueError(f"{label} must be a finite number.") from None
    if not math.isfinite(number):
        raise ValueError(f"{label} must be a finite number.")
    return number


def _align_up(value, profile):
    """Return the smallest legal profile frame count that is >= value."""
    profile = get_profile(profile)
    number = _finite_number(value, "Frame count")
    if number < profile.min_frames:
        number = float(profile.min_frames)

    grid = profile.grid
    offset = profile.offset
    aligned = int(math.ceil((number - offset) / grid) * grid + offset)
    if aligned < profile.min_frames:
        aligned += int(math.ceil((profile.min_frames - aligned) / grid)) * grid
    if aligned < 1 or aligned > MAX_FRAME_COUNT:
        raise ValueError(f"Resolved frame count must be between 1 and {MAX_FRAME_COUNT}.")
    if profile.max_frames is not None and aligned > profile.max_frames:
        raise ValueError(
            f"{profile.label} resolves to {aligned} frames, above the supported maximum of {profile.max_frames}."
        )
    return aligned


def align_frame_count(requested_frames, profile):
    if type(requested_frames) is not int:
        raise ValueError("Requested frames must be a whole number.")
    if requested_frames < 1 or requested_frames > MAX_FRAME_COUNT:
        raise ValueError(f"Requested frames must be between 1 and {MAX_FRAME_COUNT}.")
    return _align_up(requested_frames, profile)


def assess_range(frame_count, profile):
    profile = get_profile(profile)
    if profile.recommended_min is None or profile.recommended_max is None:
        return "valid"
    if profile.recommended_min <= frame_count <= profile.recommended_max:
        return "recommended"
    return "valid_outside_recommended"


def duration_to_frames(duration_seconds, profile):
    profile = get_profile(profile)
    seconds = _finite_number(duration_seconds, "Duration seconds")
    if seconds <= 0 or seconds > MAX_DURATION_SECONDS:
        raise ValueError(f"Duration seconds must be greater than 0 and at most {MAX_DURATION_SECONDS:g}.")

    fps = profile.fps
    if profile.duration_strategy == "floor_plus_one":
        candidate = math.floor(seconds * fps + 1)
    elif profile.duration_strategy == "linear_plus_one":
        candidate = seconds * fps + 1
    elif profile.duration_strategy == "round_then_align":
        candidate = max(profile.min_frames, round(seconds * fps))
    else:
        raise ValueError(f"Unsupported duration strategy: {profile.duration_strategy!r}")

    frames = _align_up(candidate, profile)
    actual_seconds = round(frames / fps, 1)
    status = assess_range(frames, profile)
    return frames, fps, actual_seconds, status


class WKVideoDuration:
    CATEGORY = "🧩 WorkspaceKit/Utilities"
    FUNCTION = "resolve"
    RETURN_TYPES = ("INT", "FLOAT", "FLOAT", "STRING")
    RETURN_NAMES = ("length", "fps", "actual_seconds", "status")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "profile": (PROFILE_LABELS, {"default": "MiniMax H3 Local · 17n+5"}),
                "duration_seconds": (
                    "FLOAT",
                    {
                        "default": 5.0,
                        "min": 0.1,
                        "max": MAX_DURATION_SECONDS,
                        "step": 0.1,
                        "round": 0.1,
                    },
                ),
            }
        }

    def resolve(self, profile, duration_seconds):
        return duration_to_frames(duration_seconds, profile)
