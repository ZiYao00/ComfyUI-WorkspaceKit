import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");
const [en, zh] = await Promise.all([
  readFile(new URL("../entry/locales/en-US.json", import.meta.url), "utf8").then(JSON.parse),
  readFile(new URL("../entry/locales/zh-CN.json", import.meta.url), "utf8").then(JSON.parse),
]);

assert.match(source, /pendingWorkflowPath: ""/, "workflow state must keep display intent separate from active canvas state");
assert.match(source, /workflows\.open\.queue-wait/, "every click must record its queue wait");
assert.match(source, /const indexHit = Boolean\(workflow\)/, "workflow timings must identify whether the path index hit");
assert.match(source, /workflows\.open\.sync-workflows/, "an index miss must be timed separately");
assert.match(source, /workflows\.open\.workflow-load/, "workflow content loading must be timed separately");
assert.match(source, /workflows\.open\.graph-load/, "singleton canvas loading must be timed separately");
assert.match(source, /outcome: "superseded-before-start"/, "queued stale requests must remain discardable");
assert.match(source, /requestId === workflowOpenRequestId[\s\S]*?pendingWorkflowPath = ""/, "only the latest request may clear pending UI state");
assert.equal(en["workflows.switching"], "Switching…");
assert.equal(zh["workflows.switching"], "正在切换…");

console.log("workflow switch observability contract passed");
