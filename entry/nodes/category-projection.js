// Produces the read-only Nodes panel category projection. It owns query
// matching/sorting orchestration, hidden-node exclusion, search limiting,
// source buckets, favorite type lookup, and visible-section recovery. The
// injected predicates keep ComfyUI-specific node classification in entry.js;
// this module never renders, persists settings, fetches, or mutates state.
export function createNodeCategoryProjection({
  nodeMatchesQuery,
  sortNodeSearchResults,
  isHiddenNode,
  isComfyCoreNode,
  isCustomNode,
  getDefaultVisibleSections,
  searchResultLimit,
}) {
  const projectNodeCategories = ({ allNodes, query, favorites, visibleSections }) => {
    const normalizedQuery = String(query || "").trim().toLowerCase();
    const matchingNodes = allNodes.filter((node) => nodeMatchesQuery(node, normalizedQuery));
    const filtered = normalizedQuery ? sortNodeSearchResults(matchingNodes, normalizedQuery) : matchingNodes;
    const favoriteTypes = new Set(favorites.map((favorite) => favorite.type));
    const visibleNodes = [];
    let visibleTotal = 0;
    for (const node of filtered) {
      if (isHiddenNode(node)) continue;
      visibleTotal += 1;
      if (normalizedQuery && visibleNodes.length >= searchResultLimit) continue;
      visibleNodes.push(node);
    }

    const comfyNodes = [];
    const extensionNodes = [];
    const unknownNodes = [];
    for (const node of normalizedQuery ? visibleNodes : filtered) {
      if (isHiddenNode(node)) continue;
      if (isComfyCoreNode(node)) {
        comfyNodes.push(node);
      } else if (isCustomNode(node)) {
        extensionNodes.push(node);
      } else {
        unknownNodes.push(node);
      }
    }

    const defaults = getDefaultVisibleSections();
    const resolvedVisibleSections = { ...defaults, ...(visibleSections || {}) };
    if (!Object.values(resolvedVisibleSections).some(Boolean)) {
      Object.assign(resolvedVisibleSections, defaults);
    }
    return {
      query: normalizedQuery,
      favoriteTypes,
      comfyNodes,
      extensionNodes,
      unknownNodes,
      visibleTotal,
      visibleSections: resolvedVisibleSections,
    };
  };

  return { projectNodeCategories };
}
