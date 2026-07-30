// Owns only Workflows Browse tree interaction state: folder expansion and
// tree-scroll restoration. Shared set expansion policy is injected because
// Templates and Nodes use the same helper. No filesystem, sort, or Store API
// is reachable from this module.
export function createWorkflowTreeInteraction({
  state,
  renderPanel,
  requestAnimationFrame,
  setExpandedRecursive,
  parentPath,
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

  // Sibling folders share the same parent path. Level-only: descendant
  // expansion state is untouched so collapsing one level does not lose the
  // expanded state of nested folders.
  function workflowSiblingKeys(node) {
    const parent = parentPath(node.path || "");
    return (state.items || [])
      .filter((item) => item.type === "folder" && item.path && parentPath(item.path) === parent)
      .map((item) => item.path);
  }

  function toggleWorkflowFolder(el, node, recursive = false) {
    if (!node || node.type !== "folder") {
      return;
    }
    const isOpen = state.expanded.has(node.path);
    if (recursive) {
      // Ctrl/Cmd-click collapses (or expands) every sibling at this level only.
      setExpandedRecursive(state.expanded, workflowSiblingKeys(node), !isOpen);
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
    workflowSiblingKeys,
    toggleWorkflowFolder,
  };
}
