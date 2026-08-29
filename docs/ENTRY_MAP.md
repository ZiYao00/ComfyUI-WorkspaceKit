# entry.js Structure Map

Navigation index for the **internals** of `entry/entry.js` (~8,050 lines). Its
purpose is to let anyone (human or AI) jump straight to the relevant region
instead of reading the whole file — reading a 12k-line file wastes tokens and
dilutes working context. See the large-file rules in `CLAUDE.md` / `AGENTS.md`.

**How this differs from [MODULE_MAP.md](MODULE_MAP.md):** MODULE_MAP indexes the
sibling modules already *extracted out of* entry.js (under `entry/core/`,
`entry/nodes/`, etc.). This file indexes what *remains inside* entry.js.

**How to use:** Find your feature's region below, note the key symbol names, then
`Grep` for the symbol in `entry/entry.js` and read only the lines around the hit.
Do **not** read the whole file. Line numbers are approximate anchors and drift as
the file changes — **search by symbol name, treat line numbers as hints only.**
entry.js is the "composition root": most remaining functions are thin
orchestrators that call into the extracted modules.

---

## Regions (in reading order)

### Imports — L1–160
ES-module imports of already-extracted sibling modules (`core/`, `nodes/`,
`templates/`, `ui/`, `workflows/`, `settings/`, `canvas-groups/`, `integrations/`).
Key: `app` (L1), `workspace2CanvasGroups` (L3), `EXTENSION_NAME` + perf helpers (L9–13, L109–159).

### Constants & config keys — L161–252 (approx, post-split)
localStorage keys, node-category taxonomy tables. **The `FALLBACK_STRINGS`
i18n table (old L182–651) has been extracted to
[`entry/core/fallback-strings.js`](../entry/core/fallback-strings.js); entry.js
now imports it.** Key: `WORKSPACE2_MENU_MARK` (L180), `CORE_NODE_MODULES`,
`NODE_SOURCE`, `ESSENTIALS_CATEGORY_ORDER/NODES/MAP/RANK`, `COMFY_CATEGORY_LABEL_KEYS`,
`COMFY_CATEGORY_ORDER_KEYS`. All line numbers below are now ~2700 lower than the
original map — regenerate.

### Global state & service wiring — L723–1305
Constructs extracted-module service instances and shared mutable state. The
composition root proper. Key: `state` (L728), `canvasGroupsState` (L783),
`workspaceState` (L802), `templatesState` (L972), `nodesState` (L1111),
`workflowTree/Search/Results/ContextMenu/Trash/Items` factories (L860–930),
`personalizationPanel` (L937), `loadNodeLibrary` (L1290).

### Official-ComfyUI adapter & favorites probing — EXTRACTED
Reflection into ComfyUI's Vue app / node objects / DOM / native favorites and
the favorites-import action have been extracted to
[`entry/integrations/official-node-adapter.js`](../entry/integrations/official-node-adapter.js)
via the `createOfficialNodeAdapter` factory (2026-07-29). entry.js injects
`nodesState`, `t`, `limitedKeys`, `valueAtPath`, `loadNodeLibrary`,
`renderNodesPanel`; the module imports `app`/`fetchJson`/`postJson`/
`OFFICIAL_NODE_ADAPTER_KEY` directly. See MODULE_MAP.

### Locale, panel-provider lifecycle & shortcuts — L1631–2010
i18n helpers, panel-provider registration lifecycle, keyboard shortcuts.
Key: `detectLocale` (L1636), `workspacePanelProviders` (L1668),
`setupWorkspacePanelProviderLifecycle` (L1701), `t` (L1747),
`setupWorkspaceKeyIsolation` (L1772), `setupWorkspaceShortcuts` (L1795), `openWorkspace2Module` (L1970).

### Panel appearance / glass / background — EXTRACTED
Panel opacity, glass-blur overlay, and background compositing have been
extracted to [`entry/ui/panel-appearance.js`](../entry/ui/panel-appearance.js)
via the `createPanelAppearance` factory (2026-07-29). entry.js injects
`workspaceState`, `t`, `WORKSPACE2_TAB_ID`, `isElementVisible`, and the
`panelBackgroundState` getters/setters. `isElementVisible` stays in entry.js
(it also serves panel-open detection). See MODULE_MAP.

