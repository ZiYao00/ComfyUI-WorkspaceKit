import { LAYOUT_COMMANDS } from "./command-registry.js";
import { createLayoutCommandIcon } from "./icons.js";
import {
  emitLayoutPresentationChanged,
  readLayoutCommandIconSize,
  readLayoutFloatingPosition,
  readLayoutPresentationMode,
  setLayoutFloatingPosition,
  setLayoutPresentationMode,
} from "./preferences.js";
import { PRIMARY_COMMAND_GROUPS } from "./presentation-commands.js";
import { ensureLayoutStyles } from "./styles.js";
import { t } from "../core/i18n.js";

const EDGE_MARGIN = 8;
const DEFAULT_TOP = 72;

function commandLabel(commandId) {
  const definition = LAYOUT_COMMANDS[commandId];
  if (!definition) return commandId;
  const tooltipKey = `${definition.labelKey}.tooltip`;
  const tooltip = t(tooltipKey);
  return tooltip === tooltipKey ? t(definition.labelKey) : tooltip;
}

function numberFromCss(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return NaN;
  const numeric = Number.parseFloat(value);
  return Number.isFinite(numeric) ? numeric : NaN;
}

function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

function visibleWorkspaceShellRect(document) {
  const shells = [...(document?.querySelectorAll?.(".workspace2-shell") ?? [])];
  for (let index = shells.length - 1; index >= 0; index -= 1) {
    const rect = shells[index]?.getBoundingClientRect?.();
    if (rect && rect.width > 0 && rect.height > 0) return rect;
  }
  return null;
}

function rectanglesOverlap(left, top, width, height, rect, margin = 0) {
  if (!rect) return false;
  return left < rect.right + margin
    && left + width > rect.left - margin
    && top < rect.bottom + margin
    && top + height > rect.top - margin;
}

function avoidWorkspaceShell({ left, top, width, height, viewport, shellRect }) {
  if (!rectanglesOverlap(left, top, width, height, shellRect, EDGE_MARGIN)) return { left, top };
  const leftSpace = shellRect.left - EDGE_MARGIN;
  const rightSpace = viewport.width - shellRect.right - EDGE_MARGIN;
  if (leftSpace >= width + EDGE_MARGIN) {
    return { left: shellRect.left - width - EDGE_MARGIN, top };
  }
  if (rightSpace >= width + EDGE_MARGIN) {
    return { left: shellRect.right + EDGE_MARGIN, top };
  }
  return { left: clamp((viewport.width - width) / 2, EDGE_MARGIN, Math.max(EDGE_MARGIN, viewport.width - width - EDGE_MARGIN)), top };
}

