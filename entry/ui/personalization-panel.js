// Shared icon/color personalization dialog. Callers own all business data and
// provide only apply/reset callbacks, so this module cannot mutate workflows,
// templates, or node groups by itself.
const PERSONALIZE_EMOJIS = ["📁", "⭐", "🔖", "🏷️", "🔥", "🖼️", "🎨", "🧩", "⚙️", "📦", "📝", "❤️", "💡", "🎬", "🧠", "✨"];
const PERSONALIZE_COLORS = ["", "#0A84FF", "#30D158", "#FF9F0A", "#FF453A", "#BF5AF2", "#FF375F", "#FFD60A", "#8E8E93"];

export function createPersonalizationPanel({ document, window, translate, applyDecoratedIcon, defaultFolderIconClass, schedule = setTimeout, onError = console.error }) {
  function closePersonalizationPanel() {
    const panel = document.querySelector(".workspace2-personalize-panel");
    if (panel?.workspace2CloseHandler) {
      document.removeEventListener("pointerdown", panel.workspace2CloseHandler, true);
      document.removeEventListener("keydown", panel.workspace2CloseHandler, true);
    }
    panel?.remove();
  }

  function clampFloatingPanel(left, top, width = 282, height = 360) {
    const margin = 10;
    return {
      left: Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin)),
      top: Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin)),
    };
  }

  function openPersonalizationPanel(options) {
    closePersonalizationPanel();
    const { title = translate("folder.personalizeTitle"), name = "", icon = "", color = "", anchor = null, onApply, onReset } = options || {};
    let selectedIcon = String(icon || "").trim();
    let selectedColor = String(color || "").trim();
    const panel = document.createElement("div");
    panel.className = "workspace2-personalize-panel";
    const anchorRect = anchor?.getBoundingClientRect?.();
    const x = Number(anchor?.clientX ?? anchorRect?.left ?? window.innerWidth / 2);
    const y = Number(anchor?.clientY ?? anchorRect?.bottom ?? window.innerHeight / 2);
    const pos = clampFloatingPanel(x, y);
    panel.style.left = String(pos.left) + "px";
    panel.style.top = String(pos.top) + "px";
    panel.addEventListener("pointerdown", (event) => event.stopPropagation(), true);
    panel.addEventListener("click", (event) => event.stopPropagation());
    panel.addEventListener("contextmenu", (event) => event.preventDefault());

    const heading = document.createElement("div");
    heading.className = "workspace2-personalize-title";
    heading.textContent = title;
    const preview = document.createElement("div");
    preview.className = "workspace2-personalize-preview";
    const previewIcon = document.createElement("span");
    const previewName = document.createElement("div");
    previewName.className = "workspace2-personalize-preview-name";
    previewName.textContent = name || title;
    preview.append(previewIcon, previewName);
    const iconLabel = document.createElement("div");
    iconLabel.className = "workspace2-personalize-label";
    iconLabel.textContent = translate("folder.personalizeIcon");
    const iconGrid = document.createElement("div");
    iconGrid.className = "workspace2-personalize-grid";
    const colorLabel = document.createElement("div");
    colorLabel.className = "workspace2-personalize-label";
    colorLabel.textContent = translate("folder.personalizeColor");
    const colorGrid = document.createElement("div");
    colorGrid.className = "workspace2-personalize-grid";
    const colorRow = document.createElement("div");
    colorRow.className = "workspace2-personalize-color-row";
    const colorText = document.createElement("div");
    colorText.className = "workspace2-personalize-label";
    colorText.textContent = "Color";
    const colorInput = document.createElement("input");
    colorInput.type = "color";
    colorInput.value = /^#[0-9a-f]{6}$/i.test(selectedColor) ? selectedColor : "#0A84FF";
    colorRow.append(colorText, colorInput);

    const refresh = () => {
      applyDecoratedIcon(previewIcon, selectedIcon, selectedColor, defaultFolderIconClass);
      iconGrid.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.dataset.icon === selectedIcon));
      colorGrid.querySelectorAll("button").forEach((button) => button.classList.toggle("is-active", button.dataset.color === selectedColor));
    };
    const defaultIcon = document.createElement("button");
    defaultIcon.type = "button";
    defaultIcon.className = "workspace2-personalize-choice";
    defaultIcon.textContent = "∅";
    defaultIcon.title = translate("folder.personalizeDefault");
    defaultIcon.dataset.icon = "";
    defaultIcon.addEventListener("click", () => { selectedIcon = ""; refresh(); });
    iconGrid.append(defaultIcon);
    for (const emoji of PERSONALIZE_EMOJIS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "workspace2-personalize-choice";
      button.textContent = emoji;
      button.dataset.icon = emoji;
      button.addEventListener("click", () => { selectedIcon = emoji; refresh(); });
      iconGrid.append(button);
    }
    for (const swatch of PERSONALIZE_COLORS) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "workspace2-personalize-swatch";
      button.title = swatch || translate("folder.personalizeDefault");
      button.dataset.color = swatch;
      if (swatch) button.style.setProperty("--workspace2-swatch-color", swatch);
      else button.textContent = "∅";
      button.addEventListener("click", () => { selectedColor = swatch; if (swatch) colorInput.value = swatch; refresh(); });
      colorGrid.append(button);
    }
    colorInput.addEventListener("input", () => { selectedColor = colorInput.value; refresh(); });

    const actions = document.createElement("div");
    actions.className = "workspace2-personalize-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.textContent = translate("folder.personalizeCancel");
    cancel.addEventListener("click", closePersonalizationPanel);
    const reset = document.createElement("button");
    reset.type = "button";
    reset.textContent = translate("folder.personalizeReset");
    reset.addEventListener("click", async () => {
      try { await onReset?.(); closePersonalizationPanel(); }
      catch (error) { onError("[Workspace2] personalize reset failed", error); }
    });
    const apply = document.createElement("button");
    apply.type = "button";
    apply.className = "is-primary";
    apply.textContent = translate("folder.personalizeApply");
    apply.addEventListener("click", async () => {
      try { await onApply?.({ icon: selectedIcon, color: selectedColor }); closePersonalizationPanel(); }
      catch (error) { onError("[Workspace2] personalize apply failed", error); }
    });
    actions.append(cancel, reset, apply);
    panel.append(heading, preview, iconLabel, iconGrid, colorLabel, colorGrid, colorRow, actions);
    document.body.append(panel);
    refresh();
    panel.workspace2CloseHandler = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        closePersonalizationPanel();
        return;
      }
      if (event.type === "pointerdown" && !panel.contains(event.target)) closePersonalizationPanel();
    };
    schedule(() => {
      document.addEventListener("pointerdown", panel.workspace2CloseHandler, true);
      document.addEventListener("keydown", panel.workspace2CloseHandler, true);
    }, 0);
  }

  return { closePersonalizationPanel, clampFloatingPanel, openPersonalizationPanel };
}
