import {
  applyWorkspaceKitGroupTranslationPlan,
  prepareWorkspaceKitGroupTranslationPlan,
  rollbackWorkspaceKitGroupTranslationPlan,
} from "../canvas-groups/layout-target-adapter.js";
import { isNodes2Enabled, setNodeGraphPosition } from "../canvas-groups/node-position-sync.js";

const EPSILON = 1e-9;

function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) <= EPSILON;
}

function currentNodeGeometry(node) {
  const x = Number(node?.pos?.[0]);
  const y = Number(node?.pos?.[1]);
  const width = Number(node?.size?.[0]);
  const height = Number(node?.size?.[1]);
  if (![x, y, width, height].every(Number.isFinite)) return null;
  return { x, y, width, height };
}

function validateNodeChange(node, change) {
  const current = currentNodeGeometry(node);
  if (!current) return { ok: false, reason: "invalid-node-geometry" };
  if (!nearlyEqual(current.x, change.from.x)
    || !nearlyEqual(current.y, change.from.y)
    || !nearlyEqual(current.width, change.from.width)
    || !nearlyEqual(current.height, change.from.height)) {
    return { ok: false, reason: "stale-node-geometry" };
  }
  if (![change.to.x, change.to.y, change.to.width, change.to.height].every(Number.isFinite)
    || change.to.width < 0 || change.to.height < 0) {
    return { ok: false, reason: "invalid-node-change" };
  }
  return { ok: true, current };
}

function setNodeSize(node, width, height, { nodes2 = false } = {}) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 0 || height < 0) return false;
  if (typeof node?.setSize === "function") {
    node.setSize([width, height]);
    return true;
  }
  if (!node?.size) return false;
  if (nodes2) {
    node.size = [width, height];
  } else {
    node.size[0] = width;
    node.size[1] = height;
  }
  return true;
}

function restoreNodeSnapshots(snapshots, { nodes2 = false } = {}) {
  for (const snapshot of snapshots) {
    try {
      setNodeGraphPosition(snapshot.node, snapshot.x, snapshot.y, { nodes2 });
    } catch {}
    try {
      setNodeSize(snapshot.node, snapshot.width, snapshot.height, { nodes2 });
    } catch {}
  }
}

/**
 * Validate and apply a complete Layout ChangeSet as one ComfyUI transaction.
 * All runtime references and Group movement plans are prepared before the first
 * mutation. If any later mutation throws, node/group snapshots are restored.
 */
export function applyLayoutChangeSet({ app, selection, changeSet, target = globalThis } = {}) {
  if (!changeSet?.ok) {
    return Object.freeze({ ok: false, reason: changeSet?.reason ?? "invalid-change-set", applied: 0 });
  }
  const changes = Array.isArray(changeSet.changes) ? changeSet.changes : [];
  if (!changes.length) return Object.freeze({ ok: true, reason: "no-op", applied: 0 });

  const nodeChanges = changes.filter((change) => change.kind === "node");
  const groupChanges = changes.filter((change) => change.kind === "workspacekit-group");
  const unknown = changes.filter((change) => change.kind !== "node" && change.kind !== "workspacekit-group");
  if (unknown.length) return Object.freeze({ ok: false, reason: "unsupported-target-kind", applied: 0 });

  const nodeSnapshots = [];
  for (const change of nodeChanges) {
    const node = selection?.runtimeNodesById?.get?.(String(change.sourceId));
    if (!node) return Object.freeze({ ok: false, reason: "node-missing", sourceId: change.sourceId, applied: 0 });
    const checked = validateNodeChange(node, change);
    if (!checked.ok) return Object.freeze({ ok: false, reason: checked.reason, sourceId: change.sourceId, applied: 0 });
    nodeSnapshots.push({ node, ...checked.current });
  }

  const directNodeIds = new Set(nodeChanges.map((change) => String(change.sourceId)));
  const groupPlan = groupChanges.length
    ? prepareWorkspaceKitGroupTranslationPlan({ app, changes: groupChanges, directNodeIds, target })
    : Object.freeze({ ok: true, controller: null, groupMoves: Object.freeze([]), nodeMoves: Object.freeze([]), nodes2: isNodes2Enabled(app) });
  if (!groupPlan.ok) return Object.freeze({ ok: false, reason: groupPlan.reason, applied: 0 });

  const nodes2 = isNodes2Enabled(app);
  const tracker = app?.extensionManager?.workflow?.activeWorkflow?.changeTracker;
  const hasTracker = typeof tracker?.beforeChange === "function" && typeof tracker?.afterChange === "function";
  let transactionOpened = false;
  let groupApplied = false;

  try {
    if (hasTracker) {
      tracker.beforeChange();
      transactionOpened = true;
    }

    if (groupChanges.length) {
      const result = applyWorkspaceKitGroupTranslationPlan({ app, plan: groupPlan });
      if (!result.ok) throw new Error(result.reason || "WorkspaceKit group translation failed");
      groupApplied = true;
    }

    for (const change of nodeChanges) {
      const node = selection.runtimeNodesById.get(String(change.sourceId));
      if (!setNodeGraphPosition(node, change.to.x, change.to.y, { nodes2 })) {
        throw new Error(`Unable to move node ${String(change.sourceId)}`);
      }
      if (!nearlyEqual(change.from.width, change.to.width) || !nearlyEqual(change.from.height, change.to.height)) {
        if (!setNodeSize(node, change.to.width, change.to.height, { nodes2 })) {
          throw new Error(`Unable to resize node ${String(change.sourceId)}`);
        }
      }
    }

    app?.canvas?.setDirty?.(true, true);
    app?.graph?.setDirtyCanvas?.(true, true);
    app?.graph?.change?.();
    if (transactionOpened) tracker.afterChange();
    return Object.freeze({
      ok: true,
      reason: "",
      applied: changes.length,
      nodeChanges: nodeChanges.length,
      groupChanges: groupChanges.length,
    });
  } catch (error) {
    restoreNodeSnapshots(nodeSnapshots, { nodes2 });
    if (groupApplied || groupChanges.length) {
      rollbackWorkspaceKitGroupTranslationPlan({ app, plan: groupPlan });
    }
    app?.canvas?.setDirty?.(true, true);
    app?.graph?.setDirtyCanvas?.(true, true);
    app?.graph?.change?.();
    if (transactionOpened) {
      try { tracker.afterChange(); } catch {}
    }
    console.error("[WorkspaceKit Layout] Transaction rolled back", error);
    return Object.freeze({ ok: false, reason: "apply-failed", applied: 0, error });
  }
}
