import assert from "node:assert/strict";
import { createNodeRowRenderer } from "../entry/nodes/row-renderer.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.style = {};
    this.dataset = {};
    this.listeners = new Map();
    this.className = "";
    this.title = "";
    this.textContent = "";
    this.classList = { values: new Set(), add: (name) => this.classList.values.add(name) };
  }
  append(...children) { this.children.push(...children); }
  addEventListener(type, callback) { this.listeners.set(type, callback); }
}

const calls = [];
let suppress = false;
let customOrder = true;
const renderer = createNodeRowRenderer({
  document: { createElement: (tag) => new FakeElement(tag) },
  isPendingNode: (node) => node.type === "LoadImage",
  shouldSuppressClick: () => suppress,
  clearSuppressClick: () => { suppress = false; calls.push("clearSuppress"); },
  makeCanvasDragSource: (_row, node) => calls.push(`drag:${node.type}`),
  showPreview: (node) => calls.push(`preview:${node.type}`),
  movePreview: () => calls.push("movePreview"),
  hidePreview: () => calls.push("hidePreview"),
  openContextMenu: (_el, _event, node) => calls.push(`menu:${node.type}`),
  setPendingNode: (node) => calls.push(`pending:${node?.type || "none"}`),
  isCustomOrderEnabled: () => customOrder,
  translate: (key) => `t:${key}`,
  beginReorderDrag: (_el, handle, _row, options) => { handle.reorderOptions = options; },
  iconButton: (icon, title, action) => {
    const button = new FakeElement("button");
    button.icon = icon;
    button.title = title;
    button.action = action;
    return button;
  },
  addFavorite: async (_el, node) => calls.push(`add:${node.type}`),
  removeFavorite: async (_el, type) => calls.push(`remove:${type}`),
});

const panel = { id: "panel" };
const node = { type: "LoadImage", title: "Load Image" };
const row = renderer.renderNodeRow(panel, node, true, 2, "official/Image");
assert.equal(row.className, "workspace2-node-row");
assert.equal(row.style.paddingLeft, "56px");
assert.deepEqual(row.dataset, { workspace2NodeType: "LoadImage", workspace2NodeParentKey: "official/Image" });
assert.equal(row.classList.values.has("is-selected"), true);
assert.equal(row.children[0].className, "workspace2-reorder-handle");
assert.deepEqual(row.children[0].reorderOptions, { kind: "global", type: "LoadImage", title: "Load Image", parentKey: "official/Image" });
assert.equal(row.children[3].children[0].icon, "starFilled");
assert.equal(row.children[3].children[0].classList.values.has("is-favorite-active"), true);

row.listeners.get("mouseenter")({});
row.listeners.get("mousemove")({});
row.listeners.get("mouseleave")({});
row.listeners.get("contextmenu")({});
row.listeners.get("click")({ target: { closest: () => null }, stopPropagation() {}, preventDefault() {} });
await row.children[3].children[0].action();
assert.deepEqual(calls, ["drag:LoadImage", "preview:LoadImage", "movePreview", "hidePreview", "preview:LoadImage", "menu:LoadImage", "preview:LoadImage", "pending:LoadImage", "remove:LoadImage"]);

suppress = true;
row.listeners.get("click")({ target: { closest: () => null }, stopPropagation() {}, preventDefault() {} });
assert.equal(suppress, false);
assert.equal(calls.at(-1), "clearSuppress");

customOrder = false;
const plainRow = renderer.renderNodeRow(panel, { type: "SaveImage", title: "Save Image" }, false);
assert.equal(plainRow.children[0].className, "workspace2-reorder-spacer");
assert.equal(plainRow.children[3].children[0].icon, "star");
await plainRow.children[3].children[0].action();
assert.equal(calls.at(-1), "add:SaveImage");

console.log("Node row renderer contract passed.");
