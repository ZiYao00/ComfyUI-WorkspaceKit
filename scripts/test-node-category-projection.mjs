import assert from "node:assert/strict";
import { createNodeCategoryProjection } from "../entry/nodes/category-projection.js";

const projector = createNodeCategoryProjection({
  nodeMatchesQuery: (node, query) => !query || node.title.toLowerCase().includes(query),
  sortNodeSearchResults: (nodes) => [...nodes].sort((a, b) => a.title.localeCompare(b.title)),
  isHiddenNode: (node) => Boolean(node.hidden),
  isComfyCoreNode: (node) => node.source === "core",
  isCustomNode: (node) => node.source === "custom",
  getDefaultVisibleSections: () => ({ bookmarked: true, comfy: true, extensions: true }),
  searchResultLimit: 2,
});

const nodes = [
  { type: "core-z", title: "Zebra", source: "core" },
  { type: "custom-a", title: "Apple", source: "custom" },
  { type: "unknown-b", title: "Banana", source: "other" },
  { type: "hidden", title: "Apricot", source: "core", hidden: true },
];
const all = projector.projectNodeCategories({
  allNodes: nodes,
  query: "",
  favorites: [{ type: "core-z" }],
  visibleSections: { bookmarked: false, comfy: true, extensions: false },
});
assert.equal(all.visibleTotal, 3);
assert.deepEqual(all.comfyNodes.map((node) => node.type), ["core-z"]);
assert.deepEqual(all.extensionNodes.map((node) => node.type), ["custom-a"]);
assert.deepEqual(all.unknownNodes.map((node) => node.type), ["unknown-b"]);
assert.equal(all.favoriteTypes.has("core-z"), true);
assert.deepEqual(all.visibleSections, { bookmarked: false, comfy: true, extensions: false });

const searched = projector.projectNodeCategories({
  allNodes: nodes,
  query: "a",
  favorites: [],
  visibleSections: { bookmarked: false, comfy: false, extensions: false },
});
assert.equal(searched.visibleTotal, 3);
assert.deepEqual(searched.extensionNodes.map((node) => node.type), ["custom-a"]);
assert.deepEqual(searched.unknownNodes.map((node) => node.type), ["unknown-b"]);
assert.deepEqual(searched.comfyNodes.map((node) => node.type), []);
assert.deepEqual(searched.visibleSections, { bookmarked: true, comfy: true, extensions: true });

console.log("Node category projection contract passed.");
