import { LAYOUT_COMMANDS } from "./command-registry.js";
import { createLayoutCommandIcon } from "./icons.js";
import {
  readLayoutCommandIconSize,
  readLayoutSpacing,
  setLayoutSpacing,
} from "./preferences.js";
import { PRIMARY_COMMAND_ROWS } from "./presentation-commands.js";
import { ensureLayoutStyles } from "./styles.js";
import { t } from "../core/i18n.js";

export { PRIMARY_COMMAND_ROWS } from "./presentation-commands.js";

const SPACING_COMMANDS = Object.freeze([
  "workspacekit.layout.spacing.horizontal",
  "workspacekit.layout.spacing.vertical",
]);

const SIZE_COMMANDS = Object.freeze([
  "workspacekit.layout.size.equal-width",
  "workspacekit.layout.size.equal-min-width",
  "workspacekit.layout.size.equal-height",
  "workspacekit.layout.size.equal-min-height",
  "workspacekit.layout.size.equal-both",
]);

function reasonMessage(reason, minimumSelection = 2) {
  switch (reason) {
    case "minimum-selection":
      return t("layout.minimumSelection", { count: minimumSelection });
    case "minimum-resizable-selection":
      return t("layout.minimumResizableSelection", { count: minimumSelection });
    case "invalid-spacing":
      return t("layout.invalidSpacing");
    case "apply-failed":
      return t("layout.applyFailed");
    default:
      return t("layout.commandUnavailable");
  }
}

function commandTooltip(definition) {
  const key = `${definition.labelKey}.tooltip`;
  const translated = t(key);
  return translated === key ? t(definition.labelKey) : translated;
}

function createCommandButton(document, commandId, onPress) {
  const definition = LAYOUT_COMMANDS[commandId];
  const button = document.createElement("button");
  button.type = "button";
  button.className = "workspacekit-layout-v2-command";
  button.dataset.commandId = commandId;
  const label = definition ? commandTooltip(definition) : commandId;
  button.title = label;
  button.setAttribute("aria-label", label);
  const icon = createLayoutCommandIcon(document, commandId);
  if (icon) button.append(icon);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    if (!button.disabled) onPress(commandId);
  });
  return button;
}

function focusLayoutDisplaySettings(document) {
  const reveal = () => {
    const navButton = document.querySelector?.('[data-workspace2-settings-page="layout"]');
    navButton?.click?.();
    const section = document.querySelector?.('[data-workspacekit-layout-display-settings="true"]');
    if (!section) return false;
    section.scrollIntoView?.({ block: "start", behavior: "smooth" });
    section.classList?.add("workspacekit-layout-settings-focus");
    globalThis.setTimeout?.(() => section.classList?.remove("workspacekit-layout-settings-focus"), 900);
    return true;
  };

  const settingsButton = document.querySelector?.(".workspace2-module-settings");
  settingsButton?.click?.();
  queueMicrotask(() => {
    if (!reveal()) globalThis.setTimeout?.(reveal, 80);
  });
}

