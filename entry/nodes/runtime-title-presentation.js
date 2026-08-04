// Runtime title overlay for the current browser only. The raw /object_info
// title remains attached to every node and is kept searchable, so locale or
// translation-plugin output never contaminates the durable server snapshot.
function titleFromRuntimeRecord(record) {
  if (!record || (typeof record !== "object" && typeof record !== "function")) {
    return "";
  }
  for (const value of [
    record.title,
    record.display_name,
    record.displayName,
    record.nodeData?.title,
    record.nodeData?.display_name,
    record.nodeData?.displayName,
  ]) {
    const title = String(value || "").trim();
    if (title) return title;
  }
  return "";
}

export function runtimeNodeTitleFingerprint(registeredNodeTypes = {}) {
  return Object.keys(registeredNodeTypes || {})
    .sort()
    .map((type) => `${type}\u0000${titleFromRuntimeRecord(registeredNodeTypes[type])}`)
    .join("\u0001");
}

function uniqueText(values) {
  const seen = new Set();
  return values.filter((value) => {
    const text = String(value || "").trim();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}

export function applyRuntimeNodeTitlePresentation(nodes, registeredNodeTypes = {}, getAdditionalSearchAliases = null) {
  return nodes
    .map((node) => {
      const rawTitle = String(node.rawTitle || node.title || node.type || "").trim();
      const runtimeTitle = titleFromRuntimeRecord(registeredNodeTypes?.[node.type]);
      const title = runtimeTitle || rawTitle;
      return {
        ...node,
        rawTitle,
        title,
        // Search must remain bilingual even when the visible title has been
        // translated by the current browser's client or extension.
        searchAliases: uniqueText([
          ...(node.searchAliases || []),
          rawTitle,
          runtimeTitle,
          ...(typeof getAdditionalSearchAliases === "function" ? getAdditionalSearchAliases(node) : []),
        ]),
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title));
}
