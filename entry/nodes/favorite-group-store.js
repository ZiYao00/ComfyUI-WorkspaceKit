// Local favorite-group data rules. This module owns group lookup, unique-name
// calculation, parent/child validation, and the data mutations for creating,
// deleting, and moving groups. It intentionally does not persist, render,
// change expansion/editor state, or attach drag/drop UI; entry.js keeps those
// lifecycle responsibilities and saves only after a returned mutation.
export function createNodeFavoriteGroupStore({
  state,
  defaultGroupId,
  now = () => Date.now(),
}) {
  const groups = () => Array.isArray(state.library?.groups) ? state.library.groups : [];
  const favorites = () => Array.isArray(state.library?.favorites) ? state.library.favorites : [];

  const getNodeGroup = (groupId) => groups().find((group) => group.id === groupId) || null;

  const uniqueNodeGroupName = (baseName) => {
    const existing = new Set(groups().map((group) => String(group.name || "").toLowerCase()));
    let name = baseName;
    let index = 2;
    while (existing.has(name.toLowerCase())) {
      name = `${baseName} ${index}`;
      index += 1;
    }
    return name;
  };

  const isNodeGroupDescendant = (groupId, possibleAncestorId) => {
    let current = getNodeGroup(groupId);
    const visited = new Set();
    while (current?.parentId) {
      if (current.parentId === possibleAncestorId) {
        return true;
      }
      if (visited.has(current.parentId)) {
        return false;
      }
      visited.add(current.parentId);
      current = getNodeGroup(current.parentId);
    }
    return false;
  };

  const createNodeGroup = (name, parentId = "") => {
    if (!state.library) {
      return null;
    }
    const normalizedParentId = parentId && parentId !== defaultGroupId ? String(parentId) : "";
    const group = {
      id: `group-${now().toString(36)}`,
      name,
      parentId: normalizedParentId,
      order: groups().length,
      collapsed: false,
    };
    state.library.groups.push(group);
    return group;
  };

  const deleteNodeGroup = (groupId) => {
    if (!state.library || groupId === defaultGroupId || !getNodeGroup(groupId)) {
      return false;
    }
    for (const favorite of favorites()) {
      if (favorite.groupId === groupId) {
        favorite.groupId = defaultGroupId;
      }
    }
    state.library.groups = groups().filter((group) => group.id !== groupId);
    return true;
  };

  const moveNodeGroupToParent = (groupId, targetParentId = "") => {
    const group = getNodeGroup(groupId);
    if (!group || group.id === defaultGroupId) {
      return null;
    }
    const normalizedParentId = targetParentId && targetParentId !== defaultGroupId ? String(targetParentId) : "";
    if (normalizedParentId === group.id || isNodeGroupDescendant(normalizedParentId, group.id)) {
      return null;
    }
    if (group.parentId === normalizedParentId) {
      return null;
    }
    group.parentId = normalizedParentId;
    const siblings = groups()
      .filter((item) => item.id !== group.id && item.id !== defaultGroupId && (item.parentId || "") === normalizedParentId)
      .sort((a, b) => a.order - b.order);
    group.order = siblings.length ? Math.max(...siblings.map((item) => Number(item.order) || 0)) + 1 : 0;
    return group;
  };

  return {
    getNodeGroup,
    uniqueNodeGroupName,
    isNodeGroupDescendant,
    createNodeGroup,
    deleteNodeGroup,
    moveNodeGroupToParent,
  };
}
