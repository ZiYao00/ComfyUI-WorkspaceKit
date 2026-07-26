// Resolve a workflow drop target from every element hit at the pointer
// coordinate. `elementFromPoint()` returns only the topmost visual layer; that
// is unreliable when a panel overlay, row child, or drag presentation sits
// above the actual folder row.
export function resolveWorkflowPointerDropHit(hitElements = []) {
  const hits = Array.from(hitElements || []);
  const directTargets = hits
    .map((element) => element?.closest?.("[data-workspace2-drop-target]") || null)
    .filter(Boolean);

  // A folder/root action is always a more explicit destination than the broad
  // tree fallback behind it.
  const direct = directTargets.find((target) => !target.classList?.contains("workspace2-tree"));
  if (direct) return { kind: "direct", target: direct };

  // Dropping over a file row means "move to that file's parent folder". This
  // keeps the original tree-mode behavior while permitting decorative child
  // elements to appear above the row itself.
  const itemRow = hits
    .map((element) => element?.closest?.("[data-workspace2-parent-path]") || null)
    .find(Boolean);
  const parentPath = itemRow?.dataset?.workspace2ParentPath;
  if (parentPath !== undefined) return { kind: "parent", parentPath };

  return directTargets[0] ? { kind: "tree", target: directTargets[0] } : null;
}
