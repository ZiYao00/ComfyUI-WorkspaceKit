# WorkspaceKit Testing Log

## 2026-08-29 - GPL unification B07-B11 Layout V2 migration

- Scope: the former standalone `ComfyUI-WorkspaceKit-Layout` product has been re-established inside the main plugin as a new Layout V2 execution path. The new runtime does **not** import the old Layout `main.js`, NodeAligner Shadow-DOM command buttons, standalone host, Vendor UI copy, or the former 100 ms permanent canvas bridge.
- Added pure Layout foundations at `entry/layout/{geometry-service,layout-engine,selection-service,command-registry,transaction,controller}.js`. Normal nodes and collapsed nodes normalize to immutable LayoutTargets; collapsed alignment uses measured visual bounds while sizing retains stored logical size semantics.
- Product rules are now explicit: align requires 2+ movable targets; distribute requires 3+; fixed spacing requires 2+ and accepts zero/non-negative values; size operations require 2+ resizable Nodes. Groups are movable LayoutTargets but intentionally not resizable through Layout yet.
- Added `entry/canvas-groups/layout-target-adapter.js` under the Groups owner. It projects selected WorkspaceKit groups, removes group-controlled nodes from direct Layout targets, prepares nested-group/member-node translation plans, applies them through the existing Nodes 2 position adapter, and can roll the plan back. Layout does not read Group DOM/state directly.
- `entry/layout/transaction.js` validates every Node and Group source geometry before mutation, opens one active-workflow ChangeTracker transaction, applies the prepared Group plan plus direct Node changes, requests one graph/canvas update, and closes one transaction. A failure path restores direct Node snapshots and Group/member positions before closing the tracker.
- Added `scripts/test-layout-engine.mjs` for visual-bound alignment, negative/fractional coordinates, 3-item distribution, zero fixed spacing, logical-size matching, and Group exclusion from size operations.
- Added `scripts/test-layout-transaction.mjs` for mixed Node+Group selection, controlled-node de-duplication, one-transaction apply, member movement, and an injected Node-resize failure that must roll Group/member geometry back.
- Added `scripts/test-layout-integration.mjs` for stable command IDs, legacy presentation-preference mapping, same-package Provider identity, main-UI-Kit panel wiring, bounded topbar readiness, and source assertions rejecting NodeAligner button forwarding or `setInterval` polling.
- B10 added a WorkspaceKit-UI-Kit full panel (Alignment / Distribution / Fixed spacing / Size) and a compact eight-command ComfyUI topbar. Both surfaces use the same Layout Controller and Engine; the topbar performs one immediate install plus one 500 ms readiness retry and then uses a MutationObserver only for topbar-neighbor placement.
- B11 preserves old user intent without deleting legacy keys: `WorkspaceKitLayoutPresentationMode`, `WorkspaceKitLayoutControlsHidden`, `WorkspaceKitLayoutFloatingToolbarHidden`, `NodeAlignerToolbarMode`, and `NodeAlignerIsPermanent` are read once and mapped to the unified topbar preference. The canonical `workspacekit.layout` Provider is taken over by the built-in module; old `workspacekit-layout-panel`, `#alignment-buttons`, and `.workspacekit-layout-top-toolbar-group` runtime surfaces are suppressed/unregistered without changing old plugin files.
- Validation limitation: the current CodexPro Bash bridge still resolves neither `node` nor `python`/`py`. The new Layout tests plus the repository-wide `scripts/test-frontend-module-syntax.mjs` therefore cannot execute in this bridge and are **not** claimed passed. Real ComfyUI acceptance remains B12: normal/collapsed Nodes, Group+Group, Node+Group mixed selection, undo/redo, workflow save/reload, crowded topbar, bilingual panel rendering, and old-plugin coexistence must all be exercised before a stable unified release.

## 2026-08-29 - GPL unification B03-B06 Appearance migration

- Scope: `ComfyUI-WorkspaceKit-Theme` is being absorbed into the main plugin as the internal Appearance module. The source repository was clean before migration; the user confirmed all three WorkspaceKit-family repositories had already been committed, pushed, and fully backed up.
- Main project license was changed to **GPL-3.0-only** before source migration. Existing permissive third-party attributions remain in `THIRD_PARTY_NOTICES.md`; the historical Color Thief dependency is **not** bundled in the unified runtime.
- B03 added non-registered Appearance foundations: `color-utils.js`, `field-meta.js`, `theme-document.js`, and `theme-runtime-adapter.js`. `scripts/test-appearance-core.mjs` covers color/document/metadata/runtime-adapter contracts.
- B04 migrated the constrained ThemeStorage service to `service/theme_storage.py`, preserving the 1 MB limit, strict filename validation, atomic writes, overwrite backup, and manifest rollback. Main routes now expose `/workspacekit-theme/save`; `scripts/test-theme-storage.py` also covers non-destructive legacy-theme migration semantics.
- B05 added same-package `entry/appearance.js`, the WorkspaceKit-UI-Kit-based editor/provider, five bundled themes, shared locale/fallback strings, scoped editor styles, and an internal bounded RGB-bucket reference-palette extractor. The former Theme Provider discovery adapter, Standalone host, Vendor WorkspaceKit UI, independent locale loader, Theme icon system, and Color Thief runtime were not migrated.
- B06 compatibility handling preserves the canonical `workspacekit.theme` provider id. If an old standalone Theme provider already registered that id, the built-in module replaces only that runtime registration and logs a migration warning; it never deletes old plugin files. The backend recognizes only the two exact historical WK-theme directories under sibling `ComfyUI-WorkspaceKit-Theme`, copies valid non-conflicting JSON on explicit user action, and preserves all source files.
- Validation limitation: the current CodexPro Bash bridge resolves neither `node` nor `python`/`py`. `node scripts/test-appearance-core.mjs`, `node scripts/test-appearance-integration.mjs`, and `py -3 scripts/test-theme-storage.py` therefore cannot be executed in this bridge and are **not** claimed passed. Real ComfyUI panel/theme/save/migration acceptance remains an explicit release gate before B12 can call the unified build stable.

## 2026-08-28 - Top-bar Save button

- Backup before the source change:
  `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-topbar-save-button-20260828-222728.zip`
  (22.1 MB, SHA-256 `B43B6EE6267D58099A265CD91047B636CF78E8C5EA65D84E5E76E5AD90CFBC84`).
- Frontend surveyed at `comfyui-frontend-package==1.51.9`. The top bar mounts
  `app.menu.element` into `[data-testid="legacy-topbar-container"]` and reveals
  that container once it finds a non-empty grandchild, so a slot appended to
  `app.menu.element` both shows up and travels with a remount. The only
  extension field for the top bar, `topbarBadges`, renders a static text badge
  (`{text, label, variant, tooltip}`) with no command, which is why the button
  joins the legacy row instead. `Comfy.SaveWorkflow` exists as a command with
  `icon: "pi pi-save"` and is reachable from the menubar, the workflow-tab
  context menu and Ctrl+S, but the top bar carries no Save button of its own.
- `ComfyButtonGroup.update()` calls `replaceChildren()` over its own element, so
  the slot is deliberately a sibling of the three native groups rather than a
  child of one. The sibling `ComfyUI-WorkspaceKit-Layout` plugin inserts before
  the settings group, which cannot displace a last child.
- Contracts: `scripts/test-topbar-save-button.mjs` (new) covers placement,
  the re-assert budget, enabled/dirty state, the default-on preference, entry.js
  wiring, the Settings row, locale parity and the stylesheet. It also drives the
  real controller over `scripts/lib/topbar-dom-stub.mjs`, a dependency-free DOM
  stub whose MutationObserver delivers synchronously so re-entrancy shows up as
  a stack overflow rather than a hang.
- **Bug found by that stubbed run, before any live test:** removing the slot is
  itself a `childList` mutation, so the last-place observer immediately put the
  button back and the Settings switch looked broken. Fixed by gating `placeSlot`
  on the preference and by disconnecting the observer on disable; the test now
  pins it by appending a neighbour after switching off.
- Suite: 102 JavaScript contracts, 8 Python contracts, release-version check
  `0.2.6`, and the module-goal syntax guard over 126 frontend files, all green.

### Real-page acceptance (`http://127.0.0.1:8188/`)

`:8190` was down, so acceptance ran against the main install, whose
`custom_nodes/ComfyUI-WorkspaceKit` is a symlink to this repository. That turned
out to be stronger evidence than the isolated package: its top bar carries
rgthree, Crystools' monitors and the Layout plugin's ten buttons, so the row was
genuinely crowded. Screenshots: `.dev-docs/artifacts/topbar-save-button-20260828-*.png`.

- Placement: our slot is child **8 of 8** in `app.menu.element`, to the right of
  `rgthree-comfybar-top-button-group`, the Crystools monitor container and
  `workspacekit-layout-top-toolbar-group`, and outside every native group.
- Defence, measured with a 60 ms settle because a real MutationObserver is a
  microtask (a synchronous check reported false negatives): one foreign
  `append` → still last; twelve appends in one burst (21 children) → still last;
  an `insertBefore` like the Layout plugin's → still last, no rewrite. The probe
  removed all 14 elements it added and the row returned to 8 children.
- Button: 30x30, identical to the Layout plugin's buttons, transparent
  background, colour inherited from the theme (`rgb(127,132,156)`).
- Glyph: `pi pi-save` resolved through the `primeicons` font family; a
  pixel-level render of the element screenshot shows the floppy-disk outline.

#### Two defects found only by the live run

1. **The button was clipped to 22px of its 30px.** ComfyUI's legacy
   `comfyui-button-group` contributes `overflow:hidden` and `comfyui-button`
   contributes `flex:1`, so in a top bar already at capacity the flex row shrank
   the slot and cut the glyph. Fixed by dropping both legacy classes and pinning
   `flex: 0 0 auto` plus `overflow: visible`; the container-visibility check keys
   off a non-empty grandchild, not a class name, so nothing was lost. Re-measured
   at 30x30 with `clipped: false`.
2. **The dot stayed dark on a workflow that had never been saved.** The active
   workflow reported `isModified: false` while ComfyUI marked the browser title
   `*Unsaved Workflow`, because the real signal there is
   `isTemporary: true` / `isPersisted: false`. Reading only `isModified` left the
   indicator off for exactly the workflow that most needed saving. Fixed by
   adding `isOfficialWorkflowTemporary()` to the workflow adapter and folding it
   into the dirty rule; the dot and the `保存工作流（有未保存的改动）` tooltip
   now both appear on that workflow.

- Preference: with `workspace2.topbar.save.enabled = "0"` a reload produced
  seven children, no slot and no injected stylesheet — nothing is built at all —
  while the extension and its sidebar entry stayed healthy. Removing the key
  restored the button on the next reload, confirming default-on.
- **Deliberately not exercised:** the click itself. The live page held a real
  unsaved workflow, and firing `Comfy.SaveWorkflow` would have written to the
  user's own file. The save path is covered by the stubbed run (including the
  double-click guard) and delegates to the same command as Ctrl+S; a human click
  on a scratch workflow is still the outstanding check.

### 2026-08-29 - Run-style visual treatment

- Backup before the visual change:
  `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-topbar-save-run-style-20260829-141827.zip`
  (22.22 MB, source-only archive).
- The Save control now follows the native Run button's 32px height, 8px radius,
  icon-plus-label layout and primary action colour. A dirty workflow uses the
  primary treatment; a clean workflow uses the secondary surface. The redundant
  right-side dot was removed, while the full unsaved tooltip and the underlying
  dirty detection remain unchanged.
- Real-page check at `http://127.0.0.1:8190/`: one dirty Save button rendered
  at 82×32 with 8px radius, primary background, white label and no clipping;
  its slot remained last in `app.menu.element`. No save action was fired.

## 2026-08-19 - Shared active-tab highlight and curved panel connection

- Backup before the source change:
  `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-active-tab-arc-20260819-212637.zip`
  (SHA-256 `491C9A7E72894F6CB2B702CD1F9A96E2586C91E8AFC7CEA017061CB7D3C42F18`).
- Active module tabs retain the panel surface at their bottom connection but
  now add a restrained accent top-gradient, readable text colour and explicit
  side/top edge. The two lower shoulders now contain an edge ring, rather than
  an invisible fill-only gradient; the frame supplies the inactive 1px line.
- Real `:8190` screenshots were recorded under `.dev-docs/artifacts/` before
  and after the change. `scripts/e2e/active-tab-chrome.mjs` passed in isolated
  transparent and frosted contexts: active gradient, edge ring and frame line
  all resolved, with no WK page error. This does not claim the separate
  full-glass continuous-surface task (`UI-Glass-Tab`) complete.

## 2026-08-19 - Workflows Browse menu density and dismissal

- Backup before the source change:
  `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-workflow-context-menu-dismiss-20260819-210801.zip`
  (SHA-256 `823D6F7F4D3E6B297B34F3BBF0EC6B6E5971B9FB0FE7B474FE2C894913E353F4`).
- Removed the always-visible file-row “Show workflow in folder” icon. The same
  operation is now the second file context-menu action, immediately after Open;
  it keeps the existing backend endpoint and error handling.
- Workflow context menus now bind one capture-phase outside `pointerdown` and
  one capture-phase Escape listener while open. Outside clicks only dismiss and
  then continue to ComfyUI; Escape is consumed only while this menu is open.
- Static row/menu contracts passed. Real isolated `:8190` acceptance through
  `scripts/e2e/workflow-context-menu-dismiss.mjs` observed five file actions
  (`Open`, `Show workflow in folder`, `Rename`, `Move to root`, `Move to
  trash`); both Escape and a canvas-side click removed the menu, with no WK
  page error. The test invokes no file action and writes no workflow data.

## 2026-08-19 - Open surface and frosted-blur effective range

- The Workflows Open-history surface now uses `50%` of the theme control
  surface, rather than `75%`; row hover/selection colours do not change.
- Frosted Glass removes the old visually weak `0–20` input region. New slider
  `0` maps to the former `20` appearance (about `6px`), and new `100` remains
  the former `100` appearance (`32px`). Existing stored values are migrated
  once to preserve their physical blur — for example old `20` becomes new `0`.
- `test-panel-background-state.mjs` covers endpoint mapping and migration.
  Fresh isolated `:8190` acceptance seeded legacy blur `20` before startup;
  the page migrated it to stored `0` with scale version `2`, applied `6px` to
  the live glass shell, and computed the Open surface as a 0.5-alpha theme
  colour. No WorkspaceKit page error occurred.

## 2026-08-19 - Workflows Open-history resize and surface alignment

- Backup before the source change:
  `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-open-history-resize-alignment-20260819-152359.zip`
  (SHA-256 `9A470B2F38F6CEC1E8A66C252EBA6A023B8D8F1160158FE8AFB619FE20EF63D2`).
- The Open-history setting remains the single persisted source of truth. Its
  linear range is now `2–15` visible rows, and the new bottom resize handle
  maps pointer movement to that same integer rather than storing a separate
  pixel height. During drag only the CSS row count previews; persistence and a
  panel rebuild occur on release, so pointer capture cannot be interrupted.
- The fixed `scrollbar-gutter: stable` reserved a 15px empty right strip even
  when the Open list did not overflow. It is now `auto`: ordinary lists align
  with the full container width, while real overflow still receives the native
  scrollbar. Open rows now also use symmetric `6px` inline padding.
- The Open container uses a theme-derived `75%` control-surface fill, including
  transparent and glass modes. It does not change row selection or hover
  colours.
- Real `:8190` acceptance: before the fix the list was `268px` and its row
  `253px`; after it both measured `268px` with no WorkspaceKit page error. A
  pointer drag previewed `5 → 7` without localStorage mutation, then persisted
  `7` and rebuilt the handle on release. Separate real drags clamped and
  persisted both endpoints (`2`, `15`); the Settings range rendered
  `min=2`, `max=15`, `value=2`. Syntax, both focused contracts, and
  `git diff --check` passed. The complete `npm test` suite also passed:
  100 JavaScript contracts, 8 Python contracts, and release-version check
  `0.2.6`. The Host contract now asserts the already-intended shared UI-root
  and Content-slot classes rather than the pre-Blueprint class strings.

## 2026-08-19 - Hosted Workflows scale-slider regression repair

- Backup before the source change:
  `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-hosted-slider-fix-20260819-105207.zip`
  (SHA-256 `A664FC7386F0F3E06CEAA66F029970B0082182C998A95783A7796E3C27F2181C`).
- Root cause: after the core panel moved into the shared Blueprint, the
  Workflows slider still searched for `.workspace2-panel` below the Content
  slot. The hosted panel frame is instead the slot's ancestor, so the input
  event updated its value but never applied the CSS scale variables.
- The resolver now supports both valid mount shapes: it finds an ancestor panel
  for the hosted Blueprint and retains the descendant lookup for standalone
  compatibility. No slider range, stored preference key, or visual scale
  formula changed.
- Fresh read-only smoke at `http://127.0.0.1:8190/` passed with no
  WorkspaceKit console errors. Its new real interaction assertion drove the
  Workflows range input from `50` to `100` and observed
  `--workspace2-row-height` change from `35px` to `42px`.

## 2026-08-19 - Single UI system B1: shared core-panel scale surface

- Backup before the source change:
  `.codex-backups/10-ui-canvas/WorkspaceKit-before-single-layout-system-b1-shared-slider-root-20260819-122000.zip`
  (SHA-256 `2677DEDAC0B319339D12C5966B3071FF475FFD5199EFDB377BDC73777FDAA655`).
- Root cause: after the Blueprint migration, Nodes and Templates received the
  Content slot, which is *inside* `.workspace2-panel`. Their density controls
  searched only downward, so they updated state and localStorage but never
  applied the CSS scale variables to the actual panel surface. Workflows had
  a separate ancestor-aware lookup, causing the inconsistent behaviour.
- `resolveWorkspacePanelSurface()` is now the single mount-to-panel resolver
  used by Workflows, Nodes, and Templates. This batch changes no geometry,
  padding, Slot ownership, or business action.
- Real test-package page acceptance: each of the three sliders changed from
  `50` / `35px` to `100` / `42px` and produced no WorkspaceKit page error.
  Syntax and `git diff --check` passed.

## 2026-08-19 - Single UI system B2: shared core-panel geometry

- Backup before the source change:
  `.codex-backups/10-ui-canvas/WorkspaceKit-before-single-layout-system-b2-shared-geometry-20260819-131847.zip`
  (SHA-256 `2ED54052EF34BE98745A64892E37E49C8A62F47F07EC56F78EB5BD17B26E573C`).
- Live DOM measurement first confirmed that the three hosted core panels have
  exactly one geometry owner: their four Host Slots had `10px` horizontal
  padding, while the outer frame already had `0px` padding and gap. The change
  therefore cannot create a double `20px` gutter.
- The shared Host now defines the core geometry tokens and applies the same
  values to Workflows, Nodes, and Templates: Toolbar `12px 20px 0`, Controls
  `12px 20px 12px`, Content `0 20px 16px`, Status `8px 20px 10px`.
  `entry/ui-kit/styles.js` exposes matching public defaults for future family
  panels; no existing Layout or Theme Vendor output was changed in this batch.
- Fresh `:8190` page acceptance measured those exact computed values in all
  three panels. Each real range input also changed from `50` to `100`, with no
  WorkspaceKit console errors. JavaScript syntax checks and `git diff --check`
  passed.

## 2026-08-19 - Single UI system B3: core panels consume public UI Kit Slots

- Backup before the source change:
  `.codex-backups/10-ui-canvas/WorkspaceKit-before-single-layout-system-b3-standard-slot-classes-20260819-133336.zip`
  (SHA-256 `0A69E287C95C4E83EDD39145F4A705B44CF5015B6DAE61C554CDF20888C3B9BA`).
- Cause confirmed by live DOM inspection: the Host allocated only legacy
  `workspace2-module-*` classes, while the public UI Kit Slot CSS was injected
  only when a Provider called `WorkspaceKitPanelUITemplate.create()`. Core WK
  panels therefore had a second, legacy geometry path despite the Blueprint
  migration.
- The Host now marks its frame as the UI Kit Root/Blueprint and its four Slots
  with the public UI Kit classes. WK startup explicitly installs the shared
  UI Kit stylesheet; this is idempotent with Provider `create()` calls.
  Removed rules were dormant Workflows-only 10px Slot overrides, not workflow,
  node, template, scroll, or status business logic.
- Fresh test-package acceptance waited for the real WK startup completion,
  confirmed the public stylesheet exists, and measured every core page with
  the same standard classes and values: Toolbar `12px 20px 0`, Controls
  `12px 20px 0`, Content `12px 20px 16px`, Status `8px 20px 10px`.
  Workflows, Nodes, and Templates each retained content and a functioning
  `50 → 100` range control; no WorkspaceKit console error occurred.

## 2026-08-19 - Single UI system B4: optional public Status Slot

- Backup before the source change:
  `.codex-backups/10-ui-canvas/WorkspaceKit-before-single-layout-system-b4-status-slot-20260819-134456.zip`
  (SHA-256 `0EEEA82F0A2A409BC562ABF47E5BCAEF1F6E01ABCC241E8EF9CF3F28C40E3468`).
- The Host already allocated a fifth bottom Status Slot and panels already used
  its controller, but both the host and its status line were styled only by
  WK-private selectors. This was the remaining shared-panel geometry outside
  the public UI Kit contract.
- Added optional `workspacekit-ui-panel-status-slot` and
  `workspacekit-ui-panel-status` primitives. The existing WK classes remain
  on the same elements for compatibility; dormant Status Slots stay hidden.
  No status message, preference, hover-help behaviour, or panel action changed.
- Fresh `:8190` page acceptance verified all three status hosts use the public
  class with `8px 20px 10px` padding and a 1px border. Workflows (`31` items),
  Nodes (`1596` nodes), and Templates (`3` templates) retained their live
  status text and each range input still changed `50 → 100`, with no WK error.

## 2026-08-19 - UI refinement B1: 15px shared panel gutter

- Backup before the source change:
  `.codex-backups/10-ui-canvas/WorkspaceKit-before-ui-refinement-b1-15px-gutter-20260819-140606.zip`
  (SHA-256 `602B841C6B02B1BA78DF2ECB71694FAE27E83802D6D6DA6BFAE08245A2BC2246`).
- The live Slot audit established that the only active horizontal-gutter source
  is `--workspacekit-ui-panel-inline-padding`; the similarly named
  `--workspacekit-panel-*` declarations in host CSS had no consumers and were
  removed rather than left as a misleading second source of truth.
- Changed the UI Kit shared horizontal gutter from `20px` to `15px`. No local
  panel-specific padding or business renderer was changed.
- Fresh `:8190` acceptance measured all three core pages: Toolbar
  `12px 15px 0`, Controls `12px 15px 0`, Content `12px 15px 16px`, Status
  `8px 15px 10px`. Every scale range still changed `50 → 100`; no WK console
  error occurred. Syntax and `git diff --check` passed.

## 2026-08-19 - UI refinement B2: active tab-to-panel connection

- Backup before the source change:
  `.codex-backups/10-ui-canvas/WorkspaceKit-before-ui-refinement-b2-active-tab-connection-20260819-141445.zip`
  (SHA-256 `F7BD3C3EF1C5B7E88A5CB918BD19E6BDD2545D0C1697624EC8505192DEF79E96`).
- Live screenshot and computed-style inspection found that the active tab took
  a blue-tinted fallback from the outer tab strip, while the panel used the
  white `--workspace2-panel-fill`. The boxes touched but their surfaces did
  not, so the tab read as detached.
- Active core and overflow tabs now take `--workspace2-panel-fill` as their
  surface and add a one-pixel same-surface seam cover. The existing rounded
  shoulder pseudo-elements remain; no tab labels, overflow menu, Provider
  pinning, or panel content changed.
- Fresh `:8190` page acceptance confirmed the active surface equals the
  frame's panel-fill token, the seam cover is present, and Nodes → Templates
  → Workflows switches activate the expected tab with no WK error. Before/after
  screenshots are retained locally under `.dev-docs/artifacts/`.

## 2026-08-19 - UI refinement B3: shared view switcher and Nodes divider removal

- Backup before the source change:
  `.codex-backups/10-ui-canvas/WorkspaceKit-before-ui-refinement-b3-view-switcher-20260819-141655.zip`
  (SHA-256 `5472128970E16CD15360162C537CD9D0A9A8B866FD6A210B89F4E2021057D75D`).
- Workflows' All/Favorites was a two-button compact pill while Nodes' three
  section controls were a separate tab implementation. They share visual
  purpose but not selection semantics: Workflows is exclusive; Nodes allows
  multiple enabled filters. The Nodes row also retained a legacy top divider
  that duplicated the shared Controls-slot spacing.
- Added shared `workspacekit-ui-view-tabs` / `workspacekit-ui-view-tab`
  visual classes. Workflows supplies two columns; Nodes supplies three and
  retains its 8px separation from the root row without a border. Existing
  state, localStorage keys, button labels, and click handlers remain intact.
- Fresh `:8190` acceptance measured a two-column Workflow switcher and a
  three-column Node switcher, both without a top border. All/Favorites changed
  `true,false → false,true`; a Node filter changed `true → false → true`.
  No WK console error occurred; syntax and `git diff --check` passed.

## 2026-08-19 - UI refinement B4: first public typography-token migration

- Backup before the source change:
  `.codex-backups/10-ui-canvas/WorkspaceKit-before-ui-refinement-b4-typography-tokens-20260819-143100.zip`
  (SHA-256 `89A1AA9DA2EB3E819669E98A6009B511C87DE1746A710CBE9464F0214367E1CE`).
- The UI Kit had a base font but no named compact-panel scale. Core chrome
  mixed literals with legacy panel metadata variables, so typography could not
  be consistently reused by future family panels.
- Added public sizes `meta=10`, `compact=11`, `control=12`, `body=13`,
  `title=14` and weights `400/500/600/700`. The Host Shell is now the type
  token root so its tab strip inherits the same scale as hosted Slots.
  This batch deliberately excludes scalable tree rows, preview cards, dialogs,
  and settings content.
- Fresh `:8190` acceptance measured: active module tab `12px/500`, toolbar
  text action `12px/600`, view switcher `10px/500`, and bottom status
  `11px/500`; all preserve their theme-derived colors. The Workflow range
  still changed `50 → 100`, no WK error occurred, and syntax/
  `git diff --check` passed.

## 2026-08-19 - T-056 R6 / T-602: Family Provider lifecycle acceptance

- Backups before this verification/fix batch:
  - `ComfyUI-WorkspaceKit/.codex-backups/10-ui-canvas/WorkspaceKit-before-T056-provider-lifecycle-acceptance-20260819-120300.zip`
    (SHA-256 `16E2117AD87C4E47B5282DD0FD283384676ADC6FA6734DC96BA22FB31BF208E0`);
  - `ComfyUI-WorkspaceKit-Layout/.codex-backups/10-ui-canvas/WorkspaceKit-Layout-before-T056-provider-startup-fix-20260819-115800.zip`
    (SHA-256 `DC49BF1FB8F131043683A89B63F648D9D1318B64E9645303EDA7ABB2BA829EF4`).
- Real failure reproduced at `:8190`: Layout requested successfully but never
  registered. The browser reported `vite:preloadError ... isPermanent is not
  defined`; the legacy toolbar initialization had a bare `isPermanent` branch
  after its value had already been folded into `storedMode`. This aborted the
  entire Layout module before Provider registration.
- Minimal Layout repair: remove only that unreachable bare-variable branch and
  add a source regression test. It does not alter NodeAligner commands,
  sidebar styling, or the user's pre-existing uncommitted Layout changes.
- Real page acceptance is now automated by
  `scripts/e2e/t056-family-provider-lifecycle.mjs`: Theme and Layout both
  register; Theme -> Layout -> Nodes -> Theme leaves exactly one active
  Provider slot and no prior Provider DOM; a fresh browser context with WK
  integration disabled exposes both standalone tabs, mounts each bundled Vendor
  panel, then removes its panel-owned DOM on disposal. The run completed with
  `errs_workspace: 0`.
- Still not claimed: narrow-width and four-background visual comparison, plus
  real Chrome 100/125/150% zoom. These remain part of the shared P-05 visual
  matrix and cannot be substituted by the headless lifecycle test.

## 2026-08-19 - T-056 R3 core-panel geometry and Workflows Browse order

- Backup before the source change:
  `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-core-panel-geometry-and-workflow-browse-order-20260819-103528.zip`
  (SHA-256 `1F1C80F05005C99C048AB1934D7DD803975E93E5F6D431FAA027939C0C4454E2`).
- Cause confirmed from the live CSS: Workflows had cleared the legacy outer
  padding, while Nodes and Templates still retained it in addition to Blueprint
  slot padding. All three hosted core frames now use zero outer padding/gap and
  the same per-slot geometry: Toolbar `8px 10px 0`, Controls `8px 10px 6px`,
  Content `0 10px 10px`.
- Workflows now keeps Browse as its scroll/flex shell without a visible header.
  The rendered order is Open, then the `All / Favorites` switcher, then the
  workflow tree. No workflow data, drag/drop, file menu, or favorite operation
  was changed.
- Static verification passed: frontend syntax checks, panel-host contract,
  bottom-status contract, and `git diff --check`.
- Fresh read-only smoke at `http://127.0.0.1:8190/` passed with
  `console_errors_workspacekit: 0`. It asserted no hosted Header children,
  correct recycle-button states, and Browse order
  (`browseHeaderCount: 0`, `openBeforeBrowse: true`, tree present).
- Fresh real-page measurement at `:8190` confirmed the three core panels have
  identical outer frame geometry (`0px` padding and gap) and identical Toolbar,
  Controls, and Content padding. Visual inspection confirmed the Browse title
  row is absent and the switcher sits below Open.
- Still pending only the broader R1 visual matrix: light/transparent/frosted
  and browser 100/125/150% zoom plus narrow Provider-overflow. This entry does
  not claim those conditions as accepted.

## 2026-08-19 - T-056 R1/R2/R3 visual-conformance repair (hosted core panels)

- Backup before the source change:
  `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-r1-r3-visual-conformance-20260819-102035.zip`
  (SHA-256 `0EE80540C7E1E02DE8AC491773724039114C6C0FBA36B57298D9E3F4778F1A38`).
- The earlier migration was structurally incomplete: the shared bottom Status
  slot worked, but Workflows, Nodes, and Templates still mounted a legacy
  top-level module-name Header. Hosted core panels now leave that compatibility
  slot empty. Their active module tab is the only title and the bottom slot is
  the only status/metric surface. Standalone and legacy Provider fallbacks keep
  their Header contract.
- The shared strip now uses the reform reference geometry: inactive tabs merge
  into the darker strip, the active tab uses the panel surface, and 9px radial
  shoulders provide the connection without a thick underline. The plain tab,
  Provider-overflow wrapper, and settings utility share the same height and
  top-corner rhythm.
- Static verification passed: all JavaScript contracts, Python tests, version
  check, frontend syntax checks, and `git diff --check`. The dedicated sidebar
  smoke now asserts `headerChildren === 0`, a hidden Header slot, populated
  Toolbar/Controls/Content slots, and a populated bottom status for every core
  panel.
- Real test package evidence at `http://127.0.0.1:8190/`: Workflows, Nodes,
  and Templates each rendered an empty, hidden Header slot and retained bottom
  statuses (`29 个项目`, `1596 个节点`, `3 个模板`). The fresh read-only smoke
  completed with `console_errors_workspacekit: 0`.
- **Still pending visual acceptance:** compare the revised strip in light,
  transparent, and frosted backgrounds, plus 100/125/150% browser zoom and a
  narrow Provider-overflow state. This record does not mark those states as
  passed.

## 2026-08-15 - T-056 R1: Chrome-like module tab strip (partial acceptance)

- Backup before the source change:
  `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-r1-chrome-tab-strip-20260815-215021.zip`
  (23,018,039 bytes; SHA-256
  `B384929DCB8C2515860718AD7A13A17C837B3028919355310B31123505275BBF`).
- Changed only the shared host tab strip. Inactive tabs now use the strip
  rather than individual bordered cards. The active plain tab and active
  Provider-overflow wrapper share one theme-token surface with a small shoulder
  geometry; the old active underline and persistent strip divider are removed.
- Static regression passed: panel host, Provider tab plan, and sidebar startup
  resilience. The host test now asserts that the Provider-overflow wrapper,
  rather than only its inner label button, receives the active state.
- Test package `:8190` DOM evidence: Strip gap is `2px`; strip, plain tabs,
  Provider wrapper and settings utility have `0px` bottom borders. The active
  Theme wrapper received `is-active`. At a temporary `480 × 900` viewport the
  strip had `scrollWidth === clientWidth` (`312px`) and the settings button
  remained visible. The viewport override was reset after the test.
- **Not yet visually accepted:** the current test package has Layout's
  `#alignment-buttons` floating toolbar at the top stacking layer. It covers
  the sidebar's `y=0..40` tab-strip region in screenshots. This is an external
  Layout overlay, not evidence that the WK strip itself is positioned wrongly;
  do not add a WK offset workaround. Dark/light/transparent/frosted visual
  review and 100/125/150% browser zoom remain pending in an unblocked page.

## 2026-08-15 - T-056 R0: Provider / Blueprint compatibility baseline

- Backup before the test/documentation change:
  `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-r0-provider-compatibility-baseline-20260815-214411.zip`
  (23,016,934 bytes; SHA-256
  `4575A0CF0ACC9E8DFD1E2C9B696C68892BC4803FD71E7DE857E306CA94A5EAA5`).
- Static contracts passed: panel host, Provider-tab plan, Panel UI Template
  runtime, Template capability negotiation, Template primitives, and sidebar
  startup resilience.
- A regression case now mounts a pre-Blueprint-shaped Provider using only
  `headerHost`, legacy `contextHost` and `contentHost`; it ignores all newer
  slots and the UI capability, mounts successfully, then releases its opt-in
  toolbar row during disposal.
- Test package `:8190` real-page evidence: WK had one sidebar entry; opening
  the merged Theme Provider created exactly one child in each Header / Toolbar /
  Controls / Content slot. Switching Theme -> Templates -> Theme retained one
  child per slot and did not duplicate Provider DOM.
- Browser inspection runs in an isolated evaluation world, so it cannot read
  page JavaScript globals such as `WorkspaceKitPanelAPI` directly. DOM lifecycle
  evidence and the static API contracts are the authoritative evidence for this
  batch.

## 2026-08-15 - T-034: Refresh stability baseline (test package :8190)

- Scope: a fresh in-app browser page, one reload, and a temporary unsaved empty WorkspaceKit group. No source change and no workflow file write were performed.
- Before and after reload, the page had exactly one WorkspaceKit sidebar entry, a present `#xzg-group-overlay`, and a full-size canvas (`1280 × 719` in this browser viewport).
- The temporary group remained after reload at `y = 650`; no group rectangle had a non-finite value or an absolute Y coordinate above `10,000`. This does not reproduce the historical `y ≈ -19,000` failure.
- Reopening WorkspaceKit after reload showed its sidebar and the expected Workflows / Nodes / Templates / Theme tabs. The temporary group's title was `Group (right-click to edit)`.
- Read-back of `user/default/workflows/New Workflow.json` showed no persisted `xzgGroups` entry and an unchanged file modification time (`2026-08-15T12:06:13Z`). The temporary group was browser-session state only.

## 2026-08-15 - T-055 P-03a: WK Assets read-only boundary audit (test package :8190)

- Scope: source and local service inspection only. No Asset UI, directory, scanner, import, move, deletion, upload, or user-file mutation was performed.
- WorkspaceKit currently has no `entry/assets/` module, `/workspace2/assets` route, thumbnail endpoint, or asset-directory scan endpoint. `assets/sorted-custom-node-map.json` is only a Nodes-category map and is not a file-resource index.
- `service/safe_path.py` and the workflow trash transaction are scoped to the workflow root. They must not be reused as an implied authorization for input, output, or arbitrary user asset roots.
- Current ComfyUI `server.py` exposes the official read-only `/view` route. In the running test package, `/view?filename=..%2Fwk-assets-probe&type=output` returned **400** and a nonexistent output filename returned **404**. The source additionally checks its selected type root and any `subfolder` against the resolved root.
- Decision: a future WK Assets implementation must first define a separate read-only contract for allowed roots, metadata fields, preview `/view` parameters, pagination/cache ceilings, and error states. Only after that contract passes can P-03b consider file operations; browser cache is not an asset source of truth.

## 2026-08-15 - T-055 P-05b: Icon visual acceptance (test package :8190)

- Environment: a fresh in-app browser page loaded the test package at `http://127.0.0.1:8190/`; the WorkspaceKit sidebar entry, Workflows, Nodes, Templates, and WK Settings all opened normally.
- Dark + transparent: Workflows loaded with its File / Sort / Import / Trash toolbar, Browse row actions, and Settings icon. Nodes loaded 2,390 nodes; Templates loaded 3 templates. The rendered DOM found no zero-size or hidden `data-workspacekit-icon` element in the active Templates view.
- Dark + frosted: switched only the WK background effect to Frosted glass, then inspected Nodes and Templates. The active icon set retained normal computed dimensions (toolbar icons `15–16px`, row actions `14–15px`) and visible opacity; no console error was attributed to WorkspaceKit. The setting was restored to the original transparent mode after inspection.
- Light: switched ComfyUI's Color Palette from the original `Dark_ZY` to `Light`, inspected Templates and its toolbar/readable active states, then restored `Dark_ZY`. No functional-icon disappearance, clipping, or contrast failure was observed in this viewport.
- Limitation: this in-app browser reports a fixed `devicePixelRatio = 1`; its `Ctrl +` input did not change browser zoom. Therefore **100% / 125% / 150% browser-zoom acceptance is still pending**. No implementation change was made for this limitation.

## 2026-08-15 - T-055 P-01b official workflow command acceptance (test package :8190)

- Scope: only a temporary workflow under the test package workflow root; no plugin source was changed. Backup before the run: `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-before-p01b-official-command-acceptance-20260815-20260815-200419.zip`.
- Environment: `http://127.0.0.1:8190/` returned `/system_stats` 200, ComfyUI `0.32.0`; WorkspaceKit opened normally and its Workflows file menu exposed Import, New workflow, New folder, Save, Save As, Rename, Copy, Export, Export API, and Move to Trash.
- Official command path: created a temporary workflow, used **Save As** to create `P01b_command_20260815`, then **Save**. The saved file's UTC modification time advanced from `2026-08-15T12:06:46.6953140Z` to `2026-08-15T12:09:33.6521382Z` after the later Save command.
- **Rename** opened the official dialog, completed successfully, and updated the Open list and disk name to `P01b_command_final_20260815.json`. The final visible Open item title and `title` path agreed with the actual file.
- **Export workflow** and **Export API workflow** each opened the official `Export Workflow` dialog and closed normally after confirmation. The in-app browser did not expose those browser-managed export artifacts as a download event, so this is only command/dialog evidence. A separate Chrome attempt was blocked before the page loaded by `ERR_BLOCKED_BY_CLIENT`; no matching P-01b export artifact was found in the local Downloads or Desktop folders. **Pending:** verify both downloaded artifacts in a browser surface with visible download results before P-01b is marked complete.
- Input boundary discovered from real behavior: these official dialogs expect a filename in the active workflow's current folder. Entering `__WK_TEST__/name` while the active workflow is already in `__WK_TEST__` created `__WK_TEST__/__WK_TEST__/name`; entering only the filename retained the current folder. This is an official command input semantic, not a WorkspaceKit Browse synchronization regression.
- No WorkspaceKit console error occurred during command actions. One pre-existing ComfyUI frontend error, `ComfyApp graph accessed before initialization` from `assets/settingStore-CwkLtSKP.js`, was present before the checks and was not attributed to WorkspaceKit.

## 2026-08-15 - T-055 P-05a: Icon-system audit

| Check | Result |
| --- | --- |
| Rollback point | `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-p05-icon-system-audit-20260815-081519.zip` (349 source files) |
| Static icon coverage | 24 literal functional-icon references are covered by 40 local Icon Kit definitions |
| Allowed exception | `pi pi-sitemap` is only the current ComfyUI SidebarTab registration class-string fallback; the visible WK entry is the local `workspacekit` SVG mask |
| Template compatibility/export | Pass |
| Sidebar startup resilience | Pass |
| Test package `:8190`, dark theme | WorkspaceKit panel opened; Workflows, Nodes, and Templates each exposed local `data-workspacekit-icon` SVGs for their toolbar and row actions |

**Observed non-icon warning:** the page emitted one startup warning for missing
`workspace.title`. Both locale JSON files and the fallback map contain that
key; the evidence points to a pre-locale lookup in the sidebar DOM finder, not
to a missing translation asset. This audit does not alter startup/i18n timing.

**Remaining P-05b:** fresh visual acceptance of dark, light, transparent, and
frosted states at 100%, 125%, and 150% browser zoom. No visual inconsistency
was patched or claimed from this dark-theme DOM check alone.

## 2026-08-15 - T-055 P-01a: Workflow File toolbar and menu shell

This batch only moves the existing workflow creation actions into a **File**
menu and adds the active-workflow command surface. It does not introduce a
second workflow state store: save, save as, rename, export, and API export
continue to dispatch the current ComfyUI command IDs established by P-00;
copy and move-to-trash retain the existing WorkspaceKit workflow actions.

| Check | Result |
| --- | --- |
| Backup | ` .codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-workflow-toolbar-file-menu-20260814-235354.zip` was created before edits (347 source files) |
| Toolbar runtime shell | Test package `:8190` showed the requested order: search → File → Sort → divider → Import icon → Trash icon |
| File-menu runtime shell | The menu displayed Import, New workflow, New folder, save-related, copy, export, and trash actions; unavailable copy/trash actions were disabled for an active workflow not represented in Browse |
| Static asset route | After restarting the user-specified visible CPU test launcher, `/extensions/ComfyUI-WorkspaceKit/entry.js` and its Chinese locale route served the new source, including the concise File-menu translation keys |
| Menu isolation | Source logic closes File before opening Sort and closes Sort before opening File; File-button active styling is also cleared by close/outside-close paths |
| `node scripts/test-workflow-file-menu-renderer.mjs` | Pass |
| `node scripts/test-frontend-module-syntax.mjs` | Pass; 118 frontend modules |
| `npm test` | Pass; JavaScript contracts, Python tests, and release version check all completed |
| `git diff --check` | Pass |

**Runtime boundary:** the in-app browser session continued to render an already
cached extension module after the restart, although the server's extension and
locale routes served the new files. Therefore this record does **not** claim a
fresh-browser visual confirmation of the concise two new labels or the
File/Sort mutual-close behavior. The next P-01 acceptance must open a fresh
browser module session, select a Browse-backed workflow, and verify enabled
copy/trash plus save/save-as/rename/export success and failure feedback.

### P-01b service-action acceptance (test package only)

The isolated `__WK_TEST__` workflow directory was used for a reversible
service-level path: save a minimal workflow → copy → rename → move to WK trash
→ restore to the original path. The resulting paths were
`p01b-file-menu-source.json`, `p01b-file-menu-source (Copy 1).json`, and
`p01b-file-menu-renamed.json`; restore returned the renamed path. A duplicate
rename returned HTTP 409 and copying a nonexistent source returned HTTP 404.
No main-package workflow was read or changed.

## 2026-08-14 - T-055 P-00: current ComfyUI compatibility probe

This was a read-only compatibility probe before implementing the Professional
Workspace plan. It did not register, unregister, hide, or otherwise change any
official sidebar tab; it also did not invoke any workflow command.

| Check | Result |
| --- | --- |
| Test launcher | User-specified visible test-package launcher: `run_test_cpu_8190.bat` |
| Service health | CPU test process listened on `:8190`; `/system_stats` returned HTTP 200 |
| Runtime version | ComfyUI `0.32.0`; installed/required frontend `1.48.7` |
| Running page | WorkspaceKit sidebar entry was present on the loaded test page |
| Sidebar contract | The installed frontend's own source map shows `app.extensionManager = useWorkspaceStore()` and exposes `registerSidebarTab`, `unregisterSidebarTab`, and `getSidebarTabs` |
| Sidebar risk | `unregisterSidebarTab` removes a tab and active state but does **not** unregister its `Workspace.ToggleSidebarTab.<id>` command; only custom tabs receive `destroy()` |
| Workflow contract | `Comfy.SaveWorkflow`, `Comfy.SaveWorkflowAs`, `Comfy.RenameWorkflow`, `Comfy.ExportWorkflow`, and `Comfy.ExportWorkflowAPI` are currently registered; official actions first activate their target workflow |
| LiteGraph contract | Current `ContextMenu` accepts object items, `null` separators, event positioning, and parent/child menus |
| Path boundary | `safe_join` / `safe_relative_path` reject absolute paths, `..`, and resolved paths outside the root |

**Decision:** the active-workflow File menu can proceed as P-01 because its
official command contracts are present. Hiding the official Workflows/Node
Library sidebar entries remains blocked on a separate reversible lifecycle
probe: direct unregistration is not yet a safe implementation strategy.

## 2026-08-13 - T-054 node preview: one switch, bounded structural card

The previous mode selector was intentionally removed. Node previews now have
one toolbar switch: disable it to suppress hover previews; enable it to restore
them. No node screenshots, hidden-node instantiation, DOM scraping, or preview
cache were introduced.

The card uses the node definition already available to WorkspaceKit: input
ports and controls align on the left, output ports align on the right. A shared
preview model caps the visible layout at ten rows; if there is more content, the
last row is one summary such as `… 6 more controls · 3 more outputs`.

### Evidence

| Check | Result |
| --- | --- |
| `node scripts/test-node-preview-model.mjs` | Pass; verifies the ten-row cap and separate hidden input/control/output counts |
| `node scripts/test-frontend-module-syntax.mjs` | Pass; 115 frontend modules |
| `npm test` | Pass; JavaScript 90, Python 6, release version 0.2.6 |
| Locale JSON parse | `zh-CN` and `en-US` pass |
| Test package `:8190`, Nodes tab | The preview control changed from `关闭节点预览` to `打开节点预览` and back |
| Test package hover, disabled | No preview popover appeared for `Checkpoint加载器（简易）` |
| Test package hover, enabled | One popover appeared with three aligned structural rows: checkpoint control → `MODEL`, then `CLIP` and `VAE` outputs |

### Runtime boundary

The GPU test entry could not initialize in this session because the shared
PyTorch CUDA runtime reported `cudaErrorNotSupported` and then exited with an
access violation. The CPU test entry successfully served `:8190`, so the
frontend acceptance above was performed there. This is an environment startup
condition, not attributed to WorkspaceKit.

### Follow-up: official media-family adapter foundation

The second batch adds a small, exact-type adapter registry. It recognizes only
confirmed official image, audio, video, and 3D I/O node type names, then adds a
localized type badge to the existing structural card. It does **not** claim to
have the image, video, or canvas content itself. Title/category heuristics were
intentionally rejected because translated or third-party names are not reliable
evidence of a renderable media surface.

| Check | Result |
| --- | --- |
| `node scripts/test-node-preview-adapters.mjs` | Pass; verified exact official matches and third-party-name fallback |
| `node scripts/test-frontend-module-syntax.mjs` | Pass; 116 frontend modules |
| `npm test` | Pass; JavaScript 91, Python 6, release version 0.2.6 |
| Locale JSON parse | `zh-CN` and `en-US` pass |

The badge's live visual check is intentionally still pending the next test
package session; no claim of a real media thumbnail is made before then.

### Follow-up: narrow-card ports and preview controls

User acceptance on the main package found two concrete visual defects: output
ports were clipped at the right edge of a narrow card, and preview controls
looked like raised buttons because they included an outer shadow. The preview
grid now allows both labels to shrink and ellipsize before either port leaves
the card; output ports explicitly anchor to the right. Controls now use only
top and bottom inset shading.

| Check | Result |
| --- | --- |
| `node scripts/test-node-preview-visual-contract.mjs` | Pass; pins the shrinkable grid, right output anchor, and absence of the old outer shadow |
| `npm test` | Pass; JavaScript 92, Python 6, release version 0.2.6 |
| Main package `:8188` served stylesheet | Confirms responsive grid, output-anchor rule, inset lower shading, and absence of the old outer shadow |

The browser automation page was reclaimed by the client before it completed a
fresh screenshot, so the final visual acceptance remains the user's normal
main-package hover check after page refresh.

### Follow-up: static visual adapters for node prototypes

The node panel previews node **types**, not a selected canvas-node instance.
It therefore cannot know the real image, audio, video, or prompt content of a
specific workflow without inventing state. This batch adds only static visual
surfaces to the existing structural card: image frame/checkerboard, audio
waveform, video frame/timeline, and multiline-text area. The surfaces make the
kind of node recognizable while remaining explicitly non-runtime content.

| Check | Result |
| --- | --- |
| Adapter contract | Pass; image/audio/video/text exact-type adapters carry their declared surface |
| Visual contract | Pass; all four surface classes are required alongside narrow-card protections |
| `npm test` | Pass; JavaScript 92, Python 6, release version 0.2.6 |
| Locale JSON parse | `zh-CN` and `en-US` pass |

First visual acceptance remains pending a live page refresh: verify `Load
Image`, `Load Audio`, `Load Video`, and `CLIP Text Encode` show their respective
static surface, while an unregistered third-party node still shows only the
structural fallback.

### Follow-up: structural archetype resolver and richer media prototypes

The preview renderer is no longer limited to a growing list of node names.
It now resolves a presentation in two stages: exact, confirmed adapters retain
their media/text surface; every other node is classified only from public node
definition structure. A multiline widget becomes the text archetype; a long
definition becomes complex; otherwise widget and port density select form or
port-oriented structural presentation. It deliberately does not infer a media
preview from translated names, categories, or a port type alone.

Audio and video surfaces were also made more literal without pretending to be
the current graph instance: audio has a neutral file strip and player/waveform
geometry; image/video have a neutral file strip and media frame. No filename,
duration, thumbnail, output result, DOM scrape, hidden-node execution, or
third-party registration is involved.

| Check | Result |
| --- | --- |
| `node scripts/test-node-preview-archetypes.mjs` | Pass; exact adapter, multiline, form, complex, port, and fallback paths |
| `node scripts/test-node-preview-adapters.mjs` | Pass; exact adapter metadata remains explicit |
| `node scripts/test-node-preview-visual-contract.mjs` | Pass; narrow-card and media surface structure remain pinned |
| `npm test` | Pass; frontend module syntax 117 files, all JavaScript/Python/version checks pass |
| `git diff --check` | Pass |

Live visual acceptance remains pending: hover a generic multiline node, a
large/port-heavy third-party node, `Load Audio`, and `Load Video` at normal and
narrow sidebar width in both dark and light themes.

### Runtime follow-up: main package hover acceptance

The main package was opened at `:8188` with a 6,680-node catalog. The Nodes
panel completed its load and the enabled preview switch was present. Real mouse
hover (not synthetic DOM events) confirmed the following normal-width dark
theme cases:

| Node | Observed result |
| --- | --- |
| Official `Load Audio` | Localized audio badge, neutral file strip, playback symbol/waveform, and visible left/right structural ports |
| Official `Load Video` | Localized video badge, neutral media frame/timeline, and visible structural ports |
| Generic `StringFormat` | Classified from its public multiline widget; localized text badge, multiline surface, and normal structural row |

No clipped output port, raised control shadow, invented media metadata, or
popover overflow was observed in these three cases. Light-theme and an
intentionally port-heavy/over-ten-row case remain separate acceptance items.

## 2026-08-08 - README rebuild, product renamed to WK 面板, old screenshots archived

Four user decisions in one batch. One of them reversed mid-batch, which is the
most useful thing recorded here.

### The rename is not documentation-only

`WK 工作区` → `WK 面板`. The retired name was also three **runtime UI strings**
(`app.title`, `workspace.title`, `workspace.tooltip`) in both locale files, plus
the same keys in `entry/core/fallback-strings.js` (the values shown before the
locale loads). Changing only the READMEs would have left the sidebar showing the
retired name while the docs contradicted it. Six surfaces changed together:

| Surface | Change |
| --- | --- |
| `entry/locales/zh-CN.json` | `app.title` / `workspace.title` → `WK 面板`, tooltip → `ComfyUI WorkspaceKit（WK 面板）` |
| `entry/locales/en-US.json` | `WK Workspace` → `WK Panel` |
| `entry/core/fallback-strings.js` | same keys, both languages |
| `docs/BRANDING_AND_NAMING.zh-CN.md` | the authoritative name table |
| `docs/WK_ICON_SYSTEM_PLAN.zh-CN.md` | host row |
| `README.md` / `README.zh-CN.md` | product name |

Key counts stayed at 481 per locale, so the rewrite dropped nothing. Verified on
the running server: it serves `workspace.title` = `WK 面板`.

### Default-language swap, and why it was reversed

The user first asked for **Chinese as the default README**, then reversed it the
same day once the consequence was clear: `pyproject.toml` has
`readme = "README.md"`, so whatever lands in `README.md` becomes the **Comfy
Registry description**. Chinese default meant a Chinese Registry listing for a
mostly international audience.

Final layout is the original one: `README.md` English, `README.zh-CN.md` Chinese.

**The reusable lesson:** `scripts/release_version.py` reads both READMEs **by
filename** and rewrites the release-status line in each. Swapping languages
between filenames without updating that script breaks `python
scripts/release_version.py --check` immediately. Reproduced in **both**
directions this session:

- Chinese → `README.md`: `ERROR: README.md status does not match pyproject`
- reverted: passes again after `README_EN` / `README_ZH` were pointed back

`scripts/test-readme-surface.mjs` now pins the mapping so a future swap fails
loudly in the test suite instead of at release time.

### README content

Rebuilt from the user's GPT draft, corrected against the repository. The draft
was accurate on features — every claim was checked against the code, including
Dissolve / Flatten All, auto-numbering, and the group gestures — but wrong on
three points:

- It **dropped** credits (four referenced open-source projects), third-party
  license pointers, the developer-doc index, CHANGELOG/ROADMAP links, the
  settings section, and the user's own maintenance note. Credits and license
  pointers are an attribution obligation, so all of it was restored.
- It listed **WK Groups as a fourth sidebar tab** beside the three real tabs.
  Groups are a canvas feature, and `.dev-docs/README_CONTENT_AUDIT.md` forbids
  presenting an optional or compatible tab as a fixed fourth built-in.
- It used **WK 面板** before that rename had been communicated. That turned out
  to match the user's intent, so the branding doc was updated to the draft rather
  than the reverse.

### A stale name found while placing the new cover

The user described `006.jpg` as the cover for the "transparent node". Neither
README had such a section — both called that node **Title2**. Checking
`__init__.py` settled it: the node's `NODE_DISPLAY_NAME_MAPPINGS` value is
**`Transparent Title（透明标题）`** under the `🧩 WorkspaceKit` category. So the
READMEs had been documenting a menu entry that does not exist, and a reader
following them would fail to find the node. Both sections were renamed and
`006.jpg` placed there. The audit now names `__init__.py` as the single source of
truth for node display names, with an assertion.

### Screenshots archived, not deleted

`a1.png`, `a1.1.png`, `a2.png`, `a3.png`, `a3.1.jpg` moved to
`Preview/archive/` with a README explaining why: the UI changed and the images no
longer match the product. Archived rather than deleted so an older interface can
still be traced. Both READMEs dropped those five references, and the contract
test forbids referencing `Preview/a*` or the archive directory again.

Current assets, 9 per edition: covers `001` (overview), `002` (groups), `003`
(workflows), `004` (nodes), `005` (templates), `006` (Transparent Title), plus the
three demo GIFs `FileRecovery`, `GroupConversion`, `GroupedMemory`. Because real
GIFs now ship, the "GIF tutorials are still being prepared" limitation was
removed from both editions.

### Verification

| Check | Result |
| --- | --- |
| `npm test` | JS **89** / Python 6 / version 0.2.5 - all pass |
| `release_version.py --check` | fails on swap, passes after the mapping is fixed (both directions) |
| Local image/link targets | scripted, 9 images per edition, **0 broken** |
| In-page anchors | 5 per edition, **0 missing** |
| Locale key counts | 481 each, unchanged |
| Live server (`:8190`) | serves `workspace.title` = `WK 面板` |
| Live page console errors | **0** |
| Python syntax | `py_compile` clean |

New contract: `scripts/test-readme-surface.mjs`. It pins each file's language,
the release script's filename mapping, that every local target resolves, the
assigned covers and GIFs, the audit's fact boundaries, the archive rule, the node
display name, and the absence of the retired `WK 工作区` / `WK Workspace` strings
across all six surfaces including the locales.

**Note:** the sidebar tab's `aria-label` stays `WorkspaceKit`. That is by design —
registration runs before the locale loads and uses a stable fallback.

## 2026-08-07 - Canvas context-menu ordering (T-050) and sidebar glyph (T-051)

Two user-reported issues. The menu one is a **regression with an unusual shape**:
the code that fixes it has been present the whole time but never ran.

### T-050 - the three canvas menu rows jumped position and split apart

The three rows are registered as one block, in a fixed order, with a divider.
ComfyUI appends every extension's items to the end of the menu in extension load
order, which is not stable across page loads - hence the moving position, and
hence a foreign extension's row appearing between ours.

A correction pass exists to repair that. Commit `18971da` (2026-07-24) deleted
**its call site and the `WORKSPACE2_MENU_LABELS` set it depended on, but left the
function body behind**. Two consequences worth remembering:

- It has not run since that commit. The behaviour the user reported is simply its
  absence.
- **Calling it in that state throws `ReferenceError`** - the set it reads is gone.
  So "add the call back" alone would have traded no-ordering for a crash on every
  menu open. Verified: `node -e` on the same shape reproduces the ReferenceError.

Why it was half-deleted is the useful part: the label set was **hardcoded
Chinese** (`🧩 编组`), so it could never match again once labels became
translatable. Deleting the call leaves a quiet symptom (no ordering); deleting
only the set crashes loudly. The quiet half is the one that survived review.

The fix identifies our rows by the **🧩 marker instead of a label list**, which is
language-independent and cannot rot the same way. `WORKSPACE2_MENU_MARK` now
derives from the module's exported marker, so the rows we register and the rows
we reorder cannot drift apart.

Placement follows the user's two constraints: keep the first 2 native rows where
they are (do not claim row one), put our block directly below them, and **never
at the bottom**.

**Rejected, with reason:** anchoring below another plugin's row (the user
suggested two). Both belong to other extensions, so anchoring means matching
their text at menu-open time - which fails silently when they rename, translate,
or are not installed, dropping us back to the menu's end.

### T-051 - the sidebar icon was monochrome and hard to find

By design: the glyph was a CSS mask recoloured to `currentColor` so it matched the
native icons. That is exactly why it was hard to spot in a column of same-coloured
icons. Now it renders the 🧩 character, matching our menu prefix.

**Do not pin a colour on that glyph.** A colour-emoji font supplies its own colours
and ignores `color`, but a platform without one falls back to monochrome text,
which must inherit the theme's text colour to stay visible. My first version used
`color: initial` (= black), which would have been **invisible on a dark theme**.
Fixed, and a contract assertion now forbids any `color` in that rule.

### Verification

| Check | Result |
| --- | --- |
| `npm test` | JS 88 / Python 6 / version 0.2.5 - all pass |
| Real page, extension loads | `comfyui.workspace2` present in `app.extensions` |
| Real page, console errors | **0** (was 8, including the fatal one) |
| Emoji stored as UTF-8 | verified by codepoint, `U+1F9E9`, not mojibake |

### The syntax error I shipped, and the check that missed it

The first version of T-051 **took the whole extension down**: the sidebar entry
disappeared entirely. Cause, in my own code: I wrote an explanatory CSS comment
*inside* the styled template literal, and it contained backticks around `` `color` ``.
A backtick ends a template literal, so the string closed early and the file became
invalid JavaScript.

**`node --check entry/entry.js` passed on that file.** That is not a fluke, it is
the parse goal: `node --check <file.js>` parses with the **script** goal, and the
broken shape happens to re-pair into something the script goal accepts. The browser
loads these files as **ES modules**, and the module goal rejects it:

```
SyntaxError: Unexpected identifier 'color'
```

Reproduced both ways on the actual file: `node --check broken.js` passes, the same
bytes as `broken.mjs` fail at the exact line. This is the same blind spot that the
tech-debt register records as T-601 ("contract tests cannot cover an entry.js
browser load"), now with a concrete instance and a fix.

**New guard: `scripts/test-frontend-module-syntax.mjs`** parses all 114 shipped
frontend files with `--input-type=module --check`, which is how the browser loads
them. It needs no browser and no server. Verified it actually catches the bug by
reintroducing it: the old check passed, the new contract failed. It also forbids
`/* ... */` inside that specific template literal, since that is the exact shape
that broke.

**Lesson worth keeping:** prose explaining a CSS rule belongs in a JS comment
*above* the template literal, never inside it. Backticks are common in prose about
code, and the failure is invisible to `node --check`.

### Real-page acceptance (test package `http://127.0.0.1:8190/`)

The test package is on **port 8190**. I had probed 8188/8189/8000/3000 and wrongly
concluded no server was running; the port is recorded throughout this file. Check
here first next time.

T-050, canvas menu ordering - **4 consecutive page loads, identical every time**:

| Pass | Total rows | Our rows | Contiguous | First row native | Ever last |
| --- | --- | --- | --- | --- | --- |
| 1 | 39 | 3, 4, 5 | yes | yes | no |
| 2 | 39 | 3, 4, 5 | yes | yes | no |
| 3 | 39 | 3, 4, 5 | yes | yes | no |
| 4 | 39 | 3, 4, 5 | yes | yes | no |

Stability across reloads is the whole point of the fix, so four loads returning the
same three indices is the acceptance. This was a genuinely crowded menu (39 rows,
rgthree / KJ / UE / group-executor all present), which is a stronger test than a
clean install.

Canvas menu, measured separately, 33 rows: our divider at row 2, our three rows at
3/4/5 in registration order (`编组` / `新建空白编组` / `保存为模板`), our closing
divider at 6, and `⚡ 打开组执行器` left untouched at its own row 11.

T-051, sidebar glyph:

- `.workspace2-tab-button` present, `aria-label` `WorkspaceKit`, style tag installed.
- `::before` computed: content `"🧩"`, `font-size 16px`, box `18x18px`, colour
  inherited (`rgb(138,138,138)`) - **not pinned**, which is the requirement.
- The native icon element is `display: none`, so there is no double glyph.
- **Rendered in colour, measured not eyeballed:** drawing the glyph to a canvas and
  counting pixels yields 126 distinct colours, 68 of them saturated. A monochrome
  fallback would yield ~1. (A screenshot cannot prove this; pixel sampling can.)
- Clicking the entry opens the panel with all four tabs (工作流 / 节点 / 模板 / 主题).

**Still needs the user's eyes:** the glyph's legibility in a **light** theme. The
test package runs a dark theme, and no colour is pinned, so the monochrome-fallback
path is the only theoretical risk - but that is a visual judgement, not an assertion.

## 2026-08-06 - Dissolve fixes shipped: T-046, T-047, T-048 (T-049 deferred)

Follow-up to the investigation logged below. All three approved items are
implemented and verified; the success-flash request (T-049) was deliberately left
open by the user.

### What changed

| Item | Change |
| --- | --- |
| T-046 | `_relative_key()` now collapses `Path(".")` to `""`, so a top-level dissolve no longer writes `./child` metadata keys. `normalize_folder_meta()` strips any `./` prefix on every read and write, so metadata already poisoned by earlier builds heals with no migration step. |
| T-047 | A name collision is now numbered (`flow (2).json` / `流程（2）.json`) instead of refusing the whole operation. New `service/name_sequence_service.py` owns the naming; the extension always stays last. |
| T-048 | Resolved as option C: `解散` keeps promoting one level, and a separate `全部拍平` was added to both the Workflows folder menu and the Templates group menu. Flatten always asks for confirmation. |

### T-046 confirmed against the live server before and after

The running 8190 server still had the pre-fix Python, which made a clean
before/after possible on the real filesystem:

| Step | Result |
| --- | --- |
| Dissolve top-level `wkT1` on the **old** code | `parent_path: "."`, metadata keys `./wkT2`, `./wkT2/wkT3` |
| Panel after reload | `wkT2` row present, its 🌟 **gone** (`iconText: ""`) — the reported symptom |
| Same poisoned file through the **fixed** normalizer | keys healed to `wkT2`, `wkT2/wkT3`, 🌟 preserved |
| Dissolve top-level `wkT2` with the **fixed** service | `parent_path: ""`, no poisoned keys, promoted folder kept its colour |

### Two bugs found by testing, not by reading the code

**A child sharing its parent folder's name failed outright.** `A/B/B` dissolving
`B`: the source directory is still on disk while its children are moved, so
treating its name as free produced `renamed_count: 0` and then a hard
`FileExistsError`. Both dissolve and flatten now count the source folder's own
name as taken. This is a legitimate structure, and the first implementation broke
it — it is covered by a contract test now.

**Locale bracket width is not interchangeable.** `same（2）.json` and
`same (2).json` are different filenames, so numbering restarts at 2 per style
rather than continuing one series across locales. Asserted explicitly so a future
"normalization" of the suffix does not silently start overwriting files.

### Flatten rollback verified at its worst moment

Flatten removes directories, so a failure after the files have moved is the
dangerous case. Simulating a metadata-write failure at exactly that point:
every file restored byte-for-byte, the metadata restored, and the subtree
directories recreated. Covered by a contract test that injects the failure.

### Verification

`86` JavaScript contracts, `6` Python contracts (two of them new:
`test-name-sequence-service.py` and the extended dissolve suite), release-version
check `0.2.5`. Live UI verified for both panels: `全部拍平` appears on folder and
group rows but **not** on file rows, its confirmation mounts in place with
`取消 / 全部拍平`, and flattening a 3-level template tree removed all three levels
while keeping the template.

**The new `/workspace2/folder/flatten` route needs a ComfyUI restart to load.**
The server was left running (the canvas had unsaved changes), so the flatten
route was exercised by calling the service directly against the real workflows
directory rather than through HTTP.

Every probe artifact was removed afterwards: folders `wkT1`/`wkT2`/`wkT3`/`wkC`/
`wkF`, the promoted `deep.json`/`dup*.json`, the seeded template groups, and the
`./` metadata keys the old-code probe created. `folder_meta` was restored to
`{SD: ✨, flux2_Klein: #FF453A}` and the template library to empty.

> A `curl -d` with an emoji in the body silently mangled `SD`'s `✨` to `?`,
> writing corruption into the user's real metadata. It was caught and restored
> immediately. **Post JSON containing non-ASCII text through Python with
> explicit UTF-8 encoding, never through a shell `curl -d` literal.**

## 2026-08-06 - Folder/group dissolve: two rounds of live investigation (T-046..T-049)

The user reported that dissolving the top level of a 5-level tree "does nothing",
in both the Workflows and Templates panels. Investigation only this round — no
code was changed. **Both premises in the report turned out to be false**, but the
investigation found one real defect and two product-semantics splits.

### Depth is irrelevant; name collision is the actual trigger

Measured on the live 8190 page:

| Tree | Target | Result |
| --- | --- | --- |
| 5 levels, no collision | top level | **200 OK**, child promoted to root |
| 5 levels, no collision | each of levels 2–5 | **200 OK** |
| 2 levels, child name exists at root | top level | **409 `Target already exists: SD`** |

So a 5-level dissolve succeeds and a 2-level dissolve fails. `dissolve_folder()`
pre-checks every destination before moving anything and refuses the whole
operation on conflict — nothing moves. That refusal is **correct** (otherwise it
would overwrite the user's existing folder). The problem is purely that the error
lands only in the small status line (`错误：Target already exists: SD`) with no
dialog and no highlight, so it reads as a dead button.

This is why it reproduced in the user's real directory and not in a clean test
directory: real trees have repeated folder names, freshly-created probe trees
don't. **When a user reports "no effect", check for a silently-surfaced refusal
before looking for a broken handler.**

### The Templates panel did not reproduce at all

Built 5 nested groups with the template only in level 5, expanded every level,
clicked dissolve on level 1. **Level 1 is what disappeared:**

```
visibleBefore: ["第1层","第2层","第3层","第4层","第5层"]
visibleAfter:  [       "第2层","第3层","第4层","第5层"]
serverAfter:   第2层(K2)<-ROOT, 第3层(K3)<-K2, 第4层(K4)<-K3, 第5层(K5)<-K4
templateNow:   我的模板@K5
```

The likely reason the user read this as "only level 5 was dissolved": with one
level gone, every remaining row shifts one indent step left, so the screen looks
like "the outermost is still there and an inner one vanished".

**Assert hierarchy bugs by name, never by indent position or row number.** A
whole round was spent reproducing a defect that does not exist because the report
described a visual position rather than an identity.

### The one real defect (T-046): top-level dissolve loses icons and colours

`dissolve_folder()` derives the parent key with `str(rel.parent)`. For a
top-level folder `Path('A').parent` is `'.'`, not `''`, so promoted entries get
metadata keys like `'./N2'` while the tree looks them up as `'N2'`.

Measured — set 🌟 + green on `N1/N2`, then dissolved `N1`:

```
metaBefore : ["N1", "N1/N2", "N1/N2/N3", "N1/N2/N3/N4"]
parent_path: "."                      <-- should be ""
metaAfter  : ["./N2", "./N2/N3", "./N2/N3/N4"]
metaHasPlainN2: false   metaHasDotN2: true   n2HasIconGlyph: false
```

Middle levels are unaffected (`'A/B'` correctly yields `'A'`). Files themselves
are never lost — only the custom icon/colour.

### Two behaviours that look like "no response" but are correct

- **Empty folder**: 400 `Cannot dissolve an empty folder`. Deliberate — an empty
  folder should be deleted, not dissolved.
- **Dissolve promotes one level only**. `A/B/C/D/E` dissolving `A` moves `B` with
  `C/D/E` intact to root; it does not flatten all five levels.

### Cleanup

Every probe folder, template group, and the `'./'` metadata keys the probes
created were removed; `folder_meta` was restored to its pre-test contents
(`SD`, `flux2_Klein`) and the root folder list verified back to
`123, __WK_TEST__, SD, 新建文件夹`.

## 2026-08-06 - Canvas groups (T-045): one border width, three call sites

Four follow-up reports from the user after T-044. Three were the same underlying
problem in different places; the fourth was a UI preference.

### The one that mattered: a stored preset was winning

T-044 set the built-in default border width to 1px, and a probe on a clean
browser confirmed it (`builtInBw: 1`). The user still saw 2px on new groups. Both
observations were correct.

`readStylePresets()` merges `localStorage` **over** the built-in style, so a user
who had ever saved a style preset kept whatever width that preset stored. The
default was right and the stored preset was overriding it. Probing the user-facing
path rather than the constant is what surfaced this — reading
`getBuiltInStyle().borderWidth` alone would have "confirmed" the bug was fixed.

Fixed with a narrow one-time migration (`migrateLegacyPresetBorderWidth()`):
`borderWidth` only, only from the single legacy value, gated on a persisted flag.
A width the user deliberately chose survives, and a 2px chosen *after* the
migration is never touched.

### The other two: the same value in three places

`PRESET_BORDER_WIDTH = 1` now backs all three paths that must agree — a new
group, applying a colour swatch, and native → WK conversion. Previously each
carried its own literal, so "the border is 1px" was true in one and false in two.

Applying a colour swatch now also sets the width: a preset is a **complete** look.
Note the deliberate asymmetry — the custom colour picker does **not** reset the
width, because that is a colour-only edit, not a preset.

Native → WK conversion gained a `CONVERTED_STYLE` distinct from the generic
`DEFAULT_STYLE`: white text, 1px white border. `useUnifiedColor: true` is
load-bearing — it is what carries white through to the border, and setting the
font white without it leaves the border gold, which is the half-applied state the
user was reporting.

### Results

Acceptance on the real test package at `http://127.0.0.1:8190/`:

| check | result |
|---|---|
| legacy 2px presets migrated | pass — `[2,2,4,2]` → `[1,1,4,1]`, the deliberate 4px survived |
| other preset fields untouched | pass — `titleColor #FFD700` preserved |
| migration flag persisted, storage rewritten | pass |
| new group, record and drawn border | pass — `borderWidth 1`, drawn `1px` at scale 1 |
| colour swatch sets width, slider and label | pass — record `1`, slider `1`, label `1px`, redrawn at `1px` |
| width slider still usable after a preset | pass — moved to 3 |
| native → WK: font, border, unified flag | pass — `#FFFFFF`, drawn `rgba(255,255,255,0.65)` at `1px`, `useUnifiedColor true` — both a shorthand (`#A88`) and a modern (`#a1309b`) native colour |
| title bar still keeps native colour | pass — red paints `rgba(214,81,81,0.5)`, stored `rgba(170,136,136,0.5)` |
| archived group round trip | pass — kept its own `#00FF00` font, size 22, border 5 rather than the converted white look |
| double-click copy: no dialog | pass — clipboard `red`, outline flash on, zero notices, restored after 450ms |

Regression 18/18: an existing group keeps its own 4px through a rebuild; the
custom colour picker stores verbatim **and does not reset the width**; `black`
still pins `#828282` and opacity 50; the opacity slider still moves; single click
still applies a colour and preserves the current alpha; display brightening still
intact (green stored `rgba(136,170,136,…)`, painted `rgba(84,192,84,…)`);
serialization keeps the native colour; bypass magenta still overrides; a 2px
chosen after the migration survives and a new group honours it. Zero WorkspaceKit
console errors.

Suite: 86 JS + 5 Python, release version `0.2.5`.

### Probe note

Two apparent failures in the first regression run were probe faults, verified as
such rather than assumed:

- **"new group DOM border is 1px" failed with `0.9px`.** The border is drawn
  scaled (`borderWidth * scale`) and the canvas was at 0.9. Correct behaviour;
  the probe was comparing a scaled value against an unscaled literal. Pin
  `app.canvas.ds.scale = 1` before asserting drawn pixel widths.
- **"a deliberate 2px survives" failed.** That page had never run the migration,
  so writing 2px presets *then* reading them let the migration run for the first
  time and correctly treat them as legacy. The check only means anything when the
  flag is already set — seed `borderWidthMigrated: '1'` first.

## 2026-08-06 - Canvas groups (T-044): group colour presets — store native, paint bright

Five requests from the user about the ten colour swatches in the group settings
dialog. Answering them required measuring the native palette and reading
rgthree's filter, both of which contradicted an assumption in the request.

### Two findings that changed the work

**The native palette has nine entries, not nine-plus-"no colour".** Measured
order: `red, brown, green, blue, pale_blue, cyan, purple, yellow, black`. The
`No color` item in the native right-click submenu is not a colour — it is an
operation that **deletes** the colour field, after which the group serializes
with no `color` key at all and falls back to `#333` / `#AAA`. The user's
recollection of the order included "no colour" and omitted `black`.

**The swatch order was already correct.** Read straight out of the live dialog,
the ten buttons were in exactly the native order. What looked like a shuffle was
a legibility problem: five native entries are three-digit shorthands whose
channels all sit between `0x88` and `0xAA`, so `red #aa8888`, `green #88aa88`,
`blue #8888aa` and `cyan #88aaaa` are nearly indistinguishable at 18px, and the
old tenth filler `#cfafaf` was a washed pink one step from red. No ordering
change was made; fixing the colours removed the symptom.

### The split: identity vs appearance

LiteGraph's hex is colour **identity** — rgthree's `matchColors` and WK ⇄ native
conversion both compare it exactly. So the two values were separated:

- `headerBgColor` / `nativeGroupColor` store the **untouched native RGB**
- every paint path runs it through `displayColorForNativeHex()` first

New pure module `entry/canvas-groups/preset-color-display.js`. **Hue is never
touched** — only saturation and lightness; a shifted hue would make "red" stop
reading as red after a native round-trip, the exact mismatch the split prevents.
Only the four muddy shorthands are brightened; the four modern hexes and any
user-picked colour pass through byte-identical.

`black` is the deliberate exception, using the user's own measured values: it
paints true `#000000` at the 0.5 opacity cap with a pinned `#828282` font,
rather than being brightened to mid-grey. A brightened black would lose the
"low priority" meaning the dark swatch carries, and the luma-based font rule
would pick white on near-black.

### Why the tenth swatch copies a hex, not a name

`rgthree-comfy/src_web/comfyui/fast_groups_muter.ts` L150–176: a word is looked
up in `node_colors` and, **failing that, treated as a hex**. So an invented label
like `other` becomes the colour `#other`, matches nothing, and fails silently —
no error, no warning. The user's suggestion to name the tenth swatch `other` was
therefore declined; it copies `#e0508f` instead. Also recorded there: a group
with no colour is skipped entirely (`if (!groupColor) continue`), so a
"no colour" group would vanish from the Fast Groups list — which is why the
"no colour" idea was dropped in favour of a real tenth colour.

The tenth is a rose at ~330°, filling the widest gap in the native hue
distribution (purple 303° → red 0°, 57° empty) and staying more than 20° from
every native hue.

### Results

Acceptance, on the real test package at `http://127.0.0.1:8190/`:

| check | result |
|---|---|
| swatch row: ten entries, native order, brightened display | pass — `red rgb(214,81,81)`, `green rgb(84,192,84)`, `blue rgb(100,100,206)`, `cyan rgb(76,189,189)` |
| stored value stays native after applying red | pass — `rgba(170,136,136,0.25)`, `nativeGroupColor #aa8888` |
| painted value differs from stored | pass — `rgba(214,81,81,0.25)` |
| double-click `red` swatch → clipboard | pass — `red` |
| double-click rose swatch → clipboard | pass — `#e0508f` |
| double-click `pale_blue` → clipboard | pass — `pale_blue` (the underscore form a user would not guess) |
| black preset: font, opacity, paint | pass — `#828282`, slider `50`, `rgba(0,0,0,0.5)` |
| native → WK conversion opacity | pass — both groups at `0.5` |
| shorthand `#A88` expanded on conversion | pass — `rgba(170,136,136,0.5)` |
| WK → native round-trip keeps identity | pass — `#A88` → `#aa8888`, rose exact |
| new group defaults | pass — `borderWidth 1`, unified colour ticked |

**rgthree compatibility, the point of the whole exercise** — replicating its
resolution verbatim against a WK-coloured group:

| filter word | resolves to | matches group `#aa8888` |
|---|---|---|
| `red` | `#aa8888` | **yes** |
| `#d65151` (the brightened display value) | `#d65151` | no — proves the display colour never reached storage |
| `other` | `#other` | no — fails silently, as predicted |

Regression 14/14: an existing group keeps its own configured 4px border (the new
1px default applies to new groups only); a custom `#123456` is stored **and
painted** verbatim; the opacity slider still moves after a preset pinned it;
single click still applies a colour and preserves the current alpha; body fill
still follows the title bar; serialization stores the native colour; bypass tint
still overrides the display colour and un-bypass returns to it; a second new
group also picks up the new defaults. Zero WorkspaceKit console errors
throughout.

Suite: 86 JS + 5 Python, release version `0.2.5`. New contract
`scripts/test-group-preset-color-display.mjs`;
`scripts/test-group-reverse-conversion-plan.mjs` and
`scripts/test-group-settings-colors.mjs` updated for the new expectations.

### Probe note

The T-043 entry's two probe traps still apply. A third surfaced here: waiting on
`window.Workspace2CanvasGroups?.overlay` alone is not enough when a probe also
needs `LiteGraph.LGraphGroup` or `app.graph.add` — the overlay exists slightly
before the graph does, and a probe that starts too early fails with
`Cannot read properties of undefined (reading 'graph')`, which looks like a bug
in the code under test. Gate on every global the probe actually uses.

## 2026-08-05 - Canvas groups (T-043): a frame that followed the bare cursor forever

A user-reported defect, diagnosed first on request, then fixed. Investigating it
turned up a **second** bug in the same code with the same root cause, which the
original report had masked.

### What the user saw

Double-click a frame's title bar, drag one of the nodes inside it, release. From
then on the frame followed the mouse pointer with no button held. Escape did
nothing, Delete did nothing; the only escape was ungrouping.

### Root cause — one wrong assumption, two symptoms

The "node and border move together" drag starts from a press on a **node**, which
LiteGraph owns. LiteGraph responds with `setPointerCapture` plus `preventDefault`,
and inside such a gesture the browser stops emitting the compatibility mouse
events. Measured on the live page:

| event | during the drag | on release | after release |
| --- | --- | --- | --- |
| `pointermove` | fires | – | fires |
| `mousemove` | **0** | – | fires again |
| `pointerup` | – | **1** | – |
| `mouseup` | – | **0** | – |

The code listened for `mousemove` and `mouseup`, so it received the exact inverse
of what it needed:

1. **The reported bug.** `mouseup` never arrived, so teardown never ran. The move
   listener stayed bound and every later mouse motion was treated as "the drag
   continues". Escape and Delete were powerless because that surviving listener
   recorded which frame to move when it was bound and never re-reads the
   selection — which is also why the user's Shift-deselect did not help.
   `_suspendMembershipSync` stayed stuck `true` as well, silently disabling
   member auto-capture until the next successful drag.
2. **The bug the first one masked.** `mousemove` was suppressed for the whole
   drag, so the frame never followed the node *while* dragging either. Measured:
   the node moved `[200,300] → [267,344]` while the frame sat at `[188,229]`.
   Nobody had reported this because the runaway was so much louder.

Fixed by listening on both event families for both motion and teardown, plus a
second independent net: a move reporting `buttons === 0` ends the drag itself, so
a missed release is self-healing rather than permanent. Teardown is once-guarded
because a normal release now delivers more than one end signal.

### Why this surfaced now

The path requires pressing a node that is *already selected*. Before T-036 no
single action selected a frame's whole contents, so it was hard to reach. T-036's
double-click-selects-contents made a pre-existing defect reliably reproducible in
two steps. The joint-drag code itself is uncommitted T-036-batch work, so this
never shipped to a user in a release.

### One consequence worth preserving

Because two event families now report the same physical motion, the frame delta
must stay **absolute** from the gesture start. Accumulating it (`dx += ...`) would
double every movement. The contract test asserts both the absolute form and the
absence of `+=`, and acceptance checks the frame and node deltas are equal
(measured `[67,44]` and `[67,44]`).

### Results

- **T-043 acceptance: 16/16.** The user's exact sequence, listener counts by
  event name before/during/after, frame-tracks-node delta equality, Escape and
  Delete no longer followed by motion, membership sync resumed, and a *second*
  joint drag still working (the once-guard must not disarm the next gesture).
- **Regression: 19/19.** The three drag paths this did not touch (title-bar drag,
  corner resize, dragging an unselected node) still behave; `pointercancel` mid
  gesture ends it cleanly; members still reconcile; serialization still writes the
  frame into `extra.xzgGroups`.
- **Suites: 85/85 JavaScript + 5/5 Python** (84 → 85: `test-group-drag-teardown.mjs`).

### Two probe traps that cost real time here

- **The canvas-groups module is fetched twice in the test package** — once by
  ComfyUI's extension-directory scan (unversioned) and once by `entry.js`'s
  versioned import. Both assign `window.Workspace2CanvasGroups`, but only the
  versioned copy gets `init()` called, so whichever resolves last wins the
  global. When the unversioned copy wins, the global has a **null `overlay`** and
  creating a frame throws inside `renderGroup`, which looks exactly like a bug in
  the code under test. Probes must wait on `window.Workspace2CanvasGroups?.overlay`
  (the instance), not on `#xzg-group-overlay` (the element — the initialized copy
  put it there, so it is present either way), and reload if it never appears.
- **A stationary probe cursor sits on top of an action icon.** Now that the five
  title-bar icons appear when the pointer enters the frame, pressing "the middle
  of the title bar" lands on one, and their `mousedown` handlers `stopPropagation`
  so no drag starts. This read as "title-bar drag is broken" (`frameDelta=[0,0]`)
  until the event target turned out to be an `svg`. Aim header presses at the
  strip left of `.xzg-group-header-actions`, measured from the live DOM after a
  hover (61px wide in the default theme).

## 2026-08-05 - Canvas groups (T-038 + T-039): native ignore/disable visuals, hover-shown icons, execute-icon availability

Not a defect report — new behaviour, plus one wrong assumption of mine that
measurement overturned before it shipped.

### What changed

- **Ignore/disable now use ComfyUI's own node visuals instead of an invented
  purple.** The old code painted a bypassed frame with `hsla(280,60%,55%)` while
  the nodes inside it went magenta, so the frame and its contents told the user
  two different stories. Now: ignore = the bypass colour + 20% frame opacity,
  disable = no colour change + 40%, straight from `getNodeModeAlpha`. Ignore is
  deliberately *fainter* than disable (`.2 < .4`), matching native.
- **All five title-bar icons hide until the pointer enters the frame**, and the
  icon activation tiles are gone (the whole frame carries the state now).
- **T-039: the execute icon dims when the group has no output node**, reusing the
  same count the click path already checks.

### The wrong assumption, caught by measurement

The plan said the magenta is theme-overridable via `NODE_BYPASS_BGCOLOR`, so I
read that first. On the live page it is **`#cba6f7`, a lavender** — and a real
bypassed node paints `hsla(300,100%,50%,0.9)`, i.e. `#FF00FF`. So the node
rendering path reads `NODE_DEFAULT_BYPASS_COLOR` and ignores the theme-schema
name entirely. My original order produced exactly the divergence this task exists
to remove: a lavender frame around magenta nodes. Fixed to read
`NODE_DEFAULT_BYPASS_COLOR` first, with `NODE_BYPASS_BGCOLOR` as fallback. All
four measured values are now recorded in `docs/NATIVE_BEHAVIOR_REFERENCE.md` §4
so this is not re-derived. `app.extensionManager.setting.get('Comfy.ColorPalette')`
returned `null` and is not a usable source.

The acceptance suite now asserts this the robust way rather than against a literal
hex: it asks an actual bypassed node what colour it paints and requires the frame
to match (`node=hsla(300, 100%, 50%, 0.9) → rgb(255, 0, 255)`, `frame=rgb(255, 0,
255)`).

### Two design points worth keeping

- **Visibility could not be CSS `:hover`.** The user's trigger is the whole frame,
  but `.xzg-group-body` is `pointer-events:none` so nodes stay clickable — the
  frame's middle never receives a mouse event and cannot report hover. It is a
  per-frame geometric test instead, re-run every frame because the graph moves
  under a stationary pointer. Verified with a point 30px above the frame's bottom
  edge, deep in the body: all five icons appeared.
- **Hiding uses `visibility`, not `display`.** Measured: hidden icons keep a
  17.69px box and the title width is byte-identical hidden vs visible
  (`63.59` both), so the title never jumps. Also verified a hidden icon does not
  swallow clicks in its reserved space (`elementFromPoint` returns the actions
  container, not the button).

### Results

- **Acceptance 39/39** on the live test package: hidden-when-outside; all five
  visible from a body-deep point; title width unchanged; no activation tiles;
  execute icon `1` with an output node and `0.35` without; other icons unaffected;
  only the hovered frame shows icons; ignore sets nodes to mode 4 and the frame to
  `0.2` with header `rgba(255,0,255,0.45)` (user's own alpha preserved) and border
  `rgb(255,0,255)`; disable sets mode 2 and `0.4` keeping `rgba(40,80,120,0.45)`;
  restore returns opacity, colour and every node's original mode; the canvas fill
  dims too (`0.225 → 0.045` bypass, `0.09` mute, back to `0.225`); icons stay
  visible through a drag that outruns the pointer and hide on release; an open
  rename box pins them; a runtime colour change reaches both title bar and border;
  icons appear/hide correctly at 0.5× and 2×.
- **Regression 51/51**: all six animation effects (`default`, `rainbow`, `pulse`,
  `marquee`, `marqueebreathe`, `glow`) dim to `0.2`/`0.4` and restore to `1` while
  keeping a solid border; the rainbow border still animates on a normal frame
  (`rgba(232,148,48,.65)` → `rgba(48,166,232,.65)`); the mode survives
  serialization and a full `rebuildAllEls()`; the settings dialog still opens,
  previews live and closes on a dimmed frame; selection outlines still work when
  dimmed; a visible icon is still hit-testable and its click still toggles.
- **Suites: 84/84 JavaScript + 5/5 Python.**

### Probe-harness error worth recording

26 of the regression checks first "failed" with **every computed style empty** for
all five real effects while `default` passed. That signature means a detached
element. It was not: I had cached `wk.groupEls[gid]` once and reused it across
`page.evaluate` boundaries. Five separate diagnostic probes — element identity,
mutation observation, overlay attachment, parent-chain walk, ghost detection —
all showed a single correctly attached box. Fix: query
`#xzg-group-overlay .xzg-group-box[data-group-id="..."]` fresh inside each
evaluate, and assert `trackedIsLive` so a genuine ghost (the module styling one
element while another is on screen) would still be caught. It passed for all six
effects in all four modes.

One of those diagnostics also produced a false alarm of its own: walking parents
with `parentElement` stops at `<html>` and never reaches `#document`, which made a
correctly attached overlay look detached. Use `parentNode` when the question is
"is this in the document", or just `document.contains()`.

## 2026-08-05 - Canvas groups (T-036): header click/double-click semantics + rename box width

Three defects, and the second turned out to be the cause of the third.

- **Defect 1 — a plain header click never reset the selection.** The header's
  `mousedown` went straight to `prepareGroupDrag`, which only adds the frame if
  absent. ComfyUI's native node selection was never touched, so `startDrag` saw
  `selectedNodeIds.length > 0` and took its **multi-drag** branch, carrying nodes
  the user had clicked earlier somewhere else on the canvas. Measured: with an
  unrelated node selected, dragging a group header moved that node from
  `[900,620]` to `[970,670]`.
- **Defect 2 — the double-click gesture was completely dead**, and the reason was
  not in the listener. `bringToFront()` ran `el.parentElement.appendChild(el)` on
  every header `mousedown`. Moving a node in the DOM between `mousedown` and
  `mouseup` makes the browser abandon the click sequence, so **`click` and
  `dblclick` never fired at all**. Instrumenting `document` in capture phase
  showed only `mousedown`/`mouseup` arriving, with no `click` at any `detail`.
  Suppressing just that one self-re-append made `click detail=1`,
  `click detail=2` and `dblclick` appear immediately, and the recursive selection
  resolved correctly to `{groupIds:[parent,child], nodeIds:[1,2]}`. **The plan
  module (`contents-selection-plan.js`) was correct all along and had simply
  never been reached** — worth remembering before debugging a "broken" handler.
- **Defect 3 — the rename box ignored zoom.** It is created in `startRename`,
  outside `updatePositions()`, with a hardcoded `width:120px` and the raw
  `group.fontSize`. Measured at 0.5× / 1× / 2×: width stayed exactly `120px` and
  font size exactly `14px` at all three.

**Fixes.** Two new pure modules:
`entry/canvas-groups/header-click-selection.js` (an unmodified click on an
unselected frame resets both selections; on an already-selected frame it keeps
them so a multi-item drag can start; any modifier defers to `pointer-actions.js`)
and `entry/canvas-groups/rename-input-metrics.js` (per-zoom font/padding/border
metrics). `bringToFront()` now raises `z-index` through a monotonic `_frontZ`
counter instead of restructuring the DOM. The rename input became a flex child
(`flex:1 1 auto; min-width:0`) of the header's title wrapper, so the browser fits
it to the space left of the action icons at any zoom — deliberately **not**
computed arithmetic, which would drift out of sync with the icons.

**Two secondary issues found and fixed while in there:** committing a rename
rebuilt the title span without its ellipsis rules (a long title would escape the
header after every rename) and left the stale span in the per-frame `_xzgRefs`
cache.

**One design conflict my own contract test caught before shipping:** the metrics
module originally clamped font size to a 6px floor. That floor activates below
0.43× — a zoom ComfyUI allows — and would have made the title visibly *jump* on
entering edit mode, because `updatePositions()` scales the span with no floor.
Parity with the span matters more than a legibility floor the user chose to zoom
past, so the clamp was removed from the font size and kept only on the box chrome
(one device pixel, so the border can never vanish).

- **Contracts:** `scripts/test-group-header-click-selection.mjs` (the four
  decision rules, modifier coverage, malformed-input safety defaulting to the
  non-destructive branch, purity, and call-site assertions that a reset clears
  the native node selection **and** that `bringToFront` performs no DOM
  restructuring at all) and `scripts/test-group-rename-input-metrics.mjs`
  (exact `fontSize * scale` parity with the span at 7 zoom levels × 5 font sizes,
  width deliberately absent from the result, device-pixel floors, malformed
  input, purity, and call sites in both `startRename` and `updatePositions`).
- **Real-page acceptance** (test package `http://127.0.0.1:8190/`, Playwright
  headless Chromium, disposable in-memory graph, nothing saved) — **31/31**:
  - Plain header click after selecting an unrelated node: only that frame
    selected, native node selection cleared.
  - Dragging that header afterwards: the unrelated node stayed at `[895,757]`
    while the frame moved `[62,168]` → `[140,223]`.
  - Double-click: both parent and nested child frames selected, both member nodes
    selected, the outsider node **not** selected; plan
    `{g:[parent,child], n:[1,2]}`.
  - Grabbing the header of an already-selected frame while two are selected: both
    stayed selected (no reset).
  - Rename box at 0.5× / 1× / 2×: font `7 / 14 / 28px`, width `172 / 351 / 709px`,
    gap to the action icons `2 / 3 / 6px`, never overlapping them, never escaping
    the header.
  - Rename commit: title stored and displayed, span keeps `nowrap` + `ellipsis`,
    cached ref points at the live span.
  - Stacking: touching a frame raised its `z-index` with the DOM order provably
    unchanged.
- **Stacking regression suite (8/8):** with two frames whose drag strips overlap,
  clicking each header flipped ownership of the shared band (`gB` → `gA` → `gB`)
  purely by `z-index`; `rebuildAllEls()` correctly returns every frame to the base
  `5` while the counter stays monotonic; 5,000 simulated raises confirmed the
  overlay is itself a stacking context (`position:fixed; z-index:10`), so no
  counter value can escape it and cover ComfyUI's own UI.
- **Multi-drag regression suite (13/13):** two selected frames dragged by one
  header moved by identical deltas with both members following and a loose node
  untouched; a natively-selected node plus a selected frame moved together;
  clicking an *unselected* frame's header while another frame and a node were
  selected reset to just that frame and left the others exactly where they were.
- **Probe-design errors worth recording** (both mine, neither a product fault):
  aiming the stacking probe at a point covered by one frame's **body** proved
  nothing, because the body is deliberately `pointer-events:none` — stacking is
  only observable where both frames offer a hit-testable surface, so the frames
  were repositioned so their drag strips coincide. And my first rebuild assertion
  expected the `z-index` style to be absent after `rebuildAllEls()`; it is
  actually `5`, since the rebuild re-runs `buildGroupEl` and the base value comes
  from the markup. The assertion was wrong, not the code.
- **Suite:** 82/82 Node contracts, 5/5 Python contracts.

## 2026-08-05 - Canvas groups (T-037): node membership switched to native centre-point containment

- **User report:** dragging a *node* into a group past its centre worked; dragging a *group* onto a node past its centre did not. Two directions, apparently asymmetric.
- **Actual root cause — not asymmetric:** both directions run the same rule. `syncNodeMembership()` required `_isFullyContained()` (all four node edges inside the frame), so **neither** direction admitted on centre-crossing. A measured sweep confirmed it: dragging the node in at 57%, 77% and 96% area overlap all returned `member=false` while the centre was inside; dragging the group on at 60% and 80% also returned `member=false`, and only became `true` at 100% overlap, i.e. exactly when full containment happened to be satisfied. The direction that "worked" had simply ended up fully inside.
- **Fix:** new pure module `entry/canvas-groups/node-membership.js` implementing native `containsCentre` — a node belongs to a group iff its centre point is inside the bounds, edges inclusive ([NATIVE_BEHAVIOR_REFERENCE.md](NATIVE_BEHAVIOR_REFERENCE.md) §2). Applied at all five node-membership / node-control call sites: `syncNodeMembership`, `startDrag`'s legacy geometric fallback, its child-group member collection, its partially-overlapping-group controlled-node test, and the same test in `toggleBypass`. No inline four-edge node arithmetic remains in the file (asserted).
- **Group-in-group nesting deliberately unchanged:** `_isFullyContained` survives for group nesting, because native nesting also uses `containsRect`, not `containsCentre`.
- **Two guards deliberately removed** alongside the 20% `retainedOverlapThreshold`: "member count fell to zero → clear" and "member count fell below 30% → skip this pass". All three existed to mask fractional-area jitter. A centre point cannot jitter across an edge, and retaining a node after its centre has left would produce "dragged out but still stuck".
- **Contract:** `scripts/test-group-node-membership.mjs` — centre-in/edges-out admission, area-overlap irrelevance in both directions, edge-inclusive boundaries, degenerate and malformed rects, `id: 0` not dropped as falsy, purity, and the call-site assertions above.
- **Real-page acceptance** (test package `http://127.0.0.1:8190/`, Playwright headless Chromium, disposable in-memory graph, nothing saved):
  - **Direction 1** (drag the node in), centre 20 / 60 / 120 px inside the edge at 57% / 77% / 96% overlap, never fully contained: member in all three.
  - **Direction 2** (drag the group on), edge 20 / 60 / 120 px past the node centre at 60% / 80% / 100% overlap: member in all three.
  - **Boundary sweep:** targeting the node's centre at −30, −5, +5, +30 px relative to the group's right edge yielded member `true, true, false, false` — the transition lands on the edge, as native does.
  - **Exit:** a node pulled in (member, 2 members) then dragged out (`centreOffset=+150`) was released immediately, leaving 1 member. No clinging.
  - **Group drag intact:** grabbing a bottom-strip point with no node under it moved the group `{688,229}` → `{828,324}` with its member following and membership preserved.
- **One probe artifact worth recording:** an initial run reported "group did not move" on a group drag. Investigation showed the grab point was the bottom strip's midpoint, which had a node beneath it — T-041 was correctly yielding to that node. Re-running with a node-free grab point moved the group normally. Confirmed by reproducing the exact geometry and reading `passThrough=true` / `pointerEvents=none` at that point. Not a regression; the probe was at fault.
- **Suite:** 80/80 Node contracts, 5/5 Python contracts.

## 2026-08-05 - Canvas groups (T-041): frame hit regions yield to nodes underneath

- **Defect:** the group frame's three 10px drag strips (`.xzg-border-left/right/bottom`) and its 14px `.xzg-resize-handle` carry `pointer-events:auto` in a DOM overlay that sits above every node pixel. A node adjacent to a group edge could not be clicked or dragged inside those bands — the gesture started a group drag instead. This inverts native order, which resolves `getNodeOnPos` before any group (see [NATIVE_BEHAVIOR_REFERENCE.md](NATIVE_BEHAVIOR_REFERENCE.md) §3).
- **Approach and why not re-dispatch:** the pre-existing middle-click path re-dispatches a synthetic `PointerEvent` to the canvas. That is unsuitable here because LiteGraph calls `element.setPointerCapture(e.pointerId)` on every `pointerdown`, and a synthesised pointer has no live pointer to capture — acceptable for a one-shot pan, wrong for a click-and-drag. Instead the four regions stop intercepting while a node sits under the cursor, so LiteGraph receives a genuine browser event and owns the whole gesture.
- **Two decisions worth recording:** (1) the check runs every frame from a stored pointer position, not only on `pointermove`, because the graph can move under a stationary pointer during a canvas pan, node drag or zoom, with no pointer event to react to; (2) pass-through is suppressed whenever any mouse button is held, so an in-flight group drag is never re-targeted mid-gesture.
- **Contract:** `scripts/test-group-hit-region-passthrough.mjs` — region selector membership (title bar and body deliberately excluded), the four decision rules, malformed-input safety (defaults to intercepting, so a failure can never leave a frame permanently undraggable), module purity, and the call-site assertions (canvas-coordinate `getNodeOnPos` probe, per-frame invocation, cache invalidation in all three places).
- **Real-page acceptance** (test package `http://127.0.0.1:8190/`, Playwright headless Chromium, disposable in-memory graph, nothing saved):
  - Node overlapping the left strip: `pointer-events` flipped `auto` → `none`, `document.elementFromPoint` at that spot resolved to the LiteGraph canvas, and a drag from that point moved the **node** `[348,400]` → `[468,460]` while the group's bounds stayed at `x=388,y=329`.
  - Same strip over blank canvas: stayed `auto`; a drag moved the **group** `{438,529}` → `{528,569}` and its member node followed.
  - Resize handle over blank canvas: stayed `auto`; the group resized `524x283` → `594x333`.
  - Title bar with a node directly beneath it: header remained `auto` (it carries the rename input and action buttons) while the strips correctly read `none`.
  - No page errors beyond the test package's pre-existing `404` / `isPermanent` / `ComfyApp graph accessed before initialization` noise.
- **Suite:** 79/79 Node contracts, 5/5 Python contracts.

## 2026-08-05 - Contract suite restored to green (two stale group assertions)

Two contracts were failing before this batch on unrelated, already-shipped design changes. Neither was a product defect; both assertions described mechanisms that had been deliberately replaced, so the tests were updated to assert the current design.

- **`test-canvas-group-action-icons.mjs`**: asserted exactly three header action glyphs; a fourth (rename) had been added. Rewritten to assert that *every* action button carries exactly one scalable glyph (button count equals glyph count) plus the presence of the rename action, which is the property that actually matters for uniform zoom scaling — it no longer hardcodes a total.
- **`test-group-settings-colors.mjs`**: asserted a hue-keyed swatch preset (`data-hue` → `computeGroupColorPreset(hue, light)`) and an `isLightGroupTheme()` probe of `--p-content-background`. Both were replaced by native-colour compatibility: swatches now carry LiteGraph's exact `groupcolor` hex in `data-color`, and the readable font colour is derived from the chosen background's luma via `groupTitleColorForBackground()`. Assertions updated to the current mechanism, with `doesNotMatch` guards so the removed paths cannot silently return.
- Verified against `git show HEAD:` that both source regions were consistent at the last commit, confirming the drift came from the uncommitted batch rather than from a regression.

## 2026-08-05 - Canvas groups: nested real-page acceptance and native-color persistence regression

- **Test environment:** test package `http://127.0.0.1:8190/`; disposable workflow fixture `__WK_TEST__/nested-color-rgthree.json`, based on `C6_Native_Added_Group.json` and written through WorkspaceKit's own workflow-save endpoint. The fixture contains a parent WK group, a fully contained child WK group, and two child member nodes.
- **Nested interaction evidence:** both overlay groups rendered after loading the fixture. Double-clicking the parent title opened ComfyUI's multi-selection toolbar. Dragging an already selected internal node kept the parent/child frames nested and moved the selection without an observed double displacement. This accepts the parent/child double-click and one nested node-drag path. Shift-removing only the parent selection and a two-independent-group joint drag remain pending.
- **rgthree bridge evidence:** adding `Fast Groups Bypasser (rgthree)` to the fixture rendered one Enable row per WK test group, and the page logged `[WorkspaceKit] rgthree Fast Groups bridge installed`. This proves real enumeration through the bridge, not `@matchColors` filtering or queue execution.
- **Persistence regression found:** the fixture initially contained `nativeGroupColor`, but after an ordinary workflow save the returned file no longer contained that field. Root cause: `serializeGroup()` omitted it, so both `graph.extra.xzgGroups` and per-node recovery copies lost the native colour identity.
- **Fix and repeatable checks:** `serializeGroup()` now writes `nativeGroupColor: resolveWorkspaceKitGroupNativeColor(g)`. `scripts/test-native-group-color-compat.mjs` now asserts that serialization contract. The native-colour contract, reverse/forward conversion contracts, multi-drag, contents-selection and pointer-action contracts passed; both edited JavaScript modules passed `node --check`; locale JSON parsing and `git diff --check` passed.
- **Unaccepted boundary:** after a fresh-page reload, the WK sidebar content did not render and the two existing overlay headers measured around `y=-19258/-19366px`. The page also has a pre-existing `ComfyApp graph accessed before initialization` error. No causal claim is made yet. Therefore the required **save → refresh → re-read nativeGroupColor** check and rgthree `@matchColors=pale_blue` filter check are explicitly pending, not passed.

This document records reproducible test evidence and unresolved errors found while validating WorkspaceKit. Historical endpoint, storage, and implementation names such as `Workspace2` remain in individual records where they identify the compatibility layer. A recorded error is not treated as a confirmed WorkspaceKit root cause until the owning call chain is isolated.

## Current baseline (updated per batch)

- **WorkspaceKit contracts (Node `.mjs`)**: 86/86 passing. Count with
  `npm run test:contracts`, not `ls scripts/*.mjs` — that directory also holds
  `run-contract-tests.mjs` and `export-panel-ui-template.mjs`, which are not
  tests, so a raw file count overstates the suite by two.
- **WorkspaceKit contracts (Python `.py`)**: 5/5 passing (`test-trash-service.py`, `test-workspace-data-bundle.py`, `test-workflow-copy.py`, `test-folder-dissolve-service.py`, `test-node-library-service.py`).
- **Node syntax + locale JSON**: `entry/entry.js`, `entry/settings/*.js`, `entry/workspace2_canvas_groups.js`, `entry/canvas-groups/{conversion-archive,conversion-result,reverse-conversion-plan}.js` and `entry/locales/*.json` all pass. Note that `node --check` parses this repository's browser ES modules as CommonJS and therefore does **not** surface their parse errors; use a real `import()` when validating a module in isolation.
- **Playwright real-page smoke** (`scripts/e2e/smoke-workspacekit-sidebar.mjs`): passing on the test package at `http://127.0.0.1:8190/`. Verifies that `window.app.extensions` contains both `comfyui.workspace2` and `WorkspaceKit.ThemeLab`, that `window.WorkspaceKitPanelAPI` and `window.WorkspaceKitPanelUITemplate` are exposed, and that `workspacekit-sidebar-icon-style` is injected. No WorkspaceKit-related console errors.
- **Vendor runtime sync**: `node scripts/export-panel-ui-template.mjs --all --verify` passes for both Layout and Theme at `uiVersion 1.5.0`.
- **Last baseline re-run**: 2026-08-06 (`npm run test:contracts` 86/86, `npm run test:python` 5/5).
- **Current release-version source**: `pyproject.toml` is `0.2.5`. Dated
  historical records below retain the version observed when they were run.
- **Historical figures** in older entries reflect the contract count at that batch; the current figure is `86/86`.

Backlog IDs referenced in entries below map to the internal `.dev-docs/DEV_LOG.zh-CN.md` (T-xxx).

## 2026-08-04 - Frosted-glass panel stayed on screen after an official sidebar-tab switch

- **Pre-change backup:** `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-glass-overlay-sidebar-sync-20260804-091542.zip` (363 files).
- **Report:** with the frosted-glass background active, opening WorkspaceKit and then pressing ComfyUI's own `N` / `W` shortcuts left the WorkspaceKit panel on screen, layered over the official panel that had just opened. Visible only because the frosted background is translucent.
- **Root cause:** frosted glass re-parents `.workspace2-shell` onto `<body>` and positions it manually, because leaving it inside the ComfyUI-owned host would composite the blur against that host's background. That re-parenting also removes it from the element ComfyUI hides on a tab switch, so the panel is no longer under ComfyUI's control. `syncWorkspaceGlassOverlay()` already had the correct gate — `isElementVisible(host)` — but `setupWorkspaceGlassOverlayTracking()` only ran it on `window` `resize`, and switching sidebar tabs changes no window dimension. The check therefore never fired for this transition. Confirmed on the real page: after `N`, WorkspaceKit's sidebar button was already deselected (`side-bar-button-selected` gone, so ComfyUI considered it closed) while the shell still measured 507×1054 at `z-index: 1100`, with the official node-library panel at the same 507 width beneath it. A control run in transparent mode kept the shell inside `.workspace2-host` and it disappeared normally, confirming the fault is specific to the glass overlay path.
- **Fix:** subscribe to ComfyUI's `sidebarTab` Pinia store (verified present on this build, `$id: "sidebarTab"`, exposing `activeSidebarTabId` and `$subscribe`) and re-run the sync on every mutation. `syncWorkspaceGlassOverlay()` now consults the store **before** measuring the host, because during a transition the host can still report a non-zero box for a frame and geometry alone would briefly keep the overlay up. A collapsed sidebar (no active id) also hides the overlay. The store is injected as `getSidebarTabStore` rather than read from `app` inside the appearance module, keeping that module's ownership boundary intact, and is resolved lazily because `extensionManager` is not populated when the factory runs during module evaluation. A build without the store logs a debug line and degrades to the previous resize-only behaviour instead of throwing — and deliberately does **not** treat a missing store as "another tab is active", which would hide the panel permanently.
- **Contract:** `scripts/test-panel-glass-overlay-sync.mjs` pins all six branches: hide when another tab is active, stay visible on our own tab, hide when the sidebar is collapsed (`""`, `null`, `undefined`), still hide when the host is invisible even on our own tab, fall back to geometry when no store exists, and subscribe exactly once with `detached: true` so repeated panel renders cannot stack duplicate subscriptions.
- **Real-page acceptance, test package `http://127.0.0.1:8190/`, frosted glass active:** opening WorkspaceKit → visible; `N` → hidden (`node-library` active); `W` → still hidden (`workflows` active); clicking WorkspaceKit's sidebar entry → visible again. Repeated with the module shortcut path: `Shift+2` opened it on the Nodes module, then `M` hid it correctly. Transparent mode re-verified as unchanged: the shell stays inside `.workspace2-host`, vanishes with its host on `N`, and returns on click. The one console error observed was ComfyUI's own `workflows/.index.json` 404, unrelated to this change.
- **Validation:** real ESM `import()` of `entry/ui/panel-appearance.js` succeeded. Full `npm test` green: 70 JavaScript contracts, 4 Python contracts, release-version check `0.2.5`.

## 2026-08-03 - Browse tracks the active workflow; new items scroll into view

- **Pre-change backup:** `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-active-workflow-trail-20260803-223301.zip` (336 files).
- **Context:** with the Browse tree no longer force-selecting the canvas workflow, a deep tree gave no indication of where the workflow being edited lives. This adds that indication back as a passive tint instead of a selection change, so it cannot fight the user's own clicks.
- **Scroll-reset finding — mostly fixed upstream.** The earlier report that any Browse change jumped the list to the top was reproduced (scroll 666 → 0) and traced to `scrollSnapshot()`/`restoreScrollSnapshot()` reading `.workspace2-tree` while the actual scroll container was the outer content slot, so every save recorded `0`. Commit `7ceb432` (pin open history, isolate browse scrolling) made `.workspace2-tree` the real scroll container, which incidentally corrected the target. Re-measured after that commit: folder expand/collapse and folder creation both hold position exactly (500 → 500). What remained was narrower: a new folder is inserted in sort order, so its rename input could land **outside** the scrollport — measured at 56px above the visible area — leaving the user typing into something they could not see.
- **New-item visibility:** `restoreScrollSnapshot()` now pulls the restored focus target into view, but only when it is actually outside the scrollport, and only via `block: "nearest"`. An already-visible input is left untouched so the view does not drift on renders triggered while typing.
- **Trail implementation:** new pure module `entry/workflows/active-trail.js` derives, from one relative path, the file itself plus every ancestor folder path. `entry/workflows/results-renderer.js` resolves the trail once per tree-body render (not per row — the value is identical for every node and reading the official Store per row would be wasteful on a large tree) and hands it to the row renderer, which applies `is-active-workflow` to the file and `is-active-workflow-path` to folders on the trail. The trail travels inside the renderer's `deps` object rather than as a positional argument because the renderer recurses into child rows with that same object; a positional argument would have to be forwarded at every recursive call and one missed call would silently drop the tint on nested rows.
- **Design decisions, per the user:** only the **active** workflow is tracked, not every open tab — tinting all open tabs would light up large parts of a deep tree and stop pointing anywhere in particular. The file is tinted more heavily than the folders above it, giving a gradient to follow inward rather than a flat wash where the actual file cannot be picked out. The `--workspace2-active-trail` token stays translucent so the transparent and frosted panel backgrounds still show through. The trail rules are declared before `.is-selected` so a clicked row still reads as selected when both marks apply. *(The token's colour was re-picked the next day — see the 2026-08-04 entry below; it was originally mixed from the panel foreground, which measured too close to `:hover`.)*
- **Contract:** `scripts/test-active-workflow-trail.mjs` pins the path-walking rules, including the cases most likely to regress: the deepest segment is the file and never counts as a folder, prefix lookalikes (`A/B2` against a trail through `A/B`) must not match, stray separators must not produce empty trail entries, a root-level workflow tints no folder, and an empty/absent active path tints nothing.
- **Real-page acceptance, test package `http://127.0.0.1:8190/`:** opened `flux1_D/kontext/Kontext 万物迁移溶图.json`. With both ancestors **collapsed**, `flux1_D` was tinted — the case the user specifically asked for. After expanding, all three rows carried the trail in order: `flux1_D` and `flux1_D/kontext` at 6.3% and the file at 14% with its accent edge; the unrelated `API` folder stayed clean. Switching to `API/api_test.json` moved the trail to `API` and cleared the previous one, so trails do not accumulate. Scrolled to the bottom and created a folder: the rename input landed **inside** the scrollport (291px from the tree's top, versus 56px above it before) and stayed focused, and the scroll position did not move while typing. Simulating a light theme flipped the tint from white-based to dark-based, confirming it survives both *(superseded — the token is a fixed hue as of 2026-08-04 and no longer flips)*. Console: `0` errors. All acceptance folders removed and their absence verified.
- **Validation:** real ESM `import()` of all four edited/added modules succeeded. Full `npm test` green: 68 JavaScript contracts (up from 67 with the new trail contract), 3 Python contracts, release-version check `0.2.5`.

- **Follow-up fix (same day): first-time workflow open still reset Browse scroll.** The user reported that scrolling to the bottom and opening a workflow **not present in the Open section** jumped the tree to the top, while every other case held. Reproduced (778 → 0) and isolated by comparing against a workflow already in the Open history, which held position — so the trigger is specifically a *first* open. Instrumenting `scrollTop` with a trapping setter recorded **zero writes**, and a MutationObserver saw only **one** render, at ~658ms, which already started at 0. That ruled out both an errant assignment and a double render: `openWorkflow()` calls `setCurrentWorkflowCleanState()` only on a first official open, which schedules a 300ms settle re-render; by the time that render runs the tree has already been cleared and rebuilt once, and clearing a scroll container makes the browser reset `scrollTop` on its own, so the snapshot that render captured was already 0. A snapshot taken inside `renderPanel()` cannot span a clear-then-render-later sequence. Fixed by tracking the position in `state.browseScrollTop`, written from the tree's own `scroll` event so it predates any rebuild, with `scrollSnapshot()` falling back to it when the live value has been zeroed and `restoreScrollSnapshot()` clamping to the current maximum (a collapsed folder or active search can leave the tree shorter than before, and assigning past the end would silently land at the bottom).
- **Regression caught and fixed during that verification:** keying "pull the new row into view" off `snapshot.activeSelector` was wrong — a brand-new folder's rename input does not exist when the snapshot is taken, so it never appears there and the input was left 391px above the scrollport. Re-keyed on `state.editingPath`, which is set before the render that mounts the input.
- **Re-acceptance:** first-time open of `转真人f2klein+ZiT重绘.json` from a bottom-scrolled tree held 778 across the settle window; creating a folder from the same position placed its rename input inside the visible area (1px from the tree's top). Reopening an already-open workflow and toggling a folder both still hold position exactly, and the trail still resolves. Console: no WorkspaceKit errors; acceptance folders removed.

### 2026-08-04 - Trail colour re-picked: the grey wash was the wrong axis

- **Pre-change backup:** `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-active-trail-recolour-20260804-095500.zip`.
- **Report:** the user tested the shipped trail and reported the tint was not visible enough, suggesting a different colour.
- **Root cause — brightness was not the problem.** Measured on the live page against the real backdrop (`rgb(30,30,46)`, Catppuccin): the shipped `white 14%` composited to `rgb(62,62,75)`, a perceptual distance of **92** from the canvas — not faint in absolute terms. But its distance from `:hover` was only **32** and from `.is-selected` only **34**. A neutral grey wash lands in the same family as every other row state, so the eye reads it as "this row is slightly lighter", which is indistinguishable from a stray hover. Raising the alpha would not have fixed that; `white 24%` measured 97 from hover but also 158 from the canvas, i.e. loud *and* still ambiguous. The fix had to move off the luminance axis onto hue.
- **Fix:** `--workspace2-active-trail` is now a fixed amber (`--p-amber-400`, `#FBBF24`) with two derived washes — `--workspace2-active-trail-mid` at 26% for the file and `--workspace2-active-trail-soft` at 11% for folders. Amber sits opposite the blue accent that both `:hover` and `.is-selected` use, so the marks stay tellable apart. Both trail rules also carry an inset left edge (full-strength amber for the file, 40% for folders) so the trail survives on a row that is *also* selected, where the blue selection background wins.
- **Fixed hue, not theme-flipped.** The previous token was derived from the panel foreground so it could invert per theme. That is unnecessary for a mid-luminance hue and was measured to be so: file-vs-backdrop distance is 117 on the user's dark theme, 115 on Comfy's default dark, 104 on pure white and 99 on light grey. One value covers all four.
- **Glass-mode hover bug caught during the fix.** The hover mix initially blended against `--workspace2-hover`, while the plain-row hover above it uses `var(--workspace2-hover-glass, var(--workspace2-hover))`. In frosted mode those differ (translucent white vs opaque grey), so the trail rows would have pulled a dark grey in behind the amber and muted it. Both trail hover rules now mix against the same fallback chain. Verified on the live page in glass mode: the hovered folder row stays chromatically amber (red 55 > blue 52) rather than washing to grey.
- **Real-page acceptance, glass mode, test package `http://localhost:8190/`:** opened `flux1_D/kontext/Kontext.json` (three levels deep). Collapsed, only `flux1_D` carried the trail — penetration intact. Expanded, all three rows carried it with the intended gradient: folders at distance 49-50 from the canvas, the file at **117**, file-vs-folder distance 67. The file/folder ratio is >1.6x, so the leaf is unambiguous. Clicking a trail folder to expand it made that row simultaneously `is-selected`; the blue background won as designed and the amber edge bar remained visible, confirming the two marks coexist. `npm test` green: 70 JavaScript contracts, 4 Python contracts, release-version check `0.2.5`.
- **Note on measurement:** row `background-color` alone is misleading here — every trail value is translucent, so it must be composited over the resolved backdrop before comparing. The acceptance numbers above are post-composite perceptual distances (weighted RGB), not raw channel values.


## 2026-08-03 - Icon-system loose ends: suite back to green, Vendor check made meaningful again

- **Scope:** three mechanical loose ends left by the in-progress icon-system work. No product behaviour was changed; no icon, button, callback or storage path was touched. The remaining icon-plan item (public guide wording and the cross-theme visual matrix) was deliberately left alone at the user's instruction.
- **Suite failure resolved:** `scripts/test-sidebar-startup-resilience.mjs` asserted the source literal `installWorkspace2SidebarEmojiIcon();`. The icon migration had renamed that function to `installWorkspace2SidebarIcon` and updated all three call sites correctly, so this was a stale test, not a defect. Updated the assertion. `npm test` is now fully green: 67 JavaScript contracts, 3 Python service contracts, release-version check `0.2.5`.
- **Vendor verification was permanently red — and that was the real risk.** `--all --verify` reported five hash mismatches for both Layout and Theme. Comparing the files with `diff --strip-trailing-cr` proved the contents were identical; only the line terminators differed, because Git's `autocrlf` rewrites the WK source checkout to CRLF on Windows while the exported Vendor copies stay LF. Browsers are indifferent to the terminator, so nothing was broken at runtime — but a check that always fails is worse than no check, because it masks the genuine divergence it exists to catch (per the Batch 2 record, a missing Vendor helper once stopped Theme from loading entirely).
- **Fix:** `sha256()` in `scripts/lib/panel-ui-template-export.mjs` normalizes CRLF to LF before hashing. Both the manifest writer and the verifier route through that one function, so the two sides cannot disagree. The existing on-disk manifests already matched under normalization, so **no re-export was required** — this confirms the divergence was purely source-side line endings.
- **Proved the check still has teeth:** appended one comment line to Theme's Vendor `version.js`; verification immediately reported `hash mismatch: version.js`. Restored the file; verification returned green. So the check is now tolerant of terminators and still strict about content.
- **Stale documentation corrected:** `docs/ENTRY_MAP.md` still named `installWorkspace2SidebarEmojiIcon` and pointed the sidebar-bootstrap region at L11865–12178, roughly 4,000 lines past where it now lives after the entry.js extractions; its header also claimed ~12,200 lines against an actual 8,047. Refreshed that region's anchors and the total, noted that the sidebar entry is now a local SVG mask (and that `icon: "pi pi-sitemap"` survives only as a required registration fallback), and made the footer state explicitly which figures were refreshed and which remain stale. In this log's baseline, the smoke description named the old `#workspace2-sidebar-emoji-icon-style`; the script itself already checks the current `workspacekit-sidebar-icon-style`. Baseline contract count corrected from 65 to 67, and the `node --check` caveat recorded there so it is not rediscovered a third time.
- **Validation:** the four Panel UI Template contracts (export / primitive / api / compatibility) passed, `--all --verify` passed for both consumers, and the full `npm test` suite passed.

## 2026-08-03 - Shift+1..4 module shortcuts accepted; Browse selection no longer forced

- **Closes** the `Shift+1..4` item left unaccepted by the paused handoff below.
- **Pre-change backup:** `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-shortcut-and-focus-fix-20260803-210712.zip` (327 files).
- **Shortcut root cause — the earlier diagnosis was wrong.** The handoff recorded that "real browser keyboard automation did not trigger the page shortcut". A capture-phase probe installed ahead of WorkspaceKit's own listeners proves otherwise: on `Shift+Digit1` the event arrives with `workspace2Handled === true` and `defaultPrevented === true`, and `workspace2.activeModule` is correctly written. Key detection and the handler were never broken. The failure was entirely in `activateWorkspace2Tab()`: all five official methods it tries (`setActiveSidebarTab`, `setSidebarTab`, `selectSidebarTab`, `openSidebarTab`, `activateSidebarTab`) are `undefined` on this ComfyUI build, so it always fell through to the DOM path — where all four attribute selectors also fail to match, leaving only a title comparison that breaks once the locale loads (`t("workspace.title")` becomes `WK 工作区` while the button keeps `aria-label="WorkspaceKit"`). Worse, ComfyUI's sidebar button is a **toggle**: a bare `element.click()` collapses the panel when it is already selected, so the function's "activate" contract was really "flip", and it fought the independent toggle decision in `shouldCloseWorkspaceModule()`.
- **Shortcut fix:** `activateWorkspace2Tab()` and `closeWorkspace2Sidebar()` now have target-state semantics — each reads the official `side-bar-button-selected` class first and returns early when the panel is already in the requested state, so neither can flip it by accident. Official methods are still attempted first but their effect is now **verified** before success is reported, instead of treating "did not throw" as proof. `findWorkspace2SidebarTabElement()` prefers our own locale-independent `.workspace2-tab-button` marker class, keeping the attribute selectors and (now locale-tolerant, multi-candidate) title match as fallbacks. `SIDEBAR_SELECTED_CLASS` is declared above every consumer, per the TDZ lesson recorded in the 2026-07-29 dialogs incident.
- **Browse-selection change:** `syncOfficialSelection()` is deleted, along with its unused `entry.js` wrapper `syncOfficialWorkflowSelection()` (which had zero callers). It used to overwrite `state.selectedPath` with the canvas's active workflow on every official-store notification, which is what dragged the Browse tree's selection away from a folder the user had just created. Verified before removing that nothing legitimate consumed that write: the Open section highlights the active workflow by object identity, not by `selectedPath`, and `selectedFolderPath()` only answers for items of type `folder`, so a workflow-file path could never influence where new folders are created. The inline-edit guard on `scheduleOfficialPanelRender()` is retained — it protects the rename input from being re-rendered away, which is a separate concern.
- **Real-page acceptance, test package `http://127.0.0.1:8190/`, real keyboard events with focus on the canvas:** from a closed panel, `Shift+1` opened WorkspaceKit on `工作流`; `Shift+2` switched to `节点` with the sidebar still open; pressing `Shift+2` again closed the panel; `Shift+3` opened directly to `模板` from the closed state; `Shift+4` activated the pinned provider tab `主题` (`workspace2.activeModule` = `workspacekit.theme`). Editable-field protection holds: with focus in the Workflows search box, `Shift+2` did not change tabs and typed `@` into the field instead.
- **Browse-selection acceptance:** creating a workflow folder kept its rename input present and focused at 900 ms and 2100 ms, and no Browse row was selected during that window. After committing the name `WK聚焦验收`, the selected row was that new folder — not the canvas's open workflow. The folder was then removed and its absence verified. Console: `0` errors.
- **Static checks:** real ESM `import()` of `entry/workflows/open-state.js` succeeded (`node --check` parses these files as CommonJS and cannot surface their parse errors, so it is not sufficient). `test-workspace-shortcut-toggle.mjs`, `test-module-shortcuts.mjs`, `test-workflow-rename-open-state-policy.mjs` and `test-workflow-rename-input.mjs` all passed.
- **Unrelated pre-existing suite failure (unchanged at the time of this entry; since resolved):** `test-sidebar-startup-resilience.mjs` still failed on its `installWorkspace2SidebarEmojiIcon();` source-literal assertion, because an in-progress icon-system change already in the working tree renamed that function. Confirmed again via `git diff HEAD` that this was not part of these fixes, and left to that work stream. Closed by the icon-system loose-ends entry above.

## 2026-08-03 - Folder/group create: root causes isolated and accepted

- **Supersedes** the paused handoff entry below. Both regressions are now fixed and accepted on the real page; the earlier optimistic-render work is retained but was not the cause of either symptom.
- **Pre-change backup:** `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-merge-tab-revamp-20260731-151757.zip` (275 files, taken earlier in the same working session).
- **Regression 1 root cause (workflow folder loses its rename input and selection jumps to the canvas workflow):** `createFolder()` mounted the input correctly, then scheduled `refreshOfficialWorkflowsDeferred(250)`. That sync mutated ComfyUI's Pinia workflow store, which fired the `$subscribe` handler in `entry/workflows/open-state.js` and reached `syncOfficialSelection()`. That function overwrote `state.selectedPath` with the canvas's active workflow unconditionally. Both guards in `scheduleOfficialPanelRender()` only checked `state.workflowRenameInProgress`, a flag set by existing-item rename only; a newly created folder tracks `state.editingPath` instead, so the guards never engaged.
- **Regression 1 fix:** added `isInlineEditing()` in `open-state.js`, covering `state.editingPath` as well as `state.workflowRenameInProgress`, and applied it to both `syncOfficialSelection()` and `scheduleOfficialPanelRender()`. Added `endWorkflowInlineEdit()` in `entry.js` so ending an inline edit drains any render deferred while it was open; the folder-create failure path, both early-return branches of `renameItem()`, and the rename-cancel path route through it. `renameItem()`'s success path keeps its own drain in `finally` and is deliberately unchanged.
- **Regression 2 root cause (first rename of a new Nodes/Templates group is silently discarded):** this is object identity, not timing. `createNodeGroup()` renders the input — whose keydown/blur closures capture the `group` object — and then awaits `saveNodeLibrary()`, which at `entry/entry.js` executes `nodesState.library = normalizeNodeLibrary(data.library)`. `normalizeNodeLibrary` rebuilds every group via `.map(group => ({ ... }))` in `entry/nodes/library-normalizer.js`, so the captured reference becomes an orphan. The first Enter wrote `group.name` into that orphan and then posted a library that did not contain the edit. The second rename worked because the input had been re-rendered against the live object. `entry/templates/library.js` has the identical replace-on-save shape.
- **Regression 2 fix:** `commitNodeGroupRename()` and `commitTemplateGroupRename()` now take a group **id** and re-resolve the live object from current state before writing. Their call sites pass `group.id`, and the Nodes rename input captures the id in a local rather than closing over the object.
- **Real-page acceptance, test package `http://127.0.0.1:8190/`:** Workflows — one click created one folder; its rename input was present and focused at 120 ms, 620 ms and 1500 ms, spanning the 250 ms official-sync window that previously destroyed it. First rename to `WK验收A` closed the input and `/workspace2/workflows` reported the renamed folder. Nodes — `新建收藏分组` produced a focused input defaulting to `新建分组`; first rename to `WK节点组A` persisted, with no leftover default-named group. Templates — `新建模板分组` produced a focused input; first rename to `WK模板组A` persisted. Console: `0` errors. All three acceptance artifacts were then removed and their absence re-verified.
- **Static checks:** real ESM `import()` of `entry/workflows/open-state.js`, `entry/templates/library.js` and `entry/nodes/library-normalizer.js` all succeeded — note that `node --check` treats these files as CommonJS and does **not** surface their parse errors, so it is not sufficient here. `test-workflow-rename-open-state-policy.mjs`, `test-workflow-rename-input.mjs`, `test-node-favorite-group-store.mjs`, `test-template-group-header-renderer.mjs` and `test-template-group-contents-renderer.mjs` all passed.
- **Unrelated pre-existing suite failure (since resolved):** `npm test` failed at `test-sidebar-startup-resilience.mjs`, which asserted the source literal `installWorkspace2SidebarEmojiIcon();`. An in-progress icon-system change already present in the working tree had renamed that function to `installWorkspace2SidebarIcon`. Confirmed via `git diff HEAD` that the rename was not part of this fix, and left untouched at the time — it belonged to that work stream, not to these two regressions. Closed by the icon-system loose-ends entry above.
- **Not covered by this entry:** the `Shift+1..4` module-shortcut regression from the paused handoff below remains unaccepted and unaddressed here.

## 2026-08-03 - Paused handoff: folder-create feedback and module shortcuts

- **Status:** implementation is paused at the user's request so that Claude can take over the two regressions below. Do not mark either item resolved without a fresh real-page acceptance.
- **Pre-change backup:** `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-folder-shortcuts-20260803-182749.zip`.
- **Changed but unaccepted implementation:** `entry/entry.js` now renders a newly requested workflow folder optimistically, tracks its pending create request so Enter cannot race a server-side rename, and makes Nodes/Templates render their new group before their library write completes. `entry/templates/library.js` accepts `{ render: false }` for this narrow background-persistence path.
- **Observed result:** in the test package at `http://127.0.0.1:8190/`, creating a workflow folder still produced `新建文件夹 2` without an inline rename input after the click completed. The automated click cannot prove whether the input was briefly mounted and then blurred, but the required user-visible outcome is not accepted.
- **Required diagnosis for Claude:** trace every render/blur path after `createFolder()` and after `createNodeGroup()` / `createTemplateGroup()`. In particular, determine whether a panel refresh, focus restoration, or inline input blur clears `editingPath` / `editingGroupId`. The correct end state is: one click creates one folder, its rename input is visible and focused immediately, and it remains editable until Enter, Escape, or an intentional blur.
- **Shift+1..4 regression:** source still registers the global shortcut in `setupWorkspaceShortcuts()` and calls `openWorkspace2Module(moduleId, { closeIfActive: true })`. A bounded change moved the module resolver ahead of an externally set `event.workspace2Handled` marker, while retaining that marker for the remaining canvas shortcuts. Static shortcut contract passes, but real browser keyboard automation did not trigger the page shortcut either before or after the change; therefore this is **not accepted**.
- **Required acceptance for Claude:** with focus on the canvas, verify each key twice: first press opens its target module; a different module key switches tabs while keeping the sidebar open; pressing the active module key again closes WorkspaceKit. Test `Shift+4` only when a fourth provider is pinned. Preserve editable-field protection so shortcuts do not fire while typing in an input or textarea.
- **Completed checks after the paused changes:** `node --check entry/entry.js`; `node --check entry/templates/library.js`; `node scripts/test-workspace-shortcut-toggle.mjs`; `node scripts/test-node-favorite-group-store.mjs`; template/workflow renderer contracts; `scripts/e2e/smoke-workspacekit-sidebar.mjs`; and `git diff --check` all passed. These checks do not replace the two real interaction acceptances above.

## How to read this log

- This is an append-only evidence record, newest first. It does not decide
  task priority or replace the product roadmap.
- Start with **Current baseline**, then read the three newest dated entries
  below for the latest reproducible evidence.
- Older entries are retained for regression and rollback context. They are not
  implied to be the current product state.

## 2026-08-02 - Theme Blueprint four-slot skeleton, Batch 4.1

- **Pre-change backup:** Theme source-only archive `theme-skeleton-migration-pre-20260802-232723.zip` (61 files, 167224 bytes, SHA-256 `624E25E160CD81C2B58595689ED405DE5085B4634B9922848D8FCA15509712EB`).
- **Root cause and scope:** Theme accepted the standard four Blueprint hosts, but hid `toolbarHost` and rendered search inside Controls. The bounded change now renders Header, Toolbar (search), Controls (theme source and existing actions), and Content into their respective slots. Theme JSON semantics, import, capture, save, exit, color extraction, and storage services were not changed.
- **Repeatable validation:** `node --check js/lib/theme_lab_panel.js`; `batch3-mount-i18n-icons.mjs`; `batch4-5slot-svg-popover.mjs`; `batch4c-save-session.mjs`; `python tests/smoke_test.py`; and `python tests/test_theme_storage.py` all passed.
- **Real merged-path check:** on the test package at `http://127.0.0.1:8190/`, WorkspaceKit opened and Theme was selected through Extensions. DOM inspection confirmed `.wkt-toolbar` exists and is not hidden, its search input is inside that Toolbar, and the Controls and Content surfaces are present.
- **Boundary:** this does not yet establish Theme independent mode, no-WK Vendor fallback, narrow width, or dark/light/transparent/frosted visual acceptance. Those remain explicit Batch 4 work.

## 2026-08-02 - Theme top-toolbar command placement, Batch 5.1

- **Pre-change backup:** Theme source archive `theme-top-toolbar-rework-pre-20260802-235005.zip` (81 entries, SHA-256 `676CBD432B14213626A77FF22F822B03F032A82262672DB069CCAE93C21C26A4`).
- **Scope:** moved existing search, undo, redo, export, and more actions into Toolbar. Controls now contain only the one-line theme-source controls: select, refresh, import, capture current. The More menu gained text entries for import, capture, and export, all reusing existing command methods. Theme JSON, metadata, reference picker, parameter cards, save service, and color operations were unchanged.
- **Compatibility check:** Controls passes `trailing: []` explicitly, so both the current Template and a simplified compatible Vendor implementation work.
- **Validation:** all three Theme Node contracts plus `tests/smoke_test.py` and `tests/test_theme_storage.py` passed. On the 8190 merged page, the search was in Toolbar; Toolbar exposed undo, redo, export, and more; Controls exposed only refresh, import, capture, and the theme selector; no Theme or WorkspaceKit console error was recorded.

## 2026-08-02 - Theme metadata Toolbar and automatic ID, Batch 6.1

- **Pre-change backup:** Theme archive `theme-metadata-toolbar-pre-20260802-235536.zip` (81 entries, SHA-256 `9F01D08E8B19D94D2E11E1D7C9825B6A3A3A89C4256EEB1D01F659A501DEB4B5`).
- **Scope:** after a theme loads, Toolbar exposes only file name and theme name. The parameter search remains available at the top of Content. ID is now a hidden machine field derived from the normalized file name; direct ID edits are not exposed and cannot affect overwrite detection. JSON structure, save service, reference picker, and parameter cards were untouched.
- **Validation:** the three Theme Node contracts, `tests/smoke_test.py`, and `tests/test_theme_storage.py` passed. On the 8190 merged page after loading `WK Dark ZY`, Toolbar fields were `wk-dark-zy` and `WK Dark ZY`, no `ID` input existed, and Content contained the parameter search. Filling file name with `My Theme 01` displayed the normalized `my-theme-01`. No Theme or WorkspaceKit console error was recorded.

## 2026-08-03 - Theme reference-image drop surface, Batch 7.1

- **Pre-change backup:** Theme archive `theme-reference-dropzone-pre-20260803-082353.zip` (SHA-256 `6103E1C9055DCF0ABE1E8A8F9C28E5F1CFEC8AF194A68E70037C92941444868A`).
- **Scope:** unloaded reference colors now expose one clickable/dropable JPG/PNG/WebP surface. A loaded image has re-import and remove actions; screen color picker remains available in both states. No color sampling, palette, canvas, parameter-card, JSON, or storage behavior changed.
- **Validation:** `node --check`, Theme Node contracts, `tests/smoke_test.py`, and `tests/test_theme_storage.py` passed. On the 8190 merged page, the Theme panel exposed an open reference section with a BUTTON whose visible text was `导入参考图 点击或拖入 JPG、PNG 或 WebP 图片。`; the screen picker existed and no Theme/WorkspaceKit warnings or errors were recorded.

## 2026-08-03 - Theme reference thumbnail and suggested palette, Batch 7.2

- **Pre-change backup:** Theme archive `theme-palette-vendor-pre-20260803-083500.zip` (153005 bytes, SHA-256 `E69B0675A77B91221E4D303AE4DA045D9AE07EB4D45DA76EBD4968A99DA56123`).
- **Dependency boundary:** copied Color Thief `3.3.0` browser ESM and its MIT license locally under `Theme/js/vendor/color-thief/`; no npm runtime dependency or CDN request is used. `docs/THIRD_PARTY_NOTICES.md` records source, purpose, and license location.
- **Scope:** a `360px` maximum-edge analysis Canvas yields eight cached suggested colors. The existing Canvas remains the clickable reference thumbnail. Clicking a suggested color only updates an already active Theme color field; clearing the image clears the palette.
- **Validation:** syntax, three Theme Node contracts, Python smoke, and ThemeStorage tests passed. On the 8190 merged page, uploading local `BG3.png` generated eight suggested swatches. After selecting `NODE_TITLE_COLOR`, clicking `#343539` changed the visible color input from `#bac2de` to `#343539`. Removing the image left zero visible canvas/swatch elements and restored the drop surface. Theme/WK/Color Thief console warnings and errors: zero.
- An entry is evidence only when it names the test environment, command or
  repeatable interaction, and observed result. Open work remains in the local
  development log and product planning documents.

## 2026-08-02 - WK UI Template rebuild: Batch 0 static baseline

- **Backup recovery point:** source-only ZIP archives were created and opened successfully for WK, Layout, and Theme before the rebuild work. Each archive was non-empty and excluded `.git`, prior backups, and internal development logs. Exact archive names and SHA-256 values are recorded in the local development log (T-602).
- **Single-source verification:** WK `entry/ui-kit/` contains the six source modules. Both Layout `web/vendor/workspacekit-ui/` and Theme `js/vendor/workspacekit-ui/` declare `uiVersion: 1.3.0`; their copied source-file hashes match the current WK Template source.
- **Repeatable command:** from the repository root, `node scripts\export-panel-ui-template.mjs --all --verify` completed successfully for both consumer Vendor runtimes.
- **Boundary:** this is a static baseline only. It does not yet prove the four runtime modes (merged / standalone / Vendor fallback / Theme visual states); those remain the next acceptance work before any old UI path can be removed.
- **Live merged-path spot check:** on the running test package at `http://127.0.0.1:8190/`, the WorkspaceKit sidebar entry opened. Theme was present as a merged tab; the **Extensions** menu exposed `WorkspaceKit 排版`, and selecting it activated the `排版` tab with three rendered WK UI roots. No change was made during this observation. This is only a merged-path check, not the full runtime matrix.

## 2026-08-02 - WK UI Template 1.4.0 common primitives

- **Scope:** added optional Template primitives only: disclosure section, compact action bar, and dropzone surface. Existing Layout and Theme feature DOM was not migrated in this batch.
- **Repeatable validation:** `npm test` passed: 66 JavaScript contracts, 3 Python contracts, and the `0.2.5` release-version check. `node scripts\export-panel-ui-template.mjs --all` then `--all --verify` exported and validated both generated Vendor runtimes at `uiVersion: 1.4.0`.
- **Real test-package smoke:** `node scripts\e2e\smoke-workspacekit-sidebar.mjs` on `http://127.0.0.1:8190/` passed. It observed 257 extensions; `comfyui.workspace2` and `WorkspaceKit.ThemeLab`; `WorkspaceKitPanelAPI` and `WorkspaceKitPanelUITemplate`; and the WorkspaceKit sidebar style. The page reported 9 total console errors but **0 WorkspaceKit-related errors**.
- **Boundary:** this confirms safe loading after the new optional Template API. It does not replace the remaining standalone, Vendor-fallback, visual-theme, or narrow-width matrix checks.

## 2026-08-02 - Layout UI Template acceptance (partial)

- **Merged real-page path:** on the test package at `http://127.0.0.1:8190/`, WorkspaceKit opened; the Extensions menu exposed `WorkspaceKit 排版`; selecting it activated `排版`. The rendered panel had one Template header, one control row, and twelve Layout command buttons.
- **Static fallback matrix:** all seven Layout `.test.mjs` files passed, including Vendor fallback without WK, compatible host preference, v1-adapter acceptance, and fallback from an incompatible pure v2 host. The Vendor-version assertions now import `PANEL_UI_TEMPLATE_VERSION` rather than hard-code `1.3.0`; this is test maintenance caused by the verified 1.4.0 Vendor export, not a behavior change.
- **Independent real-page path:** using the visible-DOM node click on WK Settings, disabling **Allow extensions to merge into the sidebar** then reloading exposed the separate `WorkspaceKit 排版` sidebar entry. Its standalone panel rendered one standalone shell/tab strip, one header, one control row, and twelve command buttons. Re-enabling the setting and reloading removed that independent entry and returned Layout to WK's Extensions menu. The initial failed automation clicks did not reproduce with the visible-DOM interaction, so they are not recorded as a product failure.
- **Narrow-width check:** at a 480px viewport, merged Layout's command grid retained twelve buttons and its grid, panel frame, and shell each had `scrollWidth === clientWidth` (no horizontal overflow). The viewport was reset afterward.
- **Boundary:** dark/light/transparent/frosted visual states remain unverified in this batch.
- **User visual confirmation:** the user subsequently checked Layout in dark, light, transparent, and frosted WK background states and reported no issue. This is recorded as user real-page feedback; no automatic visual comparison was performed in that pass.

## Recent evidence index

| Date | Scope | What it establishes |
| --- | --- | --- |
| 2026-08-01 | Offline CI baseline | Current contract, Python-service and version-check baseline |
| 2026-08-01 | Workflow trash reliability | Atomic manifest, compensation, recovery contracts and real-page trash flow |
| 2026-08-01 | WK naming and Layout host path | Provider/Template contracts, Layout host path and served-resource baseline |
| 2026-07-30 | Main-package acceptance sweep | Groups, panel Template and main-package regression sweep |

## 2026-08-01 - Minimal offline CI baseline

- **Pre-change backup:** `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-ci-contract-alignment-20260801-20260801-190239.zip` (309 source files).
- **Unified local command:** `npm test` runs all top-level JavaScript contracts in deterministic filename order, all top-level Python service contracts using the active Python interpreter, then `scripts/release_version.py --check`. It requires neither ComfyUI nor Playwright to be running.
- **GitHub Actions:** `.github/workflows/ci.yml` runs that same command on every push and pull request using Node 20 and Python 3.11. The existing Registry workflow remains the only workflow permitted to publish.
- **Contract alignment:** three stale tests were updated to assert accepted current behavior: theme-aware default group color, Appearance as the settings landing page, and the body-mounted overflow menu with listener disposal. No production panel source was changed for this alignment.
- **Verification:** `npm test` passed: 65 JavaScript contracts, 3 Python service contracts, and release-version check `0.2.4`. `python -m py_compile scripts/run-python-tests.py scripts/release_version.py service/trash_service.py __init__.py` and `git diff --check` also passed. Node emits `MODULE_TYPELESS_PACKAGE_JSON` warnings when it loads browser ES modules from this dev-tool package; these are warnings only and are intentionally not masked by changing the package module mode.
- **Boundary:** GitHub Actions itself will first run after this change is committed and pushed. The CI suite is deliberately offline; real ComfyUI visual and interaction acceptance remains a separate test-package responsibility.

## 2026-08-01 - Workflow trash manifest reliability batches 1 to 3

- **Pre-change backups:** `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-trash-manifest-atomic-batch1-20260801-184627.zip` (1,758,756 bytes, SHA-256 `8A4FFC63D48B21821E48C953F168B7692FE08549828928B18F06E6B52A36822C`), `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-trash-operation-compensation-batch2-20260801-184908.zip` (1,760,571 bytes, SHA-256 `888D2FA57D20CB7DB7EA51A933F3E91371A68AAEBAE7BE0D719742379358752B`), and `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-trash-operation-journal-batch3-20260801-185412.zip` (1,762,208 bytes, SHA-256 `E9290615AC173CAF60FB008E8148B4BAE87132ADCF7CB4B1FE296AC06F5D2362`).
- **Batch 1 — manifest integrity:** `trash_manifest.json` now writes through a unique same-directory temporary file, flushes and fsyncs, validates the serialized JSON, then promotes with `os.replace`. Before each valid replacement, the prior generation is atomically retained as `trash_manifest.json.bak`. A corrupt primary manifest reads from that backup; an unreadable primary and backup fail explicitly rather than silently returning an empty list. A process-wide `RLock` serializes read-modify-write trash transactions from concurrent browser requests.
- **Batch 2 — ordinary failure compensation:** a failed manifest save after moving an item into the plugin trash moves it back to the workflows root; a failed save after restore moves it back into the plugin trash. System recycle-bin deletion first persists `system_deleting`; if that precondition cannot be written, the irreversible system call is not made. A normal system-delete failure restores the `trashed` state.
- **Batch 3 — interrupted-operation recovery:** each move, restore, and system-recycle action now creates a single atomic `trash_operation.json` journal before it changes the filesystem. The next trash action or list request resolves that record from the actual workflow/trash paths: complete a moved-but-unlisted deletion, finalize a restored item, or finalize/reset a system-delete intermediate state. Ambiguous or malformed journal data fails explicitly; it never guesses a file move. The journal clears only after the corresponding manifest state is durable.
- **Verification:** `python -m py_compile service/trash_service.py __init__.py scripts/test-trash-service.py`; `python scripts/test-trash-service.py`; `python scripts/test-workflow-copy.py`; and `python scripts/test-workspace-data-bundle.py` all passed. The new service contract covers atomic primary/backup generations, corrupt-primary backup read, injected promotion failure, concurrent moves, delete compensation, restore compensation, the system-delete precondition, move/restore/system-delete crash recovery, and corrupt-journal rejection.
- **Real test-package acceptance:** restarted the test package on port `8190` after the service changes. Through the live Workflows panel, a newly created test workflow moved into WorkspaceKit trash, appeared there, restored back to the workflow list, then a separate newly created test workflow moved from WorkspaceKit trash to the Windows system Recycle Bin after its danger confirmation. Finally, the real “Move All to System Trash” confirmation cleared all 16 remaining test-package trash entries. The asynchronous list refresh completed with `0` `.workspace2-trash-item` elements; no `trash_operation.json` remained under the test-package user data. No WorkspaceKit console error appeared during this flow.
- **Boundary:** this validates normal real-page operation, not a forced process crash between filesystem and manifest writes. The Python service contract remains the evidence for those deliberate fault-injection and recovery paths.

## 2026-08-01 - WK naming + current Layout host-path recheck

- **Branding resources:** both locale JSON files parsed successfully and expose the same 459 keys. The user-facing WorkspaceKit title, sidebar tooltip, core tab titles, group-conversion messages, node-favorites synchronization messages, fallback strings, README terminology, and `[tool.comfy] DisplayName` were updated to the WK naming standard. No technical key, Provider ID, storage key, directory, or workflow-data field changed.
- **UI Template contracts:** `scripts/test-panel-ui-template.mjs`, `test-panel-ui-template-api.mjs`, `test-panel-ui-template-compatibility.mjs`, and `test-panel-ui-template-export.mjs` all passed.
- **Layout contracts:** all seven current Layout test files passed (21 tests): geometry, module view, legacy command registry, whole-selection alignment, standalone Vendor/host compatibility, WorkspaceKit adapter, and WorkspaceKit Provider.
- **Real test-package path:** the running package at `http://127.0.0.1:8190/` resolves both custom-node junctions to the two Git repositories. WorkspaceKit's sidebar entry opened normally; Workflows, Nodes, Templates, and the hosted Layout tab rendered. Hosted Layout exposed title/status, command-size slider, presentation-mode radios, and all 12 command controls, with no WorkspaceKit-specific error observed in the inspected page state.
- **Boundary:** the live server was not restarted during this documentation/resource batch, so it continued showing its previously loaded strings. A restart plus one fresh-page check is required before claiming the new `WK 工作区` / `WK Workspace` labels are visible at runtime.

## 2026-07-30 - Main-package acceptance sweep (groups, regression, panel UI template)

- Verified in the main package (junction from `custom_nodes/ComfyUI-WorkspaceKit` to the repo, ComfyUI restarted). All items below pass with no regression; several had code landed earlier and were awaiting a real-page confirmation.
- **Group settings dialog / title font / color presets (T-210, T-211, T-212):** header default opacity 25%, background swatch presets replacing the opacity slider, unified font-and-border color control moved under the font-size row, shadow/thickness reorder, default title font size 16, enlarged header padding, title no longer drifts down when zooming out (including below 40%), removed marquee animation options, ten read-only full color presets, 50% header-opacity cap, one-shot theme detection on preset click, and the border "Color / Opacity" label all behave as designed.
- **Continuous regression (T-017, T-018, T-019, T-020, T-021, T-022):** Nodes2 cache under large plugin counts / multi-tab / isolated profiles, Templates exception paths and batch restore/undo, four-state visuals (dark/light/transparent/frosted), Layout merged-vs-standalone appearance matrix, group selection interaction (marquee, Shift multi-select, blank click, Esc, edit focus), and template preview hover all pass.
- **Panel UI Template acceptance (T-014, T-015, T-016):** Layout merged-mode and standalone-mode theme/lifecycle acceptance and the remaining Vendor export material pass.

## 2026-07-29 - entry.js split #6: extract official adapter to `integrations/official-node-adapter.js`

- Pre-change backup: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-official-adapter-20260729-223230.zip` (247 files).
- **Change**: moved the 13-function official-ComfyUI reflection cluster (old L897–1192: Vue-app / node-object / preview-DOM / library-DOM detection, favorites probing, and the import-to-official action) into `entry/integrations/official-node-adapter.js` behind a `createOfficialNodeAdapter({ nodesState, t, limitedKeys, valueAtPath, loadNodeLibrary, renderNodesPanel })` factory. Public surface is 5 functions; 7 stay private. `app`/`fetchJson`/`postJson`/`OFFICIAL_NODE_ADAPTER_KEY` are imported directly; the shared reflection utils `limitedKeys`/`valueAtPath` (used elsewhere) stay in entry.js and are injected. `nodesState` is injected as a shared reference because `officialFavoritesProbe` is also written by the caller `importOfficialFavorites`. The 4 `globalThis.__workspace2*` debug hooks moved verbatim (no readers elsewhere).
- **Two bugs caught during the split (both invisible to `node --check`)**: (1) the extraction range was off by one line, leaving `importWorkspace2FavoritesToOfficial` without its closing brace — it silently swallowed the factory `return`; caught by structural brace review, fixed. (2) the `app` import used `../../scripts/app.js` but from `entry/integrations/` the correct depth is `../../../scripts/app.js` (verified against sibling `rgthree-fast-groups.js`); this would have failed only in a real browser load. Both fixed before commit.
- **TDZ guard**: factory binding placed at the old cluster position (after `loadNodeLibrary` L854); every returned function's first actual use is at L4396+, well after. All moved functions are hoisted declarations.
- **Regression**: `node --check` on both files; 65/65 mjs contracts green; import-depth and brace structure verified. Runtime load can't be Node-tested (imports ComfyUI's `scripts/app.js`), same as entry.js itself. `git diff` on `entry.js`: +15 / -296. `entry.js` dropped from ~8,750 to ~8,455 lines. **Real-page check pending user**: official-favorites import action + startup adapter detection (sidebar tab must still appear).

## 2026-07-29 - entry.js split #5: extract panel appearance to `ui/panel-appearance.js`

- Pre-change backup: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-panel-appearance-clean-20260729-220024.zip` (246 files). Started from a clean tree after the other session's group-colors feature (`73bd797`) was committed; baseline was 65/65 contracts.
- **Change**: moved the panel appearance / glass / background subsystem (8 public functions plus private helpers `cleanupWorkspacePanelAncestors`, `markWorkspacePanelAncestors`, `setupWorkspacePanelOpacityCleanup`, `disposeWorkspace2SidebarSurface`, `findClosestSidebarTabButton`, `isWorkspace2SidebarTabButton`) into `entry/ui/panel-appearance.js` behind a `createPanelAppearance({...})` factory. Two non-contiguous blocks (old L1583–1592 + L1606–1880) were moved verbatim; `isElementVisible` (old L1594) stayed in entry.js because a non-appearance caller (`isWorkspace2PanelOpen`) uses it, and is injected. The unrelated neighbors (`isWorkspacePanelIntegrationsEnabled`/`setWorkspacePanelIntegrationsEnabled`, `closeWorkspaceSettings`) stayed. All injected deps use identical identifier names so the function bodies are unchanged.
- **Shared state**: `workspaceState` (glassPortalElement, renderTarget, opacityCleanupReady, glassOverlayTrackingReady) is injected rather than privatized, because panel-open detection and rendering also read/write those fields.
- **TDZ guard** (lesson from split #3): the `const { ... } = createPanelAppearance(...)` binding was placed at old cluster position (~L1595), and every returned function's first actual usage was confirmed to be later (earliest L1770). Injected deps are all defined earlier or are hoisted function declarations.
- **Regression**: `node --check` on both files; 65/65 mjs contracts green; DOM-mock runtime sanity confirmed the factory returns all 8 functions, `isPanelGlassEnabled()` reports glass mode, `applyWorkspaceBackgroundEffect`/`setupWorkspaceGlassOverlayTracking`/`setPanelBackgroundMode` run without throwing, and shared-state mutation flows through the injected object. `git diff` on `entry.js`: +23 / -286. `entry.js` dropped from 9,013 to ~8,730 lines. **Real-page glass/opacity/blur + sidebar-tab check pending user** (contract tests cannot cover the DOM/glass behavior).

## 2026-07-29 - INCIDENT: dialogs factory TDZ crash (split #3 regression) + fix

- **Symptom**: after splits #1-#4, a real ComfyUI restart showed the WorkspaceKit 🧩 sidebar tab had vanished entirely (no entry at all). Backend loaded fine (`Loading: WorkspaceKit (0.2.4)`, no IMPORT FAILED); the browser console showed `[vite:preloadError]` with no expanded detail.
- **Bisection**: via `git checkout` of each split commit + hard browser reload — baseline `db7547a` OK; #1 `8ba7e95` OK; #2 `8c06ce5` OK; #3 `7c87c6f` **broken**. Root cause isolated to split #3.
- **Root cause**: split #3 replaced hoisted `function workspace2Confirm/Notice/InlineConfirm/ConfirmDirtyWorkflowClose` declarations with a `const { ... } = createWorkspace2Dialogs(...)` binding placed at ~L2297. But `workspace2InlineConfirm` is referenced at module top level far earlier (L472, passed into `createWorkflowTrashRenderer`). `const` is not hoisted, so module evaluation hit the temporal dead zone: `Cannot access 'workspace2InlineConfirm' before initialization`. That aborted the whole entry.js module, so `app.registerExtension` never ran and the tab disappeared.
- **Why tests missed it**: `node --check` only checks syntax; the 64 mjs contracts import individual sibling modules, never evaluating entry.js as a whole in a browser. This is a module-top-level execution-order fault that ONLY surfaces when a real browser evaluates the module. **Lesson: converting a hoisted `function` to a non-hoisted `const` factory binding requires checking every reference site is textually after the binding — or placing the binding above all consumers.**
- **Fix** (`0372c8c`): moved the `createWorkspace2Dialogs(...)` binding above its earliest consumer (before `createWorkflowTrashRenderer`, ~L453). Injected deps (`t`, `isolateComfyKeys`, `closeWorkspace2OverlaysForConfirm`) are function declarations and stay hoisted; the factory body only defines closures and does not call the deps at creation time, so early evaluation is safe. Split #4's `createNodeSearch` factory was audited and is safe (its outputs are used only after its binding).
- **Verified**: 64/64 contracts green; real-page reload confirmed the 🧩 tab is restored and clickable.
- **Deployment note**: the test package plugin directory is a **directory link to the repository root** — edits to the repo are live in the test package immediately (a hard browser reload is enough; no file copy needed). Earlier copies to a different, non-test ComfyUI did not affect the active test package.

## 2026-07-29 - entry.js split #4: extract search/scoring to `core/search-scoring.js` + `nodes/search.js`

- Pre-change backup: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-search-20260729-130418.zip` (245 files).
- **Change (plan A, two modules)**: the ~210-line search cluster split by layer. Generic primitives shared by Workflow/Template/Node search (`pinyinText`, `pinyinSearchText`, `compactSearchFields`, `officialSearchWords`, `officialCalcAuxSingle`, `compareSearchScores`, `genericSearchScores`) moved to `entry/core/search-scoring.js` (imports `pinyinPro` directly). Node-specific scoring (`officialNodeSearchFields`, `officialNodeSearchScores`, `packNodeSearchScores`, `compareNodeSearchResults`, `sortNodeSearchResults` + the private field-cache WeakMap) moved to `entry/nodes/search.js` behind a `createNodeSearch({ splitCamelCase, nodeGroupLabel, officialNodeCategoryParts, getNodeFrequencyByName })` factory. entry.js imports the three primitives it injects into the workflow/template factories, and destructures the node functions from one factory call placed before `createNodeCategoryProjection` (which consumes `sortNodeSearchResults`). The injected deps are function declarations (hoisted) / `nodesState` (defined earlier), so the factory call is time-safe. `splitCamelCase` stays in entry.js (also used elsewhere) and is injected.
- **Dead code removed** (zero callers repo-wide, confirmed): `fuzzySearchMatch`, `nodeSearchText`, and its only-caller-was-dead helper `nodePinyinSearchText`.
- **Regression**: `node --check` on all three files. 64/64 mjs contracts green; `test-node-category-projection` and `test-template-search` exercise the search paths. Runtime sanity confirmed identical ordering for prefix ("ksam"→KSampler), pinyin ("jiazai"→加载图像), and exact-match score 0. `git diff` on `entry.js`: +18 / -213, confined to imports, the factory call, and the cluster deletion. `entry.js` dropped from ~9,205 to 8,996 lines.

## 2026-07-29 - entry.js split #3: extract dialog primitives to `ui/dialogs.js`

- Pre-change backup: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-dialogs-20260729-123347.zip` (244 files).
- **Change**: moved the four themed modal primitives (`workspace2Confirm`, `workspace2Notice`, `workspace2ConfirmDirtyWorkflowClose`, `workspace2InlineConfirm`) and their private single-open-dialog state into `entry/ui/dialogs.js`, exposed through a `createWorkspace2Dialogs({ t, isolateComfyKeys, closeOverlays })` factory. The function bodies are verbatim except the internal `closeWorkspace2OverlaysForConfirm()` call, now the injected `closeOverlays()`. entry.js destructures the four functions from one factory call placed after its dependencies are defined. `isolateComfyKeys` stays in entry.js (13 call sites, not dialog-specific) and is injected. All 23 dialog call sites are unchanged.
- **Regression**: `node --check` passes on both files. 64/64 mjs contracts green. `git diff` on `entry.js`: +11 insertions / -284 deletions, confined to the dialog region plus the import; one stray blank-line collapse outside the region was reverted so the diff stays minimal. No e2e run added; the existing `test-settings-dialog-*` contracts remain green. `entry.js` dropped from 9,480 to ~9,205 lines.

## 2026-07-29 - entry.js split #2: extract `FALLBACK_STRINGS` to `core/fallback-strings.js`

- Pre-change backup: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-fallback-strings-20260729-121348.zip` (243 files).
- **Change**: moved the ~470-line static i18n fallback table `FALLBACK_STRINGS` (old `entry/entry.js` L182–651) verbatim into a new module `entry/core/fallback-strings.js` (exported `FALLBACK_STRINGS`), and replaced it in `entry.js` with `import { FALLBACK_STRINGS } from "./core/fallback-strings.js";`. It is pure data with a single consumer, `configureI18n(app, FALLBACK_STRINGS)`; no other module referenced it. Lookup/merge logic remains in `core/i18n.js`.
- **Regression**: `node --check` passes on both files. 64/64 mjs contracts green. `git diff` on `entry.js` shows +1 insertion / -470 deletions; the `configureI18n` call site is unchanged. No e2e run: a pure static-data move exercises no logic branch. `entry.js` dropped from 9,950 to 9,480 lines.

## 2026-07-29 - entry.js split #1: extract `styles()` CSS to `ui/styles.js`

- Pre-change backup: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-styles-css-20260729-115529.zip` (242 files).
- **Change**: moved the single ~2200-line injected stylesheet function `styles()` (old `entry/entry.js` L3096–5323) verbatim into a new module `entry/ui/styles.js` (exported `styles()`), and replaced it in `entry.js` with `import { styles } from "./ui/styles.js";`. The CSS template literal has zero `${}` interpolation and no entry.js closure references, so the move is behavior-preserving. All five `styles();` call sites are unchanged.
- **Regression**: `node --check` passes on both `entry/entry.js` and `entry/ui/styles.js`. 64/64 mjs contracts green (unchanged from baseline). `git diff` on `entry.js` shows +1 insertion / -2229 deletions and the intact call sites. No e2e run: a pure static-CSS move exercises no logic branch. `entry.js` dropped from 12,178 to 9,950 lines.

## 2026-07-28 - Panel Provider lifecycle + example provider (T-013, T-016 partial)

- **T-013 (Batch 2 Provider lifecycle)**: `scripts/e2e/t013-provider-lifecycle.mjs` drives the public `window.WorkspaceKitPanelAPI` on the running test package. Verified: register succeeds and appears in `getProviders()`; re-registering the same object is `already-registered` with no duplicate; a different object with the same id is rejected `duplicate-id`; `setProvidersEnabled(false)` hides the provider from `getProviders()` while retaining it, and re-enabling restores it (not lost); `unregister()` removes it and a second unregister returns `not-found`; `subscribe()` fired `registered`, two `availability-changed`, and `unregistered`. Zero WorkspaceKit console errors. The pure-visual integration placement remains a manual item.
- **T-016 (Batch 5, partial)**: added `examples/minimal-panel-provider/` — a dependency-free, copyable third-party provider (load-order-safe registration, scoped CSS, `render()`/`dispose()`, optional `ui` with fallback). `scripts/e2e/t016-example-provider.mjs` reproduces its provider object on the real page and verifies register → single scoped `.example-panel-provider` root appended to the host → click updates local state → `dispose()` empties the host → `unregister()` removes it. `docs/PANEL_PROVIDER_API.md` gained CSS scope rules and an example pointer; `docs/PANEL_UI_TEMPLATE.md` Batch 5 marks docs/example delivered. Remaining Batch 5 work: Vendor export contributor guide and the visual release matrix (manual).
- **Regression**: 64/64 mjs contracts; the two new e2e scripts pass. No workflow data written.

## 2026-07-28 - Mixed-state reverse conversion merges instead of overwriting (T-206)

- Pre-change full backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-t206-reverse-merge-mixed-20260728-220224.zip`.
- **Change**: per the user's design, both conversion buttons are now usable whenever the canvas has any group. The reverse conversion `convertCurrentWorkflowToWorkspaceKit` previously returned a no-op unless the graph was pure-native; it now runs from a mixed canvas too, converting the native groups and **merging** them into the existing WorkspaceKit groups rather than overwriting `graph.extra.xzgGroups`. `createNativeToWorkspaceKitConversionPlan` gained a `reservedIds` parameter so a freshly minted `native_<id>` can never collide with (or overwrite) a live WorkspaceKit group id, and a mapped archive id that collides with a live id falls back to a fresh id. `verifyWorkspaceKitConversionResult` now validates the union of pre-existing and freshly converted ids.
- **Settings enablement (T-201/T-206)**: `directionState` in `dialog-sections.js` now enables a direction whenever groups of the opposite kind exist; disables it when everything is already that kind; disables both on an empty canvas (`groups.convertUnavailableNone`).
- **Data-safety fixture**: `scripts/e2e/t206-mixed-reverse-conversion.mjs` opens `_wk-t206-mixed.json` (1 live WorkspaceKit group `live-wk-keep-me` + 1 native group `native-to-merge`, representation `workspacekit`) and runs the reverse conversion. Result on real page: `converted:1, mergedGroupCount:2`; post-state has 0 native groups and 2 WorkspaceKit groups; **the pre-existing `live-wk-keep-me` survived** and `native-to-merge` became a WorkspaceKit group with a non-colliding `native_1` id. Zero WorkspaceKit console errors.
- **Static contracts**: `test-group-reverse-conversion-plan.mjs` extended with reservedIds collision cases; `test-settings-dialog-sections.mjs` updated so mixed state now expects both buttons enabled.
- **Regression**: 64/64 mjs + 2/2 py; seven e2e scripts (smoke + C5×4 + C6 + T-206) all green.
- **Safety**: no workflow written back to disk.

## 2026-07-28 - Settings + Groups UX batch (T-201/T-202/T-204/T-205, partial T-203)

- Pre-change full backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-ux-feedback-batch-t201-t204-t205-20260728-185235.zip`.
- **T-201 (settings convert button)**: replaced the single direction-shifting button with two side-by-side buttons in `entry/settings/dialog-sections.js` — forward "Convert to ComfyUI default groups" and reverse "Convert to WorkspaceKit groups". Each computes its own enabled state and disabled reason. Mixed state (representation `workspacekit` with native groups present) keeps the forward button enabled and disables reverse with a new `groups.convertUnavailableMixed` reason. The static contract `test-settings-dialog-sections.mjs` was rewritten to assert the two-button structure across native/workspacekit/mixed/loading/empty states; passes.
- **T-204 (settings UX)**: nav order changed to Appearance, Advanced, Workflows, Templates, Groups, Shortcuts (`entry.js`); each nav button now renders a semantic icon (palette/settings/files/template/badge/keyboard) with a new `.workspace2-settings-nav-icon` style and nav gap raised 6px→12px; added help text `settings.recentWorkflowsHelp` and `settings.altCOpenTemplatesHelp`.
- **T-202 (title descender clipping)**: title span `line-height` 1→1.4 (template and `updatePositions`); header-height formula `max(21, fs+4)` → `max(21, fs*1.5)` in all four call sites so descenders (g/y/p/j) are no longer clipped by the overflow-hidden header.
- **T-205 (group selection + label)**: `refreshGroupSelection` now outlines any selected group (single or multi) with `1px solid rgba(180,180,180,0.5)` instead of only multi-selection with `2px dashed`; blank-canvas click still clears. Renamed the border-opacity slider label from `groups.color` to a new `groups.opacity` ("透明度"/"Opacity").
- **T-203 (background slider coupling, step 1)**: root cause is `syncBackgroundOpacityLimit()` enforcing background-opacity ≤ header-opacity, which moved the background value when only the header slider was dragged. Per user request the background-fill checkbox and slider are now disabled (greyed, `groups.backgroundFillDisabledHint` tooltip) and the header slider no longer calls the sync. Step 2 (redesign) deferred.
- **Verification**: `node --check` on all edited files; locale JSON parses; `64/64` mjs contracts + `2/2` py; six e2e scripts (smoke + C5×4 + C6) all green; real-page Playwright check confirmed nav order + icons and both convert buttons rendered with correct disabled reasons on workflow `001`.
- **Safety**: no workflow data written. Changes are UI/label/CSS plus one contract rewrite.

## 2026-07-27 - Reverse conversion C6.4: real-page acceptance for added / deleted / mixed / failure (T-005..T-008)

- Pre-change full backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-c6-4-reverse-conversion-fixtures-20260728-100424.zip`.
- **Fixtures** (generated by `scripts/e2e/fixtures/build-c6-reverse.mjs`):
  - `_wk-c6-native-added.json`: 2 native groups (bounds `(100,100,300,200)` and `(300,200,300,200)`, partially overlapping). The archive has one mapping (`g_test_c6_archived_ms` → native id 1) with distinctive `colorHue: 300`. Native id 2 has no archive entry.
  - `_wk-c6-native-deleted.json`: 1 native group on graph (`kept-native`). Archive contains two mappings (`g_test_c6_kept_ms` → 1 and `g_test_c6_orphan_ms` → 2). Native id 2 is absent from the graph — simulating a user-deleted native after forward conversion.
  - `_wk-c6-native-invalid-bounds.json`: 2 natives, the second has `bounding[2] = 0`. No archive.
- **Test**: `scripts/e2e/c6-reverse-conversion.mjs`. Uses the shared helper `callConvertToWorkspaceKit` newly added to `lib/wk-runtime.mjs`.
- **T-005 result (added / T-007 overlap covered here)**: **passed**. `converted:2`, `restoredGroupIds:['g_test_c6_archived_ms']`, `newGroupIds:['native_2']`, `archivedGroupIdsWithoutNativeMatch:[]`. Post-state: the archived-title group carries the archive style (`colorHue: 300`); the freshly-added group carries `DEFAULT_STYLE` (`colorHue: 48`). Both groups' bounds match the current native geometry exactly (validation matrix item 5 mixed/overlap also satisfied via the deliberate bounds overlap).
- **T-006 result (deleted)**: **passed**. `converted:1`, `restoredGroupIds:['g_test_c6_kept_ms']`, `newGroupIds:[]`, `archivedGroupIdsWithoutNativeMatch:['g_test_c6_orphan_ms']`. The deleted native did **not** silently resurrect as a WorkspaceKit group; the orphan archive id is reported for future UI to surface. The archive on disk still lists both entries so the user could later choose to recover manually.
- **T-008 result (invalid bounds)**: **passed**. Convert threw `Cannot restore WorkspaceKit groups: native group 2 has invalid bounds` from `entry/canvas-groups/reverse-conversion-plan.js:78`. Failure occurred inside `createNativeToWorkspaceKitConversionPlan` before any mutation, so post-state exactly equals pre-state (`native:2, wk:0, no archive, no overlays, node count unchanged`).
- **What this closes**: `.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md` C6.4 (reverse-conversion real-page acceptance) except for save/reload after reverse. Reverse pure round-trip already had earlier evidence; combined with C6.1..C6.3 completed, C6 as a whole is now blocked only on the same save/reload maneuvre that is pending on the forward side.
- **Test-isolation note**: during a full sequential run of all six e2e scripts, the T-004 injection sub-scenario observed a transient `wkOverlayDom` of 2 instead of the expected 1 (once, non-reproducible). `c5-failure-forward-conversion.mjs` now calls `workspace2CanvasGroups.rebuildAllEls()` before its baseline snapshot so a stale overlay from a prior test cannot bias the assertion. Full six-script sequential run after this guard: green.
- **Safety**: no fixture written back. Route guard blocked mutation POSTs. 64/64 mjs + 2/2 py contracts green before and after.

## 2026-07-27 - Group conversion hardening C5: failure injection (T-004)

- Pre-change full backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-c5-failure-injection-fixture-20260728-095107.zip`.
- **Disk fixture `_wk-c5-invalid-bounds.json`**: two WorkspaceKit groups, the second has `bounds.w = 0`. **Result**: convert threw `Group "wk-bad-bounds" has invalid bounds.` (from workspace2_canvas_groups.js:3099). Graph and node markers exactly equal to pre-state. No native group added, no overlay DOM change.
- **Runtime injection scenario**: opened the benign `_wk-c5-mixed.json` fixture (from T-001), then dynamic-imported `workspace2_canvas_groups.js` and pushed the phantom id `"99999"` into the WorkspaceKit group's `nodeIds` array. **Result**: convert threw `Group "wk-convert-me" references a missing node.` (from workspace2_canvas_groups.js:3103). Post-state equal to pre-state after restoring the injected array.
- **Discovery**: the "missing node reference" branch is unreachable from a disk fixture. On `openWorkflow`, WorkspaceKit's `recomputeMembership` (workspace2_canvas_groups.js:869-914) rewrites `group.nodeIds` by filtering against the current graph's node ids before conversion runs, so any phantom id is silently removed. The pre-validation at line 3101 remains a defense-in-depth for direct callers (feature code that constructs groups without invoking recompute). The e2e test injects the phantom id at that entry point to keep the branch covered.
- **What this closes**: `.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md` validation matrix item 6 (failure injection). Item 3 (mixed), 4 (empty), 5 (boundary/overlap), 6 (failure) are all closed. C5 as a whole is now blocked only on item 7 (save/reload after conversion), which is a separate acceptance batch.
- **Safety**: no data written back. The `_wk-c5-missing-node.json` disk fixture built by an earlier draft was removed since it does not exercise the intended branch.

## 2026-07-27 - Group conversion hardening C5: boundary/overlap fixtures and stale-marker bug fix (T-003)

- Pre-change full backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-c5-boundary-overlap-fixture-20260728-090139.zip` (fixture batch) and `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-fix-stale-marker-null-check-20260728-091456.zip` (bug fix batch).
- **Fixtures** (generated by `scripts/e2e/fixtures/build-c5-boundary.mjs`):
  - `_wk-c5-overlap.json`: 7 nodes, 0 native, 2 WorkspaceKit overlays with partially overlapping bounds (`(100,100,300,200)` and `(300,200,300,200)`; overlap region `(300,200,100,100)`). Two nodes assigned to each group by nodeIds.
  - `_wk-c5-shared-member.json`: 7 nodes, 0 native, 2 WorkspaceKit overlays whose bounds do not overlap, but both `nodeIds` arrays list the same node `7`.
- **Overlap outcome**: **passed on real page**. Convert returned `converted:2` with archive covering both source groups. Both native groups landed with exact `pos` and `size` matching the source bounds (`[100,100]/[300,200]` and `[300,200]/[300,200]`), and native `_bounding` matched. Zero node moved, zero mode changed.
- **Shared-member outcome**: **first attempt failed** with `Native group conversion validation failed: stale WorkspaceKit node markers remain`. **This exposed a real runtime bug**:
  - `_clearNodeGroupData` in `entry/workspace2_canvas_groups.js:707` clears `_xzgGroupId` and `_xzgGroupData` by assignment to `null` (not `delete`), on purpose — that keeps the field present so LiteGraph's serializer records the cleared state when persisting an already-native workflow.
  - `verifyNativeConversionResult` counted a marker as stale when it was `!== undefined`, so `null` (correctly cleared) was flagged as stale.
  - **Why prior tests never hit this**: T-001 mixed and T-002 empty both had `nodeIds: []`, so `sourceNodeIds` was empty and no node was ever inspected. Shared-member is the first fixture where a source group carries real member nodes that then get cleared.
- **Fix**: extracted `countStaleWorkspaceKitNodeMarkers(...)` as a pure function in `entry/canvas-groups/conversion-result.js`; `verifyNativeConversionResult` now delegates to it. The pure function uses `!= null` so both `null` and `undefined` count as non-stale; empty string, empty object, and any other value stay stale. Added static contract `scripts/test-group-native-conversion-stale-markers.mjs` that pins:
  - a node whose fields were set to `null` by `_clearNodeGroupData` is non-stale;
  - any truthy shell (`""`, `{}`, real ids) is stale;
  - nodes outside `sourceNodeIds` are ignored;
  - `sourceNodeIds` accepts either an Array or a Set.
- **Re-run**: `_wk-c5-shared-member` passed. Both native groups landed at their bounds `[50,50]/[300,200]` and `[500,500]/[300,200]`. Node `5` fell inside group B's bounds and `recomputeInsideNodes()` reported `insideNodeIds: ["5"]` for B; group A's `insideNodeIds` was empty (node `7` sits outside its bounds). Shared node `_xzgGroupId` and `_xzgGroupData` correctly cleared to `null`; the validator passed.
- **What this closes**: `.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md` validation matrix item 5 (boundary / overlap). Contract count 63 → 64. All prior e2e tests (smoke, T-001, T-002) still pass after the fix; static regression `64/64 mjs + 2/2 py` green.
- **Safety**: read-only against fixtures. No fixture written back. Route guard blocked mutations.

## 2026-07-27 - Group conversion hardening C5: empty-workflow fixtures (T-002)

- Pre-change full backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-c5-empty-workflow-fixture-20260728-085424.zip`.
- **Fixtures** (both generated by `scripts/e2e/fixtures/build-c5-empty.mjs`):
  - `_wk-c5-empty-graph.json`: 0 nodes, 0 native groups, 0 wk overlays, representation `workspacekit`, no archive.
  - `_wk-c5-nodes-no-groups.json`: 7 nodes (cloned from `New Workflow.json`), 0 native groups, 0 wk overlays, otherwise identical.
- **Test**: `scripts/e2e/c5-empty-forward-conversion.mjs` (Playwright). Opens each fixture via the same `app.loadGraphData(workflowData, true, true, target, {...})` path WorkspaceKit uses internally, then invokes `convertCurrentWorkflowToNative()`.
- **Result**: **passed on real page** for both fixtures. Each returned `{converted: 0, representation: 'workspacekit', empty: true}`. No archive was written. Post-conversion graph state was identical to pre-state (0 native, 0 wk, same node count). No confirmation dialog was triggered (call was a pure no-op inside the conversion function). Zero WorkspaceKit-related console errors.
- **What this closes**: `.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md` validation matrix item 4 (empty workflow).
- **Refactor note**: this batch introduced `scripts/e2e/lib/wk-runtime.mjs`, a shared helper that centralises `installReadOnlyGuard`, `waitForWorkspaceKitReady`, `openFixture`, `readGraphState`, and `callConvertToNative`. The existing T-001 test `c5-mixed-forward-conversion.mjs` was refactored to use it; re-run remained green. Future C5/C6 fixtures will build on this helper.
- **Safety**: read-only. Route guard blocks any POST to `/workflow`, `/workflows`, `/api/prompt`, `/api/queue`. Fixtures never written back to disk. Static regression 63/63 mjs + 2/2 py + Playwright smoke all remained green.

## 2026-07-27 - Group conversion hardening C5: mixed-groups fixture (T-001)

- Pre-change full backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-c5-mixed-groups-fixture-20260727-233300.zip`.
- **Fixture**: test-package workflow `_wk-c5-mixed.json`, generated deterministically by `scripts/e2e/fixtures/build-c5-mixed.mjs` from `New Workflow.json`. Initial state: 7 nodes, 1 native ComfyUI group titled `native-keep-me`, 1 WorkspaceKit overlay group titled `wk-convert-me`, `extra.workspacekit.groupRepresentation = 'workspacekit'`, no pre-existing `groupConversion` archive.
- **Test**: `scripts/e2e/c5-mixed-forward-conversion.mjs` (Playwright headless Chromium against the test package). The script asserts the fixture on disk, opens it through `app.loadGraphData(workflowData, true, true, target, {...})` — the same signature WorkspaceKit's `openWorkflowFromOfficialStore` uses — then dynamic-imports the served `workspace2_canvas_groups.js` module and invokes `convertCurrentWorkflowToNative()`.
- **Result**: **passed on real page**. Pre-conversion state exactly matched the fixture. `convertCurrentWorkflowToNative()` returned `{converted: 1, representation: 'native', archive: {schemaVersion: 1, source: 'workspacekit', groups: {g_test_c5_mixed_wk_…: {title: 'wk-convert-me', bounds: {x: 400, y: 50, w: 300, h: 200}, …}}}, nativeGroupIds: {g_test_c5_mixed_wk_…: 2}}`. Post state: 2 native groups (`native-keep-me` preserved unchanged and `wk-convert-me` newly created), 0 WorkspaceKit overlays in `graph.extra.xzgGroups`, 0 `.xzg-group-box` DOM overlays, `groupRepresentation === 'native'`, one-entry archive under `extra.workspacekit.groupConversion`.
- **What this closes and does not close**: closes `.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md` validation matrix item 3 (mixed representation). Empty workflow, boundary/overlapping nodes, and failure injection remain their own C5 fixtures (T-002/T-003/T-004).
- **Safety**: the test does not save, does not touch queue/prompt endpoints, and installs a route guard that aborts any POST to `/workflow`, `/workflows`, `/api/prompt`, `/api/queue`. The fixture on disk was never written back. Static regression 63/63 mjs + 2/2 py + Playwright smoke all remained green before and after.

## 2026-07-27 - Backup script alignment (T-302/T-303/T-304/T-305)

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-backup-script-align-20260727-232055.zip` (SHA-256 `2A4E06CA5F589A89C57746A5E8C9CA445FB4B013B347463310FE8F928E662D77`, 1.46 MiB, 224 files).
- Root cause: `scripts/create-project-backup.ps1` used `[System.IO.Path]::GetRelativePath()` and enum members that Windows PowerShell 5.1 cannot resolve at script-load time. A separate defect in the script's forbidden-path regex (`\\.git`) meant the safety check had never actually matched entries whose separators had already been normalised to `/`.
- Fix: replaced the relative-path computation with a `Substring`-based helper, resolved enum values through `[System.Enum]::Parse([Type]"…", "Create")`, and corrected the regex to `\.git` etc. Extended `ValidateSet` to seven categories (`00-legacy-workspace2 … 90-full-snapshots`), matching the sibling Layout repository and the categories already used on disk (17 archives under `50-integrations/`, 4+ under `00-legacy-workspace2/`).
- Verification: `powershell.exe -File …` and `pwsh -File …` each produced a 224-file archive; `Compare-Object` on their entry name lists reported `entries_identical=yes`. Four transient verification archives were removed after the run and are not retained as rollback points.
- Documentation: `docs/BACKUP_CONVENTION.md` rewritten to list all seven categories, show both `powershell.exe` and `pwsh` invocations, and note that empty categories do not create their target directory until first use.
- Regression: full contract suite `63/63` passed; both Python contracts passed; Playwright real-page smoke (`scripts/e2e/smoke-workspacekit-sidebar.mjs`) passed with zero WorkspaceKit-related console errors.

## 2026-07-27 - Reverse conversion C6.3/C6.4: real-page native-to-WorkspaceKit acceptance

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-reverse-conversion-c6-3-20260727-170300.zip` (SHA-256 `407466F92AF51D7D013577B5579F151C91F088532DE520E1B3D031ACE71CB495`).
- Settings now exposes an enabled **Convert to WorkspaceKit groups** action only when the current native graph contains groups. It uses the existing destructive-confirmation component, reuses the conversion lock and reports the required manual-save notice on success. The same source handles English and Chinese labels.
- **Recorded failure and isolated root cause:** the first real execution on `New Workflow.json` reported `Cannot restore WorkspaceKit groups: native group 1 has invalid bounds`. The saved native workflow proved that group `1` had a valid `bounding: [843.5, 434.63802083333337, 300, 200]`. Source review of the installed LiteGraph typings and existing plugin code confirmed that runtime `_bounding` is a `Vector4` iterable, not necessarily a JavaScript `Array`. The snapshot code incorrectly used `Array.isArray()` and discarded valid coordinates. It now copies any iterable vector into a plain array; the reverse-conversion contract covers that guard.
- Focused static checks passed: `test-settings-dialog-sections.mjs`, `test-group-reverse-conversion-plan.mjs`, `test-group-native-conversion-contract.mjs`, JavaScript syntax checks and `git diff --check`.
- **Real retry, test package `http://127.0.0.1:8190/`:** opened the C5 fixture `New Workflow.json` after its previous WorkspaceKit-to-native save. The Groups page showed one native group and an enabled reverse action. Confirmation succeeded; the page reported one converted group, the action became **Convert to ComfyUI native groups**, and the visible save action appeared without an error.
- Saved through WorkspaceKit, then inspected the test-package `New Workflow.json`: `groupRepresentation=workspacekit`, persisted WorkspaceKit group count `1`, native `groups` count `0`, and the native conversion archive retained one group. Switched to `002`, reopened `New Workflow`, and the Groups page still reported one WorkspaceKit group with the forward action available and no dirty/save action.
- **C6.4 pure round-trip:** from that reopened WorkspaceKit state, converted the same fixture back to one ComfyUI native group, saved, reopened the native state, then converted back to WorkspaceKit and saved again. The final browser refresh restored `New Workflow` with one `.xzg-group-box` and no dirty/save action. The final file has `groupRepresentation=workspacekit`, one `xzgGroups` record, zero native `groups`, and a `nativeGroupConversion` snapshot containing the one native group with its valid `bounding` vector.
- This closes the pure native reverse path and pure round-trip only. Native groups added/deleted after forward conversion, mixed groups, boundary membership and rollback injection remain C6.4 fixtures; they are not claimed as passed.

## 2026-07-27 - Reverse conversion C6.2 transaction implementation

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-reverse-conversion-c6-2-20260727-165200.zip` (SHA-256 `8B1BA0A1D1A2F1C9F3E038FA503653DC6F1610FB49F049F39012FF3F24FB5C99`).
- Added `convertCurrentWorkflowToWorkspaceKit()` but intentionally did not expose it in Settings. It creates a C6.1 plan from the live native groups, removes the participating native groups, restores WorkspaceKit group data/markers/overlays, writes `groupRepresentation=workspacekit` and records a current-native snapshot under `nativeGroupConversion`.
- The transaction validates representation, removed native groups, active/persisted WorkspaceKit IDs and overlay count before it can return success. Any thrown error clears newly built overlays, restores `graph.extra`, re-adds original native groups, restores node markers and rebuilds the native view.
- Static transaction and planner contracts passed. Test package startup at `http://127.0.0.1:8190/` still exposed the WorkspaceKit entry after the cache-busted module loaded. No reverse conversion was executed because C6.3 has not yet exposed an audited user-facing confirmation path.

## 2026-07-27 - Reverse conversion C6.1 data-plan baseline

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-reverse-conversion-c6-1-20260727-164100.zip` (SHA-256 `887F30A034B4AE38507CCCD6B51D77A01A78FFCBCACB15956230768E492A1462`).
- Read-only inspection of the positive C5 fixture confirmed the forward archive contract in a real file: `nativeGroupIds` maps WorkspaceKit ID `g_ms33gssordln9p` to native ID `1`, while the archive retains the complete WorkspaceKit group style.
- Added the pure `canvas-groups/reverse-conversion-plan.js` planner. It deliberately does not touch the active graph or Settings UI. Current native geometry/title/member IDs override archived equivalents; a mapped archive contributes WorkspaceKit style/execution data; new native groups receive the existing WorkspaceKit default style.
- The pure contract covers a mapped group whose native title, bounds, color and members changed, a new native group without archive history, missing native groups and invalid archives. No reverse conversion command has been exposed or executed in this batch.

## 2026-07-27 - Group conversion hardening C5: positive save/reload acceptance

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-conversion-hardening-c5-20260727-163000.zip` (SHA-256 `0C2098AD20D5F50C497519FC6E6E04FB44CE887B3FBAF8F180483AB0C88AF364`).
- Test package: `http://127.0.0.1:8190/`. Created the isolated root workflow `New Workflow.json` through WorkspaceKit and created one empty WorkspaceKit group through the real canvas context menu entry `🧩 新建空白编组`.
- Before conversion, the Groups Settings page reported one convertible WorkspaceKit group, an enabled action and one `.xzg-group-box` overlay. The real confirmation dialog showed the expected one-group warning.
- After confirmation, the page reported one converted group and the required save notice; the action became disabled and the WorkspaceKit overlay count became zero. Used WorkspaceKit's visible “保存当前工作流” action; its dirty marker and save action both disappeared.
- Reload acceptance: opened `002`, then reopened `New Workflow`. The Groups Settings page reported one ComfyUI native group, the conversion action remained disabled with the native-state explanation, WorkspaceKit overlay count was zero, and the reopened workflow had no dirty marker or save action.
- Read-only saved-file verification in the test-package `New Workflow.json`: `groupRepresentation=native`, archive schema `1`, archive source `workspacekit`, archive group count `1`, persisted WorkspaceKit group count `0`, native group count `1`.
- C5 is partially complete: the positive conversion/save/reload and pure-native path are now real-page evidence. Mixed groups, empty workflow, boundary-node geometry and injected runtime rollback remain separate fixtures; no claim is made for those cases yet.

## 2026-07-27 - Group conversion hardening C4

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-conversion-hardening-c4-20260727-162000.zip` (SHA-256 `7AB0E31219934D3624A77B9FE58E4B277E0CDA021E4CF4AE451EE6A085507161`).
- Expanded Settings conversion regression coverage for all visible state classes: ready WorkspaceKit groups, native groups, no WorkspaceKit groups, mixed native/WorkspaceKit groups and loading state. It also covers cancelled confirmation, confirmation-time state change, a forced conversion error and the existing default Settings page contract.
- The forced-error test exposed a real UI bug: the `finally` refresh immediately overwrote the failure notice with a ready-state notice. Fixed it by preserving terminal success, stale-state and failure messages while still refreshing the action's disabled state.
- Live test package: `http://127.0.0.1:8190/`, workflow `002`. The native workflow reported 4 ComfyUI groups and the conversion action stayed disabled with its explanatory title. No conversion was performed.
- Full WorkspaceKit contract suite, JavaScript syntax checks, locale JSON parsing and `git diff --check` passed. Positive conversion plus save/reload remains C5 real-page acceptance.

## 2026-07-27 - Group conversion hardening C3

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-conversion-hardening-c3-20260727-161100.zip` (SHA-256 `2D08C3F70B64EC0C65DAD771196B48577E3E5D5D1859E7A8184E874F9BA63368`).
- Added the pure `canvas-groups/conversion-result.js` post-condition validator. A conversion can return success only when the archived data is valid, the native representation is written, every source group has a new native-group mapping, all prior native groups remain, the expected native count is present, and WorkspaceKit data, node markers and overlay elements are gone.
- The validator runs inside the existing transaction before success is returned. A failed post-condition throws into the existing catch path, which removes newly added native groups and restores the previous graph metadata, nodes and WorkspaceKit groups.
- The success message continues to state that the user must save the current workflow; conversion does not claim automatic persistence.
- Unit coverage proves both a complete valid result and two failure cases: a missing converted native group and a remaining WorkspaceKit node marker.
- Live test package: `http://127.0.0.1:8190/`, workflow `002`. It remained in native mode with 4 groups; the action was safely disabled, no confirmation was open, and no workflow data was changed. A real positive conversion + save/reload remains C5 acceptance work.
- Focused C3 contracts, full WorkspaceKit contract suite, JavaScript syntax checks, locale JSON parsing and `git diff --check` passed.

## 2026-07-27 - Group conversion hardening C2

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-conversion-hardening-c2-20260727-160200.zip` (SHA-256 `AC94F532A353D2DDE302D0D7A001D1B4F21D03DED029F231A764DF155E07AB3F`).
- Before opening the confirmation dialog, Settings captures the active graph reference, WorkspaceKit group count, native-group count and a serialized WorkspaceKit-group signature. After confirmation it re-reads all four values; any mismatch cancels the command with an explanatory status.
- The execution layer independently rejects an obsolete snapshot and exposes an in-progress lock, so a caller outside the Settings button cannot create duplicate native groups from an old request.
- Focused contract test injects a group-count change during the asynchronous confirmation step. It proves that the conversion function is not called and the state-changed notice is shown.
- Live test package: `http://127.0.0.1:8190/`, workflow `002`. The current native state still reported 4 ComfyUI groups and the conversion action remained disabled with its explanatory title. No conversion was executed and no workflow data was changed during C2 verification.
- Focused C2 contracts, JavaScript syntax checks, locale JSON parsing and `git diff --check` passed. Full suite is run after this log update.

## 2026-07-27 - Group conversion hardening C1

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-conversion-hardening-c1-20260727-153500.zip` (SHA-256 `B98C0E9D4423E943A13E06B4CD3D2C62412F141D1F3FAB5DDEB99EEFC856F7BC`).
- Settings now opens the existing `workflows` page rather than the removed `common` page.
- Conversion status now distinguishes active WorkspaceKit groups from native ComfyUI groups. A native workflow no longer presents a clickable no-op conversion action.
- Live test package: `http://127.0.0.1:8190/`, workflow `002`. Settings opened on “工作流”; the “编组” page reported “当前工作流已使用 ComfyUI 默认编组（4 个）”. The conversion action had `disabled=true`, `aria-disabled=true`, its reason stated that conversion was unnecessary, and no confirmation dialog was present.
- This C1 batch did not execute a conversion command and did not change the tested workflow data.
- Focused static verification passed: settings dialog contract, native conversion contract, JavaScript syntax checks, locale JSON parsing, and `git diff --check`.

## 2026-07-27 - Group conversion silent-action diagnosis

- Source inspection confirmed that the Settings conversion action returns silently when the current representation is native or `workspaceKitGroupCount` is zero. It refreshes the status text but does not show a disabled state, explanatory notice, or confirmation dialog.
- The current state counter uses active WorkspaceKit overlay groups; native ComfyUI groups are counted separately and are not shown in the current status text. This can make a canvas with visible native groups look like a no-op conversion action.
- The Settings navigation was recently renamed to `workflows / templates / groups / shortcuts / appearance / advanced`, while the dialog still selects the removed `common` page as its initial page. This is a separate confirmed settings-shell defect.
- No conversion algorithm was changed during diagnosis. The controlled remediation plan is tracked in `.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md`.

## 2026-07-27 - Settings persistence batch 2

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-settings-persistence-batch2-20260727-150748.zip` (SHA-256 `72191D61ADBF9EDF054EBF0C327733B1A199676401D64ED3417C433376D8EEE2`).
- Live test package: `http://127.0.0.1:8190/`.
- Workflows: changed `打开记录数量` from 5 to 8; after a real page reload and reopening Settings, the value remained 8.
- Templates: turned `Alt+C 保存后自动打开模板` off; after reload it remained off, then restored it to on in the UI.
- Groups: turned `启用 WorkspaceKit 编组` off; after reload it remained off, then restored it to on in the UI.
- Shortcuts: turned `Shift + 1` off; after reload it remained off, then restored all four module shortcuts to on in the UI.
- The final post-restore reload did not show the WorkspaceKit entry during the observation window, so the restored-on state after that reload remains unverified. Console evidence showed a Vite preload error and `ComfyApp graph accessed before initialization`; these are runtime evidence, not attributed to settings persistence without a reproducible owning call chain.
- No production source code was changed in this batch; this entry records real UI persistence evidence and the remaining reload-boundary uncertainty.

## 2026-07-27 - Settings domain classification batch 1

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-settings-domain-batch1-20260727-135204.zip` (SHA-256 `F67E73B9B9B7A5DA9C36DE6C4D66D8772EF0D1F9F436A152E5311C9EAF5C7E91`).
- Workflows and Templates now have independent settings sections: Open history count belongs to Workflows; Alt+C auto-open belongs to Templates.
- Groups now has its own settings page containing WorkspaceKit group activation and current-workflow representation/conversion. Group pointer gestures remain under Shortcuts.
- The Advanced page continues to hold integrations, node cache, data management, and About until the next migration batch.
- Static verification passed: 61/61 WorkspaceKit contracts, locale JSON parsing, JavaScript syntax checks, and `git diff --check`.
- Live test-package acceptance passed after a fresh reload at `http://127.0.0.1:8190/`: the Settings dialog showed `工作流 / 模板 / 编组 / 快捷键 / 外观 / 高级`; Workflows contained `打开记录数量`, Templates contained `Alt+C 保存后自动打开模板`, Groups contained group activation and representation/conversion, and Shortcuts retained `编组鼠标手势`. Advanced contained integrations, node cache, data management, and About, without a duplicate Groups section.

## 2026-07-27 - Native conversion residue fix and unified group settings

- Pre-change full backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-settings-and-conversion-fix-r1-20260727-133348.zip` (SHA-256 `EF5C6E1C0ACBBCB812EA5BDD73DFB082C89C1B5E69B23A0ACB442EA84E6944D7`).
- Confirmed residue cause: older workflow/node snapshots could retain the direct `_xzgGroup` marker even after `_xzgGroupData` and `properties._xzgGroup` were cleared. The native-mode restore path could then reconstruct a stale DOM WorkspaceKit group that did not follow LiteGraph zoom/pan.
- `_clearNodeGroupData()` now removes all three legacy marker locations, the native restore path clears stale markers before rebuilding, and `rebuildAllEls()` removes unknown stale `.xzg-group-box` elements as well as entries in `groupEls`.
- Settings now place WorkspaceKit group activation, Ctrl+G/Shift+G information, modifier gestures, and group-representation conversion under one Advanced → Groups category. The generic Shortcuts page retains only non-group shortcuts.
- Added bilingual labels and cache-busted settings-module imports so a long-lived browser session cannot silently keep the previous section layout.
- Static verification passed: 61/61 WorkspaceKit contracts, JSON parsing, JavaScript syntax, and `git diff --check`.
- Live test-package page verification after reload: Advanced shows one `编组` category containing the enable checkbox, Ctrl+G/Shift+G information, all three modifier selectors, and the representation conversion area. The already-native workflow reported `ComfyUI 默认编组 · 0`, with zero `.xzg-group-box` elements and zero stale node group markers.
- A fresh conversion from a still-WorkspaceKit workflow must remain a separate acceptance step; the current test package no longer contains an untouched WorkspaceKit-group fixture after the earlier conversion run.

## 2026-07-27 - First transactional WorkspaceKit-to-native conversion batch

- Pre-change source-only backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-native-group-conversion-r1-20260727-121335.zip` (SHA-256 `54F3CF742C0F2DFB81BD3230B65CD0D5C41722D8733DEF4DB6264F21D3EB538F`).
- Added the current-workflow conversion command and Advanced settings action. It validates native-group support, source bounds, and member-node references before creating any native group.
- Existing native groups are preserved. New native groups are removed on failure; graph metadata, node WorkspaceKit fields, and the in-memory overlay state are restored in the rollback path.
- On success, the source archive is stored under `extra.workspacekit.groupConversion`, `groupRepresentation` becomes `native`, active `xzgGroups` data is disabled, and the DOM overlay is removed. No reverse conversion is included in this batch.
- Static verification passed: native-conversion contract, settings-section regression, all existing `test-*.mjs` contracts, JavaScript syntax checks, JSON parsing, and `git diff --check`.
- **Previous live-page boundary superseded:** the first browser attempt was blocked by Layout's legacy `#alignment-buttons` overlay. The overlay fix is recorded in the Layout testing log below; it is no longer a blocker.

## 2026-07-27 - Live acceptance: Layout overlay fix and native conversion

- Test package: `http://127.0.0.1:8190/`, fresh page load after the cache-busted Layout import.
- Layout overlay evidence: when `.workspace2-panel` exists, both legacy `#alignment-buttons` instances reported `visibility: hidden` and `pointer-events: none`; the WorkspaceKit panel reported `overlay: 0` for `.workspace2-group-overlay` after conversion.
- Settings evidence: the WorkspaceKit Settings dialog opened through the real Settings button; the Advanced section was reachable without the legacy toolbar intercepting the click.
- Conversion target: disposable test workflow `Zimage/002.json`, containing four WorkspaceKit groups.
- Conversion evidence: the confirmation dialog stated that a recoverable archive would be kept; after confirmation the UI reported `Converted 4 groups. This workflow now uses ComfyUI default groups.`
- Save/reload evidence: `Ctrl+S` saved the workflow. A direct read of `Zimage/002.json` then showed `extra.workspacekit.groupRepresentation = native`, four native `groups`, and the conversion archive. After a page reload, Advanced reported `Current workflow group representation: ComfyUI default groups · 0`.
- Result: the first real test-package acceptance of the transactional WorkspaceKit-to-native path passed. Reverse conversion remains intentionally out of scope for this batch.

## 2026-07-27 - Reversible group-conversion archive layer

- Pre-change source-only backup: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-group-conversion-archive-r1-20260727-121027.zip` (SHA-256 `72FA8E606518CF0E50852C5EFFE2818CC58A5D3BA0BB3209CB4641A594C1A863`).
- Added the pure `canvas-groups/conversion-archive.js` data layer. It creates a detached, schema-versioned archive without changing the active canvas representation.
- The archive preserves the serialized WorkspaceKit group payload, including `backgroundFillEnabled` and `backgroundOpacity`; validation rejects mismatched schema, source, group IDs, node lists, or bounds before any future conversion mutation.
- `workspace2CanvasGroups.createConversionArchive()` exposes the preparation step for the later transactional native-group conversion. No conversion command or `graph.extra` representation switch is performed in this batch.
- Static verification passed: archive contract, all existing `test-*.mjs` contracts, JavaScript syntax checks, and `git diff --check`.

## 2026-07-27 - Public documentation synchronization

- Reworked the Chinese README and synchronized the English public metadata.
- Confirmed the five `Preview/` screenshots used by both README pages exist and
  remain the selected public teaching assets.
- Updated the README content audit, bilingual screenshot guides, bilingual
  roadmaps, architecture branding note, and third-party compatibility wording.
- Static documentation checks passed: `git diff --check` and local-link checks
  for both README pages. This entry records documentation validation only; it
  does not claim a new runtime or browser acceptance result.

## 2026-07-26 - Layout product-component convergence (hosted real page accepted)

- Complete pre-change snapshots: WorkspaceKit
  `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-product-ui-component-extraction-20260726-visual-unification.zip`
  (SHA-256 `61DA940D0F383295A246CF34E2AC86652DB0996A37CC2F21C57E1C1F29D07E4F`)
  and Layout
  `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-Layout-before-product-ui-component-extraction-20260726-visual-unification.zip`
  (SHA-256 `1700E806263B1DEB6BCA2341A768787ED7F1C6C4C79FD75A9B6E6A0D753317F4`).
- `panel-chrome.js` now delegates the existing Workflows/Nodes/Templates
  title-and-status element construction to the public UI Kit. The returned DOM
  retains `workspace2-header`, `workspace2-title`, and `workspace2-status` for
  compatibility with the established product stylesheet.
- Template v1.2.0 changes Layout's control band to the same compact product
  rhythm and maps Layout Header/Controls/Content hosts to product slot spacing.
  The command grid remains Layout-owned feature content.
- Static verification passed: panel chrome, Template primitive/API/export/host
  contracts, Layout module/Provider/standalone tests (9/9), JavaScript syntax,
  deterministic Vendor verification, and `git diff --check`.
- **Real test-package acceptance:** after a port-8190 reload, hosted `📐 排版`
  rendered exactly one shared product header, three product slots, one command
  grid, and no legacy Layout chrome. Header/status, range, mode controls, and
  all twelve commands rendered without a WorkspaceKit-specific console error.
- Standalone placement and the dark/light/transparent/frosted comparison remain
  separate, explicitly pending acceptance items.

## 2026-07-24 - Layout one-source visual enforcement (real visual acceptance pending)

- Complete WorkspaceKit and Layout snapshots were created before this bounded
  visual-source batch. The exact archive paths and SHA-256 values are recorded
  in `.dev-docs/PANEL_UI_TEMPLATE_IMPLEMENTATION.md`, Batch 4.1.
- Template v1.1.0 maps its shared tokens to WorkspaceKit's existing product
  surface, tab, control, hover, glass-border, and glass-shadow variables, with
  ComfyUI tokens retained only for an independently installed Layout Vendor
  runtime.
- Layout's module view no longer constructs legacy header, range, segmented,
  or command-grid DOM when a Template is unavailable. It requires a complete
  host or generated Vendor Template, preventing a second editable visual system
  from returning silently.
- Static evidence passed: Layout module/Provider/standalone tests (9/9),
  WorkspaceKit Template/export/API/host tests, JavaScript syntax checks, Vendor
  verification, and `git diff --check`.
- **Not accepted yet:** no live Chrome page was available to refresh during this
  record. Merged and standalone visual comparison in dark/light/transparent/
  frosted modes remains explicitly pending.

## 2026-07-24 - Workflow Panel Blueprint reference migration

- Backup created before the bounded UI migration: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-workflows-panel-blueprint-migration-20260724-164758.zip` (SHA-256 `64E9988039DC56D56CBAAB99834C1B66ACFA2A0FA779C4F2DDB3C9372AB906CB`).
- `renderPanel()` now maps the pre-existing Workflows UI into the Template's Header, Toolbar, Controls, and Content slots. Workflow files, service calls, sorting, drag handlers, and open-state behavior were intentionally not rewritten.
- Real test-package browser acceptance covered normal Open/Browse rendering, trash rendering, search input plus clear, sort-menu open/close, sidebar close/reopen, and the merged Layout tab. No WorkspaceKit test error was recorded. Creation/import and an actual workflow drag remain part of the broader workflow regression checklist rather than being claimed as this batch's direct evidence.

## 2026-07-24 - Canvas-group Delete key (real single, multi, and native-key acceptance)

- Backup created before this bounded canvas interaction batch: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-canvas-group-delete-key-20260724-111912.zip` (SHA-256 `95703BDE6F2D039650088E53BEAE7C9AF746AC8FE8180ED35E51531E0AD7B45A`).
- `Delete` now removes one or more transiently selected WorkspaceKit overlay groups through one batched mutation. It reuses the existing group-removal semantics: group frames and metadata are removed, temporary Ignore/Disable modes are restored where applicable, and member nodes, links, positions, and output data are retained.
- The keyboard policy is intentionally narrow: only an unmodified, non-repeating `Delete` with WorkspaceKit group selection and no native ComfyUI node selection is intercepted. Editable controls, modifier combinations, no-group cases, and native node selections remain outside WorkspaceKit handling.
- Static validation passed: `test-group-delete-key-events`, existing pointer-action, selection-cancel, and multi-drag contracts; syntax checks; `git diff --check`; and served-module checks at test package `8190`.
- **Real test-package acceptance:** Shift-selected one group and pressed Delete: its frame disappeared while the graph nodes remained. Restored/created a two-group fixture, Shift-selected both, and pressed Delete: both frames disappeared together while the nodes remained. With no WorkspaceKit group selection, selected a normal native node and pressed Delete: ComfyUI removed that native node, proving WorkspaceKit did not steal the standard node-delete path.
- Current interaction deliberately follows the standard direct Delete action for group frames. A user-facing undo or multi-delete confirmation remains a separate future UX enhancement; it is not falsely represented as implemented.

## 2026-07-24 - Sidebar-entry resilience (implementation and served-source verification)

- Backup created before this startup-order batch: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-sidebar-entry-resilience-20260724-110339.zip` (176 source files).
- The official WorkspaceKit sidebar tab now registers before locale loading, workflow loading, panel-provider setup, node probing, shortcut setup, and canvas-group integration. Early registration uses the stable `WorkspaceKit` title/tooltip until localization is ready, so it does not emit a temporary translation-key label.
- Each later startup stage runs through a bounded error boundary. A failure records only the stage name and error class in `workspaceState.startup`, logs the full local diagnostic, and allows unrelated later stages to continue. Workflow-load failure retains the existing visible status error.
- `scripts/test-sidebar-startup-resilience.mjs`, entry syntax validation, existing Settings contracts, locale JSON parsing, `git diff --check`, and served-source checks at test package `http://127.0.0.1:8190` passed.
- Real test-package page acceptance at `http://127.0.0.1:8190`: after the large local installation completed initialization, exactly one `WorkspaceKit` sidebar button was present with the `🧩` icon. Opening it rendered the Workflows panel and its Workflows, Nodes, Templates, and Settings controls; captured WorkspaceKit warnings/errors were empty. A generic `ComfyApp graph accessed before initialization` error still appeared during the broader ComfyUI startup, but did not prevent the completed page or WorkspaceKit entry.
- Follow-up implementation adds remount recovery that reads the official sidebar store first. If the tab is still registered, it restores only the emoji presentation; if that store API is temporarily unavailable, it deliberately does not re-register. This avoids creating duplicate entries through ComfyUI's append-only registration API. `test-sidebar-startup-resilience.mjs`, syntax checks, diff checks, served-source checks, and a second real 8190 page opening passed.
- This closes the real fresh-load entry/reachability check. The remaining P0 acceptance cases are deliberate fault-injection of workflow/optional-integration failures and a controlled official sidebar DOM-remount check; they are not claimed as complete.

## 2026-07-24 - Advanced settings action rows and risk cues (accepted)

- Backup created before this bounded settings-action batch: `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-advanced-settings-actions-20260724-102024.zip` (SHA-256 `CD54BCF548D65791847EDF47725491DC37DC929D8E9CD1F6AFF26FE2FE0BCD90`).
- Advanced data actions now use a shared action-row presentation: Export is neutral, Import is visually warned, and Clear node cache is visually dangerous and requires the existing WorkspaceKit confirmation flow before it can run. The actions retain their existing injected callbacks; this batch does not change import/export or cache protocol behavior.
- `settings/dialog-sections.js` composes the cache action through injected confirmation and action-button helpers, keeping cache mutation and dialog lifecycle in `entry.js`. The action-wiring regression test specifically verifies that the helper is supplied to dialog sections rather than mistakenly requested from the controls factory.
- Static verification passed: `node --check entry/entry.js`, Settings action-wiring, dialog-sections, and controls contracts, locale JSON parsing, served test-source checks, and `git diff --check`.
- **User acceptance:** the Advanced-page operation rows and risk presentation were tested and accepted. This closes the visual/action-row part of the batch; it does not claim an end-to-end destructive cache-clear operation was performed during this acceptance.

## 2026-07-24 - Configurable module shortcuts (real keyboard acceptance pending)

- Backup created before this bounded shortcut-preference batch: `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-configurable-module-shortcuts-20260724-020500.zip` (SHA-256 `524C5C618E25056372D69FECB9D0267172023753B649E5FFF39913CCA09BD915`).
- `ui/module-shortcuts.js` now owns only pure matching and preference-key policy. Shift+1/2/3 keep Workflows/Nodes/Templates behavior, legacy Shift+W/N remain aliases for the first two actions, and Shift+4 targets only the currently pinned extension Provider. It intentionally does nothing when no Provider is pinned.
- Settings > Shortcuts now exposes one enable checkbox for each Shift+1/2/3/4 action. A disabled shortcut is not intercepted, so ComfyUI or the browser can receive it. Alt+C, Ctrl+G, Shift+G, and all canvas-group modifier-click behavior were not changed.
- Syntax checks; module-shortcut, Settings-controls, Settings-sections, and Panel API contracts; locale JSON parsing; and `git diff --check` passed. The test package served the new `module-shortcuts.js` import with HTTP 200. Automated browser keyboard validation is deferred together with the Panel-integration refresh acceptance.

## 2026-07-24 - Optional Provider integration gate (real reload acceptance pending)

- Complete source/documentation backups were created before the change: `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-panel-integration-gate-20260724-013500.zip` and Layout's corresponding `ComfyUI-WorkspaceKit-Layout-before-panel-integration-gate-20260724-013500.zip`.
- The persisted `workspace2.panelIntegrations.enabled` preference defaults to enabled. Settings exposes it under Advanced > Plugin integration as “Allow extension panels to merge”. It is deliberately a host-composition preference rather than a security boundary.
- `WorkspaceKitPanelAPI` now retains a Provider registered while disabled but exposes no hostable providers. Re-enabling emits `availability-changed` and restores the same Provider list without a second plugin load. If the disabled Provider was active, WorkspaceKit immediately falls back to Workflows; its pinned fourth-tab preference is retained.
- Layout was inspected but not modified: it creates its independent sidebar entry first and only removes it inside `onHostClaimed`. Therefore a page refreshed with integration disabled retains Layout's standalone entry; re-enabling and refreshing allows WorkspaceKit to claim and merge it again.
- `node --check` for entry, panel API, and settings sections; Panel API and Settings-section contracts; locale JSON parsing; and `git diff --check` passed. Real refresh acceptance for disabled/standalone and enabled/merged states remains pending.

## 2026-07-24 - Settings two-column shell (real visual acceptance pending)

- Backup created before this bounded UI-only change: `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-settings-two-column-shell-20260724-012000.zip` (SHA-256 `63454B5C7D92E0E3B656A94ADB642A26F5379822C4DFDC4BB4D924230CDC3A6D`).
- Settings now keeps all existing controls and their injected behavior unchanged, but mounts their section DOM into four navigable pages: General, Shortcuts, Appearance, and Advanced. Pages remain mounted and only toggle `hidden`; this preserves the existing asynchronous version update when About has not been opened yet.
- The dialog has a responsive 760px desktop two-column shell and collapses its navigation to a horizontal strip below 640px. No shortcut assignment, persistence, background-effect calculation, cache, or data-transfer behavior changed in this batch.
- `node --check entry/entry.js`, `scripts/test-settings-dialog-sections.mjs`, both locale JSON parses, the navigation-composition contract, and `git diff --check` passed. The test package served the changed `extensions/ComfyUI-WorkspaceKit/entry.js` resource with HTTP 200 on port 8190.
- Real visual interaction is intentionally **not** recorded as passed: the Chrome control connection reported that the browser was unavailable during this run, so opening/clicking the four pages and checking the narrow layout remains a single pending acceptance step.

## 2026-07-24 - Layout Provider host claim and unique-entry acceptance

- Complete dual-repository backup before host consumption: `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-provider-host-claim-20260724-001500.zip` (SHA-256 `90F64929DF7A6BB777275ADDF81C9692645326C914640E89F57821E7403B8009`) and Layout's corresponding `ComfyUI-WorkspaceKit-Layout-before-provider-host-claim-20260724-001500.zip` (SHA-256 `715B376AF7B2306E25B896628C8399F874350B11FA42B22E2D75E12F0A2836DE`).
- WorkspaceKit now scans `WorkspaceKitPanelProviderRegistry` after publishing Panel API v1, renders Provider tabs through the generic host slots, and disposes Provider DOM/listeners before a tab redraw. Layout registers its standalone fallback first, then removes it through the official `unregisterSidebarTab()` only after WorkspaceKit has registered its own sidebar and confirmed the Provider claim.
- Current ComfyUI frontend source was inspected before this change: its official `unregisterSidebarTab(id)` destroys custom tab content, removes the entry, and clears an active tab. No hide-delay workaround is used.
- Static checks, Provider/API contracts, Layout adapter/provider/view contracts, and `git diff --check` passed. The test package served all five changed integration resources with HTTP 200.
- **User real-page acceptance:** WorkspaceKit displayed a `📐 Layout` tab; selecting it rendered the alignment controls and those controls executed successfully. This closes the primary Layout-host claim path. Cross-load-order, standalone-only, incompatible-API, and close/reopen checks remain part of the broader acceptance matrix.

## 2026-07-23 - WorkspaceKit Panel API v1 registry baseline

- Complete pre-integration backups: `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-panel-api-v1-baseline-20260723-221800.zip` (SHA-256 `DA2535B97606B41AF759EA1F59DA9D2D0AACDC71067A52A3A680C4F3DD62A0D0`) and the corresponding Layout repository snapshot at `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-Layout-before-panel-api-v1-baseline-20260723-221900.zip` (SHA-256 `EF9923E8A38413AA013555A44CA33A0285B8E1177382787F00A90CF3504AC652`).
- `integrations/panel-api.js` publishes the versioned, browser-only `window.WorkspaceKitPanelAPI` at the start of WorkspaceKit setup. It stores optional providers only; it does not yet render a Layout tab, alter the existing three WorkspaceKit modules, or modify Layout.
- The v1 contract validates providers, rejects duplicate IDs, supports idempotent re-publication, exposes a read-only provider list, and isolates subscriber errors from registry mutations.
- `scripts/test-panel-api.mjs` covers publication, validation, duplicate handling, registration/unregistration events, and conflicting API detection. WorkspaceKit Canvas contracts and Layout's existing geometry/command-registry tests passed as the pre-integration baseline.

## 2026-07-23 - WorkspaceKit sidebar host and provider slots

- Backup before this bounded extraction: `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-panel-host-shell-20260723-223500.zip` (SHA-256 `BE4A4D66C10A6AC2E3ED9A30CE43E040DF7D398E5A772608880B091996B745DE`).
- `ui/workspace-panel-host.js` now owns only the sidebar shell: generic tab buttons, the existing settings button, and stable hidden header/context plus visible content slots. Existing Workflows, Nodes, and Templates renderers still receive the same `.workspace2-module-body` content mount, so this batch does not alter their data, actions, or render ownership.
- The tab grid now derives its column count from the provided tab list; this is preparation for an optional provider tab, not a provider integration. No Layout tab is rendered or registered in this batch.
- `scripts/test-workspace-panel-host.mjs` verifies a four-tab host contract, active tab state, exact activation delivery, settings delivery, and stable slot classes. `node --check` for the host and composition root, the host/API/selection contracts, and `git diff --check` passed.
- Test package source checks at `http://127.0.0.1:8190` returned HTTP 200 for both `entry.js` and `ui/workspace-panel-host.js`; the served entry imports the host and the served module contains both the host factory and compatibility mount class. Fresh-page visual acceptance remains separately blocked by the known external `ComfyUI-ZML-Image` preload error before the canvas initializes; this batch did not modify that external plugin.

## 2026-07-23 - Canvas-group pointer actions and transient selection

- Follow-up backup before correcting multi-drag membership: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-before-group-multidrag-membership-fix-20260723-183807.zip`.
- Single-group selection remains internal so ordinary drag behavior is unchanged, but its dashed outline is now reserved for two or more selected groups.
- `canvas-groups/multi-drag-plan.js` now treats persisted `group.nodeIds` as the authoritative node-membership source, matching execution/restore behavior. A bounds-based node scan is retained only when a legacy group has no live member IDs. The contract covers member precedence, nested-group de-duplication, coordinate-container compatibility, and legacy fallback.
- Runtime investigation first found that an already-open browser page still held the old ES module under an unchanged import query. A fresh module cache key was added for the group module and its new pure helper.
- A second runtime cause was confirmed in the live ComfyUI graph: node positions are `Float64Array` values, not plain JavaScript arrays. The old `Array.isArray(node.pos)` condition therefore excluded every member node from the drag-start list. `hasNodePosition()` now accepts any finite two-value coordinate container.
- During a multi-group drag, automatic visual-bounds membership synchronization is temporarily suspended. This prevents members from being evicted while the group frame moves before the corresponding nodes are repositioned.
- Real test-package browser acceptance using `002.json`: Shift-selected two groups, dragged them once, and verified the plan contained six node IDs and all six live node positions moved by the same `+116.870761 / +58.435381` canvas delta as their group frames. A click on blank canvas then cleared `selectedGroupIds` and all selection outlines. This passed in the actual test page.
- The external `ComfyUI-ZML-Image` frontend was temporarily excluded only to isolate an unrelated `vite:preloadError` (`fabric`), then restored byte-for-byte from its single-file backup (SHA-256 matched). The complete test package was restarted afterward and is listening on port 8190. The frontend error is not recorded as a WorkspaceKit defect.
- Backup before the selection-cancellation change: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-group-selection-cancel-events-20260723-212400.zip` (SHA-256 `0745DDB11D832EE51910945B3D980601AA82E2FED62E8BB6B0D1E7C518352CF9`).
- Selection cancellation now listens on `window` capture rather than `document` capture. This is intentionally earlier than third-party `document` listeners that can stop propagation. Only a left `pointerdown` whose composed path contains the actual graph canvas clears selection; group boxes, WorkspaceKit dialogs, toolbars, and sidebars do not.
- Escape clears transient selection unless the active element is an editable input, textarea, select, or contenteditable control. It does not prevent or stop the event, preserving ComfyUI's normal Escape behavior.
- `scripts/test-group-selection-cancel-events.mjs` passed together with the pointer-action and multi-drag contracts. The test package served the versioned entry, group module, and new cancellation module with HTTP 200.
- Fresh-page real acceptance remains pending, not failed: the fully restored test package currently raises the known external `ComfyUI-ZML-Image` `vite:preloadError` before `app.canvas` is initialized. No WorkspaceKit error preceded that failure, and this batch did not modify the external plugin again.

- Backup created before the bounded interaction change: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-group-pointer-actions-and-selection-20260723-181159.zip`.
- Canvas group pointer actions are now semantic defaults: `Ctrl/Meta + Left Click` toggles Ignore/Bypass, `Alt + Left Click` toggles Disable, and `Shift + Left Click` toggles transient group selection. Mixed modifier combinations intentionally do nothing.
- Ignore and Disable reuse `toggleGroupExecutionMode()`, which snapshots each node's original mode and restores it on the second action. The legacy direct bypass path is no longer used for modifier clicks.
- Selection is represented by a non-serialized `selectedGroupIds` set and a 2px theme-color dashed outline with a 3px offset. It does not modify group colors, animations, node selection, or workflow JSON.
- Test-package acceptance at `http://127.0.0.1:8190` using `002.json`: Ctrl+click entered Ignore and a second Ctrl+click restored; Alt+click entered Disable and a second Alt+click restored; Shift+click selected two groups simultaneously with the expected dashed outlines. The first batch intentionally does not change group drag behaviour.
- `scripts/test-group-pointer-actions.mjs` verifies the three exact modifier mappings, Meta compatibility, and rejection of mixed/right-click combinations.

## 2026-07-23 - Canvas-group multi-select drag plan

- Backup created before the bounded movement change: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-group-multiselect-drag-plan-20260723-181735.zip`.
- With two or more selected groups, WorkspaceKit now builds one de-duplicated movement plan. Every selected group border moves once; a selected parent also carries unselected contained child-group borders; nodes are collected by ID from the selected group bounds and move once even when groups overlap or a parent and child are both selected.
- Existing single-group dragging remains on its prior path to avoid changing its verified containment behavior.
- Real test-package acceptance at `http://127.0.0.1:8190` in a fresh page using `002.json`: Shift-selected two groups, dragged one by `+40px/+20px`, and both headers moved by exactly that amount. A reverse drag restored the pre-test positions. Clicking blank canvas cleared both selection outlines.
- The test initially revealed that a page already open before the second source change retained its old ES-module instance. A fresh ComfyUI page loaded the new `startMultiGroupDrag()` method; this is a test-page reload boundary, not a workflow-data issue.
- `scripts/test-group-multi-drag-plan.mjs` covers selected parent/child/peer groups, contained-child border inclusion, and node-ID de-duplication.

## 2026-07-22 - Browse workflow copy and import label

- Backup created before the bounded change: `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-workflow-import-copy-and-group-title-20260722-20260722-210012.zip`.
- The toolbar file-picker action is now labeled `Import / 导入`; behavior remains opening a local workflow JSON into the canvas.
- Browse-only workflow copy uses `/workspace2/workflow/copy`. The service accepts a safe relative JSON path, creates locale-aware numbered names such as `name (Copy 1).json` or `name（副本 1）.json`, and strips a prior WorkspaceKit copy suffix before choosing the next number. Copying a copy therefore continues one series instead of nesting suffixes. Exclusive target creation prevents concurrent tabs from overwriting one another. The Browse row places the copy icon directly before Rename and does not activate the copied workflow.
- Real test-package endpoint acceptance at `http://127.0.0.1:8190`: copied `002.json` to `002 (copy).json`, verified byte-equivalent workflow JSON and list visibility, then sent only that generated copy to the system recycle bin. The original `002.json` remained present and unchanged.
- `scripts/test-workflow-copy.py` covers collision naming, exact content copy, and traversal rejection. `scripts/test-workflow-row-renderer.mjs` covers Browse action ordering and copy callback delivery. All frontend contract scripts, Python compilation, locale JSON parsing, and `git diff --check` passed.
- Follow-up UI feedback exposed two unwanted side effects in the first implementation: it selected the new Browse row and called official workflow synchronization, which could add the un-opened copy to Open. The repair preserves the existing selection and performs no official sync; `scripts/test-workflow-copy-ui-policy.mjs` locks both boundaries. Copies manually created before this repair remain untouched.
- Backup created before localized numbering: `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-before-localized-workflow-copy-numbering-20260722-212531.zip`. The copy route now receives only the normalized UI locale and creates `name（副本 N）.json` in Chinese or `name (Copy N).json` in English. The service removes both current and legacy nested copy suffixes before calculating the next available number. The service contract covers English and Chinese numbering, copying a numbered copy, and a legacy `(copy) (copy)` source. Real test-package endpoint acceptance copied `002 (copy) (copy).json` to `002（副本 1）.json`; only that generated acceptance file was moved to the WorkspaceKit recycle bin afterward.
- Backup created before Browse-only rename handling: `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-before-browse-rename-open-state-fix-20260722-213335.zip`. `getWorkflowByPath()` is a catalog lookup, not an Open-tab check. Workflow rename now calls ComfyUI's `renameWorkflow()` only when the matching object is already in `openWorkflows`; an unopened Browse file uses the filesystem rename route and performs no official Store sync. `scripts/test-workflow-rename-open-state-policy.mjs` locks this boundary.
- Backup created before rename cancellation/no-op handling: `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-before-rename-cancel-noop-localization-fix-20260722-213954.zip`. Rename now compares normalized target and source paths, so the display-name omission of `.json` cannot issue a self-rename. Esc marks the input settled before removal, preventing its subsequent blur from submitting a stale path. Known rename conflict/source errors now use localized status messages; unknown errors retain the generic error status. `scripts/test-workflow-rename-input.mjs` covers Enter-plus-blur de-duplication and Esc-plus-blur cancellation.
- Backup created before group-header action icon refinement: `.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-before-group-header-action-icons-scale-20260722-221043.zip`. Execute retains the solid play icon; Bypass uses a simplified detour arrow and Disable uses a bolder ban mark. Action button dimensions, SVG dimensions, gaps, margins, and the delete glyph now derive from the scaled group-title font size rather than independent minimum pixel sizes. `scripts/test-canvas-group-action-icons.mjs` locks the shared scaling contract and icon geometry.
- Backup created before header eye-off/balance refinement: `.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-before-group-header-eye-off-icon-balance-20260722-222228.zip`. The Bypass/Ignore control now uses an eye-off mark, while Disable keeps the ban mark. Header controls derive from scaled `headerHeight`, ensuring they fit large custom title fonts as well as normal zoom levels. Active Bypass and Disable backgrounds were softened to preserve state feedback without outweighing the title.
- Backup created before header-icon stroke/centering refinement: `.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-before-group-header-icon-stroke-centering-20260722-223044.zip`. Eye-off and Disable strokes were reduced to `1.9` and `2.1` respectively. All three action buttons now use an inline-flex center with zero line height, removing browser baseline drift inside active color tiles.
- Canvas-group default-title fallback now prevents the literal `groups.defaultTitle` i18n key from becoming a user-visible title when a locale asset is unavailable. During restore, previously saved literal keys and empty titles are normalized to the current default title; existing custom titles are not rewritten.

## 2026-07-22 - Template recycle-bin contract coverage

- Backup created before the bounded data-layer extraction: `.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-template-trash-contract-extraction-20260722-20260722-184024.zip`.
- Template deletion remains JSON-library based; it does not reuse the workflow filesystem/system-trash service. The library already persists `trash` entries through the existing `/workspace2/templates/library` endpoint.
- Added the pure `entry/templates/trash-store.js` contract layer and `scripts/test-template-trash-store.mjs`. The test verifies delete-to-trash with preserved nodes/links and original group, restore to the original group, restore-to-root after the group was removed, permanent delete, and empty trash. It uses only in-memory objects and does not alter saved templates.
- Test-package endpoint evidence at `http://127.0.0.1:8190`: template library returned HTTP 200 with schema version 2, three stored templates, and an empty trash list. JavaScript syntax checks, Python compilation, locale JSON parsing, and `git diff --check` passed.
- Real delete/restore UI acceptance remains pending. The isolated browser page in this run hit ComfyUI's unrelated `vite:preloadError` before WorkspaceKit mounted, so no existing template was deleted merely to force an acceptance claim.

## 2026-07-22 - Node snapshot cache across browser sessions

- Reproduced and fixed a test/main isolation defect: the test package shares an embedded Python distribution with the main package, so `folder_paths.__file__` could identify the shared import source instead of the active instance. Node-library/cache data then followed the main package and a valid 2,858-node test snapshot was rejected against the wrong location.
- `__init__.py` now derives the active package root from ComfyUI's public `folder_paths.get_user_directory()` and falls back to the module path only for older ComfyUI releases. Python compilation passed.
- After a test-package restart, the node cache endpoint returned `cache_hit=true`; its signature matched the live signature and its snapshot contained 2,858 nodes. A new isolated browser session opened the Nodes panel in about 3 seconds and rendered the same 2,858-node count.
- Stale-signature acceptance used a fully reversible test: the test package's `ComfyUI-Manager` directory timestamp was temporarily changed, producing a different signature and `cache_hit=false`. Its exact original timestamp was restored; the original signature and `cache_hit=true` returned. No plugin file was added, removed, or modified.
- `scripts/test-node-object-info-cache.mjs` and `scripts/test-node-object-info-refresh.mjs` both passed.

## 2026-07-22 - Nodes and Templates real interaction acceptance

- Test package real-page check at `http://127.0.0.1:8190`: expanding an existing Nodes favorite subgroup immediately rendered its contained favorite nodes; no favorite membership, alias, or group data was changed.
- Templates panel check: both existing template groups were expanded in turn. The second group rendered all three stored templates (`123`, `23`, and `Workspace2Title`) with their saved node/link metadata. Both groups were returned to their original collapsed state after the check.
- WorkspaceKit console warnings/errors were zero throughout the Nodes/Templates checks.
- Hover-preview acceptance remains pending, not failed: the renderer binds the expected native `pointerenter`, `pointermove`, and `pointerleave` handlers, but this automated browser surface did not dispatch a native `pointerenter` when moving its pointer over an existing template row. The screenshot consequently did not show a popover. No source change is justified until it is verified with a normal physical mouse event.

## 2026-07-22 - Main-package visual regression

- Main package confirmed running at `http://127.0.0.1:8188`; its `ComfyUI-WorkspaceKit` custom-node directory is a junction to the repository.
- The real main-page check covered the Workflows panel in the original `Dark_ZY` theme: Open and Browse rendered as distinct, expanded sections with an active open-workflow row, close/rename controls, the move-to-root target, and the Browse folder/file list. No residual separator or position defect was seen.
- WorkspaceKit Settings was exercised in transparent mode and glass mode. Selecting glass applied `is-glass-background` to the existing sidebar host, kept the host inside the sidebar layout, and showed the expected translucent/blurred surface. Transparent mode was then restored.
- The official ComfyUI theme was temporarily switched from `Dark_ZY` to `Light`; the Workflows panel retained legible text, icons, controls, selection state, Open/Browse sections, and the tree layout. The official theme was restored to `Dark_ZY` after the check.
- Main node cache endpoint returned `cache_hit=true` with a signature matching `/workspace2/nodes/index-signature` for 202 detected plugins. Nodes rendered 6,345 nodes after the main-page load. WorkspaceKit console warnings/errors were zero.

## 2026-07-22 - Workspace data export/import with automatic backup

- Source snapshot created before implementation: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-data-export-import-20260722-121700.zip`.
- The portable bundle deliberately includes WorkspaceKit-owned node favorites, templates, workflow-folder metadata, server settings, and browser keys beginning with `workspace2.`. Workflow JSON files and the derived node object-info cache are deliberately excluded.
- `scripts/test-workspace-data-bundle.py` passed: it exports a temporary library, imports changed data, verifies that the new data was written, and verifies that the automatic backup retained the original favorite and browser preference.
- Real test-package endpoint acceptance at `http://127.0.0.1:8190`: `GET /workspace2/data-bundle` returned schema version 1 with all four server data sections. Re-importing that same exported bundle created `user/default/comfyui-workspace2/data_backups/workspacekit-before-import-20260722-042534.json` before writing. This test intentionally used the exact current data, so it did not replace user content with an external file.
- Real Settings-page check: the localized `Data backup and transfer / 数据备份与迁移` section rendered its explanatory text and both Export/Import buttons. The import path uses the existing themed confirmation and notice dialogs, rather than native browser confirm/alert, then reloads after a successful import so state is reloaded consistently.

## 2026-07-21 - Open workflow move state (Workflows P0)

- Reproduced in the test package: moving an open official workflow through `/workspace2/move` changed the file path, but left the ComfyUI workflow-store object on its old path. The Browse tree showed the new location while the Open section lost the tab after the official refresh.
- `moveItem()` now uses ComfyUI's existing `workflowStore.renameWorkflow(workflow, "workflows/<target>")` transaction for an open file under the official workflows root, matching the already-proven rename path. Folder moves and non-official roots continue to use `/workspace2/move`.
- Real acceptance at `http://127.0.0.1:8190`: the same `P0 Workflow 20260721.json` completed a folder-to-root move and then a root-to-folder move. After each move, Browse contained exactly the new path, the Open section still contained the workflow, and it remained present after a 4.8-second official-sync wait.
- Recycle-bin acceptance at `http://127.0.0.1:8190`: an active, unsaved test workflow was moved to the WorkspaceKit recycle bin. Browse and Open both removed it, the panel remained mounted after a 4.8-second sync, and the recycle bin showed exactly one item. Restoring it cleared the recycle bin; switching back to files showed the restored Browse and Open rows, which both remained after another 4.8-second sync. No WorkspaceKit warning or error was recorded.
- Restart recovery at `http://127.0.0.1:8190`: after a full test-package restart, the service recovered normally (the large custom-node package took longer than the initial 55-second readiness window). The workflow endpoint returned 186 items including the restored test workflow and P0 folder. A fresh browser page opened WorkspaceKit successfully; both Browse rows rendered and no WorkspaceKit warning/error was recorded.
- This validates the open-tab path transition only. A one-time `Source not found` status observed while creating a test folder was not reproduced and is deliberately not classified as a confirmed defect or patched here.

## 2026-07-21 - External rename polling boundary (Workflows P0, pending design)

- Reproduced with a test workflow renamed directly through the WorkspaceKit backend endpoint, simulating another browser/client. The 4-second poll correctly updated Browse from the old file name to the new one, but the official ComfyUI Store retained the old Open-tab identity.
- A scoped experiment that called official `syncWorkflows()` after the detected signature change removed the stale Open row, but left the old workflow canvas/title active. This is a worse state and was reverted; it is not part of the current source.
- Automatic reopening/remapping is intentionally not implemented: an external rename has no reliable identity mapping and reopening can discard or overwrite an unsaved active canvas. A future product decision must define an explicit user-visible conflict/reopen flow before this is changed.
- Re-confirmed in the main package on 2026-07-30: Browse updates to the new name after the poll while the open tab keeps its old official identity. This boundary behaves as designed and is not treated as a defect.

## 2026-07-21 - Sidebar shortcut toggle regression

- Backup created before the repair: `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-shortcut-toggle-and-link-rename-20260721-222057.zip`.
- Reproduced in the test package: pressing Shift+1, Shift+2, or Shift+3 twice left the corresponding WorkspaceKit module open. The shortcut handlers always followed the non-toggling `openWorkspace2Module()` route.
- Added `entry/ui/module-toggle.js`, a pure policy helper. Shift+1/2/3 now request `closeIfActive`; Alt+C continues to use the default non-toggling path so a successful template save cannot close the Templates panel.
- The reproducible `scripts/test-workspace-shortcut-toggle.mjs` contract covers active-module close eligibility, cross-module switching, closed-panel behavior, the non-toggling template route, and the three shortcut call sites.
- Test-package directory junctions were renamed from `comfyui-workspace2` to `ComfyUI-WorkspaceKit` for both the test and main packages; both point to the same repository. After a visible-CMD restart at `http://127.0.0.1:8190`, `/extensions/ComfyUI-WorkspaceKit/entry.js` returned HTTP 200 and the old extension path returned HTTP 404.
- Real browser acceptance on the test package: each of Shift+1/2/3 completed `open -> close -> reopen`. Closing removes the WorkspaceKit panel and deactivates its sidebar entry; ComfyUI retains an empty sidebar host. WorkspaceKit console warnings/errors were zero.

## 2026-07-20 - Shared panel-chrome extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-panel-chrome-20260720-124317.zip`.
- Extracted `entry/ui/panel-chrome.js`: panel header/status DOM and search-toolbar DOM, including clear-button visibility, clear/focus behavior, IME composition suppression, and callback delivery.
- Every caller retains query state, search scheduling/result updates, toolbar business actions, persistence, and panel lifecycle. This extraction intentionally does not change search semantics or styling.
- The reproducible `scripts/test-panel-chrome.mjs` contract covers status dataset attachment, action-count CSS variable, input preparation, IME composition deduplication, clear behavior, and focus restoration.
- `node --check` passed for the entry and module; all existing `scripts/test-*.mjs` contracts, Python compilation for `__init__.py`, and `git diff --check` passed.
- Fresh test-package browser check at `http://127.0.0.1:8180`: Workflows, Nodes, and Templates each rendered exactly one header, one search input, and one clear button through the shared module. WorkspaceKit console errors remained zero and no query or data mutation was made.

## 2026-07-20 - Workflow Open-list renderer extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-workflow-open-list-20260720-123747.zip`.
- Extracted `entry/workflows/open-list-renderer.js`: Open-section DOM, empty state, row state presentation, dirty marker, save-button visibility, and action callback binding.
- The entry retains official/local list discovery and transient-official-item filtering, active/dirty/rename state calculation, rename/open/save/close/remove operations, confirmation behavior, error rendering, persistence, and all official Store/file APIs.
- The reproducible `scripts/test-workflow-open-list-renderer.mjs` contract covers selected/dirty presentation, active-only save button, official rename/close controls, local remove control, empty structural ownership, and callback delivery.
- `node --check` passed for the entry and module; all existing `scripts/test-*.mjs` contracts, Python compilation for `__init__.py`, and `git diff --check` passed.
- Fresh test-package browser check at `http://127.0.0.1:8180`: Workflows Open rendered one current selected workflow row with its close action. The canvas was clean, so zero dirty dots and zero save buttons was the expected state. WorkspaceKit console errors remained zero. No workflow action ran and no data changed.

## 2026-07-20 - Workflow rename-input extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-workflow-rename-input-20260720-113224.zip`.
- Extracted `entry/workflows/rename-input.js`: input DOM, deferred focus/select, Escape cancellation, and the shared single-flight promise used by Enter and blur.
- The entry retains the actual rename request, workflow editing state, error handling, panel rerendering, and all official Store/file APIs.
- The reproducible `scripts/test-workflow-rename-input.mjs` contract covers focus eligibility, Enter commit, blur deduplication after Enter, disabled state, and Escape cancellation before a request begins.
- `node --check` passed for the entry and module; all existing `scripts/test-*.mjs` contracts, Python compilation for `__init__.py`, and `git diff --check` passed.
- Fresh test-package browser check at `http://127.0.0.1:8180`: opened the current workflow's rename input, pressed Esc, confirmed the input closed and the active workflow row remained. WorkspaceKit console errors remained zero before and after. No rename request or file write was made.

## 2026-07-20 - Shared preview-positioner extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-preview-positioner-20260720-112739.zip`.
- Extracted `entry/ui/preview-positioner.js`: cursor-following and sidebar-anchored preview geometry, viewport clamping, preview width, and sidebar-side selection.
- Nodes/Templates retain popover creation, visibility/state, content, hover timing, and all data behavior. The module receives only viewport/sidebar/render-target queries from the entry.
- The reproducible `scripts/test-preview-positioner.mjs` contract covers right/bottom cursor fallback, left and right sidebar placement, vertical clamping, width initialization, and follow-cursor routing.
- `node --check` passed for the entry and module; all existing `scripts/test-*.mjs` contracts, Python compilation for `__init__.py`, and `git diff --check` passed.
- Fresh test-package browser regression at `http://127.0.0.1:8180`: WorkspaceKit Templates rendered two groups and three rows with zero WorkspaceKit console errors. The isolated browser's pointer-move API did not generate the page's native `pointerenter` event, so real hover-preview acceptance remains explicitly pending rather than claimed; no template or canvas data changed.

## 2026-07-20 - Template context-menu renderer extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-context-menu-20260720-112301.zip`.
- Extracted `entry/templates/context-menu-renderer.js`: menu DOM, previous-menu replacement cleanup, window/document close-listener lifecycle, and four action callback delegates.
- The entry retains template state, rename/delete persistence, clipboard access, canvas placement, error state, and panel rerendering. The renderer deliberately preserves the existing coordinate behavior rather than introducing a visual-positioning change during a split.
- The reproducible `scripts/test-template-context-menu-renderer.mjs` contract covers four actions, coordinates, stored menu state, close-listener registration, and close-before-action ordering.
- `node --check` passed for the entry and module; all existing `scripts/test-*.mjs` contracts, Python compilation for `__init__.py`, and `git diff --check` passed.
- Fresh test-package browser check at `http://127.0.0.1:8180`: opened a template row context menu showing Rename, Place at canvas center, Copy template name, and Delete template; Esc closed it. WorkspaceKit console errors remained zero before and after. No menu action ran, so template data and canvas content were unchanged.

## 2026-07-20 - Template row-renderer extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-row-renderer-20260720-093752.zip`.
- Extracted `entry/templates/row-renderer.js`: template-row DOM, rename input, metadata/action elements, and event-to-callback forwarding.
- The entry retains all mutable behavior: expanded/editing/selection/drag state, rename/delete mutations and persistence, preview lifecycle, template drag payload, context menu, canvas placement, error state, and rerendering.
- The reproducible `scripts/test-template-row-renderer.mjs` contract covers row metadata and selected state, drag/menu/select/preview/open/delete callback delivery, and the editing rename/focus/Escape path.
- `node --check` passed for the entry and module; all existing `scripts/test-*.mjs` contracts, Python compilation for `__init__.py`, and `git diff --check` passed.
- Fresh test-package browser check at `http://127.0.0.1:8180`: WorkspaceKit opened, Templates rendered two groups and three rows after expansion, selecting one row produced exactly one selected row, and its metadata, drag hint, and action button rendered. WorkspaceKit console errors remained zero before and after the interaction. No template was deleted or placed on the canvas.

## 2026-07-20 - Template group-header renderer extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-group-header-20260720-092331.zip`.
- Extracted `entry/templates/group-header-renderer.js`: template-group header DOM, indentation, disclosure/icon/actions, inline rename input, and injected callback delivery.
- The entry retains group projection, expanded/editing/error state, all template/group mutations and persistence, rerender orchestration, drag/drop implementation, and panel lifecycle.
- The first real-page run caught an interface mismatch immediately: the factory returned a function while the entry destructured an object. The module now returns `{ renderTemplateGroupHeader }`, matching the entry and its contract. This is recorded because static syntax alone did not exercise the factory-to-entry assembly path.
- `node --check` passed for the entry and module; all `scripts/test-*.mjs` contracts, Python compilation for `__init__.py`, and `git diff --check` passed.
- Fresh test-package browser check at `http://127.0.0.1:8180`: WorkspaceKit opened, the Templates tab rendered two existing groups, and expanding the first group rendered three templates. The pre-fix console errors remain in that browser session history, but the repaired reload and expansion completed without rethrowing `renderTemplateGroupHeader is not a function`; no template data was changed.

## 2026-07-20 - Template drag/drop extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-drag-drop-20260720-090421.zip`.
- Extracted `entry/templates/drag-drop.js`: template/group transfer parsing, group drag-source events, target eligibility feedback, and drop callback delegation.
- The entry retains every mutation and side effect: group/template moves, saves, error-state update, rerender, template-library ownership, and canvas drops.
- Contract coverage verifies template drops, group source data, drag-end cleanup, recursive-group rejection, and drop-target feedback. A first test run exposed an incomplete DOM test double; only the test double was corrected, then the full contract suite passed.
- Test package at `http://127.0.0.1:8180` was listening and returned HTTP 200 for both `entry.js` and `templates/drag-drop.js` through the `comfyui-workspace2` junction.
- An isolated real test page loaded the WorkspaceKit Templates panel with the existing two groups and four templates; both groups expanded successfully and no WorkspaceKit console error was reported. The test browser does not expose native drag-event dispatch, so it cannot synthesize a faithful HTML5 `DataTransfer` drop. A normal pointer drag therefore made no move, and the server API confirmed the template still belonged to its original group; no template data was created or changed during this verification.

## 2026-07-20 - Template group context-menu extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-group-context-menu-20260719-233817.zip`.
- Extracted `entry/templates/group-context-menu.js`: group-menu DOM, boundary-aware positioning, close-listener registration, and five callback delegates.
- The entry retains all data mutations: create subgroup, rename state/render, personalize, reset style, and delete.
- Contract coverage verifies five menu rows, edge positioning, close-before-action behavior, and callback delegation.
- The user manually tested the real template-group menu and reported no issue; this is accepted as the real-page regression result.
- Follow-up source review separated the no-argument "close existing menu" callback from the document-event close handler; the latter alone receives keyboard/pointer events. The focused contract now verifies both listeners are registered with the event handler.

## 2026-07-19 - Shared decorated-icon extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-decorated-icon-utils-20260719-230709.zip`.
- Extracted `entry/ui/decorated-icon.js`: Prime-icon detection plus emoji/default icon class, text, and color-variable presentation.
- The helper only writes to the supplied element. Feature data, icon choice, persistence, and panel behavior remain in callers.
- Contract coverage verifies emoji, Prime icon, default fallback, and color-variable cleanup/application.
- The user tested the affected panel behavior after the extraction and reported no issue. This is accepted as the panel regression check; no feature data was intentionally changed.

## 2026-07-19 - Shared tree-expansion extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-tree-expansion-utils-20260719-224704.zip`.
- Extracted `entry/ui/tree-expansion.js`: the shared expanded-key Set helper used by Workflows, Templates, and Nodes.
- The helper only mutates the Set passed by its caller. Tree shape, persistence, rendering, feature state, and all endpoint/Store behavior remain in the respective callers.
- Contract coverage verifies ignoring empty keys and correct add/remove behavior.
- Test package at `http://127.0.0.1:8180` returned the new module with HTTP 200. An isolated page registered the WorkspaceKit sidebar entry with no WorkspaceKit console error; no feature data was changed.

## 2026-07-19 - Workflow tree-interaction extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-workflow-tree-interaction-20260719-224230.zip`.
- Extracted `entry/workflows/tree-interaction.js`: tree scroll snapshot/restore, workflow-folder descendant-key collection, and folder expand/collapse.
- The generic recursive Set helper remains in `entry.js`, because Templates and Nodes also use it. File operations, sorting, polling, persistence, and official Store APIs remain outside the module.
- Contract coverage verifies scroll restoration scheduling, recursive folder-key filtering, ordinary and recursive toggles, and render intent.
- Test package at `http://127.0.0.1:8180` returned the new module with HTTP 200. An isolated Workflows page expanded then collapsed the API folder, returning the disclosure to its original state with no WorkspaceKit console error. No workflow data was changed.

## 2026-07-19 - Workflow custom-order store extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-workflow-custom-order-store-20260719-221357.zip`.
- Extracted `entry/workflows/custom-order-store.js`: defensive custom-order JSON read and write under the existing workflow order key.
- Entry initialization reads the Store before creating workflow state. Existing reorder and path-state callbacks still call the existing save bridge, so the former mutation and render order is preserved.
- Contract coverage verifies missing, valid, array, malformed JSON, explicit object save, and null-save fallback behavior.
- Test package at `http://127.0.0.1:8180` returned the new module with HTTP 200. An isolated page opened WorkspaceKit and its Workflows tab, showing Browse and its sort button with no WorkspaceKit console error. No sort preference or workflow data was changed.

## 2026-07-19 - Shared personalization-panel extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-personalization-panel-20260719-220501.zip`.
- Extracted `entry/ui/personalization-panel.js`: shared icon/color dialog DOM, viewport clamping, emoji/color selection, Escape/outside dismissal, and callback delivery.
- Workflow folder, Template group, and Node group callers retain their own apply/reset callbacks and all data mutations. The shared dialog performs no endpoint, persistence, workflow, template, or node-group operation itself.
- Contract coverage verifies viewport clamping, initial preview rendering, apply callback values, and successful close behavior.
- Test package at `http://127.0.0.1:8180` returned the new module with HTTP 200. An isolated page registered WorkspaceKit and opened its base panel with no WorkspaceKit console error; the dialog remained closed and no business data was changed.
- A real Workflows-folder context menu opened the personalization dialog for API; pressing Escape closed it. No Apply/Reset action was invoked, so no folder metadata or workflow content was changed. No WorkspaceKit console error was recorded.

## 2026-07-19 - Workflow folder-meta extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-workflow-folder-meta-20260719-215916.zip`.
- Extracted `entry/workflows/folder-meta.js`: folder icon/color lookup, empty-value cleanup, `/workspace2/folder-meta` save, response replacement, and existing post-save render intent.
- The generic personalization dialog stays in `entry.js`; this module has no workflow-file mutation, official Store, poll, or sidebar dependency.
- Contract coverage verifies Windows-style path normalization, preserving the other style field, removing an empty style record, server-response precedence, and one render intent after each successful save.
- Test package at `http://127.0.0.1:8180` returned the new module with HTTP 200. An isolated page opened WorkspaceKit and its Workflows tab, showing both Open/Browse regions and the item count with no WorkspaceKit console error. No folder metadata or workflow content was changed.

## 2026-07-19 - Workflow path-utils extraction

- Backup created before extraction: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-workflow-path-utils-20260719-214457.zip`.
- Extracted `entry/workflows/path-utils.js`: pure path normalization, parent and prefix relations, path joining, file rename target calculation, and official `workflows/` root removal.
- The module deliberately has no state, endpoint, filesystem, or official ComfyUI Store dependency. Rename, move, restore, and Browse-state commit order remain in `entry.js`.
- Contract coverage checks root/nested parents, Windows slash normalization, exact/descendant/unrelated prefix replacement, containment boundaries, file/folder rename targets, and official-root conversion.
- Test package at `http://127.0.0.1:8180` returned the new module with HTTP 200. An isolated page loaded the WorkspaceKit sidebar and opened the Workflows tab without a WorkspaceKit console error. No workflow mutation was performed.

## 2026-07-09 - Node cache coordination

Environment:

- ComfyUI test package at `http://127.0.0.1:8190`.
- 32 top-level custom-node directories.
- 2,542 registered nodes in the lightweight signature.
- Local Chrome with two tabs sharing one browser profile.

Confirmed results:

- The first Nodes2 open made one `/object_info` request.
- `/object_info` took about 1.76 seconds; the IndexedDB write took about 109 ms.
- A page refresh loaded 2,542 cached nodes in about 129 ms and made no Workspace2 `/object_info` request.
- After clearing the cache, two tabs opened Nodes2 concurrently and made one combined `/object_info` request.
- Both tabs settled on 2,542 nodes.
- While one tab built `/object_info`, lightweight requests in the other tab were delayed to about 1.3 seconds. This supports avoiding redundant full requests.

## 2026-07-16 - Main-package persistent node-cache baseline

Environment:

- Main ComfyUI package at `http://127.0.0.1:8188`.
- 198 custom-node plugins and 6,135 registered nodes.

Confirmed results:

- The disk snapshot from 2026-07-14 contained 6,126 nodes and a different signature. The cache endpoint correctly returned `cache_hit: false`, rather than serving obsolete definitions.
- Opening Nodes2 caused one official `/object_info` rebuild and compressed upload to the WorkspaceKit service.
- The resulting snapshot reported the live signature and exactly 6,135 nodes. A subsequent endpoint read returned `cache_hit: true`.
- The frontend path is confirmed by source review: a valid IndexedDB entry skips the server request; a valid server snapshot warms IndexedDB; only when neither is current does it request official `/object_info`.
- Follow-up measurement found that this valid snapshot response was 48.7 MB without `Content-Encoding`. The cache endpoint now enables negotiated compression only when returning a cache hit; restart measurement is required to record the compressed transfer size.
- After restart, the installation exposed 200 plugins / 6,323 nodes, so the previous snapshot was correctly invalidated again. Nodes2 made one official `/object_info` request (15.29 s), wrote IndexedDB (0.74 s), then uploaded a new 6,323-node snapshot with the matching signature. The cache-hit response returned `Content-Encoding: gzip`, with 11,889,361 bytes transferred instead of about 50.35 MB uncompressed. No browser `Server node cache write failed` message was recorded.

Remaining release validation:

- Measure one ComfyUI restart, a clean/incognito browser profile, and two simultaneous tabs against this populated snapshot.

## 2026-07-16 - Workflows recent-history extraction (first workflow split)

- Backup created before extraction: `.codex-backups/30-entry-splits/workspacekit-before-workflow-recents-extraction-20260716.zip`.
- Extracted `entry/workflows/recents.js`: persisted Open-history normalization, length limit, record/update/remove/remove-tree operations.
- The module receives path and display-name helpers from `entry.js`; it owns no workflow rendering, file I/O, official Store access, or directory scan.
- Its source comment records the regression boundary: successful local operations update history immediately and must not trigger an extra full workflow scan or official synchronization.
- Independent module behavior, JavaScript syntax checks, `git diff --check`, and the node-cache service smoke test passed.

## 2026-07-16 - Workflows open-state extraction (second workflow split)

- Backup created before extraction: `.codex-backups/30-entry-splits/workspacekit-before-workflow-open-state-extraction-20260716.zip`.
- Extracted `entry/workflows/open-state.js`: local dirty-snapshot lifecycle and the official ComfyUI workflow-Store subscription / active-selection bridge.
- Workflow open, save, close, rename, filesystem operations, and rendering remain in `entry.js`; this extraction changes ownership only, not their call order.
- Isolated behavior checks passed for the graph-load dirty guard, dirty-state detection, official active-workflow selection, and the rename-time render deferral.
- Browser regression remains pending a safe page refresh because the available main-package tabs have unsaved (`*`) workflows; the page was intentionally not reloaded.

## Recorded unresolved errors

### Workflows2 polling interrupted inline rename

Observed while testing local incremental folder creation:

- The folder was created and rendered in about 102 ms without a full `/workspace2/workflows` scan.
- Before the inline name was submitted, the four-second external-change poll replaced the tree.
- Removing the input triggered its blur handler and ended the edit with the original name.

Fix:

- External polling now pauses while a workflow row is being edited, pointer-dragged, or custom-order dragged.
- Polling resumes automatically after the interaction state clears.

Verification result:

- The inline rename input remained present after waiting 5.2 seconds, longer than one polling interval.
- Submitting the rename completed in about 74 ms without an immediate `/workspace2/workflows` scan.

## 2026-07-09 - Workflows2 local incremental updates

Test item:

```text
__workspace2_incremental_test_20260709
```

Interaction results:

- Create folder: about 102 ms; only `/workspace2/folder/create`.
- Rename folder: about 74 ms; only `/workspace2/rename`.
- Move into `_workspace2_test_archive`: about 322 ms; only `/workspace2/move`.
- Move to Workspace2 trash: about 97 ms; only `/workspace2/trash/move`.
- No immediate `/workspace2/workflows` full scan occurred in any of the four operations.
- The final trash list contained the test folder at its moved original path.
- No Workspace2 console error was observed during the interaction sequence.

Cleanup state:

- The test folder remains recoverable in Workspace2 trash.
- It was not sent to the operating-system trash and was not permanently deleted.

## 2026-07-09 - Incremental restore and workflow creation

Restore result:

- Restoring `__workspace2_incremental_test_20260709` completed in about 67 ms.
- The restored path appeared under `_workspace2_test_archive` without an immediate full workflow scan.
- The backend now returns a targeted scan of only the restored subtree so folders with child workflows can be populated immediately.
- After restarting ComfyUI, restoring a folder containing child workflows was confirmed working by the user.

Workflow creation result:

- Creating `New Workflow.json` completed in about 320 ms.
- The required official workflow synchronization took about 112 ms.
- No `/workspace2/workflows` full scan occurred in the creation path.
- ComfyUI opened the workflow and changed the title to `New Workflow - ComfyUI`.
- The default graph reported a missing checkpoint in this environment; this is expected workflow data and not a creation failure.

Cleanup state:

- The created workflow and restored test folder were moved back to Workspace2 trash.
- Neither item was permanently deleted.
- No Workspace2 console error was observed.

## 2026-07-09 - Trash completion and failure-state audit

Confirmed behavior:

- Emptying Workspace2 trash does not modify the workflow directory and therefore does not require a workflow scan or official workflow synchronization.
- The backend returns separate `removed` and `errors` lists.
- The frontend removes only successful IDs from its local trash list; failed items remain visible and recoverable.
- Moving one trash item to the system trash also updates the local list without reloading the complete manifest.

Failure-state audit:

- Folder/workflow creation changes local state only after the save/create request succeeds.
- Rename and move change local paths only after the backend or official Store operation succeeds.
- Move-to-trash removes local items only after the backend move succeeds.
- Restore adds local items only after the backend restore succeeds.
- If workflow creation succeeds on disk but later official synchronization/opening fails, retaining the new local item reflects the real filesystem state and avoids hiding the created file.

Conflict verification:

- Created `__workspace2_failure_test` and attempted to rename it to the existing root folder `API`.
- The conflict was rejected before a `/workspace2/rename` request was sent.
- The original test path remained in the list and the panel showed `Target already exists`.
- The test item was moved to Workspace2 trash after verification and was not permanently deleted.

Safety note:

- The user later authorized moving all test-package Workspace2 trash items to the Windows system trash.
- Moving one item completed in about 192 ms and reduced the list from 11 to 10 without a workflow scan.
- Emptying the remaining items completed in about 655 ms and reduced the list from 10 to 0 without a workflow scan.
- The panel reported success, the trash list was empty, and no Workspace2 console error was observed.

## 2026-07-09 - Glass background controls

Verified states:

- Default: opacity 100%, glass disabled, blur control disabled, effective blur `0px`.
- Enable glass: opacity automatically changed to 78%, blur control enabled, effective blur `8px`.
- Move blur to 16: the CSS variable and computed `backdrop-filter` both changed to `16px`.
- Move opacity to 100 while glass is enabled: the control and stored value were capped at 95% so the backdrop remains visible.
- Disable glass: the blur control became disabled and effective blur returned to `0px`.
- No Workspace2 console error was observed.

Recorded follow-up:

- The settings dialog still displays `0.2.0-beta`, while package/runtime metadata is `0.2.1b0`. This remains for the build-identity batch.

## 2026-07-09 - Exclusive transparent / frosted-glass modes

The previous independent opacity, glass checkbox, and blur controls were replaced with two mutually exclusive rows:

- `Transparent background`: radio + opacity slider.
- `Frosted glass`: radio + blur slider.

Verified behavior:

- A legacy enabled `workspace2.panelGlass` setting migrated to the new `glass` mode.
- Exactly one radio was selected and the inactive mode slider was disabled.
- Transparent mode used the saved opacity and computed `blur(0px) saturate(1)`.
- Frosted-glass mode used a fixed 72% translucent surface.
- With the glass slider at 20, computed style was `blur(20px) saturate(1.12)`.
- Eleven detected sidebar ancestor layers had transparent computed backgrounds.
- The glass layer included a subtle CSS highlight gradient and inset edge.
- No Workspace2 console error was observed.

Visual acceptance:

- Computed styles and control state passed automated validation.
- Final perceived blur and preferred glass density remain for user review in the visible test-package UI.

## 2026-07-09 - Frosted material transparency control

The Frosted Glass slider now controls material transparency instead of blur radius.

Verified mapping:

- Slider range: 5–95.
- Transparency 5: surface alpha 95%.
- Transparency 50: surface alpha 50%.
- Transparency 95: surface alpha 5%.
- Gaussian blur remained fixed at 14px in all three states.
- Saturation remained fixed at 1.12.
- Frost grain and highlight strength changed with the material surface alpha.
- Transparency 95 persisted after a full page reload.
- No Workspace2 console error was observed.

Material layers:

- Fixed `backdrop-filter: blur(14px) saturate(1.12)`.
- Translucent theme surface controlled by inverse slider transparency.
- Fine CSS radial grain.
- Soft diagonal highlight and inset edge.

## 2026-07-23 - Frosted glass blur control

The Frosted glass slider now controls the actual `backdrop-filter` blur rather
than material transparency. Its value is saved in `workspace2.panelBlur` and
maps `0–100` to `0–32px`; `100` is the strongest supported frosted effect.
The existing material-transparency value is retained only to preserve the
appearance of earlier installations and is no longer changed by this slider.

Visual acceptance:

- Automated checks confirm value mapping, persistence, texture layers, and computed blur.
- Final material appearance remains for user review because the docked ComfyUI sidebar has limited detailed content physically behind it.

### Previous-workflow restore reads `extra` from an undefined value

Observed during ComfyUI startup and page refresh:

```text
TypeError: Cannot read properties of undefined (reading 'extra')
```

Observed wrapper chain:

```text
ComfyUI-Manager/components-manager.js
rgthree-comfy/rgthree.js
cg-use-everywhere/use_everywhere.js
comfyui-workspace2/workspace2_canvas_groups.js
ComfyUI loadDefaultWorkflow / initializeWorkflow
```

Confirmed root cause:

- ComfyUI calls `app.loadGraphData()` with zero arguments while initializing the default or previous workflow.
- ComfyUI-Manager explicitly bypasses its `graphData.extra` access when `arguments.length == 0`.
- The Workspace2 Canvas Groups wrapper previously forwarded `[data, ...args]`, converting the zero-argument call into one `undefined` argument.
- ComfyUI-Manager then bypassed its zero-argument guard and accessed `graphData.extra`.

Fix:

- Workspace2 now forwards the original `arguments` object unchanged.
- No external extension code is modified.

Verification result:

- Passed with Manager, rgthree, cg-use-everywhere, and Workspace2 enabled.
- A fresh Chrome context restored the previous workflow with zero `extra` errors.
- Workspace2 registered normally and the restored canvas displayed its saved group visuals.
- The workflow reported two missing models; this is workflow environment data and is unrelated to the `loadGraphData` forwarding fix.

## Recent passed verification

- **Templates performance:** user acceptance passed after idle prefetch, shared in-page loading, and deferral of stale node-definition refresh.
- **Alt+C save-template flow:** user acceptance passed; saving selected nodes opens Templates and focuses the new template name regardless of prior sidebar state.

## 2026-07-15 - Sidebar shortcut and canvas-menu regression

Confirmed shortcut behavior:

- In frosted-glass mode, the visible Workspace2 shell is moved to `document.body` so `backdrop-filter` can sample the canvas.
- The old open-state check only searched below the sidebar host. It consequently treated an already open glass panel as closed, and the next Shift+1/2/3 or Alt+C action clicked the Workspace2 tab again and closed it.
- The open-state check now recognizes both the normal sidebar shell and the connected, visible glass portal. Syntax checks passed and user acceptance confirmed the shortcut regression is resolved.

Confirmed canvas-menu behavior in an isolated local ComfyUI page:

- On an empty canvas, `🧩 编组` and `🧩 保存为模板` are the first two menu items, with no legacy yellow duplicate entry.
- With no selected nodes, each entry opens Workspace2's themed notice dialog rather than the browser native alert.
- Right-clicking an unselected node then choosing `🧩 编组` creates a one-node group successfully.
- The unused legacy LiteGraph global-menu patch was removed from `workspace2_canvas_groups.js`; supported ComfyUI extension hooks in `entry.js` remain the only menu integration path.

## 2026-07-15 - Templates data-layer extraction (first stage)

- Backup created before extraction: `.codex-backups/00-legacy-workspace2/workspace2-before-template-data-extraction-20260715-132706.zip`.
- Extracted `entry/templates/library.js`: library normalization, shared initial-load request, idle prefetch, persistence, and group/tree query helpers.
- The module receives network, performance, translation, state, and render dependencies from `entry.js`; it has no direct sidebar or shortcut ownership.
- The source comment records the two relevant regressions: shared requests protect Templates first-open performance, and the caller—not the data layer—must open/focus the panel after Alt+C saves a template.
- Static syntax/diff checks passed. In an isolated local ComfyUI page, the Templates tab opened normally, read the existing seven templates, and showed no Workspace2 panel error.

## 2026-07-15 - Workflow delete in frosted-glass mode

Reported symptom: after moving a workflow file to Workspace2 trash, the Workflows panel could show only its three top tabs with the content area blank.

Confirmed causes and fix:

- During an official workflow deletion, ComfyUI can temporarily expose an empty element in `openWorkflows`. The Open-section renderer now filters invalid entries before reading `workflow.path`; this prevents an exception after the module body has been cleared.
- In frosted-glass mode the visible shell is a body-level portal. After a delete, Workspace2 rebuilds the Workflows shell from its stable sidebar host instead of reusing a potentially stale module body. Transparent mode retains the existing lightweight redraw.

Regression verification:

- In an isolated local ComfyUI page with frosted glass enabled, created a dedicated test workflow and moved it to Workspace2 trash.
- The frosted-glass shell, Workflows panel, Open section, and Browse section all remained visible.
- No browser error was recorded. The test workflow was not permanently deleted.

## 2026-07-12 - Official workflow-state adapter

Confirmed in the test package with `comfyui_frontend_package 1.45.20`:

- The official workflow store exposes `activeWorkflow`, `openWorkflows`, `modifiedWorkflows`, `openWorkflow()`, `getWorkflowByPath()`, and a store subscription API.
- Individual workflow objects expose `isModified`, `save()`, and a change tracker; official `save()` resets modification state and removes the corresponding official draft.
- Workspace2 now isolates these calls in `entry/workflows/official-adapter.js`.
- In this frontend version, the official `openWorkflow()` updates the active workflow but does not by itself replace the LiteGraph canvas in the extension call path. Workspace2 therefore activates the official workflow first, then explicitly loads that workflow's active state into the canvas.
- Official-root opens use that two-step bridge. The Open section reads official open workflows and their individual `isModified` states; save and close use the official workflow object/store.
- A fresh local page loaded the adapter with no Workspace2 console error. The page had only the default temporary workflow, so a two-persisted-workflow dirty-state test remains pending.

## Workflows2 P0 regression checklist

Run this checklist in the test package before accepting a main-package release. Record any failure with the workflow path, ComfyUI frontend version, and browser-console error.

Last verified in the main package on 2026-07-30 (T-009 through T-012): all items pass. No regression found; the underlying behavior had already been fixed in prior work, so this run only confirmed status and updated documentation.

- [x] **Open:** open the same workflow from Browse and Open; each loads the intended graph without a second click.
- [x] **Unsaved state:** after opening, no dot or Save is shown. Change a node value, link, title, or position; the dot and Save appear only on that current Open row.
- [x] **Save:** a successful save clears the dot and Save. A failed or cancelled save leaves both visible.
- [x] **Workflow switch:** opening a second workflow starts clean and does not inherit the first workflow's indicator.
- [x] **Create:** a new workflow appears locally, opens once, and does not cause repeated full scans or duplicate official-list synchronization.
- [x] **Rename and move:** selected path, Open history, and the current-save target follow the renamed/moved workflow.
- [x] **Delete and restore:** list and official workflow synchronization have no stale duplicate after trashing and restoring a workflow or folder.
- [x] **External-change poll:** inline rename and drag ordering survive longer than one background-poll interval.
- [x] **Restart and refresh:** previous-workflow restore has no `graphData.extra` error and the current Open row starts clean.

## 2026-07-18 - Workflow first-save panel refresh

- Backup created before the repair: `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-save-panel-rerender-fix-20260718-153748.zip`.
- Root cause was verified in the test package: after `workflow.save()` completed, the official title became clean and WorkspaceKit's path-keyed dirty set was empty, but the click handler rebuilt a stale panel mount. The stale Save icon disappeared only after a manual tab switch.
- Replaced that direct stale-root render with the existing official-state scheduler, which renders the current connected workflow panel after the deferred list refresh.
- Test package, workflow `小红书`: moved one existing node, observed one Save button, clicked Save once, and verified zero Save buttons after 900 ms and again after 4.3 seconds (longer than the background polling interval).

## 2026-07-18 - Workflows section-shell extraction (first UI split)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-sections-split-20260718-180739.zip`.
- Extracted `entry/workflows/sections.js`: persisted collapse state plus the shared DOM shell for the adjacent Open and Browse sections. It receives header helpers and storage from `entry.js`; it does not import workflow data, official Store state, actions, search, drag handling, or rendering coordination.
- The module comment records the visual-regression boundary: Open and Browse must remain adjacent content sections with spacing, rather than regain a toolbar border between them.
- JavaScript syntax checks, `git diff --check`, and an isolated DOM/storage test passed. In the test package, Open and Browse both rendered, collapsed independently, and retained their collapsed state after a page refresh. No WorkspaceKit console error was recorded.

## 2026-07-18 - Workflows Browse-results refresh extraction (second UI split)

- Backup created before this split: `.codex-backups/30-entry-splits/oversized-legacy/ComfyUI-WorkspaceKit-before-entry-workflows-results-refresh-split-20260718-182830.zip`.
- Extracted `entry/workflows/results-renderer.js`: Browse-tree empty state, local search redraw, scroll-position retention, and the debounced refresh timer. It receives rendering callbacks from `entry.js`; it does not own workflow open/save/rename/move actions, drag handling, or official Store synchronization.
- The module comment records the regression boundary: this rendering layer must not reorder the verified official dirty-state or rename flow.
- `node --check` for the entry and new module, `git diff --check`, and the isolated DOM contract passed. In the test package, a targeted `ZiT_XY` search produced matching Browse rows, an unmatched query showed the empty state, and the plugin's Clear Search control restored 32 Browse rows. No WorkspaceKit console error was recorded.

## 2026-07-18 - Workflows Browse context-menu extraction (third UI split)

- Backup created before this split: `.codex-backups/30-entry-splits/oversized-legacy/ComfyUI-WorkspaceKit-before-entry-workflows-context-menu-split-20260718-184539.zip`.
- Extracted `entry/workflows/context-menu-renderer.js`: Browse context-menu DOM, file/folder menu composition, and the close-before-action / error-to-handler boundary. All action callbacks remain in `entry.js`, including rename and trash paths with their existing regression guards.
- `node --check` for the entry and new module, `git diff --check`, and an isolated menu contract passed. In the test package, a file row produced exactly one menu with Open, Rename, Move to Root, and Move to Trash; a folder row produced exactly one menu with New Subfolder, Personalize, Reset Style, Rename, Move to Root, and Move to Trash. No action was invoked and no WorkspaceKit console error was recorded.

## 2026-07-18 - Workflows trash-list extraction (fourth UI split)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-trash-renderer-20260718-205907.zip`.
- Extracted `entry/workflows/trash-renderer.js`: trash-list DOM, empty state, file/folder icon selection, and action-control presentation. Restore, system-recycle-bin transfer, confirmation, refresh, and error handling remain injected from `entry.js`.
- `node --check` for the entry and new module, `git diff --check`, and an isolated empty-state/action-delegation contract passed. In the test package, the trash page rendered exactly one list with 26 rows; each inspected row retained Restore and Move to System Recycle Bin controls. No recovery, system-recycle-bin, or empty-trash action was invoked, and no WorkspaceKit console error was recorded.

## 2026-07-18 - Workflows item-store extraction (operations-service first layer)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-item-store-20260718-211155.zip`.
- Extracted `entry/workflows/item-store.js`: the in-memory Browse collection's server snapshot commit, local mutation commit, add, path remap, and subtree removal. It advances the list revision before a later background poll can render, preserving the existing protection against a stale poll overwriting a completed local operation.
- Network requests, official Store operations, dirty state, path-dependent UI state, and rendering remain in `entry.js` for this first operations-service layer.
- `node --check` for the entry and new module, `git diff --check`, and the isolated create/remap/remove/revision contract passed. In the test package, Browse rendered 32 initial rows; searching `ZiT_XY` produced its folder plus three matching workflow paths, with no WorkspaceKit console error. No workflow file was changed.

## 2026-07-18 - Workflows path-state extraction (operations-service second layer)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-path-state-20260718-211815.zip`.
- Extracted `entry/workflows/path-state.js`: path-dependent Browse UI state for selection, inline editing, expanded folders, custom ordering, and path remap/removal. Official dirty-state handling and recents persistence remain callbacks from `entry.js`, preserving their verified rename/delete ordering.
- `node --check` for the entry and new module, `git diff --check`, and the isolated remap/remove callback contract passed. In the test package, expanding `API` increased Browse rows from 32 to 39; collapsing it restored 32 rows. No WorkspaceKit console error was recorded and no workflow file was changed.

## 2026-07-18 - Workflows tree-builder extraction

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-tree-builder-20260718-212922.zip`.
- Extracted `entry/workflows/tree-builder.js`: Browse hierarchy construction, recursive ordering, custom drag-order lookup, and folder-first ordering. It is data-only: no filesystem, DOM, expansion-state, or official Store access.
- The isolated contract verified folder hierarchy, nested ordering, custom order, and the original precedence rule: when folder-first is enabled, folders remain ahead of files even if a custom order includes a file first.
- In the test package, the first 12 root Browse rows were folders and the 13th was the first file; no folder appeared after the first file among the inspected root rows. No WorkspaceKit console error was recorded and no workflow file was changed.

## 2026-07-18 - Workflows Browse-search extraction

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-search-20260718-213313.zip`.
- Extracted `entry/workflows/search.js`: read-only search fields, self-match scoring, recursive descendant matching, and visible-child filtering. It receives state and existing text-scoring helpers from `entry.js`; it does not access filesystem APIs, official workflow state, DOM, or expansion mutation.
- The source comment records the regression boundary: a query refresh must remain safe while workflow rename, save, and background synchronization are active.
- `node --check` for the entry and new module, `git diff --check`, and an isolated recursive-search contract passed. In the test package, `ZiT_XY` retained its `Zimage` parent and returned three matching files; an unmatched query showed the empty state; Clear Search restored 32 Browse rows. No WorkspaceKit console error was recorded and no workflow file was changed.

## 2026-07-18 - Rolled-back Browse row-renderer extraction

- The attempted `row-renderer.js` extraction was rolled back in full from `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-row-renderer-20260718-214920.zip` after a page refresh removed the WorkspaceKit sidebar entry.
- Confirmed cause: the top-level renderer construction passed an undefined `onOpenWorkflowLocation` identifier instead of the existing `openWorkflowLocation` function. The resulting `ReferenceError` aborts `entry.js` before sidebar registration.
- Rollback verification: `entry/entry.js` and all documentation files match the pre-batch archive; `node --check` and `git diff --check` pass; the test package loaded the WorkspaceKit sidebar button and opened its Workflows panel.
- Prevention: a future renderer split must add an entry-execution check for injected callback bindings in addition to syntax and isolated module contracts. Do not claim a renderer extraction accepted until the test-package sidebar entry has rendered.

## 2026-07-18 - Browse row-renderer safe retry

- Backup created before the retry: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-row-renderer-safe-retry-20260718-230359.zip`.
- Re-extracted `entry/workflows/row-renderer.js` as a direct, on-demand render function. `entry.js` retains `renderNode` as the only adapter and constructs its injected callbacks only while Browse renders; no row-renderer factory runs during sidebar registration.
- `node --check`, `git diff --check`, explicit callback-binding guard, ownership guard, and an isolated Fake-DOM interaction contract passed. The contract covers recursive children, folder disclosure, drag handles, and injected location/rename/trash callbacks.
- The test server served both `/extensions/comfyui-workspace2/entry.js` and `/extensions/comfyui-workspace2/workflows/row-renderer.js` with HTTP 200.
- Test-package UI acceptance passed in a reloaded existing Chrome test tab: exactly one WorkspaceKit sidebar entry rendered, its Workflows panel opened, Browse reported 183 items, and expanding the `API` folder changed visible descendants from 0 to 7 before collapsing back to 0. No workflow file was changed and the browser console recorded no WorkspaceKit error.

## 2026-07-18 - Workflow sort-menu extraction (final keyboard UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-workflows-sort-menu-20260718-235120.zip`.
- Extracted `entry/workflows/sort-menu-renderer.js`: on-demand sort-menu DOM, menu options, and outside-click / Escape listener lifecycle. It does not call file APIs, official workflow Store APIs, or network helpers; persistence, refresh, rerender, translation, and error handling are injected from `entry.js`.
- `node --check` for the entry and new module, `git diff --check`, ownership guard, and a fake-DOM interaction contract passed. The contract exercised sort selection, folder-first, custom-order, refresh, and Escape closing.
- In a normally initialized existing Chrome test tab, the Workflows sort button opened exactly one menu with all seven expected actions. Selecting `Name Z-A` closed the menu; reopening and selecting `Name A-Z` restored the prior sort setting. No WorkspaceKit console error was recorded.
- The same real-page check found a keyboard defect in the extracted lifecycle: when focus remained on a menu button, the prior inside-menu guard prevented `Escape` from closing. `sort-menu-renderer.js` now handles `Escape` before that pointer-event guard; the source-order contract and static checks passed after the fix.
- The post-fix focused-Escape contract now passes: with the event target set to a button inside the rendered menu, `Escape` closes and removes the menu; inside pointer input leaves it open and an outside pointer input closes it. This directly covers the prior guard-order failure.
- A temporary test-package instance on port `8819` served the patched `entry.js` and `workflows/sort-menu-renderer.js` with HTTP 200. Chrome navigation to that local page was blocked by the local client (`net::ERR_BLOCKED_BY_CLIENT`) before page code ran, so this is not a browser acceptance result. The earlier existing-tab reload was also blocked by ComfyUI client initialization errors (`ComfyApp graph accessed before initialization` and `vite:preloadError`). Neither is attributed to WorkspaceKit. Do not mark this extraction complete until one normal test-package page load verifies Escape closing.

## 2026-07-19 - Nodes panel-state extraction (browser UI acceptance pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-nodes-panel-state-20260719-20260719-115442.zip`.
- Extracted `entry/nodes/panel-state.js`: pure local preference ownership for Nodes visible sections and custom ordering. The factory has no import-time listener, network request, DOM operation, node-cache access, or official ComfyUI Store access.
- `node --check` for the entry and module, `git diff --check`, and an isolated storage contract passed. The contract covered defaults, valid preferences, corrupt JSON, the all-hidden fallback, object-only custom-order reads, and both persistence writes.
- The temporary test-package server on port `8819` served the new module and updated entry with HTTP 200. Chrome local-page navigation remains blocked by `ERR_BLOCKED_BY_CLIENT`, so Nodes UI acceptance is pending one normal test-package browser load.

## 2026-07-19 - Nodes library-normalizer extraction (browser UI acceptance pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-nodes-library-normalizer-20260719-20260719-121654.zip`.
- Extracted `entry/nodes/library-normalizer.js`: empty-library defaults, group and favorite data repair, settings/migration merging, and server object-info cache response conversion. Network requests, IndexedDB, slow-refresh scheduling, cross-tab coordination, and UI rendering remain in `entry.js`.
- `node --check` for entry and module, `git diff --check`, and an isolated data contract passed. The contract covered default restoration, invalid-library fallback, restored default group, orphan/self-parent repair, invalid favorite filtering and group fallback, deterministic missing timestamps, settings merge, and valid/invalid server-cache payloads.
- The temporary test-package server on port `8819` served both the new module and updated entry with HTTP 200. Chrome local-page navigation remains blocked by `ERR_BLOCKED_BY_CLIENT`, so Nodes UI acceptance remains pending one normal test-package browser load.

## 2026-07-19 - Nodes library-loader extraction (test-package service check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-nodes-library-loader-20260719-20260719-124803.zip`.
- Extracted `entry/nodes/library-loader.js`: the initial parallel read of library data, frequency map, browser cache, and signature; cache selection; optional server-cache warm-up; and the established stale-cache refresh decision. The actual `/object_info` request, IndexedDB implementation, cross-tab lock, delayed scheduler, and UI renderer remain injected from `entry.js`.
- `node --check` for entry and module, `git diff --check`, and an isolated lifecycle contract passed. It covers single-flight loading, current browser-cache use without server lookup, stale browser-cache scheduling, no-cache coordinated refresh, and error fallback.
- The temporary 8819 test-package process was no longer running before the resource-service check. Therefore no HTTP or browser UI acceptance is claimed for this batch; rerun those checks after the test package is available.

## 2026-07-19 - Nodes object-info-state extraction (test-package service check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-entry-nodes-object-info-state-20260719-20260719-142331.zip`.
- Extracted `entry/nodes/object-info-state.js`: definition-cache invalidation, cache-snapshot application, and fresh object-info application. Network fetching, IndexedDB, scheduling, cross-tab coordination, and rendering remain in `entry.js`.
- `node --check` for entry and module, `git diff --check`, and an isolated state contract passed. The contract covers rejecting absent cached data, cache timestamp/origin assignment, definition-cache invalidation, and fresh-data fallback/timestamp assignment.
- The test package was not running, so no HTTP resource or browser UI acceptance is claimed for this batch. Rerun those checks after the test package is available.

## Current unresolved work

- **Workflow unsaved-state indicator:** test-package acceptance now covers first-save clearing and dirty-tab switching. Main-package acceptance remains the release gate: verify both dirty markers survive `A → B → A`, with the Save icon only on the active dirty workflow.
- **Workflow synchronization regression coverage:** the P0 checklist above is ready; it still needs a complete test-package run, then a main-package release run.
- **Node-cache independent-profile check:** large-install capacity, stale-signature rejection, one controlled fill, cache-hit reuse, page refresh, and ComfyUI-restart persistence have passed in the 202-plugin / 6,345-node main package. The remaining optional coverage is one independent browser profile/private-window read of the server snapshot; it is not a reason to change the verified cache implementation.
- **Main-package visual regression:** Open/Browse spacing, shared section headers, transparent mode, and frosted-glass mode passed recent test-package acceptance. Recheck these together in the main package rather than reopening separate CSS work without a reproduced defect.
- **Engineering and release readiness:** continue `entry.js` extraction after node-cache acceptance (remaining Workflows UI, Nodes UI/state, then Settings), add minimal CI, implement full WorkspaceKit data export/import with backup, and add screenshots plus Registry/Manager metadata. Issue/PR templates, contribution guidance, security policy, backend-owned version display, the first Templates/official-workflow module extractions, and the Workflows section shell are complete.

## 2026-07-19 - Templates group-contents renderer extraction (nested-fixture UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-group-contents-renderer-20260719-210757.zip`.
- Extracted `entry/templates/group-contents-renderer.js`: after a group header has been created in `entry.js`, it renders only the expanded group’s child groups and template list. Header creation, inline rename, context menu, drag-source wiring, expand-state mutation, data projection, persistence, and Alt+C remain in the entry.
- The reproducible `scripts/test-template-group-contents-renderer.mjs` contract passed. It covers collapsed no-op behavior, recursive child-group callback/depth/query forwarding, list indentation, group drop-target hookup, and template-row placement.
- `node --check` passed for the entry and module; all existing Nodes and Templates contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- Fresh-page browser regression on the test package at `8180`: WorkspaceKit appeared once and opened; Templates rendered its three existing templates with no WorkspaceKit warning/error. The current library has no nested template group fixture, so a real nested expand/edit/drag interaction remains explicitly pending rather than claimed.

## 2026-07-19 - Templates minimap extraction (test-package hover-preview check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-minimap-20260719-213319.zip`.
- Extracted `entry/templates/minimap.js`: saved-template node projection, bounds, fill-color fallback, rounded-node/link drawing, DPR-aware canvas setup, and empty-template hint. Template details, live node-definition lookup, popover lifecycle, template mutations, Alt+C, drag/drop, and persistence remain in `entry.js`.
- The reproducible `scripts/test-template-minimap.mjs` contract passed. It covers relative-position projection, bounds, explicit/mode/type color selection, DPR clamping, empty-template hint, and linked-node canvas drawing.
- Test-package partial UI check at `8180`: WorkspaceKit opened and the Templates panel rendered its existing `Workspace2Title` item with no WorkspaceKit console warning/error. The in-app browser sandbox cannot construct the `pointerenter` event used by this preview, while local Chrome navigation is currently blocked by `ERR_BLOCKED_BY_CLIENT`; therefore real hover-preview acceptance remains pending and is not claimed as passed.

## 2026-07-19 - Settings dialog-shell extraction (test-package dialog acceptance passed)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-settings-dialog-shell-20260719-212837.zip`.
- Extracted `entry/settings/dialog-shell.js`: backdrop, dialog/header DOM, and close-intent callback only. `entry.js` still attaches/removes the dialog, requests version data, owns Escape and global listener cleanup, and owns all setting behavior.
- The reproducible `scripts/test-settings-dialog-shell.mjs` contract passed. It covers translated title/close button, event propagation isolation, and the distinction between backdrop and dialog pointer events.
- Fresh-page browser acceptance on the test package at `8180`: after ComfyUI initialization completed, WorkspaceKit appeared once and opened; Settings rendered its background section and the title-bar close button removed the dialog. WorkspaceKit console warnings/errors were empty. The backdrop-versus-dialog pointer behavior is covered by the shell contract; no setting or cache was changed during the test.

## 2026-07-19 - Settings dialog-sections extraction (test-package dialog acceptance passed)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-settings-dialog-sections-20260719-211955.zip`.
- Extracted `entry/settings/dialog-sections.js`: the existing five content sections—shortcuts, behavior, background mode, node cache, and about/version placeholders. All values and mutations are injected by `entry.js`.
- The reproducible `scripts/test-settings-dialog-sections.mjs` contract passed. It covers the section set, enabled states, Ctrl+G/Alt+C/recent-limit delegation, background-mode row synchronization, cache metadata and clear feedback, and the version placeholder.
- Entry composition, glass-overlay behavior, setting persistence, cache implementation, version request, and dialog close/Escape lifecycle remain in `entry.js`.
- Fresh-page browser acceptance on the test package at `8180`: WorkspaceKit appeared once and opened; Settings rendered all five sections, the transparent-opacity slider at `100`, and the disabled glass-transparency slider at `70`. The close button removed the dialog and WorkspaceKit console warnings/errors were empty. No setting or cache was changed during the test.

## 2026-07-19 - Settings controls extraction (test-package dialog acceptance passed)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-settings-controls-20260719-211401.zip`.
- Extracted `entry/settings/controls.js`: settings-section/help/checkbox DOM, shortcut-grid DOM, generic range controls, two-mode background controls, and their visual disabled-state update. The entry retains localStorage, setting values, background and glass-overlay behavior, dialog lifecycle, version request, and Escape handling.
- The reproducible `scripts/test-settings-controls.mjs` contract passed. It covers section/help content, localized shortcut entries, range snapping/change callback/disabled appearance, mode selection, mode enabled-state update, and keyboard isolation wiring.
- `node --check` passed for the entry and all extracted modules; all Nodes/Templates contracts, the Settings-controls contract, Python compilation for `__init__.py`, and `git diff --check` passed.
- Fresh-page browser acceptance on the test package at `8180`: WorkspaceKit appeared once and opened; its Settings dialog rendered both background-mode radio controls, the transparent-opacity slider at `100`, and the disabled glass-transparency slider at `70`. The close button removed the dialog and WorkspaceKit console warnings/errors were empty. The test did not change either background mode or persisted setting.

## 2026-07-19 - Sidebar registration TDZ regression recovery (test-package browser acceptance passed)

- Backup created before the repair: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-sidebar-entry-tdz-fix-20260719-210321.zip`.
- Root cause confirmed from exact source order: `createTemplateResultsProjection()` was constructed before the later `const childTemplateGroups` binding from `createTemplateLibraryStore()`. Passing that binding directly evaluated it inside the temporal dead zone, stopped `entry.js` evaluation, and therefore prevented `app.registerExtension()` from registering the WorkspaceKit sidebar tab.
- Repaired the dependency injection to use `getChildGroups: (parentId) => childTemplateGroups(parentId)`. The callback is evaluated only after the template library factory has initialized; data behavior is unchanged.
- All Nodes/Templates contracts, JavaScript syntax checks, Python compilation for `__init__.py`, and `git diff --check` passed.
- Real browser acceptance on the test package at `8180`: a fresh page displayed the `WorkspaceKit` sidebar button; opening it rendered the Workflows panel; its Templates tab rendered three templates; searching `Workspace2Title` reduced the visible result to that one template. Captured WorkspaceKit console warnings/errors were empty.

## 2026-07-19 - Templates body-state renderer extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-body-state-renderer-20260719-203002.zip`.
- Extracted `entry/templates/body-state-renderer.js`: loading/error notice DOM plus an explicit handled/not-handled return value. `entry.js` retains the first-load request trigger, state writes, follow-up rerender, result projection, all other Templates UI, and Alt+C lifecycle routing.
- The reproducible `scripts/test-template-body-state-renderer.mjs` contract passed. It covers loading precedence, error interpolation, and the ready state that leaves the body untouched.
- `node --check` passed for the entry and module; all existing Nodes and Templates contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, and `templates/body-state-renderer.js` with HTTP 200; the served entry imports the module. Fresh-page Templates loading/error interaction remains a separate UI acceptance case.

## 2026-07-19 - Templates root-renderer extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-root-renderer-20260719-202036.zip`.
- Extracted `entry/templates/root-renderer.js`: root-level empty state, root list container, root template-row placement, root folder placement, and root drop-target hookup. `entry.js` retains loading/error states, result projection, actual row/folder DOM and interactions, template mutations/persistence, Alt+C, preview, drag/drop behavior, and panel lifecycle.
- The reproducible `scripts/test-template-root-renderer.mjs` contract passed. It covers root list and row placement, root folder callback/depth/query forwarding, root drop target, and distinct empty-library/no-match messaging.
- `node --check` passed for the entry and module; all existing Nodes and Templates contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, and `templates/root-renderer.js` with HTTP 200; the served entry imports the module. Fresh-page Templates root interaction remains a separate UI acceptance case.

## 2026-07-19 - Templates results-projection extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-results-projection-20260719-200751.zip`.
- Extracted `entry/templates/results-projection.js`: root and nested template/group result projection, including the shared recursive rule that keeps a parent group visible when a descendant template or group matches a query. `entry.js` retains group hierarchy retrieval, all DOM rendering, expand/edit state, Alt+C, persistence, preview, drag/drop, context menus, and lifecycle work.
- The reproducible `scripts/test-template-results-projection.mjs` contract passed. It covers root templates/groups, direct and descendant template matches, group-name matches, nested group results, sorting delegation, and no-match behavior.
- `node --check` passed for the entry and module; all existing Nodes and Templates contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, and `templates/results-projection.js` with HTTP 200; the served entry imports the module. Fresh-page Templates results interaction remains a separate UI acceptance case.

## 2026-07-19 - Templates search extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-template-search-20260719-195713.zip`.
- Extracted `entry/templates/search.js`: template search-field construction, matching, visible-result sorting, and manual/name/update sort comparisons. The entry retains all template mutation and persistence paths, Alt+C activation/focus timing, preview, drag/drop, context menus, inline rename, and Templates panel DOM/lifecycle.
- The reproducible `scripts/test-template-search.mjs` contract passed. It covers node-type camel-case search, no-match behavior, manual ordering, name ascending/descending, and update-time ascending/descending ordering.
- `node --check` passed for the entry and module; all existing Nodes contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, and `templates/search.js` with HTTP 200; the served entry imports the module. Fresh-page Templates search interaction remains a separate UI acceptance case.

## 2026-07-19 - Nodes category-projection extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-category-projection-20260719-195144.zip`.
- Extracted `entry/nodes/category-projection.js`: read-only Nodes query matching/sorting orchestration, hidden-node exclusion, result-limit handling, Comfy/Extension/Unknown source buckets, favorite-type lookup, visible totals, and fallback when every section is disabled. `entry.js` retains actual query predicates and source classification, definition retrieval, all rendering, favorites UI, section-state persistence/mutation, and cache/network/sidebar lifecycle work.
- The reproducible `scripts/test-node-category-projection.mjs` contract passed. It covers source buckets, hidden nodes, favorite types, visible totals, search sorting/limit behavior, and default-section recovery.
- `node --check` passed for the entry and module; all existing Nodes contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, and `nodes/category-projection.js` with HTTP 200; the served entry imports the module. Fresh-page category interaction remains a separate UI acceptance case.

## 2026-07-19 - Nodes top-section renderer extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-top-section-renderer-20260719-194314.zip`.
- Extracted `entry/nodes/top-section-renderer.js`: top-level Comfy, Extensions, and Unknown section shell rendering, including the established choice between empty state, flat search results, and category tree. `entry.js` retains search filtering, visible-section policy, favorites collection, top-header collapse mutation, node rows, category-tree behavior, and all cache/network/sidebar lifecycle work.
- The reproducible `scripts/test-node-top-section-renderer.mjs` contract passed. It covers header count, expanded and collapsed behavior, empty output, flat search result rows with favorite state, and the non-search category-tree route.
- `node --check` passed for the entry and module; all existing Nodes contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, and `nodes/top-section-renderer.js` with HTTP 200; the served entry imports the module. Fresh-page section interaction remains a separate UI acceptance case.

## 2026-07-19 - Nodes row-renderer extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-row-renderer-20260719-193647.zip`.
- Extracted `entry/nodes/row-renderer.js`: ordinary official-node row DOM, local pointer/context/click listener wiring, reorder-handle presentation, and favorite-button presentation. `entry.js` retains the canvas-drag implementation, preview/context-menu behavior, selected-node state policy, custom-order mutation, favorite persistence, and all global/sidebar lifecycle work.
- The reproducible `scripts/test-node-row-renderer.mjs` contract passed. It covers selected state, depth and data attributes, custom-order handle versus spacer, preview/menu event delegation, suppress-click clearing, pending-node delegation, and favorite add/remove presentation and callbacks.
- `node --check` passed for the entry and module; all existing Nodes contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, and `nodes/row-renderer.js` with HTTP 200; the served entry imports the renderer. Fresh-page row interaction remains a separate UI acceptance case.

## 2026-07-19 - Nodes official-tree renderer extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-official-tree-renderer-20260719-192158.zip`.
- Extracted `entry/nodes/official-tree-renderer.js`: DOM creation for official category-folder headers and recursive placement of the projected tree. `entry.js` retains node-row rendering/actions, expanded-state mutation and recursive-folder policy, translations, icon decoration, cache/network lifecycle, and every sidebar/global listener.
- The reproducible `scripts/test-node-official-tree-renderer.mjs` contract passed. It covers open and query-forced folder rendering, depth propagation, favorite forwarding, label/count/icon output, and normal plus Ctrl/Meta click delegation.
- `node --check` passed for the entry and module; all existing Nodes contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, `nodes/official-tree.js`, and `nodes/official-tree-renderer.js` with HTTP 200; the served entry imports the renderer. Fresh-page tree interaction remains a separate UI acceptance case.

## 2026-07-19 - Nodes official-tree projection extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-official-tree-20260719-173600.zip`.
- Extracted `entry/nodes/official-tree.js`: category-path insertion, leaf totals, unknown-category precedence, rank/custom/alphabetical ordering, and removal of temporary `childMap` data. `entry.js` still owns category classification and translation, Nodes preference state, all tree rendering, row actions, drag/drop, menus, persistence, cache, and network lifecycle.
- The reproducible `scripts/test-node-official-tree.mjs` contract passed. It covers nested path construction, leaf counts, removal of the build-only map, unknown-folder precedence, category ranks, custom ordering, and original-order mode.
- `node --check` passed for the entry and module; all existing Nodes contract scripts, Python compilation for `__init__.py`, and `git diff --check` also passed.
- The running test package at `8180` served `/system_stats`, the updated entry, and `nodes/official-tree.js` with HTTP 200; the served entry imports the new module. A fresh Nodes-tree interaction remains a separate UI acceptance case.

## 2026-07-19 - Nodes favorite-group-store extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-favorite-group-store-20260719-172219.zip`.
- Extracted `entry/nodes/favorite-group-store.js`: local group lookup, unique naming, hierarchy validation, creation, deletion, and movement. Entry code retains expanded/editor state, save/render timing, drag/drop handlers, style dialogs, inline delete confirmation, and all official-favorites synchronization.
- The reproducible `scripts/test-node-favorite-group-store.mjs` contract passed. It covers unique names, base-36 group identifiers, parent/child validation, rejection of a cyclic parent move, root normalization, reassignment of a deleted group's favorites to the default group, and the established compatibility behavior that child groups retain their old parent id after that parent is deleted.
- Two initial contract assertions were corrected without changing plugin behavior: IDs are intentionally base-36, and independent move/delete scenarios must not share the same child fixture.
- The test package on `8180` served the updated entry and `nodes/favorite-group-store.js` with HTTP 200, and the entry imports the module. Fresh-page group interaction remains pending under the known client-side local-navigation limitation.

## 2026-07-19 - Nodes favorite-store extraction (fresh-page UI check pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-favorite-store-20260719-171159.zip`.
- Extracted `entry/nodes/favorite-store.js`: local favorite lookup, addition, removal, alias mutation, per-group ordering, and cross-group movement. Entry code still owns persistence timing, row rendering, drag listeners, dialog UI, favorite-group operations, and official-favorites import/export.
- The reproducible `scripts/test-node-favorite-store.mjs` contract passed. It covers root insertion, ordering, cross-group moves, moving an existing favorite through the add path, alias normalization/no-op behavior, and deletion. The first test failure found a test-only mistake: the persisted array keeps its physical order while the existing renderer uses each item's `order` field. The implementation was not changed; the assertion now validates the established order-field contract.
- The running test package on `8180` served the updated entry and `nodes/favorite-store.js` with HTTP 200, and the entry imports the new module.
- A new Chrome automation tab cannot currently navigate directly to `127.0.0.1:8180` because the client returns `ERR_BLOCKED_BY_CLIENT`; an already user-opened `8180` tab remains controllable and opened the Nodes panel without WorkspaceKit console errors. Therefore this batch does not yet claim a fresh-page favorite interaction result. Do not modify user favorites merely to force this test; rerun it in a normal user-opened page or after the local-navigation policy is fixed.

## 2026-07-19 - Nodes object-info refresh coordinator extraction (browser UI acceptance pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-object-info-refresh-20260719-154407.zip`.
- Extracted `entry/nodes/object-info-refresh.js`: the 1,500 ms deferred refresh timer, Templates-panel deferral, cross-tab lock and browser-cache recheck, `/object_info` request, IndexedDB write, and optional compressed server-snapshot upload. The entry injects all network, browser, state, render, and lock dependencies; the cache protocol and endpoint paths are unchanged.
- The new reproducible `scripts/test-node-object-info-refresh.mjs` contract passed. It verifies that a current locked cache recheck avoids `/object_info`, a stale cache fetches once and writes once, and an active Templates panel reschedules rather than starting the expensive fetch.
- The running test package on `8180` served both the updated entry and the new refresh module with HTTP 200, and the served entry imports the module. No `/object_info` request was made for this source/resource check.
- **2026-07-19 browser-access recovery:** the current Chrome extension control path opened the `http://127.0.0.1:8180/` test page and the WorkspaceKit Nodes tab without a WorkspaceKit warning/error. This verifies sidebar registration and Nodes panel opening after the extraction. Cache reuse and the deferred-refresh sequence remain separate acceptance cases.

## 2026-07-19 - Nodes IndexedDB object-info cache extraction (browser UI acceptance pending)

- Backup created before this split: `.codex-backups/30-entry-splits/ComfyUI-WorkspaceKit-before-node-object-info-cache-20260719-153749.zip`.
- Extracted `entry/nodes/object-info-cache.js`: opening the browser cache database and the single object-info record's read, write, and delete lifecycle. It receives keys, IndexedDB, a clock, and an explicit clear callback; `/object_info` requests, server-cache upload, refresh scheduling, rendering, and Nodes state transitions remain in `entry.js`.
- The new reproducible `scripts/test-node-object-info-cache.mjs` contract passed: empty read, write metadata/count/signature, read-back, delete, and the one-time clear callback.
- Test package verification used the repository directory link and a visible CMD launch on port `8180`. `/system_stats`, `/workspace2/nodes/index-signature`, `/extensions/comfyui-workspace2/entry.js`, and `/extensions/comfyui-workspace2/nodes/object-info-cache.js` all returned HTTP 200; the served entry imports the served cache module.
- **2026-07-19 browser-access recovery:** the current Chrome extension control path opened the same `8180` test page. WorkspaceKit's sidebar entry rendered and opened normally; the Nodes tab opened with its search control present and no WorkspaceKit warning/error in the captured browser console. The earlier `ERR_BLOCKED_BY_CLIENT` came from a different temporary local-page control path, not from WorkspaceKit or ComfyUI. Cache-clear/reload behavior is still a separate acceptance case.

## 2026-07-16 - Published-state reconciliation and node-cache baseline

- GitHub `main` now includes the localized Group Settings and Transparent Title dialog pass, plus Canvas Group header controls for queue, bypass, and disable. The bypass/disable controls preserve each node's original mode and restore it exactly.
- The node-cache implementation already includes a signature-guarded server snapshot endpoint, compressed chunk upload, atomic disk promotion, IndexedDB reuse, and a cross-tab refresh lock. Earlier roadmap wording that said the server cache had not started was stale.
- Live baseline at `http://127.0.0.1:8188`: `plugin_count: 198`, `registered_node_count: 6135`, `cache_hit: false`. This is the initial state to use for the cache-fill and cache-hit acceptance run; no performance conclusion is claimed yet.

## 2026-07-18 - Post-upgrade node-cache acceptance (test package)

- The upgraded test package reported a live signature of `2aa74318…e48699de`, `plugin_count: 30`, and `registered_node_count: 2,858`. Its old 2,946-node disk snapshot was therefore correctly rejected with `cache_hit: false`.
- Opening Nodes2 performed the first rebuild and replaced the snapshot atomically with a 2,858-node cache matching the new signature. The cache endpoint then returned `cache_hit: true`.
- A page refresh opened Nodes2 in about 1.21 seconds; a second browser tab opened it in about 1.24 seconds. The cache file stayed at the same size and timestamp during both reads, so neither tab repeated the upload.
- After restarting the test-package ComfyUI process, the endpoint still returned `cache_hit: true` with the same signature and node count.
- This verifies the cache lifecycle in the upgraded 30-plugin package. It does **not** satisfy the separate large-install capacity or plugin-signature-change acceptance requirement.

## 2026-07-18 - Large-install node-cache acceptance (main package)

- Main package startup completed at `http://127.0.0.1:8188` with `plugin_count: 202` and `registered_node_count: 6,345`.
- The pre-existing 6,345-node / 50.75 MB snapshot had a different signature from the live environment. The endpoint returned `cache_hit: false`, correctly rejecting it instead of serving stale definitions.
- Opening Nodes2 rebuilt the official index once and rendered 6,345 nodes in about 20.5 seconds. The service then atomically replaced the disk snapshot with the live signature; a follow-up request returned `cache_hit: true`.
- After page refresh, Nodes2 restored the 6,345-node result without a second first-build wait. The disk cache timestamp stayed unchanged during the cached read.
- With `Accept-Encoding: gzip`, the cache endpoint returned `Content-Encoding: gzip` and transferred 11,999,196 bytes in about 3.20 seconds, versus the 50,754,161-byte on-disk JSON snapshot.
- Remaining coverage is an independent browser-profile/private-window server-snapshot read. The 200+ plugin capacity target and real stale-signature rejection are now verified.

## 2026-07-16 - Official workflow rename duplicate-request recovery

- Reported behavior: renaming `workflows/79.json` displayed `404 Not Found`, while the renamed file was already present and the old path was absent.
- Source review confirmed that ComfyUI's official workflow `rename()` throws that exact error when its source path no longer exists. WorkspaceKit now recovers only if the error is a 404 **and** its requested target can be read from the WorkspaceKit workflow endpoint.
- Other rename errors, or a missing target after a 404, are still surfaced normally. A recovered path triggers a deferred official-list refresh because the official store may have retained the old in-memory path when its duplicate call failed.
- The Browse tree now uses a monotonic list revision: a poll started before a rename cannot overwrite the local remap with its old filesystem snapshot. A successful rename also makes one operation-bound server list confirmation; this is not part of the periodic background scan.

## 2026-07-16 - Workflow tab-switch false-dirty regression

- Live main-package check found that switching from `78` to `80` could mark the target workflow as modified without an edit. Refreshing cleared no file content and no workflow was saved.
- Official `workflowService.openWorkflow()` confirms the required path is: load only if remote content is absent, then call `app.loadGraphData(..., workflow)`. Its `afterLoadNewGraph()` hook performs the official active-workflow transition and resets/restores the change tracker. WorkspaceKit's adapter now matches the service's `isLoaded` guard and does not pre-activate the Store.
- A clean A/B test in the test package originally reproduced the problem: opening A was clean; switching to B marked A modified without an edit. The adapter was then aligned with `workflowService.openWorkflow()` by avoiding a reload of an already-active workflow and using `skipAssetScans: !loadFromRemote` for cached tab switches.
- **2026-07-18 clean-state acceptance (test package):** switched clean `小红书 → 99 → 小红书` without editing either graph. After each settle period, the current canvas was the selected workflow and neither open row showed a dirty dot or a Save button. This proves the clean-to-clean case only; it is not sufficient for a dirty-to-clean switch.
- **2026-07-18 dirty-tab reactivation root cause and repair:** the first failure exposed a separate deterministic flaw: `openWorkflow()` called `setCurrentWorkflowCleanState()` after *every* official tab activation. That call deleted the target path's dirty marker, so `99 (edited) → 100 (edited) → 99` could erase `99`. The open adapter now captures whether the target was already in the official `openWorkflows` list before loading; only a first open establishes a clean baseline.
- **2026-07-18 repaired test-package acceptance:** after restarting the test package, moved a real node in `100`, switched to `99`, moved a real node there, then switched `100 → 99`. Both rows retained their dirty dots on every activation; exactly one Save button was rendered, for the active row only. The test did not save either workflow file.

## 2026-07-16 - Workflow false-dirty comparison semantics

- Source inspection of the installed official frontend found that `ChangeTracker.graphEqual()` deliberately ignores `extra.ds` (canvas viewport) and node-array order. Its deactivation path stores the viewport while switching tabs, so raw `JSON.stringify(graph.serialize())` is not a valid dirty-state comparator.
- WorkspaceKit's Open-row dot and Save visibility now use an in-memory official-workflow baseline with the same semantics: canvas viewport and node ordering are ignored; node properties, links, groups, reroutes, definitions, subgraphs, and other graph content remain compared.
- Isolated regression check passed: changing only `extra.ds` plus node order remains clean; changing a node title becomes dirty.
- **2026-07-18 live test-package acceptance:** the clean `小红书 → 99 → 小红书` sequence passed with no dirty dot or Save button on either Open row. The separate dirty-tab reactivation regression is repaired and passed the real-node-move test above; main-package release acceptance remains outstanding.
# Current release baseline

## 2026-08-25 - T-042 B1 regular canvas-frame acceptance (test package)

- Backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-t042-canvas-rendering-20260825-210415.zip`
  (SHA-256 `203B06783B19506FDBB897382414C2647863BF00F9400CDB21F20E36F2A50E59`).
- Added `canvas-groups/canvas-frame-paint.js` as a pure Canvas renderer for the
  normal (`none`) frame and its user shadow. The DOM overlay intentionally keeps
  only the header, controls, rename field and hit targets.
- Static evidence passed: module syntax, `test-canvas-group-frame-paint.mjs`,
  existing action-icon/native-conversion contracts, and `git diff --check`.
- Real `:8190` acceptance `scripts/e2e/t042-canvas-frame-layer.mjs` created two
  temporary nodes and one WK group, enabled fill plus a 4px border/12px shadow,
  then confirmed the official sidebar registry contains `workspace2`, computed
  DOM border `0px`, DOM shadow `none`, and the active Canvas background hook.
  Its `finally` cleanup removed the temporary graph data.
- The first browser run found a real duplicate lexical declaration in the new
  draw path. Browser module loading, not `node --check`, caught it; it was fixed
  before this acceptance. Animated effects remain deliberately outside B1 and
  need their own canvas drawing plus visual acceptance.

## 2026-08-25 - T-042 B2 pulse canvas-frame acceptance (test package)

- `pulse` now uses the same Canvas background layer as the regular frame when
  the group is in its normal execution state. The existing DOM title and action
  colour feedback is retained, while the DOM frame/shadow remains absent.
- The extended `:8190` fixture first confirms the `workspace2` sidebar entry is
  registered, then changes its temporary group to pulse. It observed DOM border
  `0px`, DOM shadow `none`, and four Canvas background draws over 120ms.
- `entry.js` advances the canvas-groups module query key for this batch so a
  refreshed browser cannot retain the preceding module evaluation result.
- This accepts timing and layer ownership. Rainbow, glow, and retained legacy
  effects still require separate migration and visual comparison.

## 2026-08-25 - T-042 B3 rainbow canvas-frame acceptance (test package)

- `rainbow` now uses Canvas with the existing 4.5-second hue cycle and the
  existing speed multiplier. Its title and action controls keep their original
  DOM colour updates, but its frame and user shadow no longer cover nodes.
- The same real `:8190` fixture observed no DOM border/shadow and 7 background
  draws in 120ms for rainbow. It also reran pulse in the same page and observed
  5 background draws, with no loss of the `workspace2` sidebar registration.
- The canvas-groups module query key was advanced again for normal browser
  refreshes. Glow and retained legacy effects remain intentionally unmodified.

## 2026-08-25 - T-042 B4 glow canvas-frame acceptance (test package)

- The Canvas frame painter now accepts independent glow layers. Glow preserves
  the legacy sequence: 35px at half animated strength, 12px at animated
  strength, 3px at full strength, then a sharp border with no extra user shadow.
- The pure contract asserts four strokes and the blur sequence `35, 12, 3, 0`.
  The `:8190` fixture observed DOM border `0px`, DOM shadow `none`, and six
  Canvas background draws in 120ms for glow; pulse and rainbow regressions
  remained Canvas-owned in the same page.
- The module query key was advanced for a normal browser refresh. Only legacy
  marquee compatibility effects remain on the DOM path.

## 2026-08-25 - T-042 B5 legacy marquee canvas-frame acceptance (test package)

- Archived `marquee` and `marqueebreathe` effects now use a Canvas conic
  gradient with the original 30-degree colour stops. The breathing variant
  retains its original 5–65% lightness cycle. The animated gradient title text
  remains on its existing DOM path; only visual frame ownership moved.
- `createCanvasMarqueeGradient()` has a solid-colour fallback for a canvas that
  lacks `createConicGradient`, so an old saved workflow cannot abort the entire
  background pass. Its pure contract verifies the gradient centre, 13 stops,
  and fallback.
- The real `:8190` fixture observed no DOM border/shadow and seven background
  draws in 120ms for each legacy effect. It also rechecked regular, pulse,
  rainbow and glow in the same page, with the sidebar entry registered.
- This completes code migration and layer/timing evidence for all six effects.
- On 2026-08-26, the user completed the visible test-package comparison and
  reported no issue. This accepts the archived marquee direction and breathe
  rhythm as visually non-regressed; T-042 is complete.

## 2026-08-19 - T-102-R1 Canvas-group conversion real disk persistence (test package)

- Created the pre-change archive: `.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-T102-real-persistence-20260819-111424.zip` (SHA-256 `B18D52D370B7CB30657D746F766E96D9629828D7923076D3EC317DD0945A4EEA`).
- Added repeatable acceptance `scripts/e2e/t102-conversion-disk-persistence.mjs`. In a disposable browser graph it creates one WK group, assigns stable native colour `#9f7aea`, converts it to a LiteGraph native group, and saves through `POST /workspace2/workflow/save` to `__WK_TEST__/t102-conversion-disk-persistence.json`.
- The endpoint returned HTTP 200. After a full browser-page reload, the script read that file through `GET /workspace2/workflow/read` and loaded the returned workflow with `app.loadGraphData()`.
- The reopened workflow retained `groupRepresentation: native`, one native group titled `T102 native colour persistence`, native group colour `#9f7aea`, and archive `nativeGroupColor: #9f7aea`; no `.xzg-group-box` overlay remained. This closes the prior gap where in-memory `serialize() → loadGraphData()` had been treated as disk-persistence evidence.

## 2026-08-19 - T-035 rgthree `pale_blue` real filter persistence (test package)

- Created the pre-change archive: `.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-T035-rgthree-native-color-20260819-112456.zip` (SHA-256 `1C5715778EE8272BD9E0EBA7FA9065E76E318F1EDF81F45B57C967A56F3BA33C`).
- Added repeatable acceptance `scripts/e2e/t035-rgthree-pale-blue-disk-persistence.mjs`. It creates two WK groups with persisted identities `pale_blue` / `#3f789e` and `red` / `#aa8888`, then adds the real installed `Fast Groups Bypasser (rgthree)` with `@matchColors=pale_blue`.
- rgthree Fast Groups has an intentional ~400ms group-list cache. The acceptance calls its public `SERVICE.getGroupsUnsorted()` before `refreshWidgets()` so the test proves the post-cache result rather than an obsolete list. This does not change product code.
- Before save and after `POST /workspace2/workflow/save` → full page reload → `GET /workspace2/workflow/read` → `app.loadGraphData()`, the Bypasser rendered exactly `Enable T035 pale-blue target`; it did not render the red control group. Both bridge adapters retained their expected colours and both saved WK group records retained `nativeGroupColor`. No queue execution was performed; this accepts filter identity and persistence only.

## 2026-08-19 - T-021-R1 nested multi-selection real-pointer acceptance (test package)

- Created the pre-change archive: `.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-T021-multiselect-real-pointer-20260819-112857.zip` (SHA-256 `18DE2B7C2C5473215BB257F405999B4633AAE22A8B5A03B04A4593FAB12EB1C8`).
- Added repeatable `scripts/e2e/t021-multiselect-nested-real-pointer.mjs`, with a parent WK group, an entirely nested child group, and an independent two-node group in a disposable Nodes 2.0 graph.
- A physical double-click on the parent header selected the child frame and the parent's two internal nodes only. The parent frame and unrelated independent-group nodes were not selected. This supersedes the stale wording that implied the parent should first be selected and then Shift-removed.
- Physical clicks selected parent + child + independent frames. Dragging a selected header by `36×18` screen pixels at `0.9` scale moved all three frames and all four graph nodes by exactly `40×20` graph pixels; the Vue DOM node rectangles moved by the corresponding screen delta, proving no duplicate movement. `Esc` cleared the transient group selection.

## 2026-08-19 - T-055 P-05b browser-zoom acceptance blocked externally

- The required Chrome browser surface was connected successfully, but opening the local test package at `http://127.0.0.1:8190/` returned `ERR_BLOCKED_BY_CLIENT` from a browser extension layer.
- The existing in-app/headless browser has already been documented as unable to report actual browser zoom. It was not used as a substitute for Chrome 100% / 125% / 150% evidence. No implementation change or visual acceptance is claimed; retry only after the browser-side local-page block is removed.

## 2026-08-19 - T-054 node-preview visual matrix: static recheck only

- `test-node-preview-model`, `test-node-preview-adapters`, `test-node-preview-archetypes`, and `test-node-preview-visual-contract` all passed against the current source.
- This confirms the ten-row bounded model, media adapters, structural fallback classification, narrow-card port CSS, and no-external-shadow visual contract have not regressed. It does **not** close the remaining real-hover matrix (light theme, narrow card, complex/port-dense and unregistered third-party cases), because Chrome navigation to the local test package is currently blocked by `ERR_BLOCKED_BY_CLIENT`.

## 2026-08-18 — Nodes 2.0 P0 closure

- **WK Latent Size:** pure-Python contract confirms all Flux Resolution Calc megapixel values and all 23 public aspect ratios; the WK node keeps its independent LATENT, width, height, resolution and batch outputs.
- **Transparent title:** in an isolated Nodes 2.0 browser page, a disposable `Workspace2Title` mounted its DOM presentation with `260×90` dimensions and visible default text. A physical double-click in its visible rectangle opened the existing title editor. The node was removed before browser exit.
- **WK groups:** a physical single group-header drag at scale `0.9` moved the frame and both member nodes by the same graph delta. The drag, multi-drag and resize paths now use pointer-family teardown as well as compatibility mouse events.
- **Official-node coexistence:** with the WK overlay initialized, an official node drag, selection, context-menu event, `Ctrl+C / Ctrl+V`, and a `CLIPTextEncode` text input all completed in Nodes 2.0. The disposable graph existed only in the isolated browser page; no workflow file was saved.

## 2026-08-17 - Nodes 2.0 P0-A and WK Latent Size (test package)

- Created the pre-change archive: `.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-nodes2-p0-wk-latent-size-20260817-182210.zip` (SHA-256 `E1B6729AAFDCBB4756E9993FD00A2BB952013E34766FA1759B95CE4494524C48`). The retained third-party source-and-license reference archive is `third-party-node-sources-nodes2-p0-20260817-182231.zip` (SHA-256 `888BFD7807845069B39DAFA8132D177CD09771A22C8CE876C957826028D3AB4F`); neither archive is tracked by Git.
- Read-only runtime audit (`scripts/e2e/p0-nodes2-runtime-audit.mjs`) observed ComfyUI `0.33.0`, Python `3.12.10`, WK `0.2.6`, Legacy `LGraphCanvas`/`LGraph`, and `Comfy.VueNodes.Enabled=false`. No Vue-node element was present. Nodes 2.0 is therefore **not yet accepted**; the setting was not toggled by this audit.
- The test package loaded `/object_info/WKLatentSize` with the expected inputs and outputs. The real-page Legacy script created a disposable node and verified its six widgets plus `LATENT`, `INT`, `INT`, and `STRING` outputs; it removed the node from the in-memory graph before exit.
- A real queued graph `WK Latent Size → Save Latent` completed successfully at batch size 2 with 1.0 MP / 16:9 / 64 alignment. The only generated `_WK_TEST_P0_LatentSize_00001_.latent` output was explicitly removed after confirmation. Existing page console errors were ComfyUI/Vite startup/preload messages and did not name WK Latent Size.
- Nodes 2.0 group acceptance used an isolated browser context and only temporary in-memory nodes/groups. It passed: create two-node group visual containment, one-group header drag, two-group `Shift` multi-select/header drag, `Esc` multi-select clear, and a real mouse-wheel scale change from `0.9` to `1.0` with group containment retained.
- The first zoom attempt exposed a fixture timing fault: a group created while a Vue node was still in its first DOM layout received a height 24 graph pixels too small. The acceptance fixture now waits for two consecutive identical `nodeVisualBounds()` frames before calling `createGroupFromSelection()`. After that prerequisite, the before/after bounds and DOM rectangles were contained at both scales. This is test-fixture synchronization, not a production zoom patch.
- The first Nodes 2.0 resize attempt failed: the visible bottom-right handle overlapped a Vue-node input port, and the node-priority policy had set the handle to `pointer-events:none`. The narrow fix leaves the three drag strips node-priority transparent but keeps the explicit 14px resize handle clickable. Real reacceptance at scale `0.9` dragged the handle 45×30 screen pixels, increased group bounds by exactly 50×33.33 graph pixels, and left both member-node positions unchanged.
- Nodes 2.0 nested-group acceptance created a one-node child group, then a parent group covering all three temporary nodes. The parent retained only direct member IDs while geometrically containing the child group; this is the intended non-duplicating model. A real parent-header drag of 45×27 screen pixels at scale `0.9` moved parent bounds, child bounds, and all three member nodes by 50×30 graph pixels. Fixture nodes/groups were removed and the renderer setting restored.
- Nodes 2.0 in-memory round-trip conversion passed in a disposable browser graph: `WorkspaceKit → LiteGraph native → WorkspaceKit` created one native group and removed the WK overlay, then restored one WK group and removed native groups. Title, width/height and both node positions were retained. Vue DOM-derived bounds can be fractional while native LiteGraph groups quantize positions to integers; the observed x/y drift was at most one graph unit and is explicitly accepted as the native serialization boundary.
- Nodes 2.0 in-memory save/reload passed in a disposable graph. The WK group appeared in `graph.serialize().extra.xzgGroups`; after `app.loadGraphData(snapshot)`, title, full bounds, member IDs, both node positions, and exactly one WK overlay were restored. No workflow save endpoint or test-package file was written.
- Renderer switch smoke passed as three independent read-only pages: Legacy → Nodes 2.0 → Legacy each initialized the WK sidebar entry, WK group overlay, and official graph canvas. The Nodes 2.0 page had 10 `.lg-node` Vue nodes; both Legacy pages had zero.
- Complex Nodes 2.0 workflow acceptance read and loaded `VIDEO/wan22-i2v-SVI_Kenpechi_v3.5.json` only inside an isolated browser. API and canvas both reported 303 nodes and 28 native LiteGraph groups; the page rendered 303 Vue nodes. No save endpoint or workflow file mutation occurred.
- Focused static checks passed: `scripts/test-node-visual-bounds.mjs`, `scripts/test-group-node-membership.mjs`, `scripts/test-canvas-group-action-icons.mjs`, frontend module syntax (122 files), Python node contract, Python compilation, and `git diff --check`. Resize, nesting, conversion and save/reload remain unaccepted Nodes 2.0 cases.
- Isolated Nodes 2.0 acceptance (`scripts/e2e/p0-wk-latent-size-nodes2.mjs`) temporarily set `Comfy.VueNodes.Enabled=true`, reloaded, verified the same WK Latent Size widgets and outputs, then restored the original `false` value before discarding the browser profile. A DOM sample confirmed Nodes 2.0 renders nodes as `.lg-node` DOM elements above the graph canvas.
- Real WK Nodes-panel placement under Nodes 2.0 (`scripts/e2e/p0-nodes-panel-placement-nodes2.mjs`) selected `GetNode`, clicked an empty area of the official `#graph-canvas[data-drop-target-for-element='true']`, and observed the graph count rise from 10 to 11 with the expected type and click-relative position. The disposable node was removed. This accepts the current Nodes click-to-place path only; templates and WK canvas groups remain separate work.
- Real WK Templates-panel placement under Nodes 2.0 (`scripts/e2e/p0-templates-panel-placement-nodes2.mjs`) selected the existing 10-node template `template-1786109223821-q1cf1g`, clicked the same official graph canvas surface, and observed all ten expected node types added. The script removed every added graph node and restored the complete template-library response captured before the test. WK canvas groups remain separate work.
- WK canvas-group Nodes 2.0 smoke initially found a real bounds failure: Vue nodes rendered wider/taller than stale graph `node.size`, while `boundingRect` was `[0,0,0,0]` before layout. `entry/canvas-groups/node-visual-bounds.js` now rejects zero-size rectangles and, when available, converts the rendered `node-body-{id}` / `.lg-node` DOM rectangle back to graph coordinates; Legacy metadata remains the fallback. In an isolated Nodes 2.0 page, two disposable `GetNode` nodes were grouped and the rendered WK group rectangle contained both full DOM node rectangles. The group and nodes were removed before exit. `test-node-visual-bounds`, group-membership, canvas-group action-icon, the 122-module frontend syntax scan, and `git diff --check` passed. Later P0-E evidence separately accepted core drag, multi-select, `Esc` clear and wheel zoom; resize, nesting, conversion, and save/reload remain unaccepted.

## 2026-08-18 - Nodes 2.0 编组节点位置桥接

- 用户的真实体验发现了此前验收缺口：旧的单拖/多拖脚本只断言 `node.pos`，没有断言
  Vue `.lg-node` 的屏幕位置，因此不能证明画面节点确实跟随编组。
- `entry/canvas-groups/node-position-sync.js` 现在是唯一的节点位置兼容边界：Legacy
  继续就地写入坐标；Nodes 2.0 整体替换 `node.pos`，让官方 Vue 布局桥接收到更新。
- 真实 Playwright 复验单拖：`0.9` 缩放，编组标题栏拖动 `45×27` 屏幕像素，两个成员
  节点的图坐标各移动 `50×30`，对应 `.lg-node` DOM 也各移动 `45×27`。
- 真实 Playwright 复验 Shift 多选两个 WK 编组：拖动 `36×18` 屏幕像素，四个成员节点
  的图坐标各移动 `40×20`，DOM 均移动 `36×18`；成员的 `pos` 前后仍为 `Float64Array`。
  两份验收脚本从此必须同时检查图数据与 DOM 位置。
- 四角调整手柄默认 `opacity: 0` 且 `pointer-events: none`；鼠标进入编组几何范围后，
  四角恢复为 `opacity: 0.6` 与可交互状态。单编组 Nodes 2.0 验收覆盖了隐藏、显示及
  后续拖动，不会产生不可见热区。

## 2026-08-17 - T-056 R5 workflow virtual favorites acceptance (test package)

- Created the pre-change archive: `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-r5-workflow-favorites-20260817-170119.zip` (SHA-256 `DC57263190A0B26C093954A279832E2053F138A880665D56633138B1A322F8FD`).
- Favorites are stored server-side at `user/default/comfyui-workspace2/workflow_favorites.json` as normalized workflow-relative paths. The server rejects non-relative API paths; no physical Favorites folder is created.
- Contracts passed: favorite schema normalization and atomic persistence; workflow path-state dispatch for rename/move and delete; bundle export/import includes `workflow_favorites` and the automatic pre-import backup preserves the old collection.
- Fresh CPU test package on `http://127.0.0.1:8190/` served the new endpoint and bundle schema. The project-owned Playwright run selected existing `B11.json`, clicked its favorite control, verified the persisted endpoint, switched to the virtual Favorites view (one projected row), returned to All, and removed the favorite. Cleanup left the server collection empty. No WorkspaceKit browser console error was reported.
- Lifecycle rule: rename/move remap favorite paths; delete removes them; copy and trash restore do not create a new favorite. This prevents a restored/copy file from being silently promoted.

## 2026-08-15 - T-056 R1 top Strip first real-page acceptance

- R1 backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-r1-chrome-tab-strip-20260815-215021.zip` (SHA-256 `B384929DCB8C2515860718AD7A13A17C837B3028919355310B31123505275BBF`).
- Static contracts passed: `node scripts/test-workspace-panel-host.mjs`, `node scripts/test-provider-tabs.mjs`, `node scripts/test-sidebar-startup-resilience.mjs`, and `git diff --check`.
- The blocking cause was not a WK Strip geometry defect: Layout's retired floating `#alignment-buttons` rule still looked for `.workspace2-panel`, while the active host is `.workspace2-shell`. Layout now hides and disables that legacy toolbar only while the WK shell is present; its own regression contract passed.
- Fresh test-package page at `http://127.0.0.1:8190/`, with WK opened: shell width 312px; Strip width and scroll width both 312px; its bottom border is `0px`; `#alignment-buttons` reported `visibility: hidden` and `pointer-events: none`; a top-strip hit test resolved to the active WK tab rather than the legacy toolbar.
- At that width, `工作流`, `节点`, `模板`, and the Provider overflow tab all fit without Strip overflow. The workflow label is no longer prematurely shortened. Workflows, Nodes, Templates, and Theme Provider activation were exercised; the WK shell remained visible and no duplicate core tabs appeared. Theme used the same active overflow wrapper surface.
- This is a dark-theme real-page acceptance. Light, transparent, frosted, and browser 100/125/150% zoom remain cross-theme visual regression evidence; they are not claimed by this record.

## 2026-08-15 - T-056 R2 bottom status slot first acceptance

- R2 backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-r2-status-slot-20260815-221201.zip` (SHA-256 `5EF6726E91E884E192B0414556C5EA73450C75825041FE69E8A7F08E876FB2AE`).
- Added a host-owned `status` slot after the established scrollable `content` slot. Its controller has `show({ text, tone, live })`, `clear()`, and `dispose()`; empty text clears the row, unknown tones safely use neutral, and the row uses `role=status` with polite/assertive live-region support.
- Static contracts passed: host-slot order and default hidden state, status-controller behavior, provider-tab plan, startup resilience, and the 120-module frontend syntax scan. `git diff --check` passed.
- Fresh page at `http://127.0.0.1:8190/`: the rendered slot order was header, toolbar, controls, content, status. Header/toolbar/controls/status were all hidden; the content host retained its normal 679px height and hidden overflow. There were no WorkspaceKit error messages in the captured browser log.
- R2 intentionally does not move title/status text from Workflows, Nodes, or Templates yet. That visual migration belongs to R3, so this record proves the new slot does not alter the existing layout while unused.

## 2026-08-15 - T-056 R3 Nodes host-slot migration (static stage)

- R3 Nodes backup: `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-r3-nodes-host-migration-20260815-224018.zip` (SHA-256 `850F7D08B8E3A5360C28322406242A05B0B284428C2B1591B83C5B539C13BF00`).
- The Nodes panel now maps its existing header, search toolbar, favorites/view controls, tree body, and status text to the R1/R2 host slots. Node cache, translation aliases, preview, favorites, sorting, and all data operations remain in their established functions. A direct internal rerender retains the same host mount, so a search, disclosure, or pending-placement update does not silently fall back to a second local panel.
- Static checks passed: entry syntax, 120-module frontend syntax scan, panel-host/status/provider-tab/startup contracts, workflow regression contracts, and `git diff --check`. The running test server returned the exact current `entry.js` SHA-256 (`C7DEC6AEED18E9DC21D6682156A71FE1C4A180F26E3FC8207032A54E619FCFE3`) and both `/workspace2/workflows` and `/system_stats` returned HTTP 200.
- **2026-08-16 real-page acceptance:** the project-owned headless Playwright path loaded the test package at `:8190` and recorded no WorkspaceKit console error. Nodes mounted exactly one child into each Header / Toolbar / Content slot and two controls, hid the legacy header status, and showed `2390 个节点` in the bottom status slot. Templates mounted one child into each shared slot, hid its legacy header status, and showed `3 个模板` in the bottom status slot. The recycle-bin return transition also passed for both Workflows and Templates. R3 remains in progress only for Workflows, which stays after P-01b export-artifact acceptance.

## 2026-08-16 - T-055 P-01b export-download acceptance

- The project-owned headless Playwright browser opened WK Workflows on the test package at `:8190`, opened the localized File menu, and invoked the official `导出工作流` and `导出 API 工作流` commands independently.
- After supplying only a filename in each official dialog, Playwright captured the actual browser download events: `p01b_workflow_export_probe.json` and `p01b_api_export_probe.json`. The downloads remained in the isolated temporary browser context; no workflow, template, node-library, or plugin data was written.
- This closes the previous “dialog only” evidence gap. P-01b no longer blocks R3‑Workflows.

## 2026-08-17 - T-056 R3 core-panel host acceptance

- The test package at `:8190` completed the project-owned headless Smoke with no WorkspaceKit console error. Workflows, Nodes, and Templates each mounted exactly one header, toolbar, controls, and content child in the shared module frame; the legacy header status was hidden and the new bottom status slot contained current text.
- Observed bottom states were `11 个回收站项目` for Workflows, `1595 个节点` for Nodes, and `3 个模板` for Templates. The transient recycle-bin transitions for Workflows and Templates also passed.
- R3 is complete. R4 may now add only the status-help setting; it must not alter the established shared-slot geometry.

- **2026-07-21:** WorkspaceKit `0.2.2` is published to Comfy Registry. The GitHub Actions release gate was verified on a non-version push: version detection passed and the Registry publishing job was skipped, so ordinary documentation or source changes do not republish the package.
- **2026-07-20:** The published Comfy Registry release is `0.2.1` for `comfyui-workspacekit`. `pyproject.toml` is the authoritative release-version source; the backend reads it for `/workspace2/info`, and the Settings dialog reads that endpoint.
- Historical entries below retain their original `0.2.1b0` observations and must not be rewritten as though they were recorded against a later release.
# T-040 — Native-to-WorkspaceKit conversion defaults (2026-08-19)

- Backup: `.codex-backups/20-workflows/ComfyUI-WorkspaceKit-before-native-to-wk-defaults-20260819-155907.zip`
  (SHA-256 `EA63C8AF700D04F978A00C0B076F4B56F3C5526B803921B7F107EA2B5BF25439`).
- Scope: only native groups with no valid WorkspaceKit conversion archive use the
  conversion landing style. Archived round trips retain their saved WK style.
- Contract target: 16px `#F2F2F2` unified title/border, 2px at 40% border
  opacity, native-colour title bar at 50% opacity, no fill, no shadow, 8px
  radius, 12px padding and no effect.
- Automated evidence: `node scripts/test-group-reverse-conversion-plan.mjs`
  passed. Real `:8190` evidence also passed through
  `node scripts/e2e/t040-native-to-wk-defaults.mjs`: a fresh native
  `#3f789e` group became `rgba(63,120,158,0.5)` with every listed conversion
  default, while an archived WK group deliberately configured as `23px`,
  `5px`, `77%`, filled and shadowed restored those exact values after
  WK → native → WK. The E2E uses only an in-memory temporary graph and does
  not save a workflow file or alter a browser setting.

## 2026-08-29 — L0 shared shell / sidebar visibility contracts

- Scope: shared WorkspaceKit shell only. Theme editor/storage behavior was not changed. Theme is intentionally sealed at navigation level until the Theme product line begins.
- Added first-party module visibility policy for Workflows, Nodes, Templates, Layout, and Theme. Workflows/Nodes/Templates/Layout default visible; Theme always resolves hidden while sealed, including when stale localStorage contains an old enabled value.
- Settings now exposes one `Sidebar tabs` group with six display controls: Workflows, Nodes, Templates, Layout, Theme, and external extensions. The Theme control is unchecked and disabled; external Provider visibility is independent from first-party module visibility.
- `workspacePanelProviders()` now resolves the built-in registry in addition to the public external Provider API. This addresses the `log44` failure mode where disabling external merging left the Layout tab visible but made its renderer undiscoverable. `createPanelBlueprint()` also exposes a safe `setStatus()` compatibility method.
- Hidden modules cannot be opened through module shortcuts. Hiding the active tab reconciles to another visible module; hiding all available first-party modules leaves Settings reachable and no longer silently renders hidden Workflows content.
- Automated evidence: `node scripts/run-contract-tests.mjs` passed **109/109** JavaScript contracts, including the new module-visibility contract; `py scripts/run-python-tests.py` passed **9/9** Python contracts; frontend module-goal syntax passed **151** files.
- A dedicated real-page check was added at `scripts/e2e/l0-sidebar-visibility.mjs` for external-merge OFF + Layout, sealed Theme, selective visibility, and all-hidden behavior. It could not enter its functional assertions because the local `http://127.0.0.1:8190/` test service was not running: Playwright timed out before `.workspace2-tab-button`, and a direct curl check returned HTTP `000`. Real-page acceptance therefore remains pending and is not claimed by this record.