### Settings dialog & data management — L2320–2636
Import/export of the workspace data bundle; settings dialog assembly.
Key: `exportWorkspaceDataBundle` (L2371), `importWorkspaceDataBundle` (L2384),
`createWorkspaceDataManagementSection` (L2420), `buildSettingsDialogSections` (L2444),
`buildSettingsDialogShell` (L2505), `openWorkspaceSettings` (L2523).

### Dialogs & confirm/notice overlays — L2637–3030
Tab activation. **The modal confirm/notice/inline-confirm primitives
(`workspace2Confirm`, `workspace2Notice`, `workspace2ConfirmDirtyWorkflowClose`,
`workspace2InlineConfirm`) have been extracted to
[`entry/ui/dialogs.js`](../entry/ui/dialogs.js) via the
`createWorkspace2Dialogs` factory; entry.js wires them with injected `t`,
`isolateComfyKeys`, and `closeWorkspace2OverlaysForConfirm`.**
Key: `registerWorkspace2CanvasGroupCommands`, `activateWorkspace2Tab`.

### Locale watcher — L3031–3094
Locale hot-reload. Key: `loadLocale` (L3031), `refreshLocaleIfChanged` (L3050),
`startLocaleWatcher` (L3064), `DEFAULT_GRAPH` (L3075). **The `styles` CSS literal
that used to follow here (old L3096–5324) has been extracted to
[`entry/ui/styles.js`](../entry/ui/styles.js); entry.js now imports `styles`.**
All line numbers below this point are ~2228 lower than shown — regenerate.

### Workflow management — L5325–6075
Load/open/save/rename/move/trash workflows + folders and trash lifecycle.
Key: `loadWorkflows` (L5371), `openWorkflow` (L5536), `saveCurrentWorkflowToPath` (L5628),
`createFolder` (L5689), `renameItem` (L5767), `moveItem` (L5849), `moveToTrash` (L5915),
`restoreTrashItem` (L6002), `emptyTrash` (L6053), `pollForExternalChanges` (L5945).

### Icon/button helpers & template CRUD — L6076–7031
Shared icon/button builders; node-template save/place/rename/delete + template
groups & trash. Key: `iconSvg` (L6076), `toolbarButton` (L6118), `createTemplateGroup` (L6185),
`serializeSelectedTemplate` (L6487), `saveSelectedNodesAsTemplate` (L6529),
`addTemplateToCanvas` (L6682), `deleteTemplate` (L6858), `renderTemplateTrashBody` (L6903),
`openTemplateGroupContextMenu` (L7016).

### Node library: definitions, favorites — L7032–7815
Node-definition parsing/wrapping and favorite/group CRUD. **Search scoring
(`pinyinText`, `officialNodeSearchScores`, `sortNodeSearchResults`, etc.) has
been extracted to [`core/search-scoring.js`](../entry/core/search-scoring.js)
(generic primitives) and [`nodes/search.js`](../entry/nodes/search.js)
(node-specific, via `createNodeSearch`); entry.js imports/injects them.**
Key: `restoreNodeLibraryFromFile`, `wrapObjectInfoNode`, `getNodeDefinitions`,
`createNodeGroup`, `addFavoriteNode`, `moveFavoriteToGroup`.

### Node grouping & imports — approx L4096–4620
Node grouping/labels, N-Sidebar & official-favorites import. Key: `groupedNodes`,
`importNSidebarPreview`, `importOfficialFavorites`, `openOfficialFavoritesMenu`.
**Node pointer/canvas drag-drop was extracted to
[`nodes/drag-drop.js`](../entry/nodes/drag-drop.js) (2026-07-30) via
`createNodeDragDrop`.** `canvasPositionFromClient` / `isCanvasDropTarget` remain
in entry.js (external callers) and are injected into the factory.

### UI-scale / density / sort controls — L8993–9553
Font/UI-scale sliders, density controls, recent-workflow store, sort menus, module
tabs. Key: `fontControl` (L8993), `applyWorkflowUiScale` (L9145), `applyNodeUiScale` (L9175),
`nodesDensityControl` (L9201), `openNodeSortMenu` (L9365), `openWorkflowSortMenu` (L9455),
`workspaceTabPlan` (L9550), `renderWorkspace2Panel` (L9554).

