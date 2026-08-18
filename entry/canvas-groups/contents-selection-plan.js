// Pure selection plan for a WorkspaceKit group header double-click. The
// header selects every fully nested child group and every contained node, but
// deliberately leaves the clicked root frame unselected. This lets users move
// a group's contents while the parent frame stays in place.
const isWithin = (outer, inner) => (
  inner.x >= outer.x
  && inner.y >= outer.y
  && inner.x + inner.w <= outer.x + outer.w
  && inner.y + inner.h <= outer.y + outer.h
);

const area = (bounds) => Math.max(0, Number(bounds?.w) || 0) * Math.max(0, Number(bounds?.h) || 0);

const hasNodePosition = (node) => (
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

export function buildGroupContentsSelectionPlan({ groups = {}, nodes = [], groupId } = {}) {
  const rootId = String(groupId || "");
  const root = groups[rootId];
  if (!root?.bounds) return { groupIds: [], nodeIds: [] };

  const rootArea = area(root.bounds);
  const childGroupIds = new Set();
  for (const [candidateId, candidate] of Object.entries(groups)) {
    if (!candidate?.bounds || candidateId === rootId) continue;
    if (area(candidate.bounds) < rootArea && isWithin(root.bounds, candidate.bounds)) {
      childGroupIds.add(candidateId);
    }
  }

  const availableNodeIds = new Set(nodes.filter((node) => node?.id != null).map((node) => String(node.id)));
  const nodeIds = new Set();
  // The root contributes its direct members too; it is only excluded from the
  // *selection* set, not from the content range.
  for (const id of [rootId, ...childGroupIds]) {
    const group = groups[id];
    const memberIds = Array.isArray(group?.nodeIds)
      ? group.nodeIds.map(String).filter((nodeId) => availableNodeIds.has(nodeId))
      : [];
    if (memberIds.length) {
      memberIds.forEach((nodeId) => nodeIds.add(nodeId));
      continue;
    }
    for (const node of nodes) {
      if (node?.id != null && nodeWithin(node, group?.bounds)) nodeIds.add(String(node.id));
    }
  }
  return { groupIds: [...childGroupIds], nodeIds: [...nodeIds] };
}
