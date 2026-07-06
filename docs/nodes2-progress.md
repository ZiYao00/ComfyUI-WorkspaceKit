# Nodes2 progress

## Current direction

Nodes2 is a Workspace2 sidebar tab intended to become the daily node-manager entry point, without replacing or patching ComfyUI's official node manager.

The current phase is: Phase 1 core node-manager features are mostly implemented; the project is now in manual validation, UI refinement, and Phase 2 enhancement planning.

## Keep

- Workflows2 remains a separate sidebar tab.
- Nodes2 remains a separate sidebar tab.
- Canvas Groups remains available as a canvas enhancement module, but the separate sidebar tab is currently hidden.
- Nodes2 uses `/object_info` as the main node data source.
- Node creation uses `LiteGraph.createNode(type)` and `app.graph.add(node)`.
- Drag-to-canvas works through Workspace2 pointer dragging.
- N-Sidebar migration is read-only until the user confirms import.
- Do not replace, hide, or monkey-patch ComfyUI's official node manager in Phase 1.

## Completed

- Sidebar tabs: Workflows2 and Nodes2. Canvas Groups was implemented but its separate sidebar tab is currently hidden.
- Shared top layout structure for Workflows2 and Nodes2: title row, search/tool row, action row.
- Keyboard shortcuts: Shift+W or Shift+1 opens Workflows2; Shift+N or Shift+2 opens Nodes2.
- Workflows2 regular sort modes: name A-Z, name Z-A, newest modified, oldest modified.
- Workflows2 custom order toggle: local UI-only per-folder ordering with a row reorder handle, independent from name/date sort modes.
- Workflows2 folder-first toggle: folders stay above workflow files by default, including Chinese folder names.
- Language files: English and Chinese.
- Live language refresh.
- Input key isolation for Workflows2 and Nodes2 controls.
- Workflows2 and Nodes2 full re-renders preserve tree scroll position.
- Workflows2 and Nodes2 search inputs are isolated from ComfyUI keyboard shortcuts.
- Nodes2 list from `/object_info`.
- Official-style node wrapping from `/object_info`: `python_module`, `category`, `essentials_category`, `search_aliases`, inputs, and outputs are normalized before rendering.
- Weighted search across display name, type, category, aliases, input names/types, output names/types, description, group, alias, and python module.
- Favorites, favorite groups, alias editing, group delete, favorite move/reorder.
- Default favorites is no longer rendered as a folder; favorites in the default group appear directly under Bookmarked.
- User-created favorite groups render as folder rows.
- Drag a normal node directly into a favorite group to create a favorite.
- Drag a favorite node to another group or back to the favorite root.
- Drag node to canvas.
- Click node, then click canvas to place it.
- Esc cancels pending node placement.
- Creating a node from Nodes2 updates `useCount` and `lastUsed` for matching favorites.
- `node_library.json` persistence under `ComfyUI/user/default/comfyui-workspace2/node_library.json`.
- `node_library.json` supports `rating`, `useCount`, `lastUsed`, `addedAt`, `invalid`, and `source` fields.
- Invalid favorites are marked instead of automatically deleted.
- Official-like floating node preview using `/object_info`, positioned beside the sidebar instead of inside the list.
- Node preview has a simulated node card with input/widget/output port hints; duplicated detailed input/widget/output lists are hidden.
- Clicking or right-clicking a node no longer re-renders the node tree, so scroll position should not jump to top.
- N-Sidebar file/localStorage migration preview and import.
- BOOKMARKED / COMFY NODES / EXTENSIONS top-level grouping.
- Three multi-select section filters: Bookmarked, Comfy, Extensions.
- Nodes2 section filters sit below the favorite-root action row divider with wider spacing.
- Nodes2 uses one independent text-size/density slider.
- Workflows2 and Nodes2 action rows now use aligned slider widths.
- Section titles are lightweight divider labels.
- Favorite groups render as folder rows.
- Node category folders toggle by clicking the whole row, not only the disclosure arrow.
- Node right-click menu for favorite, remove favorite, rename favorite alias, place-on-canvas, and copy actions.
- SUBGRAPH BLUEPRINTS and PARTNER/API nodes are intentionally hidden in the first Nodes2 phase.
- Workspace2 probes the official frontend runtime at startup and exposes the result as `window.__workspace2OfficialNodeAdapter`.
- Workspace2 probes official node favorites/bookmarks read-only at startup and exposes the result as `window.__workspace2OfficialFavoritesProbe`.
- Nodes2 can import official node favorites/bookmarks into the favorite root after user confirmation; existing Nodes2 favorites are skipped.
- Nodes2 official favorites entry is now a favorite-manager menu. Import official to Nodes2 and write Nodes2 to official are both available.
- Nodes2 favorite manager menu can back up `node_library.json` to a browser-downloaded JSON file and restore a validated backup after confirmation.
- Writing Nodes2 favorites to official ComfyUI node favorites creates a timestamped `comfy.settings.json` backup first.
- Nodes2 official favorites import understands ComfyUI bookmark folder markers such as `Text/` and imports grouped bookmarks into matching Nodes2 favorite groups.
- Re-running official favorites import can repair earlier flat imports by moving existing root favorites into the detected official groups.
- Nodes2 Comfy browse section uses an official-style category tree based on full `category/name` paths.
- Nodes2 Extensions browse section groups by plugin source first, then preserves third-party `category` paths as nested folders under that plugin.
- Nodes2 node rows use a single-line display name; node type/category metadata remains available for search, preview, and context actions.
- Nodes2 has official-style sort modes: original order and alphabetical.
- Nodes2 custom order toggle: favorite node ordering is saved in `node_library.json`; global node ordering is saved locally per tree folder.
- Nodes2 unknown-source folders are labeled "来源未知" / "Unknown source" and pinned to the top of node trees.
- Nodes2 node preview was resized toward the official preview-card scale.
- Nodes2 node row action buttons are hidden by default and appear on row hover/selection.
- Nodes2 node rows show a small leading dot before the node name.
- Pending node placement shows a floating preview card near the mouse while moving over the canvas.
- Missing/invalid favorite nodes render with a dimmer visual style so unavailable third-party nodes are distinguishable without being deleted.
- Workflows2 and Nodes2 text-size sliders have a wider upper visual range and looser row spacing at larger values.
- Default folder/file icons now use PrimeIcons class rendering with fallback support.
- Workflows2 folders support custom PrimeIcons class or emoji icon plus custom color, stored in `folder_meta.json`.
- Nodes2 favorite groups support custom PrimeIcons class or emoji icon plus custom color, stored in `node_library.json`.
- Nodes2 root-level node rows no longer inherit nested-folder left offset.
- Workflows2 hides the `.json` suffix in workflow row display names while keeping real file paths unchanged.
- Workflows2 folder personalization is now handled through a combined personalization dialog instead of separate icon/color prompts.
- Workflows2 new folder/subfolder creation now creates the folder first and enters inline rename mode.
- Canvas Groups initial module is implemented, reusing Xiaozhuguang group logic for selected-node group creation, overlay rendering, move/resize/delete, bypass toggling, and workflow save/restore through `extra.xzgGroups`.
- Canvas Groups sidebar functionality was implemented, then the separate sidebar tab was hidden for now; canvas grouping remains available through shortcuts/context actions.
- Ctrl+G creates a Workspace2 canvas group when Workspace2 grouping is enabled and the conflicting official keybinding is removed.
- Shift+G is reserved for ungrouping behavior.
- Group style settings can be applied and saved as default group style.
- Title2 node was migrated as a Workspace2 title/annotation node.
- Title2 default values were adjusted to font size 24, opacity 0, and radius 15.
- Title2 toolbar supports Esc close.
- Workflows2 and Nodes2 folder/favorite-group personalization use a combined "个性化" flow for icon and color.
- Nodes2 favorite group creation and subfolder creation now create the group first and enter inline rename mode.
- Nodes2 favorite groups persist `parentId`, so new subfolders save under the intended parent group.

