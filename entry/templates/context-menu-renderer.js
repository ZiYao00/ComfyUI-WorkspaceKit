// Presentation-only template context menu. The entry owns template state,
// persistence, clipboard, canvas placement, and error rendering. Keep menu
// cleanup here aligned with the legacy window/document listener contract: a
// render must replace a prior menu without clearing the newly stored context.
export function renderTemplateContextMenu({
  document,
  window,
  state,
  t,
  el,
  closeMenu,
  onError,
  onRename,
  onPlaceCenter,
  onCopyName,
  onDelete,
  schedule = setTimeout,
}) {
  if (state.contextMenuCloseHandler) {
    window.removeEventListener("pointerdown", state.contextMenuCloseHandler, true);
    document.removeEventListener("pointerdown", state.contextMenuCloseHandler, true);
    window.removeEventListener("keydown", state.contextMenuCloseHandler, true);
    state.contextMenuCloseHandler = null;
  }
  state.contextMenuElement?.remove();
  state.contextMenuElement = null;
  const context = state.contextMenu;
  if (!context) return;

  const { template, x, y } = context;
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("contextmenu", (event) => event.preventDefault());

  const addItem = (label, onClick) => {
    const button = document.createElement("button");
    button.className = "workspace2-menu-item";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async () => {
      closeMenu();
      try {
        await onClick();
      } catch (error) {
        onError(error);
      }
    });
    menu.append(button);
  };

  addItem(t("templates.rename"), () => onRename(template));
  addItem(t("templates.placeCenter"), () => onPlaceCenter(template));
  addItem(t("templates.copyName"), () => onCopyName(template));
  addItem(t("templates.delete"), () => onDelete(template));

  document.body.append(menu);
  state.contextMenuElement = menu;

  const closeHandler = (event) => {
    if (event.type === "keydown" && event.key !== "Escape") return;
    if (menu.contains(event.target)) return;
    closeMenu();
  };
  state.contextMenuCloseHandler = closeHandler;
  schedule(() => {
    if (state.contextMenuCloseHandler !== closeHandler) return;
    window.addEventListener("pointerdown", closeHandler, true);
    document.addEventListener("pointerdown", closeHandler, true);
    window.addEventListener("keydown", closeHandler, true);
  }, 0);
}
