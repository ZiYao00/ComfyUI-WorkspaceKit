"""Video metadata and exact frame decoding for WorkspaceKit.

The decoder is intentionally multi-frame capable from V1 so later marker-based
batch extraction can reuse the same core without changing frame-number semantics.
Public frame numbers are 1-based; PyAV's decoded sequence is 0-based internally.
"""

from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable, List


PREVIEW_VIDEO_EXTENSIONS = (".mp4", ".webm")


def _load_av():
    try:
        import av
    except ImportError as exc:
        raise RuntimeError(
            "PyAV is required for WK Video Frame Picker. "
            "Use a ComfyUI build that includes the official video stack."
        ) from exc
    return av


def normalize_frame_indices(frame_indices: Iterable[int]) -> List[int]:
    if isinstance(frame_indices, (str, bytes)):
        raise ValueError("Frame indices must be an iterable of positive integers.")

    normalized = []
    for value in frame_indices:
        if type(value) is not int:
            raise ValueError("Frame indices must be whole numbers.")
        if value < 1:
            raise ValueError("Frame indices are 1-based and must be at least 1.")
        normalized.append(value)

    if not normalized:
        raise ValueError("At least one frame index is required.")
    return normalized


def frame_to_timestamp(frame_index: int, fps: float) -> float:
    if type(frame_index) is not int or frame_index < 1:
        raise ValueError("Frame index must be a 1-based positive integer.")
    fps = float(fps)
    if not math.isfinite(fps) or fps <= 0:
        raise ValueError("FPS must be a finite number greater than 0.")
    return (frame_index - 1) / fps


def is_preview_video(path) -> bool:
    return Path(path).suffix.lower() in PREVIEW_VIDEO_EXTENSIONS


def _stream_fps(stream) -> float:
    for name in ("average_rate", "guessed_rate", "base_rate"):
        value = getattr(stream, name, None)
        if value is None:
            continue
        try:
            fps = float(value)
        except (TypeError, ValueError, ZeroDivisionError):
            continue
        if math.isfinite(fps) and fps > 0:
            return fps
    raise ValueError("Could not determine a valid FPS for the video stream.")


def probe_video(path):
    """Return stable metadata needed by the frontend timeline."""
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Video file not found: {path}")

    av = _load_av()
    with av.open(str(path)) as container:
        stream = next((item for item in container.streams if item.type == "video"), None)
        if stream is None:
            raise ValueError("The selected file does not contain a video stream.")

        fps = _stream_fps(stream)
        width = int(stream.codec_context.width or 0)
        height = int(stream.codec_context.height or 0)

        duration = 0.0
        if stream.duration is not None and stream.time_base is not None:
            duration = float(stream.duration * stream.time_base)
        elif container.duration is not None:
            duration = float(container.duration / av.time_base)

        total_frames = int(stream.frames or 0)
        if total_frames <= 0 and duration > 0:
            total_frames = max(1, int(round(duration * fps)))
        if duration <= 0 and total_frames > 0:
            duration = total_frames / fps

        if width <= 0 or height <= 0:
            raise ValueError("Could not determine video dimensions.")
        if total_frames <= 0:
            raise ValueError("Could not determine the video frame count.")

        return {
            "fps": fps,
            "total_frames": total_frames,
            "duration": duration,
            "width": width,
            "height": height,
            "preview_supported": is_preview_video(path),
            "extension": path.suffix.lower(),
        }


def frames_to_image_tensor(frames):
    """Convert decoded RGB arrays into a Comfy IMAGE batch tensor."""
    if not frames:
        raise ValueError("At least one decoded frame is required.")

    import numpy as np
    import torch

    batch = np.stack(frames, axis=0)
    if batch.ndim != 4 or batch.shape[-1] != 3:
        raise ValueError(f"Expected RGB frames shaped [B,H,W,3], got {batch.shape}.")
    return torch.from_numpy(batch).to(dtype=torch.float32).div_(255.0)


def decode_frame_indices(path, frame_indices: Iterable[int]):
    """Decode requested 1-based frames exactly in one sequential pass.

    The returned list preserves caller order, including duplicate indices. V1
    passes one index; V2 marker batches can pass many indices without changing
    the decoder contract.
    """
    requested = normalize_frame_indices(frame_indices)
    path = Path(path)
    if not path.is_file():
        raise FileNotFoundError(f"Video file not found: {path}")

    targets = {index - 1 for index in requested}
    decoded = {}
    max_target = max(targets)

    av = _load_av()
    with av.open(str(path)) as container:
        stream = next((item for item in container.streams if item.type == "video"), None)
        if stream is None:
            raise ValueError("The selected file does not contain a video stream.")

        for zero_based_index, frame in enumerate(container.decode(stream)):
            if zero_based_index in targets:
                # Copy detaches the array from PyAV's frame buffer lifecycle.
                decoded[zero_based_index] = frame.to_ndarray(format="rgb24").copy()
                if len(decoded) == len(targets):
                    break
            if zero_based_index > max_target:
                break

    missing = [index for index in requested if (index - 1) not in decoded]
    if missing:
        formatted = ", ".join(str(index) for index in missing)
        raise ValueError(f"Requested frame(s) outside the decodable video range: {formatted}.")

    return [decoded[index - 1] for index in requested]
