// Nodes initial-library lifecycle. The loader coordinates existing injected
// requests and state transitions, but does not own `/object_info` refresh,
// cross-tab locking, IndexedDB implementation, or DOM rendering.
//
// Keep all collaborators injected. Earlier entry.js extractions taught us not
// to add import-time work: a failure here must never prevent sidebar
// registration before the user opens the Nodes panel.
export function createNodeLibraryLoader({
  state,
  startPerformanceSpan,
  measurePromise,
  fetchJson,
  fetchStaticJson,
  readCachedObjectInfo,
  writeCachedObjectInfo,
  normalizeNodeLibrary,
  normalizeServerObjectInfoCache,
  emptyNodeLibrary,
  renderNodesPanel,
  scheduleFullObjectInfoRefresh,
  refreshFullObjectInfoCoordinated,
  debug = (...args) => console.debug(...args),
}) {
  const loadNodeLibrary = () => {
    if (state.loadPromise) {
      return state.loadPromise;
    }
    state.loadPromise = loadNodeLibraryInternal().finally(() => {
      state.loadPromise = null;
    });
    return state.loadPromise;
  };

  const loadNodeLibraryInternal = async () => {
    const finish = startPerformanceSpan("nodes.initial-load");
    state.loading = true;
    state.objectInfoLoading = true;
    state.error = "";
    state.objectInfoError = "";
    try {
      const [libraryData, nodeFrequencyData, cachedObjectInfo, signatureData] = await Promise.all([
        measurePromise("nodes.library-request", () => fetchJson("/workspace2/nodes/library")),
        measurePromise(
          "nodes.frequency-map-request",
          () => fetchStaticJson("/assets/sorted-custom-node-map.json").catch(() => ({})),
        ),
        measurePromise(
          "nodes.indexeddb-read",
          () => readCachedObjectInfo().catch((error) => {
            debug("[Workspace2] Node cache read failed", error);
            return null;
          }),
        ),
        measurePromise(
          "nodes.signature-request",
          () => fetchJson("/workspace2/nodes/index-signature").catch((error) => {
            debug("[Workspace2] Node signature request failed", error);
            return null;
          }),
        ),
      ]);
      state.library = normalizeNodeLibrary(libraryData.library);
      state.nodeFrequencyLookup = nodeFrequencyData && typeof nodeFrequencyData === "object" ? nodeFrequencyData : {};
      const nodeIndexSignature = String(signatureData?.signature || "");
      const browserCacheIsCurrent = Boolean(
        nodeIndexSignature
        && cachedObjectInfo?.signature === nodeIndexSignature
        && cachedObjectInfo?.objectInfo,
      );
      let serverCachedObjectInfo = null;
      let serverCacheIsCurrent = false;
      if (!browserCacheIsCurrent && nodeIndexSignature) {
        const serverCacheData = await measurePromise(
          "nodes.server-cache-request",
          () => fetchJson("/workspace2/nodes/object-info-cache").catch((error) => {
            debug("[Workspace2] Server node cache request failed", error);
            return null;
          }),
        );
        serverCachedObjectInfo = normalizeServerObjectInfoCache(serverCacheData);
        serverCacheIsCurrent = Boolean(
          serverCacheData?.cache_hit
          && serverCachedObjectInfo?.signature === nodeIndexSignature,
        );
      }
      const preferredCache = browserCacheIsCurrent
        ? cachedObjectInfo
        : (serverCacheIsCurrent ? serverCachedObjectInfo : cachedObjectInfo);
      if (preferredCache?.objectInfo && typeof preferredCache.objectInfo === "object") {
        state.objectInfo = preferredCache.objectInfo;
        state.objectInfoCachedAt = Number(preferredCache.updatedAt || 0);
        state.objectInfoFromCache = true;
      }
      const cacheIsCurrent = browserCacheIsCurrent || serverCacheIsCurrent;
      if (serverCacheIsCurrent && !browserCacheIsCurrent) {
        writeCachedObjectInfo(serverCachedObjectInfo.objectInfo, nodeIndexSignature).catch((error) => {
          debug("[Workspace2] Server cache IndexedDB warm-up failed", error);
        });
      }
      state.nodeDefinitionsCache = null;
      state.nodeDefinitionMapCache = null;
      state.nodeDefinitionsSource = null;
      state.loading = false;
      state.objectInfoLoading = !cacheIsCurrent;
      if (state.renderTarget?.isConnected) {
        renderNodesPanel(state.renderTarget);
      }
      finish({
        cachedNodeCount: Object.keys(state.objectInfo || {}).length,
        cacheHit: Boolean(cachedObjectInfo?.objectInfo),
        cacheCurrent: cacheIsCurrent,
      });
      if (!cacheIsCurrent) {
        if (cachedObjectInfo?.objectInfo) {
          scheduleFullObjectInfoRefresh(nodeIndexSignature);
        } else {
          refreshFullObjectInfoCoordinated(nodeIndexSignature).catch((error) => {
            state.objectInfoError = error.message || String(error);
            state.objectInfoLoading = false;
          });
        }
      }
    } catch (error) {
      state.error = error.message;
      state.library = emptyNodeLibrary();
      state.objectInfo = {};
      state.nodeFrequencyLookup = {};
      state.nodeDefinitionsCache = null;
      state.nodeDefinitionMapCache = null;
      state.nodeDefinitionsSource = null;
      state.loading = false;
      state.objectInfoLoading = false;
      finish({ error: error?.message || String(error) }, "error");
    }
  };

  return { loadNodeLibrary };
}
