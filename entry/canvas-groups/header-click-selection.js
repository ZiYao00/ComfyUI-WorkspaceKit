// Selection semantics for a plain (unmodified) click on a WorkspaceKit group
// header.
//
// The rule is the standard direct-manipulation one: clicking an item that is
// NOT part of the current selection replaces the selection with it; clicking an
// item that IS already selected leaves the selection alone, so the click can
// begin a drag of everything the user had selected.
//
// Getting this wrong is invisible until the drag: before T-036 the header never
// cleared ComfyUI's native node selection, so `startDrag` took its multi-drag
// branch and carried nodes the user had merely clicked earlier somewhere else
// on the canvas.
export const HEADER_CLICK_SELECTION = Object.freeze({
  // Clear the native node selection and every other group, then select this one.
  RESET: "reset",
  // Leave the selection untouched so a multi-item drag can proceed.
  KEEP: "keep",
});

// Modifier gestures belong to `pointer-actions.js` (Shift = multi-select and
// friends, user-remappable). They must never reach the reset path: a modifier
// click's whole purpose is to modify an existing selection, not replace it.
export function hasSelectionModifier(event) {
  if (!event || typeof event !== "object") return false;
  return Boolean(event.shiftKey || event.ctrlKey || event.metaKey || event.altKey);
}

export function resolveHeaderClickSelection(state) {
  const source = state && typeof state === "object" ? state : {};
  if (source.hasModifier) return HEADER_CLICK_SELECTION.KEEP;
  return source.isAlreadySelected
    ? HEADER_CLICK_SELECTION.KEEP
    : HEADER_CLICK_SELECTION.RESET;
}
