import assert from "node:assert/strict";
import { createTemplateRowRenderer } from "../entry/templates/row-renderer.js";

class Element {
  constructor() {
    this.children = [];
    this.listeners = new Map();
    this.dataset = {};
    this.className = "";
    this.textContent = "";
    this.style = {};
    this.classList = { values: new Set(), add: (name) => this.classList.values.add(name) };
  }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  focus() { this.focused = true; }
  select() { this.selected = true; }
}

const calls = [];
const { renderTemplateRow } = createTemplateRowRenderer({
  document: { createElement: () => new Element() },
  translate: (key, values = {}) => `${key}:${values.nodes ?? ""}/${values.links ?? ""}`,
  iconSvg: (name) => ({ icon: name }),
  dangerIconButton: (icon, title, action) => {
    const button = new Element();
    button.icon = icon;
    button.title = title;
    button.addEventListener("click", action);
    return button;
  },
  schedule: (callback) => callback(),
});

const plainTarget = { closest: () => null };
const template = { id: "template-1", name: "First", groupId: "group-1", nodes: [{}, {}], links: [{}] };
const row = renderTemplateRow({
  el: "panel",
  template,
  isEditing: false,
  isSelected: true,
  makeDropTarget: (...args) => calls.push(["drop", ...args]),
  prepareRenameInput: () => calls.push(["prepare"]),
  onRename: async () => calls.push(["rename"]),
  onRenameError: () => calls.push(["renameError"]),
  onCancelRename: () => calls.push(["cancel"]),
  onDelete: (anchor) => calls.push(["delete", anchor]),
  onActionsPointerEnter: () => calls.push(["hide"]),
  onDragStart: () => calls.push(["dragStart"]),
  onDragEnd: () => calls.push(["dragEnd"]),
  onOpenMenu: () => calls.push(["menu"]),
  onSelect: () => calls.push(["select"]),
  onPreviewEnter: () => calls.push(["previewEnter"]),
  onPreviewMove: () => calls.push(["previewMove"]),
  onPreviewLeave: () => calls.push(["previewLeave"]),
  onOpenTemplate: async () => calls.push(["open"]),
  onOpenTemplateError: () => calls.push(["openError"]),
});

assert.equal(row.dataset.workspace2TemplateId, "template-1");
assert.equal(row.draggable, true);
assert.equal(row.classList.values.has("is-selected"), true);
assert.equal(row.children[1].children[1].textContent, "templates.meta:2/1");
await row.listeners.get("dragstart")({ target: plainTarget });
row.listeners.get("dragend")({});
row.listeners.get("contextmenu")({});
row.listeners.get("click")({ target: plainTarget, preventDefault(){}, stopPropagation(){} });
row.listeners.get("pointerenter")({ target: plainTarget });
row.listeners.get("pointermove")({ target: plainTarget });
row.listeners.get("pointerleave")({});
await row.listeners.get("dblclick")({ target: plainTarget, preventDefault(){}, stopPropagation(){} });
row.children[2].children[0].listeners.get("click")({ currentTarget: "delete-button", preventDefault(){}, stopPropagation(){} });
assert.deepEqual(calls.map(([name]) => name), ["drop", "dragStart", "dragEnd", "menu", "select", "previewEnter", "previewMove", "previewLeave", "open", "delete"]);

const editingRow = renderTemplateRow({
  el: "panel", template, isEditing: true, isSelected: false, makeDropTarget: () => {},
  prepareRenameInput: () => calls.push(["prepare"]), onRename: async () => calls.push(["rename"]), onRenameError: () => {},
  onCancelRename: () => calls.push(["cancel"]), onDelete: () => {}, onActionsPointerEnter: () => {}, onDragStart: () => {}, onDragEnd: () => {},
  onOpenMenu: () => {}, onSelect: () => {}, onPreviewEnter: () => {}, onPreviewMove: () => {}, onPreviewLeave: () => {},
  onOpenTemplate: async () => {}, onOpenTemplateError: () => {},
});
const input = editingRow.children[1].children[0].children[0];
assert.equal(editingRow.draggable, false);
assert.equal(input.focused, true);
await input.listeners.get("keydown")({ key: "Enter", preventDefault(){}, stopPropagation(){} });
input.listeners.get("keydown")({ key: "Escape", preventDefault(){}, stopPropagation(){} });
assert.equal(calls.some(([name]) => name === "prepare"), true);
assert.equal(calls.some(([name]) => name === "rename"), true);
assert.equal(calls.some(([name]) => name === "cancel"), true);

console.log("template row renderer contract passed");
