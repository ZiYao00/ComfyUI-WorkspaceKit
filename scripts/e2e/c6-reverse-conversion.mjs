// T-005..T-008 C6.4 reverse-conversion acceptance.
//
// SCENARIOS (docs/GROUP_CONVERSION_HARDENING.zh-CN.md C6.4)
//   T-005 _wk-c6-native-added.json
//     Native + archive mapping for one of them; the other native was added
//     after the forward conversion and has no archive entry.
//     Contract:
//       - restoredGroupIds size = 1 (from archive mapping)
//       - newGroupIds size = 1 (freshly added native)
//       - restored group uses archive style (colorHue = 300, distinct from
//         DEFAULT_STYLE hue 48); new group uses DEFAULT_STYLE
//       - Native geometry wins for both
//       - This fixture also covers "mixed / overlap" (two natives partially
//         overlap by design)
//
//   T-006 _wk-c6-native-deleted.json
//     Archive has two mappings; graph has only one of the mapped natives.
//     Contract:
//       - restoredGroupIds size = 1
//       - archivedGroupIdsWithoutNativeMatch contains the orphan wk id
//       - The deleted native does NOT silently re-appear as a wk group
//
//   T-008 _wk-c6-native-invalid-bounds.json
//     One native has valid bounds, one has w=0.
//     Contract:
//       - convertCurrentWorkflowToWorkspaceKit throws with "invalid bounds"
//       - Graph state unchanged (still native, same native group count,
//         no xzgGroups populated)
//
// SAFETY: read-only against fixtures on disk.

import { chromium } from 'playwright';
import fs from 'node:fs';
import {
  BASE_URL_DEFAULT, tsLog, installReadOnlyGuard, attachErrorCollector,
  waitForWorkspaceKitReady, openFixture, readGraphState, callConvertToWorkspaceKit,
} from './lib/wk-runtime.mjs';

const DEFAULT_STYLE_HUE = 48;
const ARCHIVED_STYLE_HUE = 300;

async function readWorkspaceKitGroupStyle(page) {
  return page.evaluate(() => {
    const g = window.app?.graph;
    const xzg = g?.extra?.xzgGroups || {};
    return Object.values(xzg).map(gr => ({
      id: String(gr.id),
      title: gr.title,
      colorHue: gr.colorHue,
      bounds: gr.bounds,
      nodeIds: gr.nodeIds,
    }));
  });
}

