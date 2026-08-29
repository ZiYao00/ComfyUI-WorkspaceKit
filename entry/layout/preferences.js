export const LAYOUT_PRESENTATION_MODE_KEY = "workspacekit.layout.presentation.mode";
export const LAYOUT_TOPBAR_ENABLED_KEY = "workspacekit.layout.topbar.enabled";
export const LAYOUT_COMMAND_ICON_SIZE_KEY = "workspacekit.layout.command-icon-size";
export const LAYOUT_FLOATING_POSITION_KEY = "workspacekit.layout.floating.position";
export const LAYOUT_SPACING_KEY = "workspacekit.layout.spacing";
export const LAYOUT_PREFERENCES_MIGRATED_KEY = "workspacekit.layout.preferences.v3.migrated";

const LEGACY_LAYOUT_MODE_KEY = "WorkspaceKitLayoutPresentationMode";
const LEGACY_NODEALIGNER_MODE_KEY = "NodeAlignerToolbarMode";
const LEGACY_NODEALIGNER_PERMANENT_KEY = "NodeAlignerIsPermanent";
const LEGACY_LAYOUT_HIDDEN_KEY = "WorkspaceKitLayoutControlsHidden";
const LEGACY_FLOATING_HIDDEN_KEY = "WorkspaceKitLayoutFloatingToolbarHidden";
const LEGACY_ICON_SIZE_KEY = "WorkspaceKitLayoutCommandIconSize";
const LEGACY_POSITION_KEY = "NodeAlignerButtonContainerPosition";

export const LAYOUT_PRESENTATION_MODES = Object.freeze(["top", "selection", "pinned", "none"]);
export const LAYOUT_COMMAND_ICON_SIZE_MIN = 18;
export const LAYOUT_COMMAND_ICON_SIZE_MAX = 25;
export const LAYOUT_COMMAND_ICON_SIZE_DEFAULT = 22;

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

function normalizeMode(value, fallback = "top") {
  return LAYOUT_PRESENTATION_MODES.includes(value) ? value : fallback;
}

function numericIconSize(value, fallback = LAYOUT_COMMAND_ICON_SIZE_DEFAULT) {
  if (value == null || (typeof value === "string" && !value.trim())) return fallback;
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(LAYOUT_COMMAND_ICON_SIZE_MAX, Math.max(LAYOUT_COMMAND_ICON_SIZE_MIN, numeric));
}

function legacyMode(storage) {
  const mode = read(storage, LEGACY_LAYOUT_MODE_KEY) ?? read(storage, LEGACY_NODEALIGNER_MODE_KEY);
  if (["top", "selection", "pinned"].includes(mode)) return mode;
  const permanent = read(storage, LEGACY_NODEALIGNER_PERMANENT_KEY);
  if (permanent === "1") return "pinned";
  if (permanent === "0") return "selection";
  return null;
}

function legacyHidden(storage) {
  return (read(storage, LEGACY_LAYOUT_HIDDEN_KEY) ?? read(storage, LEGACY_FLOATING_HIDDEN_KEY)) === "1";
}

export function readLayoutPresentationMode(storage = globalThis.localStorage) {
  const explicit = read(storage, LAYOUT_PRESENTATION_MODE_KEY);
  if (LAYOUT_PRESENTATION_MODES.includes(explicit)) return explicit;

  // The v2 boolean was the first unified WorkspaceKit preference and must win
  // over older standalone Layout/NodeAligner state if it was explicitly saved.
  const topbar = read(storage, LAYOUT_TOPBAR_ENABLED_KEY);
  if (topbar === "1") return "top";
  if (topbar === "0") return "none";

  const mode = legacyMode(storage);
  if (legacyHidden(storage)) return "none";
  return normalizeMode(mode, "top");
}

export function setLayoutPresentationMode(mode, storage = globalThis.localStorage) {
  const normalized = normalizeMode(mode, "top");
  const modeWritten = write(storage, LAYOUT_PRESENTATION_MODE_KEY, normalized);
  // Keep the v2 compatibility key synchronized while older builds may still be
  // opened against the same browser profile. Only the real top placement maps
  // to enabled; selection/pinned/none are non-top presentation modes.
  const topbarWritten = write(storage, LAYOUT_TOPBAR_ENABLED_KEY, normalized === "top" ? "1" : "0");
  return modeWritten && topbarWritten;
}

export function readLayoutCommandIconSize(storage = globalThis.localStorage) {
  const current = read(storage, LAYOUT_COMMAND_ICON_SIZE_KEY);
  if (current !== null) return numericIconSize(current);
  return numericIconSize(read(storage, LEGACY_ICON_SIZE_KEY));
}

