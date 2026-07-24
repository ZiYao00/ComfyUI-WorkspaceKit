// Produces a de-duplicated movement plan for two or more selected DOM-overlay
// groups.  It intentionally has no canvas/DOM dependency so nested selections
// cannot move the same border or node twice.
const isWithin = (outer, inner) => (
  inner.x >= outer.x
  && inner.y >= outer.y
  && inner.x + inner.w <= outer.x + outer.w
  && inner.y + inner.h <= outer.y + outer.h
);

const area = (bounds) => Math.max(0, Number(bounds?.w) || 0) * Math.max(0, Number(bounds?.h) || 0);

export const hasNodePosition = (node) => (
  node?.pos != null
  && Number.isFinite(Number(node.pos[0]))
  && Number.isFinite(Number(node.pos[1]))
);

const nodeWithin = (node, bounds) => {
  if (!hasNodePosition(node) || !bounds) return false;
  const x = Number(node.pos[0]) || 0;
  const y = Number(node.pos[1]) || 0;
  const w = Number(node.size?.[0]) || 200;
  const h = Number(node.size?.[1]) || 100;
  return x >= bounds.x && y >= bounds.y && x + w <= bounds.x + bounds.w && y + h <= bounds.y + bounds.h;
};

export function buildMultiGroupDragPlan({ groups = {}, nodes = [], selectedGroupIds = [] } = {}) {
  const selectedIds = [...new Set(selectedGroupIds.map(String))]
    .filter((id) => groups[id]?.bounds);
  if (selectedIds.length < 2) return { groupIds: selectedIds, nodeIds: [] };

  const groupIds = new Set(selectedIds);
  for (const selectedId of selectedIds) {
    const parent = groups[selectedId];
    const parentArea = area(parent.bounds);
    for (const [candidateId, candidate] of Object.entries(groups)) {
      if (!candidate?.bounds || candidateId === selectedId) continue;
      if (area(candidate.bounds) < parentArea && isWithin(parent.bounds, candidate.bounds)) {
        groupIds.add(candidateId);
      }
    }
  }

  const availableNodeIds = new Set(
    nodes.filter((node) => node?.id != null).map((node) => String(node.id)),
  );
  const nodeIds = new Set();

  // `nodeIds` is the persisted membership source used by execution modes and
  // restore.  Multi-drag must use the same source: bounds can be temporarily
  // stale, and a visual containment check can otherwise move only the frame.
  // Geometric containment remains a compatibility fallback for legacy groups
  // whose member list is absent or no longer resolves to live graph nodes.
  for (const groupId of groupIds) {
    const group = groups[groupId];
    const memberIds = Array.isArray(group?.nodeIds)
      ? group.nodeIds.map(String).filter((id) => availableNodeIds.has(id))
      : [];
    if (memberIds.length) {
      memberIds.forEach((id) => nodeIds.add(id));
      continue;
    }
    for (const node of nodes) {
      if (node?.id != null && nodeWithin(node, group?.bounds)) nodeIds.add(String(node.id));
    }
  }

  return { groupIds: [...groupIds], nodeIds: [...nodeIds] };
}
