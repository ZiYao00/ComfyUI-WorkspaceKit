// Browse-row context-menu rendering is presentation-only. The injected
// callbacks retain ownership of file operations and official workflow state in
// entry.js. In particular, do not move rename or trash behavior here: those
// paths contain regression guards verified against the ComfyUI workflow Store.
export function createWorkflowContextMenuRenderer({
  state,
  t,
  closeContextMenu,
  handleError,
  onNewSubfolder,
  onPersonalizeFolder,
  onResetFolderStyle,
  onOpenWorkflow,
  onRename,
  onMoveToRoot,
  onMoveToTrash,
}) {
  function render(el, panel) {
    state.contextMenuElement?.remove();
    state.contextMenuElement = null;
    if (!state.contextMenu || !panel) {
      return;
    }

    const { item, x, y } = state.contextMenu;
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
        closeContextMenu();
        try {
          await onClick();
        } catch (error) {
          handleError(el, error);
        }
      });
      menu.append(button);
    };

    if (item.type === "folder") {
      addItem(t("menu.newSubfolder"), () => onNewSubfolder(el, item));
      addItem(t("folder.personalize"), () => onPersonalizeFolder(el, item, { clientX: x, clientY: y }));
      addItem(t("folder.resetStyle"), () => onResetFolderStyle(el, item));
    } else {
      addItem(t("menu.open"), () => onOpenWorkflow(item.path));
    }
    addItem(t("menu.rename"), () => onRename(el, item));
    addItem(t("menu.moveToRoot"), () => onMoveToRoot(el, item));
    addItem(t("menu.moveToTrash"), () => onMoveToTrash(el, item));

    panel.append(menu);
    state.contextMenuElement = menu;
  }

  return { render };
}
