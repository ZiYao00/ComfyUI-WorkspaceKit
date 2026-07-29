# entry.js Structure Map

Navigation index for the **internals** of `entry/entry.js` (~12,200 lines). Its
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

### Official-ComfyUI adapter & favorites probing — L1306–1630
Reflection into ComfyUI's Vue app to detect node objects, DOM, and native
favorites. Key: `findOfficialVueApp` (L1334), `findOfficialNodeObjects` (L1354),
`detectOfficialNodeAdapter` (L1415), `detectOfficialFavoritesProbe` (L1498),
`collectOfficialFavoritesFromProbe` (L1528), `importWorkspace2FavoritesToOfficial` (L1608).

### Locale, panel-provider lifecycle & shortcuts — L1631–2010
i18n helpers, panel-provider registration lifecycle, keyboard shortcuts.
Key: `detectLocale` (L1636), `workspacePanelProviders` (L1668),
`setupWorkspacePanelProviderLifecycle` (L1701), `t` (L1747),
`setupWorkspaceKeyIsolation` (L1772), `setupWorkspaceShortcuts` (L1795), `openWorkspace2Module` (L1970).

### Panel appearance / glass / background — L2010–2320
Panel opacity, glass-blur overlay, background compositing. Key: `isPanelGlassEnabled` (L2021),
`disposeWorkspace2SidebarSurface` (L2055), `applyWorkspaceBackgroundEffect` (L2157),
`syncWorkspaceGlassOverlay` (L2256), `setPanelOpacity` (L2301), `setGlassBlur` (L2314).

### Settings dialog & data management — L2320–2636
Import/export of the workspace data bundle; settings dialog assembly.
Key: `exportWorkspaceDataBundle` (L2371), `importWorkspaceDataBundle` (L2384),
`createWorkspaceDataManagementSection` (L2420), `buildSettingsDialogSections` (L2444),
`buildSettingsDialogShell` (L2505), `openWorkspaceSettings` (L2523).

### Dialogs & confirm/notice overlays — L2637–3030
Tab activation and modal confirm/notice/inline-confirm primitives.
Key: `registerWorkspace2CanvasGroupCommands` (L2637), `activateWorkspace2Tab` (L2666),
`workspace2Confirm` (L2749), `workspace2Notice` (L2821),
`workspace2ConfirmDirtyWorkflowClose` (L2887), `workspace2InlineConfirm` (L2961).

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

### Node library: definitions, search, favorites — L7032–7815
Node-definition parsing/wrapping, search scoring (incl. pinyin), favorite/group CRUD.
Key: `restoreNodeLibraryFromFile` (L7061), `wrapObjectInfoNode` (L7281), `getNodeDefinitions` (L7339),
`pinyinText` (L7396), `officialNodeSearchScores` (L7565), `sortNodeSearchResults` (L7585),
`createNodeGroup` (L7621), `addFavoriteNode` (L7716), `moveFavoriteToGroup` (L7739).

### Node grouping, imports & drag/drop — L7816–8992
Node grouping/labels, N-Sidebar & official-favorites import, node pointer/canvas
drag-drop. Key: `groupedNodes` (L7806), `importNSidebarPreview` (L8061),
`importOfficialFavorites` (L8099), `openOfficialFavoritesMenu` (L8212),
`makeNodeCanvasDragSource` (L8297), `beginNodeReorderDrag` (L8464),
`commitNodeGroupPointerDrag` (L8598), `setupNodeCanvasDrop` (L8878).

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

### Sidebar registration, remount recovery & extension bootstrap — L11865–12178
Registers the ComfyUI sidebar tab, remount recovery, context-menu ordering, and
the `app.registerExtension` composition root with staged `setup()`.
Key: `registerWorkspace2SidebarTab` (L11874), `installWorkspace2SidebarEmojiIcon` (L11903),
`recoverWorkspace2SidebarAfterRemount` (L11951), `setupWorkspace2ContextMenuOrdering` (L11991),
`app.registerExtension({...})` (L12047), staged `setup()` (L12113).

---

## Extraction candidates (for future modularization)

Ordered roughly by ease. Each is self-contained; extract one at a time with
verification (see Step 3 of the large-file plan).

| Candidate | Lines | Why it's extractable |
| --- | --- | --- |
| ~~`styles` CSS literal~~ | ~~L3096–5324~~ | ✅ **Extracted** to `entry/ui/styles.js` (2026-07-29) — see MODULE_MAP |
| ~~`FALLBACK_STRINGS` table~~ | ~~L181–650~~ | ✅ **Extracted** to `entry/core/fallback-strings.js` (2026-07-29) — see MODULE_MAP |
| Official adapter + favorites probing | L1306–1630 | Cohesive reflection-into-ComfyUI feature, no UI; → `integrations/official-node-adapter.js` |
| Panel appearance / glass / background | L2010–2320 | Self-contained visual subsystem keyed off `panelBackgroundState`; → `ui/panel-appearance.js` |
| Node drag/drop cluster | L8297–8992 | Self-contained pointer/canvas DnD engine; → `nodes/drag-drop.js` (mirrors `templates/drag-drop.js`) |
| Node search/scoring | L7375–7609 | Pure pinyin + fuzzy + official scoring; → `nodes/search.js` (parallels `workflows/search.js`) |
| Confirm/notice/inline-confirm dialogs | L2749–3030 | Generic modal primitives, no domain coupling; → `ui/dialogs.js` |

_Last generated: 2026-07-29. Regenerate after large edits — line numbers drift._
