// Where WorkspaceKit's entries sit inside a LiteGraph context menu.
//
// ComfyUI appends every extension's menu items to the end of the menu, in
// extension load order. That order is not stable across page loads, so without
// a correction pass our three group entries land in a different place on every
// refresh, and another extension's items can be appended between them.
//
// A previous version of this correction identified our rows by an exact set of
// hardcoded Chinese labels. Once the labels became translatable, that set could
// never match again, and the whole pass was removed except for its dead body.
// Identifying our rows by the 🧩 marker instead is language-independent, so
// this cannot rot the same way.
export const WORKSPACEKIT_MENU_MARK = "🧩";

// Leave the first couple of native rows where ComfyUI put them: those are what
// a user reaches for first, and an extension that claims row one reads as
// hijacking the menu. Two is the compromise — high enough to find by muscle
// memory, and never the bottom of the menu.
export const DEFAULT_LEAD_ENTRIES = 2;

export function isWorkspaceKitMenuLabel(label) {
  return typeof label === "string" && label.includes(WORKSPACEKIT_MENU_MARK);
}

/**
 * Plan the target order for one context menu.
 *
 * `entries` is the menu's rows in DOM order, each `{ label, separator }`.
 * Returns the full target order plus the contiguous `block` of rows to move and
 * the `anchor` row index to insert that block before (-1 meaning "append").
 *
 * Separators immediately above and below our rows travel with the block. They
 * are the dividers we registered ourselves, so leaving them behind would strand
 * a rule in the middle of ComfyUI's own entries.
 */
export function planCanvasMenuOrder(entries, { leadEntries = DEFAULT_LEAD_ENTRIES } = {}) {
  const list = Array.isArray(entries) ? entries : [];
  const identity = list.map((_, index) => index);
  const ours = identity.filter((index) => isWorkspaceKitMenuLabel(list[index]?.label));
  if (!ours.length) {
    return { order: identity, block: [], anchor: -1, insertAt: -1, moved: false };
  }

  // Our rows may already be split apart by a foreign entry; collecting them by
  // marker and re-emitting them as one run is what makes them contiguous again.
  const block = [...ours];
  const first = ours[0];
  if (first > 0 && list[first - 1]?.separator) {
    block.unshift(first - 1);
  }
  const last = ours[ours.length - 1];
  if (last + 1 < list.length && list[last + 1]?.separator) {
    block.push(last + 1);
  }

  const blockSet = new Set(block);
  const rest = identity.filter((index) => !blockSet.has(index));
  const lead = Math.max(0, Math.min(Math.trunc(leadEntries) || 0, rest.length));
  const order = [...rest.slice(0, lead), ...block, ...rest.slice(lead)];
  return {
    order,
    block,
    anchor: lead < rest.length ? rest[lead] : -1,
    insertAt: lead,
    moved: order.some((index, position) => index !== position),
  };
}
