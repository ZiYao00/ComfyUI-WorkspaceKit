// Pure workflow-path helpers extracted from entry.js.
//
// This module deliberately owns only string/path calculations. It must not
// read WorkspaceKit state, call workflow endpoints, or access ComfyUI's Store:
// callers decide when a calculated path can be committed to the filesystem.

export function parentPath(path) {
  const value = String(path || "");
  const index = value.lastIndexOf("/");
  return index === -1 ? "" : value.slice(0, index);
}

export function normalizeMetaPath(path) {
  return String(path || "").replace(/\\/g, "/");
}

export function replaceWorkflowPathPrefix(value, oldPath, newPath) {
  const text = String(value || "");
  if (!text || !oldPath || text === newPath) {
    return text;
  }
  if (text === oldPath) {
    return newPath;
  }
  return text.startsWith(`${oldPath}/`) ? `${newPath}${text.slice(oldPath.length)}` : text;
}

export function workflowPathIsWithin(path, parent) {
  const value = String(path || "");
  const prefix = String(parent || "");
  return Boolean(prefix) && (value === prefix || value.startsWith(`${prefix}/`));
}

export function joinPath(parent, name) {
  return parent ? `${parent}/${name}` : name;
}

export function workflowRenameTargetPath(item, newName) {
  const parent = parentPath(item.path);
  let name = String(newName || "").trim();
  if (item.type === "file" && !name.toLowerCase().endsWith(".json")) {
    name = `${name}.json`;
  }
  return joinPath(parent, name);
}

export function relativeWorkflowPathFromOfficial(path) {
  return String(path || "").replace(/^workflows\/+/, "");
}
