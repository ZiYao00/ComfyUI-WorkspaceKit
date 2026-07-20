// Owns only Workflows Browse tree interaction state: folder expansion and
// tree-scroll restoration. Shared set expansion policy is injected because
// Templates and Nodes use the same helper. No filesystem, sort, or Store API
// is reachable from this module.
export function createWorkflowTreeInteraction({
  state,
  renderPanel,
  requestAnimationFrame,
  setExpandedRecursive,
}) {
  function getTreeScrollTop(el) {
    return el.querySelector(".workspace2-tree")?.scrollTop || 0;
  }

  function restoreTreeScrollTop(el, scrollTop) {
    if (!Number.isFinite(scrollTop)) {
      return;
    }
    requestAnimationFrame(() => {
      const tree = el.querySelector(".workspace2-tree");
      if (tree) {
        tree.scrollTop = scrollTop;
      }
    });
  }

  function workflowFolderKeys(node) {
    const keys = [];
    if (!node || node.type !== "folder") {
      return keys;
    }
    if (node.path) {
      keys.push(node.path);
    }
    for (const child of node.children || []) {
      keys.push(...workflowFolderKeys(child));
    }
    return keys;
  }

  function toggleWorkflowFolder(el, node, recursive = false) {
    if (!node || node.type !== "folder") {
      return;
    }
    const isOpen = state.expanded.has(node.path);
    if (recursive) {
      setExpandedRecursive(state.expanded, workflowFolderKeys(node), !isOpen);
    } else if (isOpen) {
      state.expanded.delete(node.path);
    } else {
      state.expanded.add(node.path);
    }
    renderPanel(el);
  }

  return {
    getTreeScrollTop,
    restoreTreeScrollTop,
    workflowFolderKeys,
    toggleWorkflowFolder,
  };
}
