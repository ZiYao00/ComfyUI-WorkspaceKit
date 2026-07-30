import assert from "node:assert/strict";
import { createWorkflowTreeInteraction } from "../entry/workflows/tree-interaction.js";

// Mirrors entry.js's path-utils parentPath: the parent directory of a path.
function parentPath(path) {
  const index = String(path || "").lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

const state = {
  expanded: new Set(["open"]),
  items: [
    { type: "folder", path: "alpha" },
    { type: "folder", path: "beta" },
    { type: "folder", path: "gamma" },
    { type: "folder", path: "alpha/child" },
    { type: "file", path: "alpha/note.json" },
  ],
};
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
  parentPath,
});
const tree = { scrollTop: 12 };
const el = { querySelector: () => tree };

assert.equal(interaction.getTreeScrollTop(el), 12);
interaction.restoreTreeScrollTop(el, 88);
assert.equal(tree.scrollTop, 12);
scheduled.pop()();
assert.equal(tree.scrollTop, 88);

// workflowSiblingKeys returns only same-parent folders (level-only, no descendants).
assert.deepEqual(
  interaction.workflowSiblingKeys({ type: "folder", path: "alpha" }),
  ["alpha", "beta", "gamma"],
);
assert.deepEqual(
  interaction.workflowSiblingKeys({ type: "folder", path: "alpha/child" }),
  ["alpha/child"],
);

// Plain click toggles only the clicked folder.
const alpha = { type: "folder", path: "alpha", children: [] };
interaction.toggleWorkflowFolder("panel", alpha);
assert.equal(state.expanded.has("alpha"), true);
interaction.toggleWorkflowFolder("panel", alpha);
assert.equal(state.expanded.has("alpha"), false);

// Ctrl-click collapses all top-level siblings, preserving nested state.
state.expanded = new Set(["alpha", "beta", "gamma", "alpha/child"]);
interaction.toggleWorkflowFolder("panel", alpha, true);
assert.deepEqual(recursiveCalls.at(-1), {
  keys: ["alpha", "beta", "gamma"],
  shouldExpand: false,
});
assert.equal(state.expanded.has("alpha"), false);
assert.equal(state.expanded.has("beta"), false);
assert.equal(state.expanded.has("gamma"), false);
// Descendant expansion is preserved by the level-only collapse.
assert.equal(state.expanded.has("alpha/child"), true);

console.log("workflow tree-interaction contract passed");
