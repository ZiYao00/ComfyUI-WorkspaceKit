"""WK number generators with matching numeric and text outputs.

The optional browser control updates ``value`` before a prompt is queued.
The backend remains a deterministic value converter for API workflows.
"""

from __future__ import annotations

from decimal import Decimal, InvalidOperation


INTEGER_LIMIT = 1_000_000_000
FLOAT_LIMIT = 1_000_000.0


class WKIntegerGenerator:
    CATEGORY = "🧩 WorkspaceKit/Utilities"
    FUNCTION = "generate"
    RETURN_TYPES = ("INT", "STRING")
    RETURN_NAMES = ("integer", "string")

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "value": ("INT", {"default": 0, "min": -INTEGER_LIMIT, "max": INTEGER_LIMIT, "step": 1}),
                "min_value": ("INT", {"default": -4, "min": -INTEGER_LIMIT, "max": INTEGER_LIMIT, "step": 1}),
                "max_value": ("INT", {"default": 2, "min": -INTEGER_LIMIT, "max": INTEGER_LIMIT, "step": 1}),
                "step": ("INT", {"default": 1, "min": 1, "max": INTEGER_LIMIT, "step": 1}),
            }
        }

    def generate(self, value, min_value, max_value, step):
        if not all(type(item) is int for item in (value, min_value, max_value, step)):
            raise ValueError("Integer generator inputs must be whole numbers.")
        if min_value > max_value:
            raise ValueError("Minimum value must not exceed maximum value.")
        if step <= 0:
            raise ValueError("Step must be greater than zero.")
        selected = min(max(value, min_value), max_value)
        return (selected, str(selected))


def _decimal(value, label, places):
    try:
        number = Decimal(str(value))
    except (InvalidOperation, ValueError):
        raise ValueError(f"{label} must be a finite number.") from None
    if not number.is_finite():
        raise ValueError(f"{label} must be a finite number.")
    rounded = number.quantize(Decimal(1).scaleb(-places))
    tolerance = max(Decimal("1e-12"), abs(number) * Decimal("1e-15"))
    if abs(number - rounded) > tolerance:
        raise ValueError(f"{label} exceeds the selected decimal precision.")
    return rounded


class WKFloatGenerator:
    CATEGORY = "🧩 WorkspaceKit/Utilities"
    FUNCTION = "generate"
    RETURN_TYPES = ("FLOAT", "STRING")
    RETURN_NAMES = ("float", "string")

    @classmethod
    def INPUT_TYPES(cls):
        float_options = {"min": -FLOAT_LIMIT, "max": FLOAT_LIMIT, "step": 0.1}
        return {
            "required": {
                "value": ("FLOAT", {"default": 0.0, **float_options}),
                "min_value": ("FLOAT", {"default": -4.0, **float_options}),
                "max_value": ("FLOAT", {"default": 2.0, **float_options}),
                "step": ("FLOAT", {"default": 0.1, "min": 0.000001, "max": FLOAT_LIMIT, "step": 0.1}),
                "decimal_places": ("INT", {"default": 1, "min": 1, "max": 6, "step": 1}),
            }
        }

    def generate(self, value, min_value, max_value, step, decimal_places):
        if type(decimal_places) is not int or not 1 <= decimal_places <= 6:
            raise ValueError("Decimal places must be an integer from 1 to 6.")
        minimum = _decimal(min_value, "Minimum value", decimal_places)
        maximum = _decimal(max_value, "Maximum value", decimal_places)
        current = _decimal(value, "Value", decimal_places)
        increment = _decimal(step, "Step", decimal_places)
        if minimum > maximum:
            raise ValueError("Minimum value must not exceed maximum value.")
        if increment <= 0:
            raise ValueError("Step must be greater than zero.")
        selected = min(max(current, minimum), maximum)
        if selected == 0:
            selected = Decimal(0)
        text = f"{selected:.{decimal_places}f}"
        return (float(selected), text)
