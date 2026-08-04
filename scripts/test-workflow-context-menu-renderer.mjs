import assert from "node:assert/strict";
import { createWorkflowContextMenuRenderer } from "../entry/workflows/context-menu-renderer.js";

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = new Map();
    this.className = "";
    this.style = {};
  }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  remove() {}
}

globalThis.document = { createElement: (tagName) => new Element(tagName) };

const calls = [];
const state = {
  contextMenuElement: null,
  contextMenu: { item: { type: "file", path: "folder/example.json" }, x: 20, y: 30 },
};
const renderer = createWorkflowContextMenuRenderer({
  state,
  t: (key) => key,
  closeContextMenu: () => calls.push("close"),
  handleError: (error) => { throw error; },
  createIcon: (key) => {
    const icon = new Element("svg");
    icon.icon = key;
    icon.classList = { add: () => {} };
    return icon;
  },
  onNewSubfolder: () => {},
  onPersonalizeFolder: () => {},
  onResetFolderStyle: () => {},
  onOpenWorkflow: () => calls.push("open"),
  onRename: () => calls.push("rename"),
  onMoveToRoot: () => calls.push("root"),
  onMoveToTrash: (_el, _item, anchor) => calls.push(`trash:${anchor?.className}`),
});

const panel = new Element("div");
renderer.render("panel", panel);
const menu = panel.children[0];
assert.deepEqual(menu.children.map((button) => button.children[0].icon), ["folderOpen", "edit", "rootArrow", "trash"]);
assert.deepEqual(menu.children.map((button) => button.children[1].textContent), ["menu.open", "menu.rename", "menu.moveToRoot", "menu.moveToTrash"]);

await menu.children[0].listeners.get("click")({});
assert.deepEqual(calls, ["close", "open"]);
await menu.children[3].listeners.get("click")({});
assert.deepEqual(calls, ["close", "open", "trash:workspace2-menu-item"]);
console.log("Workflow context-menu icon contract passed.");
