import assert from "node:assert/strict";
import {
  WORKSPACEKIT_PANEL_API_KEY,
  WORKSPACEKIT_PANEL_API_VERSION,
  publishWorkspaceKitPanelApi,
} from "../entry/integrations/panel-api.js";

const target = {};
const published = publishWorkspaceKitPanelApi(target);
assert.equal(published.ok, true);
assert.equal(published.code, "published");
assert.equal(target[WORKSPACEKIT_PANEL_API_KEY].version, WORKSPACEKIT_PANEL_API_VERSION);

const api = target[WORKSPACEKIT_PANEL_API_KEY];
const provider = { apiVersion: 1, id: "workspacekit.test", title: "Test Provider", render() { return () => {}; } };
const events = [];
const unsubscribe = api.subscribe((event) => events.push(event.type));
const originalWarn = console.warn;
console.warn = () => {};
api.subscribe(() => { throw new Error("consumer failure must be isolated"); });
assert.equal(api.register({ id: "missing-version", render() {} }).code, "incompatible-api");
assert.equal(api.register({ apiVersion: 1, id: "missing-render" }).code, "invalid-render");
assert.deepEqual(api.register(provider), { ok: true, code: "registered", id: "workspacekit.test" });
assert.equal(api.getProviders().length, 1);
assert.equal(api.register(provider).code, "already-registered");
assert.equal(api.register({ ...provider, render() {} }).code, "duplicate-id");
assert.deepEqual(api.unregister(provider.id, provider), { ok: true, code: "unregistered", id: "workspacekit.test" });
assert.deepEqual(events, ["registered", "unregistered"]);
unsubscribe();
console.warn = originalWarn;
assert.equal(api.getProviders().length, 0);
assert.equal(publishWorkspaceKitPanelApi(target).api, api);
assert.equal(publishWorkspaceKitPanelApi({ [WORKSPACEKIT_PANEL_API_KEY]: { version: 99 } }).code, "api-conflict");

const disabledTarget = {};
const disabledApi = publishWorkspaceKitPanelApi(disabledTarget, { providersEnabled: false }).api;
assert.equal(disabledApi.getProvidersEnabled(), false);
assert.deepEqual(disabledApi.register(provider), { ok: true, code: "deferred-disabled", id: "workspacekit.test" });
assert.deepEqual(disabledApi.getProviders(), []);
const availability = [];
disabledApi.subscribe((event) => availability.push([event.type, event.enabled]));
assert.deepEqual(disabledApi.setProvidersEnabled(true), { ok: true, code: "enabled", enabled: true });
assert.equal(disabledApi.getProvidersEnabled(), true);
assert.deepEqual(disabledApi.getProviders(), [provider]);
assert.deepEqual(availability, [["availability-changed", true]]);
assert.deepEqual(disabledApi.setProvidersEnabled(false), { ok: true, code: "disabled", enabled: false });
assert.deepEqual(disabledApi.getProviders(), []);
assert.deepEqual(disabledApi.setProvidersEnabled(false), { ok: true, code: "unchanged", enabled: false });

console.log("WorkspaceKit Panel API v1 contract passed.");
