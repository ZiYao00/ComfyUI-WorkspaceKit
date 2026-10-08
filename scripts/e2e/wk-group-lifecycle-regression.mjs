// Real 8190 ComfyUI regression for the WorkspaceKit group data ownership boundary.
// The browser context is isolated; the test does not write workflow files to disk.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const BASE_URL = process.env.COMFY_BASE_URL || "http://127.0.0.1:8190/";
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const results = {};
const startupErrors = [];
page.on("pageerror", error => startupErrors.push(String(error?.message || error)));
page.on("console", message => {
  if (message.type() === "error") startupErrors.push(message.text());
});

try {
  await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: 30_000 });
  try {
    await page.waitForFunction(() => {
      const app = window.app;
      return Boolean(window.Workspace2CanvasGroups && app?.rootGraph?._nodes?.length >= 2 && app?.canvas);
    }, null, { timeout: 60_000, polling: 250 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      app: Boolean(window.app),
      graph: Boolean(window.app?.graph),
      rootGraph: Boolean(window.app?.rootGraph),
      nodeCount: window.app?.graph?._nodes?.length ?? -1,
      rootNodeCount: window.app?.rootGraph?._nodes?.length ?? -1,
      initialized: Boolean(window.Workspace2CanvasGroups?.initialized),
      restoreReady: Boolean(window.Workspace2CanvasGroups?._restoreReady),
      overlay: Boolean(window.Workspace2CanvasGroups?.overlay),
      workflowPath: window.app?.extensionManager?.workflow?.activeWorkflow?.path,
      bodyLength: document.body?.innerText?.length || 0,
    }));
    console.error("8190 startup failed", JSON.stringify({ state, startupErrors: startupErrors.slice(0, 24) }));
    throw error;
  }

  // This test isolates serialization and load contracts from unrelated
  // third-party startup hooks. The separate natural-refresh test must *never*
  // use this assisted path.
  results.initialization = await page.evaluate(() => {
    const app = window.app;
    const groups = window.Workspace2CanvasGroups;
    const assisted = !groups.initialized || !groups._restoreReady;
    if (!groups.initialized) groups.init();
    if (!groups._restoreReady) {
      groups._pendingGroups = app.graph?.extra?.xzgGroups || null;
      groups._needRestore = true;
      groups.restoreGroups();
    }
    return { assisted, initialized: groups.initialized, restoreReady: groups._restoreReady };
  });

  Object.assign(results, await page.evaluate(async () => {
    const app = window.app;
    const groups = window.Workspace2CanvasGroups;
    const graph = app.rootGraph;
    app.canvas.deselectAllNodes?.();
    app.canvas.selectItems?.(graph._nodes.slice(0, 2));
    await groups.createGroupFromSelection();
    const groupId = Object.keys(groups.groups)[0];
    if (!groupId) throw new Error("Unable to create a group");
    const original = groups.groups[groupId];

    // A subgraph/another graph must not inherit the active root group's metadata.
    const unrelated = new window.LiteGraph.LGraph();
    const unrelatedSerialized = unrelated.serialize();
    const unrelatedCount = Object.keys(unrelatedSerialized.extra?.xzgGroups || {}).length;

    // Configuring detached/clipboard graphs may restore legacy node fields,
    // but cannot schedule the *active* workflow's group recovery lifecycle.
    const previousNeedRestore = groups._needRestore;
    groups._needRestore = false;
    let foreignConfigureTriggeredRestore;
    try {
      unrelated.configure(structuredClone(graph.serialize()));
      foreignConfigureTriggeredRestore = Boolean(groups._needRestore);
    } finally {
      groups._needRestore = previousNeedRestore;
    }

    // A graph serialize performed before a group overlay has been rehydrated
    // must preserve already loaded workflow metadata rather than overwriting it.
    const groupMap = groups.groups;
    const persistedCount = Object.keys(graph.extra?.xzgGroups || {}).length;
    groups.groups = {};
    let partialSerializedCount;
    try {
      partialSerializedCount = Object.keys(graph.serialize()?.extra?.xzgGroups || {}).length;
    } finally {
      groups.groups = groupMap;
    }

    // Loading a known saved snapshot must restore the snapshot's style/title,
    // not merge attributes from the previous workflow/undo state.
    original.title = "WK lifecycle old title";
    groups.syncGroupsToExtra();
    const snapshot = graph.serialize();
    original.title = "WK lifecycle new title";
    groups.syncGroupsToExtra();
    await app.loadGraphData(snapshot);
    const loadedTitle = groups.groups[groupId]?.title || "";
    const restoredCount = Object.keys(groups.groups || {}).length;

    // Explicit canonical empty metadata is an intentional ungroup/delete.
    // Node-level _xzgGroup compatibility markers must not resurrect the group.
    const explicitlyEmpty = graph.serialize();
    explicitlyEmpty.extra = { ...(explicitlyEmpty.extra || {}), xzgGroups: {} };
    delete explicitlyEmpty._xzgGroups;
    const legacyNodeMarkers = explicitlyEmpty.nodes.filter(
      node => node._xzgGroupId || node._xzgGroup || node.properties?._xzgGroup
    ).length;
    await app.loadGraphData(explicitlyEmpty);
    const resurrectedCount = Object.keys(groups.groups || {}).length;

    // Legacy workflows without a graph-level group map still migrate from
    // their per-node backups, then immediately promote to canonical metadata.
    const legacy = structuredClone(snapshot);
    delete legacy.extra.xzgGroups;
    delete legacy._xzgGroups;
    await app.loadGraphData(legacy);
    const migratedTitle = groups.groups[groupId]?.title || "";
    const migratedGraphCount = Object.keys(app.rootGraph.extra?.xzgGroups || {}).length;

    return { groupId, unrelatedCount, foreignConfigureTriggeredRestore, persistedCount, partialSerializedCount,
      loadedTitle, snapshotTitle: snapshot.extra?.xzgGroups?.[groupId]?.title || "",
      restoredCount, legacyNodeMarkers, resurrectedCount, migratedTitle, migratedGraphCount };
  }));

  const failures = [];
  if (results.unrelatedCount !== 0) failures.push("foreign-graph-serialization-leaked-group");
  if (results.foreignConfigureTriggeredRestore) failures.push("foreign-graph-configure-triggered-active-restore");
  if (results.persistedCount < 1 || results.partialSerializedCount !== results.persistedCount) {
    failures.push("pre-restore-serialization-erased-group");
  }
  if (results.loadedTitle !== results.snapshotTitle) failures.push("restore-overrode-loaded-title");
  if (results.legacyNodeMarkers < 1) failures.push("missing-stale-marker-fixture");
  if (results.resurrectedCount !== 0) failures.push("explicit-empty-resurrected-legacy-group");
  if (results.migratedTitle !== results.snapshotTitle || results.migratedGraphCount !== 1) {
    failures.push("legacy-node-markers-did-not-migrate-to-canonical-workflow");
  }
  results.failures = failures;
  console.log(JSON.stringify(results, null, 2));
  assert.deepEqual(failures, [], "WorkspaceKit group lifecycle persistence contract");
} finally {
  await browser.close();
}
