export const LAYOUT_TOPBAR_ENABLED_KEY = "workspacekit.layout.topbar.enabled";
export const LAYOUT_SPACING_KEY = "workspacekit.layout.spacing";
export const LAYOUT_PREFERENCES_MIGRATED_KEY = "workspacekit.layout.preferences.v2.migrated";

function read(storage, key) {
  try { return storage?.getItem?.(key) ?? null; } catch { return null; }
}

function write(storage, key, value) {
  try {
    storage?.setItem?.(key, String(value));
    return true;
  } catch {
    return false;
  }
}

export function migrateLegacyLayoutPreferences(storage = globalThis.localStorage) {
  if (!storage || read(storage, LAYOUT_PREFERENCES_MIGRATED_KEY) === "1") {
    return Object.freeze({ migrated: false });
  }
  const existing = read(storage, LAYOUT_TOPBAR_ENABLED_KEY);
  if (existing === null) {
    const hidden = read(storage, "WorkspaceKitLayoutControlsHidden")
      ?? read(storage, "WorkspaceKitLayoutFloatingToolbarHidden");
    const mode = read(storage, "WorkspaceKitLayoutPresentationMode")
      ?? read(storage, "NodeAlignerToolbarMode")
      ?? (read(storage, "NodeAlignerIsPermanent") === "1" ? "pinned" : "top");
    write(storage, LAYOUT_TOPBAR_ENABLED_KEY, hidden === "1" ? "0" : "1");
    write(storage, LAYOUT_PREFERENCES_MIGRATED_KEY, "1");
    return Object.freeze({ migrated: true, source: `${mode}:${hidden === "1" ? "hidden" : "visible"}` });
  }
  write(storage, LAYOUT_PREFERENCES_MIGRATED_KEY, "1");
  return Object.freeze({ migrated: false, source: "existing-v2" });
}

export function isLayoutTopbarEnabled(storage = globalThis.localStorage) {
  return read(storage, LAYOUT_TOPBAR_ENABLED_KEY) !== "0";
}

export function setLayoutTopbarEnabled(enabled, storage = globalThis.localStorage) {
  return write(storage, LAYOUT_TOPBAR_ENABLED_KEY, enabled ? "1" : "0");
}

export function readLayoutSpacing(storage = globalThis.localStorage, fallback = 32) {
  const numeric = Number(read(storage, LAYOUT_SPACING_KEY));
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.min(2000, numeric);
}

export function setLayoutSpacing(value, storage = globalThis.localStorage) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return false;
  return write(storage, LAYOUT_SPACING_KEY, Math.min(2000, numeric));
}
