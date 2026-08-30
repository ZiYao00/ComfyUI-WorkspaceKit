// Settings dialog control DOM only.  Persistence, background-effect behavior,
// dialog lifecycle, and global keyboard handling stay in entry.js because they
// coordinate with the WorkspaceKit sidebar and glass overlay.
export function createSettingsControls({ document, t, isolateComfyKeys }) {
  const settingsCheckbox = (label, checked, onChange, { disabled = false, title = "" } = {}) => {
    const row = document.createElement("div");
    row.className = "workspace2-settings-row";
    row.classList.toggle("is-disabled", disabled);
    if (title) row.title = title;
    const wrapper = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.disabled = Boolean(disabled);
    input.addEventListener("change", () => {
      if (!input.disabled) onChange?.(input.checked);
    });
    wrapper.append(input, document.createTextNode(label));
    row.append(wrapper);
    return row;
  };

  const settingsSelect = (label, value, options, onChange) => {
    const row = document.createElement("div");
    row.className = "workspace2-settings-row";
    const text = document.createElement("span");
    text.textContent = label;
    const select = document.createElement("select");
    for (const option of options) {
      const item = document.createElement("option");
      item.value = option.value;
      item.textContent = option.label;
      item.selected = option.value === value;
      select.append(item);
    }
    select.value = value;
    isolateComfyKeys(select);
    select.addEventListener("change", () => onChange?.(select.value));
    row.append(text, select);
    return row;
  };

  const settingsSection = (title, children = []) => {
    const section = document.createElement("section");
    section.className = "workspace2-settings-section";
    const heading = document.createElement("div");
    heading.className = "workspace2-settings-section-title";
    heading.textContent = title;
    section.append(heading, ...children);
    return section;
  };

  const settingsHelp = (text) => {
    const help = document.createElement("div");
    help.className = "workspace2-settings-help";
    help.textContent = text;
    return help;
  };

  const settingsShortcutGrid = () => {
    const shortcuts = [
      ["Shift + 1", t("settings.shortcuts.commands.openWorkflows")],
      ["Shift + 2", t("settings.shortcuts.commands.openNodes")],
      ["Shift + 3", t("settings.shortcuts.commands.openTemplates")],
      ["Shift + 4", t("settings.shortcuts.commands.openLayout")],
      ["Shift + 5", t("settings.shortcuts.commands.openTheme")],
      ["Alt + C", t("settings.shortcuts.commands.saveTemplate")],
    ];
    const grid = document.createElement("div");
    grid.className = "workspace2-settings-shortcut-grid";
    for (const [keys, label] of shortcuts) {
      const item = document.createElement("div");
      item.className = "workspace2-settings-shortcut-item";
      const key = document.createElement("span");
      key.className = "workspace2-settings-shortcut-key";
      key.textContent = keys;
      const text = document.createElement("span");
      text.className = "workspace2-settings-shortcut-label";
      text.textContent = label;
      item.append(key, text);
      grid.append(item);
    }
    return grid;
  };

  const settingsRange = (label, value, { min, max, step = 1, snap, onChange, disabled = false }) => {
    const row = document.createElement("div");
    row.className = "workspace2-settings-row";
    const text = document.createElement("span");
    text.textContent = label;
    const control = document.createElement("label");
    control.className = "workspace2-settings-range";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = String(step);
    slider.value = String(value);
    slider.disabled = disabled;
    row.classList.toggle("is-disabled", disabled);
    isolateComfyKeys(slider);
    const output = document.createElement("span");
    output.textContent = String(value);
    slider.addEventListener("input", () => {
      const next = typeof snap === "function" ? snap(slider.value) : Number(slider.value);
      slider.value = String(next);
      output.textContent = String(next);
      onChange?.(next);
    });
    control.append(slider, output);
    row.append(text, control);
    return row;
  };

  const settingsModeRange = (label, mode, selected, value, { min, max, snap, onChange, onSelect }) => {
    const row = document.createElement("div");
    row.className = "workspace2-settings-row workspace2-settings-mode-row";
    row.dataset.mode = mode;
    const choice = document.createElement("label");
    choice.className = "workspace2-settings-mode-choice";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "workspace2-background-mode";
    radio.value = mode;
    radio.checked = selected;
    const text = document.createElement("span");
    text.textContent = label;
    choice.append(radio, text);
    const control = document.createElement("label");
    control.className = "workspace2-settings-range";
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = String(min);
    slider.max = String(max);
    slider.step = "1";
    slider.value = String(value);
    slider.disabled = !selected;
    isolateComfyKeys(slider);
    const output = document.createElement("span");
    output.textContent = String(value);
    control.append(slider, output);
    row.classList.toggle("is-disabled", !selected);
    radio.addEventListener("change", () => {
      if (radio.checked) onSelect?.(mode);
    });
    slider.addEventListener("input", () => {
      const next = typeof snap === "function" ? snap(slider.value) : Number(slider.value);
      slider.value = String(next);
      output.textContent = String(next);
      onChange?.(next);
    });
    row.append(choice, control);
    return row;
  };

  const updateSettingsModeRange = (row, selected) => {
    const radio = row?.querySelector?.('input[type="radio"]');
    const slider = row?.querySelector?.('input[type="range"]');
    if (!radio || !slider) return;
    radio.checked = selected;
    slider.disabled = !selected;
    row.classList.toggle("is-disabled", !selected);
  };

  const settingsKeybinding = (label, commandId, display, { onCapture, onClear } = {}) => {
    const row = document.createElement("div");
    row.className = "workspace2-settings-row workspace2-settings-keybinding-row";
    row.dataset.workspace2CommandRow = commandId;
    const text = document.createElement("span");
    text.textContent = label;
    const control = document.createElement("div");
    control.className = "workspace2-settings-keybinding-control";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workspace2-settings-keybinding";
    button.dataset.workspace2CommandBinding = commandId;
    button.dataset.workspace2KeybindingCapture = "true";
    button.textContent = display;
    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "workspace2-settings-keybinding-clear";
    clear.title = t("settings.shortcuts.clear");
    clear.setAttribute?.("aria-label", t("settings.shortcuts.clear"));
    clear.textContent = "×";
    let listening = false;
    let previousText = display;
    button.addEventListener("click", () => {
      previousText = button.textContent || display;
      listening = true;
      button.classList.add("is-listening");
      button.textContent = t("settings.shortcuts.pressKeys");
      button.focus?.();
    });
    button.addEventListener("keydown", async (event) => {
      if (!listening) return;
      event.preventDefault?.();
      event.stopPropagation?.();
      event.stopImmediatePropagation?.();
      if (event.key === "Escape") {
        listening = false;
        button.classList.remove("is-listening");
        button.textContent = previousText;
        return;
      }
      // Browsers emit a keydown for the modifier before the final key in a
      // combination (for example Shift, then 4). Keep capture mode active until
      // a non-modifier key arrives.
      if (["Shift", "Control", "Alt", "Meta"].includes(event.key)) return;
      const accepted = await onCapture?.(event);
      listening = false;
      button.classList.remove("is-listening");
      if (accepted === false) button.textContent = previousText;
    });
    clear.addEventListener("click", () => onClear?.());
    isolateComfyKeys(button);
    isolateComfyKeys(clear);
    control.append(button, clear);
    row.append(text, control);
    return row;
  };

  const settingsPointerBinding = (label, action, modifier, buttonValue, { modifierOptions = [], buttonOptions = [], onChange } = {}) => {
    const row = document.createElement("div");
    row.className = "workspace2-settings-row workspace2-settings-pointer-binding-row";
    row.dataset.workspace2GroupPointerAction = action;
    const text = document.createElement("span");
    text.textContent = label;
    const control = document.createElement("div");
    control.className = "workspace2-settings-pointer-binding";
    const createSelect = (part, value, options) => {
      const select = document.createElement("select");
      select.dataset.workspace2GroupPointerPart = part;
      for (const option of options) {
        const item = document.createElement("option");
        item.value = option.value;
        item.textContent = option.label;
        select.append(item);
      }
      select.value = value;
      isolateComfyKeys(select);
      select.addEventListener("change", () => onChange?.(part, select.value));
      return select;
    };
    control.append(
      createSelect("modifier", modifier, modifierOptions),
      createSelect("button", buttonValue, buttonOptions),
    );
    row.append(text, control);
    return row;
  };

  return {
    settingsCheckbox,
    settingsSelect,
    settingsSection,
    settingsHelp,
    settingsShortcutGrid,
    settingsRange,
    settingsModeRange,
    updateSettingsModeRange,
    settingsKeybinding,
    settingsPointerBinding,
  };
}
