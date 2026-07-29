// Shared helpers for real-page WorkspaceKit e2e tests.
// Keep everything in this file read-only against the running test package
// (only the browser installs a route guard that blocks mutation POSTs).

const BASE_URL_DEFAULT = 'http://127.0.0.1:8190/';

// Mutation endpoints that no read-only test should ever hit. If a test needs
// to hit one, it should call installReadOnlyGuard with an override list.
const DEFAULT_FORBIDDEN = [
  '/api/prompt', '/api/queue',
  '/workflow', '/workflows',
];

export function tsLog(step, detail) {
  const stamp = new Date().toISOString();
  console.log(detail === undefined ? `[${stamp}] ${step}` : `[${stamp}] ${step}: ${detail}`);
}

/**
 * Aborts any surprise mutation POST. Read verbs pass through.
 * Extra forbidden paths can be appended per-test.
 */
export async function installReadOnlyGuard(page, extra = []) {
  const forbidden = [...DEFAULT_FORBIDDEN, ...extra];
  await page.route('**/*', (route) => {
    const req = route.request();
    const m = req.method();
    if (m === 'GET' || m === 'HEAD' || m === 'OPTIONS') return route.continue();
    const url = req.url();
    const path = new URL(url).pathname.toLowerCase();
    if (m === 'POST' && forbidden.some(n => path.includes(n))) {
      tsLog('guard_tripped', `${m} ${url}`);
      return route.abort();
    }
    route.continue();
  });
}

/**
 * Attaches console/pageerror collectors and returns an accessor that filters
 * for WorkspaceKit-related errors.
 */
export function attachErrorCollector(page) {
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console.error: ' + m.text()); });
  return {
    all: () => errs,
    workspacekitRelated: () => errs.filter(e => /workspace|workspacekit|xzg/i.test(e)),
  };
}

/**
 * Waits for ComfyUI to fully mount: canvas attached, window.app.extensionManager
 * ready, and the WorkspaceKit extension registered.
 */
export async function waitForWorkspaceKitReady(page, { timeout = 40_000, settleMs = 3_000 } = {}) {
  await page.waitForSelector('canvas', { state: 'attached', timeout: 20_000 });
  await page.waitForFunction(() => {
    const a = window.app;
    return a && a.extensionManager && Array.isArray(a.extensions)
      && a.extensions.some(e => e && e.name === 'comfyui.workspace2');
  }, null, { timeout, polling: 500 });
  await page.waitForTimeout(settleMs);
}

/**
 * Opens a workflow fixture using the same call signature WorkspaceKit uses
 * internally (openWorkflowFromOfficialStore -> app.loadGraphData). Returns
 * { ok, reason?, path?, filename? }.
 */
export async function openFixture(page, name) {
  return page.evaluate(async (fixtureName) => {
    const app = window.app;
    const ws = app?.extensionManager?.workflow;
    if (!ws) return { ok: false, reason: 'no workflow store' };
    try {
      if (typeof ws.syncWorkflows === 'function') await ws.syncWorkflows();
      const all = ws.workflows || [];
      const target = all.find(w =>
        (w.filename === fixtureName) ||
        (w.filename === fixtureName + '.json') ||
        (w.path && (w.path.endsWith('/' + fixtureName + '.json') || w.path.endsWith('\\' + fixtureName + '.json')))
      );
      if (!target) return { ok: false, reason: 'fixture not in store', sample: all.slice(0, 5).map(w => w.filename || w.path) };

      let content = target.content;
      if (typeof content !== 'string' && target.load) {
        try { await target.load(); content = target.content; } catch (e) {}
      }
      if (typeof content !== 'string') return { ok: false, reason: 'target has no content string' };
      const workflowData = JSON.parse(content);
      await app.loadGraphData(workflowData, true, true, target, {
        checkForRerouteMigration: false,
        deferWarnings: true,
        skipAssetScans: true,
      });
      return { ok: true, path: target.path, filename: target.filename };
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e), stack: (e && e.stack || '').split('\n').slice(0,5).join(' | ') };
    }
  }, name);
}

/**
 * Snapshots the current graph state from the live app instance. All read.
 */
