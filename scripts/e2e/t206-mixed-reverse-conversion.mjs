// T-206: mixed-state reverse conversion preserves existing WorkspaceKit groups.
//
// Fixture _wk-t206-mixed.json has one live WorkspaceKit group
// (live-wk-keep-me) AND one native group (native-to-merge), representation
// "workspacekit". Calling convertCurrentWorkflowToWorkspaceKit() must:
//   - convert the native group to a WorkspaceKit group
//   - MERGE it with the existing WorkspaceKit group (both survive)
//   - end with 2 WorkspaceKit groups, 0 native groups
//   - NOT lose the pre-existing WorkspaceKit group (data-safety core assert)
//
// SAFETY: read-only against the fixture on disk; no save.

import { chromium } from 'playwright';
import fs from 'node:fs';
import {
  BASE_URL_DEFAULT, tsLog, installReadOnlyGuard, attachErrorCollector,
  waitForWorkspaceKitReady, openFixture, readGraphState, callConvertToWorkspaceKit,
} from './lib/wk-runtime.mjs';

const FIXTURE_NAME = '_wk-t206-mixed';
const FIXTURE_ABS = 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows\\_wk-t206-mixed.json';

async function main() {
  if (!fs.existsSync(FIXTURE_ABS)) { tsLog('precondition', 'fixture missing'); process.exitCode = 2; return; }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errs = attachErrorCollector(page);
  const failures = [];

  try {
    await installReadOnlyGuard(page);
    tsLog('navigate', BASE_URL_DEFAULT);
    await page.goto(BASE_URL_DEFAULT, { waitUntil: 'load', timeout: 30_000 });
    await waitForWorkspaceKitReady(page);
    tsLog('ready');

    const openResult = await openFixture(page, FIXTURE_NAME);
    tsLog('open_result', JSON.stringify(openResult));
    if (!openResult.ok) { failures.push('open: ' + openResult.reason); throw new Error('open failed'); }
    await page.waitForTimeout(2500);

    const preState = await readGraphState(page);
    tsLog('pre_state', JSON.stringify(preState));
    const preChecks = [
      ['pre representation = workspacekit', preState.representation === 'workspacekit'],
      ['pre native count = 1', preState.nativeCount === 1],
      ['pre wk count = 1', preState.wkCount === 1],
      ['pre wk title live-wk-keep-me', preState.wkTitles.includes('live-wk-keep-me')],
      ['pre native title native-to-merge', preState.nativeTitles.includes('native-to-merge')],
    ];
    for (const [n, ok] of preChecks) if (!ok) failures.push('pre: ' + n);
    if (failures.length) throw new Error('preconditions failed');

    const conv = await callConvertToWorkspaceKit(page);
    tsLog('convert_result', JSON.stringify(conv));
    if (!conv.ok) { failures.push('convert threw: ' + conv.reason); throw new Error('convert failed'); }
    const r = conv.result;
    const convChecks = [
      ['converted = 1 (the native group)', r?.converted === 1],
      ['representation = workspacekit', r?.representation === 'workspacekit'],
      ['mergedGroupCount = 2', r?.mergedGroupCount === 2],
    ];
    for (const [n, ok] of convChecks) if (!ok) failures.push('convert: ' + n);

    await page.waitForTimeout(500);
    const postState = await readGraphState(page);
    tsLog('post_state', JSON.stringify(postState));
    const postChecks = [
      ['post representation = workspacekit', postState.representation === 'workspacekit'],
      ['post native count = 0', postState.nativeCount === 0],
      ['post wk count = 2 (merged)', postState.wkCount === 2],
      ['DATA-SAFETY: existing wk group survived', postState.wkTitles.includes('live-wk-keep-me')],
      ['native group converted to wk', postState.wkTitles.includes('native-to-merge')],
      ['post overlay DOM = 2', postState.wkOverlayDom === 2],
    ];
    for (const [n, ok] of postChecks) if (!ok) failures.push('post: ' + n);

    const wkErrs = errs.workspacekitRelated();
    tsLog('errs_total', String(errs.all().length));
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
