import {
  officialWorkflowSnapshot,
  planExecutionDirtyReconciliation,
} from "./dirty-snapshot.js";

/**
 * Current-workflow state bridge.
 *
 * This module owns only transient state: the locally tracked dirty snapshot,
 * the official semantic dirty baseline, queue-time reconciliation, and the
 * subscription to ComfyUI's official workflow Store. It deliberately does not
 * open, save, rename, close, or render workflows. Those actions stay in
 * entry.js because their ordering is coupled to the visible canvas.
 *
 * Regression boundary: an official Store notification can arrive during an
 * inline rename. Rendering is deferred until that transaction completes so
 * the input is not removed. Likewise, graphChanged is ignored while a graph
 * is loading so a normal workflow switch never creates a false dirty marker.
 */
export function createWorkflowOpenState({
  app,
  state,
  workspaceState,
  serializeCurrentWorkflow,
  getActiveOfficialWorkflow,
  getOfficialWorkflowStore,
  subscribeOfficialWorkflowStore,
  relativeWorkflowPathFromOfficial,
  renderWorkflowsPanel,
}) {
  let dirtyTrackingReady = false;
  let officialSyncReady = false;
  const officialBaselineInitTasks = new Map();
  const officialBaselinePendingPaths = new Set();
  const officialBaselinePendingDirtyPaths = new Set();
  const officialQueueTransactions = new Map();
  const provisionalOfficialGraphChanges = [];
  const MAX_QUEUE_TRANSACTIONS = 32;

  function snapshot(workflow = serializeCurrentWorkflow()) {
    if (!workflow) return "";
    try {
      return JSON.stringify(workflow);
    } catch (error) {
      console.debug("[Workspace2] Workflow snapshot failed", error);
      return "";
    }
  }

  function officialSnapshot(workflow = serializeCurrentWorkflow()) {
    if (!workflow) return "";
    try {
      return officialWorkflowSnapshot(workflow);
    } catch (error) {
      console.debug("[Workspace2] Official workflow snapshot failed", error);
      return "";
    }
  }

  function activeOfficialPath() {
    return relativeWorkflowPathFromOfficial(
      getActiveOfficialWorkflow(app)?.path || "",
    );
  }

  function clearDirtyState() {
    state.workflowDirty = false;
    state.workflowSnapshot = "";
  }

  function cancelOfficialBaselineInitTask(path) {
    const task = officialBaselineInitTasks.get(path);
    if (!task) return;
    officialBaselineInitTasks.delete(path);
    if (task.kind === "idle" && typeof window.cancelIdleCallback === "function") {
      window.cancelIdleCallback(task.id);
    } else {
      window.clearTimeout(task.id);
    }
  }

  function scheduleOfficialBaselineTask(path, callback) {
    cancelOfficialBaselineInitTask(path);
    if (typeof window.requestIdleCallback === "function") {
      // Do not provide a timeout: a large semantic snapshot must never be forced
      // into an active interaction window merely because the user kept working.
      const id = window.requestIdleCallback(callback);
      officialBaselineInitTasks.set(path, { kind: "idle", id });
      return;
    }
    // Chromium (ComfyUI's primary runtime) supports requestIdleCallback. Keep a
    // conservative fallback for older hosts, but well outside the switch turn.
    const id = window.setTimeout(callback, 500);
    officialBaselineInitTasks.set(path, { kind: "timeout", id });
  }

  function scheduleOfficialCleanBaseline(workflow, officialPath = "") {
    if (!state.isOfficialRoot || !workflow) return;
    const path = relativeWorkflowPathFromOfficial(officialPath || workflow?.path || "");
    if (!path) return;

    officialBaselinePendingPaths.add(path);
    if (workflow.isModified) officialBaselinePendingDirtyPaths.add(path);
    else officialBaselinePendingDirtyPaths.delete(path);
    state.officialWorkflowDirtyPaths.delete(path);

    // Opening an official workflow is a hot path. Build the expensive canonical
    // snapshot only when the browser is idle. A pending edit is detected through
    // ComfyUI's ChangeTracker, so load-time migrations may settle into the clean
    // baseline without swallowing a real edit made immediately after opening.
    scheduleOfficialBaselineTask(path, () => {
      officialBaselineInitTasks.delete(path);
      const changedWhilePending = officialBaselinePendingDirtyPaths.has(path)
        || Boolean(workflow.isModified);
      officialBaselinePendingPaths.delete(path);
      officialBaselinePendingDirtyPaths.delete(path);

      if (changedWhilePending) {
        state.officialWorkflowSnapshots.delete(path);
        state.officialWorkflowDirtyPaths.add(path);
        refreshSaveSurfaces();
        return;
      }

      const baselineSource = activeOfficialPath() === path
        ? serializeCurrentWorkflow()
        : workflow.activeState;
      const baseline = officialSnapshot(baselineSource);
      if (!baseline) {
        state.officialWorkflowSnapshots.delete(path);
        state.officialWorkflowDirtyPaths.delete(path);
        refreshSaveSurfaces();
        return;
      }

      state.officialWorkflowSnapshots.set(path, baseline);
      state.officialWorkflowDirtyPaths.delete(path);
      refreshSaveSurfaces();
    });
  }

  function setCleanState(workflow = serializeCurrentWorkflow(), officialPath = "") {
    state.workflowDirty = false;
    state.workflowSnapshot = snapshot(workflow);
    const activeWorkflow = getActiveOfficialWorkflow(app);
    // Saving already knows its target path. Prefer that stable identity over
    // reading activeWorkflow here: the official store may replace the active
    // object while completing a save, but the sidebar dirty set is path-keyed.
    const activePath = relativeWorkflowPathFromOfficial(
      officialPath || activeWorkflow?.path || "",
    );
    if (state.isOfficialRoot && activePath && state.workflowSnapshot) {
      cancelOfficialBaselineInitTask(activePath);
      officialBaselinePendingPaths.delete(activePath);
      officialBaselinePendingDirtyPaths.delete(activePath);
      state.officialWorkflowSnapshots.set(activePath, officialSnapshot(workflow));
      state.officialWorkflowDirtyPaths.delete(activePath);
    }
  }

  // ComfyUI can create an IndexedDB draft while merely switching cached tabs.
  // The official isModified flag can also become true after queue-time widget
  // callbacks such as random/increment seed. WorkspaceKit therefore keeps an
  // in-memory semantic baseline for its own dot/save UI and never rewrites the
  // official ChangeTracker.
  function captureOfficialDirtyState() {
    if (!state.isOfficialRoot) return;
    const path = activeOfficialPath();
    if (!path) return;
    if (officialBaselinePendingPaths.has(path)) {
      const workflow = getActiveOfficialWorkflow(app);
      if (workflow?.isModified) officialBaselinePendingDirtyPaths.add(path);
      return;
    }
    const baseline = state.officialWorkflowSnapshots.get(path);
    if (!baseline) return;

    const currentSnapshot = officialSnapshot();
    const isClean = currentSnapshot === baseline;
    if (isClean) {
      state.officialWorkflowDirtyPaths.delete(path);
    } else {
      state.officialWorkflowDirtyPaths.add(path);
    }
  }

  function getOfficialWorkflowSaveState(workflow) {
    const path = relativeWorkflowPathFromOfficial(workflow?.path || "");
    const temporary = workflow?.isTemporary === true || workflow?.isPersisted === false;
    if (temporary) {
      return { status: "temporary", needsSave: true, dirty: true, pending: false };
    }
    if (!path) {
      return { status: "clean", needsSave: false, dirty: false, pending: false };
    }
    if (officialBaselinePendingPaths.has(path)) {
      const dirty = officialBaselinePendingDirtyPaths.has(path);
      return {
        status: dirty ? "dirty" : "baseline-pending",
        needsSave: dirty,
        dirty,
        pending: true,
      };
    }
    if (state.officialWorkflowSnapshots.has(path)) {
      const dirty = state.officialWorkflowDirtyPaths.has(path);
      return { status: dirty ? "dirty" : "clean", needsSave: dirty, dirty, pending: false };
    }
    const dirty = Boolean(workflow?.isModified);
    return { status: dirty ? "dirty" : "clean", needsSave: dirty, dirty, pending: false };
  }

  function isOfficialWorkflowDirty(workflow) {
    return getOfficialWorkflowSaveState(workflow).dirty;
  }

  function queueRequestId(event) {
    const requestId = event?.detail?.requestId;
    return requestId === undefined || requestId === null ? null : requestId;
  }

  function trimQueueTransactions() {
    while (officialQueueTransactions.size > MAX_QUEUE_TRANSACTIONS) {
      const oldest = officialQueueTransactions.keys().next().value;
      if (oldest === undefined) break;
      officialQueueTransactions.delete(oldest);
    }
  }

  function beginOfficialQueueTransaction(event) {
    if (!state.isOfficialRoot) return;
    const requestId = queueRequestId(event);
    if (requestId === null) return;

    const path = activeOfficialPath();
    const baseline = state.officialWorkflowSnapshots.get(path);
    const beforeSnapshot = officialSnapshot();
    if (!path || !beforeSnapshot) return;

    const workflow = getActiveOfficialWorkflow(app);
    const pendingClean = officialBaselinePendingPaths.has(path)
      && !officialBaselinePendingDirtyPaths.has(path)
      && !workflow?.isModified;
    if (!baseline && !pendingClean) return;

    officialQueueTransactions.set(requestId, {
      path,
      beforeSnapshot,
      startedClean: baseline ? beforeSnapshot === baseline : pendingClean,
      tainted: false,
    });
    trimQueueTransactions();
  }

  function noteOfficialGraphChange() {
    if (!state.isOfficialRoot || !officialQueueTransactions.size) return;

    const path = activeOfficialPath();
    const currentSnapshot = officialSnapshot();
    if (!path || !currentSnapshot) return;

    const marker = {
      path,
      snapshot: currentSnapshot,
      consumed: false,
    };
    provisionalOfficialGraphChanges.push(marker);

    const confirmTaint = () => {
      const index = provisionalOfficialGraphChanges.indexOf(marker);
      if (index >= 0) provisionalOfficialGraphChanges.splice(index, 1);
      if (marker.consumed) return;

      // A graphChanged that survives until the next microtask was not claimed
      // by a synchronous promptQueued completion. It can therefore include a
      // real user/third-party edit, so every clean-start transaction for this
      // workflow fails closed.
      for (const transaction of officialQueueTransactions.values()) {
        if (transaction.path === marker.path && transaction.startedClean) {
          transaction.tainted = true;
        }
      }
    };

    if (typeof queueMicrotask === "function") {
      queueMicrotask(confirmTaint);
    } else {
      Promise.resolve().then(confirmTaint);
    }
  }

  function consumePromptQueuedGraphChange(path, afterSnapshot) {
    for (let index = provisionalOfficialGraphChanges.length - 1; index >= 0; index -= 1) {
      const marker = provisionalOfficialGraphChanges[index];
      if (marker.consumed || marker.path !== path || marker.snapshot !== afterSnapshot) continue;
      marker.consumed = true;
      return true;
    }
    return false;
  }

  function reconcileOfficialQueueTransaction(event) {
    if (!state.isOfficialRoot) return;
    const requestId = queueRequestId(event);
    if (requestId === null) return;

    const transaction = officialQueueTransactions.get(requestId);
    officialQueueTransactions.delete(requestId);
    if (!transaction) return;

    const path = activeOfficialPath();
    const afterSnapshot = officialSnapshot();
    consumePromptQueuedGraphChange(path, afterSnapshot);
    const plan = planExecutionDirtyReconciliation({
      beforeSnapshot: transaction.beforeSnapshot,
      afterSnapshot,
      startedClean: transaction.startedClean,
      tainted: transaction.tainted,
      sameWorkflow: path === transaction.path,
      currentDirty: state.officialWorkflowDirtyPaths.has(transaction.path),
    });
    if (!plan.absorb || !afterSnapshot) return;

    // The queue began from WorkspaceKit-clean state and no intervening real
    // graph edit was observed. Treat the post-queue graph as the new effective
    // clean baseline for WorkspaceKit only. ComfyUI's own isModified,
    // undo/redo and draft state are intentionally left untouched.
    cancelOfficialBaselineInitTask(transaction.path);
    officialBaselinePendingPaths.delete(transaction.path);
    officialBaselinePendingDirtyPaths.delete(transaction.path);
    state.officialWorkflowSnapshots.set(transaction.path, afterSnapshot);
    state.officialWorkflowDirtyPaths.delete(transaction.path);
    refreshSaveSurfaces();
  }

  function remapOfficialWorkflowPathState(oldPath, newPath) {
    cancelOfficialBaselineInitTask(oldPath);
    officialBaselinePendingPaths.delete(oldPath);
    officialBaselinePendingDirtyPaths.delete(oldPath);
    const snapshotValue = state.officialWorkflowSnapshots.get(oldPath);
    if (snapshotValue !== undefined) {
      state.officialWorkflowSnapshots.delete(oldPath);
      state.officialWorkflowSnapshots.set(newPath, snapshotValue);
    }
    if (state.officialWorkflowDirtyPaths.delete(oldPath)) {
      state.officialWorkflowDirtyPaths.add(newPath);
    }
    // Renaming while a queue request is pending changes workflow identity.
    // Drop those transactions rather than guessing whether their final graph
    // belongs to the old or new path.
    for (const [requestId, transaction] of officialQueueTransactions) {
      if (transaction.path === oldPath) officialQueueTransactions.delete(requestId);
    }
  }

  function removeOfficialWorkflowPathState(path) {
    cancelOfficialBaselineInitTask(path);
    officialBaselinePendingPaths.delete(path);
    officialBaselinePendingDirtyPaths.delete(path);
    state.officialWorkflowSnapshots.delete(path);
    state.officialWorkflowDirtyPaths.delete(path);
    for (const [requestId, transaction] of officialQueueTransactions) {
      if (transaction.path === path) officialQueueTransactions.delete(requestId);
    }
  }

  function renderIfWorkflowsActive() {
    if (workspaceState.activeModule === "workflows" && state.workflowsTarget?.isConnected) {
      renderWorkflowsPanel(state.workflowsTarget);
    }
  }

  function refreshSaveSurfaces() {
    renderIfWorkflowsActive();
    workspaceState.topbarSaveButton?.refresh?.();
  }

  function setupDirtyTracking() {
    if (dirtyTrackingReady) return;
    const api = app.api;
    if (typeof api?.addEventListener !== "function") {
      console.debug("[Workspace2] graphChanged event is unavailable; unsaved workflow indicator is disabled.");
      return;
    }
    dirtyTrackingReady = true;

    // promptQueueing is the earliest public queue boundary. ComfyUI's own
    // promptQueued listener may run before an extension listener and emit a
    // nested graphChanged synchronously. graphChanged is therefore recorded as
    // provisional and only confirmed as an external edit in the next microtask.
    // Our later promptQueued listener can claim the matching synchronous change
    // in the same dispatch turn. Missing requestId on an older frontend simply
    // disables reconciliation and falls back to conservative dirty behavior.
    api.addEventListener("promptQueueing", beginOfficialQueueTransaction);
    api.addEventListener("promptQueued", reconcileOfficialQueueTransaction);

    api.addEventListener("graphChanged", () => {
      noteOfficialGraphChange();
      if (state.workflowDirtyCheckTimer) window.clearTimeout(state.workflowDirtyCheckTimer);
      state.workflowDirtyCheckTimer = window.setTimeout(() => {
        state.workflowDirtyCheckTimer = null;
        if (state.isOfficialRoot) {
          captureOfficialDirtyState();
          refreshSaveSurfaces();
          return;
        }
        if (
          !state.selectedPath
          || state.workflowDirty
          || state.workflowLoadInProgress
          || !state.workflowSnapshot
        ) {
          return;
        }
        if (snapshot() === state.workflowSnapshot) return;
        state.workflowDirty = true;
        renderIfWorkflowsActive();
      }, 0);
    });
  }

  // A render arriving from the official store must not tear down an open inline
  // rename input. createFolder() schedules such a sync moments after mounting
  // its input, which is how a brand-new folder used to lose its editor.
  function isInlineEditing() {
    return Boolean(state.editingPath) || Boolean(state.workflowRenameInProgress);
  }

  // Deliberately does not touch state.selectedPath any more.
  // The Browse tree's selection is owned by the user's own clicks.
  //
  // This module used to overwrite state.selectedPath with the canvas's active
  // workflow on every official-store notification, which dragged the Browse
  // selection onto whatever workflow happened to be open — most visibly right
  // after creating a folder. Nothing legitimate depended on that write: the Open
  // section highlights the live workflow by object identity, and
  // selectedFolderPath() only answers for folders, so a workflow-file path never
  // influenced where new folders land. The write, and the now-empty function that
  // performed it, are gone.

  function scheduleOfficialPanelRender() {
    if (isInlineEditing()) {
      state.officialWorkflowRenderPending = true;
      return;
    }
    if (state.officialWorkflowRenderTimer) window.clearTimeout(state.officialWorkflowRenderTimer);
    state.officialWorkflowRenderTimer = window.setTimeout(() => {
      state.officialWorkflowRenderTimer = null;
      if (isInlineEditing()) {
        state.officialWorkflowRenderPending = true;
        return;
      }
      renderIfWorkflowsActive();
    }, 0);
  }

  function setupOfficialStoreSync() {
    if (officialSyncReady) return;
    if (!getOfficialWorkflowStore(app)) {
      console.debug("[Workspace2] Official workflow state is unavailable; using local workflow state.");
      return;
    }
    officialSyncReady = true;
    subscribeOfficialWorkflowStore(app, scheduleOfficialPanelRender);
  }

  return {
    snapshot,
    clearDirtyState,
    setCleanState,
    scheduleOfficialCleanBaseline,
    captureOfficialDirtyState,
    getOfficialWorkflowSaveState,
    isOfficialWorkflowDirty,
    remapOfficialWorkflowPathState,
    removeOfficialWorkflowPathState,
    setupDirtyTracking,
    scheduleOfficialPanelRender,
    setupOfficialStoreSync,
  };
}
