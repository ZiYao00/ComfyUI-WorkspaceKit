"""WK Video Frame Picker backend node."""

from __future__ import annotations

import os
from pathlib import Path

import folder_paths

from ..service.video_frame_service import (
    PREVIEW_VIDEO_EXTENSIONS,
    decode_frame_indices,
    frames_to_image_tensor,
)


MAX_FRAME_INDEX = 10_000_000


def list_input_videos():
    root = Path(folder_paths.get_input_directory()).resolve()
    if not root.exists():
        return []

    videos = []
    for path in root.rglob("*"):
        if not path.is_file() or path.suffix.lower() not in PREVIEW_VIDEO_EXTENSIONS:
            continue
        videos.append(path.relative_to(root).as_posix())
    return sorted(videos, key=str.casefold)


def resolve_input_video(video):
    if not isinstance(video, str) or not video.strip():
        raise ValueError("Select a video from the ComfyUI input directory.")

    root = Path(folder_paths.get_input_directory()).resolve()
    relative = Path(video.strip().replace("\\", "/"))
    if relative.is_absolute():
        raise ValueError("Video paths must be relative to the ComfyUI input directory.")

    target = (root / relative).resolve()
    try:
        target.relative_to(root)
    except ValueError:
        raise ValueError("Video path must stay inside the ComfyUI input directory.") from None

    if target.suffix.lower() not in PREVIEW_VIDEO_EXTENSIONS:
        raise ValueError("V1 interactive preview supports MP4 and WebM files only.")
    if not target.is_file():
        raise ValueError(f"Video file not found: {video}")
    return target


class WKVideoFramePicker:
    CATEGORY = "🧩 WorkspaceKit/Utilities"
    FUNCTION = "pick_frame"
    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("frame_image",)

    @classmethod
    def INPUT_TYPES(cls):
        videos = list_input_videos()
        return {
            "required": {
                "video": (videos or [""],),
                "frame_index": (
                    "INT",
                    {
                        "default": 1,
                        "min": 1,
                        "max": MAX_FRAME_INDEX,
                        "step": 1,
                        "tooltip": "1-based frame selected by the visual Playhead.",
                    },
                ),
            }
        }

    @classmethod
    def VALIDATE_INPUTS(cls, video, frame_index):
        try:
            resolve_input_video(video)
        except ValueError as exc:
            return str(exc)
        if type(frame_index) is not int or frame_index < 1 or frame_index > MAX_FRAME_INDEX:
            return f"frame_index must be a whole number between 1 and {MAX_FRAME_INDEX}."
        return True

    @classmethod
    def IS_CHANGED(cls, video, frame_index):
        try:
            return os.path.getmtime(resolve_input_video(video))
        except (OSError, ValueError):
            return float("nan")

    def pick_frame(self, video, frame_index):
        path = resolve_input_video(video)
        frames = decode_frame_indices(path, [int(frame_index)])
        return (frames_to_image_tensor(frames),)
