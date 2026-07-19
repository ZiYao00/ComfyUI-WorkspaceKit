// Nodes-library data normalization only. This module deliberately does not
// fetch `/object_info`, open IndexedDB, register timers, or call the official
// ComfyUI Store: those behaviors stay in entry.js while their timing remains
// under regression validation.
//
// Keep the factory side-effect free. Earlier entry.js splits showed that an
// import-time failure can hide the entire sidebar, so callers inject the
// existing default-group id and translation function.
export function createNodeLibraryNormalizer({ defaultGroupId, t, now = () => Date.now() }) {
  const emptyNodeLibrary = () => ({
    version: 2,
    groups: [
      {
        id: defaultGroupId,
        name: t("nodes.defaultGroup"),
        order: 0,
        collapsed: false,
      },
    ],
    favorites: [],
    settings: {
      searchMode: "basic",
      enablePinyinSearch: false,
      enableFuzzySearch: false,
      sortMode: "manual",
      showOriginalCategory: true,
      showNodeType: true,
    },
    migration: {
      nSidebarImported: false,
      nSidebarImportedAt: 0,
    },
  });

  const normalizeNodeLibrary = (library) => {
    const fallback = emptyNodeLibrary();
    if (!library || typeof library !== "object") {
      return fallback;
    }
    const groups = (Array.isArray(library.groups) && library.groups.length ? library.groups : fallback.groups)
      .map((group, index) => ({
        id: String(group.id || `group-${index}`),
        name: String(group.name || group.id || `Group ${index + 1}`),
        parentId: String(group.parentId || ""),
        order: Number(group.order ?? index),
        collapsed: Boolean(group.collapsed),
        icon: String(group.icon || ""),
        color: String(group.color || ""),
      }));
    if (!groups.some((group) => group.id === defaultGroupId)) {
      groups.unshift(fallback.groups[0]);
    }
    const groupIds = new Set(groups.map((group) => group.id));
    for (const group of groups) {
      if (group.id === defaultGroupId || !groupIds.has(group.parentId) || group.parentId === group.id) {
        group.parentId = "";
      }
    }
    const favorites = Array.isArray(library.favorites)
      ? library.favorites
          .filter((favorite) => favorite?.type)
          .map((favorite, index) => ({
            type: String(favorite.type),
            title: String(favorite.title || favorite.type),
            alias: String(favorite.alias || ""),
            groupId: groupIds.has(favorite.groupId) ? favorite.groupId : defaultGroupId,
            order: Number(favorite.order ?? index),
            rating: Number(favorite.rating || 0),
            useCount: Number(favorite.useCount || 0),
            lastUsed: Number(favorite.lastUsed || 0),
            addedAt: Number(favorite.addedAt || now()),
            invalid: Boolean(favorite.invalid),
            source: String(favorite.source || "manual"),
          }))
      : [];
    return {
      ...fallback,
      ...library,
      groups,
      favorites,
      settings: { ...fallback.settings, ...(library.settings || {}) },
      migration: { ...fallback.migration, ...(library.migration || {}) },
    };
  };

  const normalizeServerObjectInfoCache = (serverCacheData) => {
    const cache = serverCacheData?.cache;
    if (!cache?.object_info || typeof cache.object_info !== "object" || Array.isArray(cache.object_info)) {
      return null;
    }
    return {
      objectInfo: cache.object_info,
      signature: String(cache.signature || ""),
      updatedAt: Number(cache.updated_at || 0),
    };
  };

  return { emptyNodeLibrary, normalizeNodeLibrary, normalizeServerObjectInfoCache };
}
