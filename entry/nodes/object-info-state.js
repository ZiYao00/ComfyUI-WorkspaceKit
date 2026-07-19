// Mutable state transitions for node object-info snapshots. This module has no
// fetch, IndexedDB, scheduler, or rendering dependency: callers keep control
// of those lifecycle steps and use these helpers only after data is available.
//
// Preserve the existing permissive object check for cached payloads. Cache
// validation belongs to the loader/normalizer boundary; tightening it here
// would silently change compatibility with existing cache records.
export function createNodeObjectInfoState({ state, now = () => Date.now() }) {
  const clearDefinitionCaches = () => {
    state.nodeDefinitionsCache = null;
    state.nodeDefinitionMapCache = null;
    state.nodeDefinitionsSource = null;
  };

  const applyCachedObjectInfo = (cachedObjectInfo) => {
    if (!cachedObjectInfo?.objectInfo || typeof cachedObjectInfo.objectInfo !== "object") {
      return false;
    }
    state.objectInfo = cachedObjectInfo.objectInfo;
    state.objectInfoCachedAt = Number(cachedObjectInfo.updatedAt || 0);
    state.objectInfoFromCache = true;
    clearDefinitionCaches();
    return true;
  };

  const applyFreshObjectInfo = (objectInfo) => {
    state.objectInfo = objectInfo || {};
    state.objectInfoCachedAt = now();
    state.objectInfoFromCache = false;
    clearDefinitionCaches();
  };

  return { clearDefinitionCaches, applyCachedObjectInfo, applyFreshObjectInfo };
}
