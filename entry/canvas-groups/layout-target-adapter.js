import {
  isNodes2Enabled,
  setNodeGraphPosition,
} from "./node-position-sync.js";
import { normalizeRectLayoutTarget } from "../layout/geometry-service.js";

function controller(target = globalThis) {
  const value = target?.Workspace2CanvasGroups;
  if (!value || typeof value !== "object") return null;
  if (value._nativeRepresentation) return null;
  return value;
}

function validBounds(bounds) {
  return Boolean(
    bounds
    && [bounds.x, bounds.y, bounds.w, bounds.h]
      .every((value) => Number.isFinite(Number(value)))
    && Number(bounds.w) >= 0
    && Number(bounds.h) >= 0,
  );
}

function area(group) {
  const b = group?.bounds;
  return validBounds(b) ? Number(b.w) * Number(b.h) : Number.POSITIVE_INFINITY;
}

function containsGroup(outer, inner) {
  if (!validBounds(outer?.bounds) || !validBounds(inner?.bounds)) return false;
  const a = outer.bounds;
  const b = inner.bounds;
  return b.x >= a.x
    && b.y >= a.y
    && b.x + b.w <= a.x + a.w
    && b.y + b.h <= a.y + a.h;
}

function nodeCenterInside(group, node) {
  if (!validBounds(group?.bounds) || !node?.pos || !node?.size) return false;
  const x = Number(node.pos[0]) + Number(node.size[0] ?? 0) / 2;
  const y = Number(node.pos[1]) + Number(node.size[1] ?? 0) / 2;
  const b = group.bounds;
  return x >= Number(b.x)
    && x <= Number(b.x) + Number(b.w)
    && y >= Number(b.y)
    && y <= Number(b.y) + Number(b.h);
}

function groupControlsNode(group, node) {
  const nodeId = String(node?.id ?? "");
  if (!nodeId) return false;
  const persisted = new Set((group?.nodeIds ?? []).map((id) => String(id)));
  return persisted.has(nodeId) || nodeCenterInside(group, node);
}

function smallestController(groups) {
  return [...groups].sort((left, right) => {
    const areaDelta = area(left.group) - area(right.group);
    if (areaDelta) return areaDelta;
    return String(left.id).localeCompare(String(right.id));
  })[0] ?? null;
}

/**
 * Read the current transient WorkspaceKit group selection as LayoutTargets.
 * Layout never receives the mutable group objects themselves.
 */
export function selectedWorkspaceKitGroupLayoutTargets({ app, target = globalThis } = {}) {
  const groupsController = controller(target);
  if (!groupsController) return Object.freeze({ targets: Object.freeze([]), controlledNodeIds: Object.freeze([]) });
  const targets = [];
  const controlledNodeIds = new Set();
  const graphNodes = app?.graph?._nodes ?? [];

  for (const rawId of groupsController.selectedGroupIds ?? []) {
    const id = String(rawId);
    const group = groupsController.groups?.[id];
    if (!validBounds(group?.bounds)) continue;
    const b = group.bounds;
    const normalized = normalizeRectLayoutTarget({
      id: `workspacekit-group:${id}`,
      sourceId: id,
      kind: "workspacekit-group",
      x: Number(b.x),
      y: Number(b.y),
      width: Number(b.w),
      height: Number(b.h),
      movable: true,
      // Group resize semantics (frame-only vs member scaling) are intentionally
      // not implied by node size commands. B09 enables movement only.
      resizable: false,
    });
    if (!normalized) continue;
    targets.push(normalized);

    for (const node of graphNodes) {
      if (groupControlsNode(group, node)) controlledNodeIds.add(String(node.id));
    }
  }
  return Object.freeze({
    targets: Object.freeze(targets),
    controlledNodeIds: Object.freeze([...controlledNodeIds]),
  });
}

function nearlyEqual(left, right) {
  return Math.abs(Number(left) - Number(right)) <= 1e-9;
}

/**
 * Prepare an immutable-in-intent group translation plan before any mutation.
 * The plan keeps runtime references plus exact starting geometry so the caller
 * can roll the whole batch back if a later Node/Group mutation fails.
 */
