import assert from "node:assert/strict";
import { createTemplateGroupHeaderRenderer } from "../entry/templates/group-header-renderer.js";

class Element {
  constructor() { this.children=[]; this.listeners=new Map(); this.dataset={}; this.style={setProperty(){}}; this.className=""; this.textContent=""; this.value=""; }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  focus() { this.focused = true; } select() { this.selected = true; }
}
const calls = [];
const { renderTemplateGroupHeader: renderer } = createTemplateGroupHeaderRenderer({
  document: { createElement: () => new Element() },
  translate: (key) => key,
  iconButton: (icon, title, action) => { const button = new Element(); button.title=title; button.addEventListener("click", action); return button; },
  dangerIconButton: (icon, title, action) => { const button = new Element(); button.title=title; button.addEventListener("click", action); return button; },
  applyDecoratedIcon: (element, icon, color, fallback) => { element.fallback = fallback; },
  defaultOpenIconClass: "open", defaultIconClass: "closed", schedule: (callback) => callback(),
});
const section = new Element();
const group = { id: "g1", name: "Group", icon: "", color: "" };
const header = renderer({
  el: "panel", section, group, depth: 1, groupOpen: true, isEditing: false,
  makeDropTarget: (...args) => calls.push(["drop", ...args]), makeDragSource: (...args) => calls.push(["drag", ...args]),
  onToggle: () => calls.push(["toggle"]), onOpenMenu: () => calls.push(["menu"]), prepareRenameInput: () => {},
  onCommitRename: async () => calls.push(["commit"]), onRenameError: () => calls.push(["error"]), onCancelRename: () => calls.push(["cancel"]),
  onNewSubfolder: () => calls.push(["new"]), onStartRename: () => calls.push(["rename"]), onDelete: () => calls.push(["delete"]),
});
assert.equal(section.children[0], header);
assert.equal(header.dataset.workspace2TemplateGroupId, "g1");
assert.equal(header.children.length, 4);
assert.equal(header.children[1].fallback, "open");
header.listeners.get("contextmenu")({});
header.children[0].listeners.get("click")({stopPropagation(){}});
header.children[3].children[1].listeners.get("click")({});
assert.deepEqual(calls.map(([name]) => name), ["drop", "drag", "menu", "toggle", "rename"]);
console.log("template group-header renderer contract passed");
