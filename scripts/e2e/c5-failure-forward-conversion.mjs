// T-004 C5 failure-injection acceptance.
//
// Two scenarios, both exercise the pre-mutation validation loop in
// workspace2_canvas_groups.js:3095-3106. On failure, `originalExtra` has not
// been captured yet, so no state should have leaked through.
//
//   1. _wk-c5-invalid-bounds.json  -- disk fixture with a WorkspaceKit group
//      whose bounds have w=0. loadGraphData preserves the invalid bounds
//      because recomputeMembership uses bounds to compute members and simply
//      returns early on degenerate geometry, so the pre-validation check
//      still sees `w=0` and throws.
//
//   2. runtime-injected missing-node -- the pre-validation for
//      `nodeIds references a missing node` cannot be triggered from disk
//      because recomputeMembership filters `nodeIds` against the current
//      graph before conversion runs (verified 2026-07-27 by probe). We test
//      this branch by loading a benign fixture and then, from the test, mutating
//      wk.groups[gid].nodeIds to inject a phantom id right before calling
//      convert. This is the only path a runtime caller could reach the
//      "missing node" error, e.g. a future feature that constructs groups
//      without running recomputeMembership.
//
// Both scenarios assert the graph and node markers are identical after the
// failed convert to what they were before.
//
// SAFETY: read-only against fixtures on disk.

import { chromium } from 'playwright';
import fs from 'node:fs';
import {
  BASE_URL_DEFAULT, tsLog, installReadOnlyGuard, attachErrorCollector,
  waitForWorkspaceKitReady, openFixture, readGraphState, callConvertToNative,
} from './lib/wk-runtime.mjs';

const DISK_FIXTURE = {
  name: '_wk-c5-invalid-bounds',
  absPath: 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows\\_wk-c5-invalid-bounds.json',
  expectedErrorPattern: /invalid bounds/i,
  expectedBadTitle: 'wk-bad-bounds',
};

// Reuse the benign forward-conversion fixture from T-003 for the injection
// scenario: it opens cleanly and carries no pre-existing conversion state.
// We do NOT expose it as a mutation of that fixture on disk — we mutate
// wk.groups in-memory after loading it. The disk file is unchanged.
const INJECTION_FIXTURE = {
  name: '_wk-c5-mixed',  // 1 native + 1 wk overlay, from T-001
  expectedErrorPattern: /missing node/i,
};

// Read node-level WorkspaceKit markers for the source nodes so we can prove
// _clearNodeGroupData was NOT invoked.
async function readSourceNodeMarkers(page, sourceNodeIds) {
  return page.evaluate((ids) => {
    const idSet = new Set(ids);
    const nodes = window.app?.graph?._nodes || [];
    return nodes
      .filter(n => idSet.has(String(n.id)))
      .map(n => ({
        id: String(n.id),
        _xzgGroupId: n._xzgGroupId,
        _xzgGroupData_null: n._xzgGroupData === null,
        _xzgGroupData_present: '_xzgGroupData' in n,
        properties_xzgGroup_present: n.properties && '_xzgGroup' in n.properties,
      }));
  }, [...sourceNodeIds]);
}

