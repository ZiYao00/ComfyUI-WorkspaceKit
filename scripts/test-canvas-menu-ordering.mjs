import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  DEFAULT_LEAD_ENTRIES,
  WORKSPACEKIT_MENU_MARK,
  isWorkspaceKitMenuLabel,
  planCanvasMenuOrder,
} from "../entry/ui/canvas-menu-ordering.js";

const row = (label) => ({ label, separator: false });
const rule = () => ({ label: "", separator: true });
const ours = (label) => row(`${WORKSPACEKIT_MENU_MARK} ${label}`);
const labelsOf = (entries, order) => order.map((index) => entries[index].label);

// The marker, not a label list, is what identifies our rows. The previous
// implementation matched an exact set of hardcoded Chinese labels and silently
// stopped matching anything once the labels became translatable.
assert.ok(isWorkspaceKitMenuLabel("🧩 编组"));
assert.ok(isWorkspaceKitMenuLabel("🧩 Group Selected Nodes (Ctrl+G)"));
assert.ok(!isWorkspaceKitMenuLabel("Add Node"));
assert.ok(!isWorkspaceKitMenuLabel(undefined));
assert.ok(!isWorkspaceKitMenuLabel({ label: "🧩" }));

// Our three entries are appended to the end by ComfyUI. They must end up
// together, in registration order, below the first couple of native rows.
{
  const entries = [
    row("Add Node"),
    row("Add Group"),
    row("Convert to Group Node"),
    row("Arrange"),
    rule(),
    ours("Group Selected Nodes"),
    ours("New Empty Group"),
    ours("Save as Template"),
  ];
  const plan = planCanvasMenuOrder(entries);
  assert.equal(plan.moved, true);
  assert.deepEqual(labelsOf(entries, plan.order), [
    "Add Node",
    "Add Group",
    "",
    "🧩 Group Selected Nodes",
    "🧩 New Empty Group",
    "🧩 Save as Template",
    "Convert to Group Node",
    "Arrange",
  ]);
}

// Never row one, and never the bottom: the two rules the user set.
{
  const entries = [
    row("Add Node"),
    row("Add Group"),
    row("Arrange"),
    ours("A"),
  ];
  const plan = planCanvasMenuOrder(entries);
  const order = labelsOf(entries, plan.order);
  assert.equal(order[0], "Add Node", "the first native row must keep row one");
  assert.ok(!isWorkspaceKitMenuLabel(order.at(-1)), "our rows must never be last");
  assert.equal(order.indexOf("🧩 A"), DEFAULT_LEAD_ENTRIES);
}

// A foreign extension appended between our entries is the "not connected"
// symptom. Re-emitting the marked rows as one run is what repairs it.
{
  const entries = [
    row("Add Node"),
    row("Add Group"),
    ours("Group Selected Nodes"),
    row("Open Group Executor"),
    ours("New Empty Group"),
    ours("Save as Template"),
  ];
  const plan = planCanvasMenuOrder(entries);
  const order = labelsOf(entries, plan.order);
  const positions = order.reduce((found, label, index) => (
    isWorkspaceKitMenuLabel(label) ? [...found, index] : found
  ), []);
  assert.deepEqual(positions, [2, 3, 4], "our rows must be contiguous");
  assert.deepEqual(order.slice(2, 5), [
    "🧩 Group Selected Nodes",
    "🧩 New Empty Group",
    "🧩 Save as Template",
  ], "registration order must survive the move");
  assert.equal(order.at(-1), "Open Group Executor", "a foreign entry keeps its own row");
}

// Our own divider travels with the block. Leaving it behind would strand a rule
// in the middle of ComfyUI's entries.
{
  const entries = [row("Add Node"), row("Add Group"), row("Arrange"), rule(), ours("A"), rule()];
  const plan = planCanvasMenuOrder(entries);
  assert.deepEqual(labelsOf(entries, plan.order), ["Add Node", "Add Group", "", "🧩 A", "", "Arrange"]);
  assert.equal(plan.block.length, 3, "both adjacent separators join the block");
}

