// Renders one ordinary official Nodes row. It owns only row DOM assembly and
// listener wiring. All behavior is injected: canvas dragging, preview/menu,
// selected-node state, custom ordering, favorite persistence, translations,
// and button creation remain entry.js responsibilities. Do not add global
// listeners or direct Nodes state mutations here; prior entry splits showed
// that such ownership leaks can prevent sidebar registration.
export function createNodeRowRenderer({
  document,
  isPendingNode,
  shouldSuppressClick,
  clearSuppressClick,
  makeCanvasDragSource,
  showPreview,
  movePreview,
  hidePreview,
  openContextMenu,
  setPendingNode,
  isCustomOrderEnabled,
  translate,
  beginReorderDrag,
  iconButton,
  addFavorite,
  removeFavorite,
}) {
  const renderNodeRow = (el, node, isFavorite, depth = 0, parentKey = "") => {
    const row = document.createElement("div");
    row.className = "workspace2-node-row";
    row.style.paddingLeft = `${8 + depth * 24}px`;
    row.dataset.workspace2NodeType = node.type;
    row.dataset.workspace2NodeParentKey = parentKey;
    if (isPendingNode(node)) {
      row.classList.add("is-selected");
    }
    row.title = node.type;
    makeCanvasDragSource(row, node);
    row.addEventListener("mouseenter", (event) => showPreview(node, event));
    row.addEventListener("mousemove", movePreview);
    row.addEventListener("mouseleave", hidePreview);
    row.addEventListener("contextmenu", (event) => {
      showPreview(node, event);
      openContextMenu(el, event, node);
    });
    row.addEventListener("click", (event) => {
      if (shouldSuppressClick()) {
        clearSuppressClick();
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.target.closest("button,input")) return;
      event.stopPropagation();
      showPreview(node, event);
      setPendingNode(node);
    });

    const reorderHandle = document.createElement("span");
    if (isCustomOrderEnabled()) {
      reorderHandle.className = "workspace2-reorder-handle";
      reorderHandle.title = translate("nodes.reorderHandle");
      beginReorderDrag(el, reorderHandle, row, {
        kind: "global",
        type: node.type,
        title: node.title,
        parentKey,
      });
    } else {
      reorderHandle.className = "workspace2-reorder-spacer";
    }

    const dot = document.createElement("span");
    dot.className = "workspace2-node-dot";
    const info = document.createElement("div");
    info.className = "workspace2-name";
    const name = document.createElement("div");
    name.className = "workspace2-name";
    name.textContent = node.title;
    info.append(name);

    const actions = document.createElement("div");
    actions.className = "workspace2-actions";
    const favoriteButton = iconButton(
      isFavorite ? "starFilled" : "star",
      isFavorite ? translate("nodes.removeFavorite") : translate("nodes.addFavorite"),
      async () => {
        if (isFavorite) {
          await removeFavorite(el, node.type);
        } else {
          await addFavorite(el, node);
        }
      },
    );
    if (isFavorite) {
      favoriteButton.classList.add("is-favorite-active");
    }
    actions.append(favoriteButton);
    row.append(reorderHandle, dot, info, actions);
    return row;
  };

  return { renderNodeRow };
}
