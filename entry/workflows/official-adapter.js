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

export async function openOfficialWorkflow(app, workflow) {
  const store = getOfficialWorkflowStore(app);
  if (!store || !workflow) {
    return false;
  }
  await store.openWorkflow(workflow);
  return true;
}

export async function saveOfficialWorkflow(workflow) {
  if (typeof workflow?.save !== "function") {
    return false;
  }
  await workflow.save();
  return true;
}

export async function closeOfficialWorkflow(app, workflow) {
  const store = getOfficialWorkflowStore(app);
  if (!store || !workflow || typeof store.closeWorkflow !== "function") {
    return false;
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
