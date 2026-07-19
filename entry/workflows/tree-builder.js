// Builds the Browse hierarchy from the current item collection. This is pure
// data shaping and ordering: it does not query the filesystem, render DOM, or
// mutate expansion state. Preserve the custom-order and folder-first rules so
// a renderer refresh cannot change the user's deliberate drag order.
export function createWorkflowTreeBuilder({ state, parentPath }) {
  function compareItems(a, b, parent = "") {
    const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    const updatedA = Number(a.updated_at || 0);
    const updatedB = Number(b.updated_at || 0);
    if (state.customOrderEnabled) {
      const order = Array.isArray(state.customOrder?.[parent]) ? state.customOrder[parent] : [];
      const indexA = order.indexOf(a.path);
      const indexB = order.indexOf(b.path);
      if (indexA !== -1 || indexB !== -1) {
        if (indexA === -1) {
          return 1;
        }
        if (indexB === -1) {
          return -1;
        }
        return indexA - indexB;
      }
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
    }
    if (state.sort === "nameDesc") {
      return -nameCompare;
    }
    if (state.sort === "updatedDesc") {
      return (updatedB - updatedA) || nameCompare;
    }
    if (state.sort === "updatedAsc") {
      return (updatedA - updatedB) || nameCompare;
    }
    return nameCompare;
  }

  function sortTree(node) {
    node.children.sort((a, b) => {
      if (state.folderFirst && a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      if (state.customOrderEnabled) {
        return compareItems(a, b, node.path || "");
      }
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return compareItems(a, b);
    });
    for (const child of node.children) {
      if (child.type === "folder") {
        sortTree(child);
      }
    }
  }

  function build() {
    const root = {
      type: "folder",
      name: "Root",
      path: "",
      children: [],
    };
    const folders = new Map([["", root]]);

    for (const item of state.items) {
      if (item.type !== "folder") {
        continue;
      }
      folders.set(item.path, { ...item, children: [] });
    }

    const sortedFolders = [...folders.values()]
      .filter((item) => item.path)
      .sort((a, b) => a.path.localeCompare(b.path));

    for (const folder of sortedFolders) {
      const parent = folders.get(parentPath(folder.path)) || root;
      parent.children.push(folder);
    }

    for (const item of state.items) {
      if (item.type !== "file") {
        continue;
      }
      const parent = folders.get(parentPath(item.path)) || root;
      parent.children.push({ ...item, children: [] });
    }

    sortTree(root);
    return root;
  }

  return { build, sortTree, compareItems };
}