export async function readGraphState(page) {
  return page.evaluate(() => {
    const g = window.app?.graph;
    const nativeGroups = (g?._groups || g?.groups || []).map(gr => ({
      title: gr.title || gr._title,
      bounding: Array.isArray(gr._bounding) ? Array.from(gr._bounding).slice(0, 4)
              : Array.isArray(gr.bounding) ? gr.bounding.slice(0, 4) : null,
    }));
    const xzg = g?.extra?.xzgGroups || {};
    const workspacekit = g?.extra?.workspacekit || {};
    return {
      representation: workspacekit.groupRepresentation,
      nativeCount: nativeGroups.length,
      nativeTitles: nativeGroups.map(x => x.title),
      wkCount: Object.keys(xzg).length,
      wkTitles: Object.values(xzg).map(v => v && v.title),
      archivePresent: Boolean(workspacekit.groupConversion),
      archiveSchema: workspacekit.groupConversion?.schemaVersion,
      archiveSource: workspacekit.groupConversion?.source,
      archiveGroupCount: workspacekit.groupConversion ? Object.keys(workspacekit.groupConversion.groups || {}).length : 0,
      archiveTitles: workspacekit.groupConversion ? Object.values(workspacekit.groupConversion.groups || {}).map(g => g && g.title) : [],
      wkOverlayDom: document.querySelectorAll('.xzg-group-box').length,
      nodeCount: (g?._nodes || g?.nodes || []).length,
    };
  });
}

/**
 * Dynamic-imports workspace2CanvasGroups from the served extension URL.
 * Returns { ok, mod?, reason? }. Callers should extract functions from mod.
 *
 * T-309 in TECH_DEBT.zh-CN.md tracks a cleaner alternative (either
 * window.__workspaceKitInternals or a helper in this file that pins the
 * version query string). Today's tests hardcode the ?v= query the same way
 * entry.js does.
 */
export async function importCanvasGroupsModule(page) {
  return page.evaluate(async () => {
    try {
      const url = '/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js?v=20260727_group_reverse_conversion_c6_4';
      const mod = await import(url);
      if (!mod?.workspace2CanvasGroups) return { ok: false, reason: 'no workspace2CanvasGroups in module' };
      return { ok: true };  // signal only; caller does its own evaluate to call functions
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e) };
    }
  });
}

/**
 * Calls workspace2CanvasGroups.convertCurrentWorkflowToNative() and returns its
 * result. Also captures a pre-conversion sanity snapshot so the caller can
 * assert alignment between wk internal state and graph.extra.
 */
export async function callConvertToNative(page) {
  return page.evaluate(async () => {
    try {
      const url = '/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js?v=20260727_group_reverse_conversion_c6_4';
      const mod = await import(url);
      const wk = mod.workspace2CanvasGroups;
      if (!wk || typeof wk.convertCurrentWorkflowToNative !== 'function') {
        return { ok: false, reason: 'convertCurrentWorkflowToNative missing on module' };
      }
      const preSanity = {
        modGroupCount: Object.keys(wk.groups || {}).length,
        extraGroupCount: Object.keys(window.app?.graph?.extra?.xzgGroups || {}).length,
        representation: window.app?.graph?.extra?.workspacekit?.groupRepresentation,
      };
      const result = wk.convertCurrentWorkflowToNative();
      return { ok: true, result, preSanity };
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e), stack: (e && e.stack || '').split('\n').slice(0,5).join(' | ') };
    }
  });
}

/**
 * Calls workspace2CanvasGroups.convertCurrentWorkflowToWorkspaceKit() (reverse
 * conversion) and returns its result. The returned `result.plan` includes
 * `restoredGroupIds`, `newGroupIds`, and `archivedGroupIdsWithoutNativeMatch`
 * so the caller can assert archive-matching semantics.
 */
export async function callConvertToWorkspaceKit(page) {
  return page.evaluate(async () => {
    try {
      const url = '/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js?v=20260727_group_reverse_conversion_c6_4';
      const mod = await import(url);
      const wk = mod.workspace2CanvasGroups;
      if (!wk || typeof wk.convertCurrentWorkflowToWorkspaceKit !== 'function') {
        return { ok: false, reason: 'convertCurrentWorkflowToWorkspaceKit missing on module' };
      }
      const preSanity = {
        modGroupCount: Object.keys(wk.groups || {}).length,
        nativeCount: (window.app?.graph?._groups || window.app?.graph?.groups || []).length,
        representation: window.app?.graph?.extra?.workspacekit?.groupRepresentation,
      };
      const result = wk.convertCurrentWorkflowToWorkspaceKit();
      return { ok: true, result, preSanity };
    } catch (e) {
      return { ok: false, reason: String(e && e.message || e), stack: (e && e.stack || '').split('\n').slice(0,5).join(' | ') };
    }
  });
}

export { BASE_URL_DEFAULT };
