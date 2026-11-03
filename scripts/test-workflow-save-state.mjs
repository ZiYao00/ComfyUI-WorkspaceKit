import assert from "node:assert/strict";
import { createWorkflowOpenState } from "../entry/workflows/open-state.js";
import { saveOfficialWorkflow } from "../entry/workflows/official-adapter.js";

const clone = value => structuredClone(value);
const base = { nodes: [{ id: 1, type: "X", widgets_values: ["saved"] }], links: [], groups: [], extra: {} };
const changed = clone(base);
changed.nodes[0].widgets_values = ["edited"];
let idle;
globalThis.window = { requestIdleCallback: callback => { idle = callback; return 1; }, cancelIdleCallback() {}, setTimeout, clearTimeout };
const a = { path: "workflows/A.json", isPersisted: true, isModified: true, initialState: clone(base), activeState: clone(base) };
const b = { path: "workflows/B.json", isPersisted: true, isModified: true, initialState: clone(base), activeState: clone(changed) };
const store = { openWorkflows: [a, b], modifiedWorkflows: [], getWorkflowByPath: path => store.openWorkflows.find(w => w.path === path), openWorkflow() {} };
const app = { extensionManager: { workflow: store } };
const state = { isOfficialRoot: true, officialWorkflowSnapshots: new Map(), officialWorkflowDirtyPaths: new Set(), workflowDirty: true, workflowSnapshot: "active-fallback" };
const bridge = createWorkflowOpenState({ app, state, workspaceState: {}, serializeCurrentWorkflow: () => a.activeState, getActiveOfficialWorkflow: () => a, getOfficialWorkflowStore: () => store, subscribeOfficialWorkflowStore: () => () => {}, relativeWorkflowPathFromOfficial: p => p.replace(/^workflows\//, ""), renderWorkflowsPanel() {} });

assert.equal(bridge.getOfficialWorkflowSaveState(a).needsSave, false, "equal content overrides a stale modified flag without a WK baseline");
bridge.scheduleOfficialCleanBaseline(a);
assert.equal(bridge.getOfficialWorkflowSaveState(a).needsSave, false);
idle();
assert.equal(bridge.getOfficialWorkflowSaveState(a).needsSave, false);
bridge.scheduleOfficialCleanBaseline(a);
a.activeState = clone(changed);
bridge.captureOfficialDirtyState();
assert.equal(bridge.getOfficialWorkflowSaveState(a).needsSave, true, "an immediate edit is visible before idle initialization");
idle();
a.activeState = clone(base);
bridge.captureOfficialDirtyState();
assert.equal(bridge.getOfficialWorkflowSaveState(a).needsSave, false, "Undo to original content clears dirty even if the official flag remains true");
bridge.scheduleOfficialCleanBaseline(b);
idle();
assert.equal(bridge.getOfficialWorkflowSaveState(b).needsSave, true, "a restored draft is preserved");
bridge.setCleanState(changed, "B.json");
assert.equal(bridge.getOfficialWorkflowSaveState(b).needsSave, false);
assert.equal(state.workflowDirty, true, "saving B must not reset A's fallback state");
assert.equal(state.workflowSnapshot, "active-fallback");

let saveCalls = 0, renamed = [];
store.saveWorkflow = async target => { saveCalls++; await target.save(); };
store.renameWorkflow = async (target, path) => { renamed.push(path); target.path = path; };
b.save = async () => {};
b.isTemporary = true;
b.directory = "workflows";
b.promptSave = async () => null;
assert.equal(await saveOfficialWorkflow(b, app), false);
assert.equal(saveCalls, 0, "cancelled first Save must not write anything");
b.promptSave = async () => "A";
await assert.rejects(saveOfficialWorkflow(b, app), /already exists/);
assert.equal(saveCalls, 0);
b.promptSave = async () => "named-B";
assert.equal(await saveOfficialWorkflow(b, app, saved => assert.deepEqual(saved, changed)), true);
assert.deepEqual(renamed, ["workflows/named-B.json"]);
b.isTemporary = false;
b.save = async () => { throw new Error("disk failure"); };
await assert.rejects(saveOfficialWorkflow(b, app, () => assert.fail("failure cannot mark content clean")), /disk failure/);

// Freeze the written content before I/O. A later edit must remain dirty.
let finish;
b.save = () => new Promise(resolve => { finish = resolve; });
const pending = saveOfficialWorkflow(b, app, saved => bridge.setCleanState(saved, "named-B.json"));
assert.equal(await saveOfficialWorkflow(b, app), false, "two Save surfaces cannot start duplicate writes for one workflow");
b.activeState = clone(changed);
b.activeState.nodes[0].widgets_values = ["edited during save"];
finish();
await pending;
assert.equal(bridge.getOfficialWorkflowSaveState(b).needsSave, true, "in-flight edits are not swallowed by a save completion");

store.activeWorkflow = a;
a.save = async () => {};
let commands = [];
app.extensionManager.command = { execute: async id => {
  commands.push(id);
  a.originalContent = JSON.stringify(a.activeState);
  a.activeState = clone(changed);
} };
a.activeState = clone(base);
assert.equal(await saveOfficialWorkflow(a, app, saved => {
  assert.deepEqual(saved, base, "native completion supplies persisted content, not the later canvas");
}), true);
assert.deepEqual(commands, ["Comfy.SaveWorkflow"]);
app.extensionManager.command.execute = async () => {};
assert.equal(await saveOfficialWorkflow(a, app, () => assert.fail("a handled native failure cannot clear an edit")), false);
console.log("Workflow save-state regressions passed");
