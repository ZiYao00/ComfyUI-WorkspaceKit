const MODES = new Set(["fixed", "increment", "decrement", "randomize"]);

function requireMode(mode) {
  if (!MODES.has(mode)) throw new RangeError(`Unsupported number control mode: ${mode}`);
}

function requireRandomUnit(randomUnit) {
  const value = randomUnit();
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new RangeError("Random source must return a number in [0, 1).");
  }
  return value;
}

function chooseNext({ current, min, max, step, mode }, randomUnit) {
  const bounded = Math.min(Math.max(current, min), max);
  if (mode === "fixed") return bounded;
  if (mode === "increment") return Math.min(bounded + step, max);
  if (mode === "decrement") return Math.max(bounded - step, min);
  return min + Math.floor(requireRandomUnit(randomUnit) * (max - min + 1));
}

export function nextIntegerValue({ current, min, max, step, mode }, randomUnit = Math.random) {
  requireMode(mode);
  if (![current, min, max, step].every(Number.isSafeInteger)
    || min > max || step <= 0 || !Number.isSafeInteger(max - min + 1)) {
    throw new RangeError("Integer range, current value, or step is invalid.");
  }
  return chooseNext({ current, min, max, step, mode }, randomUnit);
}

function toTick(value, scale) {
  if (!Number.isFinite(value)) throw new RangeError("Float values must be finite.");
  const raw = value * scale;
  const tick = Math.round(raw);
  const tolerance = Math.max(1e-8, Number.EPSILON * Math.abs(raw) * 8);
  if (!Number.isSafeInteger(tick) || Math.abs(raw - tick) > tolerance) {
    throw new RangeError("Float value exceeds the selected decimal precision.");
  }
  return tick;
}

export function nextFloatValue(
  { current, min, max, step, decimalPlaces, mode },
  randomUnit = Math.random,
) {
  requireMode(mode);
  if (!Number.isInteger(decimalPlaces) || decimalPlaces < 1 || decimalPlaces > 6) {
    throw new RangeError("Decimal places must be from 1 to 6.");
  }
  const scale = 10 ** decimalPlaces;
  const ticks = {
    current: toTick(current, scale),
    min: toTick(min, scale),
    max: toTick(max, scale),
    step: toTick(step, scale),
    mode,
  };
  if (ticks.min > ticks.max || ticks.step <= 0
    || !Number.isSafeInteger(ticks.max - ticks.min + 1)) {
    throw new RangeError("Float range or step is invalid.");
  }
  const selected = chooseNext(ticks, randomUnit);
  return Number((selected / scale).toFixed(decimalPlaces));
}
