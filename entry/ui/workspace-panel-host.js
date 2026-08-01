/**
 * WorkspaceKit sidebar shell and stable module slots.
 *
 * This module owns only the tab strip and DOM allocation.  Module content stays
 * with its current owner (Workflows, Nodes, Templates, or a future registered
 * provider).  Keeping those boundaries here avoids repeating the old failure
 * mode where moving a visual wrapper also changed a panel's render lifecycle.
 */
export function createWorkspacePanelHost({
  document = globalThis.document,
  tabs,
  activeTabId,
  onActivate,
  settingsTitle,
  onOpenSettings,
  createSettingsIcon,
  providerLabel = (provider) => provider.title || provider.id,
  onActivateProvider,
  onPinProvider,
  overflowLabel = "Extensions",
}) {
  if (!document?.createElement) {
    throw new TypeError("A DOM document is required to create the WorkspaceKit panel host.");
  }
  const shell = document.createElement("div");
  shell.className = "workspace2-shell";

  const tabStrip = document.createElement("div");
  tabStrip.className = "workspace2-module-tabs";

  const tabButtons = new Map();
  // Overflow tabs render as `<button>` + a separate caret `<button>` inside a
  // wrapper. The caret opens a `workspace2-context` menu — the same primitive
  // the Workflows sort menu and the row context menus already use — so the
  // dropdown matches the rest of WorkspaceKit and inherits its z-index above
  // the frosted-glass shell. A single close handler is shared by every tab.
  let openMenu = null;
  let openMenuAnchor = null;

  const closeOverflowMenu = () => {
    if (!openMenu) return;
    openMenu.remove();
    openMenu = null;
    openMenuAnchor?.classList.remove("is-menu-open");
    openMenuAnchor = null;
  };

  // Registered once per host, not once per tab: re-registering per tab leaked a
  // handler on every panel re-render and the stale copies fought over the same
  // menu state.
  const onDocumentPointerDown = (event) => {
    if (!openMenu) return;
    if (openMenu.contains(event.target)) return;
    if (openMenuAnchor?.contains(event.target)) return;
    closeOverflowMenu();
  };
  const onDocumentKeyDown = (event) => {
    // Escape is checked before any containment guard: the focused element is
    // usually inside the menu, so an inside-first guard would swallow it.
    if (openMenu && event.key === "Escape") {
      event.preventDefault();
      closeOverflowMenu();
    }
  };
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  document.addEventListener("click", onDocumentPointerDown, true);
  document.addEventListener("keydown", onDocumentKeyDown, true);

  const openOverflowMenu = (anchor, currentProviderId, providers) => {
    closeOverflowMenu();
    const menu = document.createElement("div");
    menu.className = "workspace2-context workspace2-module-overflow-context";
    menu.addEventListener("pointerdown", (event) => event.stopPropagation());
    menu.addEventListener("click", (event) => event.stopPropagation());
    menu.addEventListener("contextmenu", (event) => event.preventDefault());

    providers.forEach((provider, index) => {
      if (index > 0) {
        const divider = document.createElement("div");
        divider.className = "workspace2-menu-divider";
        menu.append(divider);
      }
      const isCurrent = provider.id === currentProviderId;
      const open = document.createElement("button");
      open.type = "button";
      open.className = `workspace2-menu-item workspace2-module-overflow-open${isCurrent ? " is-current" : ""}`;
      if (isCurrent) {
        const marker = document.createElement("span");
        marker.className = "workspace2-module-overflow-current-marker";
        marker.textContent = "▸";
        marker.setAttribute("aria-hidden", "true");
        open.append(marker);
        open.setAttribute("aria-current", "page");
      }
      const label = document.createElement("span");
      label.className = "workspace2-module-overflow-label";
      label.textContent = providerLabel(provider);
      open.append(label);
      open.addEventListener("click", () => {
        closeOverflowMenu();
        if (isCurrent) onActivateProvider?.(provider.id);
        else onPinProvider?.(provider.id);
      });
      menu.append(open);
    });

    // `workspace2-context` is position: fixed, so viewport coordinates from the
    // anchor are the correct basis and the frosted-glass shell cannot clip it.
    const rect = anchor.getBoundingClientRect();
    menu.style.visibility = "hidden";
    document.body.append(menu);
    const width = menu.offsetWidth || 200;
    menu.style.left = `${Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8))}px`;
    menu.style.top = `${rect.bottom + 6}px`;
    menu.style.visibility = "";

    openMenu = menu;
    openMenuAnchor = anchor;
    anchor.classList.add("is-menu-open");
  };

  for (const tab of tabs) {
    const hasOverflow = Array.isArray(tab.overflow) && tab.overflow.length > 0;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `workspace2-module-tab ${activeTabId === tab.id ? "is-active" : ""}`;
    if (tab.tooltip) {
      button.title = tab.tooltip;
      button.setAttribute("aria-label", tab.tooltip);
    }
    button.dataset.workspace2ModuleId = tab.id;
    button.setAttribute("aria-current", activeTabId === tab.id ? "page" : "false");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeOverflowMenu();
      onActivate(tab.id);
    });
    tabButtons.set(tab.id, button);

    if (!hasOverflow) {
      button.textContent = tab.label;
      tabStrip.append(button);
      continue;
    }

    // Label and caret are separate hit targets: the label opens the pinned
    // provider, while the caret lists every merged provider.
    const label = document.createElement("span");
    label.className = "workspace2-module-tab-label";
    label.textContent = tab.label;
    button.append(label);

    const wrap = document.createElement("div");
    wrap.className = "workspace2-module-overflow-tab";
    wrap.dataset.workspace2ModuleId = tab.id;

    const divider = document.createElement("span");
    divider.className = "workspace2-module-tab-divider";
    divider.setAttribute("aria-hidden", "true");

    const caret = document.createElement("button");
    caret.type = "button";
    caret.className = "workspace2-module-overflow-caret";
    caret.title = overflowLabel;
    caret.setAttribute("aria-label", overflowLabel);
    caret.setAttribute("aria-haspopup", "menu");
    caret.textContent = "▾";
    caret.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (openMenuAnchor === wrap) {
        closeOverflowMenu();
        return;
      }
      openOverflowMenu(wrap, tab.id, tab.overflow);
    });

    wrap.append(button, divider, caret);
    tabStrip.append(wrap);
  }

  const settingsButton = document.createElement("button");
  settingsButton.type = "button";
  settingsButton.className = "workspace2-module-settings";
  settingsButton.title = settingsTitle;
  settingsButton.setAttribute("aria-label", settingsTitle);
  const settingsIcon = createSettingsIcon?.();
  if (settingsIcon) settingsButton.append(settingsIcon);
  settingsButton.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onOpenSettings?.();
  });
  tabStrip.append(settingsButton);

  const moduleFrame = document.createElement("div");
  moduleFrame.className = "workspace2-module-frame";
  // The legacy host names remain valid while the Blueprint exposes the
  // product-wide header / toolbar / controls / content anatomy.  Built-in
  // renderers still mount into contentHost in this batch, so merely adding
  // the slots cannot change their render lifecycle or visual layout.
  const headerHost = document.createElement("div");
  headerHost.className = "workspace2-module-header-host";
  headerHost.dataset.workspacekitPanelSlot = "header";
  headerHost.hidden = true;
  const toolbarHost = document.createElement("div");
  toolbarHost.className = "workspace2-module-context-host";
  toolbarHost.dataset.workspacekitPanelSlot = "toolbar";
  toolbarHost.hidden = true;
  const controlsHost = document.createElement("div");
  controlsHost.className = "workspace2-module-controls-host";
  controlsHost.dataset.workspacekitPanelSlot = "controls";
  controlsHost.hidden = true;
  const contentHost = document.createElement("div");
  // Existing panel renderers intentionally continue to receive this exact
  // class. prepareWorkspaceModuleMount() depends on it during the migration.
  contentHost.className = "workspace2-module-body";
  contentHost.dataset.workspace2ModuleMount = "true";
  contentHost.dataset.workspacekitPanelSlot = "content";
  moduleFrame.dataset.workspacekitPanelBlueprint = "v1";
  moduleFrame.append(headerHost, toolbarHost, controlsHost, contentHost);
  shell.append(tabStrip, moduleFrame);

  return {
    shell,
    tabStrip,
    tabButtons,
    settingsButton,
    moduleFrame,
    headerHost,
    toolbarHost,
    // Kept for pre-Blueprint Providers. New modules should use toolbarHost.
    contextHost: toolbarHost,
    controlsHost,
    contentHost,
    // Removes the document-level overflow-menu listeners and any open menu.
    // renderWorkspace2Panel() builds a fresh host on every tab switch, so
    // without this the listeners accumulate across re-renders.
    dispose() {
      closeOverflowMenu();
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("click", onDocumentPointerDown, true);
      document.removeEventListener("keydown", onDocumentKeyDown, true);
    },
  };
}
