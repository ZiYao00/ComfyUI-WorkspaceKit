// Owns only the in-memory workflow item collection used by Browse. Network
// requests, official Store calls, path-dependent UI state, and rendering stay
// in entry.js. This deliberately preserves the local-revision advance before
// a later poll can arrive, which prevents an older filesystem response from
// overwriting a successful rename, move, create, or trash operation.
export function createWorkflowItemStore({
  state,
  workflowSignature,
  isPathWithin,
  replacePathPrefix,
}) {
  function commitSnapshot(items) {
    state.items = items;
    state.signature = workflowSignature(items);
    state.workflowListRevision += 1;
  }

  function commitLocal(items) {
    commitSnapshot(items);
  }

  function addLocal(item) {
    commitLocal([
      ...state.items.filter((entry) => entry.path !== item.path),
      item,
    ]);
  }

  function remapLocal(oldPath, newPath) {
    const nextName = String(newPath || "").split("/").pop() || newPath;
    commitLocal(state.items.map((entry) => {
      if (!isPathWithin(entry.path, oldPath)) {
        return entry;
      }
      const path = replacePathPrefix(entry.path, oldPath, newPath);
      return {
        ...entry,
        path,
        name: entry.path === oldPath ? nextName : entry.name,
        updated_at: Date.now(),
      };
    }));
  }

  function removeLocal(path) {
    commitLocal(
      state.items.filter((entry) => !isPathWithin(entry.path, path)),
    );
  }

  return {
    commitSnapshot,
    commitLocal,
    addLocal,
    remapLocal,
    removeLocal,
  };
}
