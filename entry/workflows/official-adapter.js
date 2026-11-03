import { officialWorkflowSnapshot } from "./dirty-snapshot.js";

const savingWorkflows = new WeakSet();

function isWorkflowStore(store) {
  return Boolean(
    store
    && typeof store.getWorkflowByPath === "function"
    && typeof store.openWorkflow === "function"
    && Array.isArray(store.openWorkflows)
    && Array.isArray(store.modifiedWorkflows),
  );
}

export function getOfficialWorkflowStore(app) {
  const store = app?.extensionManager?.workflow;
  return isWorkflowStore(store) ? store : null;
}

export function getOfficialWorkflowByPath(app, path) {
  return getOfficialWorkflowStore(app)?.getWorkflowByPath?.(path) || null;
}

export function getOpenOfficialWorkflows(app) {
  return [...(getOfficialWorkflowStore(app)?.openWorkflows || [])];
}

export function getActiveOfficialWorkflow(app) {
  return getOfficialWorkflowStore(app)?.activeWorkflow || null;
}

export function isOfficialWorkflowModified(workflow) {
  return Boolean(workflow?.isModified);
}

/**
 * True while a workflow has no file on disk yet.
 *
 * ComfyUI reports `isModified: false` for a freshly created workflow even though
 * it marks the browser title with `*`, so a "needs saving" indicator that reads
 * only `isModified` stays dark on the one workflow that has never been saved at
 * all. `isPersisted` is checked explicitly against `false` so a frontend that
 * does not expose it falls back to `isTemporary` instead of reporting unsaved.
 */
export function isOfficialWorkflowTemporary(workflow) {
  if (!workflow) return false;
  return workflow.isTemporary === true || workflow.isPersisted === false;
}

function workflowPath(workflow) {
  return typeof workflow?.path === "string" ? workflow.path : "";
}

/**
 * Open an official workflow through ComfyUI's public workflow object plus
 * app.loadGraphData() lifecycle.
 *
 * The private workflowService.openWorkflow(target) is not exposed to custom
 * extensions, but app.loadGraphData() itself calls the official
 * beforeLoadNewGraph()/afterLoadNewGraph() hooks. This mirrors the native
 * service's public-object core without the old temporary-tab/reorder/Next-command
 * bridge. Warm switches also preserve the native skipAssetScans optimization.
 */
export async function openOfficialWorkflowThroughService(app, workflow) {
  const store = getOfficialWorkflowStore(app);
  const targetPath = workflowPath(workflow);
  if (!store || !workflow || !targetPath) {
    return { opened: false, initializeCleanState: false, reason: "workflow-unavailable" };
  }

  const isActive = typeof store.isActive === "function"
    ? store.isActive(workflow)
    : workflowPath(store.activeWorkflow) === targetPath;
  if (isActive) {
    return { opened: true, initializeCleanState: false, reason: "already-active" };
  }

  if (typeof app?.loadGraphData !== "function" || typeof workflow?.load !== "function") {
    return { opened: false, initializeCleanState: false, reason: "official-load-unavailable" };
  }

  const wasAlreadyOpen = (store.openWorkflows || []).filter(Boolean)
    .some((entry) => workflowPath(entry) === targetPath);
  const previousWorkflow = store.activeWorkflow || null;
  const loadFromRemote = !workflow.isLoaded;

  if (loadFromRemote) {
    await workflow.load();
  }

  const loaded = await app.loadGraphData(
    workflow.activeState,
    true,
    true,
    workflow,
    {
      checkForRerouteMigration: false,
      deferWarnings: false,
      skipAssetScans: !loadFromRemote,
      silentAssetErrors: !loadFromRemote,
    },
  );

  if (loaded === false) {
    // Match ComfyUI's workflow service failure policy without copying the
    // service itself: repaint the retained, already-loaded workflow so the
    // selected tab and canvas cannot diverge after a configure failure.
    if (
      previousWorkflow
      && previousWorkflow !== workflow
      && previousWorkflow.isLoaded
      && previousWorkflow.activeState
    ) {
      await app.loadGraphData(
        previousWorkflow.activeState,
        true,
        true,
        previousWorkflow,
        {
          checkForRerouteMigration: false,
          deferWarnings: true,
          skipAssetScans: true,
          silentAssetErrors: true,
        },
      );
    }
    return { opened: false, initializeCleanState: false, reason: "official-load-failed" };
  }

  const activated = workflowPath(store.activeWorkflow) === targetPath;
  return {
    opened: activated,
    initializeCleanState: activated && !wasAlreadyOpen,
    reason: activated ? "opened" : "official-load-did-not-activate",
  };
}


