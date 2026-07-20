// Shared preview placement only. Callers retain preview state, content, and
// display timing. Keeping viewport/sidebar calculations here lets Templates
// and Nodes share the same bounded-placement rule without coupling either
// panel's state lifecycle to the other.
export function createPreviewPositioner({ window, getSidebarSetting, getRenderTarget }) {
  const sidebarLocation = () => String(getSidebarSetting() || "left").toLowerCase() === "right" ? "right" : "left";

  const positionPreviewAtCursor = (preview, event) => {
    const gap = 16;
    const rect = preview.getBoundingClientRect();
    let left = event.clientX + gap;
    let top = event.clientY + gap;
    if (left + rect.width > window.innerWidth - 8) left = Math.max(8, event.clientX - rect.width - gap);
    if (top + rect.height > window.innerHeight - 8) top = Math.max(8, event.clientY - rect.height - gap);
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
  };

  const positionPreviewPopover = (preview, event, options = {}) => {
    if (options.followCursor) {
      positionPreviewAtCursor(preview, event);
      return;
    }
    const gap = 16;
    const previewWidth = Math.min(248, window.innerWidth - 24);
    const targetRect = event?.currentTarget?.getBoundingClientRect?.();
    const localPanel = event?.currentTarget?.closest?.(".workspace2-panel,.workspace2-shell");
    const panelRect = options.panelElement?.getBoundingClientRect?.()
      || localPanel?.getBoundingClientRect?.()
      || getRenderTarget()?.getBoundingClientRect?.()
      || targetRect;
    const clientX = event?.clientX || 0;
    const clientY = event?.clientY || 0;
    preview.style.left = "0px";
    preview.style.top = "0px";
    preview.style.width = `${previewWidth}px`;
    const rect = preview.getBoundingClientRect();
    let left;
    if (sidebarLocation() === "left") {
      left = (panelRect?.right ?? clientX) + gap;
      if (left + previewWidth > window.innerWidth - 8) left = Math.max(8, (panelRect?.left ?? clientX) - previewWidth - gap);
    } else {
      left = (panelRect?.left ?? clientX) - previewWidth - gap;
      if (left < 8) left = Math.min(window.innerWidth - previewWidth - 8, (panelRect?.right ?? clientX) + gap);
    }
    const anchorY = targetRect ? targetRect.top + targetRect.height / 2 : clientY;
    let top = anchorY - rect.height * 0.3;
    if (top + rect.height > window.innerHeight - gap) top = window.innerHeight - rect.height - gap;
    top = Math.max(gap, top);
    preview.style.left = `${left}px`;
    preview.style.top = `${top}px`;
  };

  return { positionPreviewAtCursor, positionPreviewPopover };
}
