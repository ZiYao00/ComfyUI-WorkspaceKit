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
  pinLabel = "Pin",
}) {
  if (!document?.createElement) {
    throw new TypeError("A DOM document is required to create the WorkspaceKit panel host.");
  }
  const shell = document.createElement("div");
  shell.className = "workspace2-shell";

  const tabStrip = document.createElement("div");
  tabStrip.className = "workspace2-module-tabs";

  const tabButtons = new Map();
  // Each tab is now a `<details>` (when it has overflow providers) or a
  // `<button>` (core modules). The summary inside a details tab holds the
  // label plus a caret button so the caret can be hit-tested separately from
  // the label. Clicking the label = activate the pinned/default provider.
  // Clicking the caret = toggle the overflow menu.
  for (const tab of tabs) {
    const hasOverflow = Array.isArray(tab.overflow) && tab.overflow.length > 0;
    if (hasOverflow) {
      const details = document.createElement("details");
      details.className = `workspace2-module-overflow-tab ${activeTabId === tab.id ? "is-active" : ""}`;
      details.dataset.workspace2ModuleId = tab.id;

      const summary = document.createElement("summary");
      summary.className = "workspace2-module-tab";
      if (tab.tooltip) {
        summary.title = tab.tooltip;
        summary.setAttribute("aria-label", tab.tooltip);
      }
      summary.dataset.workspace2ModuleId = tab.id;
      summary.setAttribute("aria-current", activeTabId === tab.id ? "page" : "false");

      const labelText = document.createElement("span");
      labelText.className = "workspace2-module-tab-label";
      labelText.textContent = tab.label;
      summary.append(labelText);

      // Caret lives in its own button so click events on the caret do not
      // bubble up to the summary's default toggle (which would re-open the
      // menu after the user clicks the label to switch providers).
      const caret = document.createElement("button");
      caret.type = "button";
      caret.className = "workspace2-module-overflow-caret";
      caret.setAttribute("aria-hidden", "true");
      caret.textContent = "▾";
      caret.addEventListener("click", (event) => {
        // preventDefault stops the parent summary from doing its native toggle
        // (which would happen after our manual toggle and cancel it out).
        // stopPropagation is also needed so mousedown on the caret does not
        // race the document-level "close on outside click" handler.
        event.preventDefault();
        event.stopPropagation();
        details.open = !details.open;
      });
      summary.append(caret);

      // Float the menu on document.body so `workspace2-shell`'s
      // `overflow: hidden` (needed for the glass ::before background) cannot
      // clip it when the sidebar is narrow. Repositioned on toggle / scroll.
      const menu = document.createElement("div");
      menu.className = "workspace2-module-overflow-menu workspace2-floating";
      for (const provider of tab.overflow) {
        const row = document.createElement("div");
        row.className = "workspace2-module-overflow-row";
        row.dataset.workspace2ProviderId = provider.id;
        const label = document.createElement("span");
        label.className = "workspace2-module-overflow-name";
        label.textContent = providerLabel(provider);
        const pin = document.createElement("button");
        pin.type = "button";
        pin.className = "workspace2-module-overflow-pin";
        pin.textContent = pinLabel;
        pin.addEventListener("click", (event) => {
          event.stopPropagation();
          details.open = false;
          onPinProvider?.(provider.id);
        });
        row.addEventListener("click", () => {
          details.open = false;
          onActivateProvider?.(provider.id);
        });
        row.append(label, pin);
        menu.append(row);
      }
      document.body.append(menu);

      const positionMenu = () => {
        const rect = summary.getBoundingClientRect();
        const menuWidth = Math.min(280, Math.max(180, window.innerWidth - 24));
        const desiredLeft = rect.right - menuWidth;
        const clampedLeft = Math.max(8, Math.min(desiredLeft, window.innerWidth - menuWidth - 8));
        menu.style.left = `${clampedLeft}px`;
        menu.style.top = `${rect.bottom + 6}px`;
        menu.style.width = `${menuWidth}px`;
      };
      details.addEventListener("toggle", () => {
        if (details.open) {
          positionMenu();
          menu.style.display = "";
        } else {
          menu.style.display = "none";
        }
      });
      // Click the summary's label area (not the caret) to activate the tab
      // (which is the pinned/default provider in this layout).
      labelText.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivate(tab.id);
      });

      // Outside-click + ESC close. mousedown fires before click, so we use it
      // and skip when the target is inside the overflow tab or the floating
      // menu. The caret's own click handler still toggles via the same path.
      const onDocMouseDown = (event) => {
        if (!details.open) return;
        const target = event.target;
        if (target.closest(".workspace2-module-overflow-tab, .workspace2-module-overflow-menu")) return;
        details.open = false;
      };
      const onDocKeyDown = (event) => {
        if (!details.open) return;
        if (event.key === "Escape") {
          details.open = false;
        }
      };
      document.addEventListener("mousedown", onDocMouseDown, true);
      document.addEventListener("keydown", onDocKeyDown, true);

      tabButtons.set(tab.id, summary);
      details.append(summary);
      tabStrip.append(details);
    } else {
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
  };
}
