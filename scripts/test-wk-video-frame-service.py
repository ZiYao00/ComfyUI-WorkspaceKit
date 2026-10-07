"""Pure-Python contracts for the WK Video Frame Picker service."""

from __future__ import annotations

import importlib.util
from fractions import Fraction
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "service" / "video_frame_service.py"
SPEC = importlib.util.spec_from_file_location("wk_video_frame_service_contract", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(module)


assert module.normalize_frame_indices([1, 2, 7]) == [1, 2, 7]
assert module.frame_to_timestamp(1, 24) == 0.0
assert module.frame_to_timestamp(25, 24) == 1.0
assert module.is_preview_video("clip.mp4") is True
assert module.is_preview_video("clip.WEBM") is True
assert module.is_preview_video("clip.mkv") is False

for invalid in ([], [0], [-1], [1.5], [True], "1,2"):
    try:
        module.normalize_frame_indices(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Invalid frame indices were accepted: {invalid!r}")


class FakeArray:
    def __init__(self, value):
        self.value = value

    def copy(self):
        return self.value


class FakeFrame:
    def __init__(self, value):
        self.value = value

    def to_ndarray(self, format):
        assert format == "rgb24"
        return FakeArray(self.value)


class FakeCodecContext:
    width = 640
    height = 360


class FakeStream:
    type = "video"
    average_rate = Fraction(24, 1)
    guessed_rate = None
    base_rate = None
    duration = 4
    time_base = Fraction(1, 24)
    frames = 4
    codec_context = FakeCodecContext()


class FakeContainer:
    def __init__(self):
        self.streams = [FakeStream()]
        self.duration = None

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def decode(self, stream):
        assert stream.type == "video"
        yield from (FakeFrame(10), FakeFrame(20), FakeFrame(30), FakeFrame(40))


class FakeAv:
    time_base = 1_000_000

    @staticmethod
    def open(_path):
        return FakeContainer()


original_loader = module._load_av
module._load_av = lambda: FakeAv
try:
    fake_path = ROOT / "scripts" / "test-wk-video-frame-service.py"
    metadata = module.probe_video(fake_path)
    assert metadata["fps"] == 24.0
    assert metadata["total_frames"] == 4
    assert metadata["width"] == 640
    assert metadata["height"] == 360
    assert metadata["preview_supported"] is False

    assert module.decode_frame_indices(fake_path, [1, 3, 3]) == [10, 30, 30]
    try:
        module.decode_frame_indices(fake_path, [5])
    except ValueError as exc:
        assert "5" in str(exc)
    else:
        raise AssertionError("Out-of-range frame was accepted")
finally:
    module._load_av = original_loader

print("WK Video Frame Picker service contracts passed")
