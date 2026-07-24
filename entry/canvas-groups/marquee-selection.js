// WorkspaceKit observes ComfyUI's existing Ctrl/Meta canvas marquee.  It never
// cancels the native pointer event: LiteGraph remains responsible for selecting
// nodes and native groups while this helper only derives the overlay-group ids.

export function shouldStartGroupMarquee(event, canvas) {
  if (event?.button !== 0 || !canvas) return false;
  if (!(event.ctrlKey || event.metaKey) || event.shiftKey || event.altKey) return false;
  if (event.target?.closest?.(".xzg-group-box, .xzg-settings-modal, .workspacekit-dialog")) return false;
  const path = typeof event.composedPath === "function" ? event.composedPath() : [];
  return path.includes(canvas) || event.target === canvas;
}

export function hasMeaningfulMarqueeDrag(start, end, minimumDistance = 4) {
  if (!start || !end) return false;
  const dx = Number(end.x) - Number(start.x);
  const dy = Number(end.y) - Number(start.y);
  return Number.isFinite(dx) && Number.isFinite(dy) && (dx * dx + dy * dy) >= minimumDistance * minimumDistance;
}

export function marqueeRectFromPoints(start, end) {
  return {
    left: Math.min(start.x, end.x),
    top: Math.min(start.y, end.y),
    right: Math.max(start.x, end.x),
    bottom: Math.max(start.y, end.y),
  };
}

export function rectsIntersect(a, b) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top;
}

export function groupIdsIntersectingMarquee(groupElements, marqueeRect) {
  const ids = [];
  for (const [groupId, element] of Object.entries(groupElements || {})) {
    if (!element?.getBoundingClientRect) continue;
    const rect = element.getBoundingClientRect();
    if (rectsIntersect(marqueeRect, {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
    })) ids.push(groupId);
  }
  return ids;
}
