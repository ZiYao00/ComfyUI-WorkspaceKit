// Semantic pointer actions and configurable mouse gestures for WorkspaceKit
// canvas groups. Gesture persistence lives here so Settings and the canvas
// runtime share one normalization/migration path.

export const GROUP_POINTER_ACTION = Object.freeze({
  BYPASS: "group.toggleIgnore",
  MUTE: "group.toggleDisable",
  SELECT: "group.toggleSelection",
  // Compatibility token used by the legacy modifier -> action settings shape.
  DISABLED: "group.disabled",
});

export const GROUP_POINTER_MODIFIER = Object.freeze({
  CONTROL: "control",
  ALT: "alt",
  SHIFT: "shift",
  NONE: "none",
  DISABLED: "disabled",
});

export const GROUP_POINTER_BUTTON = Object.freeze({
  LEFT: "left",
  MIDDLE: "middle",
  RIGHT: "right",
});

export const GROUP_POINTER_BINDINGS_KEY = "workspace2.canvasGroups.pointerBindings";
export const GROUP_POINTER_BINDINGS_VERSION = 2;

export const GROUP_POINTER_ACTIONS = Object.freeze([
  GROUP_POINTER_ACTION.BYPASS,
  GROUP_POINTER_ACTION.MUTE,
  GROUP_POINTER_ACTION.SELECT,
]);

export const DEFAULT_GROUP_POINTER_BINDINGS = Object.freeze({
  [GROUP_POINTER_ACTION.BYPASS]: Object.freeze({ modifier: GROUP_POINTER_MODIFIER.CONTROL, button: GROUP_POINTER_BUTTON.LEFT }),
  [GROUP_POINTER_ACTION.MUTE]: Object.freeze({ modifier: GROUP_POINTER_MODIFIER.ALT, button: GROUP_POINTER_BUTTON.LEFT }),
  [GROUP_POINTER_ACTION.SELECT]: Object.freeze({ modifier: GROUP_POINTER_MODIFIER.SHIFT, button: GROUP_POINTER_BUTTON.LEFT }),
});

const ACTIVE_MODIFIERS = Object.freeze([
  GROUP_POINTER_MODIFIER.CONTROL,
  GROUP_POINTER_MODIFIER.ALT,
  GROUP_POINTER_MODIFIER.SHIFT,
]);
const ALL_MODIFIERS = Object.freeze([...ACTIVE_MODIFIERS, GROUP_POINTER_MODIFIER.NONE, GROUP_POINTER_MODIFIER.DISABLED]);
const ALL_BUTTONS = Object.freeze(Object.values(GROUP_POINTER_BUTTON));
const BUTTON_NUMBER = Object.freeze({
  [GROUP_POINTER_BUTTON.LEFT]: 0,
  [GROUP_POINTER_BUTTON.MIDDLE]: 1,
  [GROUP_POINTER_BUTTON.RIGHT]: 2,
});

function cloneBinding(binding) {
  return binding ? { modifier: binding.modifier, button: binding.button } : null;
}

function cloneDefaults() {
  return Object.fromEntries(GROUP_POINTER_ACTIONS.map((action) => [action, cloneBinding(DEFAULT_GROUP_POINTER_BINDINGS[action])]));
}

function normalizeGesture(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const modifier = String(candidate.modifier || "");
  const button = String(candidate.button || "");
  if (!ALL_MODIFIERS.includes(modifier) || !ALL_BUTTONS.includes(button)) return null;
  return { modifier, button };
}

function migrateLegacyModifierMap(candidate) {
  if (!candidate || typeof candidate !== "object") return null;
  const looksLegacy = ACTIVE_MODIFIERS.some((modifier) => typeof candidate[modifier] === "string");
  if (!looksLegacy) return null;
  const migrated = cloneDefaults();
  for (const action of GROUP_POINTER_ACTIONS) {
    const modifier = ACTIVE_MODIFIERS.find((item) => candidate[item] === action);
    migrated[action] = modifier
      ? { modifier, button: GROUP_POINTER_BUTTON.LEFT }
      : { modifier: GROUP_POINTER_MODIFIER.DISABLED, button: GROUP_POINTER_BUTTON.LEFT };
  }
  return migrated;
}

export function groupPointerGestureSignature(binding) {
  const value = normalizeGesture(binding);
  if (!value || value.modifier === GROUP_POINTER_MODIFIER.DISABLED) return "";
  return `${value.modifier}|${value.button}`;
}

export function normalizeGroupPointerBindings(candidate) {
  const source = candidate?.bindings && typeof candidate.bindings === "object" ? candidate.bindings : candidate;
  const migrated = migrateLegacyModifierMap(source);
  const raw = migrated || (source && typeof source === "object" ? source : {});
  const normalized = cloneDefaults();
  const seen = new Set();

  for (const action of GROUP_POINTER_ACTIONS) {
    const supplied = Object.prototype.hasOwnProperty.call(raw, action) ? normalizeGesture(raw[action]) : null;
    const gesture = supplied || cloneBinding(DEFAULT_GROUP_POINTER_BINDINGS[action]);
    const signature = groupPointerGestureSignature(gesture);
    if (signature && seen.has(signature)) {
      normalized[action] = { modifier: GROUP_POINTER_MODIFIER.DISABLED, button: gesture.button };
      continue;
    }
    normalized[action] = gesture;
    if (signature) seen.add(signature);
  }
  return normalized;
}

