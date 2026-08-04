// Read-only evidence helper for localized node titles. It deliberately accepts
// known containers instead of walking the Vue/Pinia object graph, because this
// probe must not turn undocumented frontend internals into a production API.
function recordForType(container, type) {
  if (container instanceof Map) {
    return container.get(type) || null;
  }
  if (container && typeof container === "object") {
    return container[type] || null;
  }
  return null;
}

function collectRecordTitles(candidates, source, record) {
  if (!record || (typeof record !== "object" && typeof record !== "function")) {
    return;
  }
  for (const [path, value] of [
    ["title", record.title],
    ["display_name", record.display_name],
    ["displayName", record.displayName],
    ["nodeData.title", record.nodeData?.title],
    ["nodeData.display_name", record.nodeData?.display_name],
    ["nodeData.displayName", record.nodeData?.displayName],
  ]) {
    const text = String(value || "").trim();
    if (text) candidates.push({ source: `${source}.${path}`, title: text });
  }
}

export function collectRuntimeNodeTitleProbe({
  type,
  rawDefinition = null,
  registeredNodeTypes = {},
  nodeDefinitionSources = [],
}) {
  const normalizedType = String(type || "").trim();
  const candidates = [];
  if (!normalizedType) {
    return { type: "", candidates };
  }

  collectRecordTitles(candidates, "object_info", rawDefinition);
  collectRecordTitles(candidates, "LiteGraph.registered_node_types", registeredNodeTypes?.[normalizedType]);
  for (const { source, container } of nodeDefinitionSources) {
    collectRecordTitles(candidates, source, recordForType(container, normalizedType));
  }

  const seen = new Set();
  return {
    type: normalizedType,
    candidates: candidates.filter((item) => {
      const key = `${item.source}\u0000${item.title}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}
