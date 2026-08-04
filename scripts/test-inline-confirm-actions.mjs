import assert from "node:assert/strict";
import { createWorkspace2Dialogs } from "../entry/ui/dialogs.js";

class Element {
  constructor(className = "") {
    this.className = className;
    this.children = [];
    this.childNodes = this.children;
    this.listeners = new Map();
    this.attrs = new Map();
    this.isConnected = true;
    this.classList = { contains: (name) => this.className.split(/\s+/).includes(name) };
  }
  append(...children) { this.children.push(...children); this.childNodes = this.children; }
  replaceChildren(...children) { this.children = children; this.childNodes = children; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this.attrs.set(name, value); }
  closest() { return null; }
  remove() { this.isConnected = false; }
}

globalThis.document = { createElement: () => new Element() };
const calls = [];
const { workspace2InlineConfirm } = createWorkspace2Dialogs({
  t: (key) => ({ "confirm.cancel": "Cancel", "confirm.delete": "Delete" }[key] || key),
  isolateComfyKeys: (element) => element,
  closeOverlays: () => calls.push("close-overlays"),
});

const actions = new Element("workspace2-actions");
actions.append(new Element("original"));
workspace2InlineConfirm(actions, {
  confirmText: "Delete",
  onConfirm: async () => calls.push("delete"),
  secondaryText: "Dissolve",
  secondaryTitle: "Keep contents",
  onSecondary: async () => calls.push("dissolve"),
});
const inline = actions.children[0];
assert.equal(inline.children.length, 3);
assert.equal(inline.children[0].textContent, "Cancel");
assert.equal(inline.children[1].textContent, "Dissolve");
assert.equal(inline.children[1].title, "Keep contents");
assert.equal(inline.children[2].textContent, "Delete");
assert.equal(Boolean(inline.children[2].title), false);
await inline.children[1].listeners.get("click")({ preventDefault() {}, stopPropagation() {} });
assert.deepEqual(calls, ["close-overlays", "dissolve"]);
assert.equal(actions.children[0].className, "original");

workspace2InlineConfirm(actions, { confirmText: "Delete", onConfirm: async () => calls.push("delete") });
assert.equal(actions.children[0].children.length, 2);
console.log("Inline confirm action contract passed");
