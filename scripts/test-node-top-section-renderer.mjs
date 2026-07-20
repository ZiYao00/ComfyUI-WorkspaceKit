import assert from "node:assert/strict";
import { createNodeTopSectionRenderer } from "../entry/nodes/top-section-renderer.js";

class FakeElement {
  constructor(tagName) { this.tagName = tagName; this.children = []; this.className = ""; this.textContent = ""; }
  append(...children) { this.children.push(...children); }
}

let query = "";
const calls = [];
const renderer = createNodeTopSectionRenderer({
  document: { createElement: (tag) => new FakeElement(tag) },
  getQuery: () => query,
  translate: (key) => `t:${key}`,
  renderTopSectionHeader: (_el, section, id, title, count) => { calls.push(["header", id, title, count]); section.header = id; return true; },
  renderNodeRow: (_el, node, favorite) => ({ type: node.type, favorite }),
  buildOfficialNodeTree: (id, nodes) => ({ id, nodes }),
  renderOfficialNodeTree: (_el, section, tree, favorites) => { calls.push(["tree", tree.id, tree.nodes.length, favorites.size]); section.tree = tree; },
});

const body = new FakeElement("body");
const nodes = [{ type: "A" }, { type: "B" }];
renderer.renderNodeTopSection({}, body, "__comfy__", "Comfy", nodes, 4, new Set(["A"]));
assert.equal(body.children.length, 1);
assert.equal(body.children[0].className, "workspace2-node-section");
assert.deepEqual(calls, [["header", "__comfy__", "Comfy", "2/4"], ["tree", "__comfy__", 2, 1]]);

query = "a";
const searchedBody = new FakeElement("body");
renderer.renderNodeTopSection({}, searchedBody, "__comfy__", "Comfy", nodes, 4, new Set(["A"]));
assert.equal(searchedBody.children[0].children[0].className, "workspace2-node-list");
assert.deepEqual(searchedBody.children[0].children[0].children, [{ type: "A", favorite: true }, { type: "B", favorite: false }]);

query = "";
const emptyBody = new FakeElement("body");
renderer.renderNodeTopSection({}, emptyBody, "__unknown__", "Unknown", [], 4, new Set());
assert.equal(emptyBody.children[0].children[0].className, "workspace2-empty");
assert.equal(emptyBody.children[0].children[0].textContent, "t:nodes.noNodeMatches");

const collapsedRenderer = createNodeTopSectionRenderer({
  document: { createElement: (tag) => new FakeElement(tag) }, getQuery: () => "", translate: (key) => key,
  renderTopSectionHeader: () => false, renderNodeRow: () => { throw new Error("should not render"); },
  buildOfficialNodeTree: () => { throw new Error("should not build"); }, renderOfficialNodeTree: () => { throw new Error("should not render"); },
});
const collapsedBody = new FakeElement("body");
collapsedRenderer.renderNodeTopSection({}, collapsedBody, "__comfy__", "Comfy", nodes, 4, new Set());
assert.equal(collapsedBody.children.length, 1);

console.log("Node top-section renderer contract passed.");
