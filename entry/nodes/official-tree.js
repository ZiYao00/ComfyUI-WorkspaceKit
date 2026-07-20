// Builds the read-only official Nodes category tree. This module owns only the
// tree projection: path insertion, leaf counts, and deterministic ordering.
// Category classification, translated labels, custom-order preferences, and
// every DOM/event concern remain injected by entry.js. Keeping those boundaries
// avoids repeating the earlier sidebar-entry regressions caused by moving a
// renderer or lifecycle listener together with otherwise pure data logic.
export function createOfficialNodeTreeBuilder({
  categoryPartsForNode,
  getUncategorizedLabel,
  getCategorySortRank,
  getCustomOrderEnabled,
  getCustomOrder,
  getSortMode,
}) {
  const createNodeTreeFolder = (key, label) => ({
    key,
    label,
    type: "folder",
    children: [],
    childMap: new Map(),
    totalLeaves: 0,
  });

  const nodeTreePartLabel = (part) => (
    typeof part === "object" && part ? String(part.label || part.key || "") : String(part || "")
  );

  const nodeTreePartKey = (part) => (
    typeof part === "object" && part ? String(part.key || part.label || "") : String(part || "")
  );

  const isUnknownNodeFolder = (child) => (
    child?.type === "folder" && String(child.label || "") === getUncategorizedLabel()
  );

  const finalizeOfficialNodeTree = (node) => {
    if (node.type === "node") {
      node.totalLeaves = 1;
      return 1;
    }
    node.totalLeaves = node.children.reduce((sum, child) => sum + finalizeOfficialNodeTree(child), 0);
    delete node.childMap;
    return node.totalLeaves;
  };

  const sortOfficialNodeTree = (node) => {
    if (node.type === "node" || !node.children) {
      return;
    }
    node.children.sort((a, b) => {
      const unknownA = isUnknownNodeFolder(a);
      const unknownB = isUnknownNodeFolder(b);
      if (unknownA !== unknownB) {
        return unknownA ? -1 : 1;
      }
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      const rankA = getCategorySortRank(a.label);
      const rankB = getCategorySortRank(b.label);
      if (rankA !== rankB) {
        return rankA - rankB;
      }
      if (getCustomOrderEnabled()) {
        const order = getCustomOrder(node.key);
        const orderKeyA = a.type === "node" ? a.node?.type : a.key;
        const orderKeyB = b.type === "node" ? b.node?.type : b.key;
        const indexA = order.indexOf(orderKeyA);
        const indexB = order.indexOf(orderKeyB);
        if (indexA !== -1 || indexB !== -1) {
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;
          return indexA - indexB;
        }
      }
      if (getSortMode() !== "alphabetical") {
        return 0;
      }
      return String(a.label || "").localeCompare(String(b.label || ""));
    });
    for (const child of node.children) {
      sortOfficialNodeTree(child);
    }
  };

  const buildOfficialNodeTree = (sectionId, nodes) => {
    const root = createNodeTreeFolder(sectionId, "");
    for (const node of nodes) {
      let current = root;
      for (const part of categoryPartsForNode(node)) {
        const partKey = nodeTreePartKey(part);
        const partLabel = nodeTreePartLabel(part);
        if (!partKey) continue;
        const folderKey = `${current.key}/${partKey}`;
        if (!current.childMap.has(partKey)) {
          const folder = createNodeTreeFolder(folderKey, partLabel);
          current.childMap.set(partKey, folder);
          current.children.push(folder);
        }
        current = current.childMap.get(partKey);
      }
      current.children.push({
        key: `${current.key}/${node.type}`,
        label: node.title || node.type,
        type: "node",
        node,
        totalLeaves: 1,
      });
    }
    finalizeOfficialNodeTree(root);
    sortOfficialNodeTree(root);
    return root;
  };

  return { buildOfficialNodeTree };
}
