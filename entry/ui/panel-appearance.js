// WorkspaceKit panel appearance: opacity, frosted-glass overlay, and background
// compositing for the sidebar host. DOM- and shared-state-bound (unlike the pure
// numeric core/ui/panel-background-state.js). Owns behavior, not state: the glass
// portal element and render target live on the injected workspaceState because
// non-appearance code (panel open/close detection, rendering) reads them too.
//
// Injected dependencies (named to match the original identifiers so the moved
// function bodies are verbatim):
//   workspaceState              - shared mutable object (glassPortalElement,
//                                 renderTarget, opacityCleanupReady,
//                                 glassOverlayTrackingReady)
//   t                           - translation function
//   WORKSPACE2_TAB_ID           - sidebar tab id constant
//   isElementVisible            - shared DOM-visibility helper (stays in entry.js;
//                                 it has a non-appearance caller)
//   panelBackgroundMode, glassTransparency, panelOpacity, glassBlurPixels,
//   setPanelOpacityValue, setPanelBackgroundModeValue, setGlassBlurValue
//                               - getters/setters from createPanelBackgroundState
export function createPanelAppearance({
  workspaceState,
  t,
  WORKSPACE2_TAB_ID,
  isElementVisible,
  panelBackgroundMode,
  glassTransparency,
  panelOpacity,
  glassBlurPixels,
  setPanelOpacityValue,
  setPanelBackgroundModeValue,
  setGlassBlurValue,
}) {
  function isPanelGlassEnabled() {
    return panelBackgroundMode() === "glass";
  }
  
  function cleanupWorkspacePanelAncestors() {
    document.querySelectorAll(".workspace2-sidebar-transparent-root[data-workspace2-transparent-root='1']").forEach((node) => {
      node.classList.remove("workspace2-sidebar-transparent-root");
      node.removeAttribute("data-workspace2-transparent-root");
    });
  }

  function refreshWorkspacePanelAncestorsIfVisible() {
    const host = document.querySelector(".workspace2-host");
    if (isElementVisible(host)) {
      applyWorkspaceBackgroundEffect(host);
      syncWorkspaceGlassOverlay();
    } else {
      workspaceState.glassPortalElement?.classList.add("is-workspace2-overlay-hidden");
      cleanupWorkspacePanelAncestors();
    }
  }
  
  function disposeWorkspace2SidebarSurface() {
    // ComfyUI custom sidebar tabs receive a shared render host.  Hiding our
    // previous content left that host occupied, which made other custom tabs
    // require a close/reopen cycle before their first render.  Release only our
    // own DOM before the next tab's target click; never alter the shared sidebar
    // panel or its ancestors.
    workspaceState.glassPortalElement?.remove();
    workspaceState.glassPortalElement = null;
    const host = workspaceState.renderTarget;
    if (host?.isConnected) {
      host.replaceChildren();
      host.classList.remove("workspace2-host", "is-glass-background", "is-workspace2-surface-hidden");
      host.removeAttribute("style");
    }
    workspaceState.renderTarget = null;
    cleanupWorkspacePanelAncestors();
  }
  
  function findClosestSidebarTabButton(target) {
    const element = target instanceof Element
      ? target
      : target?.parentElement instanceof Element
        ? target.parentElement
        : null;
    if (!element) {
      return null;
    }
    const button = element.closest([
      ".side-bar-button",
      ".assets-tab-button",
      "[data-sidebar-tab-id]",
      "[data-tab-id]",
      "[role='tab']",
    ].join(","));
    if (button?.classList.contains("side-bar-button") && button.closest(".sidebar-item-group.mt-auto")) {
      return null;
    }
    return button;
  }
  
  function isWorkspace2SidebarTabButton(button) {
    if (!(button instanceof Element)) {
      return false;
    }
    if (button.classList.contains("workspace2-tab-button")) {
      return true;
    }
    const tabId = button.getAttribute("data-sidebar-tab-id")
      || button.getAttribute("data-tab-id")
      || button.getAttribute("data-id")
      || button.id
      || "";
    if (tabId === WORKSPACE2_TAB_ID) {
      return true;
    }
    const labels = [
      button.textContent || "",
      button.getAttribute("title") || "",
      button.getAttribute("aria-label") || "",
    ].map((label) => label.trim()).filter(Boolean);
    return labels.some((label) => label === t("workspace.title") || label === t("workspace.tooltip"));
  }
  
  function setupWorkspacePanelOpacityCleanup() {
    if (workspaceState.opacityCleanupReady) {
      return;
    }
    workspaceState.opacityCleanupReady = true;
    const scheduleRefresh = (event) => {
      if (event.target?.closest?.(".workspace2-host,.workspace2-shell,.workspace2-settings-backdrop,.workspace2-context-menu,.workspace2-menu")) {
        return;
      }
      const sidebarButton = findClosestSidebarTabButton(event.target);
      if (sidebarButton && !isWorkspace2SidebarTabButton(sidebarButton)) {
        window.setTimeout(refreshWorkspacePanelAncestorsIfVisible, 0);
        return;
      }
      window.setTimeout(refreshWorkspacePanelAncestorsIfVisible, 0);
      window.setTimeout(refreshWorkspacePanelAncestorsIfVisible, 160);
    };
    document.addEventListener("pointerdown", (event) => {
      const sidebarButton = findClosestSidebarTabButton(event.target);
      if (sidebarButton && !isWorkspace2SidebarTabButton(sidebarButton)) {
        disposeWorkspace2SidebarSurface();
      }
    }, true);
    document.addEventListener("click", scheduleRefresh, true);
  }
  
  function markWorkspacePanelAncestors(host) {
    cleanupWorkspacePanelAncestors();
    // ComfyUI custom sidebars share the outer application layout.  Only this
    // panel is an opaque backdrop for WorkspaceKit; marking ancestors can make a
    // third-party sidebar mount into a transparent or stale shared container.
    const sidebarPanel = host?.closest?.(".side-bar-panel");
    if (!sidebarPanel || !sidebarPanel.contains(host)) {
      return;
    }
    sidebarPanel.classList.add("workspace2-sidebar-transparent-root");
    sidebarPanel.setAttribute("data-workspace2-transparent-root", "1");
  }
  
  function applyWorkspaceBackgroundEffect(panel) {
    setupWorkspacePanelOpacityCleanup();
    if (!panel?.classList?.contains("workspace2-host") && !panel?.classList?.contains("workspace2-shell")) {
      return;
    }
    const glass = isPanelGlassEnabled();
    const glassOpacity = 100 - glassTransparency();
    const alpha = glass ? `${glassOpacity}%` : `${panelOpacity()}%`;
    // The user-facing 0–100 setting maps to 0–32px.  32px is a visibly dense
    // frosted material while avoiding an unbounded backdrop-filter cost.
    const blur = glass ? `${glassBlurPixels()}px` : "0px";
    const saturate = glass ? "1.35" : "1";
    const brightness = glass ? "1.08" : "1";
    const highlightAlpha = glass ? Math.max(0.008, Math.min(0.038, glassOpacity * 0.00075)) : 0;
    const highlight = glass ? `rgba(230, 235, 255, ${highlightAlpha.toFixed(3)})` : "transparent";
    const fillAlpha = glass
      ? Math.max(0.025, Math.min(0.30, glassOpacity * 0.009))
      : panelOpacity() / 100;
    const mistAlpha = glass ? Math.max(0.012, Math.min(0.12, glassOpacity * 0.0025)) : 0;
    const edgeAlpha = glass ? Math.max(0.055, Math.min(0.22, glassOpacity * 0.004)) : 0;
    const tabAlpha = glass ? Math.max(0.045, Math.min(0.18, glassOpacity * 0.0032)) : 0;
    const controlAlpha = glass ? Math.max(0.04, Math.min(0.18, glassOpacity * 0.0032)) : 0;
    const hoverAlpha = glass ? Math.max(0.065, Math.min(0.20, glassOpacity * 0.0038)) : 0;
    const panelFill = glass
      ? `rgba(24, 30, 46, ${fillAlpha.toFixed(3)})`
      : `color-mix(in srgb, var(--workspace2-shell-surface) ${alpha}, transparent)`;
    const panelMist = glass ? `rgba(245, 248, 255, ${mistAlpha.toFixed(3)})` : "transparent";
    const panelStroke = glass ? `rgba(255, 255, 255, ${edgeAlpha.toFixed(3)})` : "rgba(255, 255, 255, 0)";
    const panelCoolSheen = glass ? `rgba(132, 166, 255, ${Math.max(0.012, Math.min(0.075, glassOpacity * 0.0018)).toFixed(3)})` : "transparent";
    const panelTopSheen = glass ? `rgba(255, 255, 255, ${Math.max(0.008, Math.min(0.035, glassOpacity * 0.0008)).toFixed(3)})` : "transparent";
    const panelShade = glass ? `rgba(8, 12, 22, ${Math.max(0.012, Math.min(0.085, glassOpacity * 0.0017)).toFixed(3)})` : "transparent";
    const tabSurface = glass ? `rgba(255, 255, 255, ${tabAlpha.toFixed(3)})` : "";
    const controlSurface = glass ? `rgba(255, 255, 255, ${controlAlpha.toFixed(3)})` : "";
    const controlBorder = glass ? `rgba(255, 255, 255, ${Math.max(0.16, Math.min(0.28, edgeAlpha + 0.02)).toFixed(3)})` : "";
    const controlShadow = glass ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(9, 14, 24, 0.12)" : "";
    const hoverSurface = glass ? `rgba(255, 255, 255, ${hoverAlpha.toFixed(3)})` : "";
    panel?.style?.setProperty("--workspace2-panel-alpha", alpha);
    panel?.style?.setProperty("--workspace2-panel-blur", blur);
    panel?.style?.setProperty("--workspace2-panel-saturate", saturate);
    panel?.style?.setProperty("--workspace2-panel-brightness", brightness);
    panel?.style?.setProperty("--workspace2-glass-highlight", highlight);
    panel?.style?.setProperty("--workspace2-panel-fill", panelFill);
    panel?.style?.setProperty("--workspace2-panel-mist", panelMist);
    panel?.style?.setProperty("--workspace2-panel-stroke", panelStroke);
    panel?.style?.setProperty("--workspace2-panel-cool-sheen", panelCoolSheen);
    panel?.style?.setProperty("--workspace2-panel-top-sheen", panelTopSheen);
    panel?.style?.setProperty("--workspace2-panel-shade", panelShade);
    if (tabSurface) {
      panel?.style?.setProperty("--workspace2-tab-bg-glass", tabSurface);
    } else {
      panel?.style?.removeProperty?.("--workspace2-tab-bg-glass");
    }
    if (controlSurface) {
      panel?.style?.setProperty("--workspace2-control-bg-glass", controlSurface);
      panel?.style?.setProperty("--workspace2-control-border-glass", controlBorder);
      panel?.style?.setProperty("--workspace2-control-shadow-glass", controlShadow);
      panel?.style?.setProperty("--workspace2-hover-glass", hoverSurface);
    } else {
      panel?.style?.removeProperty?.("--workspace2-control-bg-glass");
      panel?.style?.removeProperty?.("--workspace2-control-border-glass");
      panel?.style?.removeProperty?.("--workspace2-control-shadow-glass");
      panel?.style?.removeProperty?.("--workspace2-hover-glass");
    }
    panel?.classList?.toggle("is-glass-background", glass);
    if (panel?.classList?.contains("workspace2-host")) {
      markWorkspacePanelAncestors(panel);
      panel.querySelectorAll?.(".workspace2-shell").forEach((node) => {
        node.style.setProperty("--workspace2-panel-alpha", alpha);
        node.style.setProperty("--workspace2-panel-blur", blur);
        node.style.setProperty("--workspace2-panel-saturate", saturate);
        node.style.setProperty("--workspace2-panel-brightness", brightness);
        node.style.setProperty("--workspace2-glass-highlight", highlight);
        node.style.setProperty("--workspace2-panel-fill", panelFill);
        node.style.setProperty("--workspace2-panel-mist", panelMist);
        node.style.setProperty("--workspace2-panel-stroke", panelStroke);
        node.style.setProperty("--workspace2-panel-cool-sheen", panelCoolSheen);
        node.style.setProperty("--workspace2-panel-top-sheen", panelTopSheen);
        node.style.setProperty("--workspace2-panel-shade", panelShade);
        if (tabSurface) {
          node.style.setProperty("--workspace2-tab-bg-glass", tabSurface);
        } else {
          node.style.removeProperty("--workspace2-tab-bg-glass");
        }
        if (controlSurface) {
          node.style.setProperty("--workspace2-control-bg-glass", controlSurface);
          node.style.setProperty("--workspace2-control-border-glass", controlBorder);
          node.style.setProperty("--workspace2-control-shadow-glass", controlShadow);
          node.style.setProperty("--workspace2-hover-glass", hoverSurface);
        } else {
          node.style.removeProperty("--workspace2-control-bg-glass");
          node.style.removeProperty("--workspace2-control-border-glass");
          node.style.removeProperty("--workspace2-control-shadow-glass");
          node.style.removeProperty("--workspace2-hover-glass");
        }
        node.classList.toggle("is-glass-background", glass);
      });
    }
  }
  
  function syncWorkspaceGlassOverlay() {
    const host = workspaceState.renderTarget;
    const shell = workspaceState.glassPortalElement
      || host?.querySelector?.(".workspace2-shell");
    if (!host || !shell) {
      return;
    }
    if (isPanelGlassEnabled()) {
      if (!isElementVisible(host)) {
        shell.classList.add("is-workspace2-overlay-hidden");
        return;
      }
      const rect = host.getBoundingClientRect();
      if (shell.parentElement !== document.body) {
        document.body.append(shell);
      }
      shell.classList.add("workspace2-glass-overlay");
      shell.style.left = `${Math.round(rect.left)}px`;
      shell.style.top = `${Math.round(rect.top)}px`;
      shell.style.width = `${Math.round(rect.width)}px`;
      shell.style.height = `${Math.round(rect.height)}px`;
      shell.classList.remove("is-workspace2-overlay-hidden");
      workspaceState.glassPortalElement = shell;
      return;
    }
    shell.classList.remove("workspace2-glass-overlay", "is-workspace2-overlay-hidden");
    for (const property of ["left", "top", "width", "height"]) {
      shell.style.removeProperty(property);
    }
    if (shell.parentElement !== host) {
      host.append(shell);
    }
    workspaceState.glassPortalElement = null;
  }
  
  function setupWorkspaceGlassOverlayTracking() {
    if (workspaceState.glassOverlayTrackingReady) {
      return;
    }
    workspaceState.glassOverlayTrackingReady = true;
    window.addEventListener("resize", () => {
      window.requestAnimationFrame(syncWorkspaceGlassOverlay);
    });
  }
  
  function setPanelOpacity(value) {
    const next = setPanelOpacityValue(value);
    cleanupWorkspacePanelAncestors();
    document.querySelectorAll(".workspace2-host, .workspace2-shell").forEach(applyWorkspaceBackgroundEffect);
    return next;
  }
  
  function setPanelBackgroundMode(mode) {
    const next = setPanelBackgroundModeValue(mode);
    document.querySelectorAll(".workspace2-host, .workspace2-shell").forEach(applyWorkspaceBackgroundEffect);
    syncWorkspaceGlassOverlay();
  }
  
  function setGlassBlur(value) {
    const next = setGlassBlurValue(value);
    document.querySelectorAll(".workspace2-host, .workspace2-shell").forEach(applyWorkspaceBackgroundEffect);
    syncWorkspaceGlassOverlay();
  }

  return {
    isPanelGlassEnabled,
    applyWorkspaceBackgroundEffect,
    syncWorkspaceGlassOverlay,
    setupWorkspaceGlassOverlayTracking,
    refreshWorkspacePanelAncestorsIfVisible,
    setPanelOpacity,
    setPanelBackgroundMode,
    setGlassBlur,
  };
}