export function prepareWorkspaceKitGroupTranslationPlan({
  app,
  changes,
  directNodeIds = new Set(),
  target = globalThis,
} = {}) {
  const groupsController = controller(target);
  const graph = app?.graph;
  if (!groupsController || !graph?._nodes) return Object.freeze({ ok: false, reason: "groups-unavailable" });

  const explicit = new Map();
  for (const change of changes ?? []) {
    if (change?.kind !== "workspacekit-group") continue;
    const id = String(change.sourceId ?? "");
    const group = groupsController.groups?.[id];
    if (!id || !validBounds(group?.bounds)) {
      return Object.freeze({ ok: false, reason: "group-missing", groupId: id });
    }
    if (![change?.to?.x, change?.to?.y, change?.from?.x, change?.from?.y].every(Number.isFinite)) {
      return Object.freeze({ ok: false, reason: "invalid-group-change", groupId: id });
    }
    if (!nearlyEqual(change.to.width, change.from.width) || !nearlyEqual(change.to.height, change.from.height)) {
      return Object.freeze({ ok: false, reason: "group-resize-unsupported", groupId: id });
    }
    if (!nearlyEqual(group.bounds.x, change.from.x) || !nearlyEqual(group.bounds.y, change.from.y)
      || !nearlyEqual(group.bounds.w, change.from.width) || !nearlyEqual(group.bounds.h, change.from.height)) {
      return Object.freeze({ ok: false, reason: "stale-group-geometry", groupId: id });
    }
    explicit.set(id, {
      id,
      group,
      dx: Number(change.to.x) - Number(change.from.x),
      dy: Number(change.to.y) - Number(change.from.y),
      startX: Number(group.bounds.x),
      startY: Number(group.bounds.y),
    });
  }

  const groupMoves = new Map(explicit);
  for (const [candidateId, candidate] of Object.entries(groupsController.groups ?? {})) {
    if (groupMoves.has(String(candidateId)) || !validBounds(candidate?.bounds)) continue;
    const parent = smallestController([...explicit.values()].filter((entry) => containsGroup(entry.group, candidate)));
    if (!parent) continue;
    groupMoves.set(String(candidateId), {
      id: String(candidateId),
      group: candidate,
      dx: parent.dx,
      dy: parent.dy,
      startX: Number(candidate.bounds.x),
      startY: Number(candidate.bounds.y),
    });
  }

  const direct = new Set([...directNodeIds].map(String));
  const nodeMoves = [];
  for (const node of graph._nodes) {
    if (!node?.pos || direct.has(String(node.id))) continue;
    const owner = smallestController([...explicit.values()].filter((entry) => groupControlsNode(entry.group, node)));
    if (!owner) continue;
    nodeMoves.push({
      node,
      x: Number(node.pos[0]),
      y: Number(node.pos[1]),
      dx: owner.dx,
      dy: owner.dy,
    });
  }

  return Object.freeze({
    ok: true,
    controller: groupsController,
    groupMoves: Object.freeze([...groupMoves.values()]),
    nodeMoves: Object.freeze(nodeMoves),
    nodes2: isNodes2Enabled(app),
  });
}

export function applyWorkspaceKitGroupTranslationPlan({ app, plan } = {}) {
  if (!plan?.ok) return Object.freeze({ ok: false, reason: plan?.reason ?? "invalid-plan" });
  const groupsController = plan.controller;
  const graph = app?.graph;
  if (!groupsController || !graph) return Object.freeze({ ok: false, reason: "groups-unavailable" });
  const previousSuspend = Boolean(groupsController._suspendMembershipSync);
  groupsController._suspendMembershipSync = true;
  try {
    for (const entry of plan.groupMoves) {
      entry.group.bounds.x = entry.startX + entry.dx;
      entry.group.bounds.y = entry.startY + entry.dy;
      const el = groupsController.groupEls?.[entry.id];
      if (el) el._xzgSyncFrame = 10;
    }
    for (const move of plan.nodeMoves) {
      if (!setNodeGraphPosition(move.node, move.x + move.dx, move.y + move.dy, { nodes2: plan.nodes2 })) {
        throw new Error(`Unable to move WorkspaceKit group member node ${String(move.node?.id ?? "")}`);
      }
    }
    groupsController.syncGroupsToExtra?.();
    graph.setDirtyCanvas?.(true, true);
    return Object.freeze({ ok: true, movedGroups: plan.groupMoves.length, movedNodes: plan.nodeMoves.length });
  } finally {
    groupsController._suspendMembershipSync = previousSuspend;
  }
}

export function rollbackWorkspaceKitGroupTranslationPlan({ app, plan } = {}) {
  if (!plan?.ok) return false;
  const groupsController = plan.controller;
  const graph = app?.graph;
  const previousSuspend = Boolean(groupsController?._suspendMembershipSync);
  if (groupsController) groupsController._suspendMembershipSync = true;
  try {
    for (const entry of plan.groupMoves ?? []) {
      entry.group.bounds.x = entry.startX;
      entry.group.bounds.y = entry.startY;
      const el = groupsController?.groupEls?.[entry.id];
      if (el) el._xzgSyncFrame = 10;
    }
    for (const move of plan.nodeMoves ?? []) {
      setNodeGraphPosition(move.node, move.x, move.y, { nodes2: plan.nodes2 });
    }
    groupsController?.syncGroupsToExtra?.();
    graph?.setDirtyCanvas?.(true, true);
    return true;
  } finally {
    if (groupsController) groupsController._suspendMembershipSync = previousSuspend;
  }
}

/**
 * Backward-compatible convenience wrapper for callers that do not need to
 * combine Group translation with a larger Layout transaction.
 */
export function applyWorkspaceKitGroupTranslations({
  app,
  changes,
  directNodeIds = new Set(),
  target = globalThis,
} = {}) {
  const plan = prepareWorkspaceKitGroupTranslationPlan({ app, changes, directNodeIds, target });
  if (!plan.ok) return plan;
  try {
    return applyWorkspaceKitGroupTranslationPlan({ app, plan });
  } catch (error) {
    rollbackWorkspaceKitGroupTranslationPlan({ app, plan });
    return Object.freeze({ ok: false, reason: "apply-failed", error });
  }
}
