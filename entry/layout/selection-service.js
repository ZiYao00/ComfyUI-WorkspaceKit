import { selectedWorkspaceKitGroupLayoutTargets } from "../canvas-groups/layout-target-adapter.js";
import { normalizeNodeLayoutTarget } from "./geometry-service.js";

function iterableSelection(canvas) {
  const selectedItems = canvas?.selectedItems;
  if (selectedItems && typeof selectedItems[Symbol.iterator] === "function") {
    return [...selectedItems];
  }
  // Legacy ComfyUI exposes selected_nodes as an id -> node object. Keep this
  // only as a compatibility fallback; modern selectedItems is authoritative.
  return Object.values(canvas?.selected_nodes ?? {}).filter(Boolean);
}

/**
 * Build one normalized Layout selection across native graph nodes and selected
 * WorkspaceKit overlay groups. Nodes controlled by a selected group are omitted
 * as direct targets so a mixed selection cannot apply the same translation twice.
 */
export function collectLayoutSelection(app, { target = globalThis } = {}) {
  const graphNodes = app?.graph?._nodes ?? app?.canvas?.graph?._nodes ?? [];
  const graphNodeSet = new Set(graphNodes);
  const runtimeNodesById = new Map();
  const groupSelection = selectedWorkspaceKitGroupLayoutTargets({ app, target });
  const groupControlledNodeIds = new Set(groupSelection.controlledNodeIds.map(String));

  const nodeTargets = [];
  for (const item of iterableSelection(app?.canvas)) {
    if (!graphNodeSet.has(item)) continue;
    const sourceId = String(item?.id ?? "");
    if (!sourceId || groupControlledNodeIds.has(sourceId)) continue;
    const normalized = normalizeNodeLayoutTarget(item);
    if (!normalized) continue;
    runtimeNodesById.set(sourceId, item);
    nodeTargets.push(normalized);
  }

  const targets = [...groupSelection.targets, ...nodeTargets];
  return Object.freeze({
    targets: Object.freeze(targets),
    nodeTargets: Object.freeze(nodeTargets),
    groupTargets: groupSelection.targets,
    runtimeNodesById,
    groupControlledNodeIds,
    selectedCount: targets.length,
    movableCount: targets.filter((item) => item.movable !== false).length,
    resizableCount: targets.filter((item) => item.resizable === true).length,
  });
}
