# WorkspaceKit Roadmap

This document records planned product work. A listed item is a design intent, not a released feature or compatibility promise.

> **Scope**: internal feature-level requirements and acceptance criteria. For the public-facing status list see [`../ROADMAP.md`](../ROADMAP.md). Outstanding-work tracking (backlog, tech debt, per-batch dashboard) is maintained in the internal `.dev-docs/` tree, which is not published to Git.

## Post-unification product-line order

The 2026-08-29 repository unification changes the execution model from three parallel plugins to one product with three deliberate product lines. After the remaining shared-shell acceptance gate, normal product development proceeds in this strict order:

```text
Shared UI / first-party module shell
→ Layout
→ Theme / Appearance
→ WorkspaceKit Core
→ Whole-product regression / Release Candidate
```

Work should not bounce between product lines merely because a nearby issue is convenient. Cross-line changes are allowed only when they unblock the active product line, fix a regression, or satisfy a release gate.

Shared-shell L0 now defines six user-facing visibility controls: Workflows, Nodes, Templates, Layout, Theme, and external extensions. Workflows/Nodes/Templates/Layout default visible; Theme is deliberately sealed (hidden by default and represented by a disabled Settings switch) until the Theme product line begins; external Provider visibility remains independent from first-party module identity. Real-page acceptance remains required after the local `:8190` test service is available again.

### Layout — current product line

The Layout product line keeps the professional Photoshop/Illustrator-inspired interaction goals from the former `ComfyUI-WorkspaceKit-Layout` planning documents while dropping standalone-plugin maintenance work that no longer creates product value.

Current / near-term priorities:

- **L1-A1/A1.1 complete (2026-08-29):** the eight high-frequency alignment/distribution commands use a fixed full-width 4×2 position-memory matrix. The five size commands use one regular five-column row. Fixed spacing is no longer a third block: its numeric value plus horizontal/vertical actions live together in the upper control strip with one accent treatment.
- **L1-A1/A1.1 complete (2026-08-29):** the panel/topbar restore the audited NodeAligner GPL-3.0 SVG vocabulary for all twelve historical commands (8 alignment/distribution + 4 max/min width/height). Fixed-spacing and equal-both are new WorkspaceKit supplemental icons in the same visual grammar. Adobe Photoshop/Illustrator remain interaction references; proprietary Adobe assets are not copied.
- **L1-A2 code/contract complete (2026-08-29):** the operational Layout panel now exposes only `显示方式` / `Display mode`; persistent presentation preferences live in Settings. Modes are canvas top toolbar (fresh-install default), show after selection, draggable pinned canvas toolbar, or no extra toolbar; icon size is 18–25 px and the pinned position can be reset. The selection/pinned surface is a new WorkspaceKit implementation sharing the same command registry/icons rather than restoring the old Shadow DOM/polling shell. Real-page/manual acceptance remains required.
- Finish real-page acceptance for normal nodes, collapsed nodes, WorkspaceKit groups, and mixed Node + Group selections.
- Verify one-command/one-transaction Undo/Redo, save/reload behavior, zero fixed spacing, and resize limits.
- Add Reference Mode and Key Object/Key Node behavior only after the current selection-bounds semantics are stable.
- Then consider Reroute support, smart guides, equal-gap/distance hints, snapping, selection toolbox/radial entry surfaces, and previewable Auto Layout.

Retired from the product roadmap: Layout-only Vendor UI, standalone sidebar hosting, dual-host lifecycle, and long-term WorkspaceKit Adapter compatibility. Historical source/provenance material remains preserved for audit and migration purposes.

### Theme / Appearance — second product line

After Layout is stable, Appearance resumes as one concentrated product line. Retained priorities from the former Theme roadmap are:

- Finish field/group metadata bilingual coverage and visual-density/interaction polish.
- Revalidate the complete theme session lifecycle: load/import → live edit → undo/redo/reset → save/copy → restart/reload.
- Improve reference-image color workflow, recent/favorite palettes, contrast/readability feedback, and affected-area preview/highlighting where useful.
- Mature Theme Manager operations such as copy/rename/update/comparison only through the controlled storage service with rollback/conflict handling.
- Add Frontend-version/field compatibility diagnostics and migration reporting before a stable 1.0 theme format is claimed.

Retired from the product roadmap: Theme standalone host, Vendor UI, dual-host visual matrix, and WorkspaceKit Adapter maintenance. Existing local Theme JSON migration remains non-destructive.

