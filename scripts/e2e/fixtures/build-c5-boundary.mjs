// Build the T-003 C5 boundary/overlap fixtures.
//
// Two flavors:
//   1. _wk-c5-overlap.json      -- 2 WorkspaceKit overlay groups whose bounds
//                                  partially overlap. Nodes are placed so
//                                  some fall in the overlap region. Native
//                                  groups: none. Representation: workspacekit.
//   2. _wk-c5-shared-member.json -- 2 WorkspaceKit overlay groups whose bounds
//                                  do NOT overlap, but both list the same
//                                  node in their nodeIds array. This is a
//                                  data-shape a user can produce by grouping
//                                  the same node twice or by manual editing.
//
// Both must convert successfully to native without exception, producing 2
// native groups with the pre-existing WorkspaceKit bounds preserved, and an
// archive that records both source groups.

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
console.log('source nodes:', srcNodeIds);

// --- Fixture 1: overlapping bounds ------------------------------------------
{
  const wf = JSON.parse(JSON.stringify(src));
  wf.id = '__test__c5-overlap-' + Date.now().toString(36);
  wf.revision = 0;
  wf.groups = [];

  // Two overlapping bounds: group A (100,100 → 400,300) and group B (300,200 → 600,400).
  // Overlap region: (300,200 → 400,300).
  const gidA = 'g_test_overlap_a_' + Date.now().toString(36);
  const gidB = 'g_test_overlap_b_' + (Date.now() + 1).toString(36);

  // Assign the first two source nodes to group A, next two to group B.
  // The remaining nodes are unassigned. This mirrors how a user might carve
  // up an existing graph into two overlapping subgroups.
  const groupA_nodeIds = srcNodeIds.slice(0, 2);
  const groupB_nodeIds = srcNodeIds.slice(2, 4);

  wf.extra = wf.extra || {};
  wf.extra.workspacekit = { groupRepresentation: 'workspacekit' };
  wf.extra.xzgGroups = {
    [gidA]: {
      id: gidA,
      title: 'wk-overlap-a',
      nodeIds: groupA_nodeIds,
      allowEmpty: false,
      bypassed: false,
      bounds: { x: 100, y: 100, w: 300, h: 200 },
      ...wkGroupStyle(),
    },
    [gidB]: {
      id: gidB,
      title: 'wk-overlap-b',
      nodeIds: groupB_nodeIds,
      allowEmpty: false,
      bypassed: false,
      bounds: { x: 300, y: 200, w: 300, h: 200 },
      ...wkGroupStyle(),
    },
  };
  delete wf.extra.workspacekit.groupConversion;
  delete wf.extra.workspacekit.nativeGroupConversion;
  writeFixture(path.join(WORKFLOWS_DIR, '_wk-c5-overlap.json'), wf);
}

// --- Fixture 2: shared member -----------------------------------------------
{
  const wf = JSON.parse(JSON.stringify(src));
  wf.id = '__test__c5-shared-member-' + Date.now().toString(36);
  wf.revision = 0;
  wf.groups = [];

  const gidA = 'g_test_shared_a_' + Date.now().toString(36);
  const gidB = 'g_test_shared_b_' + (Date.now() + 1).toString(36);
  const sharedNodeId = srcNodeIds[0];  // this node appears in both groups' nodeIds

  wf.extra = wf.extra || {};
  wf.extra.workspacekit = { groupRepresentation: 'workspacekit' };
  wf.extra.xzgGroups = {
    [gidA]: {
      id: gidA,
      title: 'wk-shared-a',
      nodeIds: [sharedNodeId, srcNodeIds[1]],
      allowEmpty: false,
      bypassed: false,
      bounds: { x: 50, y: 50, w: 300, h: 200 },
      ...wkGroupStyle(),
    },
    [gidB]: {
      id: gidB,
      title: 'wk-shared-b',
      nodeIds: [sharedNodeId, srcNodeIds[2]],  // same node id listed here too
      allowEmpty: false,
      bypassed: false,
      bounds: { x: 500, y: 500, w: 300, h: 200 },
      ...wkGroupStyle(),
    },
  };
  delete wf.extra.workspacekit.groupConversion;
  delete wf.extra.workspacekit.nativeGroupConversion;
  writeFixture(path.join(WORKFLOWS_DIR, '_wk-c5-shared-member.json'), wf);
}
