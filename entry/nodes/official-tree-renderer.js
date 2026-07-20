// Renders the already-projected official Nodes category tree. It owns only
// category-folder header DOM and recursive placement. Node rows, expand-state
// mutation, translations, icon decoration, and all node interactions stay
// injected from entry.js. This prevents a renderer extraction from registering
// global listeners or taking ownership of sidebar lifecycle behavior.
export function createOfficialNodeTreeRenderer({
  document,
  getQuery,
  isFolderExpanded,
  translate,
  renderNodeRow,
  toggleFolder,
  applyDecoratedIcon,
  folderIconClass,
  folderOpenIconClass,
}) {
  const renderOfficialNodeTree = (el, section, tree, favoriteTypes, depth = 0) => {
    for (const child of tree.children || []) {
      if (child.type === "node") {
        section.append(renderNodeRow(el, child.node, favoriteTypes.has(child.node.type), depth, tree.key));
      } else {
        renderOfficialNodeFolder(el, section, child, favoriteTypes, depth);
      }
    }
  };

  const renderOfficialNodeFolder = (el, section, folder, favoriteTypes, depth) => {
    const query = getQuery().trim();
    const groupOpen = isFolderExpanded(folder.key) || Boolean(query);
    const categoryHeader = document.createElement("div");
    categoryHeader.className = "workspace2-node-folder-header";
    categoryHeader.style.paddingLeft = `${8 + depth * 24}px`;
    categoryHeader.addEventListener("click", (event) => {
      if (event.target.closest("button,input")) return;
      event.stopPropagation();
      toggleFolder(el, folder, event.ctrlKey || event.metaKey);
    });

    const disclosure = document.createElement("button");
    disclosure.className = `workspace2-disclosure ${groupOpen ? "is-open" : ""}`;
    disclosure.type = "button";
    disclosure.title = groupOpen ? translate("folder.collapse") : translate("folder.expand");
    disclosure.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFolder(el, folder, event.ctrlKey || event.metaKey);
    });

    const icon = document.createElement("span");
    applyDecoratedIcon(icon, "", "", groupOpen ? folderOpenIconClass : folderIconClass);
    const name = document.createElement("div");
    name.className = "workspace2-name";
    name.textContent = folder.label;
    const meta = document.createElement("div");
    meta.className = "workspace2-meta";
    meta.textContent = String(folder.totalLeaves);
    categoryHeader.append(disclosure, icon, name, meta);
    section.append(categoryHeader);

    if (groupOpen) {
      renderOfficialNodeTree(el, section, folder, favoriteTypes, depth + 1);
    }
  };

  return { renderOfficialNodeTree };
}
