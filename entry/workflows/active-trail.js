/**
 * Active-workflow trail for the Browse tree.
 *
 * Given the relative path of the workflow currently being edited, this returns
 * the set of ancestor folder paths leading to it. The Browse tree tints the file
 * itself and every folder on that trail, so a collapsed folder still shows that
 * the open workflow lives somewhere inside it.
 *
 * Pure on purpose: no DOM, no official-Store access, no state mutation. The
 * caller owns deciding *which* workflow is active.
 */

/**
 * @param {string} activePath Relative workflow path, e.g. "A/B/c.json".
 * @returns {{ filePath: string, folderPaths: ReadonlySet<string> }}
 */
export function createActiveWorkflowTrail(activePath) {
  const filePath = String(activePath || "").replace(/^\/+|\/+$/g, "");
  if (!filePath) {
    return Object.freeze({ filePath: "", folderPaths: Object.freeze(new Set()) });
  }

  const segments = filePath.split("/").filter(Boolean);
  const folderPaths = new Set();
  // The last segment is the workflow file itself, so it is not a folder on the
  // trail. Every prefix above it is.
  for (let count = 1; count < segments.length; count += 1) {
    folderPaths.add(segments.slice(0, count).join("/"));
  }

  return Object.freeze({
    filePath,
    folderPaths: Object.freeze(folderPaths),
  });
}

/**
 * Classifies one Browse row against the trail.
 *
 * @returns {"file"|"folder"|""} `"file"` for the open workflow itself,
 *   `"folder"` for a folder containing it, `""` for everything else.
 */
export function activeTrailRole(trail, nodePath, nodeType) {
  const path = String(nodePath || "");
  if (!path || !trail) return "";
  if (nodeType === "folder") {
    return trail.folderPaths?.has(path) ? "folder" : "";
  }
  return trail.filePath === path ? "file" : "";
}
