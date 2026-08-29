import assert from "node:assert/strict";

import { registerOrQueueBuiltinProvider } from "../entry/integrations/builtin-provider-registration.js";
import { createWorkspaceTabPlan } from "../entry/ui/provider-tabs.js";

const layout = { apiVersion: 1, id: "layout", title: "Layout", priority: 10, render() {} };
const theme = { apiVersion: 1, id: "theme", title: "Theme", priority: 20, render() {} };
const plan = createWorkspaceTabPlan(["workflows", "nodes", "templates"], [layout, theme], "layout");

assert.equal(plan.pinned, layout);
assert.deepEqual(plan.mergedProviders.map((provider) => provider.id), ["layout", "theme"]);
assert.ok(plan.mergedProviders.includes(plan.pinned), "the selector must include the current pinned provider");

{
  const target = {};
  const builtinLayout = Object.freeze({
    apiVersion: 1,
    id: "workspacekit.layout",
    builtin: true,
    title: "Layout",
    render() {},
  });
  const builtinAppearance = Object.freeze({
    apiVersion: 1,
    id: "workspacekit.theme",
    builtin: true,
    title: "Appearance",
    render() {},
  });
  registerOrQueueBuiltinProvider(builtinLayout, target);
  registerOrQueueBuiltinProvider(builtinAppearance, target);

  const builtinOnly = createWorkspaceTabPlan(
    ["workflows", "nodes", "templates"],
    [],
    "workspacekit.layout",
    target,
  );
  assert.deepEqual(
    builtinOnly.mergedProviders.map((provider) => provider.id),
    ["workspacekit.layout", "workspacekit.theme"],
    "built-in modules must remain planned even when the external Provider list is disabled/empty",
  );
  assert.equal(builtinOnly.pinned, builtinLayout);

  const themeSealed = createWorkspaceTabPlan(
    ["workflows", "nodes", "templates"],
    [],
    "workspacekit.theme",
    target,
    { providerFilter: (provider) => provider.id !== "workspacekit.theme" },
  );
  assert.deepEqual(themeSealed.mergedProviders, [builtinLayout]);
  assert.equal(themeSealed.pinned, builtinLayout, "a hidden/sealed built-in provider cannot remain pinned");

  const collision = createWorkspaceTabPlan(
    ["workflows", "nodes", "templates"],
    [{ id: "workspacekit.layout", title: "External collision", render() {} }],
    "workspacekit.layout",
    target,
  );
  assert.equal(collision.pinned, builtinLayout, "built-in module identity must win id collisions");
}

console.log("WorkspaceKit provider-tab plan contract passed.");
