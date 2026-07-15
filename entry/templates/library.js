/**
 * Templates library data layer.
 *
 * This module intentionally owns only normalized template-library data and
 * request coordination. Rendering and shortcut activation remain in entry.js.
 * Keeping that boundary prevents a repeat of the Alt+C regression: saving a
 * template may finish before the Templates sidebar is mounted, so the caller
 * must continue to control opening the panel and focusing its rename input.
 */

export function createTemplateLibraryStore({
  state,
  t,
  fetchJson,
  postJson,
  startPerformanceSpan,
  measurePromise,
  renderTemplatesPanel,
}) {
  function emptyTemplateLibrary() {
    return {
      version: 1,
      groups: [],
      templates: [],
      settings: {},
    };
  }

  function normalizeTemplateLibrary(library) {
    const fallback = emptyTemplateLibrary();
    if (!library || typeof library !== "object") {
      return fallback;
    }
    const groups = Array.isArray(library.groups)
      ? library.groups.map((group, index) => ({
          id: String(group.id || `group-${index}`),
          name: String(group.name || group.id || `Group ${index + 1}`),
          parentId: String(group.parentId || ""),
          order: Number(group.order ?? index),
          collapsed: Boolean(group.collapsed),
          icon: String(group.icon || ""),
          color: String(group.color || ""),
        }))
      : [];
    const groupIds = new Set(groups.map((group) => group.id));
    for (const group of groups) {
      if (group.parentId === group.id || !groupIds.has(group.parentId)) {
        group.parentId = "";
      }
    }
    const templates = Array.isArray(library.templates)
      ? library.templates
          .filter((template) => template?.id && template?.name)
          .map((template, index) => ({
            id: String(template.id),
            name: String(template.name),
            groupId: groupIds.has(template.groupId) ? String(template.groupId) : "",
            order: Number(template.order ?? index),
            nodes: Array.isArray(template.nodes) ? template.nodes : [],
            links: Array.isArray(template.links) ? template.links : [],
            bounds: template.bounds && typeof template.bounds === "object" ? template.bounds : {},
            createdAt: Number(template.createdAt || Date.now()),
            updatedAt: Number(template.updatedAt || Date.now()),
            useCount: Number(template.useCount || 0),
            lastUsed: Number(template.lastUsed || 0),
            source: String(template.source || "workspace2"),
          }))
      : [];
    return {
      ...fallback,
      ...library,
      groups,
      templates,
      settings: { ...fallback.settings, ...(library.settings || {}) },
    };
  }

  async function loadTemplateLibraryInternal() {
    const finish = startPerformanceSpan("templates.load");
    state.loading = true;
    state.error = "";
    try {
      const data = await measurePromise(
        "templates.library-request",
        () => fetchJson("/workspace2/templates/library"),
      );
      state.library = await measurePromise(
        "templates.library-normalize",
        () => Promise.resolve(normalizeTemplateLibrary(data.library)),
      );
      finish({ templateCount: state.library.templates.length });
    } catch (error) {
      state.error = error.message;
      state.library = emptyTemplateLibrary();
      finish({ error: state.error }, "error");
    } finally {
      state.loading = false;
    }
  }

  // One in-page request is shared by first render, Alt+C and idle prefetch.
  // Do not replace it with independent requests: duplicate fetch/normalization
  // was a contributor to the former slow Templates first-open path.
  function loadTemplateLibrary() {
    if (state.library) {
      return Promise.resolve(state.library);
    }
    if (!state.loadPromise) {
      state.loadPromise = loadTemplateLibraryInternal().finally(() => {
        state.loadPromise = null;
      });
    }
    return state.loadPromise;
  }

  function prefetchTemplateLibrary() {
    if (state.library || state.loadPromise) {
      return;
    }
    const load = () => loadTemplateLibrary().catch((error) => {
      console.debug("[Workspace2] Template prefetch failed", error);
    });
    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(load, { timeout: 1200 });
    } else {
      window.setTimeout(load, 0);
    }
  }

  async function saveTemplateLibrary(el) {
    const data = await postJson("/workspace2/templates/library", { library: state.library });
    state.library = normalizeTemplateLibrary(data.library);
    if (el?.isConnected) {
      renderTemplatesPanel(el);
    }
  }

  function uniqueTemplateGroupName(baseName = t("templates.defaultGroupName")) {
    const existing = new Set((state.library?.groups || []).map((group) => String(group.name || "").toLowerCase()));
    let name = baseName;
    let index = 2;
    while (existing.has(name.toLowerCase())) {
      name = `${baseName} ${index}`;
      index += 1;
    }
    return name;
  }

  function getTemplateGroup(groupId) {
    return (state.library?.groups || []).find((group) => group.id === groupId) || null;
  }

  function childTemplateGroups(parentId = "") {
    return [...(state.library?.groups || [])]
      .filter((group) => (group.parentId || "") === parentId)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }

  function templateGroupKeys(groupId) {
    const keys = [];
    const group = getTemplateGroup(groupId);
    if (!group) {
      return keys;
    }
    keys.push(group.id);
    for (const child of childTemplateGroups(group.id)) {
      keys.push(...templateGroupKeys(child.id));
    }
    return keys;
  }

  function isTemplateGroupDescendant(groupId, possibleAncestorId) {
    let current = getTemplateGroup(groupId);
    const visited = new Set();
    while (current?.parentId) {
      if (current.parentId === possibleAncestorId) {
        return true;
      }
      if (visited.has(current.parentId)) {
        return false;
      }
      visited.add(current.parentId);
      current = getTemplateGroup(current.parentId);
    }
    return false;
  }

  function normalizeTemplateOrders(groupId = "") {
    (state.library?.templates || [])
      .filter((template) => (template.groupId || "") === groupId)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .forEach((template, index) => {
        template.order = index;
      });
  }

  return {
    emptyTemplateLibrary,
    normalizeTemplateLibrary,
    loadTemplateLibrary,
    prefetchTemplateLibrary,
    saveTemplateLibrary,
    uniqueTemplateGroupName,
    getTemplateGroup,
    childTemplateGroups,
    templateGroupKeys,
    isTemplateGroupDescendant,
    normalizeTemplateOrders,
  };
}
