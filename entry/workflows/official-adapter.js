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
 * Load a workflow's persisted state without making it active.
 *
 * ComfyUI must deactivate the old workflow while it is still active, then
 * activate the target only after the new graph is in place. Calling the store's
 * openWorkflow() here reverses that order and can capture the old canvas into
 * the target workflow, producing a false unsaved marker after a tab switch.
 */
export async function loadOfficialWorkflow(workflow) {
  if (!workflow || typeof workflow.load !== "function") {
    return false;
  }
  return await workflow.load();
}

export async function saveOfficialWorkflow(workflow) {
  if (typeof workflow?.save !== "function") {
    return false;
  }
  // Match ComfyUI's workflow-service path: capture the active canvas before
  // serializing, while inactive workflows safely keep their frozen state.
  workflow.changeTracker?.prepareForSave?.();
  await workflow.save();
  return true;
}

export async function closeOfficialWorkflow(app, workflow) {
  const store = getOfficialWorkflowStore(app);
  if (!store || !workflow || typeof store.closeWorkflow !== "function") {
    return false;
  }

  // Closing a non-active workflow is only a tab-list operation.  For the
  // active workflow, however, calling store.closeWorkflow() directly leaves
  // its graph on the canvas even though the tab has disappeared.  Mirror the
  // official workflow-service order: first switch the canvas to the most
  // recently used open workflow (or the official default graph for the last
  // tab), then detach the workflow from the store.
  const isActive = typeof store.isActive === "function"
    ? store.isActive(workflow)
    : store.activeWorkflow === workflow;
  if (isActive) {
    const replacement = store.getMostRecentWorkflow?.()
      || store.openedWorkflowIndexShift?.(1)
      || null;

    if (replacement && replacement !== workflow) {
      const loadedReplacement = await loadOfficialWorkflow(replacement);
      const replacementData = loadedReplacement?.activeState
        || (loadedReplacement?.content ? JSON.parse(loadedReplacement.content) : null);
      if (!replacementData) {
        return false;
      }
      await app.loadGraphData(replacementData, true, true, loadedReplacement, {
        checkForRerouteMigration: false,
        deferWarnings: true,
        skipAssetScans: !loadedReplacement.isLoaded,
      });
    } else {
      // ComfyUI's loadGraphData() deliberately loads its official default
      // graph when given no graph data.  This matches workflowService's
      // loadDefaultWorkflow() path without copying the frontend's private
      // default-graph definition into the extension.
      await app.loadGraphData();
    }
  }

  await store.closeWorkflow(workflow);
  return true;
}

export function subscribeOfficialWorkflowStore(app, listener) {
  const store = getOfficialWorkflowStore(app);
  if (!store || typeof store.$subscribe !== "function" || typeof listener !== "function") {
    return () => {};
  }
  return store.$subscribe(listener, { detached: true });
}
