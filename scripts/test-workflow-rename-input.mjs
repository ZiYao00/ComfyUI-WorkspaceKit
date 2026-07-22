import assert from "node:assert/strict";
import { createWorkflowRenameInputFactory } from "../entry/workflows/rename-input.js";

class Element {
  constructor() { this.listeners = new Map(); this.className = ""; this.value = ""; this.disabled = false; }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  focus() { this.focused = true; }
  select() { this.selected = true; }
}

const calls = [];
const { createRenameInput } = createWorkflowRenameInputFactory({
  document: { createElement: () => new Element() },
  schedule: (callback) => callback(),
});
const item = { path: "folder/test.json", name: "Test" };
const input = createRenameInput({
  item,
  surface: "open",
  displayName: () => "Display Test",
  prepareInput: () => calls.push("prepare"),
  onCommit: async (name) => calls.push(`commit:${name}`),
  onError: () => calls.push("error"),
  onCancel: () => calls.push("cancel"),
  isStillEditing: (path, surface) => path === item.path && surface === "open",
});
assert.equal(input.value, "Display Test");
assert.equal(input.focused, true);
assert.equal(input.selected, true);
input.value = "Renamed";
await input.listeners.get("keydown")({ key: "Enter", preventDefault(){}, stopPropagation(){} });
await input.listeners.get("blur")({});
assert.equal(input.disabled, true);
assert.deepEqual(calls, ["prepare", "commit:Renamed"]);

const cancelInput = createRenameInput({
  item,
  surface: "browse",
  displayName: () => "Display Test",
  prepareInput: () => {},
  onCommit: async () => calls.push("unexpectedCommit"),
  onError: () => calls.push("unexpectedError"),
  onCancel: () => calls.push("cancel"),
  isStillEditing: () => false,
});
cancelInput.listeners.get("keydown")({ key: "Escape", preventDefault(){}, stopPropagation(){} });
await cancelInput.listeners.get("blur")({});
assert.equal(calls.includes("cancel"), true);
assert.equal(calls.includes("unexpectedCommit"), false);
console.log("workflow rename-input contract passed");
