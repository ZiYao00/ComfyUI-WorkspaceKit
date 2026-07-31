function appendContent(element, content) {
  if (content === undefined || content === null) return;
  if (typeof content === "string" || typeof content === "number") {
    element.textContent = String(content);
    return;
  }
  element.append(content);
}

function createButton(document, className, { label, content, disabled = false, onPress } = {}) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  if (label) {
    button.title = label;
    button.setAttribute("aria-label", label);
  }
  button.disabled = Boolean(disabled);
  appendContent(button, content ?? label ?? "");
  if (typeof onPress === "function") {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      onPress(event);
    });
  }
  return button;
}

export function createPanelUiPrimitives(document = globalThis.document) {
  if (!document?.createElement) throw new TypeError("Panel UI primitives require a document.");

  const createRoot = () => {
    const element = document.createElement("section");
    element.className = "workspacekit-ui-root";
    return element;
  };

  const createModuleHeader = ({ title, status = "", statusDataset = "" } = {}) => {
    const element = document.createElement("div");
    // Existing product classes keep this primitive visually identical inside
    // WorkspaceKit. UI-Kit classes let the generated Vendor stay standalone.
    element.className = "workspace2-header workspacekit-ui-header";
    const titleElement = document.createElement("div");
    titleElement.className = "workspace2-title workspacekit-ui-header-title";
    titleElement.textContent = title || "";
    const statusElement = document.createElement("div");
    statusElement.className = "workspace2-status workspacekit-ui-header-status";
    statusElement.textContent = status || "";
    statusElement.title = status || "";
    if (statusDataset) statusElement.dataset[statusDataset] = "1";
    element.append(titleElement, statusElement);
    return {
      element,
      title: titleElement,
      status: statusElement,
      setStatus(value = "") {
        statusElement.textContent = value;
        statusElement.title = value;
      },
    };
  };

  const createIconButton = (options = {}) => createButton(document, "workspacekit-ui-icon-button", options);
  const createButtonControl = (options = {}) => createButton(document, "workspacekit-ui-button", options);

  const createSection = ({ title, description = "", actions = [] } = {}) => {
    const element = document.createElement("section");
    element.className = "workspacekit-ui-section";
    const head = document.createElement("div");
    head.className = "workspacekit-ui-section-head";
    const titleElement = document.createElement("div");
    titleElement.className = "workspacekit-ui-section-title";
    titleElement.textContent = title || "";
    head.append(titleElement, ...actions.filter(Boolean));
    element.append(head);
    if (description) {
      const descriptionElement = document.createElement("div");
      descriptionElement.className = "workspacekit-ui-section-description";
      descriptionElement.textContent = description;
      element.append(descriptionElement);
    }
    return { element, head, title: titleElement };
  };

  const createControlRow = ({ leading, trailing = [] } = {}) => {
    const element = document.createElement("div");
    element.className = "workspacekit-ui-control-row workspacekit-ui-product-toolbar";
    const leadingElement = document.createElement("div");
    leadingElement.className = "workspacekit-ui-control-row-leading";
    appendContent(leadingElement, leading);
    const trailingElement = document.createElement("div");
    trailingElement.className = "workspacekit-ui-control-row-trailing";
    trailingElement.append(...trailing.filter(Boolean));
    element.append(leadingElement, trailingElement);
    return { element, leading: leadingElement, trailing: trailingElement };
  };

  const createSegmentedControl = ({ label = "", value, options = [], onChange } = {}) => {
    const element = document.createElement("div");
    element.className = "workspacekit-ui-segmented";
    element.setAttribute("role", "radiogroup");
    if (label) element.setAttribute("aria-label", label);
    const buttons = new Map();
    const setValue = (nextValue) => {
      for (const [id, button] of buttons) {
        button.setAttribute("aria-checked", String(id === nextValue));
      }
    };
    for (const option of options) {
      const button = createButton(document, "workspacekit-ui-segment", {
        label: option.label,
        content: option.content ?? option.label,
        disabled: option.disabled,
        onPress: () => { setValue(option.id); onChange?.(option.id); },
      });
      button.setAttribute("role", "radio");
      button.setAttribute("aria-checked", String(option.id === value));
      buttons.set(option.id, button);
      element.append(button);
    }
    return { element, buttons, setValue };
  };

  const createRangeControl = ({ label = "", value = 0, min = 0, max = 100, step = 1, formatValue = String, onInput } = {}) => {
    const element = document.createElement("label");
    element.className = "workspacekit-ui-range-row workspacekit-ui-product-range";
    const input = document.createElement("input");
    input.type = "range";
    input.className = "workspacekit-ui-range";
    input.min = String(min);
    input.max = String(max);
    input.step = String(step);
    input.value = String(value);
    input.setAttribute("aria-label", label);
    const valueElement = document.createElement("output");
    valueElement.className = "workspacekit-ui-range-value";
    const update = (nextValue) => {
      valueElement.textContent = formatValue(nextValue);
      input.setAttribute("aria-valuetext", valueElement.textContent);
    };
    input.addEventListener("input", () => { update(input.value); onInput?.(input.value); });
    update(value);
    element.append(input, valueElement);
    return { element, input, value: valueElement, setValue(nextValue) { input.value = String(nextValue); update(nextValue); } };
  };

  const createCommandGrid = ({ columns = 6, commands = [] } = {}) => {
    const element = document.createElement("div");
    element.className = "workspacekit-ui-command-grid";
    element.style.setProperty("--workspacekit-ui-grid-columns", String(Math.max(1, Number(columns) || 1)));
    const buttons = new Map();
    for (const command of commands) {
      const button = createButton(document, "workspacekit-ui-command", {
        label: command.label,
        content: command.content ?? command.label,
        disabled: command.disabled,
        onPress: command.onPress,
      });
      buttons.set(command.id, button);
      element.append(button);
    }
    return { element, buttons };
  };

  // A neutral B/C/D slot stack for both standalone family panels and hosted
  // Providers. Feature modules own their contents; the Template owns only
  // spacing, scrolling, and the shared surface geometry.
  const createContentSlots = () => {
    const element = document.createElement("div");
    element.className = "workspacekit-ui-slot-stack";
    const header = document.createElement("div");
    header.className = "workspacekit-ui-host-header";
    const context = document.createElement("div");
    context.className = "workspacekit-ui-host-context";
    const content = document.createElement("div");
    content.className = "workspacekit-ui-host-content";
    element.append(header, context, content);
    return { element, header, context, content };
  };

  const createStandaloneShell = ({ title = "", settingsLabel = "", settingsContent, onSettings } = {}) => {
    const shell = createRoot();
    shell.classList.add("workspacekit-ui-standalone-shell");
    const tabs = document.createElement("div");
    tabs.className = "workspacekit-ui-standalone-tabs";
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = "workspacekit-ui-standalone-tab";
    tab.textContent = title;
    tab.setAttribute("aria-current", "page");
    const settings = createIconButton({ label: settingsLabel, content: settingsContent, onPress: onSettings });
    const content = document.createElement("div");
    content.className = "workspacekit-ui-standalone-content";
    tabs.append(tab, settings);
    shell.append(tabs, content);
    return { shell, tabs, tab, settings, content };
  };

  return Object.freeze({
    createRoot,
    createModuleHeader,
    createSection,
    createControlRow,
    createButton: createButtonControl,
    createIconButton,
    createSegmentedControl,
    createRangeControl,
    createCommandGrid,
    createContentSlots,
    createStandaloneShell,
  });
}
