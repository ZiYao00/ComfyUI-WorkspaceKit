// Build the T-206 mixed-state reverse-conversion fixture.
//
// _wk-t206-mixed.json: a canvas that has BOTH a live WorkspaceKit overlay
// group AND a native ComfyUI group at the same time (representation stays
// "workspacekit"). Reverse conversion must convert the native group to
// WorkspaceKit and MERGE it with the existing WorkspaceKit group — the
// existing one must survive.

import fs from 'node:fs';
import path from 'node:path';

const WORKFLOWS_DIR = 'G:\\AIGC\\ComfyUI_test\\ComfyUI\\user\\default\\workflows';
const SOURCE = path.join(WORKFLOWS_DIR, 'New Workflow.json');
const TARGET = path.join(WORKFLOWS_DIR, '_wk-t206-mixed.json');

if (fs.existsSync(TARGET)) { console.error('exists:', TARGET); process.exit(3); }
const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

const wf = JSON.parse(JSON.stringify(src));
wf.id = '__test__t206-mixed-' + Date.now().toString(36);
wf.revision = 0;

// One native ComfyUI group.
wf.groups = [
  { id: 1, title: 'native-to-merge', bounding: [500, 500, 300, 200], color: '#7ea15b', flags: {} },
];

// One live WorkspaceKit overlay group. representation is "workspacekit" so the
// overlay is active (not a recovery-only archive).
const liveWkId = 'g_live_wk_keep';
wf.extra = wf.extra || {};
wf.extra.workspacekit = { groupRepresentation: 'workspacekit' };
wf.extra.xzgGroups = {
  [liveWkId]: {
    id: liveWkId,
    title: 'live-wk-keep-me',
    nodeIds: [],
    allowEmpty: true,
    bypassed: false,
    bounds: { x: 50, y: 50, w: 300, h: 200 },
    fontSize: 14,
    colorHue: 120, colorSat: 100, colorLit: 55, useUnifiedColor: false,
    effect: 'none', effectSpeed: 3,
    borderWidth: 2, borderOpacity: 0.65,
    shadowSize: 0, shadowColor: '#000000', contentPadding: 12,
    backgroundFillEnabled: false, backgroundOpacity: 0.25,
    headerBgColor: 'rgba(0,0,0,0.4)',
  },
};

fs.writeFileSync(TARGET, JSON.stringify(wf, null, 2), 'utf8');
console.log('created:', TARGET);
console.log('native groups:', wf.groups.map(g => g.title));
console.log('wk overlay groups:', Object.values(wf.extra.xzgGroups).map(g => g.title));