export function createLayoutFloatingToolbar({
  document = globalThis.document,
  storage = globalThis.localStorage,
  controller,
} = {}) {
  let root = null;
  let dragHandle = null;
  let closeButton = null;
  let disposed = false;
  let installed = false;
  let dragging = null;
  let lastStoredPositionToken = "";
  const buttons = new Map();

  const view = () => document?.defaultView ?? globalThis;

  function createCommandButton(commandId) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workspacekit-layout-floating-button";
    button.dataset.commandId = commandId;
    const icon = createLayoutCommandIcon(document, commandId);
    if (icon) button.append(icon);
    const label = commandLabel(commandId);
    button.title = label;
    button.setAttribute("aria-label", label);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (button.disabled) return;
      controller.execute(commandId);
      queueMicrotask(refresh);
    });
    buttons.set(commandId, button);
    return button;
  }

  function build() {
    if (root || !document?.createElement || !document.body) return root;
    ensureLayoutStyles(document);
    root = document.createElement("div");
    root.className = "workspacekit-layout-floating-toolbar";
    root.dataset.workspacekitLayoutFloating = "true";
    root.setAttribute("role", "toolbar");
    root.setAttribute("aria-label", t("layout.title"));

    dragHandle = document.createElement("button");
    dragHandle.type = "button";
    dragHandle.className = "workspacekit-layout-floating-handle";
    dragHandle.textContent = "⠿";
    dragHandle.title = t("layout.toolbar.drag");
    dragHandle.setAttribute("aria-label", t("layout.toolbar.drag"));
    dragHandle.addEventListener("pointerdown", startDrag);
    root.append(dragHandle);

    PRIMARY_COMMAND_GROUPS.forEach((group, index) => {
      if (index > 0) {
        const divider = document.createElement("span");
        divider.className = "workspacekit-layout-floating-divider";
        divider.setAttribute("aria-hidden", "true");
        root.append(divider);
      }
      for (const commandId of group) root.append(createCommandButton(commandId));
    });

    closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "workspacekit-layout-floating-close";
    closeButton.textContent = "×";
    closeButton.title = t("layout.toolbar.close");
    closeButton.setAttribute("aria-label", t("layout.toolbar.close"));
    closeButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      setLayoutPresentationMode("none", storage);
      emitLayoutPresentationChanged(document, storage);
    });
    root.append(closeButton);
    return root;
  }

  function viewportSize() {
    const win = view();
    return {
      width: Number(win?.innerWidth) || 1920,
      height: Number(win?.innerHeight) || 1080,
    };
  }

  function positionToken(position) {
    try { return JSON.stringify(position ?? null); } catch { return ""; }
  }

  function resolvePosition() {
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const viewport = viewportSize();
    const stored = readLayoutFloatingPosition(storage);
    const token = positionToken(stored);

    let left = numberFromCss(stored?.left);
    let top = numberFromCss(stored?.top);
    const right = numberFromCss(stored?.right);
    const bottom = numberFromCss(stored?.bottom);
    const useDefault = stored?.default === true;

    if (!Number.isFinite(left) && Number.isFinite(right)) left = viewport.width - right - rect.width;
    if (!Number.isFinite(top) && Number.isFinite(bottom)) top = viewport.height - bottom - rect.height;
    // A fresh unified install starts near the visible canvas center rather than
    // the browser's right edge, where the WorkspaceKit sidebar lives.
    if (useDefault || !Number.isFinite(left)) left = (viewport.width - rect.width) / 2;
    if (useDefault || !Number.isFinite(top)) top = DEFAULT_TOP;

    left = clamp(left, EDGE_MARGIN, Math.max(EDGE_MARGIN, viewport.width - rect.width - EDGE_MARGIN));
    top = clamp(top, EDGE_MARGIN, Math.max(EDGE_MARGIN, viewport.height - rect.height - EDGE_MARGIN));
    const visible = avoidWorkspaceShell({
      left,
      top,
      width: rect.width,
      height: rect.height,
      viewport,
      shellRect: visibleWorkspaceShellRect(document),
    });
    left = clamp(visible.left, EDGE_MARGIN, Math.max(EDGE_MARGIN, viewport.width - rect.width - EDGE_MARGIN));
    top = clamp(visible.top, EDGE_MARGIN, Math.max(EDGE_MARGIN, viewport.height - rect.height - EDGE_MARGIN));
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
    root.style.right = "auto";
    root.style.bottom = "auto";
    lastStoredPositionToken = token;
  }

  function ensureAttached() {
    build();
    if (!root) return false;
    if (!root.isConnected) {
      root.style.visibility = "hidden";
      document.body.append(root);
      resolvePosition();
      root.style.visibility = "";
    }
    return true;
  }

  function refresh() {
    if (disposed) return;
    const mode = readLayoutPresentationMode(storage);
    if (mode !== "pinned" && mode !== "selection") {
      root?.remove();
      return;
    }
    if (!ensureAttached()) return;

    const selection = controller.selection();
    const visible = mode === "pinned" || (mode === "selection" && selection.selectedCount >= 2);
    root.hidden = !visible;
    root.dataset.mode = mode;
    root.style.setProperty("--workspacekit-layout-command-icon-size", `${readLayoutCommandIconSize(storage)}px`);

    const storedToken = positionToken(readLayoutFloatingPosition(storage));
    if (!dragging) {
      // Re-constrain on every visible refresh. Opening/resizing the WK sidebar
      // can change the usable canvas area without changing our stored position.
      resolvePosition();
      lastStoredPositionToken = storedToken;
    }

    for (const [commandId, button] of buttons) {
      const state = controller.state(commandId);
      button.disabled = !state.enabled;
      button.setAttribute("aria-disabled", String(!state.enabled));
    }
  }

  function startDrag(event) {
    if (!root || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = root.getBoundingClientRect();
    dragging = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
    };
    try { dragHandle?.setPointerCapture?.(event.pointerId); } catch {}
    document.addEventListener("pointermove", onDragMove, true);
    document.addEventListener("pointerup", endDrag, true);
    document.addEventListener("pointercancel", endDrag, true);
  }

  function onDragMove(event) {
    if (!dragging || !root || (dragging.pointerId != null && event.pointerId !== dragging.pointerId)) return;
    const rect = root.getBoundingClientRect();
    const viewport = viewportSize();
    const left = clamp(
      dragging.left + (event.clientX - dragging.startX),
      EDGE_MARGIN,
      Math.max(EDGE_MARGIN, viewport.width - rect.width - EDGE_MARGIN),
    );
    const top = clamp(
      dragging.top + (event.clientY - dragging.startY),
      EDGE_MARGIN,
      Math.max(EDGE_MARGIN, viewport.height - rect.height - EDGE_MARGIN),
    );
    root.style.left = `${left}px`;
    root.style.top = `${top}px`;
  }

  function endDrag(event) {
    if (!dragging || (dragging.pointerId != null && event.pointerId !== dragging.pointerId)) return;
    try { dragHandle?.releasePointerCapture?.(dragging.pointerId); } catch {}
    dragging = null;
    document.removeEventListener("pointermove", onDragMove, true);
    document.removeEventListener("pointerup", endDrag, true);
    document.removeEventListener("pointercancel", endDrag, true);
    if (root) {
      setLayoutFloatingPosition({
        left: numberFromCss(root.style.left),
        top: numberFromCss(root.style.top),
      }, storage);
      lastStoredPositionToken = positionToken(readLayoutFloatingPosition(storage));
    }
  }

  const queueRefresh = () => queueMicrotask(refresh);
  const onPresentationChanged = () => queueMicrotask(refresh);
  const onResize = () => {
    if (root?.isConnected) resolvePosition();
  };

  function install() {
    if (disposed) return false;
    if (installed) {
      refresh();
      return true;
    }
    installed = true;
    document.addEventListener("click", queueRefresh);
    document.addEventListener("keyup", queueRefresh, true);
    document.addEventListener("pointerup", queueRefresh, true);
    document.addEventListener("workspacekit-layout:presentation-changed", onPresentationChanged);
    view()?.addEventListener?.("resize", onResize);
    refresh();
    return true;
  }

  function dispose() {
    disposed = true;
    document.removeEventListener("click", queueRefresh);
    document.removeEventListener("keyup", queueRefresh, true);
    document.removeEventListener("pointerup", queueRefresh, true);
    document.removeEventListener("workspacekit-layout:presentation-changed", onPresentationChanged);
    document.removeEventListener("pointermove", onDragMove, true);
    document.removeEventListener("pointerup", endDrag, true);
    document.removeEventListener("pointercancel", endDrag, true);
    view()?.removeEventListener?.("resize", onResize);
    root?.remove();
    root = null;
    buttons.clear();
  }

  return Object.freeze({ install, refresh, dispose });
}
