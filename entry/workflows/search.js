// Workflow Browse search is deliberately read-only. It turns a workflow tree
// node into searchable fields, keeps parent folders visible when a descendant
// matches, and filters only the children rendered by Browse. Do not place
// filesystem polling, official Store calls, or expansion mutations here:
// searching must stay safe while a rename, save, or background refresh runs.
export function createWorkflowSearch({
  state,
  getDisplayName,
  parentPath,
  compactSearchFields,
  splitCamelCase,
  genericSearchScores,
}) {
  function searchFields(node) {
    const displayName = getDisplayName(node);
    const pathText = String(node?.path || "");
    const parentText = parentPath(pathText);
    const pathParts = pathText.split("/").filter(Boolean);
    return compactSearchFields([
      displayName,
      node?.name,
      splitCamelCase(displayName),
      pathText,
      parentText,
      ...pathParts,
    ], [
      displayName,
      node?.name,
      pathText,
      parentText,
      ...pathParts,
    ]);
  }

  function matchesSelf(node, query) {
    return genericSearchScores(searchFields(node), query)[0] < 9;
  }

  function matchesQuery(node, query) {
    if (!query) {
      return true;
    }
    if (matchesSelf(node, query)) {
      return true;
    }
    return node.children?.some((child) => matchesQuery(child, query));
  }

  function visibleChildren(node) {
    const query = state.query.trim().toLowerCase();
    if (!query) {
      return node.children;
    }
    return node.children.filter((child) => matchesQuery(child, query));
  }

  return {
    searchFields,
    matchesSelf,
    matchesQuery,
    visibleChildren,
  };
}
