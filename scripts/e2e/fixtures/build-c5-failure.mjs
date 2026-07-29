// Build the T-004 C5 failure-injection fixtures.
//
//   1. _wk-c5-invalid-bounds.json  -- one WorkspaceKit group has w=0.
//                                     Reaches the pre-mutation validation
//                                     because recomputeMembership uses bounds
//                                     and returns early on degenerate geometry,
//                                     so the invalid w=0 stays until convert
//                                     time.
//
// Note: the "missing node reference" branch of pre-mutation validation
// (workspace2_canvas_groups.js:3101) cannot be reached from disk — running
// through openWorkflow triggers recomputeMembership, which filters nodeIds
// against the current graph before convert runs. See the T-004 probe on
// 2026-07-27 for evidence. The e2e test injects a phantom nodeId directly
// into wk.groups after loading a benign fixture, which is the only realistic
// runtime path that could reach that error.

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

function wkGroupStyle() {
  return {
    fontSize: 14,
    colorHue: 200, colorSat: 100, colorLit: 55, useUnifiedColor: false,
    effect: 'none', effectSpeed: 3,
    borderWidth: 2, borderOpacity: 0.65,
    shadowSize: 0, shadowColor: '#000000', shadowOpacity: 0.3,
    padding: 10,
    bodyFill: false, bodyOpacity: 0.15,
  };
}

const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));
const srcNodeIds = (src.nodes || []).map(n => String(n.id));

// --- Fixture: invalid bounds (w = 0) ----------------------------------------
{
  const wf = JSON.parse(JSON.stringify(src));
  wf.id = '__test__c5-invalid-bounds-' + Date.now().toString(36);
  wf.revision = 0;
  wf.groups = [];

  const gidGood = 'g_test_bad_bounds_good_' + Date.now().toString(36);
  const gidBad = 'g_test_bad_bounds_bad_' + (Date.now() + 1).toString(36);

  wf.extra = wf.extra || {};
  wf.extra.workspacekit = { groupRepresentation: 'workspacekit' };
  wf.extra.xzgGroups = {
    [gidGood]: {
      id: gidGood,
      title: 'wk-good',
      nodeIds: [srcNodeIds[0]],
      allowEmpty: false,
      bypassed: false,
      bounds: { x: 100, y: 100, w: 300, h: 200 },
      ...wkGroupStyle(),
    },
    [gidBad]: {
      id: gidBad,
      title: 'wk-bad-bounds',
      nodeIds: [srcNodeIds[1]],
      allowEmpty: false,
      bypassed: false,
      bounds: { x: 500, y: 500, w: 0, h: 200 },  // <-- w=0: pre-validation must fail
      ...wkGroupStyle(),
    },
  };
  delete wf.extra.workspacekit.groupConversion;
  delete wf.extra.workspacekit.nativeGroupConversion;
  writeFixture(path.join(WORKFLOWS_DIR, '_wk-c5-invalid-bounds.json'), wf);
}
