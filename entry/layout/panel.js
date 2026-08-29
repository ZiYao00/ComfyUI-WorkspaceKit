import { LAYOUT_COMMANDS } from "./command-registry.js";
import { createLayoutCommandIcon } from "./icons.js";
import {
  isLayoutTopbarEnabled,
  readLayoutSpacing,
  setLayoutSpacing,
  setLayoutTopbarEnabled,
} from "./preferences.js";
import { ensureLayoutStyles } from "./styles.js";
import { t } from "../core/i18n.js";

const PRIMARY_GROUPS = Object.freeze([
  Object.freeze([
    "workspacekit.layout.align.left",
    "workspacekit.layout.align.horizontal-center",
    "workspacekit.layout.align.right",
  ]),
  Object.freeze([
    "workspacekit.layout.align.top",
    "workspacekit.layout.align.vertical-center",
    "workspacekit.layout.align.bottom",
  ]),
  Object.freeze([
    "workspacekit.layout.distribute.horizontal",
    "workspacekit.layout.distribute.vertical",
  ]),
]);

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

function createDivider(document) {
  const divider = document.createElement("span");
  divider.className = "workspacekit-layout-v2-divider";
  divider.setAttribute("aria-hidden", "true");
  return divider;
}

export function renderLayoutPanel({
  document = globalThis.document,
  storage = globalThis.localStorage,
  headerHost,
  toolbarHost,
  controlsHost,
  contextHost,
  contentHost,
  controller,
  ui,
} = {}) {
  const controlHost = controlsHost ?? contextHost;
  if (!document?.createElement || !headerHost || !controlHost || !contentHost || !controller || !ui) {
    throw new TypeError("WorkspaceKit Layout panel requires UI Kit hosts and a Layout controller.");
  }
  ensureLayoutStyles(document);
  headerHost.hidden = false;
  controlHost.hidden = false;
  contentHost.hidden = false;
  if (toolbarHost) {
    toolbarHost.hidden = true;
    toolbarHost.replaceChildren();
  }

  headerHost.replaceChildren();
  controlHost.replaceChildren();
  contentHost.replaceChildren();

  const header = ui.createModuleHeader({ title: t("layout.headerTitle") });
  headerHost.append(header.element);

  // Keep the persistent presentation preference out of the command surface.
  // This row is intentionally quiet; the main panel below behaves like a
  // professional alignment palette rather than a Settings page.
  const controls = document.createElement("div");
  controls.className = "workspacekit-layout-v2-options";
  const topbarLabel = document.createElement("label");
  topbarLabel.className = "workspacekit-layout-v2-toggle";
  const topbarInput = document.createElement("input");
  topbarInput.type = "checkbox";
  topbarInput.checked = isLayoutTopbarEnabled(storage);
  topbarInput.addEventListener("change", () => {
    setLayoutTopbarEnabled(topbarInput.checked, storage);
    document.dispatchEvent(new CustomEvent("workspacekit-layout:topbar-enabled", {
      detail: { enabled: topbarInput.checked },
    }));
  });
  topbarLabel.append(topbarInput, document.createTextNode(t("layout.topbar.enabled")));
  controls.append(topbarLabel);
  controlHost.append(controls);

  const content = document.createElement("div");
  content.className = "workspacekit-layout-v2 workspacekit-layout-v2-palette";
  const buttons = new Map();

  const execute = (commandId) => {
    const definition = LAYOUT_COMMANDS[commandId];
    const spacing = Number(spacingInput.value);
    const result = controller.execute(commandId, definition?.acceptsSpacing ? { spacing } : {});
    if (result.ok) {
      const label = definition ? t(definition.labelKey) : commandId;
      header.setStatus(t("layout.executed", { command: label }));
    } else {
      const state = controller.state(commandId);
      header.setStatus(reasonMessage(result.reason, state.minimumSelection));
    }
    queueMicrotask(refresh);
  };

  // Adobe-like primary strip:
  // [left][center][right] | [top][middle][bottom] | [distribute H][distribute V]
  const primaryStrip = document.createElement("div");
  primaryStrip.className = "workspacekit-layout-v2-toolstrip";
  PRIMARY_GROUPS.forEach((group, index) => {
    if (index > 0) primaryStrip.append(createDivider(document));
    const cluster = document.createElement("div");
    cluster.className = "workspacekit-layout-v2-cluster";
    for (const id of group) {
      const button = createCommandButton(document, id, execute);
      buttons.set(id, button);
      cluster.append(button);
    }
    primaryStrip.append(cluster);
  });
  content.append(primaryStrip);

  // Numeric spacing stays visible because it changes command semantics, but the
  // two actions remain icon-first and adjacent to the value like Adobe panels.
  const spacingRow = document.createElement("div");
  spacingRow.className = "workspacekit-layout-v2-row";
  const spacingLabel = document.createElement("label");
  spacingLabel.className = "workspacekit-layout-v2-row-label";
  spacingLabel.textContent = t("layout.spacing.value");
  const spacingInput = document.createElement("input");
  spacingInput.className = "workspacekit-layout-v2-number";
  spacingInput.type = "number";
  spacingInput.min = "0";
  spacingInput.max = "2000";
  spacingInput.step = "1";
  spacingInput.value = String(readLayoutSpacing(storage));
  spacingInput.setAttribute("aria-label", t("layout.spacing.value"));
  spacingInput.addEventListener("change", () => {
    const value = Math.max(0, Math.min(2000, Number(spacingInput.value) || 0));
    spacingInput.value = String(value);
    setLayoutSpacing(value, storage);
  });
  const spacingActions = document.createElement("div");
  spacingActions.className = "workspacekit-layout-v2-cluster";
  for (const id of SPACING_COMMANDS) {
    const button = createCommandButton(document, id, execute);
    buttons.set(id, button);
    spacingActions.append(button);
  }
  spacingRow.append(spacingLabel, spacingInput, spacingActions);
  content.append(spacingRow);

  const sizeRow = document.createElement("div");
  sizeRow.className = "workspacekit-layout-v2-row workspacekit-layout-v2-size-row";
  const sizeLabel = document.createElement("span");
  sizeLabel.className = "workspacekit-layout-v2-row-label";
  sizeLabel.textContent = t("layout.section.size");
  const sizeActions = document.createElement("div");
  sizeActions.className = "workspacekit-layout-v2-cluster workspacekit-layout-v2-size-actions";
  for (const id of SIZE_COMMANDS) {
    const button = createCommandButton(document, id, execute);
    buttons.set(id, button);
    sizeActions.append(button);
  }
  sizeRow.append(sizeLabel, sizeActions);
  content.append(sizeRow);
  contentHost.append(content);

  function refresh() {
    const selection = controller.selection();
    header.setStatus(t("layout.selectedTargets", {
      count: selection.selectedCount,
      nodes: selection.nodeTargets.length,
      groups: selection.groupTargets.length,
    }));
    for (const [id, button] of buttons) {
      const state = controller.state(id);
      button.disabled = !state.enabled;
      button.dataset.commandState = state.enabled ? "available" : "disabled";
      button.setAttribute("aria-disabled", String(!state.enabled));
    }
    topbarInput.checked = isLayoutTopbarEnabled(storage);
  }

  const queueRefresh = () => queueMicrotask(refresh);
  document.addEventListener("click", queueRefresh);
  document.addEventListener("keyup", queueRefresh, true);
  document.addEventListener("pointerup", queueRefresh, true);
  document.addEventListener("workspacekit-layout:topbar-enabled", queueRefresh);
  refresh();

  return () => {
    document.removeEventListener("click", queueRefresh);
    document.removeEventListener("keyup", queueRefresh, true);
    document.removeEventListener("pointerup", queueRefresh, true);
    document.removeEventListener("workspacekit-layout:topbar-enabled", queueRefresh);
    headerHost.replaceChildren();
    controlHost.replaceChildren();
    contentHost.replaceChildren();
    if (toolbarHost) toolbarHost.replaceChildren();
  };
}
