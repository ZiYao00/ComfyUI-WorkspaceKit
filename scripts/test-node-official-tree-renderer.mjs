import assert from "node:assert/strict";
import { createOfficialNodeTreeRenderer } from "../entry/nodes/official-tree-renderer.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.style = {};
    this.listeners = new Map();
    this.className = "";
    this.textContent = "";
    this.title = "";
    this.type = "";
  }
  append(...children) { this.children.push(...children); }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
}

const toggles = [];
const renderedRows = [];
let query = "";
const expanded = new Set(["official/Image"]);
const renderer = createOfficialNodeTreeRenderer({
  document: { createElement: (tagName) => new FakeElement(tagName) },
  getQuery: () => query,
  isFolderExpanded: (key) => expanded.has(key),
  translate: (key) => `t:${key}`,
  renderNodeRow: (_el, node, favorite, depth, parentKey) => {
    renderedRows.push({ type: node.type, favorite, depth, parentKey });
    return { row: node.type };
  },
  toggleFolder: (el, folder, recursive) => toggles.push({ el, key: folder.key, recursive }),
  applyDecoratedIcon: (element, _emoji, _fallback, iconClass) => { element.iconClass = iconClass; },
  folderIconClass: "folder",
  folderOpenIconClass: "folder-open",
});

const section = new FakeElement("section");
const root = {
  key: "official",
  children: [{
    key: "official/Image",
    label: "Image",
    type: "folder",
    totalLeaves: 1,
    children: [{ key: "official/Image/Load", label: "Load", type: "node", node: { type: "LoadImage" }, totalLeaves: 1 }],
  }],
};
const el = { id: "panel" };
renderer.renderOfficialNodeTree(el, section, root, new Set(["LoadImage"]));

assert.equal(section.children.length, 2);
const header = section.children[0];
assert.equal(header.className, "workspace2-node-folder-header");
assert.equal(header.style.paddingLeft, "8px");
assert.equal(header.children[0].title, "t:folder.collapse");
assert.equal(header.children[1].iconClass, "folder-open");
assert.equal(header.children[2].textContent, "Image");
assert.equal(header.children[3].textContent, "1");
assert.deepEqual(renderedRows, [{ type: "LoadImage", favorite: true, depth: 1, parentKey: "official/Image" }]);

header.listeners.get("click")({ target: { closest: () => null }, stopPropagation() {}, ctrlKey: true, metaKey: false });
header.children[0].listeners.get("click")({ stopPropagation() {}, ctrlKey: false, metaKey: true });
assert.deepEqual(toggles.map(({ key, recursive }) => ({ key, recursive })), [
  { key: "official/Image", recursive: true },
  { key: "official/Image", recursive: true },
]);

query = "load";
expanded.clear();
const queriedSection = new FakeElement("section");
renderer.renderOfficialNodeTree(el, queriedSection, root, new Set());
assert.equal(queriedSection.children.length, 2);
assert.equal(queriedSection.children[0].children[0].title, "t:folder.collapse");

console.log("Official node tree renderer contract passed.");
