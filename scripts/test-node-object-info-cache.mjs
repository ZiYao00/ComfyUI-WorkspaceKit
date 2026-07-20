import assert from "node:assert/strict";
import { createNodeObjectInfoCache } from "../entry/nodes/object-info-cache.js";

// Minimal IndexedDB double for the persistence contract. Browser UI and
// `/object_info` refresh are intentionally outside this test boundary.
const records = new Map();
const db = {
  createObjectStore() {},
  close() {},
  transaction() {
    const tx = {};
    tx.objectStore = () => ({
      get(key) {
        const request = {};
        queueMicrotask(() => {
          request.result = records.get(key);
          request.onsuccess?.();
        });
        return request;
      },
      put(value) {
        records.set(value.key, value);
        queueMicrotask(() => tx.oncomplete?.());
      },
      delete(key) {
        records.delete(key);
        queueMicrotask(() => tx.oncomplete?.());
      },
    });
    return tx;
  },
};
const fakeIndexedDb = {
  open() {
    const request = { result: db };
    queueMicrotask(() => request.onupgradeneeded?.());
    queueMicrotask(() => request.onsuccess?.());
    return request;
  },
};

let clearCount = 0;
const cache = createNodeObjectInfoCache({
  dbName: "test",
  storeName: "records",
  cacheKey: "object-info",
  indexedDB: fakeIndexedDb,
  now: () => 1234,
  onCleared: () => { clearCount += 1; },
});

assert.equal(await cache.readCachedObjectInfo(), null);
await cache.writeCachedObjectInfo({ A: {}, B: {} }, "signature-1");
assert.deepEqual(await cache.readCachedObjectInfo(), {
  key: "object-info",
  updatedAt: 1234,
  count: 2,
  signature: "signature-1",
  objectInfo: { A: {}, B: {} },
});
await cache.clearCachedObjectInfo();
assert.equal(clearCount, 1);
assert.equal(await cache.readCachedObjectInfo(), null);

console.log("Node object-info cache contract passed.");
