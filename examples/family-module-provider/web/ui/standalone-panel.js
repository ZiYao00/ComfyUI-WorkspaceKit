// Standalone fallback: a normal ComfyUI sidebar tab used when WorkspaceKit is
// not present (or cannot host the provider). It renders the SAME module-view
// through the SAME UI Template, so standalone and merged modes share one UI.
//
// When a compatible WorkspaceKit host later claims the provider, main.js calls
// unregisterStandalonePanel() from the provider's onHostClaimed callback.

import { createPanelUiTemplate as createVendorPanelUiTemplate } from "../vendor/workspacekit-ui/template.js";
import { renderModuleView } from "./module-view.js";
import { supportsHostUi } from "./provider.js";

const PANEL_ID = "example-family-module-panel"; // CHANGE ME: unique sidebar id

// Prefer a compatible installed host Template so a standalone install still
// tracks host UI updates; otherwise fall back to the bundled Vendor copy.
export function resolveStandalonePanelUi(document, target = globalThis) {
  const hostTemplate = target.WorkspaceKitPanelUITemplate;
  if (hostTemplate?.supports?.(1) && typeof hostTemplate.create === "function") {
    const hostUi = hostTemplate.create({ document });
    if (supportsHostUi(hostUi)) return hostUi;
  }
  return createVendorPanelUiTemplate({ document });
}

export function registerStandalonePanel({ app, translate }) {
  if (typeof app?.extensionManager?.registerSidebarTab !== "function") return false;
  app.extensionManager.registerSidebarTab({
    id: PANEL_ID,
    icon: "pi pi-th-large", // CHANGE ME: a PrimeVue icon for standalone mode
    title: translate("example.title"),
    tooltip: translate("example.title"),
    type: "custom",
    render: (host) => {
      host.replaceChildren();
      const ui = resolveStandalonePanelUi(document);
      const chrome = ui.createStandaloneShell({
        title: translate("example.title"),
        settingsLabel: translate("example.settings"),
        settingsContent: "⚙",
        onSettings: () => app?.ui?.settings?.showDialog?.(),
      });
      // Same Blueprint anatomy as the merged provider. The Vendor copy supplies
      // it when WorkspaceKit is absent; a compatible host Template replaces it.
      const blueprint = ui.createPanelBlueprint?.();
      const slots = blueprint || ui.createContentSlots();
      slots.element.classList?.add("workspacekit-ui-product-panel");
      chrome.content.replaceChildren(slots.element);
      const dispose = renderModuleView({
        document,
        headerHost: slots.header,
        toolbarHost: slots.toolbar,
        controlsHost: slots.controls || slots.context,
        contextHost: slots.context,
        contentHost: slots.content,
        surface: chrome.shell,
        translate,
        ui,
      });
      host.append(chrome.shell);
      return dispose;
    },
  });
  return true;
}

export function unregisterStandalonePanel(app) {
  if (typeof app?.extensionManager?.unregisterSidebarTab !== "function") return false;
  app.extensionManager.unregisterSidebarTab(PANEL_ID);
  return true;
}
