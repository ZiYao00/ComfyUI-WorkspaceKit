# workspace2_canvas_groups.js Structure Map

Navigation index for the **internals** of `entry/workspace2_canvas_groups.js`
(~4,070 lines). Its purpose is to let anyone (human or AI) jump straight to the
relevant region instead of reading or scanning the whole file. See the
large-file rules in `CLAUDE.md` / `AGENTS.md`.

**Sibling maps:** [ENTRY_MAP.md](ENTRY_MAP.md) indexes what remains inside
`entry/entry.js`; [MODULE_MAP.md](MODULE_MAP.md) indexes the pure modules
already extracted under `entry/canvas-groups/` (and elsewhere). This file
indexes what *remains inside* the groups file — the DOM, event, canvas-draw and
persistence layers that cannot be pure.

**How to use:** find your feature below, note the key symbol names, then `Grep`
for the symbol and read only the lines around the hit. Line numbers are
approximate anchors and drift as the file changes — **search by symbol name,
treat line numbers as hints only.**

---

## The one architectural fact that explains most bugs

Native ComfyUI nodes are **canvas pixels**, not DOM. WK groups are a **DOM
overlay** (`#xzg-group-overlay`, `z-index:10`, appended to `document.body`).
DOM and canvas pixels cannot interleave: the whole overlay is necessarily above
every node.

Consequences that recur across this file:

- Anything that must render **beneath** nodes has to be drawn on the canvas, not
  in the overlay. `drawGroupBackgrounds()` exists for exactly this reason.
- Anything in the overlay with `pointer-events:auto` **steals clicks from
  nodes underneath it**. Hence `.xzg-group-body` is deliberately
  `pointer-events:none`, and hence T-041.
- Nothing in the overlay scales automatically with canvas zoom;
  `updatePositions()` re-derives every pixel value each frame. Anything created
  outside that loop (e.g. the transient rename `<input>`) will not follow zoom
  unless the loop is taught to re-measure it.
- **Never move a frame in the DOM during a gesture.** Re-appending an element
  between `mousedown` and `mouseup` makes the browser abandon the click
  sequence, so `click` and `dblclick` silently never fire — the listener looks
  broken while the real cause is one line elsewhere. Use `z-index` for stacking
  (see `bringToFront`, T-036).

See `.dev-docs/CANVAS_GROUP_INTERACTION_PLAN.zh-CN.md` §10 for the full
layering analysis, and [NATIVE_BEHAVIOR_REFERENCE.md](NATIVE_BEHAVIOR_REFERENCE.md)
for the verified native draw order.

---

## Regions (in file order)

### Constants & colour math — L35–196
Storage keys (`DEFAULT_STYLE_KEY`, `PRESET_STYLE_KEY`, `ACTIVE_PRESET_KEY`),
mode values (`MODE_ALWAYS = 0`, `MODE_BYPASS = 4`), style defaults
(`DEFAULT_CONTENT_PADDING = 12`, `DEFAULT_HEADER_OPACITY = 0.25`,
`MAX_HEADER_OPACITY = 0.5`, `BODY_TO_HEADER_OPACITY_RATIO = 0.5`).