async function runDiskFixture(page, fixture, failures) {
  tsLog('=== disk fixture', fixture.name);
  const local = [];

  if (!fs.existsSync(fixture.absPath)) { failures.push(`${fixture.name}: missing on disk`); return; }
  const pre = JSON.parse(fs.readFileSync(fixture.absPath, 'utf8'));
  const sourceNodeIds = Object.values(pre.extra?.xzgGroups || {}).flatMap(g => g.nodeIds || []).map(String);

  const preOnDisk = [
    ['wk group count = 2', Object.keys(pre.extra?.xzgGroups || {}).length === 2],
    ['rep = workspacekit', pre.extra?.workspacekit?.groupRepresentation === 'workspacekit'],
    ['no pre archive', !pre.extra?.workspacekit?.groupConversion],
  ];
  for (const [n, ok] of preOnDisk) if (!ok) local.push(`on-disk: ${n}`);
  if (local.length) { failures.push(...local.map(m => `${fixture.name}: ${m}`)); return; }

  const openResult = await openFixture(page, fixture.name);
  tsLog('open_result', JSON.stringify(openResult));
  if (!openResult.ok) { failures.push(`${fixture.name}: open: ${openResult.reason}`); return; }
  await page.waitForTimeout(2500);

  const preState = await readGraphState(page);
  const preMarkers = await readSourceNodeMarkers(page, sourceNodeIds);
  tsLog('pre_state', JSON.stringify(preState));

  const preChecks = [
    ['pre rep = workspacekit', preState.representation === 'workspacekit'],
    ['pre native = 0', preState.nativeCount === 0],
    ['pre wk = 2', preState.wkCount === 2],
    ['pre archive absent', !preState.archivePresent],
  ];
  for (const [n, ok] of preChecks) if (!ok) local.push(`pre: ${n}`);
  if (local.length) { failures.push(...local.map(m => `${fixture.name}: ${m}`)); return; }

  const conv = await callConvertToNative(page);
  tsLog('convert_result', JSON.stringify(conv));

  if (conv.ok) {
    local.push(`convert did not throw as expected (returned ${JSON.stringify(conv.result)})`);
  } else {
    if (!fixture.expectedErrorPattern.test(conv.reason || '')) {
      local.push(`convert threw wrong reason: got "${conv.reason}", expected match ${fixture.expectedErrorPattern}`);
    }
    if (fixture.expectedBadTitle && !String(conv.reason || '').includes(fixture.expectedBadTitle)) {
      local.push(`convert error does not name the bad group "${fixture.expectedBadTitle}": ${conv.reason}`);
    }
  }

  await page.waitForTimeout(500);
  const postState = await readGraphState(page);
  const postMarkers = await readSourceNodeMarkers(page, sourceNodeIds);

  const postChecks = [
    ['post rep unchanged', postState.representation === preState.representation],
    ['post native count unchanged', postState.nativeCount === preState.nativeCount],
    ['post wk count unchanged', postState.wkCount === preState.wkCount],
    ['post wk titles unchanged', preState.wkTitles.every(t => postState.wkTitles.includes(t))],
    ['post archive still absent', !postState.archivePresent],
    ['post overlay DOM count unchanged', postState.wkOverlayDom === preState.wkOverlayDom],
    ['post node count unchanged', postState.nodeCount === preState.nodeCount],
  ];
  for (const [n, ok] of postChecks) if (!ok) local.push(`post: ${n}`);

  const preMap = new Map(preMarkers.map(m => [m.id, m]));
  for (const after of postMarkers) {
    const before = preMap.get(after.id);
    if (!before) continue;
    if (before._xzgGroupId !== after._xzgGroupId
        || before._xzgGroupData_null !== after._xzgGroupData_null
        || before._xzgGroupData_present !== after._xzgGroupData_present
        || before.properties_xzgGroup_present !== after.properties_xzgGroup_present) {
      local.push(`post markers: node ${after.id} shape changed`);
    }
  }

  if (local.length) failures.push(...local.map(m => `${fixture.name}: ${m}`));
  else tsLog('fixture_ok', fixture.name);
}

/**
 * Inject a phantom nodeId into a live WorkspaceKit group's nodeIds array
 * after loading, then run convert. This exercises the "references a missing
 * node" branch of the pre-mutation validation loop — the branch cannot be
 * reached from disk because recomputeMembership filters nodeIds against the
 * current graph before convert runs.
 */
