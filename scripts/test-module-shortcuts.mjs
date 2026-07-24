import assert from "node:assert/strict";
import {
  MODULE_SHORTCUTS,
  isModuleShortcutEnabled,
  moduleShortcutStorageKey,
  resolveModuleShortcut,
} from "../entry/ui/module-shortcuts.js";

const keyEvent = (code, extra = {}) => ({ code, shiftKey: true, ctrlKey: false, altKey: false, metaKey: false, ...extra });

assert.deepEqual(MODULE_SHORTCUTS.map((shortcut) => shortcut.id), ["workflows", "nodes", "templates", "extension"]);
assert.equal(resolveModuleShortcut(keyEvent("Digit1")).moduleId, "workflows");
assert.equal(resolveModuleShortcut(keyEvent("KeyW")).id, "workflows");
assert.equal(resolveModuleShortcut(keyEvent("Digit2")).moduleId, "nodes");
assert.equal(resolveModuleShortcut(keyEvent("KeyN")).id, "nodes");
assert.equal(resolveModuleShortcut(keyEvent("Digit3")).moduleId, "templates");
assert.equal(resolveModuleShortcut(keyEvent("Digit4")).moduleId, "pinned-provider");
assert.equal(resolveModuleShortcut(keyEvent("Digit4", { altKey: true })), null);
assert.equal(resolveModuleShortcut(keyEvent("Digit4", { ctrlKey: true })), null);
assert.equal(resolveModuleShortcut({ code: "Digit4", shiftKey: false }), null);
assert.equal(moduleShortcutStorageKey("extension"), "workspace2.shortcuts.modules.extension.enabled");
assert.equal(isModuleShortcutEnabled("nodes", () => null), true);
assert.equal(isModuleShortcutEnabled("nodes", () => "0"), false);

console.log("WorkspaceKit module shortcut contract passed.");