## Partially Complete

- Node preview: functional, but still needs closer visual refinement against ComfyUI's `NodePreviewCard.vue` and `LGraphNodePreview.vue` proportions.
- Usage statistics: `useCount` and `lastUsed` are stored and updated for matching favorites, but there is no Recent/Frequent browse or sort UI yet.
- Search: strong basic weighted search is implemented, but pinyin search and fuzzy search are not implemented.
- Sort: original, alphabetical, and manual custom order are implemented; frequent/recent/rating sort modes from the long-term plan are not complete.
- N-Sidebar migration: preview/import exists and is non-destructive, but still needs more real-data validation.
- Official favorites sync: probe, import, and write-back are implemented; live automatic two-way sync with the official node manager is not implemented.
- Official favorites grouping probe: candidate group extraction is implemented for ComfyUI bookmark folder markers and grouped object/list candidates.
- Official favorites grouping has been validated with copied main-package settings in the test package: `Bookmarks.V2` reports 101 node entries and 8 groups.

## Not Started

- Pinyin full/initial search.
- Fuzzy search mode.
- Recent-use sort mode.
- Frequent-use sort mode.
- Rating/star sort mode and rating edit UI.
- Optional setting to hide ComfyUI's official node manager.
- Canvas Groups advanced visual system: unified color presets, icon/color picker reuse, animation border presets, automatic node capture, and a fuller settings panel.

