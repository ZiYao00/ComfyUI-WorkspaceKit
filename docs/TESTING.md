# Workspace2 Testing Log

This document records reproducible test evidence and unresolved errors found while validating Workspace2. A recorded error is not treated as a confirmed Workspace2 root cause until the owning call chain is isolated.

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

- Backup created before extraction: `.codex-backups/workspace2-before-template-data-extraction-20260715-132706.zip`.
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

## Current unresolved work

- **Workflow unsaved-state indicator (P0):** official-root implementation now reads each official workflow's `isModified` state and saves through the official workflow object; custom roots keep the local snapshot fallback. Verify two persisted workflows: edit the first, switch to the second, confirm the first retains its dot, then save and confirm it clears.
- **Workflow section visual regression:** Open and Browse now share a workflow-content container and the workflow-only top border has been removed. Verify visible spacing and the absence of the residual line in the real UI.
- **Workflow Open/Browse density mismatch:** row metrics now use the shared list gap and row height. Verify visually with the shared-container layout.
- **Workflow synchronization regression coverage:** the P0 checklist above is ready; it still needs a complete test-package run, then a main-package release run.
- **Large-install node-cache validation:** the current measured environment has 32 top-level custom-node directories and roughly 2,542 nodes. Main-package validation for hundreds of plugins or tens of thousands of nodes remains pending; shared server-side node-data caching is not implemented.
- **Section-header visual acceptance:** the shared Open/Browse/Favorites/Comfy/Extensions header is implemented, but its `>` / `∨` glyph color, dark/light-theme contrast, and whitespace-only section separation require final visible acceptance.
- **Frosted-glass visual acceptance:** control behavior is implemented, but the final material appearance and sidebar interaction still require user acceptance in the real package.
- **Build identity:** the settings dialog version and package/runtime metadata still need to be kept in sync.
- **Engineering and release readiness:** full `entry.js` module extraction, minimal CI, data export/import with backup, screenshots, Registry/Manager metadata, and contribution/issue templates remain pending.
