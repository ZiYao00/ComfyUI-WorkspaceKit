/**
 * Pure workflow-dirty helpers.
 *
 * WorkspaceKit intentionally keeps its own "needs save" baseline instead of
 * rewriting ComfyUI's ChangeTracker state. The canonical snapshot below mirrors
 * ChangeTracker.graphEqual(): node order and extra.ds are ignored, while links,
 * floating links, reroutes, groups, definitions and subgraphs remain semantic.
 */

const OFFICIAL_GRAPH_KEYS = [
  "links",
  "floatingLinks",
  "reroutes",
  "groups",
  "definitions",
  "subgraphs",
];

export function stableJson(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableJson(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function nodeSortKey(node) {
  if (node && typeof node === "object" && node.id !== undefined && node.id !== null) {
    return `id:${String(node.id)}|${stableJson(node)}`;
  }
  return `node:${stableJson(node)}`;
}

export function canonicalizeOfficialWorkflow(workflow) {
  if (!workflow || typeof workflow !== "object") return null;

  const nodes = Array.isArray(workflow.nodes)
    ? [...workflow.nodes].sort((left, right) => nodeSortKey(left).localeCompare(nodeSortKey(right)))
    : workflow.nodes;

  const extra = workflow.extra && typeof workflow.extra === "object"
    ? { ...workflow.extra }
    : {};
  delete extra.ds;

  const canonical = { nodes, extra };
  for (const key of OFFICIAL_GRAPH_KEYS) {
    canonical[key] = workflow[key];
  }
  return canonical;
}

export function officialWorkflowSnapshot(workflow) {
  const canonical = canonicalizeOfficialWorkflow(workflow);
  return canonical ? stableJson(canonical) : "";
}

/**
 * Decide whether one queue transaction may advance WorkspaceKit's effective
 * clean baseline.
 *
 * Deliberately conservative:
 * - only a transaction that started clean may be absorbed;
 * - any observed user/third-party graph change taints it;
 * - switching workflows or an already-dirty current path blocks absorption.
 *
 * We do not need a field-level merge. If the workflow was already dirty before
 * queueing, the correct user-facing state is dirty regardless of any later
 * execution-only seed/widget mutation.
 */
export function planExecutionDirtyReconciliation({
  beforeSnapshot = "",
  afterSnapshot = "",
  startedClean = false,
  tainted = false,
  sameWorkflow = true,
  currentDirty = false,
} = {}) {
  if (!beforeSnapshot || !afterSnapshot) {
    return { absorb: false, changed: false, reason: "missing-snapshot" };
  }
  if (!startedClean) {
    return { absorb: false, changed: afterSnapshot !== beforeSnapshot, reason: "started-dirty" };
  }
  if (tainted) {
    return { absorb: false, changed: afterSnapshot !== beforeSnapshot, reason: "tainted" };
  }
  if (!sameWorkflow) {
    return { absorb: false, changed: afterSnapshot !== beforeSnapshot, reason: "workflow-changed" };
  }
  if (currentDirty) {
    return { absorb: false, changed: afterSnapshot !== beforeSnapshot, reason: "currently-dirty" };
  }

  return {
    absorb: true,
    changed: afterSnapshot !== beforeSnapshot,
    reason: afterSnapshot === beforeSnapshot ? "no-execution-change" : "execution-only",
  };
}
