import { app } from "../../scripts/app.js";
import { registerOrQueueBuiltinProvider } from "./integrations/builtin-provider-registration.js";
import { createLayoutController } from "./layout/controller.js";
import { createLayoutFloatingToolbar } from "./layout/floating-toolbar.js";
import { migrateLegacyLayoutPreferences } from "./layout/preferences.js";
import { createLayoutProvider } from "./layout/provider.js";
import { createLayoutTopbar } from "./layout/topbar.js";

const EXTENSION_NAME = "WorkspaceKit.Layout.Builtin";
const LEGACY_CONTAINMENT_STYLE_ID = "workspacekit-layout-v2-legacy-containment";
const LEGACY_STANDALONE_PANEL_ID = "workspacekit-layout-panel";
let controller = null;
let provider = null;
let topbar = null;
let floatingToolbar = null;

function suppressLegacyStandalonePanel() {
  try { app.extensionManager?.unregisterSidebarTab?.(LEGACY_STANDALONE_PANEL_ID); } catch {}
}

function installLegacyContainment(document = globalThis.document) {
  if (!document?.head || document.getElementById?.(LEGACY_CONTAINMENT_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = LEGACY_CONTAINMENT_STYLE_ID;
  style.textContent = `
    /* The unified plugin owns Layout. Keep an installed legacy standalone
       Layout inert without modifying or deleting that plugin's files. */
    #alignment-buttons,
    .workspacekit-layout-top-toolbar-group {
      display: none !important;
      pointer-events: none !important;
    }
  `;
  document.head.append(style);
}

app.registerExtension({
  name: EXTENSION_NAME,
  async setup() {
    suppressLegacyStandalonePanel();
    globalThis.setTimeout?.(suppressLegacyStandalonePanel, 1000);
    migrateLegacyLayoutPreferences(globalThis.localStorage);
    installLegacyContainment(document);

    controller ??= createLayoutController(app);
    topbar ??= createLayoutTopbar({
      document,
      storage: globalThis.localStorage,
      getMenuElement: () => app.menu?.element ?? null,
      controller,
    });
    topbar.installWhenReady();
    floatingToolbar ??= createLayoutFloatingToolbar({
      document,
      storage: globalThis.localStorage,
      controller,
    });
    floatingToolbar.install();

    provider ??= createLayoutProvider({ controller });
    const result = registerOrQueueBuiltinProvider(provider);
    if (!result.ok && result.code !== "already-registered") {
      console.warn("[WorkspaceKit Layout] Provider registration failed", result.code);
    }
  },
});