## In Progress

- Manual browser validation of the current Phase 1 feature set.
- Manual validation of the official-style recursive category tree after expanding nested folders.
- Manual validation of the new shared top layout, aligned sliders, three multi-select filters, and Shift+W / Shift+N / Shift+1 / Shift+2 shortcuts.
- GitHub private-release preparation.

## Current Feedback Backlog

### Workflows2

- Manual validation of custom-order toggle and row-handle reordering.
- Final review of release-facing README wording and screenshots if screenshots are added later.

### Nodes2

- No open drag UX backlog after the latest validation pass.
- Future: pinyin search, recent/frequent sorting, and closer preview-card visual polish.

## Next

1. Finish GitHub private-release cleanup: README, notices, changelog, pyproject, gitignore, and release-prep review.
2. Decide what to do with legacy tracked `ui/` and `dist/` folders before the first push.
3. Manual validation pass for Workflows2 custom-order toggle and the current Phase 1 feature set.
4. Refine node preview visuals against the official preview components.
5. Add Recent/Frequent sort modes using existing `useCount` and `lastUsed` fields.
6. Add pinyin search.
7. After Canvas Groups manual validation, design the shared icon/color system for Workflows2 folders, Nodes2 favorite groups, and Canvas Groups.

## Decisions

- N-Sidebar is the primary reference for the Nodes2 manager structure.
- Xiaozhuguang is only an enhancement reference for pinyin search, recent/frequent sorting, rating, and later Canvas Groups.
- Do not migrate Xiaozhuguang custom nodes, theme system, widgets, or full UI panel.
- Do not implement SUBGRAPH BLUEPRINTS in the first Nodes2 phase.
- Do not implement PARTNER NODES in the first Nodes2 phase.
- Do not implement Canvas Groups inside Nodes2.
- Official frontend components and services may be used only behind a Workspace2 adapter with runtime detection and fallback behavior.
- Official node favorites sync starts with read-only probing and confirmed import. In the test package, official bookmarks were found in `user/default/comfy.settings.json` under `Comfy.NodeLibrary.Bookmarks.V2`.
- Writing Nodes2 favorites back into official ComfyUI settings uses `Comfy.NodeLibrary.Bookmarks.V2`, preserves `Comfy.NodeLibrary.BookmarksCustomization`, and creates a timestamped settings backup first.
- Do not hard-code ComfyUI frontend asset hash filenames for official component imports.
- If official preview/category/sort services are not reachable from the extension runtime, keep the current `/object_info` and LiteGraph fallback paths.
- Current runtime and log investigation shows official node-library DOM is visible after opening the official tab, but node organization services, Vue app context, and preview components are not exposed as stable plugin-callable objects.
- COMFY NODES / EXTENSIONS classification follows official-style `python_module` source detection: `nodes`, `comfy_extras`, and `comfy_api_nodes` are core; `custom_nodes.*` is extension.
- ESSENTIALS is not shown in the simple Nodes2 view. Nodes2 currently focuses on three visible sections: Bookmarked, Comfy nodes, and loaded extension nodes.
- COMFY NODES use full category paths. EXTENSIONS use plugin-source folders first, then third-party category paths underneath the plugin, so reused category names such as image/model/video do not appear as top-level extension groups.

## Manual test checklist