### WorkspaceKit Core — third product line

After Layout and Appearance have their own stable product passes, return to the existing Core backlog: Workflows, Nodes, Templates, Groups, Settings, performance/cache behavior, shortcut editing, Browse improvements, group interactions, sidebar resilience, and incremental `entry.js` modularization. Existing requirements below remain valid unless explicitly superseded by a later product decision.

## P0 — WorkspaceKit Panel UI Template v1

Status: **implemented and contract-tested; compatibility and visual regression remain ongoing release checks.**

WorkspaceKit provides a versioned, opt-in UI Template for family modules and
external panel Providers. Layout remains independently installable, but uses a
generated and Git-tracked WorkspaceKit UI runtime when the host is absent. With
a compatible WorkspaceKit installed, Layout uses the host's current Template
whether it is merged into a tab or remains a standalone sidebar entry.

The v1 primitive, public capability, Vendor fallback, Layout merged/standalone
paths, contracts, and example documentation are delivered. Details, current
compatibility boundaries, and future API-version release gates are in
[Panel UI Template v1](PANEL_UI_TEMPLATE.md).

## P0 — Sidebar-entry resilience

Status: **implementation complete; controlled fault-injection and official DOM-remount acceptance remain release gates.**

WorkspaceKit must remain discoverable even if a later optional feature fails during startup.

- Register the official WorkspaceKit sidebar tab before workflow loading, node probing, group integration, or other non-critical initialization.
- Isolate non-critical startup stages so a failure is reported as a WorkspaceKit health/status error instead of preventing sidebar registration.
- Record the last completed startup stage and a concise failure summary for diagnosis.
- When ComfyUI rebuilds its sidebar DOM, verify registration through the official sidebar API before attempting a bounded re-registration. Do not inject a duplicate button directly into ComfyUI DOM.
- A later, separately validated bootstrap split may keep a minimal entry shell alive when a feature module fails to load; it must not repeat the earlier broad entry-module split regressions.

Required acceptance before release:

1. A simulated workflow-load failure leaves the WorkspaceKit sidebar entry available.
2. A simulated optional integration failure leaves core Workflows, Nodes, and Templates reachable.
3. A sidebar DOM remount does not create duplicate WorkspaceKit entries.
4. The health record identifies the failed startup stage without exposing user data.

## P1 — Reversible WorkspaceKit / ComfyUI native group representation

Status: **both conversion directions are implemented; fixture coverage and current test-package acceptance are recorded.**

WorkspaceKit currently uses its own overlay-group representation to support header actions, modifier gestures, multi-group selection, and its visual settings. A future workflow-level command will provide **WorkspaceKit groups / Use ComfyUI default groups** for the current workflow only.

- The command operates on every WorkspaceKit group in the current workflow, not on one arbitrary group.
- It converts those groups to real ComfyUI/LiteGraph native groups so the result uses the client’s default group appearance and behavior.
- If the workflow already contains a mixture of native ComfyUI groups and WorkspaceKit groups, **Normalize to ComfyUI native groups** converts the remaining WorkspaceKit groups and leaves existing native groups intact. The resulting workflow has one group representation.
- Before conversion, WorkspaceKit must retain a complete source archive under a dedicated conversion record, including title, member node IDs, bounds, execution-mode snapshots, title/background colors, font size, borders, shadows, padding, animation, and animation speed. The archive must remain available after the active representation changes.
- When `groupRepresentation` is `native`, the archived `xzgGroups` data is recovery-only and must not be read as an active overlay layer; otherwise the canvas would show duplicate WorkspaceKit and native groups.
- Restoring WorkspaceKit groups uses the current native structure first: native title, bounds, and actual node membership win; the archive supplies WorkspaceKit-only style and execution metadata. New native groups receive defaults, while deleted native groups require an explicit restore decision.
- Conversion must be transactional: validate source bounds, titles, node membership, and serialization first; if any conversion fails, do not leave a partially mixed workflow.

Required acceptance before release:

1. A workflow containing only WorkspaceKit groups converts to native groups and survives save/reload.
2. A mixed workflow normalizes without duplicating group borders or nodes.
3. Existing native groups remain unchanged.
4. Restore returns the original WorkspaceKit group metadata without changing node positions or execution modes.
5. Conversion does not alter queued execution, node modes, or workflow content outside group representation.

## P1 — WorkspaceKit group content fill

Status: **first version implemented; visual polish deferred.**

