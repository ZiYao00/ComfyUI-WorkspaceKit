import assert from "node:assert/strict";

import {
  COMMAND_BINDINGS_STORAGE_KEY,
  WORKSPACE_COMMAND,
  browserReservedShortcut,
  comfyKeybindingConflict,
  defaultCommandBindings,
  findInternalBindingConflict,
  formatKeyCombo,
  keyComboFromEvent,
  readCommandBindings,
  resolveBoundCommand,
  setCommandBinding,
} from "../entry/ui/command-bindings.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    values,
  };
}

const defaults = defaultCommandBindings();
assert.equal(formatKeyCombo(defaults[WORKSPACE_COMMAND.OPEN_WORKFLOWS]), "Shift + 1");
assert.equal(formatKeyCombo(defaults[WORKSPACE_COMMAND.OPEN_NODES]), "Shift + 2");
assert.equal(formatKeyCombo(defaults[WORKSPACE_COMMAND.OPEN_TEMPLATES]), "Shift + 3");
assert.equal(formatKeyCombo(defaults[WORKSPACE_COMMAND.OPEN_LAYOUT]), "Shift + 4");
assert.equal(formatKeyCombo(defaults[WORKSPACE_COMMAND.OPEN_THEME]), "Shift + 5");
assert.equal(formatKeyCombo(defaults[WORKSPACE_COMMAND.SAVE_TEMPLATE]), "Alt + C");
assert.equal(formatKeyCombo(defaults[WORKSPACE_COMMAND.CREATE_GROUP]), "Ctrl + G");
assert.equal(formatKeyCombo(defaults[WORKSPACE_COMMAND.UNGROUP]), "Shift + G");

const shift4 = { code: "Digit4", key: "4", shiftKey: true, ctrlKey: false, altKey: false, metaKey: false };
assert.equal(resolveBoundCommand(shift4, defaults), WORKSPACE_COMMAND.OPEN_LAYOUT);
const shift5 = { code: "Digit5", key: "5", shiftKey: true, ctrlKey: false, altKey: false, metaKey: false };
assert.equal(resolveBoundCommand(shift5, defaults), WORKSPACE_COMMAND.OPEN_THEME);

const captured = keyComboFromEvent({ code: "KeyK", key: "k", ctrlKey: true, shiftKey: true, altKey: false, metaKey: false });
assert.deepEqual(captured, { code: "KeyK", key: "k", ctrl: true, alt: false, shift: true, meta: false });
assert.equal(formatKeyCombo(captured), "Ctrl + Shift + K");
assert.equal(keyComboFromEvent({ code: "ShiftLeft", key: "Shift", shiftKey: true }), null);

assert.equal(
  findInternalBindingConflict(WORKSPACE_COMMAND.OPEN_THEME, defaults[WORKSPACE_COMMAND.OPEN_LAYOUT], defaults),
  WORKSPACE_COMMAND.OPEN_LAYOUT,
);
assert.equal(findInternalBindingConflict(WORKSPACE_COMMAND.OPEN_LAYOUT, defaults[WORKSPACE_COMMAND.OPEN_LAYOUT], defaults), null);

assert.ok(browserReservedShortcut({ code: "KeyW", key: "w", ctrl: true }));
assert.ok(browserReservedShortcut({ code: "KeyW", key: "w", meta: true }));
assert.equal(browserReservedShortcut({ code: "KeyK", key: "k", ctrl: true }), null);

assert.match(comfyKeybindingConflict({ code: "KeyS", key: "s", ctrl: true })?.label || "", /ComfyUI/);
assert.match(comfyKeybindingConflict({ code: "KeyG", key: "g", ctrl: true })?.label || "", /ComfyUI/);
assert.equal(
  comfyKeybindingConflict(
    { code: "KeyS", key: "s", ctrl: true },
    { unsetBindings: [{ combo: { key: "s", ctrl: true } }] },
  ),
  null,
);
const customConflict = comfyKeybindingConflict(
  { code: "KeyK", key: "k", ctrl: true, shift: true },
  { newBindings: [{ combo: { key: "k", ctrl: true, shift: true }, commandId: "Comfy.CustomCommand" }] },
);
assert.equal(customConflict?.source, "comfy-user");
assert.equal(customConflict?.commandId, "Comfy.CustomCommand");

const legacyStorage = createStorage({
  "workspace2.shortcuts.modules.workflows.enabled": "0",
  "workspace2.canvasGroups.ctrlGCreate": "0",
});
const migrated = readCommandBindings(legacyStorage);
assert.equal(migrated[WORKSPACE_COMMAND.OPEN_WORKFLOWS], null);
assert.equal(migrated[WORKSPACE_COMMAND.CREATE_GROUP], null);
assert.equal(formatKeyCombo(migrated[WORKSPACE_COMMAND.OPEN_LAYOUT]), "Shift + 4");

const storage = createStorage();
setCommandBinding(WORKSPACE_COMMAND.OPEN_THEME, captured, storage);
let saved = readCommandBindings(storage);
assert.equal(formatKeyCombo(saved[WORKSPACE_COMMAND.OPEN_THEME]), "Ctrl + Shift + K");
assert.ok(storage.getItem(COMMAND_BINDINGS_STORAGE_KEY)?.includes('"version":1'));
setCommandBinding(WORKSPACE_COMMAND.OPEN_THEME, null, storage);
saved = readCommandBindings(storage);
assert.equal(saved[WORKSPACE_COMMAND.OPEN_THEME], null);

console.log("WorkspaceKit unified command bindings contract passed.");
