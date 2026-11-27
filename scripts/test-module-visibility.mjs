import assert from "node:assert/strict";

import {
  WORKSPACE_MODULE_ID,
  WORKSPACE_MODULE_VISIBILITY_KEY,
  isWorkspaceModuleSealed,
  isWorkspaceModuleVisible,
  setWorkspaceModuleVisible,
  visibleWorkspaceModuleIds,
} from "../entry/ui/module-visibility.js";

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    values,
  };
}

const storage = createStorage();
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, storage), true);
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.nodes, storage), true);
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.templates, storage), true);
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.layout, storage), true);
assert.equal(WORKSPACE_MODULE_ID.theme, undefined);
assert.equal(isWorkspaceModuleSealed("workspacekit.theme"), true);

assert.equal(setWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, false, storage), false);
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, storage), false);
assert.equal(setWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, true, storage), true);
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, storage), true);

// Old visibility preferences must not resurrect the retired module.
const legacy = createStorage({"workspace2.tabs.theme.visible": "1"});
assert.equal(isWorkspaceModuleVisible("workspacekit.theme", legacy), false);
assert.equal(setWorkspaceModuleVisible("workspacekit.theme", true, legacy), false);
assert.equal(legacy.getItem("workspace2.tabs.theme.visible"), "1");
assert.equal(isWorkspaceModuleVisible("external.theme", legacy), true);

assert.deepEqual(
  visibleWorkspaceModuleIds([
    WORKSPACE_MODULE_ID.workflows,
    WORKSPACE_MODULE_ID.nodes,
    WORKSPACE_MODULE_ID.layout,
    "workspacekit.theme",
  ], storage),
  [WORKSPACE_MODULE_ID.workflows, WORKSPACE_MODULE_ID.nodes, WORKSPACE_MODULE_ID.layout],
);

console.log("WorkspaceKit module visibility contract passed.");
