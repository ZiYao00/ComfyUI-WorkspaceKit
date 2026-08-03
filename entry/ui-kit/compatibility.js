// Public capability contract for family plugins that render with the
// WorkspaceKit Panel UI Template. Minor UI releases may add or refine visual
// behavior without changing this list; a breaking removal requires a new
// template major or a compatibility adapter.
export const PANEL_UI_TEMPLATE_CAPABILITIES = Object.freeze([
  "panel-blueprint",
  "module-header",
  "range-control",
  "segmented-control",
  "icon-button",
  "control-row",
  "command-grid",
  "disclosure-section",
  "compact-action-bar",
  "dropzone-surface",
  "icon-kit",
]);

const PANEL_UI_TEMPLATE_CAPABILITY_PRIMITIVES = Object.freeze({
  "panel-blueprint": "createPanelBlueprint",
  "module-header": "createModuleHeader",
  "range-control": "createRangeControl",
  "segmented-control": "createSegmentedControl",
  "icon-button": "createIconButton",
  "control-row": "createControlRow",
  "command-grid": "createCommandGrid",
  "disclosure-section": "createDisclosureSection",
  "compact-action-bar": "createCompactActionBar",
  "dropzone-surface": "createDropzoneSurface",
  "icon-kit": "createIcon",
});

function normalizedCapabilities(value) {
  return new Set(Array.isArray(value) ? value.map((item) => String(item)) : []);
}

export function createPanelUiTemplateContract({ major, version, capabilities = PANEL_UI_TEMPLATE_CAPABILITIES } = {}) {
  return Object.freeze({
    major: Number(major),
    version: String(version || ""),
    capabilities: Object.freeze([...normalizedCapabilities(capabilities)].sort()),
  });
}

// Layout and future family plugins use this instead of comparing a minor UI
// version. A host can retain an older-major adapter by advertising that major
// and the required capabilities explicitly.
export function supportsPanelUiTemplateContract(template, {
  requiredMajor,
  requiredCapabilities = [],
} = {}) {
  if (!template || typeof template !== "object") return false;
  const major = Number(requiredMajor);
  if (!Number.isInteger(major) || major < 1) return false;
  if (typeof template.supports === "function") {
    if (!template.supports(major)) return false;
  } else if (Number(template?.contract?.major ?? template.major) !== major) {
    return false;
  }
  const capabilities = normalizedCapabilities(template?.contract?.capabilities ?? template.capabilities);
  return [...new Set(requiredCapabilities.map((item) => String(item)))].every((capability) => {
    if (!capabilities.has(capability)) return false;
    const primitive = PANEL_UI_TEMPLATE_CAPABILITY_PRIMITIVES[capability];
    return !primitive || typeof template[primitive] === "function";
  });
}
