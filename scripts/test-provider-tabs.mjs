import assert from "node:assert/strict";
import { createWorkspaceTabPlan } from "../entry/ui/provider-tabs.js";

const layout = { id: "layout", title: "Layout", priority: 10 };
const theme = { id: "theme", title: "Theme", priority: 20 };
const plan = createWorkspaceTabPlan(["workflows", "nodes", "templates"], [layout, theme], "layout");

assert.equal(plan.pinned, layout);
assert.deepEqual(plan.mergedProviders.map((provider) => provider.id), ["layout", "theme"]);
assert.ok(plan.mergedProviders.includes(plan.pinned), "the selector must include the current pinned provider");

console.log("WorkspaceKit provider-tab plan contract passed.");
