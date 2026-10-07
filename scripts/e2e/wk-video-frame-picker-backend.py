"""Runtime smoke test for the real PyAV frame decoder.

Usage:
    python wk-video-frame-picker-backend.py <video-path>
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path


if len(sys.argv) != 2:
    raise SystemExit("Expected exactly one video path argument.")

video_path = Path(sys.argv[1]).resolve()
root = Path(__file__).resolve().parents[2]
module_path = root / "service" / "video_frame_service.py"
spec = importlib.util.spec_from_file_location("wk_video_frame_service_runtime", module_path)
module = importlib.util.module_from_spec(spec)
assert spec and spec.loader
spec.loader.exec_module(module)

metadata = module.probe_video(video_path)
last_probe = min(metadata["total_frames"], 3)
indices = sorted({1, last_probe})
frames = module.decode_frame_indices(video_path, indices)

if len(frames) != len(indices):
    raise AssertionError("Decoder returned the wrong batch length.")
for frame in frames:
    if frame.ndim != 3 or frame.shape[2] != 3:
        raise AssertionError(f"Unexpected RGB frame shape: {frame.shape}")
    if frame.shape[1] != metadata["width"] or frame.shape[0] != metadata["height"]:
        raise AssertionError("Decoded frame dimensions do not match probed metadata.")

tensor = module.frames_to_image_tensor(frames)
if list(tensor.shape) != [len(indices), metadata["height"], metadata["width"], 3]:
    raise AssertionError(f"Unexpected IMAGE tensor shape: {list(tensor.shape)}")
if str(tensor.dtype) != "torch.float32":
    raise AssertionError(f"Unexpected IMAGE tensor dtype: {tensor.dtype}")
if float(tensor.min()) < 0.0 or float(tensor.max()) > 1.0:
    raise AssertionError("IMAGE tensor values must be normalized to [0,1].")

print(json.dumps({
    "video": video_path.name,
    "metadata": metadata,
    "decoded_indices": indices,
    "shapes": [list(frame.shape) for frame in frames],
    "image_tensor_shape": list(tensor.shape),
    "image_tensor_dtype": str(tensor.dtype),
}, ensure_ascii=False, indent=2))
