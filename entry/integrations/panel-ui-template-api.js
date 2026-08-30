import { createPanelUiTemplate } from "../ui-kit/template.js";
import { PANEL_UI_TEMPLATE_MAJOR, PANEL_UI_TEMPLATE_VERSION, supportsPanelUiTemplate } from "../ui-kit/version.js";
import { createPanelUiTemplateContract, PANEL_UI_TEMPLATE_CAPABILITIES } from "../ui-kit/compatibility.js";

export const WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY = "WorkspaceKitPanelUITemplate";

function invalid(code, message) {
  return Object.freeze({ ok: false, code, message });
}

// This runtime is deliberately independent from the Provider integration
// preference. Provider registration/tab placement is the supported integration
// boundary. External plugins may opt into this Template, but they are never
// required to adopt WorkspaceKit's visual primitives.
export function publishWorkspaceKitPanelUiTemplate(target = globalThis) {
  if (!target || (typeof target !== "object" && typeof target !== "function")) {
    return invalid("invalid-target", "A global object is required to publish the Panel UI Template.");
  }
  const existing = target[WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY];
  if (existing) {
    if (existing.major === PANEL_UI_TEMPLATE_MAJOR
      && existing.version === PANEL_UI_TEMPLATE_VERSION
      && typeof existing.create === "function"
      && typeof existing.supports === "function") {
      return Object.freeze({ ok: true, code: "existing", template: existing });
    }
    if (existing.major !== PANEL_UI_TEMPLATE_MAJOR) {
      return invalid("template-conflict", "A different WorkspaceKit Panel UI Template major is already published.");
    }
    const descriptor = Object.getOwnPropertyDescriptor(target, WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY);
    if (descriptor?.configurable === false) {
      return invalid("template-conflict", "The existing WorkspaceKit Panel UI Template cannot be refreshed.");
    }
  }
  const replacedStaleTemplate = Boolean(existing);
  const template = Object.freeze({
    version: PANEL_UI_TEMPLATE_VERSION,
    major: PANEL_UI_TEMPLATE_MAJOR,
    contract: createPanelUiTemplateContract({
      major: PANEL_UI_TEMPLATE_MAJOR,
      version: PANEL_UI_TEMPLATE_VERSION,
      capabilities: PANEL_UI_TEMPLATE_CAPABILITIES,
    }),
    supports: supportsPanelUiTemplate,
    create: ({ document = globalThis.document } = {}) => createPanelUiTemplate({ document }),
  });
  Object.defineProperty(target, WORKSPACEKIT_PANEL_UI_TEMPLATE_KEY, {
    configurable: true,
    enumerable: true,
    value: template,
    writable: false,
  });
  return Object.freeze({ ok: true, code: replacedStaleTemplate ? "refreshed" : "published", template });
}
