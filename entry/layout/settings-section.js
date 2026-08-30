import {
  LAYOUT_COMMAND_ICON_SIZE_MAX,
  LAYOUT_COMMAND_ICON_SIZE_MIN,
  emitLayoutPresentationChanged,
  readLayoutCommandIconSize,
  readLayoutPresentationMode,
  resetLayoutFloatingPosition,
  setLayoutCommandIconSize,
  setLayoutPresentationMode,
} from "./preferences.js";
import { ensureLayoutStyles } from "./styles.js";

function snapQuarter(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return LAYOUT_COMMAND_ICON_SIZE_MIN;
  return Math.round(numeric * 4) / 4;
}

export const LAYOUT_PRESENTATION_OPTIONS = Object.freeze([
  Object.freeze({ value: "top", labelKey: "settings.layoutPresentation.top", helpKey: "settings.layoutPresentation.top.help" }),
  Object.freeze({ value: "selection", labelKey: "settings.layoutPresentation.selection", helpKey: "settings.layoutPresentation.selection.help" }),
  Object.freeze({ value: "pinned", labelKey: "settings.layoutPresentation.pinned", helpKey: "settings.layoutPresentation.pinned.help" }),
  Object.freeze({ value: "none", labelKey: "settings.layoutPresentation.none", helpKey: "settings.layoutPresentation.none.help" }),
]);

function createPresentationModeGroup({ document, storage, t, notify }) {
  const current = readLayoutPresentationMode(storage);
  const group = document.createElement("div");
  group.className = "workspacekit-layout-settings-mode-list";
  group.dataset.workspacekitLayoutPresentationMode = "true";
  group.setAttribute?.("role", "radiogroup");
  group.setAttribute?.("aria-label", t("settings.layoutPresentationMode"));

  for (const option of LAYOUT_PRESENTATION_OPTIONS) {
    const row = document.createElement("label");
    row.className = "workspacekit-layout-settings-mode-option";
    row.dataset.layoutPresentationValue = option.value;

    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "workspacekit-layout-presentation-mode";
    radio.value = option.value;
    radio.checked = current === option.value;

    const copy = document.createElement("span");
    copy.className = "workspacekit-layout-settings-mode-copy";
    const title = document.createElement("span");
    title.className = "workspacekit-layout-settings-mode-title";
    title.textContent = t(option.labelKey);
    const description = document.createElement("small");
    description.className = "workspacekit-layout-settings-mode-help";
    description.textContent = t(option.helpKey);
    copy.append(title, description);

    radio.addEventListener?.("change", () => {
      if (!radio.checked) return;
      setLayoutPresentationMode(option.value, storage);
      notify();
    });

    row.append(radio, copy);
    group.append(row);
  }

  return group;
}

export function createLayoutSettingsRows({
  document = globalThis.document,
  storage = globalThis.localStorage,
  t,
  settingsHelp,
  settingsRange,
  settingsActionButton,
} = {}) {
  ensureLayoutStyles(document);
  const notify = () => emitLayoutPresentationChanged(document, storage);
  const help = settingsHelp(t("settings.layoutPresentationHelp"));
  const modeLabel = document.createElement("div");
  modeLabel.className = "workspacekit-layout-settings-field-label";
  modeLabel.textContent = t("settings.layoutPresentationMode");
  const modeGroup = createPresentationModeGroup({ document, storage, t, notify });

  const sizeRow = settingsRange(t("settings.layoutCommandIconSize"), readLayoutCommandIconSize(storage), {
    min: LAYOUT_COMMAND_ICON_SIZE_MIN,
    max: LAYOUT_COMMAND_ICON_SIZE_MAX,
    step: 0.25,
    snap: snapQuarter,
    onChange: (value) => {
      setLayoutCommandIconSize(value, storage);
      notify();
    },
  });
  if (sizeRow?.dataset) sizeRow.dataset.workspacekitLayoutIconSize = "true";

  const resetButton = settingsActionButton("restore", t("settings.layoutFloatingReset"), () => {
    resetLayoutFloatingPosition(storage);
    notify();
  });
  const resetRow = document.createElement("div");
  resetRow.className = "workspace2-settings-action-row";
  resetRow.append(resetButton);
  if (resetRow?.dataset) resetRow.dataset.workspacekitLayoutFloatingReset = "true";

  return Object.freeze([help, modeLabel, modeGroup, sizeRow, resetRow]);
}
