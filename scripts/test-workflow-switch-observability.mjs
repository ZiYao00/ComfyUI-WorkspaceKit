import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [source, adapter, dispatcher, en, zh] = await Promise.all([
  readFile(new URL("../entry/entry.js", import.meta.url), "utf8"),
  readFile(new URL("../entry/workflows/official-adapter.js", import.meta.url), "utf8"),
  readFile(new URL("../entry/workflows/navigation-dispatcher.js", import.meta.url), "utf8"),
  readFile(new URL("../entry/locales/en-US.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../entry/locales/zh-CN.json", import.meta.url), "utf8").then(JSON.parse),
]);

assert.match(source, /pendingWorkflowPath: ""/, "workflow state must keep latest display intent separate from the active canvas");
assert.match(source, /let workflowOpenUiRequestId = 0/, "WorkspaceKit may retain only a latest-UI-intent token");
assert.doesNotMatch(source, /let workflowOpenQueue\s*=/, "the retired WorkspaceKit load queue must not return");
assert.doesNotMatch(source, /let workflowOpenRequestId\s*=/, "the retired WorkspaceKit load-queue request id must not return");
assert.doesNotMatch(source, /workflows\.open\.queue-wait/, "queue-wait timing belonged to the retired WorkspaceKit load queue");
assert.match(source, /createLatestWorkflowNavigationDispatcher/, "rapid UI intents may still be coalesced before direct native dispatch");
assert.match(source, /dispatchOfficialWorkflowNavigation\(path, requestId\)/, "official-root opening must retain latest-intent dispatch");
assert.match(dispatcher, /superseded-before-dispatch/, "the dispatcher must supersede only intents that have not started loading");
assert.doesNotMatch(dispatcher, /app\.loadGraphData/, "the dispatcher itself must never load a graph");
assert.doesNotMatch(dispatcher, /\.load\s*\(/, "the dispatcher itself must never load workflow content");
assert.match(source, /workflows\.open\.official-native/, "direct native workflow loading must have its own timing span");
assert.match(source, /openOfficialWorkflowThroughService\(app, workflow\)/, "official-root opening must delegate through the narrow adapter");
assert.match(source, /renderWorkflowPanelAfterAsync/, "workflow callbacks must guard against stale panel elements after await");
assert.match(source, /if \(el\?\.isConnected\)/, "connected workflow panels may render directly after async navigation");
assert.match(source, /workflowOpenState\.scheduleOfficialPanelRender\(\)/, "stale workflow panels must re-render through the current mounted target");
assert.match(source, /Official workflow navigation failed/, "an unavailable official path must still fail closed");

const openWorkflowStart = source.indexOf("async function openWorkflow(path)");
const openWorkflowEnd = source.indexOf("\n}\n\nasync function openWorkflowFileFromPicker", openWorkflowStart);
assert.ok(openWorkflowStart >= 0 && openWorkflowEnd > openWorkflowStart, "openWorkflow boundary must remain detectable");
const openWorkflowSource = source.slice(openWorkflowStart, openWorkflowEnd);
assert.doesNotMatch(openWorkflowSource, /captureOfficialDirtyState\s*\(/, "switch hot path must not serialize the outgoing graph for dirty reconciliation");
const officialBranchStart = openWorkflowSource.indexOf("if (state.isOfficialRoot) {");
const officialBranchEnd = openWorkflowSource.indexOf("\n    } else {", officialBranchStart);
assert.ok(officialBranchStart >= 0 && officialBranchEnd > officialBranchStart, "official-root branch must remain detectable");
const officialBranchSource = openWorkflowSource.slice(officialBranchStart, officialBranchEnd);
assert.doesNotMatch(officialBranchSource, /setCurrentWorkflowCleanState\s*\(/, "official switch hot path must not synchronously build a semantic baseline");
assert.match(officialBranchSource, /scheduleOfficialWorkflowCleanBaseline\s*\(/, "first-open official baseline work must be deferred off the switch hot path");

const adapterStart = adapter.indexOf("export async function openOfficialWorkflowThroughService");
const adapterEnd = adapter.indexOf("export async function saveOfficialWorkflow", adapterStart);
assert.ok(adapterStart >= 0 && adapterEnd > adapterStart, "official navigation adapter boundary must remain detectable");
const navigationAdapter = adapter.slice(adapterStart, adapterEnd);
assert.match(navigationAdapter, /workflow\.load\(\)/, "cold official workflows must load through the official ComfyWorkflow object");
assert.match(navigationAdapter, /app\.loadGraphData/, "canvas transition must use ComfyUI's public loadGraphData lifecycle");
assert.match(navigationAdapter, /skipAssetScans:\s*!loadFromRemote/, "warm switching must preserve ComfyUI's asset-scan optimization");
assert.doesNotMatch(navigationAdapter, /openWorkflowsInBackground/, "legacy background-tab bridge must stay retired");
assert.doesNotMatch(navigationAdapter, /reorderWorkflows/, "legacy tab reordering must stay retired");
assert.doesNotMatch(navigationAdapter, /Workspace\.NextOpenedWorkflow/, "legacy NextOpenedWorkflow routing must stay retired");
assert.doesNotMatch(navigationAdapter, /graph\.serialize\s*\(/, "direct native switch must not serialize the current graph before loading");

assert.equal(en["workflows.switching"], "Switching…");
assert.equal(zh["workflows.switching"], "正在切换…");

console.log("workflow direct-native observability contract passed");
