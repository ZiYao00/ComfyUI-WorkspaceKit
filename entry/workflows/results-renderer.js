// Workflow Browse result refresh is intentionally separate from workflow
// operations. This module only owns the mounted-tree lifecycle: empty state,
// query redraw, scroll retention, and debounce. It must not open, save,
// rename, move, or synchronize official workflows; those actions remain in
// entry.js so the verified dirty-state and rename guards keep their ordering.
export function createWorkflowResultsRenderer({
  state,
  renderPanel,
  closeContextMenu,
  buildTree,
  visibleChildren,
  renderNode,
  makeDropTarget,
  t,
  searchRenderDelay,
}) {
  function renderTreeBody(el, tree) {
    if (!tree.dataset.workspace2RootDropReady) {
      makeDropTarget(el, tree, "");
      tree.dataset.workspace2RootDropReady = "1";
    }
    const root = buildTree();
    const children = visibleChildren(root);
    if (!children.length) {
      const empty = document.createElement("div");
      empty.className = "workspace2-empty";
      empty.textContent = state.query ? t("empty.noMatches") : t("empty.noWorkflows");
      tree.append(empty);
      return;
    }
    for (const child of children) {
      renderNode(el, tree, child, 0);
    }
  }

  function refresh(el) {
    if (state.showTrash) {
      renderPanel(el);
      return;
    }
    const tree = el?.querySelector?.(".workspace2-tree");
    if (!tree) {
      renderPanel(el);
      return;
    }
    closeContextMenu();
    const query = state.query.trim();
    const scrollTop = query ? 0 : tree.scrollTop;
    tree.replaceChildren();
    renderTreeBody(el, tree);
    tree.scrollTop = scrollTop;
  }

  function scheduleRefresh(el) {
    if (state.resultsRefreshTimer) {
      clearTimeout(state.resultsRefreshTimer);
    }
    state.resultsRefreshTimer = window.setTimeout(() => {
      state.resultsRefreshTimer = null;
      refresh(el);
    }, searchRenderDelay);
  }

  return {
    renderTreeBody,
    refresh,
    scheduleRefresh,
  };
}
