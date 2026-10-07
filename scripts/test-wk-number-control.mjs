import assert from "node:assert/strict";
import {
  nextIntegerValue,
  nextFloatValue,
} from "../entry/nodes/number-control-math.js";

const integer = { current: 0, min: -4, max: 2, step: 1 };
assert.equal(nextIntegerValue({ ...integer, mode: "fixed" }), 0);
assert.equal(nextIntegerValue({ ...integer, mode: "increment" }), 1);
assert.equal(nextIntegerValue({ ...integer, mode: "decrement" }), -1);
assert.equal(nextIntegerValue({ ...integer, mode: "randomize" }, () => 0), -4);
assert.equal(nextIntegerValue({ ...integer, mode: "randomize" }, () => 1 - Number.EPSILON), 2);
assert.deepEqual(
  Array.from({ length: 7 }, (_, index) =>
    nextIntegerValue({ ...integer, mode: "randomize" }, () => (index + 0.5) / 7)),
  [-4, -3, -2, -1, 0, 1, 2],
);
assert.equal(nextIntegerValue({ ...integer, current: 2, mode: "increment" }), 2);
assert.equal(nextIntegerValue({ ...integer, current: -4, mode: "decrement" }), -4);
assert.equal(nextIntegerValue({ ...integer, current: 9, mode: "fixed" }), 2);

const floating = { current: 0, min: -4, max: 2, step: 0.1, decimalPlaces: 1 };
assert.equal(nextFloatValue({ ...floating, mode: "increment" }), 0.1);
assert.equal(nextFloatValue({ ...floating, current: 0.3, mode: "increment" }), 0.4);
assert.equal(nextFloatValue({ ...floating, current: 0.3, mode: "decrement" }), 0.2);
assert.equal(nextFloatValue({ ...floating, mode: "randomize" }, () => 0), -4);
assert.equal(nextFloatValue({ ...floating, mode: "randomize" }, () => 1 - Number.EPSILON), 2);
assert.deepEqual(
  Array.from({ length: 61 }, (_, index) =>
    nextFloatValue({ ...floating, mode: "randomize" }, () => (index + 0.5) / 61)),
  Array.from({ length: 61 }, (_, index) => Number((-4 + index / 10).toFixed(1))),
);
assert.equal(nextFloatValue({ ...floating, current: 2, mode: "increment" }), 2);
assert.equal(nextFloatValue({ ...floating, current: -4, mode: "decrement" }), -4);

for (const bad of [
  { ...integer, min: 2, max: -4, mode: "fixed" },
  { ...integer, step: 0, mode: "increment" },
]) {
  assert.throws(() => nextIntegerValue(bad), RangeError);
}
for (const bad of [
  { ...floating, min: 2, max: -4, mode: "fixed" },
  { ...floating, step: 0, mode: "increment" },
  { ...floating, step: 0.01, mode: "increment" },
  { ...floating, current: 0.05, mode: "fixed" },
]) {
  assert.throws(() => nextFloatValue(bad), RangeError);
}

console.log("WK number control contracts passed");
