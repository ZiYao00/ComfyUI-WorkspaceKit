// Server-backed virtual favorites. This store owns membership only; file
// operations remain in entry.js and call remap/remove through path-state so a
// rename/move/trash cannot leave stale paths behind.
export function createWorkflowFavoriteStore({ fetchJson, postJson }) {
  let paths = new Set();

  function normalize(path) {
    return String(path || "").trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  }

  function replacePrefix(path, oldPath, newPath) {
    return path === oldPath ? newPath : path.startsWith(`${oldPath}/`) ? `${newPath}${path.slice(oldPath.length)}` : path;
  }

  function snapshot() {
    return [...paths].sort();
  }

  async function persist() {
    const data = await postJson("/workspace2/workflow-favorites", { favorites: snapshot() });
    paths = new Set(data.favorites || []);
    return snapshot();
  }

  async function load() {
    const data = await fetchJson("/workspace2/workflow-favorites");
    paths = new Set(data.favorites || []);
    return snapshot();
  }

  async function toggle(path) {
    const clean = normalize(path);
    if (!clean) return false;
    if (paths.has(clean)) paths.delete(clean);
    else paths.add(clean);
    await persist();
    return paths.has(clean);
  }

  function has(path) {
    return paths.has(normalize(path));
  }

  // These update local membership immediately so the next render cannot show
  // an obsolete favorite. Persistence is intentionally asynchronous because
  // file-operation success must not be rolled back by a transient UI request.
  function remap(oldPath, newPath) {
    const oldClean = normalize(oldPath);
    const newClean = normalize(newPath);
    if (!oldClean || !newClean || oldClean === newClean) return;
    paths = new Set(snapshot().map((path) => replacePrefix(path, oldClean, newClean)));
    void persist().catch((error) => console.warn("[WorkspaceKit] workflow favorite remap save failed", error));
  }

  function remove(path) {
    const clean = normalize(path);
    if (!clean) return;
    paths = new Set(snapshot().filter((entry) => entry !== clean && !entry.startsWith(`${clean}/`)));
    void persist().catch((error) => console.warn("[WorkspaceKit] workflow favorite removal save failed", error));
  }

  return { load, toggle, has, snapshot, remap, remove };
}
