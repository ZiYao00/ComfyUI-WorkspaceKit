/**
 * Coalesce rapid WorkspaceKit workflow-navigation intents without owning workflow
 * loading. ComfyUI remains the only loader/serializer; this helper only limits
 * how many official navigation commands WorkspaceKit dispatches.
 *
 * While one official command is in flight, at most one pending intent is kept.
 * A newer click replaces that pending intent, so stale intermediate clicks never
 * accumulate behind ComfyUI's own workflow load queue.
 */
export function createLatestWorkflowNavigationDispatcher(runNavigation) {
  if (typeof runNavigation !== "function") {
    throw new TypeError("runNavigation must be a function");
  }

  let dispatchInFlight = false;
  let pendingIntent = null;

  function supersededResult() {
    return {
      opened: false,
      initializeCleanState: false,
      reason: "superseded-before-dispatch",
      superseded: true,
    };
  }

  async function drain() {
    if (dispatchInFlight) return;
    dispatchInFlight = true;
    try {
      while (pendingIntent) {
        const intent = pendingIntent;
        pendingIntent = null;
        try {
          intent.resolve(await runNavigation(intent.path, intent.requestId));
        } catch (error) {
          intent.reject(error);
        }
      }
    } finally {
      dispatchInFlight = false;
      // A new intent can arrive between the final loop condition and this
      // assignment. Restart only the dispatcher; never load a graph here.
      if (pendingIntent) void drain();
    }
  }

  return function dispatch(path, requestId) {
    return new Promise((resolve, reject) => {
      if (pendingIntent) {
        pendingIntent.resolve(supersededResult());
      }
      pendingIntent = { path, requestId, resolve, reject };
      void drain();
    });
  };
}
