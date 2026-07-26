# WorkspaceKit Roadmap

This document records planned product work. A listed item is a design intent, not a released feature or compatibility promise.

## P0 — WorkspaceKit Panel UI Template v1

Status: **architecture approved; implementation not started.**

WorkspaceKit will provide a versioned, opt-in UI Template for family modules
and external panel Providers. Layout remains independently installable, but
uses a generated and Git-tracked WorkspaceKit UI runtime when the host is
absent. With a compatible WorkspaceKit installed, Layout uses the host's
current Template whether it is merged into a tab or remains a standalone
sidebar entry.

The implementation is intentionally staged: establish a single editable UI
source and deterministic Vendor export first; expose an optional public host
capability second; migrate Layout merged and standalone modes separately; then
release a documented third-party template. Details and release gates are in
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

## P1 — Normalize a workflow to ComfyUI native groups

WorkspaceKit currently uses its own overlay-group representation to support header actions, modifier gestures, multi-group selection, and its visual settings. A future workflow-level command will provide **Use ComfyUI default groups**.

- The command operates on every WorkspaceKit group in the current workflow, not on one arbitrary group.
- It converts those groups to real ComfyUI/LiteGraph native groups so the result uses the client’s default group appearance and behavior.
- If the workflow already contains a mixture of native ComfyUI groups and WorkspaceKit groups, **Normalize to ComfyUI native groups** converts the remaining WorkspaceKit groups and leaves existing native groups intact. The resulting workflow has one group representation.
- Before conversion, WorkspaceKit must retain the source group metadata needed to offer a deliberate restore path. Native groups do not provide WorkspaceKit-only header actions, modifier gestures, multi-selection, or visual controls.
- Conversion must be transactional: validate source bounds, titles, node membership, and serialization first; if any conversion fails, do not leave a partially mixed workflow.

Required acceptance before release:

1. A workflow containing only WorkspaceKit groups converts to native groups and survives save/reload.
2. A mixed workflow normalizes without duplicating group borders or nodes.
3. Existing native groups remain unchanged.
4. Restore returns the original WorkspaceKit group metadata without changing node positions or execution modes.
5. Conversion does not alter queued execution, node modes, or workflow content outside group representation.

## P1 — WorkspaceKit group content fill

WorkspaceKit overlay groups currently keep their body fully transparent; only the title bar has a background color and opacity. A future opt-in content fill will preserve the existing transparent default.

- Add **Enable group background fill** to the group settings.
- The fill uses the same RGB color source as the title-bar background. It does not introduce a second unrelated color picker.
- Keep title-bar opacity and content-fill opacity as separate controls: title bars need stronger contrast for text and actions, while the body fill must remain lighter for nodes and links.
- Default content-fill opacity to a weaker value than the title bar, and prevent it from exceeding the title-bar opacity.
- Apply the same behavior to per-group settings, defaults, presets, Apply to All, preview/cancel restoration, and workflow serialization/recovery.

Required acceptance before release:

1. Disabled fill keeps the group body completely transparent.
2. Changing title-bar color immediately updates the enabled body fill color.
3. Body opacity remains lower than or equal to title-bar opacity across slider, preset, and restore paths.
4. Save/reload preserves both the enabled state and opacity values.

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
