"""Pure-Python contract for WK Latent Size without a running ComfyUI server."""

from __future__ import annotations

import importlib.util
import sys
import types
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = REPO_ROOT / "wk_nodes" / "latent_size.py"
SPEC = importlib.util.spec_from_file_location("wk_latent_size_contract", MODULE_PATH)
module = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(module)


assert module.calculate_dimensions(1.0, "1:1", 64) == (1024, 1024)
width, height = module.calculate_dimensions(1.0, "16:9", 64)
assert (width, height) == (1344, 768)
assert width % 64 == 0 and height % 64 == 0
assert module.calculate_dimensions(0.5, "3:4", 32)[0] % 32 == 0
assert set(module.ASPECT_RATIOS) == {
    "1:1", "2:3", "3:4", "3:5", "4:5", "5:7", "5:8", "7:9",
    "9:16", "9:19", "9:21", "9:32", "3:2", "4:3", "5:3", "5:4",
    "7:5", "8:5", "9:7", "16:9", "19:9", "21:9", "32:9",
}

for invalid in ("", "16", "0:1", "-1:1", "x:y", "1:0"):
    try:
        module.parse_aspect_ratio(invalid)
    except ValueError:
        pass
    else:
        raise AssertionError(f"Invalid ratio was accepted: {invalid!r}")


class FakeTorch:
    @staticmethod
    def zeros(shape, device):
        return {"shape": shape, "device": device}


fake_comfy = types.ModuleType("comfy")
fake_model_management = types.ModuleType("comfy.model_management")
fake_model_management.intermediate_device = lambda: "contract-device"
fake_comfy.model_management = fake_model_management
previous_torch = sys.modules.get("torch")
previous_comfy = sys.modules.get("comfy")
previous_model_management = sys.modules.get("comfy.model_management")
sys.modules["torch"] = FakeTorch
sys.modules["comfy"] = fake_comfy
sys.modules["comfy.model_management"] = fake_model_management
try:
    result = module.WKLatentSize().create_latent("1.0", "1:1", "64", 3, True, "4:3")
finally:
    for key, previous in (("torch", previous_torch), ("comfy", previous_comfy), ("comfy.model_management", previous_model_management)):
        if previous is None:
            sys.modules.pop(key, None)
        else:
            sys.modules[key] = previous

latent, width, height, resolution = result
assert latent["samples"]["shape"] == [3, 4, height // 8, width // 8]
assert latent["samples"]["device"] == "contract-device"
assert (width, height, resolution) == (1152, 896, "1152 × 896")
print("WK Latent Size contract passed")
