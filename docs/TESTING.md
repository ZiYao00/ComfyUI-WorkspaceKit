# WorkspaceKit Testing Log

This document records reproducible test evidence and unresolved errors found while validating WorkspaceKit. Historical endpoint, storage, and implementation names such as `Workspace2` remain in individual records where they identify the compatibility layer. A recorded error is not treated as a confirmed WorkspaceKit root cause until the owning call chain is isolated.

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

- [ ] **Open:** open the same workflow from Browse and Open; each loads the intended graph without a second click.
- [ ] **Unsaved state:** after opening, no dot or Save is shown. Change a node value, link, title, or position; the dot and Save appear only on that current Open row.
- [ ] **Save:** a successful save clears the dot and Save. A failed or cancelled save leaves both visible.
- [ ] **Workflow switch:** opening a second workflow starts clean and does not inherit the first workflow's indicator.
- [ ] **Create:** a new workflow appears locally, opens once, and does not cause repeated full scans or duplicate official-list synchronization.
- [ ] **Rename and move:** selected path, Open history, and the current-save target follow the renamed/moved workflow.
- [ ] **Delete and restore:** list and official workflow synchronization have no stale duplicate after trashing and restoring a workflow or folder.
- [ ] **External-change poll:** inline rename and drag ordering survive longer than one background-poll interval.
- [ ] **Restart and refresh:** previous-workflow restore has no `graphData.extra` error and the current Open row starts clean.

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
