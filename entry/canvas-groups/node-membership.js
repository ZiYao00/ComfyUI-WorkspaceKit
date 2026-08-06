// T-037: node membership must match native ComfyUI, which admits a node when its
// CENTRE POINT falls inside the group bounds — a boolean test, not an
// area-overlap percentage:
//
//   recomputeInsideNodes() → containsCentre(this._bounding, node.boundingRect)
//   function containsCentre(rect, item) {
//     return isInRect(item[0] + item[2] * 0.5, item[1] + item[3] * 0.5, rect)
//   }
//
// See docs/NATIVE_BEHAVIOR_REFERENCE.md §2. WorkspaceKit previously required
// full four-edge containment plus a 20% retained-overlap anti-jitter rule, so a
// node with any corner outside the frame was refused regardless of how far in it
// had moved.
//
// Group-in-group nesting deliberately keeps full containment: native nesting also
// uses `containsRect`, not `containsCentre`.
//
// Kept pure so the rule can be asserted without a DOM, a canvas or a live graph.

/**
 * Native centre-point containment.
 *
 * The centre is tested inclusively against all four edges, matching LiteGraph's
 * `isInRect`. Zero-size and negative-size rects can never contain anything.
 *
 * @param {{x:number,y:number,w:number,h:number}} bounds Group bounds.
 * @param {{x:number,y:number,w:number,h:number}} item   Node bounds.
 * @returns {boolean}
 */
export function containsNodeCentre(bounds, item) {
  if (!isFiniteRect(bounds) || !isFiniteRect(item)) return false;
  if (bounds.w <= 0 || bounds.h <= 0) return false;
  const cx = item.x + item.w * 0.5;
  const cy = item.y + item.h * 0.5;
  return cx >= bounds.x && cx <= bounds.x + bounds.w
      && cy >= bounds.y && cy <= bounds.y + bounds.h;
}

function isFiniteRect(rect) {
  if (!rect || typeof rect !== "object") return false;
  return ["x", "y", "w", "h"].every((key) => Number.isFinite(Number(rect[key])));
}

/**
 * Decide a single node's membership.
 *
 * Deliberately ignores whether the node was previously a member: a centre point
 * cannot jitter across an edge the way a fractional area overlap can, so the old
 * "retain if still 20% overlapping" rule is not merely unnecessary — keeping it
 * would make a node cling to a group after its centre had left, producing
 * "dragged out but still stuck".
 *
 * @param {{x:number,y:number,w:number,h:number}} bounds
 * @param {{x:number,y:number,w:number,h:number}} nodeBounds
 * @returns {boolean}
 */
export function isNodeInsideGroup(bounds, nodeBounds) {
  return containsNodeCentre(bounds, nodeBounds);
}

/**
 * Resolve the full member list for one group.
 *
 * Returned ids preserve `nodes` order so a membership change produces a stable,
 * comparable list rather than a set whose order depends on iteration accidents.
 *
 * @param {{x:number,y:number,w:number,h:number}} bounds
 * @param {Array<{id:*, bounds:{x:number,y:number,w:number,h:number}}>} nodes
 * @returns {Array<*>} ids of member nodes
 */
export function resolveGroupMemberIds(bounds, nodes) {
  if (!Array.isArray(nodes)) return [];
  const ids = [];
  for (const node of nodes) {
    if (!node || node.id === undefined || node.id === null) continue;
    if (isNodeInsideGroup(bounds, node.bounds)) ids.push(node.id);
  }
  return ids;
}