- Confirm ComfyUI starts without Workspace2 errors.
- Confirm Workflows2 still works after Nodes2 changes.
- Confirm Workflows2 and Nodes2 appear as separate sidebar tabs.
- Confirm the separate Canvas Groups sidebar tab remains hidden.
- Select one or more nodes and create a Workspace2 group from the shortcut/context action, then confirm an overlay group appears.
- Confirm Ctrl+G still creates a Canvas Group from selected nodes.
- Move and resize a Canvas Group on the canvas.
- Rename a Canvas Group from the sidebar.
- Locate a Canvas Group from the sidebar.
- Toggle bypass/restore from the sidebar.
- Delete a Canvas Group from the sidebar and confirm nodes remain.
- Save and reload a workflow and confirm Canvas Groups restore from workflow data.
- Press Shift+W and Shift+1 and confirm Workflows2 opens.
- Press Shift+N and Shift+2 and confirm Nodes2 opens.
- Type in Workflows2 and Nodes2 search inputs and confirm ComfyUI does not switch sidebar tabs.
- Drag a Workflows2 workflow over a collapsed folder and confirm the folder target highlights.
- Drag a Workflows2 workflow over an expanded folder's child area and confirm the parent folder can still be targeted.
- Drag a Workflows2 workflow and confirm row text is not selected.
- Drag a Workflows2 workflow over valid folders and confirm visible hover/drop highlighting.
- Toggle Workflows2 custom order and confirm row handle reorder works without breaking regular sorting.
- Toggle Workflows2 regular sort and confirm name/date modes switch without changing files.
- Search `KSampler`.
- Search `Load`.
- Search by category text.
- Favorite a node from a normal node row.
- Drag a normal node into the favorite root.
- Drag a normal node into a custom favorite group.
- Remove a favorite.
- Rename favorite alias.
- Create a favorite group.
- Rename a favorite group.
- Delete a favorite group and confirm its favorites move to the favorite root.
- Drag favorite to another group.
- Drag favorite back to the favorite root.
- Reorder favorites inside a group.
- Drag Nodes2 rows/favorites and confirm row text is not selected.
- Drag Nodes2 rows/favorites over valid favorite targets and confirm visible hover/drop highlighting.
- Refresh browser and confirm favorites/groups persist.
- Drag a node to canvas.
- Click a node, then click canvas to place it.
- Press Esc to cancel pending placement.
- Confirm creating a favorite node updates `useCount` and `lastUsed`.
- Hover a node and inspect preview.
- Scroll down, left-click a node, and confirm the list does not jump to top.
- Scroll down, right-click a node, and confirm the list does not jump to top.
- Scroll down, toggle a folder with the disclosure icon, and confirm the tree does not jump to top.
- Click a category folder row text and confirm it toggles open/closed.
- Adjust Nodes2 text-size slider and confirm node font and row density change only in Nodes2.
- Confirm Workflows2 and Nodes2 sliders have aligned visual width.
- Right-click a Workflows2 folder and confirm change icon, change color, and reset style work.
- Confirm Workflows2 folder icon/color persist after browser refresh.
- Click Nodes2 favorite group icon/color/reset buttons and confirm the group style updates.
- Confirm Nodes2 favorite group icon/color persist after browser refresh.
- Confirm Nodes2 root-level node rows align differently from nested category child rows only where intended.
- Toggle Bookmarked / Comfy / Extensions multi-select filters and confirm sections show/hide without entering separate pages.
- Confirm at least one of the three section filters remains enabled.
- Confirm SUBGRAPH BLUEPRINTS and PARTNER/API sections do not appear.
- Confirm COMFY NODES groups render nested folders instead of flat long paths such as `model/conditioning/gligen`.
- Expand COMFY NODES category folders and confirm nested subfolders render with indentation.
- Toggle Nodes2 sort and confirm original/alphabetical modes switch.
- Search while category folders are collapsed and confirm matching categories auto-expand.
- Right-click a normal node and confirm favorite/place/copy menu items.
- Right-click a favorite node and confirm rename/remove/place/copy menu items.
- Confirm no `Default favorites` folder is shown; ungrouped favorites appear directly below Bookmarked.
- If N-Sidebar data exists, confirm migration preview is shown.
- Import N-Sidebar data and confirm the original N-Sidebar files are not modified.
- Confirm invalid imported nodes are marked invalid rather than deleted.
- Click Nodes2 import official favorites and confirm the dialog shows total/new counts.
- Confirm importing official favorites adds new nodes to the Bookmarked root and skips existing favorites.
