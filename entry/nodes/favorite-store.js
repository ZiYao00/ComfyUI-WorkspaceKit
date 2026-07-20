// Local favorite-node data mutations. This module owns favorite lookup,
// insertion, removal, ordering, aliases, and cross-group moves only. It does
// not render rows, attach drag listeners, show dialogs, call server APIs, or
// inspect official ComfyUI favorites; the composition root keeps those flows
// and persists after a successful mutation.
//
// Keep mutations synchronous and explicit. The caller can preserve the prior
// save/render order by awaiting its existing persistence callback exactly once
// when a method returns true.
export function createNodeFavoriteStore({
  state,
  defaultGroupId,
  now = () => Date.now(),
}) {
  const favorites = () => Array.isArray(state.library?.favorites) ? state.library.favorites : [];

  const getFavorite = (type) => favorites().find((favorite) => favorite.type === type) || null;

  const normalizeFavoriteOrders = (groupId) => {
    favorites()
      .filter((favorite) => favorite.groupId === groupId)
      .sort((a, b) => a.order - b.order)
      .forEach((favorite, index) => {
        favorite.order = index;
      });
  };

  const insertFavoriteAt = (favorite, groupId, beforeType = "") => {
    const targetItems = favorites()
      .filter((item) => item.groupId === groupId && item.type !== favorite.type)
      .sort((a, b) => a.order - b.order);
    const beforeIndex = beforeType ? targetItems.findIndex((item) => item.type === beforeType) : -1;
    const insertIndex = beforeIndex >= 0 ? beforeIndex : targetItems.length;
    targetItems.splice(insertIndex, 0, favorite);
    targetItems.forEach((item, index) => {
      item.order = index;
    });
  };

  const moveFavoriteToGroup = (type, targetGroupId, beforeType = "") => {
    const favorite = getFavorite(type);
    if (!favorite) {
      return false;
    }
    const sourceGroupId = favorite.groupId;
    if (sourceGroupId === targetGroupId && beforeType === type) {
      return false;
    }
    favorite.groupId = targetGroupId;
    normalizeFavoriteOrders(sourceGroupId);
    insertFavoriteAt(favorite, targetGroupId, beforeType);
    return true;
  };

  const addFavoriteNode = (node, groupId = defaultGroupId, beforeType = "") => {
    if (!state.library || !node?.type) {
      return false;
    }
    if (getFavorite(node.type)) {
      return moveFavoriteToGroup(node.type, groupId, beforeType);
    }
    const favorite = {
      type: node.type,
      title: node.title || node.type,
      alias: "",
      groupId,
      order: 0,
      rating: 0,
      useCount: 0,
      lastUsed: 0,
      addedAt: now(),
      invalid: false,
      source: "manual",
    };
    state.library.favorites.push(favorite);
    insertFavoriteAt(favorite, groupId, beforeType);
    return true;
  };

  const removeFavoriteNode = (type) => {
    if (!state.library) {
      return false;
    }
    const previousLength = favorites().length;
    state.library.favorites = favorites().filter((favorite) => favorite.type !== type);
    return state.library.favorites.length !== previousLength;
  };

  const setFavoriteAlias = (type, alias) => {
    const favorite = getFavorite(type);
    if (!favorite) {
      return false;
    }
    const nextAlias = String(alias || "").trim();
    if (favorite.alias === nextAlias) {
      return false;
    }
    favorite.alias = nextAlias;
    return true;
  };

  return {
    getFavorite,
    normalizeFavoriteOrders,
    addFavoriteNode,
    removeFavoriteNode,
    setFavoriteAlias,
    moveFavoriteToGroup,
  };
}