### Workflow drag/drop & tree render — L9554–10156
Workflow pointer drag-drop, drop-target hit testing, context menu, tree node render.
Key: `makeDropTarget` (L9651), `updateWorkflowReorderDrag` (L9756), `commitPointerDrag` (L9926),
`openContextMenu` (L9984), `createWorkflowRenameInput` (L10013), `renderNode` (L10030),
`recentWorkflowRows` (L10076).

### Panel renderers (workflows/groups/templates/nodes) — L10157–11864
Top-level render functions for each sidebar module + node preview popovers/menus.
Key: `renderPanel` (L10157), `renderCanvasGroupsPanel` (L10443), `renderTemplatesPanel` (L10701),
`renderNodesPanel` (L10850), `showNodePreview` (L10939), `openNodeContextMenu` (L11151),
`renderFavoriteGroupFolder` (L11550), `renderEssentialsNodeSection` (L11739), `showFallbackPanel` (L11855).

### Sidebar registration, remount recovery & extension bootstrap — L8562–8950
Registers the ComfyUI sidebar tab, remount recovery, context-menu ordering, the
top-bar Save button, and the `app.registerExtension` composition root with
staged `setup()`.
Key: `registerWorkspace2SidebarTab` (L8562), `installWorkspace2SidebarIcon` (L8591),
`installWorkspaceTopbarSaveButton` (L8655), `recoverWorkspace2SidebarAfterRemount` (L8698),
`setupWorkspace2ContextMenuOrdering` (L8738), `app.registerExtension({...})` (L8795).
The sidebar entry draws the 🧩 marker as a colour glyph through a `::before`
rule; `installWorkspace2SidebarIcon` no longer renders the Icon Kit's
single-colour mask, because a `currentColor` mask was indistinguishable from the
native icons around it. The `icon: "pi pi-sitemap"` in the registration call is a
required class-string fallback for ComfyUI's `registerSidebarTab()`, not the
visible icon. `installWorkspaceTopbarSaveButton` only wires accessors; the
placement and state rules live in `entry/ui/topbar-save-button.js`.

---

## Extraction candidates (for future modularization)

Ordered roughly by ease. Each is self-contained; extract one at a time with
verification (see Step 3 of the large-file plan).

| Candidate | Lines | Why it's extractable |
| --- | --- | --- |
| ~~`styles` CSS literal~~ | ~~L3096–5324~~ | ✅ **Extracted** to `entry/ui/styles.js` (2026-07-29) — see MODULE_MAP |
| ~~`FALLBACK_STRINGS` table~~ | ~~L181–650~~ | ✅ **Extracted** to `entry/core/fallback-strings.js` (2026-07-29) — see MODULE_MAP |
| ~~Official adapter + favorites probing~~ | ~~L1306–1630~~ | ✅ **Extracted** to `entry/integrations/official-node-adapter.js` (2026-07-29) via `createOfficialNodeAdapter` factory — see MODULE_MAP |
| ~~Panel appearance / glass / background~~ | ~~L2010–2320~~ | ✅ **Extracted** to `entry/ui/panel-appearance.js` (2026-07-29) via `createPanelAppearance` factory — see MODULE_MAP |
| ~~Node drag/drop cluster~~ | ~~L8297–8992~~ | ✅ **Extracted** to `entry/nodes/drag-drop.js` (2026-07-30) via `createNodeDragDrop` factory. `canvasPositionFromClient`/`isCanvasDropTarget` deliberately kept in entry.js (external callers) and injected. See MODULE_MAP |
| ~~Node search/scoring~~ | ~~L7375–7609~~ | ✅ **Extracted** (2026-07-29): generic primitives → `core/search-scoring.js`, node-specific → `nodes/search.js` via `createNodeSearch` factory. Dead `fuzzySearchMatch`/`nodeSearchText`/`nodePinyinSearchText` removed. See MODULE_MAP |
| ~~Confirm/notice/inline-confirm dialogs~~ | ~~L2749–3030~~ | ✅ **Extracted** to `entry/ui/dialogs.js` (2026-07-29) via `createWorkspace2Dialogs` factory — see MODULE_MAP |

_Last generated: 2026-07-29. The sidebar-bootstrap region's line numbers and the
total line count were refreshed on 2026-08-03; every other region below the
`styles`/`FALLBACK_STRINGS` extractions still carries its pre-extraction offsets
and is stale by the amounts noted inline. Search by symbol name — treat all line
numbers here as hints only, and regenerate after large edits._