export async function saveOfficialWorkflow(workflow, app, onSaved) {
  if (!workflow || savingWorkflows.has(workflow)) return false;
  savingWorkflows.add(workflow);
  try {
    return await persistOfficialWorkflow(workflow, app, onSaved);
  } finally {
    savingWorkflows.delete(workflow);
  }
}

async function persistOfficialWorkflow(workflow, app, onSaved) {
  if (typeof workflow?.save !== "function") {
    return false;
  }
  const store = getOfficialWorkflowStore(app);
  if (workflow === store?.activeWorkflow) {
    const execute = app?.extensionManager?.command?.execute;
    if (typeof execute !== "function") return false;
    workflow.changeTracker?.prepareForSave?.();
    const requestedState = officialWorkflowSnapshot(workflow.activeState);
    await execute("Comfy.SaveWorkflow");
    if (isOfficialWorkflowTemporary(workflow) || !workflow.originalContent) return false;
    const persisted = JSON.parse(workflow.originalContent);
    // Native commands can handle an I/O failure without rejecting. Advance
    // only to the content actually persisted, keeping edits made during I/O.
    if (officialWorkflowSnapshot(persisted) !== requestedState) return false;
    onSaved?.(persisted, workflow.path);
    return true;
  }
  if (isOfficialWorkflowTemporary(workflow)) {
    if (!store?.renameWorkflow || typeof workflow.promptSave !== "function") return false;
    const name = await workflow.promptSave();
    if (!name) return false;
    const suffix = workflow.initialMode === "app" ? ".app.json" : ".json";
    const filename = name.toLowerCase().endsWith(suffix) ? name : `${name.replace(/\.json$/i, "")}${suffix}`;
    const path = `${workflow.directory}/${filename}`;
    const existing = store.getWorkflowByPath(path);
    // A background save must never overwrite another open workflow implicitly.
    if (existing && existing !== workflow) throw new Error(`Workflow already exists: ${path}`);
    await store.renameWorkflow(workflow, path);
  }
  // Match ComfyUI's workflow-service path: capture the active canvas before
  // serializing, while inactive workflows safely keep their frozen state.
  workflow.changeTracker?.prepareForSave?.();
  const savedState = workflow.activeState ? JSON.parse(JSON.stringify(workflow.activeState)) : null;
  if (store?.saveWorkflow) await store.saveWorkflow(workflow);
  else await workflow.save();
  onSaved?.(savedState, workflow.path);
  return true;
}

export async function closeOfficialWorkflow(app, workflow) {
  const store = getOfficialWorkflowStore(app);
  if (!store || !workflow || typeof store.closeWorkflow !== "function") {
    return false;
  }

  const targetPath = workflowPath(workflow);
  const isActive = typeof store.isActive === "function"
    ? store.isActive(workflow)
    : workflowPath(store.activeWorkflow) === targetPath;

  if (isActive) {
    const execute = app?.extensionManager?.command?.execute;
    if (typeof execute !== "function") return false;
    await execute("Workspace.CloseWorkflow");
  } else {
    // No canvas transition is required for an inactive official tab. Its dirty
    // confirmation/save policy is handled by the WorkspaceKit caller before
    // this lightweight official Store detach.
    await store.closeWorkflow(workflow);
  }

  return !(store.openWorkflows || []).filter(Boolean)
    .some((entry) => workflowPath(entry) === targetPath);
}

export function subscribeOfficialWorkflowStore(app, listener) {
  const store = getOfficialWorkflowStore(app);
  if (!store || typeof store.$subscribe !== "function" || typeof listener !== "function") {
    return () => {};
  }
  return store.$subscribe(listener, { detached: true });
}
