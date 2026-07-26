import { createPanelUiPrimitives } from "./primitives.js";
import { createPanelBlueprint } from "./blueprint.js";
import { installPanelUiTemplateStyles } from "./styles.js";
import { PANEL_UI_TEMPLATE_MAJOR, PANEL_UI_TEMPLATE_VERSION, supportsPanelUiTemplate } from "./version.js";
import { createPanelUiTemplateContract, PANEL_UI_TEMPLATE_CAPABILITIES } from "./compatibility.js";

// This browser-safe factory is the future public UI capability. It does not
// publish a global or alter Provider registration by itself; Batch 2 will add
// that host integration after this standalone contract is verified.
export function createPanelUiTemplate({ document = globalThis.document } = {}) {
  const installed = installPanelUiTemplateStyles(document);
  const primitives = createPanelUiPrimitives(document);
  return Object.freeze({
    version: PANEL_UI_TEMPLATE_VERSION,
    major: PANEL_UI_TEMPLATE_MAJOR,
    contract: createPanelUiTemplateContract({
      major: PANEL_UI_TEMPLATE_MAJOR,
      version: PANEL_UI_TEMPLATE_VERSION,
      capabilities: PANEL_UI_TEMPLATE_CAPABILITIES,
    }),
    installed,
    supports: supportsPanelUiTemplate,
    createPanelBlueprint: (options = {}) => createPanelBlueprint({ document, ...options }),
    ...primitives,
  });
}
