import assert from "node:assert/strict";
import { createOfficialNodeTreeBuilder } from "../entry/nodes/official-tree.js";

const state = {
  customOrderEnabled: false,
  customOrder: {},
  sort: "alphabetical",
};
const treeBuilder = createOfficialNodeTreeBuilder({
  categoryPartsForNode: (node) => node.parts,
  getUncategorizedLabel: () => "Uncategorized",
  getCategorySortRank: (label) => ({ Core: 1, Image: 2 }[label] ?? 100),
  getCustomOrderEnabled: () => state.customOrderEnabled,
  getCustomOrder: (parentKey) => state.customOrder[parentKey] || [],
  getSortMode: () => state.sort,
});

const tree = treeBuilder.buildOfficialNodeTree("official", [
  { type: "z-node", title: "Z node", parts: ["Image", "Load"] },
  { type: "a-node", title: "A node", parts: ["Image", "Load"] },
  { type: "unknown-node", title: "Unknown", parts: ["Uncategorized"] },
  { type: "core-node", title: "Core node", parts: ["Core"] },
]);

assert.deepEqual(tree.children.map((item) => item.label), ["Uncategorized", "Core", "Image"]);
assert.equal(tree.totalLeaves, 4);
assert.equal("childMap" in tree, false);
assert.equal(tree.children[2].totalLeaves, 2);
assert.deepEqual(tree.children[2].children[0].children.map((item) => item.label), ["A node", "Z node"]);

state.customOrderEnabled = true;
state.customOrder = { "official/Image/Load": ["z-node", "a-node"] };
const customTree = treeBuilder.buildOfficialNodeTree("official", [
  { type: "a-node", title: "A node", parts: ["Image", "Load"] },
  { type: "z-node", title: "Z node", parts: ["Image", "Load"] },
]);
assert.deepEqual(customTree.children[0].children[0].children.map((item) => item.node.type), ["z-node", "a-node"]);

state.sort = "original";
state.customOrderEnabled = false;
const originalTree = treeBuilder.buildOfficialNodeTree("official", [
  { type: "z-node", title: "Z node", parts: ["Image"] },
  { type: "a-node", title: "A node", parts: ["Image"] },
]);
assert.deepEqual(originalTree.children[0].children.map((item) => item.node.type), ["z-node", "a-node"]);

console.log("Official node tree contract passed.");
