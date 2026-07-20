import assert from "node:assert/strict";
import { createWorkflowTreeInteraction } from "../entry/workflows/tree-interaction.js";

const state = { expanded: new Set(["open"]) };
const renders = [];
const scheduled = [];
const recursiveCalls = [];
const interaction = createWorkflowTreeInteraction({
  state,
  renderPanel: (el) => renders.push(el),
  requestAnimationFrame: (callback) => scheduled.push(callback),
  setExpandedRecursive: (expanded, keys, shouldExpand) => {
    recursiveCalls.push({ keys, shouldExpand });
    for (const key of keys) {
      if (shouldExpand) expanded.add(key);
      else expanded.delete(key);
    }
  },
});
const tree = { scrollTop: 12 };
const el = { querySelector: () => tree };
const folder = {
  type: "folder",
  path: "folder",
  children: [
    { type: "file", path: "folder/a.json" },
    { type: "folder", path: "folder/nested", children: [] },
  ],
};

assert.equal(interaction.getTreeScrollTop(el), 12);
assert.deepEqual(interaction.workflowFolderKeys(folder), ["folder", "folder/nested"]);
assert.deepEqual(interaction.workflowFolderKeys({ type: "file", path: "a.json" }), []);
interaction.restoreTreeScrollTop(el, 88);
assert.equal(tree.scrollTop, 12);
scheduled.pop()();
assert.equal(tree.scrollTop, 88);

interaction.toggleWorkflowFolder("panel", folder);
assert.equal(state.expanded.has("folder"), true);
interaction.toggleWorkflowFolder("panel", folder);
assert.equal(state.expanded.has("folder"), false);
interaction.toggleWorkflowFolder("panel", folder, true);
assert.deepEqual(recursiveCalls, [{ keys: ["folder", "folder/nested"], shouldExpand: true }]);
assert.equal(state.expanded.has("folder/nested"), true);
assert.deepEqual(renders, ["panel", "panel", "panel"]);

console.log("workflow tree-interaction contract passed");