WorkspaceKit overlay groups now support an opt-in body fill while preserving the existing transparent default. The fill is drawn through ComfyUI's background pass so it remains beneath node pixels; the DOM overlay is retained only for the title bar and actions.

- Add **Enable group background fill** to the group settings.
- The fill uses the same RGB color source as the title-bar background. It does not introduce a second unrelated color picker.
- Keep the title-bar opacity as the user control. The first implementation derives body-fill opacity from it at a fixed weaker ratio, so the body cannot become stronger than the title bar.
- Apply the same behavior to per-group settings, defaults, presets, Apply to All, preview/cancel restoration, and workflow serialization/recovery.

Required acceptance before release:

1. Disabled fill keeps the group body completely transparent.
2. Changing title-bar color immediately updates the enabled body fill color.
3. Body opacity remains lower than or equal to title-bar opacity across slider, preset, and restore paths.
4. Save/reload preserves the enabled state and title-derived fill opacity.

## P1 — Delete key for WorkspaceKit group selection

Status: **first delivery implemented and real-page tested on 2026-07-24**. Existing `Shift+G` behavior remains available.

- With one selected WorkspaceKit group, `Delete` removes that group frame only.
- With multiple selected WorkspaceKit groups, `Delete` removes every selected group in one operation.
- Removing or dissolving a group never deletes the nodes inside it, their links, positions, execution modes, or output data.
- The shortcut is active only while WorkspaceKit group selection exists; it must not intercept text editing, native node deletion, or ComfyUI shortcuts when no WorkspaceKit group is selected.
- The current direct action is limited to removing WorkspaceKit group frames. A future interaction enhancement may add a selection-count confirmation or reliable undo path without changing the frame-only deletion boundary.

Required acceptance before release:

1. `Delete` removes one selected WorkspaceKit group without deleting its nodes. **Passed in the test package.**
2. `Delete` removes two or more selected groups together without deleting or moving any member nodes. **Passed in the test package.**
3. `Delete` does nothing to WorkspaceKit groups while a text field is being edited. **Covered by the pure policy contract; real editable-focus acceptance remains pending.**
4. No selected WorkspaceKit group means ComfyUI retains its normal `Delete` handling. **Passed in the test package.**

## P1 — WorkspaceKit group marquee selection

Status: **implemented and accepted in the test package on 2026-07-24.** The remaining work is regression coverage alongside native ComfyUI marquee behavior, not a new feature implementation.

WorkspaceKit supports `Shift + left click` to add or remove individual overlay groups from a transient selection and observes ComfyUI's existing Ctrl-drag marquee without replacing native node selection.

- Use **Ctrl + drag from blank canvas**, matching ComfyUI's native node/default-group marquee. WorkspaceKit observes the same rectangle and does not prevent the native gesture.
- Groups whose bounds intersect the Ctrl marquee are added to the WorkspaceKit transient selection alongside ComfyUI's selected nodes/default groups; a plain blank click continues to clear that selection.
- Single selected groups remain visually quiet; only two or more selected groups receive the existing dashed outline.
- The marquee must not select nodes, move groups, alter workflow serialization, or interfere with Ctrl/Alt/Shift group-header gestures.

Required acceptance before release:

1. Ctrl canvas marquee still selects ComfyUI nodes/default groups normally.
2. Ctrl-drag from blank canvas selects one or more WorkspaceKit groups without preventing native selection or moving nodes.
3. Shift-click and Ctrl-marquee compose into the same WorkspaceKit selection set.
4. Blank click and Escape clear marquee selection as they do for existing multi-selection.

## P1 — Customizable module shortcuts with conflict protection

The first shortcut preference delivery only enables or disables the fixed `Shift+1` through `Shift+4` routes. A future shortcut editor may let users choose different combinations, but must remain intentionally narrow.

- Begin with module-tab shortcuts only: Workflows, Nodes, Templates, and the pinned extension tab.
- Keep `Alt+C`, `Ctrl+G`, `Shift+G`, and canvas modifier gestures outside the first editable set until their interaction boundaries have dedicated conflict tests.
- Before saving, reject conflicts with another enabled WorkspaceKit shortcut and warn when the proposed combination is known to be reserved by ComfyUI or the browser.
- A conflict warning must explain the conflicting action and leave the existing binding unchanged; it must never silently overwrite a shortcut.
- The settings UI must retain an explicit reset-to-default action and document platform-specific `Meta` handling.

