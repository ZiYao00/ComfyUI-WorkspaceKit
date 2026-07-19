// Owns path-dependent Browse UI state only: selection, inline editing,
// expanded folders, and custom order. Official workflow dirty state and
// recents persistence remain callbacks from entry.js so this module cannot
// reorder their established rename/delete behavior.
export function createWorkflowPathState({
  state,
  replacePathPrefix,
  isPathWithin,
  onRemapOfficialWorkflowPathState,
  onClearCurrentWorkflowDirtyState,
  onSaveCustomOrder,
  onUpdateRecentWorkflowPath,
  onRemoveRecentWorkflowTree,
}) {
  function remap(oldPath, newPath) {
    if (!oldPath || !newPath || oldPath === newPath) {
      return;
    }

    if (state.selectedPath) {
      state.selectedPath = replacePathPrefix(state.selectedPath, oldPath, newPath);
    }
    if (state.editingPath) {
      state.editingPath = replacePathPrefix(state.editingPath, oldPath, newPath);
    }
    onRemapOfficialWorkflowPathState(oldPath, newPath);

    state.expanded = new Set([...state.expanded].map((path) => replacePathPrefix(path, oldPath, newPath)));

    const nextOrder = {};
    for (const [parent, order] of Object.entries(state.customOrder || {})) {
      const nextParent = replacePathPrefix(parent, oldPath, newPath);
      nextOrder[nextParent] = Array.isArray(order)
        ? order.map((path) => replacePathPrefix(path, oldPath, newPath))
        : order;
    }
    state.customOrder = nextOrder;
    onSaveCustomOrder();
    onUpdateRecentWorkflowPath(oldPath, newPath);
  }

  function remove(path) {
    if (!path) {
      return;
    }
    if (isPathWithin(state.selectedPath, path)) {
      state.selectedPath = "";
      onClearCurrentWorkflowDirtyState();
    }
    if (isPathWithin(state.editingPath, path)) {
      state.editingPath = "";
      state.editingSurface = "";
    }
    state.expanded = new Set(
      [...state.expanded].filter((entry) => !isPathWithin(entry, path)),
    );
    const nextOrder = {};
    for (const [parent, order] of Object.entries(state.customOrder || {})) {
      if (isPathWithin(parent, path)) {
        continue;
      }
      nextOrder[parent] = Array.isArray(order)
        ? order.filter((entry) => !isPathWithin(entry, path))
        : order;
    }
    state.customOrder = nextOrder;
    onSaveCustomOrder();
    onRemoveRecentWorkflowTree(path);
  }

  return { remap, remove };
}
