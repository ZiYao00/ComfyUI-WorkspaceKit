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
  overflowProviders = [],
  providerLabel = (provider) => provider.title || provider.id,
  onActivateProvider,
  onPinProvider,
  overflowLabel = "Extensions",
  pinLabel = "Pin",
}) {
  if (!document?.createElement) {
    throw new TypeError("A DOM document is required to create the WorkspaceKit panel host.");
  }
  const shell = document.createElement("div");
  shell.className = "workspace2-shell";

  const tabStrip = document.createElement("div");
  tabStrip.className = "workspace2-module-tabs";
  tabStrip.style.setProperty("--workspace2-tab-count", String(tabs.length));

  const tabButtons = new Map();
  for (const tab of tabs) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `workspace2-module-tab ${activeTabId === tab.id ? "is-active" : ""}`;
    button.textContent = tab.label;
    if (tab.tooltip) {
      button.title = tab.tooltip;
      button.setAttribute("aria-label", tab.tooltip);
    }
    button.dataset.workspace2ModuleId = tab.id;
    button.setAttribute("aria-current", activeTabId === tab.id ? "page" : "false");
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onActivate(tab.id);
    });
    tabButtons.set(tab.id, button);
    tabStrip.append(button);
  }
  if (overflowProviders.length) {
    const overflow = document.createElement("details"); overflow.className = "workspace2-module-overflow";
    const summary = document.createElement("summary"); summary.textContent = `${overflowLabel} ▾`;
    const menu = document.createElement("div"); menu.className = "workspace2-module-overflow-menu";
    for (const provider of overflowProviders) {
      const row = document.createElement("div"); row.className = "workspace2-module-overflow-row";
      const open = document.createElement("button"); open.type = "button"; open.textContent = providerLabel(provider);
      open.addEventListener("click", () => { overflow.open = false; onActivateProvider?.(provider.id); });
      const pin = document.createElement("button"); pin.type = "button"; pin.textContent = pinLabel;
      pin.addEventListener("click", () => { overflow.open = false; onPinProvider?.(provider.id); });
      row.append(open, pin); menu.append(row);
    }
    overflow.append(summary, menu); tabStrip.append(overflow);
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
  const headerHost = document.createElement("div");
  headerHost.className = "workspace2-module-header-host";
  headerHost.hidden = true;
  const contextHost = document.createElement("div");
  contextHost.className = "workspace2-module-context-host";
  contextHost.hidden = true;
  const contentHost = document.createElement("div");
  // Existing panel renderers intentionally continue to receive this exact
  // class. prepareWorkspaceModuleMount() depends on it during the migration.
  contentHost.className = "workspace2-module-body";
  contentHost.dataset.workspace2ModuleMount = "true";
  moduleFrame.append(headerHost, contextHost, contentHost);
  shell.append(tabStrip, moduleFrame);

  return {
    shell,
    tabStrip,
    tabButtons,
    settingsButton,
    moduleFrame,
    headerHost,
    contextHost,
    contentHost,
  };
}
