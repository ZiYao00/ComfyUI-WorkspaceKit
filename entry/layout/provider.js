import { t } from "../core/i18n.js";
import { renderLayoutPanel } from "./panel.js";

export const LAYOUT_PROVIDER_ID = "workspacekit.layout";
export const LAYOUT_PROVIDER_API_VERSION = 1;

export function createLayoutProvider({ controller }) {
  return Object.freeze({
    apiVersion: LAYOUT_PROVIDER_API_VERSION,
    id: LAYOUT_PROVIDER_ID,
    builtin: true,
    title: "Layout",
    icon: "📐",
    iconKey: "layout",
    getTitle: () => t("layout.tab"),
    render({
      document = globalThis.document,
      headerHost,
      toolbarHost,
      controlsHost,
      contextHost,
      contentHost,
      ui,
    }) {
      return renderLayoutPanel({
        document,
        headerHost,
        toolbarHost,
        controlsHost,
        contextHost,
        contentHost,
        controller,
        ui,
      });
    },
  });
}
