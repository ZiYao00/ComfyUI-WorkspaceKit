import assert from "node:assert/strict";
import { createWorkflowOpenListRenderer } from "../entry/workflows/open-list-renderer.js";

class Element {
  constructor() { this.children=[]; this.listeners=new Map(); this.className=""; this.textContent=""; this.style={}; this.classList={ values:new Set(), add:(name)=>this.classList.values.add(name) }; }
  append(...nodes) { this.children.push(...nodes); }
  addEventListener(type, listener) { this.listeners.set(type, listener); }
  setAttribute(name, value) { this[name] = value; }
}

const calls = [];
const { renderOpenWorkflowList } = createWorkflowOpenListRenderer({
  document: { createElement: () => new Element() },
  translate: (key) => key,
  iconButton: (icon, title, action) => { const button = new Element(); button.icon=icon; button.title=title; button.addEventListener("click", action); return button; },
});
const official = { path:"one.json", item:{path:"one.json"}, displayName:"One", isOfficialWorkflow:true, isActive:true, isDirty:true, isRenaming:false };
const recent = { path:"two.json", item:{path:"two.json"}, displayName:"Two", isOfficialWorkflow:false, isActive:false, isDirty:true, isRenaming:false };
const section = renderOpenWorkflowList({
  entries:[official,recent], createRenameInput: () => ({input:true}),
  onOpen: async (entry) => calls.push(`open:${entry.path}`), onSave: async (entry) => calls.push(`save:${entry.path}`),
  onStartRename: (entry) => calls.push(`rename:${entry.path}`), onCloseOfficial: async (entry) => calls.push(`close:${entry.path}`),
  onRemoveRecent: (entry) => calls.push(`remove:${entry.path}`), onError: () => calls.push("error"),
});
assert.equal(section.children.length, 3);
const officialRow = section.children[1];
assert.equal(officialRow.classList.values.has("is-selected"), true);
assert.equal(officialRow.children[0].children[0].className, "workspace2-current-workflow-dirty-dot");
assert.equal(officialRow.children[1].children.length, 3);
const event = { preventDefault(){}, stopPropagation(){} };
await officialRow.children[0].listeners.get("click")(event);
officialRow.children[1].children[0].listeners.get("click")(event);
officialRow.children[1].children[1].listeners.get("click")(event);
officialRow.children[1].children[2].listeners.get("click")(event);
const recentRow = section.children[2];
assert.equal(recentRow.children[1].children.length, 1);
recentRow.children[1].children[0].listeners.get("click")(event);
await new Promise((resolve) => setTimeout(resolve, 0));
assert.deepEqual(calls, ["open:one.json", "save:one.json", "rename:one.json", "close:one.json", "remove:two.json"]);
console.log("workflow open-list renderer contract passed");
