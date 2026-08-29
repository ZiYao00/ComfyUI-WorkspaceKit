import { app } from "../../scripts/app.js";
import { registerOrQueueBuiltinProvider } from "./integrations/builtin-provider-registration.js";
import { createAppearanceProvider } from "./appearance/provider.js";

const EXTENSION_NAME = "WorkspaceKit.Appearance";
const LEGACY_STANDALONE_PANEL_ID = "workspacekit-theme-lab";
let provider = null;

function suppressLegacyStandalonePanel() {
  try { app.extensionManager?.unregisterSidebarTab?.(LEGACY_STANDALONE_PANEL_ID); } catch {}
}

app.registerExtension({
  name: EXTENSION_NAME,
  async setup() {
    suppressLegacyStandalonePanel();
    globalThis.setTimeout?.(suppressLegacyStandalonePanel, 1000);
    provider ??= createAppearanceProvider({ app });
    const result = registerOrQueueBuiltinProvider(provider);
    if (!result.ok && result.code !== "already-registered") {
      console.warn("[WorkspaceKit Appearance] Provider registration failed", result.code);
    }
  },
});
