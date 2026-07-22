// Merges the durable server /object_info snapshot with browser-only node types.
//
// Some extensions (rgthree is a concrete example) register virtual nodes only
// through LiteGraph.registerNodeType(). Those types intentionally never appear
// in /object_info, so they must not be written into WorkspaceKit's persistent
// server cache. They do, however, need to be searchable and favoriteable in
// the current browser session. Official definitions always win on a duplicate
// type because they carry richer inputs, outputs, and provenance metadata.
export function mergeNodeDefinitionSources({
  objectInfo = {},
  registeredNodeTypes = {},
  wrapObjectInfoNode,
  wrapRegisteredNode,
}) {
  const officialEntries = Object.entries(objectInfo || {});
  const officialTypes = new Set(officialEntries.map(([type]) => type));
  const browserOnlyEntries = Object.entries(registeredNodeTypes || {})
    .filter(([type]) => !officialTypes.has(type));

  return [
    ...officialEntries.map(([type, definition]) => wrapObjectInfoNode(type, definition)),
    ...browserOnlyEntries.map(([type, definition]) => wrapRegisteredNode(type, definition)),
  ].sort((a, b) => a.title.localeCompare(b.title));
}
