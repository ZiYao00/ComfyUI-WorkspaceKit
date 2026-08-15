import assert from "node:assert/strict";
import {
  closeWorkflowFileMenu,
  openWorkflowFileMenu,
} from "../entry/workflows/file-menu-renderer.js";

class Element {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.listeners = new Map();
    this.className = "";
    this.style = {};
    this.disabled = false;
  }
  append(...children) { this.children.push(...children); }
  remove() { this.removed = true; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  removeEventListener() {}
  contains(target) { return target === this || this.children.includes(target); }
  closest(selector) { return selector === ".workspace2-panel" ? panel : null; }
  getBoundingClientRect() { return { left: 20, bottom: 30 }; }
}

const panel = new Element("div");
const anchor = new Element("button");
const state = { fileMenuElement: null, fileMenuCloseHandler: null };
const calls = [];
const windowRef = {
  innerWidth: 300,
  addEventListener: () => {},
  removeEventListener: () => {},
  setTimeout: (callback) => callback(),
};
const documentRef = {
  createElement: (tagName) => new Element(tagName),
  addEventListener: () => {},
  removeEventListener: () => {},
};
const createIcon = (name) => {
  const icon = new Element("svg");
  icon.name = name;
  icon.classList = { add: () => {} };
  return icon;
};

openWorkflowFileMenu({
  state,
  el: { querySelector: () => panel },
  anchor,
  items: [
    { icon: "save", label: "Save", onClick: () => calls.push("save") },
    { separator: true },
    { icon: "trash", label: "Trash", disabled: true, onClick: () => calls.push("trash") },
  ],
  createIcon,
  handleError: (error) => { throw error; },
  closeMenu: () => closeWorkflowFileMenu({ state, windowRef, documentRef }),
  windowRef,
  documentRef,
});

const menu = state.fileMenuElement;
assert.ok(menu);
assert.deepEqual(menu.children.map((child) => child.className), [
  "workspace2-menu-item",
  "workspace2-menu-divider",
  "workspace2-menu-item",
]);
assert.equal(menu.children[0].children[0].name, "save");
assert.equal(menu.children[0].children[1].textContent, "Save");
await menu.children[0].listeners.get("click")();
assert.deepEqual(calls, ["save"]);
assert.equal(state.fileMenuElement, null);

openWorkflowFileMenu({
  state,
  el: { querySelector: () => panel },
  anchor,
  items: [{ icon: "trash", label: "Trash", disabled: true, onClick: () => calls.push("trash") }],
  createIcon,
  handleError: (error) => { throw error; },
  closeMenu: () => closeWorkflowFileMenu({ state, windowRef, documentRef }),
  windowRef,
  documentRef,
});
await state.fileMenuElement.children[0].listeners.get("click")();
assert.deepEqual(calls, ["save"]);

console.log("Workflow File menu renderer contract passed.");
