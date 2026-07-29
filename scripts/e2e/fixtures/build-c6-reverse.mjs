// Build the T-005..T-008 C6.4 reverse-conversion fixtures.
//
//   T-005 _wk-c6-native-added.json
//     Started native, one group has a groupConversion archive mapping,
//     another was added by the user after conversion (no archive match).
//     Reverse must restore two wk groups: one with the archived style,
//     the other with the default style. Also serves T-007 mixed / overlap
//     by making the two native bounds partially overlap.
//
//   T-006 _wk-c6-native-deleted.json
//     Started native, archive has two mappings, but the graph only has one
//     of the mapped native groups (the other was deleted by the user).
//     Reverse must restore only one wk group and expose the orphan archive
//     id under plan.archivedGroupIdsWithoutNativeMatch.
//
//   T-008 _wk-c6-native-invalid-bounds.json
//     One native group with valid bounds and one with invalid bounds (w=0).
//     Reverse must throw with an "invalid bounds" message and roll back.

import fs from 'node:fs';
import path from 'node:path';

const WORKFLOWS_DIR = 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows';
const SOURCE = path.join(WORKFLOWS_DIR, 'New Workflow.json');

function writeFixture(target, wf) {
  if (fs.existsSync(target)) {
    console.error('target already exists (refusing to overwrite):', target);
    process.exit(3);
  }
  fs.writeFileSync(target, JSON.stringify(wf, null, 2), 'utf8');
  console.log('created:', target);
}

const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

// Common: canonical wk-style archived group data (as it would look after a
// forward conversion). We use a distinctive color so the round-trip test can
// tell the archived path from the default one.
function makeArchivedWkGroup(id, title, bounds) {
  return {
    id,
    title,
    nodeIds: [],
    allowEmpty: true,
    bypassed: false,
    executionMode: null,
    executionModeSnapshot: null,
    bounds,
    fontSize: 14,
    // Archive color (not the default 48). Round-trip must restore this.
    colorHue: 300,
    colorSat: 100,
    colorLit: 55,
    useUnifiedColor: false,
    effect: 'none',
    effectSpeed: 3,
    borderWidth: 2,
    borderOpacity: 0.65,
    shadowSize: 0,
    shadowColor: '#000000',
    contentPadding: 12,
    backgroundFillEnabled: false,
    backgroundOpacity: 0.25,
    headerBgColor: 'rgba(0,0,0,0.4)',
  };
}

// --- T-005: native added after forward conversion ---------------------------
{
  const wf = JSON.parse(JSON.stringify(src));
  wf.id = '__test__c6-native-added-' + Date.now().toString(36);
  wf.revision = 0;

  // Two native groups. Their bounds overlap (fulfilling the "mixed / overlap"
  // acceptance in one fixture): archived native at 100..400 x 100..300;
  // added native at 300..600 x 200..400 (overlap 300..400 x 200..300).
  wf.groups = [
    { id: 1, title: 'archived-wk-title', bounding: [100, 100, 300, 200], color: '#3f789e', flags: {} },
    { id: 2, title: 'freshly-added-native', bounding: [300, 200, 300, 200], color: '#7ea15b', flags: {} },
  ];

  const archivedWkId = 'g_test_c6_archived_ms';
  wf.extra = wf.extra || {};
  wf.extra.workspacekit = {
    groupRepresentation: 'native',
    groupConversion: {
      schemaVersion: 1,
      source: 'workspacekit',
      convertedAt: '2026-07-27T00:00:00.000Z',
      groups: {
        [archivedWkId]: makeArchivedWkGroup(archivedWkId, 'archived-wk-title', { x: 100, y: 100, w: 300, h: 200 }),
      },
      // Only native id 1 was created by a prior forward conversion; native id 2
      // has no archive entry.
      nativeGroupIds: { [archivedWkId]: 1 },
    },
  };
  wf.extra.xzgGroups = {};
  writeFixture(path.join(WORKFLOWS_DIR, '_wk-c6-native-added.json'), wf);
}

// --- T-006: native deleted after forward conversion -------------------------
{
  const wf = JSON.parse(JSON.stringify(src));
  wf.id = '__test__c6-native-deleted-' + Date.now().toString(36);
  wf.revision = 0;

  // Only one native remains on the graph. Archive still has two.
  wf.groups = [
    { id: 1, title: 'kept-native', bounding: [100, 100, 300, 200], color: '#3f789e', flags: {} },
  ];

  const keptWkId = 'g_test_c6_kept_ms';
  const orphanWkId = 'g_test_c6_orphan_ms';
  wf.extra = wf.extra || {};
  wf.extra.workspacekit = {
    groupRepresentation: 'native',
    groupConversion: {
      schemaVersion: 1,
      source: 'workspacekit',
      convertedAt: '2026-07-27T00:00:00.000Z',
      groups: {
        [keptWkId]: makeArchivedWkGroup(keptWkId, 'kept-native', { x: 100, y: 100, w: 300, h: 200 }),
        [orphanWkId]: makeArchivedWkGroup(orphanWkId, 'orphan-was-here', { x: 700, y: 700, w: 300, h: 200 }),
      },
      // Mapping records both; only native id 1 still exists on the graph.
      // Native id 2 was deleted by the user, so orphanWkId has no matching native.
      nativeGroupIds: { [keptWkId]: 1, [orphanWkId]: 2 },
    },
  };
  wf.extra.xzgGroups = {};
  writeFixture(path.join(WORKFLOWS_DIR, '_wk-c6-native-deleted.json'), wf);
}

// --- T-008: reverse failure injection (one native has invalid bounds) -------
{
  const wf = JSON.parse(JSON.stringify(src));
  wf.id = '__test__c6-native-invalid-bounds-' + Date.now().toString(36);
  wf.revision = 0;

  // Second native has w=0. reverse-conversion-plan.js nativeBounds() rejects
  // it and createNativeToWorkspaceKitConversionPlan throws before mutation.
  wf.groups = [
    { id: 1, title: 'ok-native', bounding: [100, 100, 300, 200], color: '#3f789e', flags: {} },
    { id: 2, title: 'bad-bounds-native', bounding: [500, 500, 0, 200], color: '#a55b7e', flags: {} },
  ];

  wf.extra = wf.extra || {};
  wf.extra.workspacekit = {
    groupRepresentation: 'native',
    // No archive — the reverse path is expected to fail from bounds alone,
    // and having no archive lets us also confirm the code path when
    // groupConversion is absent.
  };
  wf.extra.xzgGroups = {};
  writeFixture(path.join(WORKFLOWS_DIR, '_wk-c6-native-invalid-bounds.json'), wf);
}