Colour helpers — the body fill's colour is **derived**, never stored
separately: `parseRgbaRgb`, `parseRgbaAlpha`, `groupBodyBackground` (body =
header RGB at half the header's alpha), `nativeColorFromWorkspaceKitGroup`,
`hslToRgb`, `rgbToHex`, `rgbLuma`, `groupTitleColorForBackground` (readable font
colour from a background's luma), `replaceRgbaRgbPreserveAlpha`,
`displayRgbFromStored` (T-044 — see below).

Swatch presets: `GROUP_COLOR_PRESETS` is a **fallback only** — normal rendering
reads LiteGraph's live `LGraphCanvas.node_colors[*].groupcolor` through
`readNativeGroupColorPresets()` so WK groups keep native colour identity.
`readColorPresets()` (L1185) returns the ten shown in the dialog: nine native
plus WK's own `CUSTOM_PRESET_COLOR`.

#### Store native, paint bright (T-044)

Colour **identity** and colour **appearance** are deliberately different values.

LiteGraph's palette is identity: rgthree's `matchColors` filter and WK ⇄ native
conversion both compare that exact hex. But five of the nine entries are
decade-old three-digit shorthands whose channels all sit between `0x88` and
`0xAA` (`red #A88`, `green #8A8`, `blue #88A`, `cyan #8AA`, `black #444`), so
those four colours are nearly indistinguishable at swatch size and the row reads
as half-vivid, half-grey next to the four modern entries.

So:

- **`headerBgColor` / `nativeGroupColor` store the untouched native RGB.**
- **Every paint path runs it through `displayColorForNativeHex()` first.**

`entry/canvas-groups/preset-color-display.js` holds the rule. Two invariants:

1. **Hue is never touched** — only saturation and lightness. A shifted hue would
   make "red" stop reading as red after a native round-trip, the exact mismatch
   this split exists to prevent.
2. **The display colour must never be persisted.** Writing it into
   `headerBgColor` would silently break rgthree's colour filter and forward
   conversion. The contract asserts this both ways.

`black` is the deliberate exception: it stays dark (paints `#000000`) rather than
becoming mid-grey, and pins its own font (`#828282`) and the opacity cap instead
— a brightened black would lose the "low priority" meaning the dark swatch
carries, and the luma rule would pick white on near-black.

Verified live: `red` copied from our swatch matches the WK-coloured group in
rgthree; the brightened `#d65151` does not (proving the display colour never
reached storage). Contract:
`scripts/test-group-preset-color-display.mjs`.

#### One border width, three call sites (T-045)

`PRESET_BORDER_WIDTH = 1` exists because three places must agree on it:
`getBuiltInStyle()` (a new group), `applyColorPreset()` (a colour swatch is a
**complete** look, border width included), and `CONVERTED_STYLE` in
`reverse-conversion-plan.js` (native → WK). When those disagreed, "the border is
1px" was true in one place and false in the other two.

**A stored preset overrides the built-in style**, which is the trap:
`readStylePresets()` merges `localStorage` over `getBuiltInStyle()`, so changing
the built-in default alone leaves every user who had ever saved a preset on the
old value. `_migratePresetBorderWidth()` (via
`migrateLegacyPresetBorderWidth()`) rewrites `borderWidth` once — only from the
one legacy value, gated on `PRESET_BORDER_MIGRATION_KEY` — so a width the user
deliberately chose survives, and a 2px chosen *after* the migration is never
touched.

A native-origin group also gets `titleColor: #FFFFFF` with `useUnifiedColor:
true` (`colorSat: 0`, `colorLit: 100`). The unified flag is load-bearing: it is
what carries white through to the border, so setting the font white without it
leaves the border gold. Groups **restored from the archive** keep their own saved
style — that round trip is the archive's purpose.

### Object state — L198–225
`Workspace2CanvasGroups` opens here. Key fields: `groups` (id → group record),
`groupEls` (id → DOM box), `selectedGroupIds` (**transient, never
serialized**), `_nativeRepresentation`, `_suspendMembershipSync` (held during
multi-drag so the periodic bounds scan cannot evict members mid-gesture),
`overlay`, `lastCanvasContextPoint`, `canvasMarquee`.

### init + overlay + canvas-drawn background — L226–355
`init()` wires everything. `createOverlay()` builds the `pointer-events:none`
overlay.

**`setupBackgroundRenderer()` / `drawGroupBackgrounds()`** — group fills,
frames, shadows and all animated frame effects are drawn on the canvas instead
of in the overlay, by hooking `canvas.onDrawBackground` (which native fires
inside `drawBackCanvas()`, before nodes). Groups are sorted largest-first so
nested fills stack correctly. T-042 completed this migration for all six visual
frame states.

`_dispatchMiddleDown()` (L245) is the **event pass-through mechanism**:
temporarily set `pointerEvents='none'`, re-dispatch to the element underneath /
the canvas, restore on mouseup. Reusable for T-041.

`syncOverlayPosition()` keeps the overlay aligned to the canvas rect.

### Pointer gestures & selection — L356–589
`setupGroupPointerActions()` installs window-capture `pointerdown`/`keydown`
listeners. Modifier semantics come from the pure module
`canvas-groups/pointer-actions.js` (Ctrl=ignore, Alt=disable, Shift=multi-select,
user-remappable) — do not hardcode modifiers here.

Coordinate conversion: `recordCanvasContextPoint()`,
`getCanvasPointFromPointerEvent()` (client → canvas coords via
`ds.scale`/`ds.offset`) — **use this for any hit test**.

`prepareNativeNodeJointGroupDrag()` (L462) shows the node hit-test idiom:
`graph.getNodeOnPos(point.x, point.y, graph._nodes, 5)`.

Marquee: `beginCanvasMarquee` / `finishCanvasMarquee` / `cancelCanvasMarquee`
delegate rectangle math to `canvas-groups/marquee-selection.js`.

Selection set: `toggleGroupSelection` (adds/removes; **does not clear** — modifier
gestures only), `selectOnlyGroup`, `selectGroupContents` (recursive, plan from
`canvas-groups/contents-selection-plan.js`), `prepareGroupDrag`,
`clearGroupSelection`, `refreshGroupSelection` (paints the selection outline).

A plain header click resolves through `canvas-groups/header-click-selection.js`
(T-036): clicking an unselected frame clears **both** the native node selection
and every other group; clicking an already-selected one keeps the selection so a
multi-item drag can start.

### Sync loop & per-frame layout — L590–918
`startSyncLoop()` + `_setupImmediateSync()` (removes zoom lag).
`_ensureRefs(el)` caches per-group child element lookups.

**`updatePositions()` (L678) is the hottest and most consequential function.**
Each frame, for every group it recomputes from `ds.scale`: box left/top/width/
height, `headerHeight = Math.max(21 * scale, fs * 1.8)`, header padding, title
font size, action button size (`headerHeight * 0.78`) and icon size
(`buttonSize * 0.72`), and the border hit-strip offsets. It also calls
`syncNodeMembership()` every 10 frames and `updateGroupStyle()` every frame.
**Anything that must follow zoom belongs in this loop.**

It also owns two things that are per-frame for a different reason — they depend on
the pointer's position relative to a frame, and the graph can move under a
stationary pointer: the hit-region pass-through (T-041) and the action icons'
visibility (T-038). The pointer is converted to canvas space **once** before the
group loop, not per group. Because this runs every frame, be careful what you call
from inside it: T-039's `_getGroupOutputNodes()` scans every graph node, so it is
called only while a frame's icons are actually visible.

`updateGroupStyle()`'s animation cases live at L790–917 (see below).

### Style storage & presets — L953–1080
`applyUserShadow`, `getBuiltInStyle` (the new-group defaults: border width 2,
radius 8, padding 12), `readDefaultStyle`/`saveDefaultStyle`/`resetDefaultStyle`,
`readActivePreset`/`setActivePreset`, `readStylePresets`/`saveStylePreset`
(4 slots), `groupStyleSnapshot` (the canonical field list — extend it when adding
a style field), `uniqueGroupTitle`.

### Membership & bounds — L1081–1217
**`syncNodeMembership(group, bounds)` (L1082)** decides which nodes belong to a
group, using native centre-point containment via
`canvas-groups/node-membership.js` (T-037). The old four-edge test and its 20%
`retainedOverlapThreshold` are gone, along with two count-based guards that
existed only to mask the old rule's edge jitter.

`nodeVisualBounds`, `calcBounds` (applies `contentPadding`),
`updateGroupBoundsFromMembers`, `previewGroupLayout` (live settings-dialog
preview via `_previewBounds`).

### Creation & deletion — L1218–1367
`createGroupFromSelection(contextNode)` (tolerates a right-clicked node absent
from `selected_nodes`), `createEmptyGroupAtContextPoint`, `killGroup`.

### DOM construction — L1368–1615
`renderGroup(gid)`, **`buildGroupEl(group)` (L1381)** — the full box markup and
its z-order inside the box:

| Child | z-index | pointer-events |
| --- | --- | --- |
| `.xzg-group-box` (border, shadow, animation) | 5 (overlay-level) | none |
| `.xzg-group-header` (title, 5 action buttons) | 4 | auto |
| `.xzg-resize-handle` (14px, bottom-right) | 3 | auto |
| `.xzg-border-left/right/bottom` (10px drag strips) | 2 | auto |
| `.xzg-group-body` | 1 | **none** (keeps nodes clickable; fill is on canvas) |

The box's own `5` is the **base** value siblings share. `bringToFront()` raises it
per frame (T-036), so between overlapping frames the most recently touched one
owns the shared region. `rebuildAllEls()` legitimately returns every frame to `5`.
The overlay is itself a stacking context (`position:fixed; z-index:10`), so no
counter value can escape it and cover ComfyUI's own UI.

Header buttons carry `data-group-action` (`rename`, `queue`) or
`data-group-mode` (`bypass`, `mute`); all glyphs share
`class="xzg-group-action-icon"` so `updatePositions()` can scale them uniformly
(asserted by `scripts/test-canvas-group-action-icons.mjs`).

**All five icons are hidden until the pointer enters the frame (T-038).** The
trigger is the whole frame, not the title bar, so it **cannot be a CSS `:hover`**
— `.xzg-group-body` is `pointer-events:none` (that is what keeps nodes clickable)
so the frame's middle never receives a mouse event. `updatePositions()` therefore
tests the pointer against the frame bounds geometrically every frame, because the
graph can move under a stationary pointer. Hiding uses **`visibility`, never
`display`**: `display:none` collapses the icons' width and slides the title, so
the title would jump every time the pointer crossed the frame edge. A drag/resize
in progress or an open rename box pins them visible (a fast drag outruns the
frame edge; icons vanishing under an active text field looks broken). Rule in
`canvas-groups/action-icon-visibility.js`.

Listeners registered here: `bringToFront()` — **raises `z-index` via the
monotonic `_frontZ` counter and must never re-append the element.** Moving a node
in the DOM between mousedown and mouseup makes the browser abandon the click
sequence, so `click`/`dblclick` never fire; that is what silently disabled the
header's double-click gesture before T-036. Also: the three border strips and the
resize handle (each with a middle-button pass-through branch — the T-041 hook
point); header `mousedown` (selection reset + drag), `dblclick` (select
contents), `contextmenu` (settings), `wheel` (canvas zoom).

`hslToHex` / `hexToHsl` at L1596.

### Settings dialog — L1617–2443
`openSettings(group)` — the largest single function in the file (~820 lines):
markup, then per-control listeners, live preview, presets, apply-to-all, revert.
Control classes are `xzg-set-*`; swatches are `.xzg-bg-swatch` with
`data-color` holding LiteGraph's exact `groupcolor` hex, `data-copy` holding the
value double-click copies, and a `background` showing the **display** colour.
`applyColorPreset(hex)` applies a complete preset (title bar + font + border) and
forces unified colour on; a preset may pin its own font colour and opacity
(`titleColorForNativeHex` / `headerOpacityForNativeHex` — only `black` does).

Double-click copies the value rgthree's `matchColors` accepts: a native swatch
copies its **name** (`red`, `pale_blue`), WK's own tenth swatch copies its
**hex**. Confirmation is a 450ms outline flash on the swatch plus a transient
`aria-label`, **not** a notice dialog — the user is mid-configuration and a modal
interrupts that for something already visible. This asymmetry is load-bearing — rgthree looks a word up in
`node_colors` and otherwise treats it as a hex, so an invented name like `other`
becomes the colour `#other`, matches nothing, and **fails silently**. Contracts:
`scripts/test-group-settings-colors.mjs`,
`scripts/test-group-preset-color-display.mjs`.

### Rename — L2444–2487
`startRename(gid, span)` swaps the title `<span>` for a transient
`<input class="xzg-group-title-input">`. Because it is created outside
`updatePositions()`, T-036 gave it two things: pixel metrics from
`canvas-groups/rename-input-metrics.js` (same `fontSize * scale` formula as the
span) and a per-frame re-sync inside `updatePositions()` so an open box follows
zoom. Its width is a CSS flex result (`flex:1 1 auto; min-width:0`) against the
header's title wrapper, not arithmetic — that is what keeps it clear of the
action icons at any zoom. Committing a rename must restore the span's full style
contract (including the ellipsis rules) and null `_xzgRefs`.

### Drag & resize — L2488–2788
`startDrag(gid, downEv)` (single group + members; also re-collects members),
`startMultiGroupDrag()` (plan from `canvas-groups/multi-drag-plan.js`;
de-duplicates so each group/node moves once),
`startNativeNodeJointGroupDrag()`, `startResize()`.

**The pointer-capture trap (T-043).** Three of these four start from
WorkspaceKit's own DOM (header, border, resize handle) and can safely use
`mousemove`/`mouseup`. `startNativeNodeJointGroupDrag()` cannot: it starts from a
pointerdown on a **node**, and LiteGraph responds with `setPointerCapture` plus
`preventDefault`. Measured live (2026-08-05) inside such a gesture:

| event | during the drag | on release | after release |
| --- | --- | --- | --- |
| `pointermove` | fires | – | fires |
| `mousemove` | **never** | – | fires again |
| `pointerup` | – | **fires** | – |
| `mouseup` | – | **never** | – |

So a handler on the mouse family gets the exact inverse of what it needs, and
both halves of this were real bugs: the frame did not follow the node during the
drag, and the teardown never ran, so afterwards the frame followed the bare
cursor forever — immune to Escape and Delete, because the surviving listener
captured its target at bind time and never re-reads the selection. Fixed by
listening on both families via `canvas-groups/drag-teardown.js`, with a
buttonless-move abort as a second, independent net. Two consequences to preserve:
teardown must stay idempotent (a normal release delivers more than one end
signal), and the frame delta must stay **absolute** from the gesture start —
accumulating it would double every motion now that two event families report the
same movement.

### Style application & animation — L2789–2864
`updateGroupStyle(gid)` now maintains the interactive DOM header state only:
title/icon output and the selection outline (`is-xzg-group-selected`). Visual
frames, shadows and the six effects — `rainbow`, `pulse`, `marquee`,
`marqueebreathe`, `glow`, and `default` — are rendered by
`drawGroupBackgrounds()` through the Canvas frame painter. Keep the selection
outline consistent with `refreshGroupSelection()` (they diverged once; see
DEV_LOG T-207).

`rebuildAllEls` / `rebuildGroupEl`.

### Execution mode, bypass & mute — L2865–3060
`_getGroupNodes`, `_getGroupModeValue`, `updateGroupModeButtons` (tooltip and
`aria-pressed` only — **T-038 removed the coloured activation tiles**; the whole
frame carries the state now, and the icons are hidden most of the time so the
tile was the less visible of the two signals), `_restoreGroupExecutionMode`
(**restores each node's original mode**, so per-node original modes must be
preserved), `toggleGroupExecutionMode`, `_getGroupOutputNodes` (L2944 — the
executability probe T-039 reuses for the execute icon's opacity; note it scans
every graph node, so `updatePositions()` calls it only while the icons are
visible), `toggleBypass`.

**The ignore/disable visuals are ComfyUI's, not ours (T-038).** A group and the
nodes inside it must never show different states, so the values come straight
from `getNodeModeAlpha`: ignore = the bypass colour + 20% frame opacity, disable
= no colour change + 40%. Ignore is *fainter* than disable (`.2 < .4`) — do not
"fix" that. The rule lives in `canvas-groups/group-mode-visuals.js`; the frame is
dimmed in one place (`el.style.opacity` in `updateGroupStyle`) so its border,
title bar and icons cannot drift apart the way the old per-part colouring did.

Two traps here:

- **Read `NODE_DEFAULT_BYPASS_COLOR`, not `NODE_BYPASS_BGCOLOR`.** The latter is
  the name in the theme colour-palette schema and looks correct, but the node
  rendering path ignores it. On this build it is a lavender `#cba6f7` while a
  bypassed node actually paints `#FF00FF` — reading it first made the frame
  disagree with its own contents. Measured values are in
  `docs/NATIVE_BEHAVIOR_REFERENCE.md` §4.
- **The canvas body fill needs the alpha folded in separately.** The fill is
  painted in `drawGroupBackgrounds` (beneath the nodes), so the DOM `opacity`
  that dims the box cannot reach it; without `resolveGroupFillPaint` a bypassed
  frame shows a full-strength body under a 20% border, which reads as a
  rendering fault rather than a state.

### Geometry relations & nesting — L3061–3141
`_getOverlapRatio`, `_isFullyContained` (**group-in-group nesting keeps this** —
native nesting also uses full containment), `_getIoU`,
`_collectChildGroups`, `_collectLinkedGroups`.

### Deletion & ungroup — L3142–3233
`removeGroups`, `removeGroup`, `removeSelectedGroups`, `ungroupSelection`.

### Serialization & native conversion — L3234–3657
`serializeGroup(g)` (**add any new persisted field here** — a missed field cost
a bug in T-102), `createConversionArchive`, `getGroupRepresentation`,
`getConversionInfo`, `isConversionSnapshotCurrent`,
`verifyNativeConversionResult`, `getNativeGroupConversionSnapshot`,
`verifyWorkspaceKitConversionResult`,
**`convertCurrentWorkflowToNative()` (L3399)**,
**`convertCurrentWorkflowToWorkspaceKit()` (L3538 — the T-040 target)**,
`writeGroupDataToNodes`. Pure halves live in
`canvas-groups/{conversion-archive,conversion-result,reverse-conversion-plan}.js`.

### Persistence — L3658–3920
`syncGroupsToExtra` (writes `app.graph.extra` + localStorage),
`setupSerializationHooks`, `_setupExtraBasedPersistence`.

### Startup restore — L3921–4071
`waitForGraph`, `restoreGroups` (also back-fills missing style fields on old
workflows — the migration point for new style defaults), `applyBypassStates`.

---

## Where the pure logic lives instead

Anything decidable without DOM/canvas/graph access belongs in
`entry/canvas-groups/` and gets a Node contract test in `scripts/`. Current
modules: `pointer-actions`, `multi-drag-plan`, `contents-selection-plan`,
`header-click-selection`, `rename-input-metrics`, `group-mode-visuals`,
`action-icon-visibility`, `drag-teardown`, `hit-region-passthrough`,
`node-membership`, `selection-cancel-events`, `delete-key-events`,
`marquee-selection`, `conversion-archive`, `conversion-result`,
`reverse-conversion-plan`, `native-color-compat`, `preset-color-display`. See
[MODULE_MAP.md](MODULE_MAP.md) for each module's
contract and forbidden dependencies.

When fixing a bug here, first ask whether the decision is pure — if so, extend
the module and its contract test rather than adding a branch inside this file.
