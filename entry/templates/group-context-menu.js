// Presentation-only Template group context menu. All mutations are callbacks.
export function openTemplateGroupContextMenu({
  document, window, state, t, el, event, group, closeMenu, closeOnEvent, onError,
  onNewSubfolder, onRename, onPersonalize, onResetStyle, onDelete,
}) {
  event.preventDefault();
  event.stopPropagation();
  closeMenu();
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  menu.addEventListener("pointerdown", (e) => e.stopPropagation());
  menu.addEventListener("click", (e) => e.stopPropagation());
  menu.addEventListener("contextmenu", (e) => e.preventDefault());
  const addItem = (label, action) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workspace2-menu-item";
    button.textContent = label;
    button.addEventListener("click", async (clickEvent) => {
      clickEvent.stopPropagation();
      closeMenu();
      try { await action(); } catch (error) { onError(error); }
    });
    menu.append(button);
  };
  addItem(t("menu.newSubfolder"), () => onNewSubfolder(el, group.id));
  addItem(t("templates.renameGroup"), () => onRename(el, group.id));
  addItem(t("folder.personalize"), () => onPersonalize(el, group, event));
  addItem(t("folder.resetStyle"), () => onResetStyle(el, group));
  addItem(t("templates.deleteGroup"), () => onDelete(el, group));
  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  menu.style.left = String(Math.max(8, Math.min(event.clientX, window.innerWidth - rect.width - 8))) + "px";
  menu.style.top = String(Math.max(8, Math.min(event.clientY, window.innerHeight - rect.height - 8)) + "px");
  state.contextMenuElement = menu;
  window.setTimeout(() => {
    document.addEventListener("pointerdown", closeOnEvent, { once: true, capture: true });
    document.addEventListener("keydown", closeOnEvent, { once: true, capture: true });
  }, 0);
}