async function runInjectionFixture(page, fixture, failures) {
  tsLog('=== injection fixture', fixture.name);
  const local = [];

  // Open benign fixture (T-001's _wk-c5-mixed: 1 native + 1 wk with empty nodeIds).
  const openResult = await openFixture(page, fixture.name);
  tsLog('open_result', JSON.stringify(openResult));
  if (!openResult.ok) { failures.push(`${fixture.name}: open: ${openResult.reason}`); return; }
  await page.waitForTimeout(2500);

  // Guard against transient overlay DOM leftovers from earlier tests in the
  // same browser context (observed once during a full-sequence run on
  // 2026-07-28). Force WorkspaceKit to rebuild overlays from the current
  // groups map before we snapshot the baseline.
  await page.evaluate(async () => {
    try {
      const url = '/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js?v=20260727_group_reverse_conversion_c6_4';
      const mod = await import(url);
      mod.workspace2CanvasGroups?.rebuildAllEls?.();
    } catch (e) {}
  });
  await page.waitForTimeout(200);

  // Baseline before injection. This is our rollback target.
  const preState = await readGraphState(page);
  tsLog('pre_state (baseline)', JSON.stringify(preState));
  if (preState.wkCount === 0) { failures.push(`${fixture.name}: no wk group to inject into`); return; }

  // Inject phantom id.
  const injection = await page.evaluate(async () => {
    const url = '/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js?v=20260727_group_reverse_conversion_c6_4';
    const mod = await import(url);
    const wk = mod.workspace2CanvasGroups;
    if (!wk) return { ok: false, reason: 'module missing' };
    const gids = Object.keys(wk.groups || {});
    if (!gids.length) return { ok: false, reason: 'no wk group present in module' };
    const gid = gids[0];
    const before = [...(wk.groups[gid].nodeIds || [])];
    wk.groups[gid].nodeIds = [...before, '99999'];  // '99999' is not in the graph
    return { ok: true, gid, before, after: wk.groups[gid].nodeIds };
  });
  tsLog('injection', JSON.stringify(injection));
  if (!injection.ok) { failures.push(`${fixture.name}: injection: ${injection.reason}`); return; }

  // Attempt convert. It MUST throw with "missing node".
  const conv = await callConvertToNative(page);
  tsLog('convert_result', JSON.stringify(conv));
  if (conv.ok) {
    local.push(`convert did not throw as expected (returned ${JSON.stringify(conv.result)})`);
  } else if (!fixture.expectedErrorPattern.test(conv.reason || '')) {
    local.push(`convert threw wrong reason: got "${conv.reason}", expected match ${fixture.expectedErrorPattern}`);
  }

  // Restore the group's nodeIds so we do not leave the injection visible to
  // whatever runs next in this browser session. The disk file is untouched.
  await page.evaluate(async ({ before, gid }) => {
    const url = '/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js?v=20260727_group_reverse_conversion_c6_4';
    const mod = await import(url);
    const wk = mod.workspace2CanvasGroups;
    if (wk?.groups?.[gid]) wk.groups[gid].nodeIds = before;
  }, { before: injection.before, gid: injection.gid });

  // Post-state (after restoration) must match pre-state.
  await page.waitForTimeout(500);
  const postState = await readGraphState(page);
  tsLog('post_state', JSON.stringify(postState));

  const postChecks = [
    ['post rep unchanged', postState.representation === preState.representation],
    ['post native count unchanged', postState.nativeCount === preState.nativeCount],
    ['post wk count unchanged', postState.wkCount === preState.wkCount],
    ['post archive still absent', !postState.archivePresent],
    ['post overlay DOM count unchanged', postState.wkOverlayDom === preState.wkOverlayDom],
    ['post node count unchanged', postState.nodeCount === preState.nodeCount],
  ];
  for (const [n, ok] of postChecks) if (!ok) local.push(`post: ${n}`);

  if (local.length) failures.push(...local.map(m => `${fixture.name}: ${m}`));
  else tsLog('fixture_ok', fixture.name);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errCollector = attachErrorCollector(page);
  const failures = [];

  try {
    await installReadOnlyGuard(page);
    tsLog('navigate', BASE_URL_DEFAULT);
    await page.goto(BASE_URL_DEFAULT, { waitUntil: 'load', timeout: 30_000 });
    await waitForWorkspaceKitReady(page);
    tsLog('ready');

    for (const f of [DISK_FIXTURE]) await runDiskFixture(page, f, failures);
    await runInjectionFixture(page, INJECTION_FIXTURE, failures);

    // Console errors from the intentional throws will appear as generic errors.
    // Filter to WorkspaceKit-labelled console errors only; the thrown Errors
    // themselves are caught by callConvertToNative and never reach console.
    const wkErrs = errCollector.workspacekitRelated();
    tsLog('errs_total', String(errCollector.all().length));
    tsLog('errs_workspace', String(wkErrs.length));
    for (const e of wkErrs.slice(0, 10)) tsLog('  wk_err', e);
    if (wkErrs.length) failures.push('workspacekit console errors: ' + wkErrs.length);

    if (!failures.length) { tsLog('result', 'ok'); process.exitCode = 0; }
    else { tsLog('result', 'fail'); failures.forEach(f => tsLog('  failure', f)); process.exitCode = 1; }
  } catch (err) {
    tsLog('result', 'fail');
    tsLog('error', err && err.stack ? err.stack : String(err));
    if (failures.length) failures.forEach(f => tsLog('  failure', f));
    process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

main();
