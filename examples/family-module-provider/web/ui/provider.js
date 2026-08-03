// The provider factory. Creates the public provider object WorkspaceKit hosts.
//
// CHANGE ME: edit the three identity constants below for your plugin. Everything
// else is generic C-tier (family module) wiring.

import { createPanelUiTemplate as createVendorPanelUiTemplate } from "../vendor/workspacekit-ui/template.js";
import { supportsPanelUiTemplateContract } from "../vendor/workspacekit-ui/compatibility.js";
import { renderModuleView } from "./module-view.js";

// --- CHANGE ME: plugin identity --------------------------------------------
export const PROVIDER_ID = "example.family-module";
export const PROVIDER_TITLE = "Family Module";
// Host metadata only. The standalone SidebarTab API still needs its own
// class-string fallback; do not use an emoji as Provider identity.
export const PROVIDER_ICON_KEY = "example";
// ---------------------------------------------------------------------------

export const PROVIDER_API_VERSION = 1;

// Declare only the Template capabilities your module-view actually renders. The
// host must supply a compatible major AND each named primitive; otherwise the
// bundled Vendor copy is used instead. Keep this list in sync with module-view.
export const UI_REQUIREMENTS = Object.freeze({
  requiredMajor: 1,
  requiredCapabilities: Object.freeze([
    "module-header",
  ]),
});

export function supportsHostUi(ui) {
  return supportsPanelUiTemplateContract(ui, UI_REQUIREMENTS);
}

/**
 * Creates the provider object without registering it or owning a sidebar.
 * Feature callbacks are injected from main.js so this file stays generic.
 */
export function createProvider({ app, translate, onHostClaimed }) {
  return Object.freeze({
    apiVersion: PROVIDER_API_VERSION,
    id: PROVIDER_ID,
    title: PROVIDER_TITLE,
    iconKey: PROVIDER_ICON_KEY,
    // WorkspaceKit must not import this plugin's locale files. The provider
    // resolves its own current-language title and keeps title as a fallback.
    getTitle: () => translate("example.title"),
    tabLabel: translate("example.tab"),
    tabTooltip: translate("example.title"),
    onHostClaimed,
    render({
      document = globalThis.document,
      headerHost,
      toolbarHost,
      controlsHost,
      contextHost,
      contentHost,
      surface,
      ui,
    }) {
      // Provider API v1 and the UI Template are versioned independently. An
      // older host can still render through the bundled Vendor copy; only a
      // fully compatible host runtime replaces it.
      const panelUi = supportsHostUi(ui) ? ui : createVendorPanelUiTemplate({ document });
      const localControlsHost = controlsHost || contextHost;
      headerHost.hidden = false;

      // Use the exact same header / control-band / content spacing vocabulary
      // as WorkspaceKit's built-in panels.
      headerHost.classList.add("workspacekit-ui-root", "workspacekit-ui-panel-header-slot", "workspacekit-ui-product-header-slot");
      if (localControlsHost) localControlsHost.classList.add("workspacekit-ui-root", "workspacekit-ui-panel-controls-slot", "workspacekit-ui-product-controls-slot");
      contentHost.classList.add("workspacekit-ui-root", "workspacekit-ui-panel-content-slot", "workspacekit-ui-product-content-slot");

      const dispose = renderModuleView({
        document,
        headerHost,
        toolbarHost: toolbarHost || null,
        controlsHost: localControlsHost,
        contextHost,
        contentHost,
        surface: surface ?? contentHost,
        translate,
        ui: panelUi,
      });

      return () => {
        dispose();
        headerHost.hidden = true;
        headerHost.classList.remove("workspacekit-ui-root", "workspacekit-ui-panel-header-slot", "workspacekit-ui-product-header-slot");
        if (localControlsHost) localControlsHost.classList.remove("workspacekit-ui-root", "workspacekit-ui-panel-controls-slot", "workspacekit-ui-product-controls-slot");
        contentHost.classList.remove("workspacekit-ui-root", "workspacekit-ui-panel-content-slot", "workspacekit-ui-product-content-slot");
      };
    },
  });
}
