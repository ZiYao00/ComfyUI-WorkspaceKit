import assert from "node:assert/strict";
import {
  GROUP_POINTER_ACTION,
  GROUP_POINTER_BINDINGS_KEY,
  GROUP_POINTER_BUTTON,
  GROUP_POINTER_MODIFIER,
  DEFAULT_GROUP_POINTER_BINDINGS,
  findGroupPointerBindingConflict,
  normalizeGroupPointerBindings,
  readGroupPointerBindings,
  resolveGroupPointerAction,
  setGroupPointerBinding,
} from "../entry/canvas-groups/pointer-actions.js";

const pointer = (overrides = {}) => ({ button: 0, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...overrides });
const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    values,
  };
};

assert.equal(resolveGroupPointerAction(pointer({ ctrlKey: true })), GROUP_POINTER_ACTION.BYPASS);
assert.equal(resolveGroupPointerAction(pointer({ metaKey: true })), GROUP_POINTER_ACTION.BYPASS);
assert.equal(resolveGroupPointerAction(pointer({ altKey: true })), GROUP_POINTER_ACTION.MUTE);
assert.equal(resolveGroupPointerAction(pointer({ shiftKey: true })), GROUP_POINTER_ACTION.SELECT);
assert.equal(resolveGroupPointerAction(pointer({ ctrlKey: true, shiftKey: true })), null);
assert.equal(resolveGroupPointerAction(pointer({ altKey: true, shiftKey: true })), null);
assert.equal(resolveGroupPointerAction(pointer({ button: 2, ctrlKey: true })), null);

const customized = normalizeGroupPointerBindings({
  ...DEFAULT_GROUP_POINTER_BINDINGS,
  [GROUP_POINTER_ACTION.BYPASS]: { modifier: GROUP_POINTER_MODIFIER.NONE, button: GROUP_POINTER_BUTTON.RIGHT },
});
assert.equal(resolveGroupPointerAction(pointer({ button: 2 }), customized), GROUP_POINTER_ACTION.BYPASS);
assert.equal(resolveGroupPointerAction(pointer({ button: 2, ctrlKey: true }), customized), null);

// Partial/manual storage must still be normalized against the untouched defaults.
// Rebinding Select to Ctrl+Left conflicts with the default Ignore gesture, so the
// later binding is disabled instead of leaving two actions on one gesture.
const partialConflict = normalizeGroupPointerBindings({
  [GROUP_POINTER_ACTION.SELECT]: { modifier: GROUP_POINTER_MODIFIER.CONTROL, button: GROUP_POINTER_BUTTON.LEFT },
});
assert.equal(partialConflict[GROUP_POINTER_ACTION.BYPASS].modifier, GROUP_POINTER_MODIFIER.CONTROL);
assert.equal(partialConflict[GROUP_POINTER_ACTION.SELECT].modifier, GROUP_POINTER_MODIFIER.DISABLED);

const disabled = normalizeGroupPointerBindings({
  ...DEFAULT_GROUP_POINTER_BINDINGS,
  [GROUP_POINTER_ACTION.BYPASS]: { modifier: GROUP_POINTER_MODIFIER.DISABLED, button: GROUP_POINTER_BUTTON.LEFT },
});
assert.equal(resolveGroupPointerAction(pointer({ ctrlKey: true }), disabled), null);
assert.equal(resolveGroupPointerAction(pointer({ altKey: true }), disabled), GROUP_POINTER_ACTION.MUTE);

const legacy = normalizeGroupPointerBindings({
  control: GROUP_POINTER_ACTION.SELECT,
  alt: GROUP_POINTER_ACTION.MUTE,
  shift: GROUP_POINTER_ACTION.BYPASS,
});
assert.deepEqual(legacy[GROUP_POINTER_ACTION.SELECT], { modifier: GROUP_POINTER_MODIFIER.CONTROL, button: GROUP_POINTER_BUTTON.LEFT });
assert.deepEqual(legacy[GROUP_POINTER_ACTION.BYPASS], { modifier: GROUP_POINTER_MODIFIER.SHIFT, button: GROUP_POINTER_BUTTON.LEFT });
assert.equal(resolveGroupPointerAction(pointer({ ctrlKey: true }), legacy), GROUP_POINTER_ACTION.SELECT);
assert.equal(resolveGroupPointerAction(pointer({ shiftKey: true }), legacy), GROUP_POINTER_ACTION.BYPASS);

assert.equal(
  findGroupPointerBindingConflict(
    GROUP_POINTER_ACTION.SELECT,
    { modifier: GROUP_POINTER_MODIFIER.CONTROL, button: GROUP_POINTER_BUTTON.LEFT },
    DEFAULT_GROUP_POINTER_BINDINGS,
  ),
  GROUP_POINTER_ACTION.BYPASS,
);

const storage = createStorage();
setGroupPointerBinding(
  GROUP_POINTER_ACTION.SELECT,
  { modifier: GROUP_POINTER_MODIFIER.CONTROL, button: GROUP_POINTER_BUTTON.LEFT },
  storage,
  { clearConflict: true },
);
const persisted = readGroupPointerBindings(storage);
assert.deepEqual(persisted[GROUP_POINTER_ACTION.SELECT], { modifier: GROUP_POINTER_MODIFIER.CONTROL, button: GROUP_POINTER_BUTTON.LEFT });
assert.equal(persisted[GROUP_POINTER_ACTION.BYPASS].modifier, GROUP_POINTER_MODIFIER.DISABLED);
assert.ok(storage.getItem(GROUP_POINTER_BINDINGS_KEY)?.includes('"version":2'));

console.log("Canvas group pointer actions contract passed.");
