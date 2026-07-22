# WorkspaceKit Testing Log

This document records reproducible test evidence and unresolved errors found while validating WorkspaceKit. Historical endpoint, storage, and implementation names such as `Workspace2` remain in individual records where they identify the compatibility layer. A recorded error is not treated as a confirmed WorkspaceKit root cause until the owning call chain is isolated.

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

- **2026-07-21:** WorkspaceKit `0.2.2` is published to Comfy Registry. The GitHub Actions release gate was verified on a non-version push: version detection passed and the Registry publishing job was skipped, so ordinary documentation or source changes do not republish the package.
- **2026-07-20:** The published Comfy Registry release is `0.2.1` for `comfyui-workspacekit`. `pyproject.toml` is the authoritative release-version source; the backend reads it for `/workspace2/info`, and the Settings dialog reads that endpoint.
- Historical entries below retain their original `0.2.1b0` observations and must not be rewritten as though they were recorded against a later release.
