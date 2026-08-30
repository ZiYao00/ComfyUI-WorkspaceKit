export const WORKSPACE_MODULE_ID = Object.freeze({
  workflows: "workflows",
  nodes: "nodes",
  templates: "templates",
  layout: "workspacekit.layout",
  theme: "workspacekit.theme",
});

export const WORKSPACE_MODULE_VISIBILITY_KEY = Object.freeze({
  [WORKSPACE_MODULE_ID.workflows]: "workspace2.tabs.workflows.visible",
  [WORKSPACE_MODULE_ID.nodes]: "workspace2.tabs.nodes.visible",
  [WORKSPACE_MODULE_ID.templates]: "workspace2.tabs.templates.visible",
  [WORKSPACE_MODULE_ID.layout]: "workspace2.tabs.layout.visible",
  [WORKSPACE_MODULE_ID.theme]: "workspace2.tabs.theme.visible",
});

const DEFAULT_VISIBILITY = Object.freeze({
  [WORKSPACE_MODULE_ID.workflows]: true,
  [WORKSPACE_MODULE_ID.nodes]: true,
  [WORKSPACE_MODULE_ID.templates]: true,
  [WORKSPACE_MODULE_ID.layout]: true,
  [WORKSPACE_MODULE_ID.theme]: true,
});

// Theme is now part of the unified WorkspaceKit product line. Keep the sealed
// mechanism for future staged modules, but there are no sealed built-ins today.
const SEALED_MODULE_IDS = new Set();

export function isWorkspaceModuleSealed(moduleId) {
  return SEALED_MODULE_IDS.has(String(moduleId || ""));
}

export function isWorkspaceModuleVisible(moduleId, storage = globalThis.localStorage) {
  const id = String(moduleId || "");
  const key = WORKSPACE_MODULE_VISIBILITY_KEY[id];
  if (!key) return true;
  if (isWorkspaceModuleSealed(id)) return false;
  const stored = storage?.getItem?.(key);
  if (stored === null || stored === undefined) return DEFAULT_VISIBILITY[id] !== false;
  return stored !== "0";
}

export function setWorkspaceModuleVisible(moduleId, visible, storage = globalThis.localStorage) {
  const id = String(moduleId || "");
  const key = WORKSPACE_MODULE_VISIBILITY_KEY[id];
  if (!key) return false;
  if (isWorkspaceModuleSealed(id)) {
    storage?.setItem?.(key, "0");
    return false;
  }
  const next = visible !== false;
  storage?.setItem?.(key, next ? "1" : "0");
  return next;
}

export function visibleWorkspaceModuleIds(moduleIds, storage = globalThis.localStorage) {
  return moduleIds.filter((moduleId) => isWorkspaceModuleVisible(moduleId, storage));
}