export function readGroupPointerBindings(storage = globalThis.localStorage) {
  let parsed = null;
  try { parsed = JSON.parse(storage?.getItem?.(GROUP_POINTER_BINDINGS_KEY) || ""); } catch { /* defaults */ }
  return normalizeGroupPointerBindings(parsed);
}

export function writeGroupPointerBindings(bindings, storage = globalThis.localStorage) {
  const normalized = normalizeGroupPointerBindings(bindings);
  storage?.setItem?.(GROUP_POINTER_BINDINGS_KEY, JSON.stringify({
    version: GROUP_POINTER_BINDINGS_VERSION,
    bindings: normalized,
  }));
  return normalized;
}

export function resetGroupPointerBindings(storage = globalThis.localStorage) {
  return writeGroupPointerBindings(DEFAULT_GROUP_POINTER_BINDINGS, storage);
}

export function findGroupPointerBindingConflict(action, candidate, bindings) {
  const signature = groupPointerGestureSignature(candidate);
  if (!signature) return null;
  const current = normalizeGroupPointerBindings(bindings);
  return GROUP_POINTER_ACTIONS.find((otherAction) => (
    otherAction !== action && groupPointerGestureSignature(current[otherAction]) === signature
  )) || null;
}

export function setGroupPointerBinding(action, nextBinding, storage = globalThis.localStorage, { clearConflict = false } = {}) {
  if (!GROUP_POINTER_ACTIONS.includes(action)) return readGroupPointerBindings(storage);
  const current = readGroupPointerBindings(storage);
  const normalized = normalizeGesture(nextBinding);
  if (!normalized) return current;
  const conflict = findGroupPointerBindingConflict(action, normalized, current);
  if (conflict && !clearConflict) return current;
  if (conflict) {
    current[conflict] = {
      ...current[conflict],
      modifier: GROUP_POINTER_MODIFIER.DISABLED,
    };
  }
  current[action] = normalized;
  return writeGroupPointerBindings(current, storage);
}

function pointerModifierFromEvent(event) {
  const hasControl = Boolean(event?.ctrlKey || event?.metaKey);
  const active = [
    hasControl ? GROUP_POINTER_MODIFIER.CONTROL : null,
    event?.altKey ? GROUP_POINTER_MODIFIER.ALT : null,
    event?.shiftKey ? GROUP_POINTER_MODIFIER.SHIFT : null,
  ].filter(Boolean);
  if (active.length === 0) return GROUP_POINTER_MODIFIER.NONE;
  if (active.length > 1) return null;
  return active[0];
}

function pointerButtonFromEvent(event) {
  const numeric = Number(event?.button);
  return ALL_BUTTONS.find((button) => BUTTON_NUMBER[button] === numeric) || null;
}

export function resolveGroupPointerAction(event, bindings = DEFAULT_GROUP_POINTER_BINDINGS) {
  if (!event) return null;
  const modifier = pointerModifierFromEvent(event);
  const button = pointerButtonFromEvent(event);
  if (!button || modifier === null) return null;
  const resolved = normalizeGroupPointerBindings(bindings);
  return GROUP_POINTER_ACTIONS.find((action) => {
    const binding = resolved[action];
    return binding.modifier !== GROUP_POINTER_MODIFIER.DISABLED
      && binding.modifier === modifier
      && binding.button === button;
  }) || null;
}

// Backward-compatible adapter for the former modifier -> action UI. New code
// should use setGroupPointerBinding(action, { modifier, button }).
export function swapGroupPointerBinding(bindings, modifier, nextAction) {
  const current = normalizeGroupPointerBindings(bindings);
  if (!ACTIVE_MODIFIERS.includes(modifier)) return current;
  if (nextAction === GROUP_POINTER_ACTION.DISABLED) {
    const existing = GROUP_POINTER_ACTIONS.find((action) => current[action].modifier === modifier && current[action].button === GROUP_POINTER_BUTTON.LEFT);
    if (existing) current[existing] = { ...current[existing], modifier: GROUP_POINTER_MODIFIER.DISABLED };
    return current;
  }
  if (!GROUP_POINTER_ACTIONS.includes(nextAction)) return current;
  const previousAction = GROUP_POINTER_ACTIONS.find((action) => current[action].modifier === modifier && current[action].button === GROUP_POINTER_BUTTON.LEFT);
  const previousModifier = current[nextAction].modifier;
  current[nextAction] = { modifier, button: GROUP_POINTER_BUTTON.LEFT };
  if (previousAction && previousAction !== nextAction) {
    current[previousAction] = {
      modifier: previousModifier === GROUP_POINTER_MODIFIER.NONE ? GROUP_POINTER_MODIFIER.NONE : previousModifier,
      button: GROUP_POINTER_BUTTON.LEFT,
    };
  }
  return normalizeGroupPointerBindings(current);
}
