import { readFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { createWorkspaceStartupStageRunner } from "../entry/core/startup-stage.js";

const source = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");

const setupStart = source.indexOf("  async setup() {");
const registration = source.indexOf("if (!registerWorkspace2SidebarTab())", setupStart);
const locale = source.indexOf('runWorkspaceStartupStage("locale"', setupStart);
const workflows = source.indexOf('runWorkspaceStartupStage("workflows"', setupStart);

if (setupStart < 0 || registration < 0 || locale < 0 || workflows < 0) {
  throw new Error("WorkspaceKit setup resilience contract is incomplete.");
}
if (!(registration < locale && registration < workflows)) {
  throw new Error("Sidebar registration must happen before locale and workflow startup.");
}
if (!source.includes("createWorkspaceStartupStageRunner({")) {
  throw new Error("Missing isolated WorkspaceKit startup-stage runner.");
}
if (!source.includes("[WorkspaceKit] startup stage failed: ${stage}")) {
  throw new Error("Startup-stage failures must retain their stage identity.");
}
if (!source.includes('failedStages: workspaceState.startup.failures.map(({ stage }) => stage)')) {
  throw new Error("Performance completion record must expose failed startup stage names.");
}
if (!source.includes("localeReady: false") || !source.includes("state.localeReady = true")) {
  throw new Error("Early sidebar registration must use the stable pre-locale title fallback.");
}
if (!source.includes("function recoverWorkspace2SidebarAfterRemount()") || !source.includes("officialSidebarTabIds()")) {
  throw new Error("Sidebar remount recovery must consult official sidebar state.");
}
if (!source.includes('registeredIds === null || registeredIds.has(WORKSPACE2_TAB_ID)') || !source.includes('installWorkspace2SidebarEmojiIcon();')) {
  throw new Error("Registered sidebar tabs must recover styling without duplicate registration.");
}
if (!source.includes('if (typeof getSidebarTabs !== "function") return null;')
  || !source.includes('registeredIds === null || registeredIds.has(WORKSPACE2_TAB_ID)')) {
  throw new Error("Missing official sidebar state must not be treated as permission to register a duplicate tab.");
}

const startup = { failures: [] };
const failures = [];
const runStage = createWorkspaceStartupStageRunner({
  startup,
  onFailure: (stage, error) => failures.push({ stage, name: error.name }),
});
const failed = await runStage("workflows", async () => {
  throw new TypeError("intentional workflow-load failure");
});
assert.equal(failed, undefined);
assert.equal(startup.lastStartedStage, "workflows");
assert.deepEqual(startup.failures, [{ stage: "workflows", error: "TypeError" }]);
assert.deepEqual(failures, [{ stage: "workflows", name: "TypeError" }]);
const laterResult = await runStage("template-prefetch", async () => "continued");
assert.equal(laterResult, "continued");
assert.equal(startup.lastCompletedStage, "template-prefetch");

console.log("Sidebar startup resilience contract passed.");
