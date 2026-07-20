// Owns only folder icon/color metadata storage. Workflow file mutations,
// official Store synchronization, and the personalization dialog stay in
// entry.js. Keeping the render callback injected preserves the existing
// successful-save refresh order without giving this module panel ownership.
export function createWorkflowFolderMetaService({
  state,
  normalizePath,
  postJson,
  renderPanel,
}) {
  function get(path) {
    return state.folderMeta?.[normalizePath(path)] || {};
  }

  async function save(el, path, patch) {
    const key = normalizePath(path);
    const nextMeta = { ...(state.folderMeta || {}) };
    const nextValue = { ...(nextMeta[key] || {}), ...patch };
    for (const field of ["icon", "color"]) {
      if (!String(nextValue[field] || "").trim()) {
        delete nextValue[field];
      }
    }
    if (nextValue.icon || nextValue.color) {
      nextMeta[key] = nextValue;
    } else {
      delete nextMeta[key];
    }

    const data = await postJson("/workspace2/folder-meta", { folder_meta: nextMeta });
    state.folderMeta = data.folder_meta || nextMeta;
    renderPanel(el);
  }

  async function reset(el, item) {
    await save(el, item.path, { icon: "", color: "" });
  }

  return { get, save, reset };
}
