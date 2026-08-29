import { LAYOUT_COMMANDS } from "./command-registry.js";
import { createLayoutCommandIcon } from "./icons.js";
import { isLayoutTopbarEnabled } from "./preferences.js";
import { ensureLayoutStyles } from "./styles.js";
import { t } from "../core/i18n.js";

const TOPBAR_COMMANDS = Object.freeze([
  "workspacekit.layout.align.left",
  "workspacekit.layout.align.horizontal-center",
  "workspacekit.layout.align.right",
  "divider",
  "workspacekit.layout.align.top",
  "workspacekit.layout.align.vertical-center",
  "workspacekit.layout.align.bottom",
  "divider",
  "workspacekit.layout.distribute.horizontal",
  "workspacekit.layout.distribute.vertical",
]);

function commandLabel(commandId) {
  const definition = LAYOUT_COMMANDS[commandId];
  if (!definition) return commandId;
  const tooltipKey = `${definition.labelKey}.tooltip`;
  const tooltip = t(tooltipKey);
  return tooltip === tooltipKey ? t(definition.labelKey) : tooltip;
}

export function createLayoutTopbar({
  document = globalThis.document,
  storage = globalThis.localStorage,
  getMenuElement,
  controller,
  requestLater = (callback, delay = 0) => setTimeout(callback, delay),
} = {}) {
  let slot = null;
  let observer = null;
  let observedParent = null;
  let disposed = false;
  const buttons = new Map();

  function build() {
    if (slot) return slot;
    ensureLayoutStyles(document);
    slot = document.createElement("div");
    slot.className = "workspacekit-layout-topbar-slot";
    slot.dataset.workspacekitTopbarSlot = "layout";
    slot.setAttribute("role", "group");
    slot.setAttribute("aria-label", t("layout.title"));

    for (const item of TOPBAR_COMMANDS) {
      if (item === "divider") {
        const divider = document.createElement("span");
        divider.className = "workspacekit-layout-topbar-divider";
        divider.setAttribute("aria-hidden", "true");
        slot.append(divider);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "workspacekit-layout-topbar-button";
      const icon = createLayoutCommandIcon(document, item);
      if (icon) button.append(icon);
      const label = commandLabel(item);
      button.title = label;
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => {
        if (button.disabled) return;
        controller.execute(item);
        queueMicrotask(refresh);
      });
      buttons.set(item, button);
      slot.append(button);
    }
    return slot;
  }

  function place() {
    if (disposed || !slot || !isLayoutTopbarEnabled(storage)) return false;
    const parent = getMenuElement?.();
    if (!parent) return false;
    const saveSlot = [...parent.children].find((child) => child?.dataset?.workspacekitTopbarSlot === "save") ?? null;
    if (saveSlot) {
      if (slot.parentElement !== parent || slot.nextElementSibling !== saveSlot) {
        parent.insertBefore(slot, saveSlot);
        return true;
      }
      return false;
    }
    if (slot.parentElement !== parent) {
      parent.append(slot);
      return true;
    }
    return false;
  }

  function observe() {
    const parent = getMenuElement?.();
    if (!parent || parent === observedParent || typeof MutationObserver !== "function") return;
    observer?.disconnect();
    observedParent = parent;
    observer = new MutationObserver(() => { place(); });
    observer.observe(parent, { childList: true });
  }

  function refresh() {
    if (!slot) return;
    slot.hidden = !isLayoutTopbarEnabled(storage);
    if (slot.hidden) return;
    for (const [id, button] of buttons) {
      const state = controller.state(id);
      button.disabled = !state.enabled;
      button.setAttribute("aria-disabled", String(!state.enabled));
    }
  }

  function install() {
    if (disposed) return false;
    if (!isLayoutTopbarEnabled(storage)) {
      slot?.remove();
      return false;
    }
    const parent = getMenuElement?.();
    if (!parent) return false;
    build();
    observe();
    place();
    refresh();
    return true;
  }

  function installWhenReady() {
    if (install()) return true;
    requestLater(() => { if (!disposed) install(); }, 500);
    return false;
  }

  function onRefreshIntent() {
    queueMicrotask(refresh);
  }

  function onEnabled(event) {
    const enabled = event?.detail?.enabled !== false;
    if (!enabled) {
      slot?.remove();
      refresh();
      return;
    }
    installWhenReady();
  }

  document.addEventListener("click", onRefreshIntent);
  document.addEventListener("keyup", onRefreshIntent, true);
  document.addEventListener("pointerup", onRefreshIntent, true);
  document.addEventListener("workspacekit-layout:topbar-enabled", onEnabled);

  function dispose() {
    disposed = true;
    observer?.disconnect();
    observer = null;
    observedParent = null;
    slot?.remove();
    document.removeEventListener("click", onRefreshIntent);
    document.removeEventListener("keyup", onRefreshIntent, true);
    document.removeEventListener("pointerup", onRefreshIntent, true);
    document.removeEventListener("workspacekit-layout:topbar-enabled", onEnabled);
  }

  return Object.freeze({ install, installWhenReady, refresh, dispose });
}
