import { t } from "../core/i18n.js";
import { AppearanceEditor } from "./editor.js";
import { ThemeRuntimeAdapter } from "./theme-runtime-adapter.js";

export const APPEARANCE_PROVIDER_ID = "workspacekit.theme";
export const APPEARANCE_PROVIDER_API_VERSION = 1;

export function createAppearanceProvider({ app }) {
  return Object.freeze({
    apiVersion: APPEARANCE_PROVIDER_API_VERSION,
    id: APPEARANCE_PROVIDER_ID,
    builtin: true,
    title: "Appearance",
    icon: "🎨",
    iconKey: "theme",
    getTitle: () => t("appearance.tab"),
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
      const editor = new AppearanceEditor(app, new ThemeRuntimeAdapter(app));
      editor.mount({
        document,
        headerHost,
        toolbarHost: toolbarHost ?? contextHost,
        controlsHost,
        contentHost,
        surface,
        ui,
      });
      return () => editor.unmount({ restoreRuntime: true });
    },
  });
}
