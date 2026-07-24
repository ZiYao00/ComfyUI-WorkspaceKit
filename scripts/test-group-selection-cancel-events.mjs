import assert from "node:assert/strict";
import {
  isEditableTarget,
  shouldClearGroupSelectionFromKeyEvent,
  shouldClearGroupSelectionFromPointerEvent,
} from "../entry/canvas-groups/selection-cancel-events.js";

const canvas = { id: "graph-canvas" };
const plainTarget = { closest: () => null };
const groupTarget = { closest: (selector) => selector.includes(".xzg-group-box") ? {} : null };
const inputTarget = { closest: (selector) => selector.includes("input") ? {} : null };
const pointer = (target, { button = 0, path = [target, canvas] } = {}) => ({
  button,
  target,
  composedPath: () => path,
});

assert.equal(shouldClearGroupSelectionFromPointerEvent(pointer(plainTarget), canvas), true);
assert.equal(shouldClearGroupSelectionFromPointerEvent(pointer(groupTarget), canvas), false);
assert.equal(shouldClearGroupSelectionFromPointerEvent(pointer(plainTarget, { button: 2 }), canvas), false);
assert.equal(shouldClearGroupSelectionFromPointerEvent(pointer(plainTarget, { path: [plainTarget] }), canvas), false);
assert.equal(shouldClearGroupSelectionFromPointerEvent(pointer(plainTarget), null), false);
assert.equal(isEditableTarget(inputTarget), true);
assert.equal(shouldClearGroupSelectionFromKeyEvent({ key: "Escape" }, plainTarget), true);
assert.equal(shouldClearGroupSelectionFromKeyEvent({ key: "Escape" }, inputTarget), false);
assert.equal(shouldClearGroupSelectionFromKeyEvent({ key: "Enter" }, plainTarget), false);

console.log("Canvas group selection-cancel event contract passed.");
