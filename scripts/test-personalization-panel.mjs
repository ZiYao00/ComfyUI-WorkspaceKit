import assert from "node:assert/strict";
import { createPersonalizationPanel } from "../entry/ui/personalization-panel.js";

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName; this.children = []; this.className = ""; this.textContent = "";
    this.title = ""; this.type = ""; this.value = ""; this.dataset = {}; this.listeners = new Map();
    this.style = { setProperty() {}, removeProperty() {} }; this.classList = { toggle() {} };
  }
  append(...children) { this.children.push(...children); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  querySelectorAll() { return []; }
  contains(target) { return target === this; }
  remove() { this.removed = true; }
}

let currentPanel = null;
const document = {
  body: { append(panel) { currentPanel = panel; } },
  createElement: (tagName) => new FakeElement(tagName),
  querySelector: () => currentPanel,
  addEventListener() {},
  removeEventListener() {},
};
const renderedIcons = [];
let appliedValue = null;
const panel = createPersonalizationPanel({
  document,
  window: { innerWidth: 300, innerHeight: 260 },
  translate: (key) => "t:" + key,
  applyDecoratedIcon: (_element, icon, color, fallback) => renderedIcons.push({ icon, color, fallback }),
  defaultFolderIconClass: "folder",
  schedule: (callback) => callback(),
});

assert.deepEqual(panel.clampFloatingPanel(-10, 999), { left: 10, top: 10 });
panel.openPersonalizationPanel({
  name: "Folder", icon: "🧩", color: "#0A84FF", anchor: { clientX: 999, clientY: 999 },
  onApply: async (value) => { appliedValue = value; },
});
assert.equal(currentPanel.className, "workspace2-personalize-panel");
assert.equal(currentPanel.style.left, "10px");
assert.equal(currentPanel.style.top, "10px");
assert.deepEqual(renderedIcons.at(-1), { icon: "🧩", color: "#0A84FF", fallback: "folder" });
const actions = currentPanel.children.at(-1);
await actions.children.at(-1).listeners.get("click")();
assert.deepEqual(appliedValue, { icon: "🧩", color: "#0A84FF" });
assert.equal(currentPanel.removed, true);
console.log("personalization panel contract passed");
