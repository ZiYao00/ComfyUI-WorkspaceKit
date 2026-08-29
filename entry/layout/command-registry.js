import { LAYOUT_OPERATIONS, calculateLayout } from "./layout-engine.js";

export const LAYOUT_COMMANDS = Object.freeze({
  "workspacekit.layout.align.left": Object.freeze({
    section: "align", operation: LAYOUT_OPERATIONS.ALIGN_LEFT, labelKey: "layout.align.left", minimumSelection: 2,
  }),
  "workspacekit.layout.align.horizontal-center": Object.freeze({
    section: "align", operation: LAYOUT_OPERATIONS.ALIGN_CENTER_X, labelKey: "layout.align.horizontalCenter", minimumSelection: 2,
  }),
  "workspacekit.layout.align.right": Object.freeze({
    section: "align", operation: LAYOUT_OPERATIONS.ALIGN_RIGHT, labelKey: "layout.align.right", minimumSelection: 2,
  }),
  "workspacekit.layout.align.top": Object.freeze({
    section: "align", operation: LAYOUT_OPERATIONS.ALIGN_TOP, labelKey: "layout.align.top", minimumSelection: 2,
  }),
  "workspacekit.layout.align.vertical-center": Object.freeze({
    section: "align", operation: LAYOUT_OPERATIONS.ALIGN_CENTER_Y, labelKey: "layout.align.verticalCenter", minimumSelection: 2,
  }),
  "workspacekit.layout.align.bottom": Object.freeze({
    section: "align", operation: LAYOUT_OPERATIONS.ALIGN_BOTTOM, labelKey: "layout.align.bottom", minimumSelection: 2,
  }),
  "workspacekit.layout.distribute.horizontal": Object.freeze({
    section: "distribution", operation: LAYOUT_OPERATIONS.DISTRIBUTE_HORIZONTAL, labelKey: "layout.distribute.horizontal", minimumSelection: 3,
  }),
  "workspacekit.layout.distribute.vertical": Object.freeze({
    section: "distribution", operation: LAYOUT_OPERATIONS.DISTRIBUTE_VERTICAL, labelKey: "layout.distribute.vertical", minimumSelection: 3,
  }),
  "workspacekit.layout.spacing.horizontal": Object.freeze({
    section: "spacing", operation: LAYOUT_OPERATIONS.SPACING_HORIZONTAL, labelKey: "layout.spacing.horizontal", minimumSelection: 2, acceptsSpacing: true,
  }),
  "workspacekit.layout.spacing.vertical": Object.freeze({
    section: "spacing", operation: LAYOUT_OPERATIONS.SPACING_VERTICAL, labelKey: "layout.spacing.vertical", minimumSelection: 2, acceptsSpacing: true,
  }),
  // Preserve the old Layout command ids. Equal width/height keep their old
  // NodeAligner semantics: match the largest stored node width/height.
  "workspacekit.layout.size.equal-width": Object.freeze({
    section: "size", operation: LAYOUT_OPERATIONS.SIZE_MAX_WIDTH, labelKey: "layout.size.equalWidth", minimumSelection: 2, requiresResizable: true,
  }),
  "workspacekit.layout.size.equal-min-width": Object.freeze({
    section: "size", operation: LAYOUT_OPERATIONS.SIZE_MIN_WIDTH, labelKey: "layout.size.equalMinWidth", minimumSelection: 2, requiresResizable: true,
  }),
  "workspacekit.layout.size.equal-height": Object.freeze({
    section: "size", operation: LAYOUT_OPERATIONS.SIZE_MAX_HEIGHT, labelKey: "layout.size.equalHeight", minimumSelection: 2, requiresResizable: true,
  }),
  "workspacekit.layout.size.equal-min-height": Object.freeze({
    section: "size", operation: LAYOUT_OPERATIONS.SIZE_MIN_HEIGHT, labelKey: "layout.size.equalMinHeight", minimumSelection: 2, requiresResizable: true,
  }),
  "workspacekit.layout.size.equal-both": Object.freeze({
    section: "size", operation: LAYOUT_OPERATIONS.SIZE_MAX_BOTH, labelKey: "layout.size.equalBoth", minimumSelection: 2, requiresResizable: true,
  }),
});

export function layoutCommandDefinition(commandId) {
  return LAYOUT_COMMANDS[commandId] ?? null;
}

export function layoutCommandState(commandId, selection) {
  const command = layoutCommandDefinition(commandId);
  if (!command) {
    return Object.freeze({ enabled: false, reason: "unknown-command", selectedCount: selection?.selectedCount ?? 0, minimumSelection: 0 });
  }
  const selectedCount = selection?.selectedCount ?? 0;
  const eligibleCount = command.requiresResizable
    ? selection?.resizableCount ?? 0
    : selection?.movableCount ?? selectedCount;
  const enabled = eligibleCount >= command.minimumSelection;
  return Object.freeze({
    enabled,
    reason: enabled ? "" : command.requiresResizable ? "minimum-resizable-selection" : "minimum-selection",
    selectedCount,
    eligibleCount,
    minimumSelection: command.minimumSelection,
  });
}

export function calculateLayoutCommand(commandId, selection, options = {}) {
  const command = layoutCommandDefinition(commandId);
  if (!command) return Object.freeze({ ok: false, operation: "", reason: "unknown-command", changes: Object.freeze([]) });
  const state = layoutCommandState(commandId, selection);
  if (!state.enabled) {
    return Object.freeze({ ok: false, operation: command.operation, reason: state.reason, changes: Object.freeze([]), minimumSelection: state.minimumSelection });
  }
  return calculateLayout(selection?.targets ?? [], command.operation, options);
}
