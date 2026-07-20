// IndexedDB persistence for the browser-side object-info snapshot. This module
// owns only opening, reading, writing, and deleting the one cache record. It
// deliberately does not fetch `/object_info`, schedule refreshes, render, or
// mutate panel state; callers decide when each persistence operation is safe.
//
// Keep browser primitives injectable. This makes the storage contract testable
// without a DOM and prevents module evaluation from touching IndexedDB before
// the Nodes panel is actually used.
export function createNodeObjectInfoCache({
  dbName,
  storeName,
  cacheKey,
  indexedDB = globalThis.indexedDB,
  now = () => Date.now(),
  onCleared = () => {},
}) {
  const openDb = () => new Promise((resolve, reject) => {
    if (!indexedDB) {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(storeName, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
  });

  const readCachedObjectInfo = async () => {
    let db;
    try {
      db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readonly");
        const request = tx.objectStore(storeName).get(cacheKey);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error || new Error("Failed to read node cache."));
      });
    } finally {
      db?.close?.();
    }
  };

  const writeCachedObjectInfo = async (objectInfo, signature = "") => {
    if (!objectInfo || typeof objectInfo !== "object" || Array.isArray(objectInfo)) {
      return;
    }
    let db;
    try {
      db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).put({
          key: cacheKey,
          updatedAt: now(),
          count: Object.keys(objectInfo).length,
          signature: String(signature || ""),
          objectInfo,
        });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Failed to write node cache."));
        tx.onabort = () => reject(tx.error || new Error("Node cache write was aborted."));
      });
    } finally {
      db?.close?.();
    }
  };

  const clearCachedObjectInfo = async () => {
    let db;
    try {
      db = await openDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        tx.objectStore(storeName).delete(cacheKey);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error("Failed to clear node cache."));
        tx.onabort = () => reject(tx.error || new Error("Node cache clear was aborted."));
      });
      onCleared();
    } finally {
      db?.close?.();
    }
  };

  return { readCachedObjectInfo, writeCachedObjectInfo, clearCachedObjectInfo };
}
