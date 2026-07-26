import assert from "node:assert/strict";
import {
  createPanelUiTemplateContract,
  PANEL_UI_TEMPLATE_CAPABILITIES,
  supportsPanelUiTemplateContract,
} from "../entry/ui-kit/compatibility.js";

const complete = {
  supports: (major) => major === 1,
  contract: createPanelUiTemplateContract({ major: 1, version: "1.9.9" }),
  createModuleHeader() {}, createRangeControl() {}, createSegmentedControl() {},
  createIconButton() {}, createControlRow() {}, createCommandGrid() {},
};
assert.equal(supportsPanelUiTemplateContract(complete, {
  requiredMajor: 1,
  requiredCapabilities: ["module-header", "command-grid"],
}), true);
assert.equal(supportsPanelUiTemplateContract(complete, {
  requiredMajor: 1,
  requiredCapabilities: ["future-control"],
}), false);
assert.equal(supportsPanelUiTemplateContract(complete, {
  requiredMajor: 2,
  requiredCapabilities: ["module-header"],
}), false);

const adapter = {
  supports: (major) => major === 1,
  contract: createPanelUiTemplateContract({
    major: 1,
    version: "2.0.0-v1-adapter",
    capabilities: PANEL_UI_TEMPLATE_CAPABILITIES,
  }),
  createModuleHeader() {}, createRangeControl() {}, createSegmentedControl() {},
  createIconButton() {}, createControlRow() {}, createCommandGrid() {},
};
assert.equal(supportsPanelUiTemplateContract(adapter, {
  requiredMajor: 1,
  requiredCapabilities: ["range-control", "segmented-control"],
}), true);

const incompatibleV2 = {
  supports: (major) => major === 2,
  contract: createPanelUiTemplateContract({ major: 2, version: "2.0.0" }),
};
assert.equal(supportsPanelUiTemplateContract(incompatibleV2, {
  requiredMajor: 1,
  requiredCapabilities: ["module-header"],
}), false);
const dishonest = {
  supports: (major) => major === 1,
  contract: createPanelUiTemplateContract({ major: 1, version: "1.3.0" }),
};
assert.equal(supportsPanelUiTemplateContract(dishonest, {
  requiredMajor: 1,
  requiredCapabilities: ["module-header"],
}), false);
console.log("Panel UI Template compatibility contract passed.");
