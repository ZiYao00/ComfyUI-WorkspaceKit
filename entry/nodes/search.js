// Node-specific search scoring. Builds cached searchable field lists for
// official nodes (type/title/alias/category/group + pinyin), scores them
// against a query using the shared generic primitives, and sorts node arrays
// by relevance with a usage-frequency tiebreak. Generic scoring primitives are
// imported from core/search-scoring.js; node-shaped helpers (camel-case split,
// group label, category parts, usage frequency) are injected by entry.js so
// this module never reaches into node state or the node library directly.
import {
  compactSearchFields,
  genericSearchScores,
  compareSearchScores,
} from "../core/search-scoring.js";

export function createNodeSearch({
  splitCamelCase,
  nodeGroupLabel,
  officialNodeCategoryParts,
  getNodeFrequencyByName,
}) {
  const nodeSearchFieldCache = new WeakMap();

  function officialNodeSearchFields(node, groupName = "") {
    let fieldsByGroup = nodeSearchFieldCache.get(node);
    if (!fieldsByGroup) {
      fieldsByGroup = new Map();
      nodeSearchFieldCache.set(node, fieldsByGroup);
    }
    const cacheKey = String(groupName || "");
    if (fieldsByGroup.has(cacheKey)) {
      return fieldsByGroup.get(cacheKey);
    }
    const aliases = Array.isArray(node?.searchAliases) ? node.searchAliases : [];
    const fields = compactSearchFields([
      node?.type,
      splitCamelCase(node?.type),
      node?.title,
      node?.alias,
      ...aliases,
    ], [
      node?.title,
      node?.alias,
      node?.category,
      nodeGroupLabel(node),
      ...officialNodeCategoryParts(node),
      groupName,
      ...aliases,
    ]);
    fieldsByGroup.set(cacheKey, fields);
    return fields;
  }

  function officialNodeSearchScores(node, query, groupName = "") {
    return genericSearchScores(officialNodeSearchFields(node, groupName), query, -getNodeFrequencyByName(node?.type));
  }

  function packNodeSearchScores(scores) {
    return scores.reduce((total, score, index) => total + score * Math.pow(1000, Math.max(0, 5 - index)), 0);
  }

  function compareNodeSearchResults(a, b, query, groupName = "") {
    const normalized = String(query || "").trim().toLocaleLowerCase();
    if (!normalized) {
      const freqDiff = getNodeFrequencyByName(b.type) - getNodeFrequencyByName(a.type);
      return freqDiff || a.title.localeCompare(b.title);
    }
    return compareSearchScores(
      officialNodeSearchScores(a, normalized, groupName),
      officialNodeSearchScores(b, normalized, groupName),
    ) || a.title.localeCompare(b.title);
  }

  function sortNodeSearchResults(nodes, query, groupName = "") {
    const normalized = String(query || "").trim().toLocaleLowerCase();
    if (!normalized) {
      return nodes.sort((a, b) => compareNodeSearchResults(a, b, ""));
    }
    return nodes.sort((a, b) => compareNodeSearchResults(a, b, normalized, groupName));
  }

  return {
    officialNodeSearchScores,
    packNodeSearchScores,
    compareNodeSearchResults,
    sortNodeSearchResults,
  };
}
