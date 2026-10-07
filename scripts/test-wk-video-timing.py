"""Pure-Python contract for WK video timing profiles."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "wk_nodes" / "video_timing.py"
SPEC = importlib.util.spec_from_file_location("wk_video_timing_contract", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
sys.modules[SPEC.name] = module
try:
    SPEC.loader.exec_module(module)
finally:
    sys.modules.pop(SPEC.name, None)


WAN = "WAN 2.x Local · 4n+1"
LTX = "LTX 2.5 Local · 8n+1"
H3 = "MiniMax H3 Local · 17n+5"

assert module.PROFILE_LABELS == (WAN, LTX, H3)
assert not hasattr(module, "WKFrameCount")
assert not hasattr(module, "MAX_FPS")
assert not hasattr(module, "resolve_fps")

wan = module.get_profile(WAN)
ltx = module.get_profile(LTX)
h3 = module.get_profile(H3)
assert wan.fps == 16.0
assert ltx.fps == 24.0
assert h3.fps == 24.0
assert not hasattr(wan, "default_fps")
assert not hasattr(wan, "fps_policy")

# Frame-grid helpers remain internal and reusable by the duration node.
assert module.align_frame_count(80, WAN) == 81
assert module.align_frame_count(81, WAN) == 81
assert module.align_frame_count(120, LTX) == 121
assert module.align_frame_count(121, LTX) == 121
assert module.align_frame_count(120, H3) == 124
assert module.align_frame_count(124, H3) == 124
assert module.align_frame_count(125, H3) == 141

# Duration conversion uses only the profile-owned FPS and returns one decimal place.
assert module.duration_to_frames(5.0, WAN) == (81, 16.0, 5.1, "valid")
assert module.duration_to_frames(5.1, WAN) == (85, 16.0, 5.3, "valid")
assert module.duration_to_frames(5.0, LTX) == (121, 24.0, 5.0, "valid")
assert module.duration_to_frames(5.1, LTX) == (129, 24.0, 5.4, "valid")
assert module.duration_to_frames(5.0, H3) == (124, 24.0, 5.2, "recommended")
assert module.duration_to_frames(15.0, H3) == (362, 24.0, 15.1, "recommended")
assert module.assess_range(379, H3) == "valid_outside_recommended"

required = module.WKVideoDuration.INPUT_TYPES()["required"]
assert tuple(required) == ("profile", "duration_seconds")
duration_options = required["duration_seconds"][1]
assert duration_options["default"] == 5.0
assert duration_options["min"] == 0.1
assert duration_options["step"] == 0.1
assert duration_options["round"] == 0.1

for args in (
    (0, WAN),
    (-1, LTX),
    (module.MAX_DURATION_SECONDS + 1, H3),
):
    try:
        module.duration_to_frames(*args)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Invalid duration input was accepted: {args!r}")

for requested in (0, -1):
    try:
        module.align_frame_count(requested, WAN)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Invalid requested frame count was accepted: {requested!r}")

assert module.align_frame_count(3590, H3) == 3592
try:
    module.align_frame_count(3593, H3)
except ValueError:
    pass
else:
    raise AssertionError("H3 alignment was allowed beyond its supported 3600-frame maximum")

duration_node = module.WKVideoDuration()
assert duration_node.resolve(H3, 5.0) == (124, 24.0, 5.2, "recommended")

print("WK video timing contracts passed")
