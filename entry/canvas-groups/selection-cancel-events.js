// Selection cancellation is deliberately separate from pointer actions.  Other
// ComfyUI extensions may listen on document capture and stop propagation, so
// the owning Canvas Groups module installs its listeners on window capture.

const EDITABLE_SELECTOR = "input, textarea, select, [contenteditable='true']";

export function isEditableTarget(target) {
  return Boolean(target?.closest?.(EDITABLE_SELECTOR));
}

export function shouldClearGroupSelectionFromPointerEvent(event, canvas) {
  if (event?.button !== 0 || !canvas) return false;
  // Ctrl/Meta starts ComfyUI's native marquee path. WorkspaceKit observes that
  // same gesture after pointerup, so it must not clear its transient selection
  // before the resulting overlay groups can be added.
  if (event.ctrlKey || event.metaKey) return false;
  if (event.target?.closest?.(".xzg-group-box, .xzg-settings-modal, .workspacekit-dialog")) return false;
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  return path.includes(canvas) || event.target === canvas;
}

export function shouldClearGroupSelectionFromKeyEvent(event, activeElement) {
  return event?.key === "Escape" && !isEditableTarget(activeElement);
}
