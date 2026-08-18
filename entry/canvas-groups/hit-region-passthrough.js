// T-041: WorkspaceKit group frames are a DOM overlay above every node pixel, so
// any overlay region with `pointer-events: auto` inverts native ComfyUI's
// hit-test order.  Native resolves a node first (`getNodeOnPos`) and only
// considers a group when no node was hit (`getGroupOnPos` /
// `getGroupTitlebarOnPos`) — see docs/NATIVE_BEHAVIOR_REFERENCE.md §3.
//
// Rather than re-dispatching synthetic events (LiteGraph calls
// `setPointerCapture(e.pointerId)` on every pointerdown, which a synthesised
// pointer cannot satisfy), the group frame's drag/resize regions stop
// intercepting while a node sits under the cursor.  LiteGraph then receives a
// genuine browser event and owns the gesture entirely.
//
// Keep this decision pure so it can be asserted without a DOM or a live graph.

// Drag strips may yield to a node. The title bar and the small, visible resize
// handle are deliberately absent: they are explicit controls and must remain
// clickable even where a Vue node overlaps the group edge.
export const GROUP_HIT_REGION_SELECTOR =
  ".xzg-border-left, .xzg-border-right, .xzg-border-bottom";

/**
 * Decide whether the group frame's drag/resize regions should let pointer input
 * fall through to the canvas.
 *
 * @param {object} state
 * @param {boolean} state.hasPointer     A pointer position is known at all.
 * @param {boolean} state.nodeUnderPointer A node occupies that position.
 * @param {number}  state.buttons        Pressed mouse buttons at that position.
 * @returns {boolean} true → regions must not intercept.
 */
export function shouldPassThroughGroupHitRegions(state) {
  const source = state && typeof state === "object" ? state : {};
  // Without a known pointer position there is nothing to yield to.
  if (!source.hasPointer) return false;
  // Never re-target mid-gesture: whoever received the pointerdown owns the drag
  // until release, and flipping pointer-events under it would strand the drag.
  if (Number(source.buttons) > 0) return false;
  return Boolean(source.nodeUnderPointer);
}
