/**
 * Current-workflow state bridge.
 *
 * This module owns only transient state: the locally tracked dirty snapshot
 * and the subscription to ComfyUI's official workflow Store.  It deliberately
 * does not open, save, rename, close, or render workflows.  Those actions stay
 * in entry.js because their ordering is coupled to the visible canvas.
 *
 * Regression boundary: an official Store notification can arrive during an
 * inline rename.  Rendering is deferred until that transaction completes so
 * the input is not removed.  Likewise, graphChanged is ignored while a graph
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
  const officialBaselineTimers = new Map();

  function snapshot(workflow = serializeCurrentWorkflow()) {
    if (!workflow) return "";
    try {
      return JSON.stringify(workflow);
    } catch (error) {
      console.debug("[Workspace2] Workflow snapshot failed", error);
      return "";
    }
  }

  // Match ComfyUI's ChangeTracker.graphEqual() semantics for the official
  // workflow tabs. A switch stores the viewport in extra.ds and extensions
  // may serialize nodes in a different order; neither represents a graph
  // edit. We intentionally keep links, groups, reroutes, definitions and all
  // node properties in the comparison, so real canvas edits still surface.
  function officialSnapshot(workflow = serializeCurrentWorkflow()) {
    if (!workflow) return "";
    try {
      const copy = JSON.parse(JSON.stringify(workflow));
      if (copy.extra && typeof copy.extra === "object") {
        delete copy.extra.ds;
      }
      if (Array.isArray(copy.nodes)) {
        copy.nodes.sort((left, right) => {
          const leftKey = stableJson(left);
          const rightKey = stableJson(right);
          return leftKey.localeCompare(rightKey);
        });
      }
      return stableJson(copy);
    } catch (error) {
      console.debug("[Workspace2] Official workflow snapshot failed", error);
      return "";
    }
  }

  function stableJson(value) {
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

  function clearDirtyState() {
    state.workflowDirty = false;
    state.workflowSnapshot = "";
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
      state.officialWorkflowSnapshots.set(activePath, officialSnapshot(workflow));
      state.officialWorkflowDirtyPaths.delete(activePath);
      const existingTimer = officialBaselineTimers.get(activePath);
      if (existingTimer) window.clearTimeout(existingTimer);
      // Some ComfyUI extensions finish normalizing a loaded graph after
      // loadGraphData() resolves. Re-capture once after that short settle
      // window so these load-only changes do not become a false dirty dot.
      const timer = window.setTimeout(() => {
        officialBaselineTimers.delete(activePath);
        const currentPath = relativeWorkflowPathFromOfficial(
          getActiveOfficialWorkflow(app)?.path || "",
        );
        if (currentPath !== activePath) return;
        const settledSnapshot = officialSnapshot();
        if (!settledSnapshot) return;
        state.officialWorkflowSnapshots.set(activePath, settledSnapshot);
        state.officialWorkflowDirtyPaths.delete(activePath);
        renderIfWorkflowsActive();
      }, 300);
      officialBaselineTimers.set(activePath, timer);
    }
  }

  // ComfyUI can create an IndexedDB draft while merely switching cached tabs.
  // The official isModified flag then becomes true even though the graph has
  // not changed. WorkspaceKit keeps an in-memory baseline after each open/save
  // and uses the same graph comparison semantics for its own dot/save UI.
  function captureOfficialDirtyState() {
    if (!state.isOfficialRoot) return;
    const activeWorkflow = getActiveOfficialWorkflow(app);
    const path = relativeWorkflowPathFromOfficial(activeWorkflow?.path || "");
    const baseline = state.officialWorkflowSnapshots.get(path);
    if (!path || !baseline) return;

    const currentSnapshot = officialSnapshot();
    const isClean = currentSnapshot === baseline;
    if (isClean) {
      state.officialWorkflowDirtyPaths.delete(path);
    } else {
      state.officialWorkflowDirtyPaths.add(path);
    }
  }

  function isOfficialWorkflowDirty(workflow) {
    const path = relativeWorkflowPathFromOfficial(workflow?.path || "");
    if (!path || !state.officialWorkflowSnapshots.has(path)) {
      return Boolean(workflow?.isModified);
    }
    return state.officialWorkflowDirtyPaths.has(path);
  }

  function remapOfficialWorkflowPathState(oldPath, newPath) {
    const snapshotValue = state.officialWorkflowSnapshots.get(oldPath);
    if (snapshotValue !== undefined) {
      state.officialWorkflowSnapshots.delete(oldPath);
      state.officialWorkflowSnapshots.set(newPath, snapshotValue);
    }
    if (state.officialWorkflowDirtyPaths.delete(oldPath)) {
      state.officialWorkflowDirtyPaths.add(newPath);
    }
  }

  function removeOfficialWorkflowPathState(path) {
    const timer = officialBaselineTimers.get(path);
    if (timer) window.clearTimeout(timer);
    officialBaselineTimers.delete(path);
    state.officialWorkflowSnapshots.delete(path);
    state.officialWorkflowDirtyPaths.delete(path);
  }

  function renderIfWorkflowsActive() {
    if (workspaceState.activeModule === "workflows" && state.workflowsTarget?.isConnected) {
      renderWorkflowsPanel(state.workflowsTarget);
    }
  }

  function setupDirtyTracking() {
    if (dirtyTrackingReady) return;
    const api = app.api;
    if (typeof api?.addEventListener !== "function") {
      console.debug("[Workspace2] graphChanged event is unavailable; unsaved workflow indicator is disabled.");
      return;
    }
    dirtyTrackingReady = true;
    api.addEventListener("graphChanged", () => {
      if (state.workflowDirtyCheckTimer) window.clearTimeout(state.workflowDirtyCheckTimer);
      state.workflowDirtyCheckTimer = window.setTimeout(() => {
        state.workflowDirtyCheckTimer = null;
        if (state.isOfficialRoot) {
          captureOfficialDirtyState();
          renderIfWorkflowsActive();
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

  function syncOfficialSelection() {
    if (!state.isOfficialRoot) return;
    const activeWorkflow = getActiveOfficialWorkflow(app);
    const path = relativeWorkflowPathFromOfficial(activeWorkflow?.path || "");
    if (path) state.selectedPath = path;
  }

  function scheduleOfficialPanelRender() {
    if (state.workflowRenameInProgress) {
      state.officialWorkflowRenderPending = true;
      return;
    }
    if (state.officialWorkflowRenderTimer) window.clearTimeout(state.officialWorkflowRenderTimer);
    state.officialWorkflowRenderTimer = window.setTimeout(() => {
      state.officialWorkflowRenderTimer = null;
      if (state.workflowRenameInProgress) {
        state.officialWorkflowRenderPending = true;
        return;
      }
      syncOfficialSelection();
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
    syncOfficialSelection();
  }

  return {
    snapshot,
    clearDirtyState,
    setCleanState,
    captureOfficialDirtyState,
    isOfficialWorkflowDirty,
    remapOfficialWorkflowPathState,
    removeOfficialWorkflowPathState,
    setupDirtyTracking,
    syncOfficialSelection,
    scheduleOfficialPanelRender,
    setupOfficialStoreSync,
  };
}
