/**
 * WorkspaceKit sidebar shell and stable module slots.
 *
 * This module owns only the tab strip and DOM allocation. Module content stays
 * with its current owner. Built-in family modules use the same visual tab as
 * Workflows/Nodes/Templates; only true external Providers use the overflow UI.
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
  shell.className = "workspace2-shell workspacekit-ui-root";

  const tabStrip = document.createElement("div");
  tabStrip.className = "workspace2-module-tabs";

  const tabButtons = new Map();
  let openMenu = null;
  let openMenuAnchor = null;

  const closeOverflowMenu = () => {
    if (!openMenu) return;
    openMenu.remove();
    openMenu = null;
    openMenuAnchor?.classList.remove("is-menu-open");
    openMenuAnchor = null;
  };

  const onDocumentPointerDown = (event) => {
    if (!openMenu) return;
    if (openMenu.contains(event.target)) return;
    if (openMenuAnchor?.contains(event.target)) return;
    closeOverflowMenu();
  };
  const onDocumentKeyDown = (event) => {
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

  const appendPlainTab = ({ id, label, tooltip = "", onPress }) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `workspace2-module-tab ${activeTabId === id ? "is-active" : ""}`;
    if (tooltip) {
      button.title = tooltip;
      button.setAttribute("aria-label", tooltip);
    }
    button.dataset.workspace2ModuleId = id;
    button.setAttribute("aria-current", activeTabId === id ? "page" : "false");
    button.textContent = label;
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      closeOverflowMenu();
      onPress?.();
    });
    tabButtons.set(id, button);
    tabStrip.append(button);
    return button;
  };

  // The unified package treats Layout and Appearance as first-party modules.
  // Their former Provider transport remains an internal composition detail; it
  // must not make the two tabs look like third-party dropdown extensions.
  const builtinProviderOrder = new Map([
    ["workspacekit.layout", 0],
    ["workspacekit.theme", 1],
  ]);
  const renderedBuiltinProviders = new Set();
  const appendBuiltinProviderTab = (provider, pinnedProviderId) => {
    if (!provider?.id || renderedBuiltinProviders.has(provider.id)) return;
    renderedBuiltinProviders.add(provider.id);
    const label = providerLabel(provider);
    appendPlainTab({
      id: provider.id,
      label,
      tooltip: label,
      onPress: () => {
        if (provider.id === pinnedProviderId || activeTabId === provider.id) onActivate(provider.id);
        else if (typeof onPinProvider === "function") onPinProvider(provider.id);
        else onActivate(provider.id);
      },
    });
  };

  for (const sourceTab of tabs) {
    let tab = sourceTab;
    const providers = Array.isArray(tab.overflow) ? tab.overflow.filter(Boolean) : [];
    const builtinProviders = providers
      .filter((provider) => provider?.builtin === true)
      .sort((left, right) => (builtinProviderOrder.get(left.id) ?? 99) - (builtinProviderOrder.get(right.id) ?? 99));

    if (builtinProviders.length) {
      for (const provider of builtinProviders) appendBuiltinProviderTab(provider, tab.id);
      const externalProviders = providers.filter((provider) => provider?.builtin !== true);
      if (!externalProviders.length) continue;
      const activeExternal = externalProviders.find((provider) => provider.id === tab.id) ?? null;
      tab = {
        ...tab,
        id: activeExternal?.id ?? "workspacekit.external-providers",
        label: activeExternal ? providerLabel(activeExternal) : overflowLabel,
        tooltip: activeExternal ? providerLabel(activeExternal) : overflowLabel,
        overflow: externalProviders,
        externalOverflowOnly: !activeExternal,
      };
    }

    const hasOverflow = Array.isArray(tab.overflow) && tab.overflow.length > 0;
    if (!hasOverflow) {
      appendPlainTab({
        id: tab.id,
        label: tab.label,
        tooltip: tab.tooltip,
        onPress: () => onActivate(tab.id),
      });
      continue;
    }

    let wrap = null;
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
      if (tab.externalOverflowOnly) {
        if (openMenuAnchor === wrap) closeOverflowMenu();
        else openOverflowMenu(wrap, "", tab.overflow);
        return;
      }
      closeOverflowMenu();
      onActivate(tab.id);
    });
    tabButtons.set(tab.id, button);

    const label = document.createElement("span");
    label.className = "workspace2-module-tab-label";
    label.textContent = tab.label;
    button.append(label);

    wrap = document.createElement("div");
    wrap.className = `workspace2-module-overflow-tab ${activeTabId === tab.id ? "is-active" : ""}`;
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
      openOverflowMenu(wrap, tab.externalOverflowOnly ? "" : tab.id, tab.overflow);
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
  moduleFrame.className = "workspace2-module-frame workspacekit-ui-root workspacekit-ui-panel-blueprint";
  const headerHost = document.createElement("div");
  headerHost.className = "workspace2-module-header-host workspacekit-ui-panel-header-slot";
  headerHost.dataset.workspacekitPanelSlot = "header";
  headerHost.hidden = true;
  const toolbarHost = document.createElement("div");
  toolbarHost.className = "workspace2-module-context-host workspacekit-ui-panel-toolbar-slot";
  toolbarHost.dataset.workspacekitPanelSlot = "toolbar";
  toolbarHost.hidden = true;
  const controlsHost = document.createElement("div");
  controlsHost.className = "workspace2-module-controls-host workspacekit-ui-panel-controls-slot";
  controlsHost.dataset.workspacekitPanelSlot = "controls";
  controlsHost.hidden = true;
  const contentHost = document.createElement("div");
  contentHost.className = "workspace2-module-body workspacekit-ui-panel-content-slot";
  contentHost.dataset.workspace2ModuleMount = "true";
  contentHost.dataset.workspacekitPanelSlot = "content";
  const statusHost = document.createElement("div");
  statusHost.className = "workspace2-module-status-host workspacekit-ui-panel-status-slot";
  statusHost.dataset.workspacekitPanelSlot = "status";
  statusHost.hidden = true;
  moduleFrame.dataset.workspacekitPanelBlueprint = "v1";
  moduleFrame.append(headerHost, toolbarHost, controlsHost, contentHost, statusHost);
  shell.append(tabStrip, moduleFrame);

  return {
    shell,
    tabStrip,
    tabButtons,
    settingsButton,
    moduleFrame,
    headerHost,
    toolbarHost,
    contextHost: toolbarHost,
    controlsHost,
    contentHost,
    statusHost,
    dispose() {
      closeOverflowMenu();
      document.removeEventListener("pointerdown", onDocumentPointerDown, true);
      document.removeEventListener("click", onDocumentPointerDown, true);
      document.removeEventListener("keydown", onDocumentKeyDown, true);
    },
  };
}
