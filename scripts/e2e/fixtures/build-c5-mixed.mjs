// Build the T-001 C5 mixed-groups fixture into the test package's workflows
// directory. Read-only for source code; only writes the fixture JSON.
//
// The fixture starts from an existing baseline workflow (New Workflow.json)
// so nodes / links / topology stay identical to prior C5 evidence, then adds:
//   - one active native LiteGraph group (already present)
//   - one active WorkspaceKit overlay group (extra.xzgGroups + representation = 'workspacekit')
// This produces the "mixed" state defined by
// docs/GROUP_CONVERSION_HARDENING.zh-CN.md §validation-matrix item 3.

import fs from 'node:fs';
import path from 'node:path';

const WORKFLOWS_DIR = 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows';
const SOURCE = path.join(WORKFLOWS_DIR, 'New Workflow.json');
const TARGET = path.join(WORKFLOWS_DIR, '_wk-c5-mixed.json');

if (!fs.existsSync(SOURCE)) {
  console.error('missing source:', SOURCE);
  process.exit(2);
}
if (fs.existsSync(TARGET)) {
  console.error('target already exists (refusing to overwrite):', TARGET);
  process.exit(3);
}

const raw = fs.readFileSync(SOURCE, 'utf8');
const wf = JSON.parse(raw);

// New unique workflow id so ComfyUI treats this as a separate document.
wf.id = '__test__c5-mixed-' + Date.now().toString(36);
wf.revision = 0;

// The native group already exists in the source. Rename it so it is obvious
// which group survived the conversion (native groups are preserved).
if (!Array.isArray(wf.groups) || wf.groups.length !== 1) {
  console.error('unexpected native groups on source; got:', wf.groups);
  process.exit(4);
}
wf.groups[0].title = 'native-keep-me';
wf.groups[0].bounding = [50, 50, 300, 200];

// Add one WorkspaceKit overlay group. Fields mirror
// entry/workspace2_canvas_groups.js:1117 (empty group at context point).
const wkGroupId = 'g_test_c5_mixed_wk_' + Date.now().toString(36);
const xzgGroups = {};
xzgGroups[wkGroupId] = {
  id: wkGroupId,
  title: 'wk-convert-me',
  nodeIds: [],
  allowEmpty: true,
  bypassed: false,
  bounds: { x: 400, y: 50, w: 300, h: 200 },
  fontSize: 14,
  colorHue: 200,
  colorSat: 100,
  colorLit: 55,
  useUnifiedColor: false,
  effect: 'none',
  effectSpeed: 3,
  borderWidth: 2,
  borderOpacity: 0.65,
  shadowSize: 0,
  shadowColor: '#000000',
  shadowOpacity: 0.3,
  padding: 10,
  bodyFill: false,
  bodyOpacity: 0.15,
};

wf.extra = wf.extra || {};
wf.extra.xzgGroups = xzgGroups;
wf.extra.workspacekit = wf.extra.workspacekit || {};
wf.extra.workspacekit.groupRepresentation = 'workspacekit';
// Do not carry forward any old groupConversion / nativeGroupConversion archive
// from the source; this fixture is a fresh mixed state.
delete wf.extra.workspacekit.groupConversion;
delete wf.extra.workspacekit.nativeGroupConversion;

fs.writeFileSync(TARGET, JSON.stringify(wf, null, 2), 'utf8');
console.log('created:', TARGET);
console.log('native groups:', wf.groups.length, '=>', wf.groups.map(g => g.title));
console.log('wk overlay groups:', Object.keys(xzgGroups).length, '=>', [xzgGroups[wkGroupId].title]);
console.log('representation:', wf.extra.workspacekit.groupRepresentation);
