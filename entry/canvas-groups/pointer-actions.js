// Semantic pointer actions for WorkspaceKit canvas groups.  Keep gesture
// recognition separate from DOM handling so a future shortcut-settings UI can
// replace these defaults without rewriting canvas event listeners.
export const GROUP_POINTER_ACTION = Object.freeze({
  BYPASS: "group.toggleIgnore",
  MUTE: "group.toggleDisable",
  SELECT: "group.toggleSelection",
});

export const GROUP_POINTER_MODIFIER = Object.freeze({
  CONTROL: "control",
  ALT: "alt",
  SHIFT: "shift",
});

export const GROUP_POINTER_BINDINGS_KEY = "workspace2.canvasGroups.pointerBindings";

export const DEFAULT_GROUP_POINTER_BINDINGS = Object.freeze({
  [GROUP_POINTER_MODIFIER.CONTROL]: GROUP_POINTER_ACTION.BYPASS,
  [GROUP_POINTER_MODIFIER.ALT]: GROUP_POINTER_ACTION.MUTE,
  [GROUP_POINTER_MODIFIER.SHIFT]: GROUP_POINTER_ACTION.SELECT,
});

const MODIFIERS = Object.freeze(Object.values(GROUP_POINTER_MODIFIER));
const ACTIONS = Object.freeze(Object.values(GROUP_POINTER_ACTION));

export function normalizeGroupPointerBindings(candidate) {
  const bindings = candidate && typeof candidate === "object" ? candidate : {};
  const values = MODIFIERS.map((modifier) => bindings[modifier]);
  if (values.every((action) => ACTIONS.includes(action)) && new Set(values).size === ACTIONS.length) {
    return Object.freeze(Object.fromEntries(MODIFIERS.map((modifier) => [modifier, bindings[modifier]])));
  }
  return DEFAULT_GROUP_POINTER_BINDINGS;
}

export function swapGroupPointerBinding(bindings, modifier, nextAction) {
  const current = normalizeGroupPointerBindings(bindings);
  if (!MODIFIERS.includes(modifier) || !ACTIONS.includes(nextAction)) return current;
  const previousModifier = MODIFIERS.find((item) => current[item] === nextAction);
  if (!previousModifier || previousModifier === modifier) return current;
  return Object.freeze({
    ...current,
    [modifier]: nextAction,
    [previousModifier]: current[modifier],
  });
}

export function resolveGroupPointerAction(event, bindings = DEFAULT_GROUP_POINTER_BINDINGS) {
  if (!event || event.button !== 0) return null;
  const hasControl = Boolean(event.ctrlKey || event.metaKey);
  const resolved = normalizeGroupPointerBindings(bindings);

  if (event.shiftKey && !hasControl && !event.altKey) {
    return resolved[GROUP_POINTER_MODIFIER.SHIFT];
  }
  if (hasControl && !event.shiftKey && !event.altKey) {
    return resolved[GROUP_POINTER_MODIFIER.CONTROL];
  }
  if (event.altKey && !hasControl && !event.shiftKey) {
    return resolved[GROUP_POINTER_MODIFIER.ALT];
  }
  return null;
}
