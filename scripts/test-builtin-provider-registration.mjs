import assert from "node:assert/strict";

import {
  getBuiltinWorkspaceKitProviders,
  registerOrQueueBuiltinProvider,
} from "../entry/integrations/builtin-provider-registration.js";
import {
  publishWorkspaceKitPanelApi,
  registerPendingWorkspaceKitPanelProviders,
} from "../entry/integrations/panel-api.js";

const provider = Object.freeze({
  apiVersion: 1,
  id: "workspacekit.test-builtin",
  builtin: true,
  title: "Builtin",
  render() { return () => {}; },
});

{
  const target = {};
  const queued = registerOrQueueBuiltinProvider(provider, target);
  assert.deepEqual(queued, { ok: true, code: "queued", id: provider.id });
  assert.equal(registerOrQueueBuiltinProvider(provider, target).code, "already-queued");
  assert.deepEqual(getBuiltinWorkspaceKitProviders(target), [provider]);

  const published = publishWorkspaceKitPanelApi(target);
  assert.equal(published.ok, true);
  const drained = registerPendingWorkspaceKitPanelProviders(published.api, target);
  assert.equal(drained.length, 1);
  assert.equal(drained[0].ok, true);
  assert.deepEqual(published.api.getProviders(), [provider]);
}

{
  const target = {};
  const api = publishWorkspaceKitPanelApi(target).api;
  const registered = registerOrQueueBuiltinProvider(provider, target);
  assert.deepEqual(registered, { ok: true, code: "registered", id: provider.id });
  assert.deepEqual(api.getProviders(), [provider]);
  assert.deepEqual(getBuiltinWorkspaceKitProviders(target), [provider]);
}

{
  const target = {};
  const api = publishWorkspaceKitPanelApi(target, { providersEnabled: false }).api;
  const deferred = registerOrQueueBuiltinProvider(provider, target);
  assert.equal(deferred.code, "deferred-disabled", "public Provider availability may still defer the transport");
  assert.deepEqual(api.getProviders(), [], "disabled external integration keeps the public Provider list empty");
  assert.deepEqual(
    getBuiltinWorkspaceKitProviders(target),
    [provider],
    "first-party module identity must survive external Provider availability",
  );
}

console.log("Built-in Provider startup registration contract passed.");
