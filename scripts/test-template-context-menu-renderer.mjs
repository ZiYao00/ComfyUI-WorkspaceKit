import assert from "node:assert/strict";
import { renderTemplateContextMenu } from "../entry/templates/context-menu-renderer.js";

class Element {
  constructor() { this.children = []; this.listeners = new Map(); this.style = {}; this.className = ""; this.textContent = ""; }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  remove() { this.removed = true; }
  contains(target) { return target === this || this.children.includes(target); }
}

let appendedMenu;
const documentListeners = new Map();
const windowListeners = new Map();
const document = {
  createElement: () => new Element(),
  body: { append: (element) => { appendedMenu = element; } },
  addEventListener: (type, listener) => documentListeners.set(type, listener),
  removeEventListener: (type) => documentListeners.delete(type),
};
const window = {
  addEventListener: (type, listener) => windowListeners.set(type, listener),
  removeEventListener: (type) => windowListeners.delete(type),
};
const calls = [];
const state = { contextMenu: { x: 27, y: 41, template: { id: "t1", name: "Example" } } };
renderTemplateContextMenu({
  document, window, state, t: (key) => key, el: "panel",
  closeMenu: () => calls.push("close"), onError: () => calls.push("error"),
  onRename: async () => calls.push("rename"), onPlaceCenter: async () => calls.push("place"),
  onCopyName: async () => calls.push("copy"), onDelete: async () => calls.push("delete"),
  schedule: (callback) => callback(),
});
assert.equal(appendedMenu.children.length, 4);
assert.equal(appendedMenu.style.left, "27px");
assert.equal(appendedMenu.style.top, "41px");
assert.equal(state.contextMenuElement, appendedMenu);
assert.equal(typeof windowListeners.get("pointerdown"), "function");
assert.equal(typeof documentListeners.get("pointerdown"), "function");
assert.equal(typeof windowListeners.get("keydown"), "function");
await appendedMenu.children[0].listeners.get("click")({});
await appendedMenu.children[1].listeners.get("click")({});
assert.deepEqual(calls, ["close", "rename", "close", "place"]);
console.log("template context-menu renderer contract passed");
