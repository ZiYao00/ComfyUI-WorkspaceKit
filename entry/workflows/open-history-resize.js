/**
 * Pointer resize behavior for the Workflows "Open" section.
 *
 * The persisted value is a count of visible rows, never an arbitrary pixel
 * height. This keeps the drag handle and the Settings range on the same
 * source of truth, while allowing the live drag to avoid rebuilding the
 * workflow panel under the active pointer capture.
 */
export function attachOpenHistoryResize(section, {
  getLimit,
  setLimit,
  snapLimit,
  onCommit,
}) {
  if (!section || typeof getLimit !== "function" || typeof setLimit !== "function") return;

  const list = section.querySelector(".workspace2-open-history-list");
  if (!list) return;

  const handle = document.createElement("div");
  handle.className = "workspace2-open-history-resize-handle";
  handle.setAttribute("role", "separator");
  handle.setAttribute("aria-orientation", "horizontal");
  handle.setAttribute("aria-label", "Resize open workflow history");
  handle.setAttribute("aria-valuemin", "2");
  handle.setAttribute("aria-valuemax", "15");
  handle.tabIndex = 0;
  section.append(handle);

  let drag = null;

  const rowHeight = () => {
    const rendered = list.querySelector(".workspace2-current-workflow");
    const height = rendered?.getBoundingClientRect?.().height || 0;
    if (height > 0) return height;
    const capacity = Math.max(1, Number(getLimit()) || 1);
    return Math.max(1, list.getBoundingClientRect().height / capacity);
  };

  const preview = (value) => {
    const next = snapLimit(value);
    list.style.setProperty("--workspace2-open-history-rows", String(next));
    handle.setAttribute("aria-valuenow", String(next));
    return next;
  };

  const stop = (event) => {
    if (!drag || (event?.pointerId != null && event.pointerId !== drag.pointerId)) return;
    const next = drag.value;
    drag = null;
    handle.classList.remove("is-resizing");
    try { handle.releasePointerCapture(event.pointerId); } catch {}
    // The persisted setting is updated only once on release. Re-rendering for
    // each pointermove would discard this handle and break pointer capture.
    setLimit(next);
    onCommit?.();
  };

  const cancel = (event) => {
    if (!drag || event?.pointerId !== drag.pointerId) return;
    const start = drag.start;
    drag = null;
    handle.classList.remove("is-resizing");
    try { handle.releasePointerCapture(event.pointerId); } catch {}
    // A system pointer cancellation is not a completed resize. Restore the
    // live preview and leave the persisted setting untouched.
    preview(start);
  };

  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const start = snapLimit(getLimit());
    drag = {
      pointerId: event.pointerId,
      startY: event.clientY,
      start,
      height: rowHeight(),
      value: start,
    };
    handle.classList.add("is-resizing");
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const rows = Math.round((event.clientY - drag.startY) / drag.height);
    drag.value = preview(drag.start + rows);
  });
  handle.addEventListener("pointerup", stop);
  handle.addEventListener("pointercancel", cancel);

  handle.addEventListener("keydown", (event) => {
    const current = snapLimit(getLimit());
    const delta = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = preview(current + delta);
    setLimit(next);
    onCommit?.();
  });

  preview(getLimit());
}
