// Workflows Browse sorting menu. This module creates and disposes presentation
// DOM only. State writes, refresh, rerender, translation, and error handling
// are injected by entry.js so their verified ordering stays unchanged.
//
// It is called only after the user opens the sort menu. Do not register DOM
// listeners at module-load time: a callback binding error must never prevent
// WorkspaceKit's sidebar entry from registering.

export function closeWorkflowSortMenu({ state, windowRef = window, documentRef = document }) {
  if (state.sortMenuCloseHandler) {
    windowRef.removeEventListener("pointerdown", state.sortMenuCloseHandler, true);
    documentRef.removeEventListener("pointerdown", state.sortMenuCloseHandler, true);
    windowRef.removeEventListener("click", state.sortMenuCloseHandler, true);
    documentRef.removeEventListener("click", state.sortMenuCloseHandler, true);
    windowRef.removeEventListener("keydown", state.sortMenuCloseHandler, true);
    state.sortMenuCloseHandler = null;
  }
  state.sortMenuElement?.remove();
  state.sortMenuElement = null;
}

export function openWorkflowSortMenu(deps, el, anchor) {
  const {
    state, workflowSorts, t, sortKey, folderFirstKey, customOrderKey,
    renderPanel, refreshPanel, handleError, closeMenu,
    windowRef = window, documentRef = document, storageRef = localStorage,
  } = deps;
  closeMenu();
  const panel = anchor?.closest?.(".workspace2-panel") || el.querySelector(".workspace2-panel");
  if (!panel) return;

  const rect = anchor.getBoundingClientRect();
  const menu = documentRef.createElement("div");
  menu.className = "workspace2-context";
  menu.style.left = `${Math.max(8, Math.min(rect.left, windowRef.innerWidth - 180))}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());
  menu.addEventListener("contextmenu", (event) => event.preventDefault());

  for (const sort of workflowSorts) {
    const option = documentRef.createElement("button");
    option.className = `workspace2-menu-item${sort === state.sort ? " is-active" : ""}`;
    option.type = "button";
    option.textContent = t(`workflows.sort.${sort}`);
    option.addEventListener("click", () => {
      state.sort = sort;
      storageRef.setItem(sortKey, state.sort);
      closeMenu();
      renderPanel(el);
    });
    menu.append(option);
  }

  const divider = documentRef.createElement("div");
  divider.className = "workspace2-menu-divider";
  menu.append(divider);

  const folderFirst = documentRef.createElement("button");
  folderFirst.className = `workspace2-menu-item workspace2-menu-check-item${state.folderFirst ? " is-active" : ""}`;
  folderFirst.type = "button";
  folderFirst.textContent = t("workflows.folderFirst");
  folderFirst.addEventListener("click", () => {
    state.folderFirst = !state.folderFirst;
    storageRef.setItem(folderFirstKey, state.folderFirst ? "1" : "0");
    closeMenu();
    renderPanel(el);
  });
  menu.append(folderFirst);

  const custom = documentRef.createElement("button");
  custom.className = `workspace2-menu-item workspace2-menu-check-item${state.customOrderEnabled ? " is-active" : ""}`;
  custom.type = "button";
  custom.textContent = t("workflows.customOrder");
  custom.addEventListener("click", () => {
    state.customOrderEnabled = !state.customOrderEnabled;
    storageRef.setItem(customOrderKey, state.customOrderEnabled ? "1" : "0");
    closeMenu();
    renderPanel(el);
  });
  menu.append(custom);

  const refreshDivider = documentRef.createElement("div");
  refreshDivider.className = "workspace2-menu-divider";
  menu.append(refreshDivider);
  const refresh = documentRef.createElement("button");
  refresh.className = "workspace2-menu-item";
  refresh.type = "button";
  refresh.textContent = t("workflows.refresh");
  refresh.addEventListener("click", async () => {
    closeMenu();
    try {
      await refreshPanel(el);
    } catch (error) {
      handleError(el, error);
    }
  });
  menu.append(refresh);

  panel.append(menu);
  state.sortMenuElement = menu;
  state.sortMenuCloseHandler = (event) => {
    // A focused menu button is inside `menu`, so test Escape before the
    // inside-click guard. Otherwise a real keyboard Escape is ignored.
    if (event.type === "keydown") {
      if (event.key === "Escape") closeMenu();
      return;
    }
    if (menu.contains(event.target) || anchor.contains(event.target)) return;
    closeMenu();
  };
  windowRef.setTimeout(() => {
    windowRef.addEventListener("pointerdown", state.sortMenuCloseHandler, true);
    documentRef.addEventListener("pointerdown", state.sortMenuCloseHandler, true);
    windowRef.addEventListener("click", state.sortMenuCloseHandler, true);
    documentRef.addEventListener("click", state.sortMenuCloseHandler, true);
    windowRef.addEventListener("keydown", state.sortMenuCloseHandler, true);
  }, 0);
}
