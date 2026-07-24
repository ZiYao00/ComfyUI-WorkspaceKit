// Pure policy for the configurable WorkspaceKit module shortcuts. The caller
// owns storage and sidebar activation; this module deliberately knows nothing
// about ComfyUI DOM or registered Providers.

export const MODULE_SHORTCUTS = Object.freeze([
  Object.freeze({ id: "workflows", moduleId: "workflows", codes: Object.freeze(["Digit1", "KeyW"]) }),
  Object.freeze({ id: "nodes", moduleId: "nodes", codes: Object.freeze(["Digit2", "KeyN"]) }),
  Object.freeze({ id: "templates", moduleId: "templates", codes: Object.freeze(["Digit3"]) }),
  // The fourth shortcut always follows the user's currently pinned Provider.
  Object.freeze({ id: "extension", moduleId: "pinned-provider", codes: Object.freeze(["Digit4"]) }),
]);

export const MODULE_SHORTCUT_ENABLED_PREFIX = "workspace2.shortcuts.modules.";

export function moduleShortcutStorageKey(shortcutId) {
  return `${MODULE_SHORTCUT_ENABLED_PREFIX}${String(shortcutId || "")}.enabled`;
}

export function isModuleShortcutEnabled(shortcutId, readValue) {
  return readValue?.(moduleShortcutStorageKey(shortcutId)) !== "0";
}

export function resolveModuleShortcut(event) {
  if (!event?.shiftKey || event.ctrlKey || event.altKey || event.metaKey) return null;
  const code = String(event.code || "");
  return MODULE_SHORTCUTS.find((shortcut) => shortcut.codes.includes(code)) ?? null;
}
