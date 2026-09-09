import assert from "node:assert/strict";
import {
  compareNodeBrowseLabels,
  nodeBrowseInitial,
  nodeBrowseSortKey,
} from "../entry/nodes/browse-sort.js";

assert.equal(nodeBrowseSortKey("✨ Alpha Node"), "alpha node");
assert.equal(nodeBrowseInitial("加载器"), "J");
assert.equal(nodeBrowseInitial("🔌 Foo"), "F");
assert.equal(nodeBrowseInitial("★"), "#");

const sorted = ["🔌 Zebra", "加载器", "alpha", "★ 2 Model", "🍀 Beta"]
  .sort((a, b) => compareNodeBrowseLabels(a, b));
assert.deepEqual(sorted, ["★ 2 Model", "alpha", "🍀 Beta", "加载器", "🔌 Zebra"]);
assert.equal(compareNodeBrowseLabels("Alpha", "alpha", "z", "a") > 0, true);

console.log("Node browse-sort contract passed.");
