import assert from "node:assert/strict";
import { GROUP_POINTER_ACTION, GROUP_POINTER_MODIFIER, DEFAULT_GROUP_POINTER_BINDINGS, resolveGroupPointerAction, swapGroupPointerBinding } from "../entry/canvas-groups/pointer-actions.js";

const pointer = (overrides = {}) => ({ button: 0, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...overrides });

assert.equal(resolveGroupPointerAction(pointer({ ctrlKey: true })), GROUP_POINTER_ACTION.BYPASS);
assert.equal(resolveGroupPointerAction(pointer({ metaKey: true })), GROUP_POINTER_ACTION.BYPASS);
assert.equal(resolveGroupPointerAction(pointer({ altKey: true })), GROUP_POINTER_ACTION.MUTE);
assert.equal(resolveGroupPointerAction(pointer({ shiftKey: true })), GROUP_POINTER_ACTION.SELECT);
assert.equal(resolveGroupPointerAction(pointer({ ctrlKey: true, shiftKey: true })), null);
assert.equal(resolveGroupPointerAction(pointer({ altKey: true, shiftKey: true })), null);
assert.equal(resolveGroupPointerAction(pointer({ button: 2, ctrlKey: true })), null);
const swapped = swapGroupPointerBinding(DEFAULT_GROUP_POINTER_BINDINGS, GROUP_POINTER_MODIFIER.CONTROL, GROUP_POINTER_ACTION.SELECT);
assert.equal(swapped.control, GROUP_POINTER_ACTION.SELECT);
assert.equal(swapped.shift, GROUP_POINTER_ACTION.BYPASS);
assert.equal(resolveGroupPointerAction(pointer({ ctrlKey: true }), swapped), GROUP_POINTER_ACTION.SELECT);
assert.equal(resolveGroupPointerAction(pointer({ shiftKey: true }), swapped), GROUP_POINTER_ACTION.BYPASS);

console.log("Canvas group pointer actions contract passed.");
