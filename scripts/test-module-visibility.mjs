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
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.theme, storage), false);
assert.equal(isWorkspaceModuleSealed(WORKSPACE_MODULE_ID.theme), true);

assert.equal(setWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, false, storage), false);
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, storage), false);
assert.equal(setWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, true, storage), true);
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.workflows, storage), true);

// A stale/hand-edited preference must not unseal Theme before its product line.
storage.setItem(WORKSPACE_MODULE_VISIBILITY_KEY[WORKSPACE_MODULE_ID.theme], "1");
assert.equal(isWorkspaceModuleVisible(WORKSPACE_MODULE_ID.theme, storage), false);
assert.equal(setWorkspaceModuleVisible(WORKSPACE_MODULE_ID.theme, true, storage), false);
assert.equal(storage.getItem(WORKSPACE_MODULE_VISIBILITY_KEY[WORKSPACE_MODULE_ID.theme]), "0");

assert.deepEqual(
  visibleWorkspaceModuleIds([
    WORKSPACE_MODULE_ID.workflows,
    WORKSPACE_MODULE_ID.nodes,
    WORKSPACE_MODULE_ID.layout,
    WORKSPACE_MODULE_ID.theme,
  ], storage),
  [WORKSPACE_MODULE_ID.workflows, WORKSPACE_MODULE_ID.nodes, WORKSPACE_MODULE_ID.layout],
);

console.log("WorkspaceKit module visibility contract passed.");