Required acceptance before release:

1. A conflicting WorkspaceKit binding is rejected without changing either action.
2. A known browser or ComfyUI-reserved binding shows a clear warning and is not applied by default.
3. A valid binding persists across refresh and does not break text editing or canvas gestures.
4. Reset restores the documented defaults exactly.

## P1 — Settings information architecture

Status: **implemented; follow-up work is limited to visual refinement and future shortcut editing.**

Settings are organized by product domain: Appearance; Groups; Workflows;
Templates; Shortcuts; and Advanced. Template behavior owns Alt+C auto-open;
workflow behavior owns recent-history count; group representation and
conversion receive their own Groups page; group pointer gestures remain under
Shortcuts. Advanced contains integrations, provider settings, node cache, data
management, and About. The detailed Chinese plan and staged acceptance rules
remain in the internal `.dev-docs/` tree (not published).

## P1 — Workflows Browse two-pane layout

Large workflow roots can contain many first-level folders, making it awkward to
drag a file near the bottom of the Browse tree onto a folder near the top. A
future Browse-only two-pane layout will improve that operation without changing
the existing Open section.

- Keep the current tree layout as the default and add a separate, persisted
  Browse-layout control beside the sort control. Layout and sort are separate
  concerns; switching layout must not silently discard the selected sort.
- In two-pane mode, the left pane is a independently scrollable folder tree and
  drop target; the right pane shows the selected folder's contents and
  breadcrumb.
- Dragging a file from the right pane onto a visible folder in the left pane
  uses the same verified move transaction as tree mode.
- Search uses a full-width result state instead of mixing global results with a
  selected-folder listing. Manual custom reordering remains disabled until its
  cross-pane semantics are explicitly designed.

Required acceptance before release:

1. Tree and two-pane mode preserve the same files, folders, sort choice, and
   expansion/selection state across refresh.
2. A file moves from the right pane to a visible left-pane folder in one drag.
3. Search, rename, copy, trash, restore, and external polling work in both
   layouts without duplicate operations or full-list flicker.
4. The existing tree layout remains unchanged when the feature is disabled.

## P1 — Alt-drag duplicate WorkspaceKit groups

WorkspaceKit overlay groups will support a duplication gesture matching ComfyUI
node duplication semantics without taking away the existing Alt-click Disable
gesture.

- `Alt + click` keeps its current Disable behavior; only an Alt drag that
  exceeds the normal movement threshold becomes duplication.
- Duplicate the selected WorkspaceKit group set, their member nodes, and only
  links whose endpoints are both inside that duplicated set. Do not alter the
  source group, source nodes, external links, queue state, or output data.
- Reuse ComfyUI's supported node-cloning path through a narrow compatibility
  adapter, then build old-to-new node and group ID maps before restoring group
  membership and internal links.
- New group names receive localized incrementing Copy/副本 suffixes. Failure is
  transactional: remove all newly created objects rather than leaving a
  half-duplicated graph.

Required acceptance before release:

1. Alt-click still toggles Disable and does not create a copy.
2. Alt-drag of one group creates one independent group with copied nodes and
   internal links; original nodes remain unchanged.
3. Multi-selected groups duplicate shared nodes only once and preserve their
   internal relative layout.
4. Save/reload preserves the duplicate groups, while external links and queued
   execution remain unchanged.

## Maintainability — incremental `entry.js` modularization

`entry/entry.js` is the composition root and remains large. It is being reduced
in small, individually validated splits so it converges toward orchestration
plus narrow compatibility bridges only. Extracted modules are indexed in
[`MODULE_MAP.md`](MODULE_MAP.md); the file's internal navigation is in
[`ENTRY_MAP.md`](ENTRY_MAP.md).

Progress (2026-07-29, `entry.js` 12,178 → 8,996 lines):

- Extracted `ui/styles.js` (CSS), `core/fallback-strings.js` (i18n table),
  `ui/dialogs.js` (modal primitives), `core/search-scoring.js` +
  `nodes/search.js` (search scoring).
- Remaining candidates: panel appearance/glass/background, official-node
  adapter, node drag/drop. Each is extracted one at a time with syntax +
  contract-test + real-page verification.

Rule learned from a real regression: converting a hoisted `function` to a
non-hoisted `const` factory binding requires the binding to sit above every
reference site — otherwise module evaluation hits the temporal dead zone and the
whole extension fails to register. Contract tests alone do not catch this; a
real browser load does.
