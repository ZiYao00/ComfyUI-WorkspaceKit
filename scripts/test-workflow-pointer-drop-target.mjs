import assert from "node:assert/strict";
import { resolveWorkflowPointerDropHit } from "../entry/workflows/pointer-drop-target.js";

function element({ directTarget = null, parentPath } = {}) {
  const target = directTarget
    ? { classList: { contains: (name) => name === "workspace2-tree" && directTarget === "tree" } }
    : null;
  const row = parentPath === undefined ? null : { dataset: { workspace2ParentPath: parentPath } };
  return {
    closest(selector) {
      if (selector === "[data-workspace2-drop-target]") return target;
      if (selector === "[data-workspace2-parent-path]") return row;
      return null;
    },
  };
}

assert.equal(resolveWorkflowPointerDropHit([]), null);
assert.equal(resolveWorkflowPointerDropHit([element({ directTarget: "folder" })]).kind, "direct");
assert.equal(resolveWorkflowPointerDropHit([element({ directTarget: "tree" }), element({ directTarget: "folder" })]).kind, "direct");
assert.deepEqual(resolveWorkflowPointerDropHit([element({ parentPath: "folder-a" }), element({ directTarget: "tree" })]), {
  kind: "parent",
  parentPath: "folder-a",
});
assert.equal(resolveWorkflowPointerDropHit([element({ directTarget: "tree" })]).kind, "tree");

console.log("Workflow pointer drop-target contract passed.");