async function runNativeAdded(page, failures) {
  tsLog('=== T-005 _wk-c6-native-added');
  const local = [];

  const openResult = await openFixture(page, '_wk-c6-native-added');
  tsLog('open_result', JSON.stringify(openResult));
  if (!openResult.ok) { failures.push('T-005: open: ' + openResult.reason); return; }
  await page.waitForTimeout(2500);

  const preState = await readGraphState(page);
  tsLog('pre_state', JSON.stringify(preState));

  const preChecks = [
    ['pre representation = native', preState.representation === 'native'],
    ['pre native count = 2', preState.nativeCount === 2],
    ['pre wk = 0', preState.wkCount === 0],
    ['pre archive present', preState.archivePresent === true],
    ['pre archive has 1 group', preState.archiveGroupCount === 1],
  ];
  for (const [n, ok] of preChecks) if (!ok) local.push(`pre: ${n}`);
  if (local.length) { failures.push(...local.map(m => 'T-005: ' + m)); return; }

  const conv = await callConvertToWorkspaceKit(page);
  tsLog('convert_result', JSON.stringify(conv));
  if (!conv.ok) { failures.push('T-005: convert threw: ' + conv.reason); return; }
  const r = conv.result;
  const convChecks = [
    ['converted = 2', r?.converted === 2],
    ['representation = workspacekit', r?.representation === 'workspacekit'],
    ['plan present', Boolean(r?.plan)],
    ['restoredGroupIds size = 1', r?.plan?.restoredGroupIds?.length === 1],
    ['newGroupIds size = 1', r?.plan?.newGroupIds?.length === 1],
  ];
  for (const [n, ok] of convChecks) if (!ok) local.push(`convert: ${n}`);

  await page.waitForTimeout(500);
  const postState = await readGraphState(page);
  const postGroupStyles = await readWorkspaceKitGroupStyle(page);
  tsLog('post_state', JSON.stringify(postState));
  tsLog('post_styles', JSON.stringify(postGroupStyles));

  const postChecks = [
    ['post representation = workspacekit', postState.representation === 'workspacekit'],
    ['post native count = 0', postState.nativeCount === 0],
    ['post wk count = 2', postState.wkCount === 2],
    ['post wk titles include archived', postState.wkTitles.includes('archived-wk-title')],
    ['post wk titles include added', postState.wkTitles.includes('freshly-added-native')],
  ];
  for (const [n, ok] of postChecks) if (!ok) local.push(`post: ${n}`);

  // Style differentiation: archived group must have archive's colorHue (300);
  // freshly-added group must have DEFAULT_STYLE colorHue (48).
  const archived = postGroupStyles.find(g => g.title === 'archived-wk-title');
  const added = postGroupStyles.find(g => g.title === 'freshly-added-native');
  if (!archived) local.push('archived group missing after convert');
  else if (archived.colorHue !== ARCHIVED_STYLE_HUE) local.push(`archived colorHue expected ${ARCHIVED_STYLE_HUE}, got ${archived.colorHue}`);
  if (!added) local.push('freshly-added group missing after convert');
  else if (added.colorHue !== DEFAULT_STYLE_HUE) local.push(`freshly-added colorHue expected ${DEFAULT_STYLE_HUE} (default), got ${added.colorHue}`);

  // Both groups' bounds must come from the current native geometry.
  if (archived && (archived.bounds?.x !== 100 || archived.bounds?.y !== 100 || archived.bounds?.w !== 300 || archived.bounds?.h !== 200)) {
    local.push(`archived bounds mismatch: ${JSON.stringify(archived.bounds)}`);
  }
  if (added && (added.bounds?.x !== 300 || added.bounds?.y !== 200 || added.bounds?.w !== 300 || added.bounds?.h !== 200)) {
    local.push(`added bounds mismatch: ${JSON.stringify(added.bounds)}`);
  }

  if (local.length) failures.push(...local.map(m => 'T-005: ' + m));
  else tsLog('fixture_ok', 'T-005 _wk-c6-native-added');
}