export function renderLayoutPanel({
  document = globalThis.document,
  storage = globalThis.localStorage,
  headerHost,
  toolbarHost,
  controlsHost,
  contextHost,
  contentHost,
  status,
  controller,
} = {}) {
  const controlHost = controlsHost ?? contextHost;
  const operationsHost = toolbarHost ?? controlHost;
  if (!document?.createElement || !operationsHost || !contentHost || !controller) {
    throw new TypeError("WorkspaceKit Layout panel requires Blueprint hosts and a Layout controller.");
  }
  ensureLayoutStyles(document);

  // Layout follows the same Blueprint anatomy as the other built-in panels:
  // top = operational controls, middle = content, bottom = shared status/help.
  if (headerHost) {
    headerHost.replaceChildren();
    headerHost.hidden = true;
  }
  if (controlHost && controlHost !== operationsHost) {
    controlHost.replaceChildren();
    controlHost.hidden = true;
  }
  operationsHost.hidden = false;
  contentHost.hidden = false;
  operationsHost.replaceChildren();
  contentHost.replaceChildren();

  const content = document.createElement("div");
  content.className = "workspacekit-layout-v2 workspacekit-layout-v2-palette";
  const buttons = new Map();
  let lastMessage = "";
  let lastTone = "neutral";

  const spacingInput = document.createElement("input");
  spacingInput.className = "workspacekit-layout-v2-number workspacekit-layout-v2-spacing-number";
  spacingInput.type = "number";
  spacingInput.min = "0";
  spacingInput.max = "2000";
  spacingInput.step = "1";
  spacingInput.value = String(readLayoutSpacing(storage));
  spacingInput.title = t("layout.spacing.value");
  spacingInput.setAttribute("aria-label", t("layout.spacing.value"));
  spacingInput.addEventListener("change", () => {
    const value = Math.max(0, Math.min(2000, Number(spacingInput.value) || 0));
    spacingInput.value = String(value);
    setLayoutSpacing(value, storage);
  });

  const selectionText = (selection) => t("layout.selectedTargets", {
    count: selection.selectedCount,
    nodes: selection.nodeTargets.length,
    groups: selection.groupTargets.length,
  });

  const showBottomStatus = (selection = controller.selection()) => {
    const pieces = [t("layout.headerTitle")];
    if (lastMessage) pieces.push(lastMessage);
    pieces.push(selectionText(selection));
    status?.show?.({ text: pieces.join(" · "), tone: lastTone });
  };

  const execute = (commandId) => {
    const definition = LAYOUT_COMMANDS[commandId];
    const spacing = Number(spacingInput.value);
    const result = controller.execute(commandId, definition?.acceptsSpacing ? { spacing } : {});
    if (result.ok) {
      const label = definition ? t(definition.labelKey) : commandId;
      lastMessage = t("layout.executed", { command: label });
      lastTone = "success";
    } else {
      const state = controller.state(commandId);
      lastMessage = reasonMessage(result.reason, state.minimumSelection);
      lastTone = "warning";
    }
    refresh();
  };

  const controls = document.createElement("div");
  controls.className = "workspacekit-layout-v2-options";
  const displayModeButton = document.createElement("button");
  displayModeButton.type = "button";
  displayModeButton.className = "workspacekit-layout-v2-display-mode";
  displayModeButton.textContent = t("layout.displayMode");
  displayModeButton.title = t("layout.displayMode.tooltip");
  displayModeButton.setAttribute("aria-label", t("layout.displayMode.tooltip"));
  displayModeButton.addEventListener("click", (event) => {
    event.preventDefault();
    focusLayoutDisplaySettings(document);
  });

  const spacingGroup = document.createElement("div");
  spacingGroup.className = "workspacekit-layout-v2-spacing-accent";
  spacingGroup.dataset.layoutSpacingGroup = "true";
  spacingGroup.append(spacingInput);
  for (const id of SPACING_COMMANDS) {
    const button = createCommandButton(document, id, execute);
    button.classList.add("workspacekit-layout-v2-spacing-command");
    buttons.set(id, button);
    spacingGroup.append(button);
  }
  controls.append(displayModeButton, spacingGroup);
  operationsHost.append(controls);

  const primaryGrid = document.createElement("div");
  primaryGrid.className = "workspacekit-layout-v2-primary-grid";
  PRIMARY_COMMAND_ROWS.forEach((commandIds, rowIndex) => {
    const row = document.createElement("div");
    row.className = "workspacekit-layout-v2-primary-row";
    row.dataset.layoutPrimaryRow = String(rowIndex + 1);
    for (const id of commandIds) {
      const button = createCommandButton(document, id, execute);
      buttons.set(id, button);
      row.append(button);
    }
    primaryGrid.append(row);
  });
  content.append(primaryGrid);

  const sizeGrid = document.createElement("div");
  sizeGrid.className = "workspacekit-layout-v2-size-grid";
  sizeGrid.dataset.layoutSizeGrid = "true";
  for (const id of SIZE_COMMANDS) {
    const button = createCommandButton(document, id, execute);
    buttons.set(id, button);
    sizeGrid.append(button);
  }
  content.append(sizeGrid);
  contentHost.append(content);

  function refresh() {
    const selection = controller.selection();
    content.style.setProperty(
      "--workspacekit-layout-command-icon-size",
      `${readLayoutCommandIconSize(storage)}px`,
    );
    for (const [id, button] of buttons) {
      const state = controller.state(id);
      button.disabled = !state.enabled;
      button.dataset.commandState = state.enabled ? "available" : "disabled";
      button.setAttribute("aria-disabled", String(!state.enabled));
    }
    showBottomStatus(selection);
  }

  const queueRefresh = () => {
    lastMessage = "";
    lastTone = "neutral";
    queueMicrotask(refresh);
  };
  document.addEventListener("click", queueRefresh);
  document.addEventListener("keyup", queueRefresh, true);
  document.addEventListener("pointerup", queueRefresh, true);
  document.addEventListener("workspacekit-layout:presentation-changed", queueRefresh);
  refresh();

  return () => {
    document.removeEventListener("click", queueRefresh);
    document.removeEventListener("keyup", queueRefresh, true);
    document.removeEventListener("pointerup", queueRefresh, true);
    document.removeEventListener("workspacekit-layout:presentation-changed", queueRefresh);
    status?.clear?.();
    headerHost?.replaceChildren?.();
    operationsHost.replaceChildren();
    if (controlHost && controlHost !== operationsHost) controlHost.replaceChildren();
    contentHost.replaceChildren();
  };
}
