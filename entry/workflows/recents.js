/**
 * Persisted "Open" workflow history.
 *
 * Keep this data-only module separate from the Workflows panel renderer.  The
 * panel is rebuilt after rename, move, delete, and restore operations, while
 * the history must be updated immediately from the same successful operation.
 * Importantly, this module never triggers a directory scan or an official
 * ComfyUI workflow-store synchronization; doing so here previously made simple
 * actions feel slow and could interrupt inline UI interactions.
 */
export function createWorkflowRecentStore({
  recentKey,
  recentLimitKey,
  getItems,
  getDisplayName,
  replacePathPrefix,
  isPathWithin,
  onLimitChanged,
}) {
  function snapLimit(value) {
    const normalized = Math.max(2, Math.min(20, Math.round(Number(value) || 5)));
    return Math.abs(normalized - 5) <= 1 ? 5 : normalized;
  }

  function limit() {
    return snapLimit(localStorage.getItem(recentLimitKey) || "5");
  }

  function read() {
    try {
      const parsed = JSON.parse(localStorage.getItem(recentKey) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((item) => ({
          path: String(item?.path || ""),
          name: String(item?.name || ""),
          openedAt: Number(item?.openedAt || 0),
        }))
        .filter((item) => item.path);
    } catch {
      return [];
    }
  }

  function write(items) {
    localStorage.setItem(recentKey, JSON.stringify(items.slice(0, limit())));
  }

  function setLimit(value) {
    const nextLimit = snapLimit(value);
    localStorage.setItem(recentLimitKey, String(nextLimit));
    write(read().slice(0, nextLimit));
    onLimitChanged?.();
  }

  function record(path) {
    const normalizedPath = String(path || "");
    if (!normalizedPath) return;
    const item = getItems().find((entry) => entry.path === normalizedPath);
    const name = item ? getDisplayName(item) : normalizedPath.split(/[\\/]/).pop() || normalizedPath;
    const recent = read();
    const existingIndex = recent.findIndex((entry) => entry.path === normalizedPath);
    if (existingIndex >= 0) {
      recent[existingIndex] = { ...recent[existingIndex], name, openedAt: Date.now() };
      write(recent);
      return;
    }
    write([{ path: normalizedPath, name, openedAt: Date.now() }, ...recent]);
  }

  function updatePath(oldPath, newPath) {
    const normalizedOld = String(oldPath || "");
    const normalizedNew = String(newPath || "");
    if (!normalizedOld || !normalizedNew || normalizedOld === normalizedNew) return;
    const existing = getItems().find((entry) => entry.path === normalizedNew);
    const fallbackName = normalizedNew.split(/[\\/]/).pop() || normalizedNew;
    const seen = new Set();
    const next = read().flatMap((entry) => {
      const path = replacePathPrefix(entry.path, normalizedOld, normalizedNew);
      if (!path || seen.has(path)) return [];
      seen.add(path);
      return [{
        ...entry,
        path,
        name: path === normalizedNew ? (existing ? getDisplayName(existing) : fallbackName) : entry.name,
      }];
    });
    write(next);
  }

  function remove(path) {
    const normalizedPath = String(path || "");
    if (normalizedPath) write(read().filter((entry) => entry.path !== normalizedPath));
  }

  function removeTree(path) {
    const normalizedPath = String(path || "");
    if (normalizedPath) write(read().filter((entry) => !isPathWithin(entry.path, normalizedPath)));
  }

  return { snapLimit, limit, read, write, setLimit, record, updatePath, remove, removeTree };
}
