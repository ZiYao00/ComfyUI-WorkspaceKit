// Node-position compatibility boundary for WorkspaceKit canvas groups.
//
// Legacy LiteGraph redraws immediately when `node.pos` is mutated. Nodes 2.0
// keeps the rendered position in the frontend layout store. Some current
// frontend builds still bridge a whole `node.pos = [x, y]` assignment into that
// store, while writing individual Float64Array entries bypasses it. Keep this
// difference here rather than leaking renderer checks through group dragging.

export function isNodes2Enabled(appRef) {
  return Boolean(appRef?.extensionManager?.setting?.get?.("Comfy.VueNodes.Enabled"));
}

/**
 * Update one graph node at an absolute graph-space position.
 *
 * Replacing the complete coordinate container is intentional for Nodes 2.0:
 * assigning `pos[0]` / `pos[1]` can update serialized graph data without
 * notifying Vue's layout bridge. Legacy keeps its typed/array container and
 * uses the established in-place writes.
 */
export function setNodeGraphPosition(node, x, y, { nodes2 = false } = {}) {
  if (!node?.pos || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return false;
  if (nodes2) {
    node.pos = [Number(x), Number(y)];
    return true;
  }
  node.pos[0] = Number(x);
  node.pos[1] = Number(y);
  return true;
}

export function setNodeGraphPositionFromStart(start, dx, dy, options) {
  if (!start?.node) return false;
  return setNodeGraphPosition(start.node, start.x + dx, start.y + dy, options);
}