// Menus without our entries must be left exactly as they are: this observer sees
// every LiteGraph menu on the page, including other extensions' menus.
{
  const entries = [row("Add Node"), row("Add Group"), row("Arrange")];
  const plan = planCanvasMenuOrder(entries);
  assert.equal(plan.moved, false);
  assert.deepEqual(plan.block, []);
  assert.deepEqual(plan.order, [0, 1, 2]);
}

// Already-correct menus report `moved: false` so the caller can skip touching
// the DOM. Reordering rows that are already in place is what produced the
// visible "Save as Template jumps one row" flicker in an earlier version.
{
  const entries = [row("Add Node"), row("Add Group"), ours("A"), ours("B"), row("Arrange")];
  assert.equal(planCanvasMenuOrder(entries).moved, false);
}

// Degenerate menus must not throw: this runs on every menu the page opens.
assert.deepEqual(planCanvasMenuOrder([]).order, []);
assert.deepEqual(planCanvasMenuOrder(null).order, []);
assert.equal(planCanvasMenuOrder([ours("A")]).anchor, -1, "no native row to anchor before");
assert.deepEqual(labelsOf([ours("A"), row("Add Node")], planCanvasMenuOrder([ours("A"), row("Add Node")]).order), [
  "Add Node",
  "🧩 A",
], "a shorter menu clamps the lead instead of leaving our row first");

// The caller must be wired up. The regression being fixed is precisely a live
// call site that was deleted while its function body stayed behind, so assert
// that the body is reachable and that its dependencies still resolve.
const source = await readFile(new URL("../entry/entry.js", import.meta.url), "utf8");
assert.match(source, /import \{[^}]*planCanvasMenuOrder[^}]*\} from "\.\/ui\/canvas-menu-ordering\.js(\?[^"]*)?"/);
assert.ok(
  /runWorkspaceStartupStage\("context-menu-ordering", \(\) => setupWorkspace2ContextMenuOrdering\(\)\)/.test(source),
  "context-menu ordering must run as a named startup stage",
);
assert.ok(
  !/WORKSPACE2_MENU_LABELS/.test(source),
  "the deleted hardcoded-label set must not come back; the 🧩 marker is the identity",
);
assert.match(
  source,
  /const WORKSPACE2_MENU_MARK = `\$\{WORKSPACEKIT_MENU_MARK\} `/,
  "menu rows must carry the same marker the ordering pass looks for",
);

// The sidebar tab uses the marker as a colour glyph so it is findable in a
// column of identically coloured native icons. Asserting no theme colour is
// hardcoded is the point: the previous mask inherited `currentColor`, and any
// fixed replacement colour could disappear against some theme's background.
assert.match(
  source,
  /\.workspace2-tab-button \.sidebar-icon-wrapper::before \{\s*content: "\$\{WORKSPACEKIT_MENU_MARK\}";/,
  "the sidebar glyph must be the 🧩 marker",
);
assert.ok(
  !/-webkit-mask: url\("\$\{workspaceKitIconMaskDataUri/.test(source),
  "the monochrome sidebar mask must be gone; it is what made the tab hard to find",
);
assert.ok(
  !/workspaceKitIconMaskDataUri/.test(source),
  "drop the unused mask import once the sidebar stops masking",
);

assert.ok(
  /!row\.classList\.contains\("litemenu-title"\)/.test(source),
  "a menu title is not a reorderable row and must stay pinned at the top",
);

// A colour-emoji font ignores `color`, but a platform without one falls back to
// a monochrome glyph that must inherit the theme's text colour. Pinning any
// colour on the sidebar glyph would make that fallback invisible on some theme.
{
  const rule = source.slice(source.indexOf(".workspace2-tab-button .sidebar-icon-wrapper::before"));
  const body = rule.slice(0, rule.indexOf("}"));
  assert.ok(!/^\s*color:/m.test(body), "the sidebar glyph must not pin a colour");
}

console.log("Canvas menu ordering contract passed.");
