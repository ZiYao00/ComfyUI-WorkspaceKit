// T-003 C5 boundary / overlap fixture acceptance.
//
// SCENARIOS (docs/GROUP_CONVERSION_HARDENING.zh-CN.md validation matrix item 5)
//   1. _wk-c5-overlap.json      -- 2 WorkspaceKit groups with partially
//                                  overlapping bounds. Nodes may fall in the
//                                  overlap region. Contract: convert must
//                                  produce 2 native groups, both bounds
//                                  preserved, native.recomputeInsideNodes()
//                                  runs on each without modifying node
//                                  positions or execution modes.
//   2. _wk-c5-shared-member.json -- 2 WorkspaceKit groups whose bounds do NOT
//                                  overlap but both list the same node in
//                                  their nodeIds. Contract: convert must not
//                                  throw. Each source group is archived; the
//                                  shared node's _xzg* markers are cleared
//                                  once.
//
// SAFETY: read-only against fixtures on disk; no save; route guard installed.

import { chromium } from 'playwright';
import fs from 'node:fs';
import {
  BASE_URL_DEFAULT, tsLog, installReadOnlyGuard, attachErrorCollector,
  waitForWorkspaceKitReady, openFixture, readGraphState, callConvertToNative,
} from './lib/wk-runtime.mjs';

const FIXTURES = [
  {
    name: '_wk-c5-overlap',
    absPath: 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows\\_wk-c5-overlap.json',
    expectedWkTitles: ['wk-overlap-a', 'wk-overlap-b'],
    expectedBounds: {
      'wk-overlap-a': { x: 100, y: 100, w: 300, h: 200 },
      'wk-overlap-b': { x: 300, y: 200, w: 300, h: 200 },
    },
  },
  {
    name: '_wk-c5-shared-member',
    absPath: 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows\\_wk-c5-shared-member.json',
    expectedWkTitles: ['wk-shared-a', 'wk-shared-b'],
    expectedBounds: {
      'wk-shared-a': { x: 50, y: 50, w: 300, h: 200 },
      'wk-shared-b': { x: 500, y: 500, w: 300, h: 200 },
    },
  },
];

// Compare pos+size against expected bounds. LiteGraph enforces size floors
// of 140x80 (native GroupCtor), so w/h are clamped to at least those.
// Also accept a match through _bounding when pos/size are not exposed.
function boundsMatchExpected(nativeGroup, expected) {
  const expW = Math.max(140, expected.w);
  const expH = Math.max(80, expected.h);
  const [px, py] = nativeGroup.pos || [];
  const [sw, sh] = nativeGroup.size || [];
  if (px === expected.x && py === expected.y && sw === expW && sh === expH) return true;
  // Fallback: LiteGraph stores geometry in _bounding = [x, y, w, h].
  const b = nativeGroup.bounding;
  if (Array.isArray(b) && b.length >= 4) {
    return b[0] === expected.x && b[1] === expected.y && b[2] === expW && b[3] === expH;
  }
  return false;
}

async function readNodePositions(page) {
  return page.evaluate(() => {
    const nodes = window.app?.graph?._nodes || [];
    return nodes.map(n => ({
      id: String(n.id),
      pos: Array.isArray(n.pos) ? [n.pos[0], n.pos[1]] : null,
      mode: n.mode,
    }));
  });
}

async function readNativeGroupsDetailed(page) {
  return page.evaluate(() => {
    const gs = window.app?.graph?._groups || window.app?.graph?.groups || [];
    const toArr = (v) => {
      if (v == null) return null;
      if (Array.isArray(v)) return [v[0], v[1], v[2], v[3]];
      // Handle Float32Array / other iterables like Vector2/Vector4.
      try { return Array.from(v).slice(0, 4); } catch (e) { return null; }
    };
    return gs.map(g => {
      const pos = toArr(g.pos);
      const size = toArr(g.size);
      const bounding = toArr(g._bounding) || toArr(g.bounding);
      return {
        title: g.title || g._title,
        pos: pos ? [pos[0], pos[1]] : null,
        size: size ? [size[0], size[1]] : null,
        bounding,
        color: g.color,
        insideNodeIds: (g._nodes || []).map(n => String(n.id)),
      };
    });
  });
}

