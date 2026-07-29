// T-001 C5 mixed-groups fixture acceptance.
//
// SCENARIO
//   _wk-c5-mixed.json has:
//     - 1 pre-existing native ComfyUI group titled 'native-keep-me'
//     - 1 WorkspaceKit overlay group titled 'wk-convert-me'
//     - extra.workspacekit.groupRepresentation === 'workspacekit'
//   Trigger the forward conversion (WorkspaceKit -> ComfyUI native).
//
// EXPECTED (docs/GROUP_CONVERSION_HARDENING.zh-CN.md validation matrix item 3)
//   - Both groups now native
//   - Pre-existing native group unchanged
//   - Exactly one new native created from 'wk-convert-me'
//   - representation = 'native'
//   - xzgGroups emptied
//   - Archive records the converted WorkspaceKit source data
//   - No lingering .xzg-group-box DOM
//
// SAFETY: read-only against fixture on disk; no save.

import { chromium } from 'playwright';
import fs from 'node:fs';
import {
  BASE_URL_DEFAULT, tsLog, installReadOnlyGuard, attachErrorCollector,
  waitForWorkspaceKitReady, openFixture, readGraphState, callConvertToNative,
} from './lib/wk-runtime.mjs';

const FIXTURE_ABS = 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows\\_wk-c5-mixed.json';
const FIXTURE_NAME = '_wk-c5-mixed';

async function main() {
  // On-disk preconditions.
  if (!fs.existsSync(FIXTURE_ABS)) { tsLog('precondition', 'fixture missing'); process.exitCode = 2; return; }
  const pre = JSON.parse(fs.readFileSync(FIXTURE_ABS, 'utf8'));
  const disk = [
    ['native groups on disk = 1', pre.groups?.length === 1],
    ['pre native group title', pre.groups?.[0]?.title === 'native-keep-me'],
    ['wk overlay group count = 1', Object.keys(pre.extra?.xzgGroups || {}).length === 1],
    ['representation = workspacekit', pre.extra?.workspacekit?.groupRepresentation === 'workspacekit'],
    ['no pre-existing groupConversion archive', !pre.extra?.workspacekit?.groupConversion],
  ];
  for (const [n, ok] of disk) if (!ok) { tsLog('precondition_fail', n); process.exitCode = 3; return; }
  tsLog('precondition', 'ok');

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
    await page.waitForTimeout(3000);

    const preState = await readGraphState(page);
    tsLog('pre_state', JSON.stringify(preState));
    const preChecks = [
      ['pre representation = workspacekit', preState.representation === 'workspacekit'],
      ['pre native count = 1', preState.nativeCount === 1],
      ['pre native title kept', preState.nativeTitles.includes('native-keep-me')],
      ['pre wk count = 1', preState.wkCount === 1],
      ['pre wk title kept', preState.wkTitles.includes('wk-convert-me')],
    ];
    for (const [n, ok] of preChecks) if (!ok) failures.push('precondition: ' + n);
    if (failures.length) throw new Error('preconditions failed');

    const conv = await callConvertToNative(page);
    tsLog('convert_result', JSON.stringify(conv));
    if (!conv.ok) { failures.push('convert: ' + conv.reason); throw new Error('convert failed'); }

    await page.waitForTimeout(500);
    const postState = await readGraphState(page);
    tsLog('post_state', JSON.stringify(postState));
    const postChecks = [
      ['post representation = native', postState.representation === 'native'],
      ['post native count = 2', postState.nativeCount === 2],
      ['pre-existing native title preserved', postState.nativeTitles.includes('native-keep-me')],
      ['converted wk title present as native', postState.nativeTitles.includes('wk-convert-me')],
      ['post xzgGroups emptied', postState.wkCount === 0],
      ['archive present', postState.archivePresent === true],
      ['archive schemaVersion = 1', postState.archiveSchema === 1],
      ['archive source = workspacekit', postState.archiveSource === 'workspacekit'],
      ['archive contains converted group', postState.archiveGroupCount === 1 && postState.archiveTitles.includes('wk-convert-me')],
      ['no lingering wk overlay DOM', postState.wkOverlayDom === 0],
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
