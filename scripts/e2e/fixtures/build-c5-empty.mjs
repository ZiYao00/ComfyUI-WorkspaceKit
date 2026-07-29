// Build the T-002 C5 empty-workflow fixtures.
//
// Two flavors:
//   1. _wk-c5-empty-graph.json     -- 0 nodes, 0 native groups, 0 wk groups.
//                                     Represents a truly blank workflow.
//   2. _wk-c5-nodes-no-groups.json -- 7 nodes, 0 native groups, 0 wk groups.
//                                     Represents a workflow that has content
//                                     but no group of any kind.
//
// In both cases the WorkspaceKit forward conversion must be a no-op:
// convertCurrentWorkflowToNative() should return
//   { converted: 0, representation: 'workspacekit', empty: true }
// without touching graph or writing an archive. See
// entry/workspace2_canvas_groups.js:3087.

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

if (!fs.existsSync(SOURCE)) {
  console.error('missing source:', SOURCE);
  process.exit(2);
}
const src = JSON.parse(fs.readFileSync(SOURCE, 'utf8'));

// --- Fixture 1: fully empty graph -------------------------------------------
{
  const wf = {
    id: '__test__c5-empty-graph-' + Date.now().toString(36),
    revision: 0,
    last_node_id: 0,
    last_link_id: 0,
    nodes: [],
    links: [],
    groups: [],
    config: src.config || {},
    extra: {
      workspacekit: { groupRepresentation: 'workspacekit' },
      xzgGroups: {},
    },
    version: src.version,
  };
  writeFixture(path.join(WORKFLOWS_DIR, '_wk-c5-empty-graph.json'), wf);
}

// --- Fixture 2: nodes but no groups -----------------------------------------
{
  const wf = JSON.parse(JSON.stringify(src));  // deep clone
  wf.id = '__test__c5-nodes-no-groups-' + Date.now().toString(36);
  wf.revision = 0;
  wf.groups = [];  // strip any native group
  wf.extra = wf.extra || {};
  wf.extra.xzgGroups = {};
  wf.extra.workspacekit = wf.extra.workspacekit || {};
  wf.extra.workspacekit.groupRepresentation = 'workspacekit';
  // Do not carry forward any old conversion archive.
  delete wf.extra.workspacekit.groupConversion;
  delete wf.extra.workspacekit.nativeGroupConversion;
  writeFixture(path.join(WORKFLOWS_DIR, '_wk-c5-nodes-no-groups.json'), wf);
}