export function setLayoutCommandIconSize(value, storage = globalThis.localStorage) {
  const numeric = numericIconSize(value, NaN);
  if (!Number.isFinite(numeric)) return false;
  return write(storage, LAYOUT_COMMAND_ICON_SIZE_KEY, numeric);
}

export function readLayoutFloatingPosition(storage = globalThis.localStorage) {
  const raw = read(storage, LAYOUT_FLOATING_POSITION_KEY) ?? read(storage, LEGACY_POSITION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function setLayoutFloatingPosition(position, storage = globalThis.localStorage) {
  if (!position || typeof position !== "object") return false;
  const left = Number(position.left);
  const top = Number(position.top);
  if (!Number.isFinite(left) || !Number.isFinite(top)) return false;
  return write(storage, LAYOUT_FLOATING_POSITION_KEY, JSON.stringify({ left, top }));
}

export function resetLayoutFloatingPosition(storage = globalThis.localStorage) {
  // Writing an explicit default marker prevents a stale NodeAligner position
  // from being re-read through the legacy fallback after the user resets it.
  return write(storage, LAYOUT_FLOATING_POSITION_KEY, JSON.stringify({ default: true }));
}

export function layoutPresentationSnapshot(storage = globalThis.localStorage) {
  return Object.freeze({
    mode: readLayoutPresentationMode(storage),
    iconSize: readLayoutCommandIconSize(storage),
    floatingPosition: readLayoutFloatingPosition(storage),
  });
}

export function emitLayoutPresentationChanged(document = globalThis.document, storage = globalThis.localStorage) {
  const EventCtor = document?.defaultView?.CustomEvent ?? globalThis.CustomEvent;
  if (typeof document?.dispatchEvent !== "function" || typeof EventCtor !== "function") return false;
  document.dispatchEvent(new EventCtor("workspacekit-layout:presentation-changed", {
    detail: layoutPresentationSnapshot(storage),
  }));
  return true;
}

export function migrateLegacyLayoutPreferences(storage = globalThis.localStorage) {
  if (!storage || read(storage, LAYOUT_PREFERENCES_MIGRATED_KEY) === "1") {
    return Object.freeze({ migrated: false });
  }

  const explicitMode = read(storage, LAYOUT_PRESENTATION_MODE_KEY);
  const explicitTopbar = read(storage, LAYOUT_TOPBAR_ENABLED_KEY);
  const oldMode = legacyMode(storage);
  const hidden = legacyHidden(storage);

  let mode = "top";
  let source = "default:top";
  if (LAYOUT_PRESENTATION_MODES.includes(explicitMode)) {
    mode = explicitMode;
    source = `current:${mode}`;
  } else if (explicitTopbar === "1" || explicitTopbar === "0") {
    mode = explicitTopbar === "1" ? "top" : "none";
    source = `topbar:${explicitTopbar === "1" ? "visible" : "hidden"}`;
  } else if (oldMode) {
    mode = hidden ? "none" : oldMode;
    source = `${oldMode}:${hidden ? "hidden" : "visible"}`;
  } else if (hidden) {
    mode = "none";
    source = "legacy:hidden";
  }
  setLayoutPresentationMode(mode, storage);

  if (read(storage, LAYOUT_COMMAND_ICON_SIZE_KEY) === null) {
    const legacySize = read(storage, LEGACY_ICON_SIZE_KEY);
    if (legacySize !== null) setLayoutCommandIconSize(legacySize, storage);
  }
  if (read(storage, LAYOUT_FLOATING_POSITION_KEY) === null) {
    const legacyPosition = read(storage, LEGACY_POSITION_KEY);
    if (legacyPosition) write(storage, LAYOUT_FLOATING_POSITION_KEY, legacyPosition);
  }

  write(storage, LAYOUT_PREFERENCES_MIGRATED_KEY, "1");
  return Object.freeze({ migrated: true, source, mode });
}

export function isLayoutTopbarEnabled(storage = globalThis.localStorage) {
  return readLayoutPresentationMode(storage) === "top";
}

export function setLayoutTopbarEnabled(enabled, storage = globalThis.localStorage) {
  return setLayoutPresentationMode(enabled ? "top" : "none", storage);
}

export function readLayoutSpacing(storage = globalThis.localStorage, fallback = 32) {
  const raw = read(storage, LAYOUT_SPACING_KEY);
  if (raw == null || (typeof raw === "string" && !raw.trim())) return fallback;
  const numeric = Number(raw);
  if (!Number.isFinite(numeric) || numeric < 0) return fallback;
  return Math.min(2000, numeric);
}

export function setLayoutSpacing(value, storage = globalThis.localStorage) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0) return false;
  return write(storage, LAYOUT_SPACING_KEY, Math.min(2000, numeric));
}
