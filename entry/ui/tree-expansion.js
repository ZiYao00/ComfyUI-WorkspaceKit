// Shared, side-effect-limited expansion helper used by Workflows, Templates,
// and Nodes. It mutates only the Set supplied by its caller; it owns no
// persistence, rendering, panel state, or feature-specific tree shape.
export function setExpandedRecursive(expandedSet, keys, shouldExpand) {
  for (const key of keys) {
    if (!key) {
      continue;
    }
    if (shouldExpand) {
      expandedSet.add(key);
    } else {
      expandedSet.delete(key);
    }
  }
}