async function runOne(page, fixture, failures) {
  tsLog('=== fixture', fixture.name);
  const local = [];  // fixture-local failure collection so a bad fixture
                     // does not skip subsequent fixtures.

  if (!fs.existsSync(fixture.absPath)) { local.push(`missing on disk`); failures.push(...local.map(m => `${fixture.name}: ${m}`)); return; }
  const pre = JSON.parse(fs.readFileSync(fixture.absPath, 'utf8'));
  const preOnDisk = [
    ['native groups = 0', (pre.groups || []).length === 0],
    ['wk group count = 2', Object.keys(pre.extra?.xzgGroups || {}).length === 2],
    ['rep = workspacekit', pre.extra?.workspacekit?.groupRepresentation === 'workspacekit'],
    ['no archive', !pre.extra?.workspacekit?.groupConversion],
  ];
  for (const [n, ok] of preOnDisk) if (!ok) local.push(`on-disk: ${n}`);
  if (local.length) { failures.push(...local.map(m => `${fixture.name}: ${m}`)); return; }

  const openResult = await openFixture(page, fixture.name);
  tsLog('open_result', JSON.stringify(openResult));
  if (!openResult.ok) { failures.push(`${fixture.name}: open: ${openResult.reason}`); return; }
  await page.waitForTimeout(2500);

  const preState = await readGraphState(page);
  const prePositions = await readNodePositions(page);
  tsLog('pre_state', JSON.stringify(preState));

  const preChecks = [
    ['pre rep = workspacekit', preState.representation === 'workspacekit'],
    ['pre native = 0', preState.nativeCount === 0],
    ['pre wk = 2', preState.wkCount === 2],
    ['pre wk titles present', fixture.expectedWkTitles.every(t => preState.wkTitles.includes(t))],
  ];
  for (const [n, ok] of preChecks) if (!ok) local.push(`pre: ${n}`);
  if (local.length) { failures.push(...local.map(m => `${fixture.name}: ${m}`)); return; }

  const conv = await callConvertToNative(page);
  tsLog('convert_result', JSON.stringify(conv));
  if (!conv.ok) { failures.push(`${fixture.name}: convert threw: ${conv.reason}`); return; }
  const r = conv.result;
  const convChecks = [
    ['converted = 2', r?.converted === 2],
    ['rep = native', r?.representation === 'native'],
    ['archive present', Boolean(r?.archive)],
    ['archive has 2 groups', r?.archive && Object.keys(r.archive.groups || {}).length === 2],
    ['nativeGroupIds has 2 entries', r?.nativeGroupIds && Object.keys(r.nativeGroupIds).length === 2],
  ];
  for (const [n, ok] of convChecks) if (!ok) local.push(`convert: ${n}`);

  await page.waitForTimeout(500);
  const postState = await readGraphState(page);
  const postPositions = await readNodePositions(page);
  const postNative = await readNativeGroupsDetailed(page);
  tsLog('post_state', JSON.stringify(postState));
  tsLog('post_native', JSON.stringify(postNative));

  const postChecks = [
    ['post rep = native', postState.representation === 'native'],
    ['post native count = 2', postState.nativeCount === 2],
    ['post wk emptied', postState.wkCount === 0],
    ['post overlay DOM = 0', postState.wkOverlayDom === 0],
    ['archive persisted', postState.archivePresent === true],
    ['archive schema = 1', postState.archiveSchema === 1],
    ['archive source = workspacekit', postState.archiveSource === 'workspacekit'],
    ['archive contains both titles', fixture.expectedWkTitles.every(t => postState.archiveTitles.includes(t))],
  ];
  for (const [n, ok] of postChecks) if (!ok) local.push(`post: ${n}`);

  for (const expectedTitle of fixture.expectedWkTitles) {
    const nativeGroup = postNative.find(g => g.title === expectedTitle);
    if (!nativeGroup) { local.push(`bounds: native "${expectedTitle}" missing`); continue; }
    const expected = fixture.expectedBounds[expectedTitle];
    if (!boundsMatchExpected(nativeGroup, expected)) {
      local.push(`bounds: "${expectedTitle}" pos/size mismatch: got pos=${JSON.stringify(nativeGroup.pos)} size=${JSON.stringify(nativeGroup.size)} bounding=${JSON.stringify(nativeGroup.bounding)}, expected pos=[${expected.x},${expected.y}] size=[>=${Math.max(140,expected.w)},>=${Math.max(80,expected.h)}]`);
    }
  }

  if (prePositions.length !== postPositions.length) {
    local.push(`node count changed: ${prePositions.length} -> ${postPositions.length}`);
  } else {
    const byId = new Map(postPositions.map(p => [p.id, p]));
    let moved = 0, modeChanged = 0;
    for (const before of prePositions) {
      const after = byId.get(before.id);
      if (!after) continue;
      if (before.pos && after.pos && (before.pos[0] !== after.pos[0] || before.pos[1] !== after.pos[1])) moved++;
      if (before.mode !== after.mode) modeChanged++;
    }
    if (moved) local.push(`${moved} node(s) moved during conversion`);
    if (modeChanged) local.push(`${modeChanged} node mode changed during conversion`);
  }

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
