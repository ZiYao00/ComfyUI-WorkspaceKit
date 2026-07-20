import assert from "node:assert/strict";
import { createTemplateDragDrop } from "../entry/templates/drag-drop.js";

class Target {
  constructor() {
    this.dataset = {};
    this.listeners = new Map();
    const classes = new Set();
    this.classList = { add: (name) => classes.add(name), remove: (name) => classes.delete(name), has: (name) => classes.has(name) };
  }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  closest() { return { classList: this.classList }; }
}
function transfer(values = {}) {
  return { effectAllowed: "", dropEffect: "", getData: (type) => values[type] || "", setData(type, value) { values[type] = value; } };
}
const state = { draggingTemplate: null, draggingGroupId: "" };
const calls = [];
const dragDrop = createTemplateDragDrop({
  state, templateDragType: "template", templateGroupDragType: "group",
  isGroupDescendant: (targetId, sourceId) => targetId === "child" && sourceId === "parent",
  onMoveTemplate: async (...args) => calls.push(["template", ...args]),
  onMoveGroup: async (...args) => calls.push(["group", ...args]),
  onError: (...args) => calls.push(["error", ...args]),
});

const target = new Target();
dragDrop.makeTemplateDropTarget("panel", target, "target", "before");
const templateEvent = { dataTransfer: transfer({ template: JSON.stringify({ id: "t1" }) }), preventDefault(){this.prevented=true;}, stopPropagation(){this.stopped=true;} };
target.listeners.get("dragover")(templateEvent);
assert.equal(templateEvent.dataTransfer.dropEffect, "move");
assert.equal(target.classList.has("is-drop"), true);
await target.listeners.get("drop")(templateEvent);
assert.deepEqual(calls, [["template", "panel", "t1", "target", "before"]]);

const source = new Target();
dragDrop.makeTemplateGroupDragSource(source, { id: "parent", name: "Parent" });
const groupEvent = { target: { closest: () => null }, dataTransfer: transfer(), preventDefault(){this.prevented=true;} };
source.listeners.get("dragstart")(groupEvent);
assert.equal(state.draggingGroupId, "parent");
assert.equal(groupEvent.dataTransfer.effectAllowed, "move");
assert.equal(groupEvent.dataTransfer.getData("group"), JSON.stringify({ id: "parent" }));
source.listeners.get("dragend")();
assert.equal(state.draggingGroupId, "");

const blocked = { dataTransfer: transfer({ group: JSON.stringify({ id: "parent" }) }), preventDefault(){this.prevented=true;}, stopPropagation(){} };
const childTarget = new Target();
dragDrop.makeTemplateDropTarget("panel", childTarget, "child");
childTarget.listeners.get("dragover")(blocked);
assert.equal(blocked.prevented, undefined);
assert.equal(childTarget.classList.has("is-drop"), false);
console.log("template drag/drop contract passed");
