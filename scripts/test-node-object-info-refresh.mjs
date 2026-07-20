import assert from "node:assert/strict";
import { createNodeObjectInfoRefreshCoordinator } from "../entry/nodes/object-info-refresh.js";

function createHarness({ cachedObjectInfo = null, templatesActive = false } = {}) {
  const calls = { lock: 0, fetch: 0, write: 0, cached: 0, fresh: 0, render: 0 };
  const timers = [];
  const state = {
    objectInfo: null,
    objectInfoError: "",
    objectInfoLoading: true,
    objectInfoRefreshTimer: null,
    renderTarget: { isConnected: true },
  };
  let templates = templatesActive;
  const coordinator = createNodeObjectInfoRefreshCoordinator({
    state,
    isTemplatesActive: () => templates,
    withRefreshLock: async (callback) => {
      calls.lock += 1;
      return callback();
    },
    readCachedObjectInfo: async () => cachedObjectInfo,
    writeCachedObjectInfo: async () => { calls.write += 1; },
    applyCachedObjectInfo: (cache) => {
      calls.cached += 1;
      state.objectInfo = cache.objectInfo;
      return true;
    },
    applyFreshObjectInfo: (objectInfo) => {
      calls.fresh += 1;
      state.objectInfo = objectInfo;
    },
    renderNodesPanel: () => { calls.render += 1; },
    startPerformanceSpan: () => () => {},
    measurePromise: async (_name, callback) => callback(),
    fetchObjectInfo: async () => {
      calls.fetch += 1;
      return { Fresh: {} };
    },
    fetchJson: async () => ({}),
    postJson: async () => ({}),
    CompressionStream: null,
    Blob: null,
    debug: () => {},
    setTimeout: (callback, delay) => {
      const timer = { callback, delay, cleared: false };
      timers.push(timer);
      return timer;
    },
    clearTimeout: (timer) => { timer.cleared = true; },
  });
  return { calls, coordinator, setTemplates: (value) => { templates = value; }, state, timers };
}

const cacheHit = createHarness({
  cachedObjectInfo: { signature: "sig-current", objectInfo: { Cached: {} } },
});
await cacheHit.coordinator.refreshFullObjectInfoCoordinated("sig-current");
assert.equal(cacheHit.calls.lock, 1);
assert.equal(cacheHit.calls.cached, 1);
assert.equal(cacheHit.calls.fetch, 0);
assert.equal(cacheHit.calls.write, 0);
assert.equal(cacheHit.state.objectInfoLoading, false);
assert.equal(cacheHit.calls.render, 1);

const staleCache = createHarness({
  cachedObjectInfo: { signature: "old-signature", objectInfo: { Cached: {} } },
});
await staleCache.coordinator.refreshFullObjectInfoCoordinated("new-signature");
assert.equal(staleCache.calls.lock, 1);
assert.equal(staleCache.calls.cached, 0);
assert.equal(staleCache.calls.fetch, 1);
assert.equal(staleCache.calls.fresh, 1);
assert.equal(staleCache.calls.write, 1);
assert.deepEqual(staleCache.state.objectInfo, { Fresh: {} });
assert.equal(staleCache.state.objectInfoLoading, false);
assert.equal(staleCache.calls.render, 1);

const deferred = createHarness({ templatesActive: true });
deferred.coordinator.scheduleFullObjectInfoRefresh("sig-current");
assert.equal(deferred.timers.length, 1);
assert.equal(deferred.timers[0].delay, 1500);
deferred.timers[0].callback();
assert.equal(deferred.calls.fetch, 0);
assert.equal(deferred.timers.length, 2);
deferred.setTemplates(false);
deferred.timers[1].callback();
await new Promise((resolve) => setImmediate(resolve));
assert.equal(deferred.calls.fetch, 1);

console.log("Node object-info refresh coordinator contract passed.");
