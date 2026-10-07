"""Pure-Python contracts for WK's integer and float generator outputs."""

from __future__ import annotations

import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "wk_nodes" / "number_generators.py"
SPEC = importlib.util.spec_from_file_location("wk_number_generators_contract", MODULE_PATH)
assert SPEC and SPEC.loader
module = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(module)


integer = module.WKIntegerGenerator()
floating = module.WKFloatGenerator()
assert module.WKIntegerGenerator.RETURN_TYPES == ("INT", "STRING")
assert module.WKFloatGenerator.RETURN_TYPES == ("FLOAT", "STRING")
assert integer.generate(-4, -4, 2, 1) == (-4, "-4")
assert integer.generate(2, -4, 2, 1) == (2, "2")
assert integer.generate(5, -4, 2, 1) == (2, "2")
assert integer.generate(-9, -4, 2, 1) == (-4, "-4")
assert floating.generate(-4.0, -4.0, 2.0, 0.1, 1) == (-4.0, "-4.0")
assert floating.generate(2.0, -4.0, 2.0, 0.1, 1) == (2.0, "2.0")
assert floating.generate(0.3, -4.0, 2.0, 0.1, 1) == (0.3, "0.3")
assert floating.generate(0.30000000000000004, -4.0, 2.0, 0.1, 1) == (0.3, "0.3")
assert floating.generate(2.5, -4.0, 2.0, 0.1, 1) == (2.0, "2.0")
assert floating.generate(0.12, 0.0, 1.0, 0.01, 2) == (0.12, "0.12")


def rejects(call, *args):
    try:
        call(*args)
    except ValueError:
        return
    raise AssertionError(f"Invalid inputs were accepted: {args!r}")


rejects(integer.generate, 0, 2, -4, 1)
rejects(integer.generate, 0, -4, 2, 0)
rejects(floating.generate, 0.0, 2.0, -4.0, 0.1, 1)
rejects(floating.generate, 0.0, -4.0, 2.0, 0.0, 1)
rejects(floating.generate, 0.0, -4.0, 2.0, 0.01, 1)
rejects(floating.generate, 0.05, -4.0, 2.0, 0.1, 1)
rejects(floating.generate, float("nan"), -4.0, 2.0, 0.1, 1)

print("WK number generator backend contracts passed")
