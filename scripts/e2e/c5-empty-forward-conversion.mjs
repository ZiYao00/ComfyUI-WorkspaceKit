// T-002 C5 empty-workflow fixture acceptance.
//
// Two flavors:
//   1. _wk-c5-empty-graph.json      -- 0 nodes, 0 native, 0 wk
//   2. _wk-c5-nodes-no-groups.json  -- 7 nodes, 0 native, 0 wk
//
// EXPECTED (docs/GROUP_CONVERSION_HARDENING.zh-CN.md validation matrix item 4)
// Convert must be a no-op:
//   - Returns { converted: 0, representation: 'workspacekit', empty: true }
//   - No archive written
//   - Graph state unchanged (no native group added, no xzg field touched)
//   - No exception, no error log
//
// SAFETY: read-only against fixture on disk; no save.

import { chromium } from 'playwright';
import fs from 'node:fs';
import {
  BASE_URL_DEFAULT, tsLog, installReadOnlyGuard, attachErrorCollector,
  waitForWorkspaceKitReady, openFixture, readGraphState, callConvertToNative,
} from './lib/wk-runtime.mjs';

const FIXTURES = [
  {
    name: '_wk-c5-empty-graph',
    absPath: 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows\\_wk-c5-empty-graph.json',
    expectedNodeCount: 0,
  },
  {
    name: '_wk-c5-nodes-no-groups',
    absPath: 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows\\_wk-c5-nodes-no-groups.json',
    expectedNodeCount: 7,
  },
];

async function runOne(page, fixture, failures) {
  tsLog('=== fixture', fixture.name);

  // Precondition on disk.
  if (!fs.existsSync(fixture.absPath)) { failures.push(`${fixture.name}: fixture missing on disk`); return; }
  const pre = JSON.parse(fs.readFileSync(fixture.absPath, 'utf8'));
  const preOnDisk = [
    ['native groups = 0', (pre.groups || []).length === 0],
    ['xzgGroups empty', Object.keys(pre.extra?.xzgGroups || {}).length === 0],
    ['representation = workspacekit', pre.extra?.workspacekit?.groupRepresentation === 'workspacekit'],
    ['no pre-existing archive', !pre.extra?.workspacekit?.groupConversion],
    [`node count = ${fixture.expectedNodeCount}`, (pre.nodes || []).length === fixture.expectedNodeCount],
  ];
  for (const [n, ok] of preOnDisk) if (!ok) failures.push(`${fixture.name}: on-disk precondition: ${n}`);
  if (failures.length) return;

  // Open.
  const openResult = await openFixture(page, fixture.name);
  tsLog('open_result', JSON.stringify(openResult));
  if (!openResult.ok) { failures.push(`${fixture.name}: open: ${openResult.reason}`); return; }
  await page.waitForTimeout(2000);

  // Pre-state on live graph.
  const preState = await readGraphState(page);
  tsLog('pre_state', JSON.stringify(preState));
  const preChecks = [
    ['pre representation = workspacekit', preState.representation === 'workspacekit'],
    ['pre native = 0', preState.nativeCount === 0],
    ['pre wk = 0', preState.wkCount === 0],
    ['pre archive absent', !preState.archivePresent],
    [`pre node count = ${fixture.expectedNodeCount}`, preState.nodeCount === fixture.expectedNodeCount],
  ];
  for (const [n, ok] of preChecks) if (!ok) failures.push(`${fixture.name}: pre: ${n}`);
  if (failures.length) return;

  // Convert.
  const conv = await callConvertToNative(page);
  tsLog('convert_result', JSON.stringify(conv));
  if (!conv.ok) { failures.push(`${fixture.name}: convert threw: ${conv.reason}`); return; }
  const r = conv.result;
  const convChecks = [
    ['converted = 0', r?.converted === 0],
    ['representation stays workspacekit', r?.representation === 'workspacekit'],
    ['empty flag = true', r?.empty === true],
    ['no archive returned', !r?.archive],
  ];
  for (const [n, ok] of convChecks) if (!ok) failures.push(`${fixture.name}: convert: ${n}`);

  // Post-state must equal pre-state.
  await page.waitForTimeout(500);
  const postState = await readGraphState(page);
  tsLog('post_state', JSON.stringify(postState));
  const postChecks = [
    ['post representation unchanged', postState.representation === 'workspacekit'],
    ['post native unchanged (=0)', postState.nativeCount === 0],
    ['post wk unchanged (=0)', postState.wkCount === 0],
    ['post archive still absent', !postState.archivePresent],
    ['post overlay DOM = 0', postState.wkOverlayDom === 0],
    ['post node count unchanged', postState.nodeCount === fixture.expectedNodeCount],
  ];
  for (const [n, ok] of postChecks) if (!ok) failures.push(`${fixture.name}: post: ${n}`);
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

    for (const f of FIXTURES) {
      await runOne(page, f, failures);
    }

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
