// Canvas nodes expose their ComfyUI class inconsistently across frontend
// versions and third-party node implementations. Keep the fallback order in
// one testable place before using it for WorkspaceKit's context-menu actions.
export function resolveCanvasNodeDefinition(node, definitionMap) {
  if (!node || typeof definitionMap?.get !== "function") {
    return null;
  }

  const candidates = [
    node.comfyClass,
    node.constructor?.comfyClass,
    node.type,
    node.constructor?.type,
  ];

  for (const candidate of candidates) {
    const type = String(candidate || "").trim();
    const definition = type ? definitionMap.get(type) : null;
    if (definition) {
      return definition;
    }
  }
  return null;
}
