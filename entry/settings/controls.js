// Settings dialog control DOM only.  Persistence, background-effect behavior,
// dialog lifecycle, and global keyboard handling stay in entry.js because they
// coordinate with the WorkspaceKit sidebar and glass overlay.
export function createSettingsControls({ document, t, isolateComfyKeys }) {
  const settingsCheckbox = (label, checked, onChange) => {
    const row = document.createElement("div");
    row.className = "workspace2-settings-row";
    const wrapper = document.createElement("label");
    const input = document.createElement("input");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
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
      ["Shift + 1", t("settings.shortcuts.workflow")],
      ["Shift + 2", t("settings.shortcuts.nodes")],
      ["Shift + 3", t("settings.shortcuts.templates")],
      ["Shift + 4", t("settings.shortcuts.extension")],
      ["Alt + C", t("settings.shortcuts.saveTemplate")],
      ["Ctrl + G", t("settings.shortcuts.createGroup")],
      ["Shift + G", t("settings.shortcuts.ungroup")],
      [t("settings.shortcuts.shiftLeftClickKey"), t("settings.shortcuts.toggleGroupIgnore")],
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

  return {
    settingsCheckbox,
    settingsSelect,
    settingsSection,
    settingsHelp,
    settingsShortcutGrid,
    settingsRange,
    settingsModeRange,
    updateSettingsModeRange,
  };
}
