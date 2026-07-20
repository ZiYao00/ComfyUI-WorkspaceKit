// Coordinates deferred object-info refreshes after the initial Nodes load.
// It owns the refresh timer, cross-tab lock, browser-cache recheck, `/object_info`
// request, IndexedDB write, and optional server-snapshot upload. The composition
// root injects every browser, state, and network collaborator so this module has
// no import-time work and cannot register listeners before the sidebar exists.
//
// Preserve two established behaviors: Templates defers the expensive refresh,
// and a second tab rechecks IndexedDB after acquiring the lock before asking
// ComfyUI for `/object_info` again.
export function createNodeObjectInfoRefreshCoordinator({
  state,
  isTemplatesActive,
  withRefreshLock,
  readCachedObjectInfo,
  writeCachedObjectInfo,
  applyCachedObjectInfo,
  applyFreshObjectInfo,
  renderNodesPanel,
  startPerformanceSpan,
  measurePromise,
  fetchObjectInfo,
  fetchJson,
  postJson,
  setTimeout = globalThis.setTimeout,
  clearTimeout = globalThis.clearTimeout,
  CompressionStream = globalThis.CompressionStream,
  Blob = globalThis.Blob,
  Response = globalThis.Response,
  refreshDelayMs = 1500,
  debug = (...args) => console.debug(...args),
}) {
  const renderIfConnected = () => {
    if (state.renderTarget?.isConnected) {
      renderNodesPanel(state.renderTarget);
    }
  };

  const persistObjectInfoToServerCache = async (objectInfo, signature) => {
    if (!signature || !objectInfo || typeof objectInfo !== "object" || Array.isArray(objectInfo)) {
      return;
    }
    if (typeof CompressionStream !== "function" || typeof Blob !== "function") {
      debug("[Workspace2] CompressionStream is unavailable; server node cache write skipped");
      return;
    }
    const started = await postJson("/workspace2/nodes/object-info-cache/upload", { signature });
    const uploadId = String(started.upload_id || "");
    const chunkBytes = Number(started.chunk_bytes || 0);
    if (!uploadId || !Number.isInteger(chunkBytes) || chunkBytes <= 0) {
      throw new Error("Invalid server node cache upload session.");
    }
    let uploadCompleted = false;
    try {
      const json = JSON.stringify(objectInfo);
      const stream = new Blob([json], { type: "application/json" })
        .stream()
        .pipeThrough(new CompressionStream("gzip"));
      const compressed = new Uint8Array(await new Response(stream).arrayBuffer());
      for (let offset = 0, chunkIndex = 0; offset < compressed.byteLength; offset += chunkBytes, chunkIndex += 1) {
        const chunk = compressed.slice(offset, Math.min(offset + chunkBytes, compressed.byteLength));
        await fetchJson(
          `/workspace2/nodes/object-info-cache/upload/${encodeURIComponent(uploadId)}/${chunkIndex}`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/octet-stream" },
            body: chunk,
          },
        );
      }
      await postJson(`/workspace2/nodes/object-info-cache/upload/${encodeURIComponent(uploadId)}/finish`, {});
      uploadCompleted = true;
    } finally {
      if (!uploadCompleted) {
        postJson(`/workspace2/nodes/object-info-cache/upload/${encodeURIComponent(uploadId)}/abort`, {}).catch(() => {});
      }
    }
  };

  const loadFullObjectInfo = async (signature = "") => {
    const finish = startPerformanceSpan("nodes.object-info-refresh");
    try {
      const objectInfoData = await measurePromise(
        "nodes.object-info-request",
        () => fetchObjectInfo(),
      );
      applyFreshObjectInfo(objectInfoData);
      state.objectInfoError = "";
      await measurePromise(
        "nodes.indexeddb-write",
        () => writeCachedObjectInfo(state.objectInfo, signature),
      );
      persistObjectInfoToServerCache(state.objectInfo, signature).catch((error) => {
        debug("[Workspace2] Server node cache write failed", error);
      });
      finish({ nodeCount: Object.keys(state.objectInfo).length });
    } catch (error) {
      state.objectInfoError = error.message || String(error);
      finish({ error: state.objectInfoError }, "error");
    } finally {
      state.objectInfoLoading = false;
      renderIfConnected();
    }
  };

  const refreshFullObjectInfoCoordinated = async (signature) => withRefreshLock(async () => {
    const latestCache = await readCachedObjectInfo().catch(() => null);
    if (signature && latestCache?.signature === signature && applyCachedObjectInfo(latestCache)) {
      state.objectInfoLoading = false;
      renderIfConnected();
      return;
    }
    await loadFullObjectInfo(signature);
  });

  const scheduleFullObjectInfoRefresh = (signature) => {
    if (state.objectInfoRefreshTimer) {
      clearTimeout(state.objectInfoRefreshTimer);
    }
    state.objectInfoRefreshTimer = setTimeout(() => {
      state.objectInfoRefreshTimer = null;
      if (isTemplatesActive()) {
        scheduleFullObjectInfoRefresh(signature);
        return;
      }
      refreshFullObjectInfoCoordinated(signature).catch((error) => {
        state.objectInfoError = error.message || String(error);
        state.objectInfoLoading = false;
      });
    }, refreshDelayMs);
  };

  return {
    persistObjectInfoToServerCache,
    loadFullObjectInfo,
    refreshFullObjectInfoCoordinated,
    scheduleFullObjectInfoRefresh,
  };
}
