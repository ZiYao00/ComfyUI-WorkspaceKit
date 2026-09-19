import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [source, adapter, en, zh] = await Promise.all([
  readFile(new URL("../entry/entry.js", import.meta.url), "utf8"),
  readFile(new URL("../entry/workflows/official-adapter.js", import.meta.url), "utf8"),
  readFile(new URL("../entry/locales/en-US.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../entry/locales/zh-CN.json", import.meta.url), "utf8").then(JSON.parse),
]);

assert.match(source, /pendingWorkflowPath: ""/, "workflow state must keep latest display intent separate from the active canvas");
assert.match(source, /let workflowOpenUiRequestId = 0/, "WorkspaceKit may retain only a latest-UI-intent token");
assert.doesNotMatch(source, /let workflowOpenQueue\s*=/, "official workflow loads must not be serialized by a WorkspaceKit queue");
assert.doesNotMatch(source, /let workflowOpenRequestId\s*=/, "the retired WorkspaceKit load-queue request id must not return");
assert.doesNotMatch(source, /workflows\.open\.queue-wait/, "queue-wait timing belonged to the retired WorkspaceKit load queue");
assert.doesNotMatch(source, /outcome: "superseded-before-start"/, "WorkspaceKit must not discard official load requests before they reach ComfyUI");
assert.match(source, /workflows\.open\.official-command/, "official workflow delegation must have its own observable timing span");
assert.match(source, /openOfficialWorkflowThroughService\(app, workflow\)/, "official-root opening must delegate through the narrow adapter");
assert.match(source, /Official workflow navigation failed/, "an unavailable official navigation path must fail closed instead of falling back to a second lifecycle");

const officialOpenStart = source.indexOf("async function openWorkflowFromOfficialStore");
const officialOpenEnd = source.indexOf("\n}\n\n// ComfyUI owns workflow serialization", officialOpenStart);
assert.ok(officialOpenStart >= 0 && officialOpenEnd > officialOpenStart, "official open function boundary must remain detectable");
const officialOpenSource = source.slice(officialOpenStart, officialOpenEnd);
assert.doesNotMatch(officialOpenSource, /app\.loadGraphData/, "official-root opening must never call app.loadGraphData directly");
assert.doesNotMatch(officialOpenSource, /loadOfficialWorkflow/, "official-root opening must never call workflow.load through the legacy adapter");

const adapterStart = adapter.indexOf("export async function openOfficialWorkflowThroughService");
const adapterEnd = adapter.indexOf("export async function saveOfficialWorkflow", adapterStart);
assert.ok(adapterStart >= 0 && adapterEnd > adapterStart, "official navigation adapter boundary must remain detectable");
const navigationAdapter = adapter.slice(adapterStart, adapterEnd);
assert.match(navigationAdapter, /openWorkflowsInBackground/, "the bridge may expose a target as an official background tab");
assert.match(navigationAdapter, /reorderWorkflows/, "the bridge routes the target with official tab ordering only");
assert.match(navigationAdapter, /Workspace\.NextOpenedWorkflow/, "the actual transition must be executed by the official command");
assert.doesNotMatch(navigationAdapter, /app\.loadGraphData/, "the bridge must not implement ComfyUI graph loading");
assert.doesNotMatch(navigationAdapter, /\.load\(\)/, "the bridge must not directly load workflow content");

assert.equal(en["workflows.switching"], "Switching…");
assert.equal(zh["workflows.switching"], "正在切换…");

console.log("workflow official-delegation observability contract passed");
