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

function restoreOfficialWorkflowOrder(store, stableOrder) {
  if (typeof store?.reorderWorkflows !== "function" || !Array.isArray(stableOrder)) return;
  for (let index = 0; index < stableOrder.length; index += 1) {
    const currentPaths = (store.openWorkflows || []).filter(Boolean).map(workflowPath);
    const from = currentPaths.indexOf(stableOrder[index]);
    if (from >= 0 && from !== index) {
      store.reorderWorkflows(from, index);
    }
  }
}

function ensureOfficialWorkflowNavigationAnchor(app, store) {
  let activePath = workflowPath(store?.activeWorkflow);
  if (activePath) {
    const activeIsOpen = (store.openWorkflows || []).filter(Boolean)
      .some((entry) => workflowPath(entry) === activePath);
    if (!activeIsOpen) {
      store.openWorkflowsInBackground({ left: [activePath] });
    }
    const anchored = (store.openWorkflows || []).filter(Boolean)
      .some((entry) => workflowPath(entry) === activePath);
    return anchored
      ? { anchored: true, activePath, bootstrapCreated: false }
      : { anchored: false, activePath, bootstrapCreated: false, reason: "official-active-not-open" };
  }

  // ComfyUI can start with a painted default graph while the Workflow Store
  // still has activeWorkflow=null/openWorkflows=[] (reproduced on the 0.34.0
  // test package with frontend 1.52.7). Register that existing canvas as an
  // official temporary workflow before using NextOpenedWorkflow. This does not
  // load or replace a graph; it only gives the official workflow service an
  // anchor from which its own queue can navigate to the requested target.
  if (
    typeof store?.createTemporary !== "function"
    || typeof store?.openWorkflow !== "function"
  ) {
    return { anchored: false, activePath: "", bootstrapCreated: false, reason: "official-navigation-anchor-unavailable" };
  }

  const graph = app?.graph || app?.canvas?.graph;
  if (typeof graph?.serialize !== "function") {
    return { anchored: false, activePath: "", bootstrapCreated: false, reason: "official-current-graph-unavailable" };
  }

  const bootstrap = store.createTemporary(undefined, graph.serialize());
  return Promise.resolve(store.openWorkflow(bootstrap)).then((loadedBootstrap) => {
    activePath = workflowPath(loadedBootstrap || store.activeWorkflow || bootstrap);
    const anchored = Boolean(activePath)
      && (store.openWorkflows || []).filter(Boolean)
        .some((entry) => workflowPath(entry) === activePath);

    return anchored
      ? { anchored: true, activePath, bootstrapCreated: true }
      : { anchored: false, activePath, bootstrapCreated: true, reason: "official-navigation-bootstrap-failed" };
  });
}

/**
 * Route a direct WorkspaceKit target through the ComfyUI workflow service.
 *
 * ComfyUI does not currently expose workflowService.openWorkflow(target) on the
 * extension API. Its public Workspace.NextOpenedWorkflow command does delegate
 * to that service, including the official load queue, ChangeTracker lifecycle,
 * navigation intent and failure recovery. Temporarily place the requested
 * target beside the active official tab, invoke that command, then restore the
 * visible tab order immediately. The command captures its target synchronously
 * before its first await, so concurrent user clicks remain owned and serialized
 * by ComfyUI rather than by a second WorkspaceKit load queue.
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

  const execute = app?.extensionManager?.command?.execute;
  if (
    typeof execute !== "function"
    || typeof store.openWorkflowsInBackground !== "function"
    || typeof store.reorderWorkflows !== "function"
  ) {
    return { opened: false, initializeCleanState: false, reason: "official-navigation-unavailable" };
  }

  const anchorResult = ensureOfficialWorkflowNavigationAnchor(app, store);
  const anchor = typeof anchorResult?.then === "function"
    ? await anchorResult
    : anchorResult;
  if (!anchor.anchored) {
    return {
      opened: false,
      initializeCleanState: false,
      reason: anchor.reason || "official-navigation-anchor-failed",
    };
  }

  const wasAlreadyOpen = (store.openWorkflows || []).filter(Boolean)
    .some((entry) => workflowPath(entry) === targetPath);
  if (!wasAlreadyOpen) {
    store.openWorkflowsInBackground({ right: [targetPath] });
  }

  const stableOrder = (store.openWorkflows || []).filter(Boolean).map(workflowPath);
  const activePath = anchor.activePath;
  const activeIndex = stableOrder.indexOf(activePath);
  const targetIndex = stableOrder.indexOf(targetPath);
  if (activeIndex < 0 || targetIndex < 0) {
    if (!wasAlreadyOpen && typeof store.closeWorkflow === "function") {
      await store.closeWorkflow(workflow);
    }
    return { opened: false, initializeCleanState: false, reason: "official-navigation-state-mismatch" };
  }

  const desiredIndex = (activeIndex + 1) % stableOrder.length;
  if (targetIndex !== desiredIndex) {
    store.reorderWorkflows(targetIndex, desiredIndex);
  }

  let activated = false;
  const noteActivation = () => {
    if (workflowPath(store.activeWorkflow) === targetPath) activated = true;
  };
  const unsubscribe = typeof store.$subscribe === "function"
    ? store.$subscribe(noteActivation, { detached: true, flush: "sync" })
    : () => {};

  let commandPromise;
  try {
    commandPromise = execute("Workspace.NextOpenedWorkflow");
  } finally {
    // Restore immediately: the official command has already captured the
    // adjacent target before its first await, while later rapid clicks see the
    // normal tab order instead of this routing-only arrangement.
    restoreOfficialWorkflowOrder(store, stableOrder);
  }

  try {
    await commandPromise;
    noteActivation();
  } catch (error) {
    noteActivation();
    if (!wasAlreadyOpen && !activated && typeof store.closeWorkflow === "function") {
      const current = getOfficialWorkflowByPath(app, targetPath) || workflow;
      await store.closeWorkflow(current);
    }
    throw error;
  } finally {
    unsubscribe?.();
  }

  const current = getOfficialWorkflowByPath(app, targetPath) || workflow;
  if (!activated && !wasAlreadyOpen && typeof store.closeWorkflow === "function") {
    await store.closeWorkflow(current);
  }
  return {
    opened: activated,
    initializeCleanState: activated && !wasAlreadyOpen,
    reason: activated ? "opened" : "official-navigation-did-not-activate",
  };
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
