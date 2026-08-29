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

function snapQuarter(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return LAYOUT_COMMAND_ICON_SIZE_MIN;
  return Math.round(numeric * 4) / 4;
}

export function createLayoutSettingsRows({
  document = globalThis.document,
  storage = globalThis.localStorage,
  t,
  settingsHelp,
  settingsSelect,
  settingsRange,
  settingsActionButton,
} = {}) {
  const notify = () => emitLayoutPresentationChanged(document, storage);
  const help = settingsHelp(t("settings.layoutPresentationHelp"));

  const modeRow = settingsSelect(
    t("settings.layoutPresentationMode"),
    readLayoutPresentationMode(storage),
    [
      { value: "top", label: t("settings.layoutPresentation.top") },
      { value: "selection", label: t("settings.layoutPresentation.selection") },
      { value: "pinned", label: t("settings.layoutPresentation.pinned") },
      { value: "none", label: t("settings.layoutPresentation.none") },
    ],
    (value) => {
      setLayoutPresentationMode(value, storage);
      notify();
    },
  );
  if (modeRow?.dataset) modeRow.dataset.workspacekitLayoutPresentationMode = "true";

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

  return Object.freeze([help, modeRow, sizeRow, resetRow]);
}