async function runNativeDeleted(page, failures) {
  tsLog('=== T-006 _wk-c6-native-deleted');
  const local = [];

  const openResult = await openFixture(page, '_wk-c6-native-deleted');
  tsLog('open_result', JSON.stringify(openResult));
  if (!openResult.ok) { failures.push('T-006: open: ' + openResult.reason); return; }
  await page.waitForTimeout(2500);

  const preState = await readGraphState(page);
  tsLog('pre_state', JSON.stringify(preState));

  const preChecks = [
    ['pre representation = native', preState.representation === 'native'],
    ['pre native count = 1', preState.nativeCount === 1],
    ['pre wk = 0', preState.wkCount === 0],
    ['pre archive has 2 groups', preState.archiveGroupCount === 2],
  ];
  for (const [n, ok] of preChecks) if (!ok) local.push(`pre: ${n}`);
  if (local.length) { failures.push(...local.map(m => 'T-006: ' + m)); return; }

  const conv = await callConvertToWorkspaceKit(page);
  tsLog('convert_result', JSON.stringify(conv));
  if (!conv.ok) { failures.push('T-006: convert threw: ' + conv.reason); return; }
  const r = conv.result;
  const convChecks = [
    ['converted = 1', r?.converted === 1],
    ['restoredGroupIds size = 1', r?.plan?.restoredGroupIds?.length === 1],
    ['newGroupIds size = 0', r?.plan?.newGroupIds?.length === 0],
    ['orphan archive id reported', Array.isArray(r?.plan?.archivedGroupIdsWithoutNativeMatch) && r.plan.archivedGroupIdsWithoutNativeMatch.length === 1],
    ['orphan id is the orphan we injected', r?.plan?.archivedGroupIdsWithoutNativeMatch?.[0] === 'g_test_c6_orphan_ms'],
  ];
  for (const [n, ok] of convChecks) if (!ok) local.push(`convert: ${n}`);

  await page.waitForTimeout(500);
  const postState = await readGraphState(page);
  const postGroups = await readWorkspaceKitGroupStyle(page);
  tsLog('post_state', JSON.stringify(postState));

  const postChecks = [
    ['post rep = workspacekit', postState.representation === 'workspacekit'],
    ['post native = 0', postState.nativeCount === 0],
    ['post wk = 1 (deleted native did NOT resurrect)', postState.wkCount === 1],
    ['post wk title is kept-native', postState.wkTitles.includes('kept-native')],
    ['post wk does NOT include orphan-was-here', !postState.wkTitles.includes('orphan-was-here')],
  ];
  for (const [n, ok] of postChecks) if (!ok) local.push(`post: ${n}`);

  if (local.length) failures.push(...local.map(m => 'T-006: ' + m));
  else tsLog('fixture_ok', 'T-006 _wk-c6-native-deleted');
}

async function runInvalidBounds(page, failures) {
  tsLog('=== T-008 _wk-c6-native-invalid-bounds');
  const local = [];

  const openResult = await openFixture(page, '_wk-c6-native-invalid-bounds');
  tsLog('open_result', JSON.stringify(openResult));
  if (!openResult.ok) { failures.push('T-008: open: ' + openResult.reason); return; }
  await page.waitForTimeout(2500);

  const preState = await readGraphState(page);
  tsLog('pre_state', JSON.stringify(preState));

  const preChecks = [
    ['pre rep = native', preState.representation === 'native'],
    ['pre native count = 2', preState.nativeCount === 2],
    ['pre wk = 0', preState.wkCount === 0],
    ['pre no archive', !preState.archivePresent],
  ];
  for (const [n, ok] of preChecks) if (!ok) local.push(`pre: ${n}`);
  if (local.length) { failures.push(...local.map(m => 'T-008: ' + m)); return; }

  const conv = await callConvertToWorkspaceKit(page);
  tsLog('convert_result', JSON.stringify(conv));

  if (conv.ok) {
    local.push(`convert did not throw as expected (returned ${JSON.stringify(conv.result)})`);
  } else if (!/invalid bounds/i.test(conv.reason || '')) {
    local.push(`convert threw wrong reason: got "${conv.reason}"`);
  }

  // Post-state must equal pre-state — rollback covers _groups, extra, node
  // markers. Any leak of xzgGroups or representation change fails the batch.
  await page.waitForTimeout(500);
  const postState = await readGraphState(page);
  tsLog('post_state', JSON.stringify(postState));

  const postChecks = [
    ['post rep unchanged (native)', postState.representation === 'native'],
    ['post native count unchanged', postState.nativeCount === preState.nativeCount],
    ['post wk count unchanged (=0)', postState.wkCount === 0],
    ['post no archive appeared', !postState.archivePresent],
    ['post overlay DOM = 0', postState.wkOverlayDom === 0],
    ['post node count unchanged', postState.nodeCount === preState.nodeCount],
  ];
  for (const [n, ok] of postChecks) if (!ok) local.push(`post: ${n}`);

  if (local.length) failures.push(...local.map(m => 'T-008: ' + m));
  else tsLog('fixture_ok', 'T-008 _wk-c6-native-invalid-bounds');
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

    await runNativeAdded(page, failures);
    await runNativeDeleted(page, failures);
    await runInvalidBounds(page, failures);

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
