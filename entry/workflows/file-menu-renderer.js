// Active-workflow File menu presentation only. Command execution, filesystem
// operations, active-workflow checks, and error reporting stay injected by
// entry.js so this small DOM module cannot duplicate workflow state.

export function closeWorkflowFileMenu({ state, windowRef = window, documentRef = document }) {
  if (state.fileMenuCloseHandler) {
    windowRef.removeEventListener("pointerdown", state.fileMenuCloseHandler, true);
    documentRef.removeEventListener("pointerdown", state.fileMenuCloseHandler, true);
    windowRef.removeEventListener("click", state.fileMenuCloseHandler, true);
    documentRef.removeEventListener("keydown", state.fileMenuCloseHandler, true);
    state.fileMenuCloseHandler = null;
  }
  state.fileMenuElement?.remove();
  state.fileMenuElement = null;
}

export function openWorkflowFileMenu({
  state, el, anchor, items, createIcon, handleError,
  closeMenu, windowRef = window, documentRef = document,
}) {
  closeMenu();
  const panel = anchor?.closest?.(".workspace2-panel") || el.querySelector(".workspace2-panel");
  if (!panel) return;

  const rect = anchor.getBoundingClientRect();
  const menu = documentRef.createElement("div");
  menu.className = "workspace2-context workspace2-workflow-file-menu";
  menu.style.left = `${Math.max(8, Math.min(rect.left, windowRef.innerWidth - 208))}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());
  menu.addEventListener("contextmenu", (event) => event.preventDefault());

  for (const item of items) {
    if (item.separator) {
      const divider = documentRef.createElement("div");
      divider.className = "workspace2-menu-divider";
      menu.append(divider);
      continue;
    }
    const button = documentRef.createElement("button");
    button.className = "workspace2-menu-item";
    button.type = "button";
    button.disabled = Boolean(item.disabled);
    const icon = createIcon(item.icon);
    icon.classList.add("workspace2-menu-item-icon");
    const label = documentRef.createElement("span");
    label.className = "workspace2-menu-item-label";
    label.textContent = item.label;
    button.append(icon, label);
    button.addEventListener("click", async () => {
      if (button.disabled) return;
      if (!item.keepOpen) closeMenu();
      try {
        await item.onClick(button);
      } catch (error) {
        handleError(el, error);
      }
    });
    menu.append(button);
  }

  panel.append(menu);
  state.fileMenuElement = menu;
  state.fileMenuCloseHandler = (event) => {
    if (event.type === "keydown") {
      if (event.key === "Escape") closeMenu();
      return;
    }
    if (menu.contains(event.target) || anchor.contains(event.target)) return;
    closeMenu();
  };
  windowRef.setTimeout(() => {
    windowRef.addEventListener("pointerdown", state.fileMenuCloseHandler, true);
    documentRef.addEventListener("pointerdown", state.fileMenuCloseHandler, true);
    windowRef.addEventListener("click", state.fileMenuCloseHandler, true);
    documentRef.addEventListener("keydown", state.fileMenuCloseHandler, true);
  }, 0);
}
