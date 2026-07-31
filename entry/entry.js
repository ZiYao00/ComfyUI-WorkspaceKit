import { app } from "../../scripts/app.js";
import { pinyin as pinyinPro } from "./pinyin-pro.esm.js";
import { workspace2CanvasGroups } from "./workspace2_canvas_groups.js?v=20260727_group_reverse_conversion_c6_4";
import { installRgthreeFastGroupsBridge } from "./integrations/rgthree-fast-groups.js?v=20260722_rgthree_fast_groups_p0";
import { publishWorkspaceKitPanelApi, registerPendingWorkspaceKitPanelProviders } from "./integrations/panel-api.js";
import { publishWorkspaceKitPanelUiTemplate } from "./integrations/panel-ui-template-api.js";
import { fetchJson, postJson } from "./core/api.js";
import { createWorkspaceStartupStageRunner } from "./core/startup-stage.js?v=20260724_startup_stage_isolation_r1";
import {
  installPerformanceDebugApi,
  measurePromise,
  startPerformanceSpan,
} from "./core/performance.js";
import { withNodeIndexRefreshLock } from "./nodes/cache-coordinator.js";
import { createNodePanelState } from "./nodes/panel-state.js";
import { createNodeLibraryNormalizer } from "./nodes/library-normalizer.js";
import { createNodeLibraryLoader } from "./nodes/library-loader.js";
import { createNodeObjectInfoState } from "./nodes/object-info-state.js";
import { createNodeObjectInfoCache } from "./nodes/object-info-cache.js";
import { createNodeObjectInfoRefreshCoordinator } from "./nodes/object-info-refresh.js";
import { createNodeFavoriteStore } from "./nodes/favorite-store.js";
import { createNodeFavoriteGroupStore } from "./nodes/favorite-group-store.js";
import { createOfficialNodeTreeBuilder } from "./nodes/official-tree.js";
import { createOfficialNodeTreeRenderer } from "./nodes/official-tree-renderer.js";
import { createNodeRowRenderer } from "./nodes/row-renderer.js";
import { createNodeTopSectionRenderer } from "./nodes/top-section-renderer.js";
import { createNodeCategoryProjection } from "./nodes/category-projection.js";
import { mergeNodeDefinitionSources } from "./nodes/definition-merge.js";
import { createNodeDragDrop } from "./nodes/drag-drop.js";
import { createTemplateLibraryStore } from "./templates/library.js";
import { createTemplateSearch } from "./templates/search.js";
import { createTemplateResultsProjection } from "./templates/results-projection.js";
import { createTemplateRootRenderer } from "./templates/root-renderer.js";
import { createTemplateBodyStateRenderer } from "./templates/body-state-renderer.js";
import { createTemplateGroupContentsRenderer } from "./templates/group-contents-renderer.js";
import { openTemplateGroupContextMenu as openTemplateGroupContextMenuRenderer } from "./templates/group-context-menu.js";
import { createTemplateDragDrop } from "./templates/drag-drop.js";
import { createTemplateGroupHeaderRenderer } from "./templates/group-header-renderer.js";
import { createTemplateRowRenderer } from "./templates/row-renderer.js";
import { renderTemplateContextMenu as renderTemplateContextMenuRenderer } from "./templates/context-menu-renderer.js";
import { createTemplateMinimap } from "./templates/minimap.js";
import {
  emptyTemplateTrash as emptyTemplateTrashStore,
  moveTemplateToTrash,
  permanentlyDeleteTemplateFromTrash,
  restoreTemplateFromTrash,
} from "./templates/trash-store.js";
import { createPersonalizationPanel } from "./ui/personalization-panel.js";
import { setExpandedRecursive } from "./ui/tree-expansion.js";
import { applyDecoratedIcon } from "./ui/decorated-icon.js";
import { createPreviewPositioner } from "./ui/preview-positioner.js";
import { createPanelChrome } from "./ui/panel-chrome.js";
import { shouldCloseWorkspaceModule } from "./ui/module-toggle.js";
import { createPanelBackgroundState } from "./ui/panel-background-state.js";
import { createPanelAppearance } from "./ui/panel-appearance.js";
import { styles } from "./ui/styles.js";
import { createWorkspace2Dialogs } from "./ui/dialogs.js";
import { createOfficialNodeAdapter } from "./integrations/official-node-adapter.js";
import { createWorkspacePanelHost } from "./ui/workspace-panel-host.js";
import { resolveWorkspacePanelProviderLabel } from "./ui/provider-label.js";
import { PINNED_PROVIDER_KEY, createWorkspaceTabPlan } from "./ui/provider-tabs.js";
import { MODULE_SHORTCUTS, isModuleShortcutEnabled, moduleShortcutStorageKey, resolveModuleShortcut } from "./ui/module-shortcuts.js";
import { GROUP_POINTER_ACTION, GROUP_POINTER_BINDINGS_KEY, GROUP_POINTER_MODIFIER, normalizeGroupPointerBindings, swapGroupPointerBinding } from "./canvas-groups/pointer-actions.js?v=20260724_configurable_modifiers_r1";
// Settings controls and sections change their return contracts independently.
// Keep their cache keys aligned with entry.js to avoid a refreshed entry using
// an older child module from a long-lived ComfyUI browser session.
import { createSettingsControls } from "./settings/controls.js?v=20260727_group_settings_r1";
// Bump this query when the section return contract changes. ComfyUI browser
// sessions can retain an imported child module after entry.js has refreshed;
// an old section factory would otherwise omit a newly added section.
import { createSettingsDialogSections } from "./settings/dialog-sections.js?v=20260727_group_reverse_conversion_c6_3";
import { createSettingsDialogShell } from "./settings/dialog-shell.js";
import { configureI18n, getLocale, t as translate } from "./core/i18n.js";
import { FALLBACK_STRINGS } from "./core/fallback-strings.js";
import {
  compactSearchFields,
  compareSearchScores,
  genericSearchScores,
} from "./core/search-scoring.js";
import { createNodeSearch } from "./nodes/search.js";
import {
  closeOfficialWorkflow,
  getActiveOfficialWorkflow,
  getOfficialWorkflowByPath,
  getOfficialWorkflowStore,
  getOpenOfficialWorkflows,
  loadOfficialWorkflow,
  saveOfficialWorkflow,
  subscribeOfficialWorkflowStore,
} from "./workflows/official-adapter.js";
import { createWorkflowRecentStore } from "./workflows/recents.js";
import { createWorkflowOpenState } from "./workflows/open-state.js";
import { createWorkflowSectionRenderer } from "./workflows/sections.js";
import { createWorkflowResultsRenderer } from "./workflows/results-renderer.js";
import { createWorkflowContextMenuRenderer } from "./workflows/context-menu-renderer.js";
import { createWorkflowTrashRenderer } from "./workflows/trash-renderer.js";
import { createWorkflowItemStore } from "./workflows/item-store.js";
import { createWorkflowPathState } from "./workflows/path-state.js";
import { createWorkflowFolderMetaService } from "./workflows/folder-meta.js";
import { createWorkflowCustomOrderStore } from "./workflows/custom-order-store.js";
import { createWorkflowTreeInteraction } from "./workflows/tree-interaction.js";
import { createWorkflowTreeBuilder } from "./workflows/tree-builder.js";
import { createWorkflowSearch } from "./workflows/search.js";
import { createWorkflowRenameInputFactory } from "./workflows/rename-input.js";
import { createWorkflowOpenListRenderer } from "./workflows/open-list-renderer.js";
import { resolveWorkflowPointerDropHit } from "./workflows/pointer-drop-target.js?v=20260724_pointer_drop_hit_r1";
import {
  joinPath,
  normalizeMetaPath,
  parentPath,
  relativeWorkflowPathFromOfficial,
  replaceWorkflowPathPrefix,
  workflowPathIsWithin,
  workflowRenameTargetPath,
} from "./workflows/path-utils.js";
import { renderWorkflowBrowseNode } from "./workflows/row-renderer.js";
import {
  closeWorkflowSortMenu as closeWorkflowSortMenuRenderer,
  openWorkflowSortMenu as openWorkflowSortMenuRenderer,
} from "./workflows/sort-menu-renderer.js";
import {
  CANVAS_GROUP_CTRL_G_KEY,
  CANVAS_GROUPS_TAB_ID,
  COMFY_NODE_DRAG_TYPE,
  DEFAULT_FILE_ICON_CLASS,
  DEFAULT_FOLDER_ICON_CLASS,
  DEFAULT_FOLDER_OPEN_ICON_CLASS,
  DEFAULT_LOCALE,
  DRAG_TYPE,
  EXTENSION_NAME,
  FAVORITE_DRAG_TYPE,
  FONT_SCALE_KEY,
  FONT_SCALE_LINEAR_KEY,
  NODE_CUSTOM_ORDER_ENABLED_KEY,
  NODE_CUSTOM_ORDER_KEY,
  NODE_DEFAULT_GROUP_ID,
  NODE_DRAG_TYPE,
  NODE_FONT_SCALE_KEY,
  NODE_OBJECT_INFO_CACHE_DB,
  NODE_OBJECT_INFO_CACHE_KEY,
  NODE_OBJECT_INFO_CACHE_STORE,
  NODE_OBJECT_INFO_FETCH_TIMEOUT,
  NODE_PREVIEW_MODE_KEY,
  NODE_PREVIEW_MODES,
  NODE_ROW_SPACING_KEY,
  NODE_SEARCH_RENDER_DELAY,
  NODE_SEARCH_RESULT_LIMIT,
  NODE_SECTION_FILTERS,
  NODE_SORT_KEY,
  NODE_SORTS,
  NODE_UI_SCALE_KEY,
  NODE_VISIBLE_SECTIONS_KEY,
  OFFICIAL_NODE_ADAPTER_KEY,
  TEMPLATE_DRAG_TYPE,
  TEMPLATE_GROUP_DRAG_TYPE,
  TEMPLATE_SORT_KEY,
  TEMPLATE_SORTS,
  TEMPLATE_UI_SCALE_KEY,
  WORKFLOW_CUSTOM_ORDER_KEY,
  WORKFLOW_FOLDER_FIRST_KEY,
  WORKFLOW_ORDER_KEY,
  WORKFLOW_RECENT_KEY,
  WORKFLOW_RECENT_LIMIT_KEY,
  WORKFLOW_SEARCH_RENDER_DELAY,
  WORKFLOW_SORT_KEY,
  WORKFLOW_SORTS,
  WORKSPACE2_ALT_C_OPEN_TEMPLATES_KEY,
  WORKSPACE2_MODULE_KEY,
  WORKSPACE2_MODULES,
  WORKSPACE2_TAB_ID,
} from "./core/constants.js";

const WORKFLOW_OPEN_SECTION_COLLAPSED_KEY = "workspace2.workflows.openCollapsed";
// This is a host preference, not a security boundary. It controls whether
// optional Provider tabs can be merged into WorkspaceKit's sidebar shell.
const WORKSPACE2_PANEL_INTEGRATIONS_ENABLED_KEY = "workspace2.panelIntegrations.enabled";
const WORKFLOW_BROWSE_SECTION_COLLAPSED_KEY = "workspace2.workflows.browseCollapsed";
const nodePanelState = createNodePanelState({
  sectionFilters: NODE_SECTION_FILTERS,
  visibleSectionsKey: NODE_VISIBLE_SECTIONS_KEY,
  customOrderKey: NODE_CUSTOM_ORDER_KEY,
});
const {
  emptyNodeLibrary,
  normalizeNodeLibrary,
  normalizeServerObjectInfoCache,
} = createNodeLibraryNormalizer({
  defaultGroupId: NODE_DEFAULT_GROUP_ID,
  t,
});
const WORKSPACE2_MENU_MARK = "🧩 ";

const CORE_NODE_MODULES = new Set(["nodes", "comfy_extras", "comfy_api_nodes"]);
const NODE_SOURCE = {
  CORE: "core",
  CUSTOM: "custom_nodes",
  BLUEPRINT: "blueprint",
  ESSENTIALS: "essentials",
  UNKNOWN: "unknown",
};
const ESSENTIALS_CATEGORY_ORDER = [
  "basics",
  "text generation",
  "image generation",
  "video generation",
  "image tools",
  "video tools",
  "audio",
  "3D",
];
const ESSENTIALS_NODES = {
  basics: ["LoadImage", "LoadVideo", "Load3D", "SaveImage", "SaveVideo", "SaveGLB", "PrimitiveStringMultiline", "PreviewImage"],
  "text generation": ["OpenAIChatNode"],
  "image generation": ["LoraLoader", "LoraLoaderModelOnly", "ConditioningCombine"],
  "video generation": ["SubgraphBlueprint.pose_to_video_ltx_2_0", "SubgraphBlueprint.canny_to_video_ltx_2_0", "KlingLipSyncAudioToVideoNode", "KlingOmniProEditVideoNode"],
  "image tools": ["ImageBatch", "ImageCrop", "ImageCropV2", "ImageScale", "ImageScaleBy", "ImageRotate", "ImageBlur", "ImageBlend", "ImageInvert", "ImageCompare", "Canny", "RecraftRemoveBackgroundNode", "RecraftVectorizeImageNode", "LoadImageMask", "GLSLShader"],
  "video tools": ["GetVideoComponents", "CreateVideo", "Video Slice"],
  audio: ["LoadAudio", "SaveAudio", "SaveAudioMP3", "StabilityTextToAudio", "EmptyLatentAudio"],
  "3D": ["TencentTextToModelNode", "TencentImageToModelNode"],
};
const ESSENTIALS_CATEGORY_MAP = new Map(
  Object.entries(ESSENTIALS_NODES).flatMap(([category, nodes]) => nodes.map((node) => [node, category])),
);
const ESSENTIALS_CATEGORY_RANK = new Map(ESSENTIALS_CATEGORY_ORDER.map((category, index) => [category, index]));
const ESSENTIALS_NODE_RANK = new Map(
  Object.entries(ESSENTIALS_NODES).map(([category, nodes]) => [
    category,
    new Map(nodes.map((node, index) => [node, index])),
  ]),
);
const COMFY_CATEGORY_LABEL_KEYS = new Map([
  ["3d", "nodes.officialCategory.3d"],
  ["advanced", "nodes.officialCategory.advanced"],
  ["api", "nodes.officialCategory.advanced"],
  ["audio", "nodes.officialCategory.audio"],
  ["conditioning", "nodes.officialCategory.conditioning"],
  ["image", "nodes.officialCategory.image"],
  ["latent", "nodes.officialCategory.latent"],
  ["loaders", "nodes.officialCategory.model"],
  ["mask", "nodes.officialCategory.image"],
  ["model", "nodes.officialCategory.model"],
  ["model_merging", "nodes.officialCategory.model"],
  ["model_patches", "nodes.officialCategory.model"],
  ["sampling", "nodes.officialCategory.model"],
  ["sd", "nodes.officialCategory.model"],
  ["text", "nodes.officialCategory.text"],
  ["utils", "nodes.officialCategory.advanced"],
  ["utilities", "nodes.officialCategory.advanced"],
  ["video", "nodes.officialCategory.video"],
  ["experimental", "nodes.officialCategory.experimental"],
  ["_for_testing", "nodes.officialCategory.experimental"],
]);
const COMFY_CATEGORY_ORDER_KEYS = [
  "nodes.officialCategory.3d",
  "nodes.officialCategory.advanced",
  "nodes.officialCategory.model",
  "nodes.officialCategory.experimental",
  "nodes.officialCategory.video",
  "nodes.officialCategory.conditioning",
  "nodes.officialCategory.image",
  "nodes.officialCategory.text",
  "nodes.officialCategory.audio",
];

const workflowCustomOrderStore = createWorkflowCustomOrderStore({
  storage: window.localStorage,
  key: WORKFLOW_ORDER_KEY,
});

const state = {
  query: "",
  items: [],
  root: "",
  officialRoot: "",
  folderMeta: {},
  isOfficialRoot: true,
  status: "Loading...",
  signature: "",
  // Reject an in-flight poll if a local workflow operation completed after it
  // began; otherwise Browse can be overwritten by the pre-rename snapshot.
  workflowListRevision: 0,
  trashSignature: "",
  refreshTimer: null,
  refreshTarget: null,
  expanded: new Set([""]),
  selectedPath: "",
  editingPath: "",
  // The same workflow can appear in both Open and Browse. Keep the editor in
  // the surface where it was invoked so a rename never renders two inputs.
  editingSurface: "",
  // Official rename emits store updates before the local file-tree path map is
  // reconciled. Defer that render until the rename transaction is complete.
  workflowRenameInProgress: false,
  officialWorkflowRenderPending: false,
  contextMenu: null,
  contextMenuElement: null,
  sortMenuElement: null,
  sortMenuCloseHandler: null,
  showTrash: false,
  trashItems: [],
  draggingItem: null,
  pointerDrag: null,
  reorderDrag: null,
  suppressClick: false,
  fontScale: readWorkflowFontScale(),
  sort: WORKFLOW_SORTS.includes(localStorage.getItem(WORKFLOW_SORT_KEY)) ? localStorage.getItem(WORKFLOW_SORT_KEY) : "nameAsc",
  customOrderEnabled: localStorage.getItem(WORKFLOW_CUSTOM_ORDER_KEY) === "1",
  folderFirst: localStorage.getItem(WORKFLOW_FOLDER_FIRST_KEY) !== "0",
  customOrder: workflowCustomOrderStore.read(),
  locale: DEFAULT_LOCALE,
  localeReady: false,
  strings: {},
  localeTimer: null,
  workflowsTarget: null,
  resultsRefreshTimer: null,
  workflowDirty: false,
  workflowSnapshot: "",
  officialWorkflowSnapshots: new Map(),
  officialWorkflowDirtyPaths: new Set(),
  workflowLoadInProgress: false,
  workflowDirtyCheckTimer: null,
  officialWorkflowRenderTimer: null,
};

const canvasGroupsState = {
  query: "",
  renderTarget: null,
};

// Recent-workflow persistence is intentionally isolated from the panel.  See
// workflows/recents.js for the no-full-scan and no-official-sync guarantee.
const workflowRecents = createWorkflowRecentStore({
  recentKey: WORKFLOW_RECENT_KEY,
  recentLimitKey: WORKFLOW_RECENT_LIMIT_KEY,
  getItems: () => state.items,
  getDisplayName: workflowDisplayName,
  replacePathPrefix: replaceWorkflowPathPrefix,
  isPathWithin: workflowPathIsWithin,
  onLimitChanged: () => {
    if (state.workflowsTarget) renderPanel(state.workflowsTarget);
  },
});

const workspaceState = {
  activeModule: normalizeWorkspaceModule(localStorage.getItem(WORKSPACE2_MODULE_KEY)),
  renderTarget: null,
  settingsElement: null,
  settingsCloseHandler: null,
  panelApi: null,
  providerDispose: null,
  claimedProviderIds: new Set(),
  sidebarRegistered: false,
  startup: {
    lastStartedStage: "",
    lastCompletedStage: "",
    failures: [],
  },
};

const panelBackgroundState = createPanelBackgroundState(window.localStorage);
const {
  glassBlur,
  glassBlurPixels,
  glassTransparency,
  panelBackgroundMode,
  panelOpacity,
  setGlassBlurValue,
  setGlassTransparencyValue,
  setPanelBackgroundModeValue,
  setPanelOpacityValue,
  snapGlassBlur,
  snapGlassTransparency,
  snapPanelOpacity,
} = panelBackgroundState;

// Keep dirty markers and official Store notifications outside the renderer.
// The module intentionally preserves the rename/load guards that previously
// prevented false dirty markers and interrupted inline workflow renames.
const workflowOpenState = createWorkflowOpenState({
  app,
  state,
  workspaceState,
  serializeCurrentWorkflow,
  getActiveOfficialWorkflow,
  getOfficialWorkflowStore,
  subscribeOfficialWorkflowStore,
  relativeWorkflowPathFromOfficial,
  renderWorkflowsPanel: renderPanel,
});

// Open/Browse section state is intentionally presentation-only. Workflow
// operations and official Store synchronization remain in this entry module.
const workflowSections = createWorkflowSectionRenderer({
  createSectionHeader,
  setSectionHeaderExpanded,
  storage: window.localStorage,
});

// Browse hierarchy construction is pure state-to-tree data shaping. Keeping
// it before the results renderer ensures the renderer receives a stable tree
// builder without importing workflow operations or official Store state.
const workflowTree = createWorkflowTreeBuilder({
  state,
  parentPath,
});
const buildTree = workflowTree.build;

// Search is a read-only projection of the Browse tree. Keeping it separate
// prevents query refreshes from taking part in file-operation or official
// Store ordering, which protects the verified rename and dirty-state flows.
const workflowSearch = createWorkflowSearch({
  state,
  getDisplayName: workflowDisplayName,
  parentPath,
  compactSearchFields,
  splitCamelCase,
  genericSearchScores,
});
const workflowSearchFields = workflowSearch.searchFields;
const workflowMatchesSelf = workflowSearch.matchesSelf;
const matchesQuery = workflowSearch.matchesQuery;
const visibleChildren = workflowSearch.visibleChildren;

// Browse results own only their mounted-tree refresh lifecycle. Workflow
// operations remain local so no extraction can reorder official state changes.
const workflowResults = createWorkflowResultsRenderer({
  state,
  renderPanel,
  closeContextMenu,
  buildTree,
  visibleChildren,
  renderNode,
  makeDropTarget,
  t,
  searchRenderDelay: WORKFLOW_SEARCH_RENDER_DELAY,
});

// The context-menu module renders Browse actions only. All file changes and
// official workflow synchronization remain in this entry module.
const workflowContextMenu = createWorkflowContextMenuRenderer({
  state,
  t,
  closeContextMenu,
  handleError,
  onNewSubfolder: (el, item) => createFolder(el, item.path),
  onPersonalizeFolder: (el, item, anchor) => personalizeWorkflowFolder(el, item, anchor),
  onResetFolderStyle: (el, item) => resetWorkflowFolderStyle(el, item),
  onOpenWorkflow: (path) => openWorkflow(path),
  onRename: (el, item) => beginWorkflowRename(el, item.path, "browse"),
  onMoveToRoot: (el, item) => moveItem(el, item.path, ""),
  onMoveToTrash: (el, item) => moveToTrash(el, item),
});

// Trash operations remain in this entry module; the renderer only presents
// rows and forwards user intent through these callbacks.
const {
  workspace2Confirm,
  workspace2Notice,
  workspace2ConfirmDirtyWorkflowClose,
  workspace2InlineConfirm,
} = createWorkspace2Dialogs({
  t,
  isolateComfyKeys,
  closeOverlays: closeWorkspace2OverlaysForConfirm,
});

const workflowTrash = createWorkflowTrashRenderer({
  state,
  t,
  applyDecoratedIcon,
  defaultFolderIconClass: DEFAULT_FOLDER_ICON_CLASS,
  defaultFileIconClass: DEFAULT_FILE_ICON_CLASS,
  iconButton,
  dangerIconButton,
  showInlineConfirm: workspace2InlineConfirm,
  handleError,
  onRestore: (el, item) => restoreTrashItemSmart(el, item),
  onMoveToSystemTrash: (el, item) => moveTrashItemToSystemTrash(el, item),
});

// The Browse item collection advances its revision before a background poll
// can render. Official workflow state and path-dependent UI state remain here.
const workflowItems = createWorkflowItemStore({
  state,
  workflowSignature,
  isPathWithin: workflowPathIsWithin,
  replacePathPrefix: replaceWorkflowPathPrefix,
});

const personalizationPanel = createPersonalizationPanel({
  document,
  window,
  translate: t,
  applyDecoratedIcon,
  defaultFolderIconClass: DEFAULT_FOLDER_ICON_CLASS,
});
const closePersonalizationPanel = personalizationPanel.closePersonalizationPanel;
const openPersonalizationPanel = personalizationPanel.openPersonalizationPanel;

// This service owns only icon/color metadata. The generic personalization UI
// and all workflow file/official Store behavior remain in this entry module.
const workflowFolderMetaService = createWorkflowFolderMetaService({
  state,
  normalizePath: normalizeMetaPath,
  postJson,
  renderPanel,
});
const workflowFolderMeta = workflowFolderMetaService.get;
const saveWorkflowFolderMeta = workflowFolderMetaService.save;
const resetWorkflowFolderStyle = workflowFolderMetaService.reset;

// This module owns only local Browse path state. It receives official dirty
// state and recents persistence as callbacks to preserve their call order.
const workflowPathState = createWorkflowPathState({
  state,
  replacePathPrefix: replaceWorkflowPathPrefix,
  isPathWithin: workflowPathIsWithin,
  onRemapOfficialWorkflowPathState: (oldPath, newPath) => workflowOpenState.remapOfficialWorkflowPathState(oldPath, newPath),
  onClearCurrentWorkflowDirtyState: clearCurrentWorkflowDirtyState,
  onSaveCustomOrder: saveWorkflowCustomOrder,
  onUpdateRecentWorkflowPath: updateRecentWorkflowPath,
  onRemoveRecentWorkflowTree: removeRecentWorkflowTree,
});

const templatesState = {
  query: "",
  library: null,
  loadPromise: null,
  loading: false,
  error: "",
  renderTarget: null,
  draggingTemplate: null,
  draggingGroupId: "",
  pendingTemplate: null,
  editingTemplateId: "",
  editingGroupId: "",
  expanded: new Set(),
  sort: TEMPLATE_SORTS.includes(localStorage.getItem(TEMPLATE_SORT_KEY)) ? localStorage.getItem(TEMPLATE_SORT_KEY) : "manual",
  uiScale: Number(localStorage.getItem(TEMPLATE_UI_SCALE_KEY) || "50"),
  contextMenuElement: null,
  contextMenu: null,
  contextMenuCloseHandler: null,
  sortMenuElement: null,
  sortMenuCloseHandler: null,
  showTrash: false,
};

const { createRenameInput: createWorkflowRenameInputRenderer } = createWorkflowRenameInputFactory({
  document,
  schedule: (callback) => setTimeout(callback, 0),
});

const { createPanelHeader, createSearchToolbar } = createPanelChrome({
  document,
  translate: t,
  iconSvg,
  prepareInput: isolateComfyKeys,
});

const { renderOpenWorkflowList } = createWorkflowOpenListRenderer({
  document,
  translate: t,
  iconButton,
});

const {
  templateMatchesQuery,
  compareTemplatesBySort,
  sortedVisibleTemplates,
} = createTemplateSearch({
  splitCamelCase,
  compactSearchFields,
  genericSearchScores,
  compareSearchScores,
  getSortMode: () => templatesState.sort,
});

const workflowTreeInteraction = createWorkflowTreeInteraction({
  state,
  renderPanel,
  requestAnimationFrame,
  setExpandedRecursive,
  parentPath,
});
const getTreeScrollTop = workflowTreeInteraction.getTreeScrollTop;
const restoreTreeScrollTop = workflowTreeInteraction.restoreTreeScrollTop;
const toggleWorkflowFolder = workflowTreeInteraction.toggleWorkflowFolder;

const {
  projectTemplateGroupResults,
  projectTemplateRootResults,
} = createTemplateResultsProjection({
  // `childTemplateGroups` is created by the template-library factory later in
  // this module. Pass a deferred callback instead of reading that const during
  // entry-module evaluation; direct capture here caused a TDZ ReferenceError
  // that prevented `app.registerExtension()` and the sidebar entry from running.
  getChildGroups: (parentId) => childTemplateGroups(parentId),
  templateMatchesQuery,
  compareTemplatesBySort,
});

const {
  readDraggedTemplate,
  makeTemplateGroupDragSource,
  makeTemplateDropTarget,
} = createTemplateDragDrop({
  state: templatesState,
  templateDragType: TEMPLATE_DRAG_TYPE,
  templateGroupDragType: TEMPLATE_GROUP_DRAG_TYPE,
  // The template-library factory is initialized later. Defer this lookup to
  // drag time so entry evaluation cannot hit its temporal-dead-zone.
  isGroupDescendant: (targetId, sourceId) => isTemplateGroupDescendant(targetId, sourceId),
  onMoveTemplate: moveTemplateToGroup,
  onMoveGroup: moveTemplateGroupToParent,
  onError: (el, error) => {
    templatesState.error = error.message;
    renderTemplatesPanel(el);
  },
});

const { renderTemplateGroupHeader } = createTemplateGroupHeaderRenderer({
  document,
  translate: t,
  iconButton,
  dangerIconButton,
  applyDecoratedIcon,
  defaultOpenIconClass: DEFAULT_FOLDER_OPEN_ICON_CLASS,
  defaultIconClass: DEFAULT_FOLDER_ICON_CLASS,
  schedule: (callback) => setTimeout(callback, 0),
});

const { renderTemplateRow: renderTemplateRowRenderer } = createTemplateRowRenderer({
  document,
  translate: t,
  iconSvg,
  iconButton,
  dangerIconButton,
  schedule: (callback) => setTimeout(callback, 0),
});

const { renderTemplateRootResults } = createTemplateRootRenderer({
  document,
  translate: t,
  makeTemplateDropTarget,
  renderTemplateRow,
  renderTemplateGroupFolder,
});

const { renderTemplateBodyState } = createTemplateBodyStateRenderer({ document, translate: t });

const { renderTemplateGroupContents } = createTemplateGroupContentsRenderer({
  document,
  makeTemplateDropTarget,
  renderTemplateRow,
  renderTemplateGroupFolder,
});

const { renderTemplateMinimap } = createTemplateMinimap({
  document,
  getDevicePixelRatio: () => window.devicePixelRatio || 1,
  t,
  vectorPair,
});

const nodesState = {
  query: "",
  library: null,
  objectInfo: null,
  loading: false,
  objectInfoLoading: false,
  objectInfoRefreshTimer: null,
  objectInfoError: "",
  objectInfoCachedAt: 0,
  objectInfoFromCache: false,
  error: "",
  expanded: new Set([NODE_DEFAULT_GROUP_ID, "__bookmarked__", "__comfy__", "__extensions__", "__unknown__"]),
  draggingNode: null,
  renderTarget: null,
  canvasDropReady: false,
  pointerDrag: null,
  groupDrag: null,
  suppressClick: false,
  pendingNode: null,
  previewNode: null,
  previewPopover: null,
  contextMenuElement: null,
  editingGroupId: "",
  nSidebarPreview: null,
  nSidebarLoading: false,
  sortMenuElement: null,
  sortMenuCloseHandler: null,
  officialFavoritesMenuElement: null,
  officialFavoritesMenuCloseHandler: null,
  reorderDrag: null,
  visibleSections: nodePanelState.readVisibleSections(),
  sort: NODE_SORTS.includes(localStorage.getItem(NODE_SORT_KEY)) ? localStorage.getItem(NODE_SORT_KEY) : "original",
  customOrderEnabled: localStorage.getItem(NODE_CUSTOM_ORDER_ENABLED_KEY) === "1",
  customOrder: nodePanelState.readCustomOrder(),
  previewMode: NODE_PREVIEW_MODES.includes(localStorage.getItem(NODE_PREVIEW_MODE_KEY)) ? localStorage.getItem(NODE_PREVIEW_MODE_KEY) : "detailed",
  uiScale: Number(localStorage.getItem(NODE_UI_SCALE_KEY) ?? localStorage.getItem(NODE_FONT_SCALE_KEY) ?? "50"),
  fontScale: Number(localStorage.getItem(NODE_FONT_SCALE_KEY) || "0"),
  rowSpacing: Number(localStorage.getItem(NODE_ROW_SPACING_KEY) || "0"),
  officialAdapter: null,
  officialFavoritesProbe: null,
  officialFavoritesLoading: false,
  nodeFrequencyLookup: {},
  resultsRefreshTimer: null,
  nodeDefinitionsCache: null,
  nodeDefinitionMapCache: null,
  nodeDefinitionsSource: null,
  loadPromise: null,
};

const { positionPreviewPopover: positionNodePreviewPopover } = createPreviewPositioner({
  window,
  getSidebarSetting: () => app.ui?.settings?.getSettingValue?.("Comfy.Sidebar.Location")
    ?? app.extensionManager?.setting?.get?.("Comfy.Sidebar.Location")
    ?? localStorage.getItem("Comfy.Sidebar.Location"),
  getRenderTarget: () => nodesState.renderTarget,
});

const nodeObjectInfoState = createNodeObjectInfoState({ state: nodesState });
const {
  getFavorite,
  normalizeFavoriteOrders,
  addFavoriteNode: addFavoriteNodeToStore,
  removeFavoriteNode: removeFavoriteNodeFromStore,
  setFavoriteAlias,
  moveFavoriteToGroup: moveFavoriteToStoreGroup,
} = createNodeFavoriteStore({
  state: nodesState,
  defaultGroupId: NODE_DEFAULT_GROUP_ID,
});
const {
  getNodeGroup,
  uniqueNodeGroupName,
  isNodeGroupDescendant,
  createNodeGroup: createFavoriteGroup,
  deleteNodeGroup: deleteFavoriteGroup,
  moveNodeGroupToParent: moveFavoriteGroupToParent,
} = createNodeFavoriteGroupStore({
  state: nodesState,
  defaultGroupId: NODE_DEFAULT_GROUP_ID,
});

const { buildOfficialNodeTree } = createOfficialNodeTreeBuilder({
  categoryPartsForNode: officialNodeCategoryParts,
  getUncategorizedLabel: () => t("nodes.uncategorized"),
  getCategorySortRank: comfyCategorySortRank,
  getCustomOrderEnabled: () => nodesState.customOrderEnabled,
  getCustomOrder: (parentKey) => (
    Array.isArray(nodesState.customOrder?.[parentKey]) ? nodesState.customOrder[parentKey] : []
  ),
  getSortMode: () => nodesState.sort,
});

const {
  makeFavoriteGroupDropTarget,
  makeFavoriteDragSource,
  makeNodeCanvasDragSource,
  beginNodeReorderDrag,
  finishNodePointerDrag,
  updateNodeGroupPointerDrag,
  commitNodeGroupPointerDrag,
  makeNodeGroupDragSource,
  setupNodeCanvasDrop,
} = createNodeDragDrop({
  nodesState,
  templatesState,
  document,
  setDraggingVisual: (active) => setDraggingVisual(active),
  cssEscape,
  // Canvas helpers deliberately stay in entry.js (they have external callers);
  // inject them as thunks so this factory can run before they are defined.
  isCanvasDropTarget: (target) => isCanvasDropTarget(target),
  canvasPositionFromClient: (x, y) => canvasPositionFromClient(x, y),
  getFavorite: (type) => getFavorite(type),
  isNodeGroupDescendant: (targetId, sourceId) => isNodeGroupDescendant(targetId, sourceId),
  // Persistence + render + moves are defined later in entry.js; defer to call
  // time so entry evaluation cannot hit their temporal dead zone.
  saveNodeLibrary: (el) => saveNodeLibrary(el),
  saveCustomOrder: (order) => nodePanelState.saveCustomOrder(order),
  renderNodesPanel: (el) => renderNodesPanel(el),
  renderTemplatesPanel: (el) => renderTemplatesPanel(el),
  moveFavoriteToGroup: (el, type, groupId, beforeType) => moveFavoriteToGroup(el, type, groupId, beforeType),
  moveNodeGroupToParent: (el, groupId, targetId) => moveNodeGroupToParent(el, groupId, targetId),
  addFavoriteNode: (el, node, groupId, beforeType) => addFavoriteNode(el, node, groupId, beforeType),
  addNodeToCanvas: (el, type, pos) => addNodeToCanvas(el, type, pos),
  setPendingNode: (node) => setPendingNode(node),
  placePendingNodeAt: (x, y) => placePendingNodeAt(x, y),
  showPendingNodeCanvasPreview: (event) => showPendingNodeCanvasPreview(event),
  hideNodePreview: () => hideNodePreview(),
  setPendingTemplate: (template) => setPendingTemplate(template),
  placePendingTemplateAt: (x, y) => placePendingTemplateAt(x, y),
  showTemplatePreview: (template, event, options) => showTemplatePreview(template, event, options),
  readDraggedTemplate: (event) => readDraggedTemplate(event),
  addTemplateToCanvas: (template, pos) => addTemplateToCanvas(template, pos),
  recordTemplateUse: (el, id) => recordTemplateUse(el, id),
});

const { renderNodeRow } = createNodeRowRenderer({
  document,
  isPendingNode: (node) => nodesState.pendingNode?.type === node.type,
  shouldSuppressClick: () => nodesState.suppressClick,
  clearSuppressClick: () => { nodesState.suppressClick = false; },
  makeCanvasDragSource: makeNodeCanvasDragSource,
  showPreview: showNodePreview,
  movePreview: moveNodePreview,
  hidePreview: hideNodePreview,
  openContextMenu: openNodeContextMenu,
  setPendingNode: (node) => setPendingNode(nodesState.pendingNode?.type === node.type ? null : node),
  isCustomOrderEnabled: () => nodesState.customOrderEnabled,
  translate: t,
  beginReorderDrag: beginNodeReorderDrag,
  iconButton,
  addFavorite: addFavoriteNode,
  removeFavorite: removeFavoriteNode,
});

const { renderOfficialNodeTree } = createOfficialNodeTreeRenderer({
  document,
  getQuery: () => nodesState.query,
  isFolderExpanded: (folderKey) => nodesState.expanded.has(folderKey),
  translate: t,
  renderNodeRow,
  toggleFolder: toggleOfficialTreeFolder,
  applyDecoratedIcon,
  folderIconClass: DEFAULT_FOLDER_ICON_CLASS,
  folderOpenIconClass: DEFAULT_FOLDER_OPEN_ICON_CLASS,
});

const { renderNodeTopSection } = createNodeTopSectionRenderer({
  document,
  getQuery: () => nodesState.query,
  translate: t,
  renderTopSectionHeader,
  renderNodeRow,
  buildOfficialNodeTree,
  renderOfficialNodeTree,
});

const {
  officialNodeSearchScores,
  packNodeSearchScores,
  compareNodeSearchResults,
  sortNodeSearchResults,
} = createNodeSearch({
  splitCamelCase,
  nodeGroupLabel,
  officialNodeCategoryParts,
  getNodeFrequencyByName: (name) => Number(nodesState.nodeFrequencyLookup?.[name] || 0),
});

const { projectNodeCategories } = createNodeCategoryProjection({
  nodeMatchesQuery,
  sortNodeSearchResults,
  isHiddenNode: isHiddenOfficialNodeSection,
  isComfyCoreNode,
  isCustomNode: (node) => node?.source === NODE_SOURCE.CUSTOM,
  getDefaultVisibleSections: nodePanelState.defaultVisibleSections,
  searchResultLimit: NODE_SEARCH_RESULT_LIMIT,
});

const {
  readCachedObjectInfo,
  writeCachedObjectInfo,
  clearCachedObjectInfo,
} = createNodeObjectInfoCache({
  dbName: NODE_OBJECT_INFO_CACHE_DB,
  storeName: NODE_OBJECT_INFO_CACHE_STORE,
  cacheKey: NODE_OBJECT_INFO_CACHE_KEY,
  onCleared: () => {
    nodesState.objectInfoCachedAt = 0;
    nodesState.objectInfoFromCache = false;
    nodesState.objectInfo = null;
    nodesState.library = null;
    nodeObjectInfoState.clearDefinitionCaches();
  },
});

const {
  refreshFullObjectInfoCoordinated,
  scheduleFullObjectInfoRefresh,
} = createNodeObjectInfoRefreshCoordinator({
  state: nodesState,
  isTemplatesActive: () => workspaceState.activeModule === "templates",
  withRefreshLock: withNodeIndexRefreshLock,
  readCachedObjectInfo,
  writeCachedObjectInfo,
  applyCachedObjectInfo: nodeObjectInfoState.applyCachedObjectInfo,
  applyFreshObjectInfo: nodeObjectInfoState.applyFreshObjectInfo,
  renderNodesPanel,
  startPerformanceSpan,
  measurePromise,
  fetchObjectInfo: () => fetchJsonWithTimeout("/object_info"),
  fetchJson,
  postJson,
});

const { loadNodeLibrary } = createNodeLibraryLoader({
  state: nodesState,
  startPerformanceSpan,
  measurePromise,
  fetchJson,
  fetchStaticJson,
  readCachedObjectInfo,
  writeCachedObjectInfo,
  normalizeNodeLibrary,
  normalizeServerObjectInfoCache,
  emptyNodeLibrary,
  renderNodesPanel,
  scheduleFullObjectInfoRefresh,
  refreshFullObjectInfoCoordinated,
});

function ownKeys(value) {
  if (!value || (typeof value !== "object" && typeof value !== "function")) {
    return [];
  }
  try {
    return Object.keys(value).sort();
  } catch {
    return [];
  }
}

function limitedKeys(value, pattern = null, limit = 30) {
  const keys = ownKeys(value);
  const filtered = pattern ? keys.filter((key) => pattern.test(key)) : keys;
  return filtered.slice(0, limit);
}

function valueAtPath(root, path) {
  let current = root;
  for (const part of path.split(".")) {
    current = current?.[part];
    if (current == null) {
      return null;
    }
  }
  return current;
}

const {
  detectOfficialNodeAdapter,
  detectOfficialFavoritesProbe,
  collectOfficialFavoritesFromProbe,
  collectOfficialFavoriteImportItems,
  importWorkspace2FavoritesToOfficial,
} = createOfficialNodeAdapter({
  nodesState,
  t,
  limitedKeys,
  valueAtPath,
  loadNodeLibrary,
  renderNodesPanel,
});

function workflowDisplayName(node) {
  const name = String(node?.name || "");
  return node?.type === "file" && name.toLowerCase().endsWith(".json") ? name.slice(0, -5) : name;
}

function detectLocale() {
  const settingKeys = ["Comfy.Locale", "Comfy_Locale", "Comfy.Locale.value", "Comfy_Locale.value"];
  const settings = app.ui?.settings;
  for (const key of settingKeys) {
    const value = settings?.getSettingValue?.(key)
      ?? app.extensionManager?.setting?.get?.(key)
      ?? localStorage.getItem(key);
    if (value) {
      return normalizeLocale(value);
    }
  }
  const lang = document.documentElement?.lang || navigator.language || DEFAULT_LOCALE;
  return normalizeLocale(lang);
}

function normalizeLocale(locale) {
  const lang = String(locale || DEFAULT_LOCALE);
  return String(lang).toLowerCase().startsWith("zh") ? "zh-CN" : DEFAULT_LOCALE;
}

function cssEscape(value) {
  if (globalThis.CSS?.escape) {
    return globalThis.CSS.escape(value);
  }
  return String(value).replace(/["\\]/g, "\\$&");
}

function normalizeWorkspaceModule(moduleId) {
  if (WORKSPACE2_MODULES.includes(moduleId)) return moduleId;
  return findWorkspacePanelProvider(moduleId) ? moduleId : "workflows";
}

function workspacePanelProviders() {
  // This helper also runs while workspaceState is being initialized to repair
  // a persisted provider tab id, so it must not read workspaceState itself.
  const api = globalThis.WorkspaceKitPanelAPI;
  return typeof api?.getProviders === "function" ? api.getProviders() : [];
}

function findWorkspacePanelProvider(moduleId) {
  const id = String(moduleId || "");
  return workspacePanelProviders().find((provider) => provider?.id === id) ?? null;
}

function disposeWorkspacePanelProvider() {
  const dispose = workspaceState.providerDispose;
  workspaceState.providerDispose = null;
  if (typeof dispose !== "function") return;
  try { dispose(); } catch (error) { console.warn("[WorkspaceKit] Provider cleanup failed", error); }
}

function claimWorkspacePanelProvider(provider) {
  if (!workspaceState.sidebarRegistered || !provider?.id || workspaceState.claimedProviderIds.has(provider.id)) return;
  try {
    provider.onHostClaimed?.();
    workspaceState.claimedProviderIds.add(provider.id);
  } catch (error) {
    console.warn("[WorkspaceKit] Provider host claim failed", provider.id, error);
  }
}

function claimRegisteredWorkspacePanelProviders() {
  workspacePanelProviders().forEach(claimWorkspacePanelProvider);
}

function setupWorkspacePanelProviderLifecycle(api) {
  api.subscribe((event) => {
    if (event.type === "registered") claimWorkspacePanelProvider(event.provider);
    if (event.type === "availability-changed" && event.enabled) claimRegisteredWorkspacePanelProviders();
    if (event.type === "availability-changed"
      && !event.enabled
      && !WORKSPACE2_MODULES.includes(workspaceState.activeModule)) {
      // A hidden Provider cannot remain the active tab. Keep its pinned id in
      // storage so enabling integrations later can restore the user's choice.
      workspaceState.activeModule = "workflows";
      localStorage.setItem(WORKSPACE2_MODULE_KEY, workspaceState.activeModule);
    }
    if (workspaceState.renderTarget?.isConnected) renderWorkspace2Panel(workspaceState.renderTarget);
  });
}

function scrollSnapshot(el) {
  const tree = el?.querySelector?.(".workspace2-tree");
  const active = document.activeElement;
  const activeInPanel = active instanceof HTMLElement && el?.contains?.(active);
  return {
    top: tree?.scrollTop || 0,
    activeSelector: activeInPanel ? active.dataset?.workspace2Focus || "" : "",
    selectionStart: activeInPanel && "selectionStart" in active ? active.selectionStart : null,
    selectionEnd: activeInPanel && "selectionEnd" in active ? active.selectionEnd : null,
  };
}

function restoreScrollSnapshot(el, snapshot) {
  requestAnimationFrame(() => {
    const tree = el?.querySelector?.(".workspace2-tree");
    if (tree) {
      tree.scrollTop = snapshot?.top || 0;
    }
    if (snapshot?.activeSelector) {
      const active = el?.querySelector?.(`[data-workspace2-focus="${cssEscape(snapshot.activeSelector)}"]`);
      active?.focus?.();
      if (active && snapshot.selectionStart !== null && "setSelectionRange" in active) {
        try {
          active.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd ?? snapshot.selectionStart);
        } catch {}
      }
    }
  });
}

function t(key, values = {}) {
  return translate(key, values);
}

function menuLabel(key, fallback) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

function warnMissingTranslation(key) {
  if (!warnMissingTranslation.seen) {
    warnMissingTranslation.seen = new Set();
  }
  if (warnMissingTranslation.seen.has(key)) {
    return;
  }
  warnMissingTranslation.seen.add(key);
  console.warn(`[Workspace2] Missing translation key: ${key}`);
}

function isEditableTarget(target) {
  return target instanceof HTMLElement
    && Boolean(target.closest("input, textarea, [contenteditable='true'], [contenteditable='']"));
}

function setupWorkspaceKeyIsolation() {
  if (setupWorkspaceKeyIsolation.ready) {
    return;
  }
  setupWorkspaceKeyIsolation.ready = true;
  const stop = (event) => {
    if (!event.target?.closest?.(".workspace2-host .workspace2-input")) {
      return;
    }
    const clearSearch = event.target?.workspace2ClearSearch;
    if (event.key === "Escape" && typeof clearSearch === "function" && clearSearch()) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    event.stopImmediatePropagation();
  };
  for (const eventName of ["keydown", "keyup", "keypress"]) {
    window.addEventListener(eventName, stop, true);
    document.addEventListener(eventName, stop, true);
  }
}

function setupWorkspaceShortcuts() {
  if (setupWorkspaceShortcuts.ready) {
    return;
  }
  setupWorkspaceShortcuts.ready = true;
  const handler = (event) => {
    if (
      !event.workspace2Handled
      && event.altKey
      && !event.ctrlKey
      && !event.shiftKey
      && !event.metaKey
      && !event.repeat
      && event.code === "KeyC"
      && !isEditableTarget(event.target)
    ) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      event.workspace2Handled = true;
      saveSelectedNodesAsTemplateFromShortcut();
      return;
    }
    if (event.workspace2Handled || event.altKey || event.metaKey || event.repeat) {
      return;
    }
    if (isEditableTarget(event.target)) {
      return;
    }
    const moduleShortcut = resolveModuleShortcut(event);
    if (moduleShortcut && isModuleShortcutEnabled(moduleShortcut.id, (key) => localStorage.getItem(key))) {
      const moduleId = moduleShortcut.moduleId === "pinned-provider"
        ? workspaceTabPlan().pinned?.id
        : moduleShortcut.moduleId;
      // Shift+4 intentionally remains unhandled when no Provider is pinned,
      // leaving that key available to ComfyUI and the browser.
      if (moduleId) {
        event.preventDefault();
        event.stopPropagation();
        event.workspace2Handled = true;
        openWorkspace2Module(moduleId, { closeIfActive: true });
        return;
      }
    }
    if (event.shiftKey && !event.ctrlKey && event.code === "KeyG") {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      event.workspace2Handled = true;
      workspace2CanvasGroups.ungroupSelection?.();
      return;
    }
    if (event.ctrlKey && !event.shiftKey && event.code === "KeyG") {
      if (!isWorkspace2CtrlGCreateEnabled()) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      event.workspace2Handled = true;
      workspace2CanvasGroups.createGroupFromSelection?.();
    }
  };
  document.addEventListener("keydown", handler, true);
  window.addEventListener("keydown", handler, true);
}

function isWorkspace2CtrlGCreateEnabled() {
  return localStorage.getItem(CANVAS_GROUP_CTRL_G_KEY) !== "0";
}

function moduleShortcutOptions() {
  return MODULE_SHORTCUTS.map((shortcut) => ({
    label: t(`settings.moduleShortcuts.${shortcut.id}`),
    checked: isModuleShortcutEnabled(shortcut.id, (key) => localStorage.getItem(key)),
    onChange: (checked) => localStorage.setItem(moduleShortcutStorageKey(shortcut.id), checked ? "1" : "0"),
  }));
}

function groupPointerShortcutOptions() {
  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(GROUP_POINTER_BINDINGS_KEY) || ""); } catch { /* defaults */ }
  const bindings = normalizeGroupPointerBindings(stored);
  const actionOptions = Object.values(GROUP_POINTER_ACTION).map((action) => ({
    value: action,
    label: t(`settings.groupPointerActions.${action}`),
  }));
  return [GROUP_POINTER_MODIFIER.CONTROL, GROUP_POINTER_MODIFIER.ALT, GROUP_POINTER_MODIFIER.SHIFT].map((modifier) => ({
    modifier,
    label: t(`settings.groupPointerModifiers.${modifier}`),
    value: bindings[modifier],
    options: actionOptions,
    onChange: (nextAction) => {
      const next = swapGroupPointerBinding(bindings, modifier, nextAction);
      localStorage.setItem(GROUP_POINTER_BINDINGS_KEY, JSON.stringify(next));
      // The three modifier bindings are a one-to-one mapping. Refresh only
      // their controls in place after a swap: reopening the full dialog used
      // to reset the user to the first Settings page.
      const settingsRoot = workspaceState.settingsElement;
      for (const select of settingsRoot?.querySelectorAll?.("[data-workspace2-group-pointer-modifier]") || []) {
        const selectModifier = select.dataset.workspace2GroupPointerModifier;
        if (next[selectModifier]) select.value = next[selectModifier];
      }
    },
  }));
}

function buildProviderSettingsSection() {
  const providers = workspacePanelProviders().filter((provider) => typeof provider?.renderSettings === "function");
  if (!providers.length) return null;
  const section = settingsSection(t("settings.extensionSettings"), []);
  for (const provider of providers) {
    const container = document.createElement("div");
    container.className = "workspace2-provider-settings";
    const title = document.createElement("div");
    title.className = "workspace2-settings-section-title";
    title.textContent = resolveWorkspacePanelProviderLabel(provider).text;
    container.append(title);
    try {
      provider.renderSettings({ document, container, app, translate: t });
      section.append(container);
    } catch (error) {
      console.warn("[WorkspaceKit] Provider settings render failed", provider.id, error);
    }
  }
  return section.children.length > 1 ? section : null;
}

function isWorkspace2PanelOpen() {
  const target = workspaceState.renderTarget;
  // In glass mode the visible shell is deliberately moved to document.body so
  // backdrop-filter can sample the canvas behind the sidebar.  Looking only
  // below `target` consequently reports "closed" even though the Workspace2
  // panel is on screen; a following tab click then toggles it closed.  Treat
  // the connected, visible glass portal as the same panel instance.
  const shell = workspaceState.glassPortalElement?.isConnected
    ? workspaceState.glassPortalElement
    : target?.querySelector?.(".workspace2-shell");
  return Boolean(
    target?.isConnected
    && isElementVisible(target)
    && shell?.isConnected
    && isElementVisible(shell)
    && !shell.classList.contains("is-workspace2-overlay-hidden"),
  );
}

function closeWorkspace2Sidebar() {
  const manager = app.extensionManager;
  const methodNames = [
    "closeSidebarTab",
    "hideSidebarTab",
    "toggleSidebarTab",
    "closeSidebar",
    "hideSidebar",
  ];
  for (const methodName of methodNames) {
    if (typeof manager?.[methodName] !== "function") {
      continue;
    }
    try {
      manager[methodName](WORKSPACE2_TAB_ID);
      return true;
    } catch (error) {
      console.debug(`[Workspace2] ${methodName} close failed`, error);
    }
  }
  const element = findWorkspace2SidebarTabElement(WORKSPACE2_TAB_ID);
  if (element) {
    element.click();
    return true;
  }
  return false;
}

function openWorkspace2Module(moduleId, { closeIfActive = false } = {}) {
  const nextModule = normalizeWorkspaceModule(moduleId);
  const panelIsOpen = isWorkspace2PanelOpen();
  if (shouldCloseWorkspaceModule({
    closeIfActive,
    panelIsOpen,
    activeModule: workspaceState.activeModule,
    nextModule,
  })) {
    return closeWorkspace2Sidebar();
  }
  workspaceState.activeModule = nextModule;
  localStorage.setItem(WORKSPACE2_MODULE_KEY, nextModule);
  if (panelIsOpen) {
    renderWorkspace2Panel(workspaceState.renderTarget);
    return true;
  }
  return activateWorkspace2Tab(WORKSPACE2_TAB_ID);
}

function notifyCtrlGConflict() {
  if (Date.now() - (notifyCtrlGConflict.lastShown || 0) < 5000) {
    return;
  }
  notifyCtrlGConflict.lastShown = Date.now();
  const message = "Ctrl+G is still handled by ComfyUI. Remove the official Ctrl+G binding to use WorkspaceKit groups.";
  const toast = app.extensionManager?.toast;
  if (toast?.addAlert) {
    toast.addAlert(message);
  } else if (toast?.add) {
    toast.add({ severity: "warn", summary: "WorkspaceKit", detail: message, life: 5000 });
  } else {
    console.warn(`[Workspace2] ${message}`);
  }
}

function isWorkspace2AltCOpenTemplatesEnabled() {
  return localStorage.getItem(WORKSPACE2_ALT_C_OPEN_TEMPLATES_KEY) !== "0";
}

function isWorkspacePanelIntegrationsEnabled() {
  return localStorage.getItem(WORKSPACE2_PANEL_INTEGRATIONS_ENABLED_KEY) !== "0";
}

function setWorkspacePanelIntegrationsEnabled(checked) {
  const enabled = checked !== false;
  localStorage.setItem(WORKSPACE2_PANEL_INTEGRATIONS_ENABLED_KEY, enabled ? "1" : "0");
  workspaceState.panelApi?.setProvidersEnabled?.(enabled);
  return enabled;
}

function isElementVisible(element) {
  if (!(element instanceof HTMLElement) || !element.isConnected) {
    return false;
  }
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

const {
  isPanelGlassEnabled,
  applyWorkspaceBackgroundEffect,
  syncWorkspaceGlassOverlay,
  setupWorkspaceGlassOverlayTracking,
  refreshWorkspacePanelAncestorsIfVisible,
  setPanelOpacity,
  setPanelBackgroundMode,
  setGlassBlur,
} = createPanelAppearance({
  workspaceState,
  t,
  WORKSPACE2_TAB_ID,
  isElementVisible,
  panelBackgroundMode,
  glassTransparency,
  panelOpacity,
  glassBlurPixels,
  setPanelOpacityValue,
  setPanelBackgroundModeValue,
  setGlassBlurValue,
});

function closeWorkspaceSettings() {
  if (workspaceState.settingsCloseHandler) {
    window.removeEventListener("keydown", workspaceState.settingsCloseHandler, true);
    workspaceState.settingsCloseHandler = null;
  }
  workspaceState.settingsElement?.remove();
  workspaceState.settingsElement = null;
}

// A portable data bundle deliberately contains only WorkspaceKit-owned state.
// Workflow JSON files are user documents and the node object-info cache is
// derived data, so neither belongs in an import that can overwrite settings.
function collectWorkspaceBrowserPreferences() {
  const preferences = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("workspace2.")) {
      preferences[key] = localStorage.getItem(key) || "";
    }
  }
  return preferences;
}

function applyWorkspaceBrowserPreferences(preferences) {
  if (!preferences || typeof preferences !== "object") return;
  const currentKeys = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("workspace2.")) currentKeys.push(key);
  }
  for (const key of currentKeys) localStorage.removeItem(key);
  for (const [key, value] of Object.entries(preferences)) {
    if (key.startsWith("workspace2.") && typeof value === "string") {
      localStorage.setItem(key, value);
    }
  }
}

function downloadWorkspaceDataBundle(bundle) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `comfyui-workspacekit-data-${stamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function exportWorkspaceDataBundle() {
  try {
    const response = await fetchJsonWithTimeout("/workspace2/data-bundle");
    const bundle = response?.bundle;
    if (!bundle || typeof bundle !== "object") throw new Error(t("settings.dataExportInvalid"));
    bundle.browser_preferences = collectWorkspaceBrowserPreferences();
    downloadWorkspaceDataBundle(bundle);
    await workspace2Notice({ title: t("settings.dataManagement"), message: t("settings.dataExported") });
  } catch (error) {
    await workspace2Notice({ title: t("settings.dataManagement"), message: t("settings.dataExportFailed", { message: error?.message || String(error) }) });
  }
}

async function importWorkspaceDataBundle() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const bundle = await readJsonFile(file);
      if (!bundle || typeof bundle !== "object" || Number(bundle.schema_version) !== 1 || !bundle.data) {
        throw new Error(t("settings.dataImportInvalid"));
      }
      const confirmed = await workspace2Confirm({
        title: t("settings.dataManagement"),
        message: t("settings.dataImportConfirm"),
        confirmText: t("settings.dataImport"),
        danger: false,
      });
      if (!confirmed) return;
      const result = await postJson("/workspace2/data-bundle/import", {
        bundle,
        current_browser_preferences: collectWorkspaceBrowserPreferences(),
      });
      applyWorkspaceBrowserPreferences(bundle.browser_preferences);
      await workspace2Notice({
        title: t("settings.dataManagement"),
        message: t("settings.dataImportDone", { backup: result.backup_path || "" }),
      });
      window.location.reload();
    } catch (error) {
      await workspace2Notice({ title: t("settings.dataManagement"), message: t("settings.dataImportFailed", { message: error?.message || String(error) }) });
    }
  }, { once: true });
  input.click();
}

function createWorkspaceDataManagementSection() {
  const actions = document.createElement("div");
  actions.className = "workspace2-settings-action-row";
  const help = settingsHelp(t("settings.dataManagementHelp"));
  const buttons = document.createElement("div");
  buttons.className = "workspace2-settings-action-buttons";
  const exportButton = settingsActionButton("download", t("settings.dataExport"), exportWorkspaceDataBundle);
  const importButton = settingsActionButton("upload", t("settings.dataImport"), importWorkspaceDataBundle, { variant: "warning" });
  buttons.append(exportButton, importButton);
  actions.append(help, buttons);
  return settingsSection(t("settings.dataManagement"), [actions]);
}

const {
  settingsCheckbox,
  settingsSelect,
  settingsSection,
  settingsHelp,
  settingsShortcutGrid,
  settingsRange,
  settingsModeRange,
  updateSettingsModeRange,
} = createSettingsControls({ document, t, isolateComfyKeys });

const { buildSettingsDialogSections } = createSettingsDialogSections({
  document,
  t,
  toolbarButton,
  settingsCheckbox,
  settingsSelect,
  settingsActionButton,
  settingsSection,
  settingsHelp,
  settingsShortcutGrid,
  settingsRange,
  settingsModeRange,
  updateSettingsModeRange,
  isCtrlGEnabled: isWorkspace2CtrlGCreateEnabled,
  setCtrlGEnabled: (checked) => localStorage.setItem(CANVAS_GROUP_CTRL_G_KEY, checked ? "1" : "0"),
  isAltCOpenTemplatesEnabled: isWorkspace2AltCOpenTemplatesEnabled,
  setAltCOpenTemplatesEnabled: (checked) => localStorage.setItem(WORKSPACE2_ALT_C_OPEN_TEMPLATES_KEY, checked ? "1" : "0"),
  isPanelIntegrationsEnabled: isWorkspacePanelIntegrationsEnabled,
  setPanelIntegrationsEnabled: setWorkspacePanelIntegrationsEnabled,
  moduleShortcutOptions,
  groupPointerShortcutOptions,
  workflowRecentLimit,
  snapWorkflowRecentLimit,
  setWorkflowRecentLimit,
  panelBackgroundMode,
  panelOpacity,
  snapPanelOpacity,
  setPanelOpacity,
  glassBlur,
  snapGlassBlur,
  setGlassBlur,
  setPanelBackgroundMode,
  getNodeCacheInfo: () => ({
    count: nodesState.objectInfo ? Object.keys(nodesState.objectInfo).length : 0,
    updatedAt: formatTimestamp(nodesState.objectInfoCachedAt),
  }),
  clearNodeCache: clearCachedObjectInfo,
  confirmClearNodeCache: () => workspace2Confirm({
    title: t("settings.nodeCache"),
    message: t("settings.clearNodeCacheConfirm"),
    confirmText: t("settings.clearNodeCache"),
    danger: true,
  }),
  buildDataManagementSection: createWorkspaceDataManagementSection,
  getGroupRepresentationInfo: () => workspace2CanvasGroups.getConversionInfo?.() || { representation: "workspacekit", workspaceKitGroupCount: 0 },
  convertGroupsToNative: (snapshot) => workspace2CanvasGroups.convertCurrentWorkflowToNative?.(snapshot),
  convertGroupsToWorkspaceKit: () => workspace2CanvasGroups.convertCurrentWorkflowToWorkspaceKit?.(),
  confirmConvertGroupsToNative: (info) => workspace2Confirm({
    title: t("groups.representation"),
    message: t("groups.convertToNativeConfirm", { count: Number(info?.workspaceKitGroupCount || 0) }),
    confirmText: t("groups.convertToNative"),
    danger: true,
  }),
  confirmConvertGroupsToWorkspaceKit: (info) => workspace2Confirm({
    title: t("groups.representation"),
    message: t("groups.convertToWorkspaceKitConfirm", { count: Number(info?.nativeGroupCount || 0) }),
    confirmText: t("groups.convertToWorkspaceKit"),
    danger: true,
  }),
});

const { createSettingsDialogShell: buildSettingsDialogShell } = createSettingsDialogShell({
  document,
  t,
  toolbarButton,
});

function formatTimestamp(timestamp) {
  const value = Number(timestamp || 0);
  if (!value) {
    return t("settings.cacheEmpty");
  }
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function openWorkspaceSettings() {
  closeWorkspaceSettings();
  const { backdrop, dialog, header } = buildSettingsDialogShell({ onClose: closeWorkspaceSettings });

  const {
    shortcuts,
    workflowSettings,
    templateSettings,
    groupSettings,
    backgroundEffect,
    nodeCache,
    dataManagement,
    integrations,
    groupRepresentation,
    about,
    versionInfo,
  } = buildSettingsDialogSections();
  const providerSettings = buildProviderSettingsSection();

  // Keep every section mounted while switching pages. This lets the
  // asynchronous package-version update reach About even before it is opened.
  // Ordering rationale (T-204, 2026-07-28 user feedback): Appearance and
  // Advanced sit at the top because they cover global preferences that a
  // returning user is most likely to adjust; feature pages follow.
  // Nav order and grouping (user request 2026-07-29): Appearance on top, then
  // the feature group (Groups/Workflows/Templates), then Shortcuts/Advanced.
  // `dividerBefore` renders a separator line above that entry.
  const settingPages = [
    { id: "appearance", label: t("settings.nav.appearance"), icon: "palette", sections: [backgroundEffect] },
    { id: "groups", label: t("settings.nav.groups"), icon: "badge", dividerBefore: true, sections: [groupSettings] },
    { id: "workflows", label: t("settings.nav.workflows"), icon: "files", sections: [workflowSettings] },
    { id: "templates", label: t("settings.nav.templates"), icon: "template", sections: [templateSettings] },
    { id: "shortcuts", label: t("settings.nav.shortcuts"), icon: "keyboard", dividerBefore: true, sections: [shortcuts].filter(Boolean) },
    { id: "advanced", label: t("settings.nav.advanced"), icon: "settings", sections: [integrations, providerSettings, nodeCache, dataManagement, about].filter(Boolean) },
  ];
  const settingsLayout = document.createElement("div");
  settingsLayout.className = "workspace2-settings-layout";
  const settingsNav = document.createElement("nav");
  settingsNav.className = "workspace2-settings-nav";
  settingsNav.setAttribute("aria-label", t("settings.title"));
  const settingsPagesElement = document.createElement("div");
  settingsPagesElement.className = "workspace2-settings-pages";
  const pageButtons = new Map();
  const pageElements = new Map();
  const selectSettingsPage = (pageId) => {
    for (const page of settingPages) {
      const isActive = page.id === pageId;
      pageButtons.get(page.id)?.classList.toggle("is-active", isActive);
      pageButtons.get(page.id)?.setAttribute("aria-current", isActive ? "page" : "false");
      pageElements.get(page.id).hidden = !isActive;
    }
  };
  for (const page of settingPages) {
    if (page.dividerBefore) {
      const divider = document.createElement("div");
      divider.className = "workspace2-settings-nav-divider";
      divider.setAttribute("role", "separator");
      settingsNav.append(divider);
    }
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workspace2-settings-nav-button";
    if (page.icon) {
      const icon = iconSvg(page.icon);
      icon.classList.add("workspace2-settings-nav-icon");
      button.append(icon);
    }
    const label = document.createElement("span");
    label.className = "workspace2-settings-nav-label";
    label.textContent = page.label;
    button.append(label);
    button.addEventListener("click", () => selectSettingsPage(page.id));
    const pageElement = document.createElement("section");
    pageElement.className = "workspace2-settings-page";
    pageElement.append(...page.sections);
    settingsNav.append(button);
    settingsPagesElement.append(pageElement);
    pageButtons.set(page.id, button);
    pageElements.set(page.id, pageElement);
  }
  selectSettingsPage(settingPages[0].id);
  settingsLayout.append(settingsNav, settingsPagesElement);
  dialog.append(header, settingsLayout);
  backdrop.append(dialog);
  document.body.append(backdrop);
  workspaceState.settingsElement = backdrop;

  // The backend owns the package version.  Do not duplicate it in the UI:
  // doing so previously left Settings at 0.2.0-beta after the package had
  // already moved to 0.2.1b0.
  fetchJsonWithTimeout("/workspace2/info")
    .then((info) => {
      if (workspaceState.settingsElement !== backdrop || !versionInfo.isConnected) {
        return;
      }
      const version = String(info?.version || t("settings.versionUnavailable"));
      versionInfo.textContent = t("settings.version", { version });
    })
    .catch(() => {
      if (workspaceState.settingsElement === backdrop && versionInfo.isConnected) {
        versionInfo.textContent = t("settings.version", { version: t("settings.versionUnavailable") });
      }
    });

  const closeOnEscape = (event) => {
    if (event.key !== "Escape" || workspaceState.settingsElement !== backdrop) {
      return;
    }
    closeWorkspaceSettings();
  };
  workspaceState.settingsCloseHandler = closeOnEscape;
  window.addEventListener("keydown", closeOnEscape, true);
}

function registerWorkspace2CanvasGroupCommands() {
  const commandStore = app.extensionManager?.command;
  if (!Array.isArray(commandStore?.commands)) {
    return;
  }
  const commands = [
    {
      id: "Workspace2.CanvasGroups.CreateGroup",
      label: "WorkspaceKit: Create canvas group",
      function: () => {
        workspace2CanvasGroups.createGroupFromSelection?.();
      },
    },
    {
      id: "Workspace2.CanvasGroups.UngroupSelection",
      label: "WorkspaceKit: Ungroup selected canvas group",
      function: () => {
        workspace2CanvasGroups.ungroupSelection?.();
      },
    },
  ];
  for (const command of commands) {
    if (commandStore.commands.some((existing) => existing?.id === command.id)) {
      continue;
    }
    commandStore.commands.push(command);
  }
}

function activateWorkspace2Tab(tabId) {
  const manager = app.extensionManager;
  const methodNames = [
    "setActiveSidebarTab",
    "setSidebarTab",
    "selectSidebarTab",
    "openSidebarTab",
    "activateSidebarTab",
  ];
  for (const methodName of methodNames) {
    if (typeof manager?.[methodName] !== "function") {
      continue;
    }
    try {
      manager[methodName](tabId);
      return true;
    } catch (error) {
      console.debug(`[Workspace2] ${methodName} failed`, error);
    }
  }

  const element = findWorkspace2SidebarTabElement(tabId);
  if (element) {
    element.click();
    return true;
  }

  console.debug(`[Workspace2] Sidebar tab not found for shortcut: ${tabId}`);
  return false;
}

function findWorkspace2SidebarTabElement(tabId) {
  const selectors = [
    `[data-tab-id="${cssEscape(tabId)}"]`,
    `[data-sidebar-tab-id="${cssEscape(tabId)}"]`,
    `[data-id="${cssEscape(tabId)}"]`,
    `[id="${cssEscape(tabId)}"]`,
  ];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element instanceof HTMLElement) {
      return element.closest("button,[role='tab'],[role='button'],.p-tab,.p-button") || element;
    }
  }

  const expectedTitle = tabId === WORKSPACE2_TAB_ID
    ? (state.localeReady ? t("workspace.title") : "WorkspaceKit")
    : t("canvasGroups.title");
  const candidates = document.querySelectorAll("button,[role='tab'],[role='button'],.p-tab,.p-button");
  for (const candidate of candidates) {
    if (!(candidate instanceof HTMLElement)) {
      continue;
    }
    const text = candidate.textContent?.trim();
    const title = candidate.getAttribute("title") || candidate.getAttribute("aria-label") || "";
    if (text === expectedTitle || title === expectedTitle) {
      return candidate;
    }
  }
  return null;
}

function isolateComfyKeys(element) {
  const stop = (event) => event.stopPropagation();
  for (const eventName of ["keydown", "keyup", "keypress", "compositionstart", "compositionupdate", "compositionend"]) {
    element.addEventListener(eventName, stop);
  }
  element.addEventListener("input", stop);
  element.addEventListener("beforeinput", stop);
  element.addEventListener("paste", stop);
  return element;
}

function closeWorkspace2OverlaysForConfirm() {
  try { hideNodePreview(); } catch (error) {}
  try { closeTemplateContextMenu(); } catch (error) {}
  try { closeNodeContextMenu(); } catch (error) {}
  try { closeContextMenu(); } catch (error) {}
}

async function loadLocale() {
  state.locale = await configureI18n(app, FALLBACK_STRINGS);
  state.localeReady = true;
  state.strings = {};
}

// Sidebar registration is intentionally performed before optional feature
// startup. A failed workflow load, integration probe, or canvas enhancement
// must leave the user a reachable WorkspaceKit entry instead of making the
// whole plugin appear absent.
const runWorkspaceStartupStage = createWorkspaceStartupStageRunner({
  startup: workspaceState.startup,
  onFailure: (stage, error) => console.warn(`[WorkspaceKit] startup stage failed: ${stage}`, error),
});

function localeAssetUrl(locale) {
  return new URL(`./locales/${locale}.json`, import.meta.url).href;
}

async function refreshLocaleIfChanged() {
  const nextLocale = detectLocale();
  if (nextLocale === state.locale) {
    return;
  }
  await loadLocale();
  if (state.workflowsTarget?.isConnected) {
    renderPanel(state.workflowsTarget);
  }
  if (nodesState.renderTarget?.isConnected) {
    renderNodesPanel(nodesState.renderTarget);
  }
}

function startLocaleWatcher() {
  if (state.localeTimer) {
    return;
  }
  state.localeTimer = window.setInterval(() => {
    refreshLocaleIfChanged().catch((error) => {
      console.debug("[Workspace2] Locale refresh failed", error);
    });
  }, 1000);
}

const DEFAULT_GRAPH = {
  last_node_id: 9,
  last_link_id: 9,
  nodes: [
    { id: 7, type: "CLIPTextEncode", pos: [413, 389], size: { 0: 425.27801513671875, 1: 180.6060791015625 }, flags: {}, order: 3, mode: 0, inputs: [{ name: "clip", type: "CLIP", link: 5 }], outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [6], slot_index: 0 }], properties: {}, widgets_values: ["text, watermark"] },
    { id: 6, type: "CLIPTextEncode", pos: [415, 186], size: { 0: 422.84503173828125, 1: 164.31304931640625 }, flags: {}, order: 2, mode: 0, inputs: [{ name: "clip", type: "CLIP", link: 3 }], outputs: [{ name: "CONDITIONING", type: "CONDITIONING", links: [4], slot_index: 0 }], properties: {}, widgets_values: ["beautiful scenery nature glass bottle landscape, , purple galaxy bottle,"] },
    { id: 5, type: "EmptyLatentImage", pos: [473, 609], size: { 0: 315, 1: 106 }, flags: {}, order: 1, mode: 0, outputs: [{ name: "LATENT", type: "LATENT", links: [2], slot_index: 0 }], properties: {}, widgets_values: [512, 512, 1] },
    { id: 3, type: "KSampler", pos: [863, 186], size: { 0: 315, 1: 262 }, flags: {}, order: 4, mode: 0, inputs: [{ name: "model", type: "MODEL", link: 1 }, { name: "positive", type: "CONDITIONING", link: 4 }, { name: "negative", type: "CONDITIONING", link: 6 }, { name: "latent_image", type: "LATENT", link: 2 }], outputs: [{ name: "LATENT", type: "LATENT", links: [7], slot_index: 0 }], properties: {}, widgets_values: [156680208700286, true, 20, 8, "euler", "normal", 1] },
    { id: 8, type: "VAEDecode", pos: [1209, 188], size: { 0: 210, 1: 46 }, flags: {}, order: 5, mode: 0, inputs: [{ name: "samples", type: "LATENT", link: 7 }, { name: "vae", type: "VAE", link: 8 }], outputs: [{ name: "IMAGE", type: "IMAGE", links: [9], slot_index: 0 }], properties: {} },
    { id: 9, type: "SaveImage", pos: [1451, 189], size: { 0: 210, 1: 26 }, flags: {}, order: 6, mode: 0, inputs: [{ name: "images", type: "IMAGE", link: 9 }], properties: {} },
    { id: 4, type: "CheckpointLoaderSimple", pos: [26, 474], size: { 0: 315, 1: 98 }, flags: {}, order: 0, mode: 0, outputs: [{ name: "MODEL", type: "MODEL", links: [1], slot_index: 0 }, { name: "CLIP", type: "CLIP", links: [3, 5], slot_index: 1 }, { name: "VAE", type: "VAE", links: [8], slot_index: 2 }], properties: {}, widgets_values: ["v1-5-pruned-emaonly.ckpt"] },
  ],
  links: [
    [1, 4, 0, 3, 0, "MODEL"], [2, 5, 0, 3, 3, "LATENT"], [3, 4, 1, 6, 0, "CLIP"], [4, 6, 0, 3, 1, "CONDITIONING"], [5, 4, 1, 7, 0, "CLIP"], [6, 7, 0, 3, 2, "CONDITIONING"], [7, 3, 0, 8, 0, "LATENT"], [8, 4, 2, 8, 1, "VAE"], [9, 8, 0, 9, 0, "IMAGE"],
  ],
  groups: [],
  config: {},
  extra: {},
  version: 0.4,
};

async function fetchJsonWithTimeout(path, timeoutMs = NODE_OBJECT_INFO_FETCH_TIMEOUT) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchJson(path, { signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s: ${path}`);
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function fetchStaticJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(response.statusText);
  }
  return response.json();
}

async function refreshOfficialWorkflows() {
  const finish = startPerformanceSpan("workflows.official-sync");
  try {
    await app.extensionManager?.workflow?.syncWorkflows?.();
    finish();
  } catch (error) {
    finish({ error: error?.message || String(error) }, "error");
    console.debug("[Workspace2] Official workflow refresh failed", error);
  }
}

let officialWorkflowRefreshTimer = null;

function refreshOfficialWorkflowsDeferred(delayMs = 500) {
  if (officialWorkflowRefreshTimer) {
    window.clearTimeout(officialWorkflowRefreshTimer);
  }
  officialWorkflowRefreshTimer = window.setTimeout(async () => {
    officialWorkflowRefreshTimer = null;
    await refreshOfficialWorkflows();
  }, Math.max(0, Number(delayMs) || 0));
}

async function loadWorkflows() {
  const finish = startPerformanceSpan("workflows.load");
  state.status = t("status.loading");
  try {
    const data = await fetchJson("/workspace2/workflows");
    commitWorkflowItemSnapshot(data.items || []);
    state.root = data.root || "";
    state.officialRoot = data.official_root || "";
    state.folderMeta = data.folder_meta || {};
    state.isOfficialRoot = data.is_official_root !== false;
    state.status = t("status.items", { count: state.items.length });
    finish({ itemCount: state.items.length });
  } catch (error) {
    finish({ error: error?.message || String(error) }, "error");
    throw error;
  }
}

function workflowSignature(items) {
  return items
    .map((item) => `${item.type}:${item.path}:${item.updated_at || 0}:${item.size_bytes || 0}`)
    .sort()
    .join("|");
}

function trashSignature(items) {
  return items
    .map((item) => `${item.id}:${item.status}:${item.original_path}:${item.deleted_at || ""}`)
    .sort()
    .join("|");
}

async function changeWorkflowFolderIcon(el, item) {
  const meta = workflowFolderMeta(item.path);
  const value = window.prompt(t("folder.promptIcon"), meta.icon || "");
  if (value === null) {
    return;
  }
  await saveWorkflowFolderMeta(el, item.path, { icon: value.trim() });
}

async function changeWorkflowFolderColor(el, item) {
  const meta = workflowFolderMeta(item.path);
  const value = window.prompt(t("folder.promptColor"), meta.color || "");
  if (value === null) {
    return;
  }
  await saveWorkflowFolderMeta(el, item.path, { color: value.trim() });
}

function personalizeWorkflowFolder(el, item, anchor = null) {
  const meta = workflowFolderMeta(item.path);
  openPersonalizationPanel({
    title: t("folder.personalizeTitle"),
    name: item.name,
    icon: meta.icon || "",
    color: meta.color || "",
    anchor,
    onApply: async (value) => {
      await saveWorkflowFolderMeta(el, item.path, {
        icon: value.icon,
        color: value.color,
      });
    },
    onReset: async () => {
      await resetWorkflowFolderStyle(el, item);
    },
  });
}

function saveWorkflowCustomOrder() {
  workflowCustomOrderStore.save(state.customOrder);
}

const commitWorkflowItemSnapshot = workflowItems.commitSnapshot;
const commitLocalWorkflowItems = workflowItems.commitLocal;
const addLocalWorkflowItem = workflowItems.addLocal;
const remapLocalWorkflowItems = workflowItems.remapLocal;
const removeLocalWorkflowItems = workflowItems.removeLocal;

const remapWorkflowPathState = workflowPathState.remap;
const removeWorkflowPathState = workflowPathState.remove;


async function refreshPanel(el, options = {}) {
  await loadWorkflows();
  renderPanel(el);
  restoreTreeScrollTop(el, options.scrollTop);
}

function handleError(el, error) {
  state.status = t("status.error", { message: error.message });
  renderPanel(el);
}

function handleWorkflowRenameError(el, error) {
  const message = String(error?.message || "");
  const knownStatusKey = message === "Target already exists"
    ? "status.workflowRenameTargetExists"
    : message === "Source not found"
      ? "status.workflowRenameSourceMissing"
      : "";
  if (!knownStatusKey) {
    handleError(el, error);
    return;
  }
  state.status = t(knownStatusKey);
  renderPanel(el);
}

function officialWorkflowPath(path) {
  return `workflows/${String(path || "").replace(/^\/+/, "")}`;
}

async function openWorkflowFromOfficialStore(path) {
  if (!state.isOfficialRoot) {
    return { opened: false, initializeCleanState: false };
  }

  const workflowStore = getOfficialWorkflowStore(app);
  if (!workflowStore) {
    return { opened: false, initializeCleanState: false };
  }

  const storePath = officialWorkflowPath(path);
  let workflow = getOfficialWorkflowByPath(app, storePath);
  if (!workflow && typeof workflowStore.syncWorkflows === "function") {
    await workflowStore.syncWorkflows();
    workflow = getOfficialWorkflowByPath(app, storePath);
  }
  if (!workflow) {
    return { opened: false, initializeCleanState: false };
  }
  // Capture this before app.loadGraphData(): the official load hook adds the
  // target to openWorkflows. A workflow that was already open owns a baseline
  // (and possibly a dirty marker) from its earlier activation, so revisiting
  // it must not reset that state to clean.
  const wasAlreadyOpen = workflowStore.openWorkflows.includes(workflow);
  // Match workflowService.openWorkflow(): opening the active workflow is a
  // no-op. Reloading it through the extension path can deactivate and draft
  // the same ChangeTracker twice.
  if (typeof workflowStore.isActive === "function" && workflowStore.isActive(workflow)) {
    return { opened: true, initializeCleanState: false };
  }

  const loadFromRemote = !workflow.isLoaded;
  const loadedWorkflow = await loadOfficialWorkflow(workflow);
  if (!loadedWorkflow) {
    return { opened: false, initializeCleanState: false };
  }

  const workflowData = loadedWorkflow.activeState || (loadedWorkflow.content ? JSON.parse(loadedWorkflow.content) : null);
  if (!workflowData) {
    return { opened: false, initializeCleanState: false };
  }
  await app.loadGraphData(workflowData, true, true, workflow, {
    checkForRerouteMigration: false,
    deferWarnings: true,
    // Preserve the official service's cached-workflow path. It aborts scans
    // from the outgoing graph instead of re-running them during a tab switch.
    skipAssetScans: !loadFromRemote,
  });
  return { opened: true, initializeCleanState: !wasAlreadyOpen };
}

async function openWorkflow(path) {
  workflowOpenState.captureOfficialDirtyState();
  state.workflowLoadInProgress = true;
  clearCurrentWorkflowDirtyState();
  let officialOpen = { opened: false, initializeCleanState: false };
  try {
    try {
      officialOpen = await openWorkflowFromOfficialStore(path);
    } catch (error) {
      console.debug("[Workspace2] Official workflow open failed; using fallback", error);
    }

    if (!officialOpen.opened) {
      const data = await fetchJson(`/workspace2/workflow/read?path=${encodeURIComponent(path)}`);
      await app.loadGraphData(data.workflow);
    }
    state.selectedPath = path;
    // Only a first official open establishes a clean baseline. Calling this
    // after every tab activation used to erase the dirty marker for 99 in
    // `99 (edited) -> 100 (edited) -> 99`; keep the stored path state when
    // returning to an already open official workflow.
    if (!state.isOfficialRoot || !officialOpen.opened || officialOpen.initializeCleanState) {
      setCurrentWorkflowCleanState();
    }
    recordRecentWorkflow(path);
  } finally {
    state.workflowLoadInProgress = false;
  }
}

async function openWorkflowFileFromPicker(el) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.style.display = "none";
  document.body.append(input);
  try {
    const file = await new Promise((resolve) => {
      input.addEventListener("change", () => resolve(input.files?.[0] || null), { once: true });
      input.click();
    });
    if (!file) {
      return;
    }
    const text = await file.text();
    const workflow = JSON.parse(text);
    await app.loadGraphData(workflow);
    state.selectedPath = "";
    clearCurrentWorkflowDirtyState();
    state.status = t("status.openedWorkflowFile");
    renderPanel(el);
  } finally {
    input.remove();
  }
}

function serializeCurrentWorkflow() {
  const graph = app.graph || app.canvas?.graph;
  if (typeof graph?.serialize === "function") {
    return graph.serialize();
  }
  return null;
}

function workflowSnapshot(workflow = serializeCurrentWorkflow()) {
  return workflowOpenState.snapshot(workflow);
}

function clearCurrentWorkflowDirtyState() {
  workflowOpenState.clearDirtyState();
}

function setCurrentWorkflowCleanState(workflow = serializeCurrentWorkflow(), officialPath = "") {
  workflowOpenState.setCleanState(workflow, officialPath);
}

function setupWorkflowDirtyTracking() {
  workflowOpenState.setupDirtyTracking();
}

function syncOfficialWorkflowSelection() {
  workflowOpenState.syncOfficialSelection();
}

function scheduleOfficialWorkflowPanelRender() {
  workflowOpenState.scheduleOfficialPanelRender();
}

function setupOfficialWorkflowStateSync() {
  workflowOpenState.setupOfficialStoreSync();
}

async function saveCurrentWorkflowToPath(el, path) {
  if (!path) {
    throw new Error(t("status.workflowSaveMismatch"));
  }
  if (state.isOfficialRoot) {
    const officialWorkflow = getOfficialWorkflowByPath(app, officialWorkflowPath(path));
    if (officialWorkflow && await saveOfficialWorkflow(officialWorkflow)) {
      // The official workflow object can be replaced while the save settles.
      // Clear the sidebar's path-keyed indicator synchronously from the known
      // persisted path; do not wait for an active-object lookup to converge.
      state.officialWorkflowDirtyPaths.delete(path);
      setCurrentWorkflowCleanState(undefined, path);
      state.status = t("status.workflowSaved");
      recordRecentWorkflow(path);
      refreshOfficialWorkflowsDeferred(0);
      // `el` belongs to the click handler and can be a stale module mount.
      // Render through the normal official-state path after the deferred list
      // refresh, otherwise the now-clean save indicator remains until a tab switch.
      scheduleOfficialWorkflowPanelRender();
      return;
    }
  }
  if (path !== state.selectedPath) {
    throw new Error(t("status.workflowSaveMismatch"));
  }
  const workflow = serializeCurrentWorkflow();
  if (!workflow) {
    throw new Error(t("status.workflowSerializeUnavailable"));
  }
  await postJson("/workspace2/workflow/save", { path, workflow });
  setCurrentWorkflowCleanState(workflow);
  state.status = t("status.workflowSaved");
  recordRecentWorkflow(path);
  refreshOfficialWorkflowsDeferred(0);
  renderPanel(el);
}

async function openWorkflowLocation(path) {
  await postJson("/workspace2/open_item_location", { path });
}

async function setRootPath(el) {
  const nextPath = window.prompt(
    t("prompt.rootPath"),
    state.root || state.officialRoot || "",
  );
  if (nextPath === null) {
    return;
  }

  const data = await postJson("/workspace2/root/set", { root_path: nextPath.trim() });
  state.root = data.root || state.root;
  state.isOfficialRoot = data.is_official_root !== false;
  state.selectedPath = "";
  clearCurrentWorkflowDirtyState();
  state.expanded = new Set([""]);
  state.status = state.isOfficialRoot ? t("status.rootOfficial") : t("status.rootChanged");
  await refreshPanel(el);
  refreshOfficialWorkflowsDeferred(0);
}

async function createFolder(el, parent = "") {
  const name = uniqueWorkflowFolderName(parent);
  const path = joinPath(parent, name);
  const data = await postJson("/workspace2/folder/create", {
    parent_path: parent,
    name,
  });
  const createdPath = data?.path || path;
  addLocalWorkflowItem({
    type: "folder",
    name: createdPath.split("/").pop() || name,
    path: createdPath,
    updated_at: Date.now(),
  });
  state.expanded.add(parent);
  state.selectedPath = createdPath;
  state.editingPath = createdPath;
  state.editingSurface = "browse";
  state.status = t("status.folderCreated");
  renderPanel(el);
  refreshOfficialWorkflowsDeferred(250);
}

function selectedFolderPath() {
  const selected = state.items.find((item) => item.path === state.selectedPath);
  return selected?.type === "folder" ? selected.path : "";
}

function uniqueWorkflowFolderName(parent, baseName = t("folder.defaultName")) {
  const existing = new Set(
    state.items
      .filter((item) => item.type === "folder" && parentPath(item.path) === parent)
      .map((item) => item.name.toLowerCase()),
  );
  let name = baseName;
  let index = 2;
  while (existing.has(name.toLowerCase())) {
    name = `${baseName} ${index}`;
    index += 1;
  }
  return name;
}

function uniqueWorkflowPath(parent, baseName = "New Workflow") {
  const existing = new Set(state.items.map((item) => item.path.toLowerCase()));
  let name = `${baseName}.json`;
  let path = joinPath(parent, name);
  let index = 2;
  while (existing.has(path.toLowerCase())) {
    name = `${baseName} ${index}.json`;
    path = joinPath(parent, name);
    index += 1;
  }
  return path;
}

async function createWorkflow(el, parent = selectedFolderPath()) {
  const path = uniqueWorkflowPath(parent);
  const data = await postJson("/workspace2/workflow/save", {
    path,
    workflow: JSON.parse(JSON.stringify(DEFAULT_GRAPH)),
  });
  const createdPath = data?.path || path;
  addLocalWorkflowItem({
    type: "file",
    name: createdPath.split("/").pop() || "New Workflow.json",
    path: createdPath,
    size_bytes: 0,
    updated_at: Date.now(),
  });
  state.expanded.add(parent);
  state.selectedPath = createdPath;
  await refreshOfficialWorkflows();
  await openWorkflow(createdPath);
  state.status = t("status.workflowCreated");
  renderPanel(el);
}

async function renameItem(el, item, newName) {
  const oldPath = item.path;
  if (!newName) {
    state.editingPath = "";
    state.editingSurface = "";
    renderPanel(el);
    return;
  }
  let nextPath = workflowRenameTargetPath(item, newName);
  // The edit field intentionally hides `.json`, so comparing its display
  // value with item.name makes an unchanged file look renamed. Compare the
  // normalized target path instead and avoid a self-rename request.
  if (nextPath.toLowerCase() === oldPath.toLowerCase()) {
    state.editingPath = "";
    state.editingSurface = "";
    renderPanel(el);
    return;
  }
  const wasSelected = state.selectedPath === oldPath;
  const conflict = state.items.some((entry) =>
    entry.path !== oldPath && entry.path.toLowerCase() === nextPath.toLowerCase()
  );
  if (conflict) {
    throw new Error("Target already exists");
  }

  state.workflowRenameInProgress = true;
  let renameSucceeded = false;
  try {
    const workflowStore = app.extensionManager?.workflow;
    const officialWorkflow = state.isOfficialRoot && item.type === "file"
      ? workflowStore?.getWorkflowByPath?.(officialWorkflowPath(oldPath))
      : null;
    // `getWorkflowByPath()` searches ComfyUI's full file catalog.  It does
    // not mean the workflow is a live tab.  Calling its rename transaction
    // for a Browse-only file can promote it into `openWorkflows`, so reserve
    // that transaction for an actual open tab only.
    const isOpenOfficialWorkflow = Boolean(
      officialWorkflow && workflowStore?.openWorkflows?.includes(officialWorkflow),
    );
    if (isOpenOfficialWorkflow && typeof workflowStore?.renameWorkflow === "function") {
      await workflowStore.renameWorkflow(officialWorkflow, officialWorkflowPath(nextPath));
      nextPath = relativeWorkflowPathFromOfficial(officialWorkflow.path || officialWorkflowPath(nextPath));
    } else {
      const data = await postJson("/workspace2/rename", {
        path: item.path,
        new_name: newName,
      });
      nextPath = data?.path || nextPath;
    }
    remapLocalWorkflowItems(oldPath, nextPath);
    remapWorkflowPathState(oldPath, nextPath);
    state.editingPath = "";
    state.editingSurface = "";
    state.status = t("status.renamed");
    if (wasSelected) {
      state.selectedPath = nextPath;
      recordRecentWorkflow(nextPath);
    }
    // Browse-only rename already updated the local list above.  Do not call
    // syncWorkflows here: that refresh can also promote a catalog file into
    // the Open section even though the user never opened it.
    renameSucceeded = true;
  } finally {
    state.workflowRenameInProgress = false;
    // The official store can notify while a rename is still in progress.  Its
    // notification is intentionally deferred, but the panel must be rebuilt
    // once *after* the transaction flag is cleared; otherwise the Browse tree
    // may retain the old row's inline editor even though the file was renamed.
    if (renameSucceeded) {
      const renderTarget = state.workflowsTarget?.isConnected
        ? state.workflowsTarget
        : el;
      renderPanel(renderTarget);
    }
    if (state.officialWorkflowRenderPending) {
      state.officialWorkflowRenderPending = false;
      scheduleOfficialWorkflowPanelRender();
    }
  }
}

async function moveItem(el, sourcePath, targetFolder) {
  const source = state.items.find((entry) => entry.path === sourcePath);
  let nextPath = joinPath(
    targetFolder,
    source?.name || sourcePath.split("/").pop(),
  );
  const workflowStore = app.extensionManager?.workflow;
  const officialWorkflow = state.isOfficialRoot && source?.type === "file"
    ? workflowStore?.getWorkflowByPath?.(officialWorkflowPath(sourcePath))
    : null;

  // An open official workflow owns its path in ComfyUI's workflow store.
  // Moving only through /workspace2/move changes the file on disk but leaves
  // that object at its old path, so the Open list loses the tab after sync.
  // Use the same official rename transaction as renameItem() when possible;
  // ComfyUI accepts a nested target path and updates its open-tab state too.
  if (officialWorkflow && typeof workflowStore?.renameWorkflow === "function") {
    await workflowStore.renameWorkflow(officialWorkflow, officialWorkflowPath(nextPath));
    nextPath = relativeWorkflowPathFromOfficial(
      officialWorkflow.path || officialWorkflowPath(nextPath),
    );
  } else {
    const data = await postJson("/workspace2/move", {
      source_path: sourcePath,
      target_folder: targetFolder,
    });
    nextPath = data?.path || nextPath;
  }
  remapLocalWorkflowItems(sourcePath, nextPath);
  remapWorkflowPathState(sourcePath, nextPath);
  state.expanded.add(targetFolder);
  state.status = targetFolder ? t("status.movedTo", { target: targetFolder }) : t("status.movedToRoot");
  renderPanel(el);
  if (!officialWorkflow) {
    refreshOfficialWorkflowsDeferred(250);
  }
}

async function copyWorkflow(el, item) {
  if (!item?.path || item.type !== "file") {
    return;
  }
  const data = await postJson("/workspace2/workflow/copy", {
    path: item.path,
    // The server owns all filename construction; locale only chooses the
    // documented Copy / 副本 label and can never become a path fragment.
    locale: getLocale(),
  });
  const copiedPath = String(data?.path || "");
  if (!copiedPath) {
    throw new Error("Copy did not return a workflow path");
  }
  addLocalWorkflowItem({
    ...item,
    name: copiedPath.split("/").pop() || item.name,
    path: copiedPath,
    updated_at: Date.now(),
  });
  state.expanded.add(parentPath(copiedPath));
  state.status = t("status.workflowCopied", { name: workflowDisplayName({ ...item, name: copiedPath.split("/").pop() }) });
  // Copy is a Browse-only filesystem operation. Do not select the new file or
  // synchronize ComfyUI's official workflow Store here: that sync can promote
  // the discovered copy into Open even though the user never opened it.
  renderPanel(el);
}

async function moveToTrash(el, item) {
  const scrollTop = getTreeScrollTop(el);
  await postJson("/workspace2/trash/move", { path: item.path });
  removeLocalWorkflowItems(item.path);
  removeWorkflowPathState(item.path);
  state.status = t("status.movedToTrash");
  // In frosted-glass mode the visible shell lives in document.body while the
  // sidebar host remains its layout anchor. A delete also changes the
  // official workflow store asynchronously, so its previous module body can
  // be stale by the time this redraw runs. Rebuild from the stable host rather
  // than clearing that stale body; transparent mode keeps the cheaper redraw.
  const shouldRebuildGlassShell = isPanelGlassEnabled()
    && workspaceState.activeModule === "workflows"
    && workspaceState.renderTarget?.isConnected;
  if (shouldRebuildGlassShell) {
    renderWorkspace2Panel(workspaceState.renderTarget);
  } else {
    renderPanel(el);
    restoreTreeScrollTop(el, scrollTop);
  }
  refreshOfficialWorkflowsDeferred(250);
}

async function loadTrash() {
  const data = await fetchJson("/workspace2/trash/list");
  state.trashItems = data.items || [];
  state.trashSignature = trashSignature(state.trashItems);
  state.status = t("status.trashedItems", { count: state.trashItems.length });
}

async function pollForExternalChanges(el) {
  if (state.editingPath || state.pointerDrag || state.reorderDrag) {
    return;
  }
  try {
    const requestRevision = state.workflowListRevision;
    if (state.showTrash) {
      const data = await fetchJson("/workspace2/trash/list");
      const items = data.items || [];
      const nextSignature = trashSignature(items);
      if (nextSignature !== state.trashSignature) {
        state.trashItems = items;
        state.trashSignature = nextSignature;
        state.status = t("status.trashedItems", { count: items.length });
        renderPanel(el);
      }
      return;
    }

    const data = await fetchJson("/workspace2/workflows");
    if (requestRevision !== state.workflowListRevision || state.workflowRenameInProgress) {
      return;
    }
    const items = data.items || [];
    const nextSignature = workflowSignature(items);
    if (nextSignature !== state.signature) {
      commitWorkflowItemSnapshot(items);
      state.root = data.root || state.root;
      state.officialRoot = data.official_root || state.officialRoot;
      state.folderMeta = data.folder_meta || state.folderMeta || {};
      state.isOfficialRoot = data.is_official_root !== false;
      state.status = t("status.items", { count: items.length });
      renderPanel(el);
    }
  } catch (error) {
    state.status = t("status.refreshError", { message: error.message });
    renderPanel(el);
  }
}

function startAutoRefresh(el) {
  state.refreshTarget = el;
  if (state.refreshTimer) {
    return;
  }
  state.refreshTimer = setInterval(() => {
    if (state.refreshTarget) {
      pollForExternalChanges(state.refreshTarget);
    }
  }, 4000);
  window.addEventListener("focus", () => {
    if (state.refreshTarget) {
      pollForExternalChanges(state.refreshTarget);
    }
  });
}

async function restoreTrashItem(el, trashId, restoreMode = "original") {
  const data = await postJson("/workspace2/trash/restore", {
    trash_id: trashId,
    restore_mode: restoreMode,
  });
  const item = data?.item || {};
  const restoredPath = String(item.restored_path || item.original_path || "");
  if (!restoredPath) {
    throw new Error("Restore response did not include a workflow path");
  }
  const restoredItems = Array.isArray(data?.items) && data.items.length
    ? data.items
    : [{
        type: item.type === "folder" ? "folder" : "file",
        name: restoredPath.split("/").pop() || item.name || restoredPath,
        path: restoredPath,
        size_bytes: Number(item.size_bytes || 0),
        updated_at: Date.now(),
      }];
  commitLocalWorkflowItems([
    ...state.items.filter((entry) => !workflowPathIsWithin(entry.path, restoredPath)),
    ...restoredItems,
  ]);
  state.trashItems = state.trashItems.filter((entry) => entry.id !== trashId);
  state.trashSignature = trashSignature(state.trashItems);
  state.expanded.add(parentPath(restoredPath));
  state.status = t("status.trashedItems", { count: state.trashItems.length });
  refreshOfficialWorkflowsDeferred(250);
  renderPanel(el);
}

async function restoreTrashItemSmart(el, item) {
  try {
    await restoreTrashItem(el, item.id, "original");
  } catch (error) {
    if (String(error.message || "").includes("already exists")) {
      await restoreTrashItem(el, item.id, "copy_name");
      return;
    }
    throw error;
  }
}

async function moveTrashItemToSystemTrash(el, item) {
  await postJson("/workspace2/trash/system_delete", { trash_id: item.id });
  state.trashItems = state.trashItems.filter((entry) => entry.id !== item.id);
  state.trashSignature = trashSignature(state.trashItems);
  state.status = t("status.systemDeleted");
  renderPanel(el);
}

async function emptyTrash(el) {
  if (!state.trashItems.length) {
    return;
  }
  const result = await postJson("/workspace2/trash/empty", {});
  const removedIds = new Set(
    (result.removed || []).map((item) => String(item?.id || "")).filter(Boolean),
  );
  state.trashItems = state.trashItems.filter(
    (item) => !removedIds.has(String(item.id || "")),
  );
  state.trashSignature = trashSignature(state.trashItems);
  const details = (result.errors || [])
    .slice(0, 3)
    .map((item) => `${item.name || item.id || ""}: ${item.error || ""}`.trim())
    .filter(Boolean)
    .join("；");
  state.status = result.errors?.length
    ? t("status.systemTrashPartial", { count: result.errors.length, details })
    : t("status.systemTrashDone");
  renderPanel(el);
}

function iconSvg(name) {
  const paths = {
    folderPlus: '<path d="M3 7h5l2 2h11v9a2 2 0 0 1-2 2H3z"/><path d="M12 14h6"/><path d="M15 11v6"/>',
    filePlus: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 15h6"/><path d="M12 12v6"/>',
    refresh: '<path d="M21 12a9 9 0 0 1-15.4 6.4L3 16"/><path d="M3 16h6v6"/><path d="M3 12A9 9 0 0 1 18.4 5.6L21 8"/><path d="M21 8h-6V2"/>',
    folderOpen: '<path d="M3 7h5l2 2h11"/><path d="M3 7v13h16l3-9H6l-3 9"/>',
    save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
    trash: '<path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M6 6l1 16h10l1-16"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    trashPage: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>',
    archiveTray: '<path d="M4 4h16v5H4z"/><path d="M4 9l2 11h12l2-11"/><path d="M9 14h6"/><path d="M8 4l1.5-2h5L16 4"/>',
    systemTrash: '<path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11l4 4"/><path d="M14 11l-4 4"/>',
    files: '<path d="M8 2h8l4 4v12a2 2 0 0 1-2 2H8z"/><path d="M16 2v5h5"/><path d="M4 6v16h12"/>',
    open: '<path d="M7 17L17 7"/><path d="M8 7h9v9"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13 7l4 4"/>',
    palette: '<path d="M12 3a9 9 0 0 0 0 18h1.5a1.8 1.8 0 0 0 1.3-3.1 1.8 1.8 0 0 1 1.3-3h1.9A3 3 0 0 0 21 12a9 9 0 0 0-9-9z"/><circle cx="7.5" cy="10" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="14" cy="7.5" r="1"/><circle cx="16.5" cy="10" r="1"/>',
    badge: '<path d="M5 5h14v14H5z"/><path d="M8 9h8"/><path d="M8 13h5"/>',
    template: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8h8"/><path d="M8 12h5"/><path d="M8 16h8"/>',
    previewDetailed: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M7 8h10"/><path d="M7 12h10"/><path d="M7 16h6"/>',
    previewCompact: '<rect x="5" y="6" width="14" height="12" rx="2"/><path d="M8 10h8"/><path d="M8 14h5"/>',
    restore: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v6h6"/>',
    copy: '<path d="M8 8h12v12H8z"/><path d="M4 16V4h12"/>',
    target: '<circle cx="12" cy="12" r="7"/><path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/>',
    rootArrow: '<path d="M3 12h13a5 5 0 0 1 5 5v3"/><path d="M3 12l5-5"/><path d="M3 12l5 5"/>',
    sort: '<path d="M11 5H4"/><path d="M11 9H7"/><path d="M11 13H9"/><path d="M15 3v18"/><path d="M15 21l4-4"/><path d="M15 21l-4-4"/>',
    sync: '<path d="M21 12a9 9 0 0 1-14.6 7"/><path d="M3 12A9 9 0 0 1 17.6 5"/><path d="M17 2v4h4"/><path d="M7 22v-4H3"/>',
    arrowsUpDown: '<path d="M8 3v14"/><path d="M4 13l4 4 4-4"/><path d="M16 21V7"/><path d="M12 11l4-4 4 4"/>',
    download: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
    upload: '<path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/>',
    star: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z"/>',
    starFilled: '<path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-2.9-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z" fill="currentColor"/>',
    settings: '<path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5z"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1A2 2 0 1 1 7.1 4l.1.1a1.7 1.7 0 0 0 1.9.3h.1A1.7 1.7 0 0 0 10 2.9V3a2 2 0 1 1 4 0v-.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.9 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    chevronDown: '<path d="M6 9l6 6 6-6"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01"/><path d="M10 10h.01"/><path d="M14 10h.01"/><path d="M18 10h.01"/><path d="M8 14h8"/>',
    x: '<path d="M6 6l12 12"/><path d="M18 6L6 18"/>',
  };
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = paths[name] || paths.files;
  return svg;
}

function toolbarButton(iconName, title, onClick) {
  const element = document.createElement("button");
  element.className = "workspace2-button";
  element.type = "button";
  element.title = title;
  element.setAttribute("aria-label", title);
  element.append(iconSvg(iconName));
  element.addEventListener("click", onClick);
  return element;
}

function iconButton(iconName, title, onClick) {
  const element = document.createElement("button");
  element.className = "workspace2-icon-button";
  element.type = "button";
  element.title = title;
  element.setAttribute("aria-label", title);
  element.append(iconSvg(iconName));
  element.addEventListener("click", (event) => {
    if (nodesState.suppressClick) {
      nodesState.suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    event.stopPropagation();
    onClick(event);
  });
  return element;
}

function dangerIconButton(iconName, title, onClick) {
  const element = iconButton(iconName, title, onClick);
  element.classList.add("is-danger-action");
  return element;
}

async function saveNodeLibrary(el) {
  const data = await postJson("/workspace2/nodes/library", { library: nodesState.library });
  nodesState.library = normalizeNodeLibrary(data.library);
  if (el) {
    renderNodesPanel(el);
  }
}

const {
  emptyTemplateLibrary,
  normalizeTemplateLibrary,
  loadTemplateLibrary,
  prefetchTemplateLibrary,
  saveTemplateLibrary,
  uniqueTemplateGroupName,
  getTemplateGroup,
  childTemplateGroups,
  isTemplateGroupDescendant,
  normalizeTemplateOrders,
} = createTemplateLibraryStore({
  state: templatesState,
  t,
  fetchJson,
  postJson,
  startPerformanceSpan,
  measurePromise,
  renderTemplatesPanel,
});

async function createTemplateGroup(el, parentId = "") {
  templatesState.library = normalizeTemplateLibrary(templatesState.library || emptyTemplateLibrary());
  const normalizedParentId = parentId && getTemplateGroup(parentId) ? String(parentId) : "";
  const id = `template-group-${Date.now().toString(36)}`;
  const siblings = childTemplateGroups(normalizedParentId);
  templatesState.library.groups.push({
    id,
    name: uniqueTemplateGroupName(),
    parentId: normalizedParentId,
    order: siblings.length ? Math.max(...siblings.map((group) => Number(group.order) || 0)) + 1 : 0,
    collapsed: false,
    icon: "",
    color: "",
  });
  if (normalizedParentId) {
    templatesState.expanded.add(normalizedParentId);
  }
  templatesState.expanded.add(id);
  templatesState.editingGroupId = id;
  await saveTemplateLibrary(el);
}

async function commitTemplateGroupRename(el, group, value) {
  const name = String(value || "").trim();
  if (!name || name === group.name) {
    templatesState.editingGroupId = "";
    renderTemplatesPanel(el);
    return;
  }
  group.name = name;
  templatesState.editingGroupId = "";
  await saveTemplateLibrary(el);
}

async function deleteTemplateGroup(el, group) {
  for (const template of templatesState.library.templates || []) {
    if (template.groupId === group.id) {
      template.groupId = "";
    }
  }
  for (const child of templatesState.library.groups || []) {
    if (child.parentId === group.id) {
      child.parentId = "";
    }
  }
  templatesState.library.groups = (templatesState.library.groups || []).filter((item) => item.id !== group.id);
  templatesState.expanded.delete(group.id);
  normalizeTemplateOrders("");
  await saveTemplateLibrary(el);
}

function requestDeleteTemplateGroup(el, group, anchor = null) {
  const target = anchor || el?.querySelector?.(`[data-workspace2-template-group-id="${cssEscape(group.id)}"] .workspace2-actions`);
  workspace2InlineConfirm(target, {
    confirmText: t("confirm.delete"),
    onConfirm: async () => {
      try {
        await deleteTemplateGroup(el, group);
      } catch (error) {
        templatesState.error = error.message;
        renderTemplatesPanel(el);
      }
    },
  });
}

async function resetTemplateGroupStyle(el, group) {
  group.icon = "";
  group.color = "";
  await saveTemplateLibrary(el);
}

function personalizeTemplateGroup(el, group, anchor = null) {
  openPersonalizationPanel({
    title: t("folder.personalizeTitle"),
    name: group.name,
    icon: group.icon || "",
    color: group.color || "",
    anchor,
    onApply: async (value) => {
      group.icon = value.icon;
      group.color = value.color;
      await saveTemplateLibrary(el);
    },
    onReset: async () => {
      await resetTemplateGroupStyle(el, group);
    },
  });
}

async function moveTemplateToGroup(el, templateId, targetGroupId = "", beforeTemplateId = "") {
  const template = (templatesState.library?.templates || []).find((item) => item.id === templateId);
  if (!template) {
    return;
  }
  const normalizedTarget = targetGroupId && getTemplateGroup(targetGroupId) ? String(targetGroupId) : "";
  const sourceGroupId = template.groupId || "";
  if (sourceGroupId === normalizedTarget && beforeTemplateId === template.id) {
    return;
  }
  template.groupId = normalizedTarget;
  normalizeTemplateOrders(sourceGroupId);
  const targetItems = (templatesState.library.templates || [])
    .filter((item) => (item.groupId || "") === normalizedTarget && item.id !== template.id)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  const beforeIndex = beforeTemplateId ? targetItems.findIndex((item) => item.id === beforeTemplateId) : -1;
  const insertIndex = beforeIndex >= 0 ? beforeIndex : targetItems.length;
  targetItems.splice(insertIndex, 0, template);
  targetItems.forEach((item, index) => {
    item.order = index;
  });
  if (normalizedTarget) {
    templatesState.expanded.add(normalizedTarget);
  }
  await saveTemplateLibrary(el);
}

async function moveTemplateGroupToParent(el, groupId, targetParentId = "") {
  const group = getTemplateGroup(groupId);
  if (!group) {
    return;
  }
  const normalizedParentId = targetParentId && getTemplateGroup(targetParentId) ? String(targetParentId) : "";
  if (normalizedParentId === group.id || isTemplateGroupDescendant(normalizedParentId, group.id)) {
    return;
  }
  if ((group.parentId || "") === normalizedParentId) {
    return;
  }
  group.parentId = normalizedParentId;
  const siblings = childTemplateGroups(normalizedParentId).filter((item) => item.id !== group.id);
  group.order = siblings.length ? Math.max(...siblings.map((item) => Number(item.order) || 0)) + 1 : 0;
  if (normalizedParentId) {
    templatesState.expanded.add(normalizedParentId);
  }
  await saveTemplateLibrary(el);
}

function selectedGraphNodes(override = null) {
  if (Array.isArray(override)) {
    return override.filter(Boolean);
  }
  const selected = app.canvas?.selected_nodes;
  if (selected instanceof Map) {
    return [...selected.values()].filter(Boolean);
  }
  if (Array.isArray(selected)) {
    return selected.filter(Boolean);
  }
  if (selected && typeof selected === "object") {
    return Object.values(selected).filter(Boolean);
  }
  return (app.graph?._nodes || []).filter((node) => node?.selected);
}

function cloneJsonSafe(value, fallback = null) {
  if (value == null) {
    return fallback;
  }
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
  } catch {}
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function graphLinksArray() {
  const links = app.graph?.links;
  if (!links) {
    return [];
  }
  if (Array.isArray(links)) {
    return links.filter(Boolean);
  }
  if (links instanceof Map) {
    return [...links.values()].filter(Boolean);
  }
  if (typeof links === "object") {
    return Object.values(links).filter(Boolean);
  }
  return [];
}

function normalizeGraphLink(link) {
  if (Array.isArray(link)) {
    return {
      id: link[0],
      origin_id: link[1],
      origin_slot: link[2],
      target_id: link[3],
      target_slot: link[4],
      type: link[5] || "",
    };
  }
  return {
    id: link.id,
    origin_id: link.origin_id,
    origin_slot: link.origin_slot,
    target_id: link.target_id,
    target_slot: link.target_slot,
    type: link.type || "",
  };
}

function vectorPair(value, fallback = [0, 0]) {
  if (Array.isArray(value) || ArrayBuffer.isView(value)) {
    return [
      Number(value[0] ?? fallback[0] ?? 0),
      Number(value[1] ?? fallback[1] ?? 0),
    ];
  }
  if (value && typeof value === "object") {
    return [
      Number(value.x ?? value[0] ?? fallback[0] ?? 0),
      Number(value.y ?? value[1] ?? fallback[1] ?? 0),
    ];
  }
  return [Number(fallback[0] || 0), Number(fallback[1] || 0)];
}

function nodePosition(node, serialized = null) {
  const source = serialized?.pos ?? node?.pos;
  return vectorPair(source, [0, 0]);
}

function nodeSize(node, serialized = null) {
  const source = serialized?.size ?? node?.size;
  return vectorPair(source, [180, 80]);
}

function serializeTemplateNode(node) {
  const serialized = cloneJsonSafe(node.serialize?.(), {}) || {};
  const pos = nodePosition(node, serialized);
  const size = nodeSize(node, serialized);
  return {
    id: node.id,
    type: node.type || serialized.type || "",
    title: node.title || serialized.title || "",
    pos,
    size,
    flags: cloneJsonSafe(serialized.flags || node.flags || {}, {}),
    order: Number(serialized.order ?? node.order ?? 0),
    mode: Number(serialized.mode ?? node.mode ?? 0),
    properties: cloneJsonSafe(serialized.properties || node.properties || {}, {}),
    widgets_values: Array.isArray(serialized.widgets_values)
      ? cloneJsonSafe(serialized.widgets_values, [])
      : cloneJsonSafe((node.widgets || []).map((widget) => widget?.value), []),
    color: serialized.color || node.color || "",
    bgcolor: serialized.bgcolor || node.bgcolor || "",
    inputs: cloneJsonSafe(serialized.inputs || node.inputs || [], []),
    outputs: cloneJsonSafe(serialized.outputs || node.outputs || [], []),
  };
}

function templateBounds(nodes) {
  if (!nodes.length) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    const x = Number(node.pos?.[0] || 0);
    const y = Number(node.pos?.[1] || 0);
    const width = Number(node.size?.[0] || 180);
    const height = Number(node.size?.[1] || 80);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function defaultTemplateName(nodes) {
  if (!nodes.length) {
    return t("templates.defaultName");
  }
  if (nodes.length === 1) {
    return nodes[0].title || nodes[0].type || t("templates.defaultName");
  }
  const first = nodes[0].title || nodes[0].type || t("templates.defaultName");
  return `${first} + ${nodes.length - 1}`;
}

function uniqueTemplateName(baseName = t("templates.defaultName")) {
  const existing = new Set((templatesState.library?.templates || []).map((template) => template.name.toLocaleLowerCase()));
  let name = baseName;
  let index = 2;
  while (existing.has(name.toLocaleLowerCase())) {
    name = `${baseName} ${index}`;
    index += 1;
  }
  return name;
}

function serializeSelectedTemplate(name = "", selectedNodesOverride = null) {
  const selectedNodes = selectedGraphNodes(selectedNodesOverride);
  if (!selectedNodes.length) {
    throw new Error(t("templates.selectNodesFirst"));
  }
  const nodeIds = new Set(selectedNodes.map((node) => Number(node.id)));
  const nodes = selectedNodes.map(serializeTemplateNode).filter((node) => node.type);
  const bounds = templateBounds(nodes);
  for (const node of nodes) {
    node.relPos = [
      Number(node.pos?.[0] || 0) - Number(bounds.x || 0),
      Number(node.pos?.[1] || 0) - Number(bounds.y || 0),
    ];
  }
  const links = graphLinksArray()
    .map(normalizeGraphLink)
    .filter((link) => nodeIds.has(Number(link.origin_id)) && nodeIds.has(Number(link.target_id)))
    .map((link) => ({
      id: link.id,
      origin_id: link.origin_id,
      origin_slot: Number(link.origin_slot || 0),
      target_id: link.target_id,
      target_slot: Number(link.target_slot || 0),
      type: String(link.type || ""),
    }));
  const now = Date.now();
  return {
    id: `template-${now}-${Math.random().toString(36).slice(2, 8)}`,
    name: name.trim() || uniqueTemplateName(defaultTemplateName(selectedNodes)),
    groupId: "",
    order: templatesState.library?.templates?.length || 0,
    nodes,
    links,
    bounds,
    createdAt: now,
    updatedAt: now,
    useCount: 0,
    lastUsed: 0,
    source: "workspace2",
  };
}

async function saveSelectedNodesAsTemplate(el = templatesState.renderTarget, selectedNodesOverride = null) {
  if (!templatesState.library) {
    await loadTemplateLibrary();
  }
  const selectedNodes = selectedGraphNodes(selectedNodesOverride);
  if (!selectedNodes.length) {
    await workspace2Notice({
      title: t("templates.title"),
      message: t("templates.selectNodesFirst"),
    });
    return null;
  }
  const template = serializeSelectedTemplate(
    uniqueTemplateName(defaultTemplateName(selectedNodes)),
    selectedNodes,
  );
  templatesState.library = normalizeTemplateLibrary(templatesState.library || emptyTemplateLibrary());
  templatesState.library.templates.push(template);
  templatesState.editingTemplateId = template.id;
  await saveTemplateLibrary(el);
  const toast = app.extensionManager?.toast;
  const message = t("templates.saved", { name: template.name });
  if (toast?.add) {
    toast.add({ severity: "success", summary: "Workspace2", detail: message, life: 2500 });
  } else {
    console.info(`[Workspace2] ${message}`);
  }
  return template;
}

async function saveSelectedNodesAsTemplateFromContextMenu(contextNode = null) {
  try {
    const selectedNodes = selectedGraphNodes();
    // Node menus should work for the node under the pointer even when ComfyUI
    // has not added it to selected_nodes. Do not change the user's selection.
    const nodesToSave = selectedNodes.length
      ? selectedNodes
      : (contextNode ? [contextNode] : []);
    const template = await saveSelectedNodesAsTemplate(null, nodesToSave);
    if (!template) {
      return;
    }
    await openTemplatesForRename(template.id);
  } catch (error) {
    await workspace2Notice({
      title: t("templates.title"),
      message: error?.message || String(error),
    });
  }
}

function templateRenameInput(templateId) {
  const row = document.querySelector(`[data-workspace2-template-id="${CSS.escape(templateId)}"]`);
  return row?.querySelector(".workspace2-rename-input") || null;
}

async function openTemplatesForRename(templateId) {
  templatesState.editingTemplateId = templateId;
  // All Workspace2 shortcuts use this non-toggling path. Alt+C must always
  // leave Templates open before it waits for the rename input.
  openWorkspace2Module("templates");

  // Sidebar activation can mount on the next frame. Waiting for the specific
  // template row avoids the former race where Alt+C saved successfully but
  // focus was attempted before the Templates panel existed.
  const deadline = performance.now() + 1800;
  while (performance.now() < deadline) {
    const input = templateRenameInput(templateId);
    if (input) {
      input.focus();
      input.select();
      return true;
    }
    await new Promise((resolve) => window.setTimeout(resolve, 32));
  }
  console.warn("[Workspace2] Template rename input was not mounted after save", { templateId });
  return false;
}

async function saveSelectedNodesAsTemplateFromShortcut() {
  try {
    const template = await saveSelectedNodesAsTemplate(null);
    if (!template) {
      return;
    }
    if (isWorkspace2AltCOpenTemplatesEnabled()) {
      await openTemplatesForRename(template.id);
    } else if (templatesState.renderTarget?.isConnected) {
      templatesState.editingTemplateId = template.id;
      renderTemplatesPanel(templatesState.renderTarget);
    }
  } catch (error) {
    templatesState.error = error.message || String(error);
    if (templatesState.renderTarget?.isConnected) {
      renderTemplatesPanel(templatesState.renderTarget);
    } else {
      alert(templatesState.error);
    }
  }
}

function canvasCenterPosition() {
  const canvasElement = app.canvas?.canvas || app.canvasEl || document.querySelector("canvas");
  if (!canvasElement) {
    return null;
  }
  const rect = canvasElement.getBoundingClientRect();
  return canvasPositionFromClient(rect.left + rect.width / 2, rect.top + rect.height / 2);
}

function nextGraphNodeId(graph, reserved) {
  const ids = (graph?._nodes || [])
    .map((node) => Number(node?.id || 0))
    .filter((id) => Number.isFinite(id));
  for (const id of reserved) {
    ids.push(Number(id || 0));
  }
  const next = Math.max(0, ...ids) + 1;
  reserved.add(next);
  return next;
}

function applyTemplateNodeData(node, data) {
  if (data.title) {
    node.title = data.title;
  }
  if (Array.isArray(data.size)) {
    node.size = [Number(data.size[0] || 0), Number(data.size[1] || 0)];
  }
  if (data.flags && typeof data.flags === "object") {
    node.flags = cloneJsonSafe(data.flags, {});
  }
  if (Number.isFinite(Number(data.mode))) {
    node.mode = Number(data.mode);
  }
  if (data.properties && typeof data.properties === "object") {
    node.properties = { ...(node.properties || {}), ...cloneJsonSafe(data.properties, {}) };
  }
  if (data.color) {
    node.color = data.color;
  }
  if (data.bgcolor) {
    node.bgcolor = data.bgcolor;
  }
  if (Array.isArray(data.widgets_values) && Array.isArray(node.widgets)) {
    data.widgets_values.forEach((value, index) => {
      if (node.widgets[index]) {
        node.widgets[index].value = cloneJsonSafe(value, value);
      }
    });
  }
}

async function addTemplateToCanvas(template, pos) {
  if (!globalThis.LiteGraph?.createNode || !app.graph) {
    throw new Error(t("templates.canvasUnavailable"));
  }
  const nodes = Array.isArray(template?.nodes) ? template.nodes : [];
  if (!nodes.length) {
    throw new Error(t("templates.canvasUnavailable"));
  }
  const target = pos || canvasCenterPosition();
  if (!target) {
    throw new Error(t("templates.canvasUnavailable"));
  }
  const bounds = template.bounds && Number.isFinite(Number(template.bounds.x))
    ? template.bounds
    : templateBounds(nodes);
  const origin = [Number(bounds.x || 0), Number(bounds.y || 0)];
  const idMap = new Map();
  const reserved = new Set();
  const created = [];
  const missing = [];

  for (const data of nodes) {
    const node = globalThis.LiteGraph.createNode(data.type);
    if (!node) {
      missing.push(data.type);
      continue;
    }
    const newId = nextGraphNodeId(app.graph, reserved);
    idMap.set(String(data.id), newId);
    node.id = newId;
    const relPos = Array.isArray(data.relPos)
      ? vectorPair(data.relPos, [0, 0])
      : [
          Number(data.pos?.[0] || 0) - origin[0],
          Number(data.pos?.[1] || 0) - origin[1],
        ];
    node.pos = [target[0] + relPos[0], target[1] + relPos[1]];
    applyTemplateNodeData(node, data);
    app.graph.add(node);
    node.onAdded?.();
    created.push(node);
  }

  for (const link of template.links || []) {
    const originId = idMap.get(String(link.origin_id));
    const targetId = idMap.get(String(link.target_id));
    if (!originId || !targetId) {
      continue;
    }
    const originNode = app.graph.getNodeById?.(originId);
    const targetNode = app.graph.getNodeById?.(targetId);
    if (!originNode || !targetNode) {
      continue;
    }
    try {
      originNode.connect(Number(link.origin_slot || 0), targetNode, Number(link.target_slot || 0));
    } catch (error) {
      console.debug("[Workspace2] Template link restore failed", error);
    }
  }

  if (!created.length && missing.length) {
    throw new Error(t("templates.restoreMissing", { count: missing.length, types: [...new Set(missing)].join(", ") }));
  }
  if (missing.length) {
    alert(t("templates.restoreMissing", { count: missing.length, types: [...new Set(missing)].join(", ") }));
  }
  app.canvas?.selectNodes?.(created);
  app.canvas?.setDirty?.(true, true);
  app.graph.setDirtyCanvas?.(true, true);
  app.graph.change?.();
  return created;
}

async function recordTemplateUse(el, templateId) {
  const template = templatesState.library?.templates?.find((item) => item.id === templateId);
  if (!template) {
    return;
  }
  template.useCount = Number(template.useCount || 0) + 1;
  template.lastUsed = Date.now();
  await saveTemplateLibrary(el);
}

async function renameTemplate(el, template, newName) {
  const name = String(newName || "").trim();
  templatesState.editingTemplateId = "";
  if (!name || name === template.name) {
    renderTemplatesPanel(el);
    return;
  }
  template.name = name;
  template.updatedAt = Date.now();
  await saveTemplateLibrary(el);
}

function closeTemplateContextMenu() {
  if (templatesState.contextMenuCloseHandler) {
    window.removeEventListener("pointerdown", templatesState.contextMenuCloseHandler, true);
    document.removeEventListener("pointerdown", templatesState.contextMenuCloseHandler, true);
    window.removeEventListener("keydown", templatesState.contextMenuCloseHandler, true);
    templatesState.contextMenuCloseHandler = null;
  }
  templatesState.contextMenuElement?.remove();
  templatesState.contextMenuElement = null;
  templatesState.contextMenu = null;
}

function openTemplateContextMenu(el, event, template) {
  event.preventDefault();
  event.stopPropagation();
  templatesState.contextMenu = {
    x: event.clientX,
    y: event.clientY,
    template,
  };
  renderTemplateContextMenu(el);
}

async function placeTemplateAtCanvasCenter(el, template) {
  await addTemplateToCanvas(template, canvasCenterPosition());
  await recordTemplateUse(el, template.id);
}

function updatePendingTemplateUi() {
  const target = templatesState.renderTarget;
  if (!target?.isConnected) {
    return;
  }
  const selectedId = templatesState.pendingTemplate?.id || "";
  const status = target.querySelector("[data-workspace2-templates-status]");
  if (status) {
    const templates = templatesState.library?.templates || [];
    status.textContent = selectedId
      ? t("templates.pendingPlace", { name: templatesState.pendingTemplate.name })
      : t("templates.status", { count: templates.length });
  }
  target.querySelectorAll(".workspace2-template-row.is-selected").forEach((row) => {
    row.classList.remove("is-selected");
  });
  if (!selectedId) {
    return;
  }
  target.querySelectorAll(`[data-workspace2-template-id="${cssEscape(selectedId)}"]`).forEach((row) => {
    row.classList.add("is-selected");
  });
}

function setPendingTemplate(template) {
  templatesState.pendingTemplate = template
    ? {
        ...template,
        nodes: Array.isArray(template.nodes) ? cloneJsonSafe(template.nodes, []) : [],
        links: Array.isArray(template.links) ? cloneJsonSafe(template.links, []) : [],
      }
    : null;
  if (templatesState.pendingTemplate) {
    setPendingNode(null);
  } else {
    hideNodePreview();
  }
  updatePendingTemplateUi();
}

async function placePendingTemplateAt(clientX, clientY) {
  if (!templatesState.pendingTemplate) {
    return false;
  }
  const template = templatesState.pendingTemplate;
  const pos = canvasPositionFromClient(clientX, clientY);
  setPendingTemplate(null);
  await addTemplateToCanvas(template, pos);
  await recordTemplateUse(templatesState.renderTarget, template.id);
  return true;
}

async function deleteTemplate(el, template) {
  if (templatesState.pendingTemplate?.id === template.id) {
    setPendingTemplate(null);
  }
  templatesState.library = normalizeTemplateLibrary(templatesState.library || emptyTemplateLibrary());
  templatesState.library = moveTemplateToTrash(templatesState.library, template);
  templatesState.editingTemplateId = "";
  await saveTemplateLibrary(el);
}

// Settings actions deliberately do not reuse toolbarButton(). Toolbar buttons
// are compact, icon-only controls for panel chrome; settings actions need a
// stable label, aligned hit area, and explicit risk treatment.
function settingsActionButton(iconName, label, onClick, { variant = "secondary" } = {}) {
  const element = document.createElement("button");
  element.className = `workspace2-settings-action workspace2-settings-action--${variant}`;
  element.type = "button";
  element.title = label;
  element.setAttribute("aria-label", label);
  element.append(iconSvg(iconName));
  const text = document.createElement("span");
  text.textContent = label;
  element.append(text);
  element.addEventListener("click", onClick);
  return element;
}

async function restoreTemplateTrashEntry(el, entry) {
  const library = normalizeTemplateLibrary(templatesState.library || emptyTemplateLibrary());
  templatesState.library = restoreTemplateFromTrash(library, entry);
  await saveTemplateLibrary(el);
}

async function permanentlyDeleteTemplateTrashEntry(el, entry) {
  const library = normalizeTemplateLibrary(templatesState.library || emptyTemplateLibrary());
  templatesState.library = permanentlyDeleteTemplateFromTrash(library, entry);
  await saveTemplateLibrary(el);
}

async function emptyTemplateTrash(el) {
  const library = normalizeTemplateLibrary(templatesState.library || emptyTemplateLibrary());
  templatesState.library = emptyTemplateTrashStore(library);
  await saveTemplateLibrary(el);
}

function renderTemplateTrashBody(el, body) {
  const entries = templatesState.library?.trash || [];
  if (!entries.length) {
    const empty = document.createElement("div");
    empty.className = "workspace2-empty";
    empty.textContent = t("templates.trashEmpty");
    body.append(empty);
    return;
  }
  const list = document.createElement("div");
  list.className = "workspace2-trash-list";
  for (const entry of entries) {
    const row = document.createElement("div");
    row.className = "workspace2-trash-item";
    const info = document.createElement("div");
    info.className = "workspace2-trash-info";
    const icon = document.createElement("span");
    icon.className = "workspace2-icon";
    icon.append(iconSvg("template"));
    const text = document.createElement("div");
    text.className = "workspace2-trash-text";
    const name = document.createElement("div");
    name.className = "workspace2-trash-name";
    name.textContent = entry.template.name;
    const meta = document.createElement("div");
    meta.className = "workspace2-trash-meta";
    meta.textContent = t("templates.trashDeleted", { date: new Date(entry.deletedAt).toLocaleString() });
    text.append(name, meta); info.append(icon, text);
    row.append(info, iconButton("restore", t("templates.restore"), async () => restoreTemplateTrashEntry(el, entry)));
    row.append(dangerIconButton("trash", t("templates.deletePermanently"), (event) => {
      workspace2InlineConfirm(event.currentTarget, { confirmText: t("confirm.delete"), onConfirm: async () => permanentlyDeleteTemplateTrashEntry(el, entry) });
    }));
    list.append(row);
  }
  body.append(list);
}

function requestDeleteTemplate(el, template, anchor = null) {
  hideNodePreview();
  const target = anchor || el?.querySelector?.(`[data-workspace2-template-id="${cssEscape(template.id)}"] .workspace2-actions`);
  workspace2InlineConfirm(target, {
    confirmText: t("confirm.delete"),
    onConfirm: async () => {
      try {
        await deleteTemplate(el, template);
      } catch (error) {
        templatesState.error = error.message;
        renderTemplatesPanel(el);
      }
    },
  });
}

async function copyText(value) {
  const text = String(value || "");
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const input = document.createElement("textarea");
  input.value = text;
  input.style.position = "fixed";
  input.style.left = "-9999px";
  document.body.append(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

function renderTemplateContextMenu(el) {
  renderTemplateContextMenuRenderer({
    document,
    window,
    state: templatesState,
    t,
    el,
    closeMenu: closeTemplateContextMenu,
    onError: (error) => {
      templatesState.error = error.message;
      renderTemplatesPanel(el);
    },
    onRename: (template) => {
      templatesState.editingTemplateId = template.id;
      renderTemplatesPanel(el);
    },
    onPlaceCenter: (template) => placeTemplateAtCanvasCenter(el, template),
    onDelete: (template) => requestDeleteTemplate(el, template),
    schedule: (callback) => setTimeout(callback, 0),
  });
}

function toggleTemplateGroup(el, groupId, recursive = false) {
  const isOpen = templatesState.expanded.has(groupId);
  if (recursive) {
    // Ctrl/Cmd-click collapses (or expands) sibling groups at this level only;
    // descendants keep their own expanded state.
    const group = getTemplateGroup(groupId);
    const siblingKeys = childTemplateGroups(group?.parentId || "").map((item) => item.id);
    setExpandedRecursive(templatesState.expanded, siblingKeys, !isOpen);
  } else if (isOpen) {
    templatesState.expanded.delete(groupId);
  } else {
    templatesState.expanded.add(groupId);
  }
  renderTemplatesPanel(el);
}

function closeTemplateContextMenuFromEvent(event) {
  if (event.type === "keydown" && event.key !== "Escape") {
    return;
  }
  if (templatesState.contextMenuElement?.contains?.(event.target)) {
    return;
  }
  closeTemplateContextMenu();
}

function openTemplateGroupContextMenu(el, event, group) {
  openTemplateGroupContextMenuRenderer({
    document, window, state: templatesState, t, el, event, group,
    // Closing an existing menu and reacting to a document event have different
    // contracts: the latter needs the event to preserve Escape/inside-menu rules.
    closeMenu: closeTemplateContextMenu,
    closeOnEvent: closeTemplateContextMenuFromEvent,
    onError: (error) => { templatesState.error = error.message; renderTemplatesPanel(el); },
    onNewSubfolder: createTemplateGroup,
    onRename: (target, id) => { templatesState.editingGroupId = id; renderTemplatesPanel(target); },
    onPersonalize: personalizeTemplateGroup,
    onResetStyle: resetTemplateGroupStyle,
    onDelete: requestDeleteTemplateGroup,
  });
}

function backupNodeLibrary() {
  const library = normalizeNodeLibrary(nodesState.library || emptyNodeLibrary());
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+$/, "").replace("T", "-");
  const blob = new Blob([JSON.stringify(library, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `workspace2-node-favorites-${stamp}.json`;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result || "")));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error || new Error("Failed to read file."));
    reader.readAsText(file, "utf-8");
  });
}

async function restoreNodeLibraryFromFile(el) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "application/json,.json";
  input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    try {
      const parsed = await readJsonFile(file);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.groups) || !Array.isArray(parsed.favorites)) {
        alert(t("nodes.restoreInvalidBackup"));
        return;
      }
      const library = normalizeNodeLibrary(parsed);
      const groupCount = Math.max(0, library.groups.length - 1);
      const nodeCount = library.favorites.length;
      if (!confirm(t("nodes.confirmRestoreBackup", { groups: groupCount, nodes: nodeCount }))) {
        return;
      }
      nodesState.library = library;
      await saveNodeLibrary(el);
      alert(t("nodes.restoreBackupDone", { groups: groupCount, nodes: nodeCount }));
    } catch (error) {
      alert(t("nodes.restoreBackupFailed", { message: error.message || String(error) }));
    }
  }, { once: true });
  input.click();
}

function normalizeNodeCategory(category) {
  return String(category || "").replace(/\\/g, "/").split("/").filter(Boolean);
}

function firstSpecType(spec) {
  if (Array.isArray(spec)) {
    const type = spec[0];
    if (Array.isArray(type)) {
      return "COMBO";
    }
    return String(type || "");
  }
  return String(spec || "");
}

function inputSpecOptions(spec) {
  if (!Array.isArray(spec)) {
    return {};
  }
  const options = spec.find((item) => item && typeof item === "object" && !Array.isArray(item));
  return options || {};
}

function inputSpecDefault(spec) {
  const options = inputSpecOptions(spec);
  if (Object.prototype.hasOwnProperty.call(options, "default")) {
    return options.default;
  }
  const type = Array.isArray(spec) ? spec[0] : spec;
  if (Array.isArray(type) && type.length) {
    return type[0];
  }
  return "";
}

function isWidgetInputSpec(spec) {
  const type = Array.isArray(spec) ? spec[0] : spec;
  if (Array.isArray(type)) {
    return true;
  }
  const options = inputSpecOptions(spec);
  if (options.forceInput === true || options.defaultInput === true) {
    return false;
  }
  if (options.forceInput === false || options.defaultInput === false) {
    return true;
  }
  const normalized = String(type || "").toUpperCase();
  return ["STRING", "INT", "FLOAT", "BOOLEAN"].includes(normalized)
    && (
      Object.prototype.hasOwnProperty.call(options, "default")
      || Object.prototype.hasOwnProperty.call(options, "min")
      || Object.prototype.hasOwnProperty.call(options, "max")
      || Object.prototype.hasOwnProperty.call(options, "step")
      || Object.prototype.hasOwnProperty.call(options, "control_after_generate")
    );
}

function collectInputTypes(input) {
  const values = [];
  for (const section of ["required", "optional", "hidden"]) {
    for (const spec of Object.values(input?.[section] || {})) {
      const type = firstSpecType(spec);
      if (type) {
        values.push(type);
      }
    }
  }
  return values;
}

function collectInputNames(input) {
  return [
    ...Object.keys(input?.required || {}),
    ...Object.keys(input?.optional || {}),
    ...Object.keys(input?.hidden || {}),
  ];
}

function collectOutputTypes(definition) {
  const output = definition?.output;
  if (Array.isArray(output)) {
    return output.map((value) => String(value || "")).filter(Boolean);
  }
  return output ? [String(output)] : [];
}

function collectOutputNames(definition) {
  const names = definition?.output_name;
  if (Array.isArray(names)) {
    return names.map((value) => String(value || "")).filter(Boolean);
  }
  if (typeof names === "string") {
    return [names];
  }
  return collectOutputTypes(definition);
}

function collectPreviewInputs(definition) {
  const input = definition?.input || {};
  const values = [];
  for (const section of ["required", "optional"]) {
    for (const [name, spec] of Object.entries(input?.[section] || {})) {
      if (isWidgetInputSpec(spec)) {
        continue;
      }
      values.push({
        name,
        type: firstSpecType(spec) || t("nodes.uncategorized"),
        optional: section === "optional",
      });
    }
  }
  return values;
}

function collectPreviewWidgets(definition) {
  const input = definition?.input || {};
  const values = [];
  for (const section of ["required", "optional"]) {
    for (const [name, spec] of Object.entries(input?.[section] || {})) {
      if (!isWidgetInputSpec(spec)) {
        continue;
      }
      values.push({
        name,
        type: firstSpecType(spec) || t("nodes.uncategorized"),
        value: inputSpecDefault(spec),
        optional: section === "optional",
      });
    }
  }
  return values;
}

function collectPreviewOutputs(definition) {
  const names = collectOutputNames(definition);
  const types = collectOutputTypes(definition);
  return (names.length ? names : types).map((name, index) => ({
    name: name || types[index] || t("nodes.uncategorized"),
    type: types[index] || name || t("nodes.uncategorized"),
  }));
}

function nodeSourceFor(definition) {
  const pythonModule = String(definition?.python_module || "");
  if (!pythonModule) {
    return NODE_SOURCE.UNKNOWN;
  }
  const modules = pythonModule.split(".");
  const root = modules[0] || "";
  if (definition?.essentials_category) {
    return NODE_SOURCE.ESSENTIALS;
  }
  if (CORE_NODE_MODULES.has(root)) {
    return NODE_SOURCE.CORE;
  }
  if (root === "blueprint") {
    return NODE_SOURCE.BLUEPRINT;
  }
  if (root === "custom_nodes" && modules[1]) {
    return NODE_SOURCE.CUSTOM;
  }
  return NODE_SOURCE.UNKNOWN;
}

function shortenNodeSourceName(name) {
  return String(name || "")
    .replace(/^(ComfyUI-|ComfyUI_|Comfy-|Comfy_)/i, "")
    .replace(/(-ComfyUI|_ComfyUI|-Comfy|_Comfy)$/i, "");
}

function canonicalEssentialsCategory(category) {
  const normalized = String(category || "").trim().toLowerCase();
  return ESSENTIALS_CATEGORY_ORDER.find((item) => item.toLowerCase() === normalized) || "";
}

function resolveEssentialsCategory(node) {
  if (!node || !isComfyCoreNode(node)) {
    return "";
  }
  return canonicalEssentialsCategory(node.essentialsCategory) || ESSENTIALS_CATEGORY_MAP.get(node.type) || "";
}

function essentialsCategoryLabel(category) {
  const key = `nodes.essentials.${String(category || "").replace(/\s+/g, "_").toLowerCase()}`;
  return t(key);
}

function wrapObjectInfoNode(type, definition) {
  const categoryParts = normalizeNodeCategory(definition?.category || "");
  const inputTypes = collectInputTypes(definition?.input || {});
  const outputTypes = collectOutputTypes(definition);
  const pythonModule = String(definition?.python_module || "");
  const node = {
    type,
    title: definition?.display_name || definition?.name || type,
    category: categoryParts.join("/") || t("nodes.uncategorized"),
    categoryParts,
    categoryRoot: categoryParts[0] || t("nodes.uncategorized"),
    description: definition?.description || definition?.help || "",
    searchAliases: Array.isArray(definition?.search_aliases) ? definition.search_aliases : [],
    inputs: collectInputNames(definition?.input || {}),
    inputTypes,
    outputs: collectOutputNames(definition),
    outputTypes,
    pythonModule,
    mainCategory: definition?.main_category || "",
    essentialsCategory: definition?.essentials_category || "",
    apiNode: Boolean(definition?.api_node)
      || String(definition?.category || "").toLowerCase().startsWith("api node")
      || String(definition?.category || "").toLowerCase().startsWith("partner/"),
    isGlobal: Boolean(definition?.isGlobal),
    source: nodeSourceFor(definition),
    definition,
  };
  return node;
}

function wrapRegisteredNode(type, definition) {
  const categoryParts = normalizeNodeCategory(definition?.category || definition?._category || "");
  return {
    type,
    title: definition?.title || definition?.name || type,
    category: categoryParts.join("/") || t("nodes.uncategorized"),
    categoryParts,
    categoryRoot: categoryParts[0] || t("nodes.uncategorized"),
    description: "",
    searchAliases: [],
    inputs: [],
    inputTypes: [],
    outputs: [],
    outputTypes: [],
    pythonModule: "",
    mainCategory: "",
    essentialsCategory: "",
    apiNode: false,
    isGlobal: false,
    // A type that exists only in the browser registry is normally a virtual
    // custom-node implementation. It has no python_module to classify from,
    // but presenting it in Extensions is materially more useful than silently
    // leaving it outside every visible node section.
    source: NODE_SOURCE.CUSTOM,
    definition,
  };
}

function getNodeDefinitions() {
  const objectInfoSource = nodesState.objectInfo && Object.keys(nodesState.objectInfo).length
    ? nodesState.objectInfo
    : null;
  const registeredNodeTypes = globalThis.LiteGraph?.registered_node_types || {};
  const registeredNodeCount = Object.keys(registeredNodeTypes).length;
  if (
    nodesState.nodeDefinitionsCache
    && nodesState.nodeDefinitionsSource === objectInfoSource
    && nodesState.registeredNodeTypesSource === registeredNodeTypes
    && nodesState.registeredNodeTypesCount === registeredNodeCount
  ) {
    return nodesState.nodeDefinitionsCache;
  }

  const definitions = mergeNodeDefinitionSources({
    objectInfo: objectInfoSource || {},
    registeredNodeTypes,
    wrapObjectInfoNode,
    wrapRegisteredNode,
  });
  nodesState.nodeDefinitionsSource = objectInfoSource;
  nodesState.registeredNodeTypesSource = registeredNodeTypes;
  nodesState.registeredNodeTypesCount = registeredNodeCount;
  nodesState.nodeDefinitionsCache = definitions;
  nodesState.nodeDefinitionMapCache = null;
  return definitions;
}

function getNodeDefinitionMap() {
  if (!nodesState.nodeDefinitionMapCache) {
    nodesState.nodeDefinitionMapCache = new Map(getNodeDefinitions().map((node) => [node.type, node]));
  }
  return nodesState.nodeDefinitionMapCache;
}

function nodeMatchesQuery(node, query, groupName = "") {
  if (!query) {
    return true;
  }
  return officialNodeSearchScores(node, query, groupName)[0] < 9;
}

function nodeSearchScore(node, query, groupName = "") {
  return packNodeSearchScores(officialNodeSearchScores(node, query, groupName));
}

function normalizeNodeSearchValue(value) {
  return String(value || "").trim().toLowerCase().replace(/[_\-./\\]+/g, " ").replace(/\s+/g, " ");
}

function splitCamelCase(value) {
  return String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function favoriteDisplayNode(favorite, nodeMap) {
  const definition = nodeMap.get(favorite.type);
  return {
    ...favorite,
    title: favorite.alias || favorite.title || definition?.title || favorite.type,
    category: definition?.category || t("nodes.invalid"),
    definition: definition?.definition || null,
    type: favorite.type,
    invalid: !definition,
  };
}

async function createNodeGroup(el, parentId = "") {
  const normalizedParentId = parentId && parentId !== NODE_DEFAULT_GROUP_ID ? String(parentId) : "";
  const group = createFavoriteGroup(uniqueNodeGroupName(t("nodes.defaultGroupName")), normalizedParentId);
  if (!group) {
    return;
  }
  if (normalizedParentId) {
    nodesState.expanded.add(normalizedParentId);
  }
  nodesState.expanded.add(group.id);
  nodesState.editingGroupId = group.id;
  await saveNodeLibrary(el);
}

async function changeNodeGroupIcon(el, group) {
  const value = window.prompt(t("folder.promptIcon"), group.icon || "");
  if (value === null) {
    return;
  }
  group.icon = value.trim();
  await saveNodeLibrary(el);
}

async function changeNodeGroupColor(el, group) {
  const value = window.prompt(t("folder.promptColor"), group.color || "");
  if (value === null) {
    return;
  }
  group.color = value.trim();
  await saveNodeLibrary(el);
}

async function resetNodeGroupStyle(el, group) {
  group.icon = "";
  group.color = "";
  await saveNodeLibrary(el);
}

function personalizeNodeGroup(el, group, anchor = null) {
  openPersonalizationPanel({
    title: t("folder.personalizeTitle"),
    name: group.name,
    icon: group.icon || "",
    color: group.color || "",
    anchor,
    onApply: async (value) => {
      group.icon = value.icon;
      group.color = value.color;
      await saveNodeLibrary(el);
    },
    onReset: async () => {
      await resetNodeGroupStyle(el, group);
    },
  });
}

async function renameNodeGroup(el, group) {
  nodesState.editingGroupId = group.id;
  renderNodesPanel(el);
}

async function commitNodeGroupRename(el, group, value) {
  const name = String(value || "").trim();
  if (!name || name === group.name) {
    nodesState.editingGroupId = "";
    renderNodesPanel(el);
    return;
  }
  group.name = name;
  nodesState.editingGroupId = "";
  await saveNodeLibrary(el);
}

async function deleteNodeGroup(el, group) {
  if (!deleteFavoriteGroup(group.id)) {
    return;
  }
  normalizeFavoriteOrders(NODE_DEFAULT_GROUP_ID);
  await saveNodeLibrary(el);
}

function requestDeleteNodeGroup(el, group, anchor = null) {
  const target = anchor || el?.querySelector?.(`[data-workspace2-favorite-region="${cssEscape(group.id)}"] .workspace2-actions`);
  workspace2InlineConfirm(target, {
    confirmText: t("confirm.delete"),
    onConfirm: async () => {
      try {
        await deleteNodeGroup(el, group);
      } catch (error) {
        handleError(el, error);
      }
    },
  });
}

async function addFavoriteNode(el, node, groupId = NODE_DEFAULT_GROUP_ID, beforeType = "") {
  if (addFavoriteNodeToStore(node, groupId, beforeType)) {
    await saveNodeLibrary(el);
  }
}

async function removeFavoriteNode(el, type) {
  if (removeFavoriteNodeFromStore(type)) {
    await saveNodeLibrary(el);
  }
}

async function editFavoriteAlias(el, favorite) {
  const current = favorite.alias || "";
  const alias = window.prompt(t("nodes.promptAlias"), current);
  if (alias === null) {
    return;
  }
  if (setFavoriteAlias(favorite.type, alias)) {
    await saveNodeLibrary(el);
  }
}

async function moveFavoriteToGroup(el, type, targetGroupId, beforeType = "") {
  if (moveFavoriteToStoreGroup(type, targetGroupId, beforeType)) {
    await saveNodeLibrary(el);
  }
}

async function moveNodeGroupToParent(el, groupId, targetParentId = "") {
  const group = moveFavoriteGroupToParent(groupId, targetParentId);
  if (!group) {
    return;
  }
  if (group.parentId) {
    nodesState.expanded.add(group.parentId);
  }
  await saveNodeLibrary(el);
}

function groupedNodes(nodes) {
  const groups = new Map();
  for (const node of nodes) {
    const key = nodeGroupLabel(node);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(node);
  }
  return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function nodePackageName(node) {
  const parts = String(node?.pythonModule || "").split(".");
  if (parts[0] === "custom_nodes" && parts[1]) {
    return shortenNodeSourceName(parts[1].split("@")[0]);
  }
  return "";
}

function isComfyNode(node) {
  return node?.source === NODE_SOURCE.CORE || node?.source === NODE_SOURCE.ESSENTIALS;
}

function nodeGroupLabel(node) {
  if (isComfyNode(node)) {
    const root = String(node.categoryRoot || "").trim().toLowerCase();
    const key = COMFY_CATEGORY_LABEL_KEYS.get(root);
    return key ? t(key) : node.categoryRoot || t("nodes.uncategorized");
  }
  if (node?.source === NODE_SOURCE.CUSTOM) {
    return nodePackageName(node) || t("nodes.categoryUnknown");
  }
  return t("nodes.categoryUnknown");
}

function isComfyCoreNode(node) {
  return isComfyNode(node);
}

function isHiddenOfficialNodeSection(node) {
  return node?.source === NODE_SOURCE.BLUEPRINT || node?.apiNode;
}

function officialNodeCategoryParts(node) {
  const parts = Array.isArray(node?.categoryParts)
    ? node.categoryParts.map((part) => String(part || "").trim()).filter(Boolean)
    : String(node?.category || "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
  // Keep the extension tree identical to ComfyUI's official Node Library:
  // category.split('/'), with no synthetic package folder, category merging,
  // or artificial depth cap.  Package/source grouping belongs to the
  // official optional "Group by module" mode, not its category view.
  if (node?.source === NODE_SOURCE.CUSTOM) return parts;
  if (!isComfyCoreNode(node)) {
    return [t("nodes.categoryUnknown"), ...parts];
  }
  if (!parts.length) {
    return [t("nodes.officialCategory.advanced")];
  }
  const root = parts[0].toLowerCase();
  const key = COMFY_CATEGORY_LABEL_KEYS.get(root);
  return [key ? t(key) : parts[0], ...parts.slice(1)];
}

function setSectionHeaderExpanded(header, expanded) {
  header.classList.toggle("is-collapsed", !expanded);
  header.classList.toggle("is-expanded", expanded);
  header.setAttribute("aria-expanded", expanded ? "true" : "false");
  const disclosure = header.querySelector(".workspace2-section-disclosure");
  if (disclosure) {
    disclosure.textContent = expanded ? "∨" : ">";
  }
}

function createSectionHeader({ titleText, countText = "", collapsible = false, expanded = true, onToggle = null }) {
  const header = document.createElement(collapsible ? "button" : "div");
  header.className = `workspace2-section-header${collapsible ? " is-interactive" : ""}${collapsible ? (expanded ? " is-expanded" : " is-collapsed") : ""}`;
  if (collapsible) {
    header.type = "button";
    header.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  const disclosure = document.createElement("span");
  disclosure.className = `workspace2-section-disclosure${collapsible ? "" : " is-hidden"}`;
  disclosure.setAttribute("aria-hidden", "true");
  if (collapsible) {
    disclosure.textContent = expanded ? "∨" : ">";
  }

  const title = document.createElement("span");
  title.className = "workspace2-section-title workspace2-name";
  title.textContent = titleText;

  const line = document.createElement("span");
  line.className = "workspace2-section-line";

  const count = document.createElement("span");
  count.className = "workspace2-meta";
  count.textContent = countText;
  count.hidden = !countText;

  header.append(disclosure, title, line, count);
  if (collapsible && typeof onToggle === "function") {
    header.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      onToggle();
    });
  }
  return { header, disclosure };
}

function renderTopSectionHeader(el, section, sectionId, titleText, countText) {
  const hasQuery = Boolean(nodesState.query.trim());
  const expanded = hasQuery || nodesState.expanded.has(sectionId);
  const { header } = createSectionHeader({
    titleText,
    countText,
    collapsible: !hasQuery,
    expanded,
    onToggle: () => toggleNodeGroup(el, sectionId),
  });
  section.append(header);
  return expanded;
}

function parseLocalJson(key, fallback) {
  const value = localStorage.getItem(key);
  if (!value) {
    return fallback;
  }
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === typeof fallback ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function localNSidebarPreview() {
  const pinned = parseLocalJson("sb_pinnedItems", []);
  const categoryMap = parseLocalJson("sb_categoryNodeMap", {});
  const groups = Object.entries(categoryMap)
    .filter(([, nodes]) => Array.isArray(nodes))
    .map(([name, nodes], index) => ({
      name,
      order: index,
      nodes: nodes.map(String).filter(Boolean),
    }));
  const nodeSet = new Set(pinned.map(String).filter(Boolean));
  for (const group of groups) {
    for (const nodeType of group.nodes) {
      nodeSet.add(nodeType);
    }
  }
  return {
    found: pinned.length > 0 || groups.length > 0,
    sourcePath: "browser localStorage",
    pinned: pinned.map(String).filter(Boolean),
    groups,
    nodes: [...nodeSet],
    summary: {
      pinnedCount: pinned.length,
      groupCount: groups.length,
      nodeCount: nodeSet.size,
    },
  };
}

function mergeNSidebarPreviews(filePreview, localPreview) {
  const previews = [filePreview, localPreview].filter((preview) => preview?.found);
  const groups = [];
  const groupKey = new Set();
  const pinned = [];
  const pinnedSet = new Set();
  for (const preview of previews) {
    for (const nodeType of preview.pinned || []) {
      if (!pinnedSet.has(nodeType)) {
        pinnedSet.add(nodeType);
        pinned.push(nodeType);
      }
    }
    for (const group of preview.groups || []) {
      const key = group.name;
      const existing = groups.find((item) => item.name === key);
      if (existing) {
        const nodes = new Set(existing.nodes);
        for (const nodeType of group.nodes || []) {
          nodes.add(nodeType);
        }
        existing.nodes = [...nodes];
        continue;
      }
      if (!groupKey.has(key)) {
        groupKey.add(key);
        groups.push({ ...group, nodes: [...(group.nodes || [])] });
      }
    }
  }
  const nodeSet = new Set(pinned);
  for (const group of groups) {
    for (const nodeType of group.nodes) {
      nodeSet.add(nodeType);
    }
  }
  return {
    found: previews.length > 0,
    sourcePath: previews.map((preview) => preview.sourcePath).filter(Boolean).join(" + "),
    pinned,
    groups,
    nodes: [...nodeSet],
    summary: {
      pinnedCount: pinned.length,
      groupCount: groups.length,
      nodeCount: nodeSet.size,
    },
    checkedPaths: filePreview?.checkedPaths || [],
  };
}

async function loadNSidebarPreview() {
  nodesState.nSidebarLoading = true;
  try {
    let filePreview = { found: false, pinned: [], groups: [], nodes: [], summary: {} };
    try {
      const data = await fetchJson("/workspace2/nodes/n-sidebar/preview");
      filePreview = data.preview || filePreview;
    } catch {
      // The backend route exists after a ComfyUI restart. LocalStorage migration can still work without it.
    }
    nodesState.nSidebarPreview = mergeNSidebarPreviews(filePreview, localNSidebarPreview());
  } finally {
    nodesState.nSidebarLoading = false;
  }
}

function findOrCreateImportedGroup(name) {
  const existing = nodesState.library.groups.find((group) => group.name === name);
  if (existing) {
    return existing.id;
  }
  const id = `n-sidebar-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  nodesState.library.groups.push({
    id,
    name,
    order: nodesState.library.groups.length,
    collapsed: false,
  });
  nodesState.expanded.add(id);
  return id;
}

async function importNSidebarPreview(el) {
  const preview = nodesState.nSidebarPreview;
  if (!preview?.found || !nodesState.library) {
    return;
  }
  const nodeMap = getNodeDefinitionMap();
  const existingTypes = new Set(nodesState.library.favorites.map((favorite) => favorite.type));
  const addImportedFavorite = (nodeType, groupId, order) => {
    if (!nodeType || existingTypes.has(nodeType)) {
      return;
    }
    const definition = nodeMap.get(nodeType);
    existingTypes.add(nodeType);
    nodesState.library.favorites.push({
      type: nodeType,
      title: definition?.title || nodeType,
      alias: "",
      groupId,
      order,
      rating: 0,
      useCount: 0,
      lastUsed: 0,
      addedAt: Date.now(),
      invalid: !definition,
      source: "n-sidebar-migration",
    });
  };

  preview.pinned.forEach((nodeType, index) => addImportedFavorite(nodeType, NODE_DEFAULT_GROUP_ID, index));
  for (const group of preview.groups) {
    const groupId = findOrCreateImportedGroup(group.name);
    group.nodes.forEach((nodeType, index) => addImportedFavorite(nodeType, groupId, index));
  }
  nodesState.library.migration.nSidebarImported = true;
  nodesState.library.migration.nSidebarImportedAt = Date.now();
  await saveNodeLibrary(el);
}

async function importOfficialFavorites(el) {
  if (!nodesState.library) {
    await loadNodeLibrary();
  }
  nodesState.officialFavoritesLoading = true;
  try {
    const probe = await detectOfficialFavoritesProbe();
    nodesState.officialFavoritesProbe = probe;
    const officialFavorites = collectOfficialFavoritesFromProbe(probe);
    const nodeMap = getNodeDefinitionMap();
    const importItems = collectOfficialFavoriteImportItems(officialFavorites, nodeMap);
    const officialTypes = importItems.map((item) => item.type);
    const existingFavorites = new Map((nodesState.library?.favorites || []).map((favorite) => [favorite.type, favorite]));
    const existingGroupByName = new Map((nodesState.library?.groups || []).map((group) => [group.name, group.id]));
    const newTypes = officialTypes.filter((nodeType) => !existingFavorites.has(nodeType));
    const movableTypes = importItems.filter((item) => {
      if (!item.groupName || !existingFavorites.has(item.type)) {
        return false;
      }
      const targetGroupId = existingGroupByName.get(item.groupName);
      return !targetGroupId || (existingFavorites.get(item.type).groupId || NODE_DEFAULT_GROUP_ID) !== targetGroupId;
    });
    if (!officialTypes.length) {
      alert(t("nodes.officialFavoritesNone"));
      return;
    }
    if (!newTypes.length && !movableTypes.length) {
      alert(t("nodes.officialFavoritesNoNew", { count: officialTypes.length }));
      return;
    }
    const confirmed = confirm(t("nodes.confirmImportOfficialFavorites", {
      total: officialTypes.length,
      newCount: newTypes.length + movableTypes.length,
    }));
    if (!confirmed) {
      return;
    }

    const now = Date.now();
    const addFavorite = (nodeType, groupId, order) => {
      if (!nodeType) {
        return false;
      }
      const existing = existingFavorites.get(nodeType);
      if (existing) {
        const currentGroupId = existing.groupId || NODE_DEFAULT_GROUP_ID;
        if (currentGroupId !== groupId) {
          existing.groupId = groupId;
          existing.order = order;
          return true;
        }
        return false;
      }
      const definition = nodeMap.get(nodeType);
      nodesState.library.favorites.push({
        type: nodeType,
        title: definition?.title || nodeType,
        alias: "",
        groupId,
        order,
        rating: 0,
        useCount: 0,
        lastUsed: 0,
        addedAt: now,
        invalid: !definition,
        source: "official-favorites-sync",
      });
      existingFavorites.set(nodeType, nodesState.library.favorites[nodesState.library.favorites.length - 1]);
      return true;
    };

    let importedCount = 0;
    const orderByGroup = new Map();
    const nextOrderForGroup = (groupId) => {
      if (!orderByGroup.has(groupId)) {
        orderByGroup.set(groupId, nodesState.library.favorites.filter((favorite) => (favorite.groupId || NODE_DEFAULT_GROUP_ID) === groupId).length);
      }
      const order = orderByGroup.get(groupId);
      orderByGroup.set(groupId, order + 1);
      return order;
    };
    for (const item of importItems) {
      const groupId = item.groupName ? findOrCreateImportedGroup(item.groupName) : NODE_DEFAULT_GROUP_ID;
      if (addFavorite(item.type, groupId, nextOrderForGroup(groupId))) {
        importedCount += 1;
      }
    }
    nodesState.library.migration.officialFavoritesImported = true;
    nodesState.library.migration.officialFavoritesImportedAt = now;
    nodesState.expanded.add(NODE_DEFAULT_GROUP_ID);
    await saveNodeLibrary(el);
    alert(t("nodes.officialFavoritesImported", { count: importedCount }));
  } catch (error) {
    nodesState.error = error.message;
    renderNodesPanel(el);
  } finally {
    nodesState.officialFavoritesLoading = false;
  }
}

function closeOfficialFavoritesMenu() {
  if (nodesState.officialFavoritesMenuCloseHandler) {
    window.removeEventListener("pointerdown", nodesState.officialFavoritesMenuCloseHandler, true);
    document.removeEventListener("pointerdown", nodesState.officialFavoritesMenuCloseHandler, true);
    window.removeEventListener("click", nodesState.officialFavoritesMenuCloseHandler, true);
    document.removeEventListener("click", nodesState.officialFavoritesMenuCloseHandler, true);
    window.removeEventListener("keydown", nodesState.officialFavoritesMenuCloseHandler, true);
    nodesState.officialFavoritesMenuCloseHandler = null;
  }
  nodesState.officialFavoritesMenuElement?.remove();
  nodesState.officialFavoritesMenuElement = null;
}

function openOfficialFavoritesMenu(el, anchor) {
  closeOfficialFavoritesMenu();
  const panel = anchor?.closest?.(".workspace2-panel") || el.querySelector(".workspace2-panel");
  if (!panel) {
    return;
  }

  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 220))}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());
  menu.addEventListener("contextmenu", (event) => event.preventDefault());

  const fromOfficial = document.createElement("button");
  fromOfficial.className = "workspace2-menu-item";
  fromOfficial.type = "button";
  fromOfficial.textContent = t("nodes.importOfficialToWorkspace2");
  fromOfficial.addEventListener("click", async () => {
    closeOfficialFavoritesMenu();
    await importOfficialFavorites(el);
  });
  menu.append(fromOfficial);

  const divider = document.createElement("div");
  divider.className = "workspace2-menu-divider";
  menu.append(divider);

  const toOfficial = document.createElement("button");
  toOfficial.className = "workspace2-menu-item";
  toOfficial.type = "button";
  toOfficial.textContent = t("nodes.importWorkspace2ToOfficial");
  toOfficial.title = t("nodes.importWorkspace2ToOfficialTitle");
  toOfficial.addEventListener("click", async () => {
    closeOfficialFavoritesMenu();
    await importWorkspace2FavoritesToOfficial(el);
  });
  menu.append(toOfficial);

  const backupDivider = document.createElement("div");
  backupDivider.className = "workspace2-menu-divider";
  menu.append(backupDivider);

  const backup = document.createElement("button");
  backup.className = "workspace2-menu-item";
  backup.type = "button";
  backup.textContent = t("nodes.backupFavorites");
  backup.addEventListener("click", () => {
    closeOfficialFavoritesMenu();
    backupNodeLibrary();
  });
  menu.append(backup);

  const restore = document.createElement("button");
  restore.className = "workspace2-menu-item";
  restore.type = "button";
  restore.textContent = t("nodes.restoreFavorites");
  restore.addEventListener("click", async () => {
    closeOfficialFavoritesMenu();
    await restoreNodeLibraryFromFile(el);
  });
  menu.append(restore);

  panel.append(menu);
  nodesState.officialFavoritesMenuElement = menu;
  nodesState.officialFavoritesMenuCloseHandler = (event) => {
    if (event.type === "keydown" && event.key !== "Escape") {
      return;
    }
    if (menu.contains(event.target) || anchor.contains(event.target)) {
      return;
    }
    closeOfficialFavoritesMenu();
  };
  setTimeout(() => {
    window.addEventListener("pointerdown", nodesState.officialFavoritesMenuCloseHandler, true);
    document.addEventListener("pointerdown", nodesState.officialFavoritesMenuCloseHandler, true);
    window.addEventListener("click", nodesState.officialFavoritesMenuCloseHandler, true);
    document.addEventListener("click", nodesState.officialFavoritesMenuCloseHandler, true);
    window.addEventListener("keydown", nodesState.officialFavoritesMenuCloseHandler, true);
  }, 0);
}

function comfyCategorySortRank(label) {
  const index = COMFY_CATEGORY_ORDER_KEYS.findIndex((key) => t(key) === label);
  return index === -1 ? 1000 : index;
}

function isCanvasDropTarget(target) {
  return target instanceof HTMLCanvasElement || target?.closest?.("canvas");
}

function canvasPositionFromClient(clientX, clientY) {
  const canvas = app.canvas;
  const canvasElement = canvas?.canvas || app.canvasEl || document.querySelector("canvas");
  if (!canvasElement) {
    return null;
  }
  const rect = canvasElement.getBoundingClientRect();
  const offset = [clientX - rect.left, clientY - rect.top];
  if (typeof canvas.convertCanvasToOffset === "function") {
    return canvas.convertCanvasToOffset(offset);
  }
  const ds = canvas.ds || canvasElement.data?.ds;
  if (ds?.scale && ds.offset?.length >= 2) {
    return [
      offset[0] / ds.scale - ds.offset[0],
      offset[1] / ds.scale - ds.offset[1],
    ];
  }
  return offset;
}

async function recordNodeUse(el, nodeType) {
  const favorite = getFavorite(nodeType);
  if (!favorite) {
    return;
  }
  favorite.useCount = Number(favorite.useCount || 0) + 1;
  favorite.lastUsed = Date.now();
  await saveNodeLibrary(el);
}

async function addNodeToCanvas(el, nodeType, pos) {
  if (!globalThis.LiteGraph?.createNode || !app.graph || !pos) {
    throw new Error(t("nodes.canvasUnavailable"));
  }
  const node = globalThis.LiteGraph.createNode(nodeType);
  if (!node) {
    throw new Error(t("nodes.createFailed", { type: nodeType }));
  }
  node.pos = [pos[0], pos[1]];
  app.graph.add(node);
  app.canvas?.setDirty?.(true, true);
  node.onAdded?.();
  app.graph.change?.();
  await recordNodeUse(el, nodeType);
}

function updatePendingNodeUi() {
  const target = nodesState.renderTarget;
  if (!target?.isConnected) {
    return;
  }
  const selectedType = nodesState.pendingNode?.type || "";
  const status = target.querySelector("[data-workspace2-nodes-status]");
  if (status) {
    const nodeTypes = getNodeDefinitions();
    const statusText = nodesState.pendingNode
      ? t("nodes.pendingPlace", { name: nodesState.pendingNode.title })
      : t("nodes.status", { count: nodeTypes.length });
    status.textContent = statusText;
    status.title = statusText;
  }
  target.querySelectorAll(".workspace2-node-row.is-selected").forEach((row) => {
    row.classList.remove("is-selected");
  });
  if (!selectedType) {
    return;
  }
  target.querySelectorAll(`[data-workspace2-node-type="${cssEscape(selectedType)}"]`).forEach((row) => {
    row.classList.add("is-selected");
  });
}

function setPendingNode(node) {
  nodesState.pendingNode = node
    ? {
        type: node.type,
        title: node.title || node.type,
        category: node.category || "",
        definition: node.definition || null,
      }
    : null;
  if (!nodesState.pendingNode) {
    hideNodePreview();
  }
  updatePendingNodeUi();
}

async function placePendingNodeAt(clientX, clientY) {
  if (!nodesState.pendingNode) {
    return false;
  }
  const pos = canvasPositionFromClient(clientX, clientY);
  const nodeType = nodesState.pendingNode.type;
  setPendingNode(null);
  await addNodeToCanvas(nodesState.renderTarget, nodeType, pos);
  return true;
}

function pendingNodePreviewData() {
  if (!nodesState.pendingNode) {
    return null;
  }
  const definition = getNodeDefinitionMap().get(nodesState.pendingNode.type);
  return {
    ...definition,
    ...nodesState.pendingNode,
    title: nodesState.pendingNode.title || definition?.title || nodesState.pendingNode.type,
    category: definition?.category || nodesState.pendingNode.category || t("nodes.uncategorized"),
    definition: definition?.definition || nodesState.pendingNode.definition || {},
  };
}

function showPendingNodeCanvasPreview(event) {
  const node = pendingNodePreviewData();
  if (!node) {
    hideNodePreview();
    return;
  }
  const preview = nodesState.previewPopover;
  if (nodesState.previewNode?.type === node.type && preview?.isConnected && !preview.hidden) {
    positionNodePreviewPopover(preview, event, { followCursor: true });
    return;
  }
  showNodePreview(node, event, { followCursor: true });
}

function fontControl(el) {
  const current = normalizeWorkflowFontScale(state.fontScale);
  state.fontScale = current;

  const wrap = document.createElement("label");
  wrap.className = "workspace2-font-control";
  wrap.title = t("font.size");

  const slider = document.createElement("input");
  slider.className = "workspace2-font-slider";
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.value = String(current);
  isolateComfyKeys(slider);
  slider.setAttribute("aria-label", t("font.size"));
  const valueLabel = createSliderValueLabel(workflowScaleLabel(current));
  slider.addEventListener("click", (event) => event.stopPropagation());
  slider.addEventListener("input", () => {
    state.fontScale = snapUiScaleValue(slider.value);
    slider.value = String(state.fontScale);
    localStorage.setItem(FONT_SCALE_KEY, String(state.fontScale));
    valueLabel.textContent = workflowScaleLabel(state.fontScale);
    showSliderValue(wrap);
    const panel = el.querySelector(".workspace2-panel");
    if (panel) {
      applyWorkflowUiScale(panel);
    }
  });
  slider.addEventListener("pointerup", () => hideSliderValueSoon(wrap));
  slider.addEventListener("change", () => hideSliderValueSoon(wrap));
  slider.addEventListener("blur", () => hideSliderValueSoon(wrap));

  wrap.append(slider, valueLabel);
  return wrap;
}

function normalizeWorkflowFontScale(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  return Math.max(0, Math.min(100, numeric));
}

function snapUiScaleValue(value) {
  const normalized = normalizeWorkflowFontScale(value);
  return Math.abs(normalized - 50) <= 3 ? 50 : normalized;
}

function snapWorkflowRecentLimit(value) {
  return workflowRecents.snapLimit(value);
}

function workflowRecentLimit() {
  return workflowRecents.limit();
}

function setWorkflowRecentLimit(value) {
  workflowRecents.setLimit(value);
}

function readRecentWorkflows() {
  return workflowRecents.read();
}

function writeRecentWorkflows(items) {
  workflowRecents.write(items);
}

function recordRecentWorkflow(path) {
  workflowRecents.record(path);
}

function updateRecentWorkflowPath(oldPath, newPath) {
  workflowRecents.updatePath(oldPath, newPath);
}

function removeRecentWorkflow(path) {
  workflowRecents.remove(path);
}

function removeRecentWorkflowTree(path) {
  workflowRecents.removeTree(path);
}

function createSliderValueLabel(text) {
  const valueLabel = document.createElement("span");
  valueLabel.className = "workspace2-slider-value";
  valueLabel.textContent = text;
  return valueLabel;
}

function showSliderValue(wrap) {
  clearTimeout(wrap._workspace2SliderValueTimer);
  wrap.classList.add("is-adjusting");
}

function hideSliderValueSoon(wrap) {
  clearTimeout(wrap._workspace2SliderValueTimer);
  wrap._workspace2SliderValueTimer = window.setTimeout(() => {
    wrap.classList.remove("is-adjusting");
  }, 700);
}

function formatPx(value) {
  return `${Math.round(Number.parseFloat(value) * 10) / 10}px`;
}

function workflowScaleLabel(value) {
  return formatPx(workspaceUiScaleVars(value).itemFont);
}

function nodeScaleLabel(value) {
  return formatPx(workspaceUiScaleVars(value).itemFont);
}

function templateScaleLabel(value) {
  return formatPx(workspaceUiScaleVars(value).itemFont);
}

function readWorkflowFontScale() {
  const raw = localStorage.getItem(FONT_SCALE_KEY);
  if (raw === null) {
    localStorage.setItem(FONT_SCALE_KEY, "50");
    localStorage.setItem(FONT_SCALE_LINEAR_KEY, "1");
    return 50;
  }
  const value = Number(raw);
  if (localStorage.getItem(FONT_SCALE_LINEAR_KEY) !== "1" && Number.isInteger(value) && value >= 0 && value <= 2) {
    const migrated = value * 50;
    localStorage.setItem(FONT_SCALE_KEY, String(migrated));
    localStorage.setItem(FONT_SCALE_LINEAR_KEY, "1");
    return migrated;
  }
  localStorage.setItem(FONT_SCALE_LINEAR_KEY, "1");
  return normalizeWorkflowFontScale(value);
}

function workspaceUiScaleVars(value) {
  const scale = normalizeWorkflowFontScale(value) / 100;
  return {
    itemFont: `${11 + scale * 6}px`,
    folderFont: `${13 + scale * 6}px`,
    metaFont: `${9 + scale * 3}px`,
    rowHeight: `${28 + scale * 14}px`,
    rowPaddingY: `${2 + scale * 3}px`,
    listGap: `${2 + scale * 2}px`,
  };
}

function applyWorkflowUiScale(panel) {
  state.fontScale = normalizeWorkflowFontScale(state.fontScale);
  const vars = workspaceUiScaleVars(state.fontScale);
  panel.style.setProperty("--workspace2-tree-font", vars.itemFont);
  panel.style.setProperty("--workspace2-folder-font", vars.folderFont);
  panel.style.setProperty("--workspace2-node-font", vars.itemFont);
  panel.style.setProperty("--workspace2-meta-font", vars.metaFont);
  panel.style.setProperty("--workspace2-row-height", vars.rowHeight);
  panel.style.setProperty("--workspace2-node-row-height", vars.rowHeight);
  panel.style.setProperty("--workspace2-node-row-padding-y", vars.rowPaddingY);
  panel.style.setProperty("--workspace2-node-list-gap", vars.listGap);
}

function clampNodeUiScale(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function nodeUiScaleVars(value) {
  const base = workspaceUiScaleVars(clampNodeUiScale(value));
  return {
    treeFont: base.itemFont,
    folderFont: base.folderFont,
    nodeFont: base.itemFont,
    metaFont: base.metaFont,
    rowHeight: base.rowHeight,
    nodePaddingY: base.rowPaddingY,
    nodeGap: base.listGap,
  };
}

function applyNodeUiScale(panel) {
  nodesState.uiScale = clampNodeUiScale(nodesState.uiScale);
  const vars = nodeUiScaleVars(nodesState.uiScale);
  panel.style.setProperty("--workspace2-tree-font", vars.treeFont);
  panel.style.setProperty("--workspace2-folder-font", vars.folderFont);
  panel.style.setProperty("--workspace2-node-font", vars.nodeFont);
  panel.style.setProperty("--workspace2-meta-font", vars.metaFont);
  panel.style.setProperty("--workspace2-row-height", vars.rowHeight);
  panel.style.setProperty("--workspace2-node-row-height", vars.rowHeight);
  panel.style.setProperty("--workspace2-node-row-padding-y", vars.nodePaddingY);
  panel.style.setProperty("--workspace2-node-list-gap", vars.nodeGap);
}

function applyTemplateUiScale(panel) {
  templatesState.uiScale = clampNodeUiScale(templatesState.uiScale);
  const vars = nodeUiScaleVars(templatesState.uiScale);
  panel.style.setProperty("--workspace2-tree-font", vars.treeFont);
  panel.style.setProperty("--workspace2-folder-font", vars.folderFont);
  panel.style.setProperty("--workspace2-node-font", vars.nodeFont);
  panel.style.setProperty("--workspace2-meta-font", vars.metaFont);
  panel.style.setProperty("--workspace2-row-height", vars.rowHeight);
  panel.style.setProperty("--workspace2-node-row-height", vars.rowHeight);
  panel.style.setProperty("--workspace2-node-row-padding-y", vars.nodePaddingY);
  panel.style.setProperty("--workspace2-node-list-gap", vars.nodeGap);
}

function nodesDensityControl(el) {
  nodesState.uiScale = clampNodeUiScale(nodesState.uiScale);
  const wrap = document.createElement("label");
  wrap.className = "workspace2-node-density";
  wrap.title = t("nodes.uiScaleTitle");

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.value = String(nodesState.uiScale);
  isolateComfyKeys(slider);
  slider.setAttribute("aria-label", t("nodes.uiScaleTitle"));
  const valueLabel = createSliderValueLabel(nodeScaleLabel(nodesState.uiScale));
  slider.addEventListener("click", (event) => event.stopPropagation());

  slider.addEventListener("input", () => {
    nodesState.uiScale = snapUiScaleValue(slider.value);
    slider.value = String(nodesState.uiScale);
    localStorage.setItem(NODE_UI_SCALE_KEY, String(nodesState.uiScale));
    valueLabel.textContent = nodeScaleLabel(nodesState.uiScale);
    showSliderValue(wrap);
    const panel = el.querySelector(".workspace2-panel");
    if (panel) {
      applyNodeUiScale(panel);
    }
  });
  slider.addEventListener("pointerup", () => hideSliderValueSoon(wrap));
  slider.addEventListener("change", () => hideSliderValueSoon(wrap));
  slider.addEventListener("blur", () => hideSliderValueSoon(wrap));

  wrap.append(slider, valueLabel);
  return wrap;
}

function templatesDensityControl(el) {
  templatesState.uiScale = clampNodeUiScale(templatesState.uiScale);
  const wrap = document.createElement("label");
  wrap.className = "workspace2-node-density";
  wrap.title = t("templates.uiScaleTitle");

  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "100";
  slider.step = "1";
  slider.value = String(templatesState.uiScale);
  isolateComfyKeys(slider);
  slider.setAttribute("aria-label", t("templates.uiScaleTitle"));
  const valueLabel = createSliderValueLabel(templateScaleLabel(templatesState.uiScale));
  slider.addEventListener("click", (event) => event.stopPropagation());
  slider.addEventListener("input", () => {
    templatesState.uiScale = snapUiScaleValue(slider.value);
    slider.value = String(templatesState.uiScale);
    localStorage.setItem(TEMPLATE_UI_SCALE_KEY, String(templatesState.uiScale));
    valueLabel.textContent = templateScaleLabel(templatesState.uiScale);
    showSliderValue(wrap);
    const panel = el.querySelector(".workspace2-panel");
    if (panel) {
      applyTemplateUiScale(panel);
    }
  });
  slider.addEventListener("pointerup", () => hideSliderValueSoon(wrap));
  slider.addEventListener("change", () => hideSliderValueSoon(wrap));
  slider.addEventListener("blur", () => hideSliderValueSoon(wrap));

  wrap.append(slider, valueLabel);
  return wrap;
}

function templatesRootRow(el) {
  return createRootActionRow({
    className: "workspace2-node-root-row",
    title: t("templates.moveToRootTitle"),
    icon: "rootArrow",
    text: t("templates.moveToRoot"),
    control: templatesDensityControl(el),
    setupDrop: (row) => makeTemplateDropTarget(el, row, ""),
  });
}

function nodesFavoriteRootRow(el) {
  return createRootActionRow({
    className: "workspace2-node-root-row",
    title: t("nodes.moveToFavoriteRootTitle"),
    icon: "rootArrow",
    text: t("nodes.moveToFavoriteRoot"),
    control: nodesDensityControl(el),
    setupDrop: (row) => {
      makeFavoriteGroupDropTarget(el, row, NODE_DEFAULT_GROUP_ID);
      row.dataset.workspace2GroupTarget = "";
    },
  });
}

function nodesViewTabs(el) {
  const defaults = nodePanelState.defaultVisibleSections();
  nodesState.visibleSections = { ...defaults, ...(nodesState.visibleSections || {}) };
  if (!Object.values(nodesState.visibleSections).some(Boolean)) {
    nodesState.visibleSections = defaults;
  }
  const tabs = document.createElement("div");
  tabs.className = "workspace2-node-tabs workspace2-node-filter-row";
  for (const section of NODE_SECTION_FILTERS) {
    const active = nodesState.visibleSections[section] !== false;
    const label = t(`nodes.view.${section}`);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `workspace2-node-tab ${active ? "is-active" : ""}`;
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.textContent = label;
    button.title = t(active ? "nodes.filterHide" : "nodes.filterShow", { section: label });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const next = {
        ...nodesState.visibleSections,
        [section]: nodesState.visibleSections[section] === false,
      };
      if (!Object.values(next).some(Boolean)) {
        return;
      }
      nodesState.visibleSections = next;
      nodePanelState.saveVisibleSections(nodesState.visibleSections);
      renderNodesPanel(el);
    });
    tabs.append(button);
  }
  return tabs;
}

function nodesSortButton(el) {
  if (!NODE_SORTS.includes(nodesState.sort)) {
    nodesState.sort = "original";
  }
  const label = t(`nodes.sort.${nodesState.sort}`);
  const button = toolbarButton("sort", t("nodes.sortTitle", { sort: label }), (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (nodesState.sortMenuElement) {
      closeNodeSortMenu();
      return;
    }
    openNodeSortMenu(el, event.currentTarget);
  });
  button.classList.add("workspace2-node-sort-button");
  button.dataset.sort = nodesState.sort;
  button.classList.toggle("is-custom-order", nodesState.customOrderEnabled);
  return button;
}

function closeNodeSortMenu() {
  if (nodesState.sortMenuCloseHandler) {
    window.removeEventListener("pointerdown", nodesState.sortMenuCloseHandler, true);
    document.removeEventListener("pointerdown", nodesState.sortMenuCloseHandler, true);
    window.removeEventListener("click", nodesState.sortMenuCloseHandler, true);
    document.removeEventListener("click", nodesState.sortMenuCloseHandler, true);
    window.removeEventListener("keydown", nodesState.sortMenuCloseHandler, true);
    nodesState.sortMenuCloseHandler = null;
  }
  nodesState.sortMenuElement?.remove();
  nodesState.sortMenuElement = null;
}

function openNodeSortMenu(el, anchor) {
  closeNodeSortMenu();
  const panel = anchor?.closest?.(".workspace2-panel") || el.querySelector(".workspace2-panel");
  if (!panel) {
    return;
  }

  const rect = anchor.getBoundingClientRect();
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 180))}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("pointerdown", (event) => event.stopPropagation());
  menu.addEventListener("contextmenu", (event) => event.preventDefault());

  for (const sort of NODE_SORTS) {
    const option = document.createElement("button");
    option.className = `workspace2-menu-item${sort === nodesState.sort ? " is-active" : ""}`;
    option.type = "button";
    option.textContent = t(`nodes.sort.${sort}`);
    option.addEventListener("click", () => {
      nodesState.sort = sort;
      localStorage.setItem(NODE_SORT_KEY, nodesState.sort);
      closeNodeSortMenu();
      renderNodesPanel(el);
    });
    menu.append(option);
  }

  const divider = document.createElement("div");
  divider.className = "workspace2-menu-divider";
  menu.append(divider);

  const custom = document.createElement("button");
  custom.className = `workspace2-menu-item workspace2-menu-check-item${nodesState.customOrderEnabled ? " is-active" : ""}`;
  custom.type = "button";
  custom.textContent = t("nodes.customOrder");
  custom.addEventListener("click", () => {
    nodesState.customOrderEnabled = !nodesState.customOrderEnabled;
    localStorage.setItem(NODE_CUSTOM_ORDER_ENABLED_KEY, nodesState.customOrderEnabled ? "1" : "0");
    closeNodeSortMenu();
    renderNodesPanel(el);
  });
  menu.append(custom);

  panel.append(menu);
  nodesState.sortMenuElement = menu;
  nodesState.sortMenuCloseHandler = (event) => {
    if (event.type === "keydown" && event.key !== "Escape") {
      return;
    }
    if (menu.contains(event.target) || anchor.contains(event.target)) {
      return;
    }
    closeNodeSortMenu();
  };
  setTimeout(() => {
    window.addEventListener("pointerdown", nodesState.sortMenuCloseHandler, true);
    document.addEventListener("pointerdown", nodesState.sortMenuCloseHandler, true);
    window.addEventListener("click", nodesState.sortMenuCloseHandler, true);
    document.addEventListener("click", nodesState.sortMenuCloseHandler, true);
    window.addEventListener("keydown", nodesState.sortMenuCloseHandler, true);
  }, 0);
}

function workflowSortButton(el) {
  if (!WORKFLOW_SORTS.includes(state.sort)) {
    state.sort = "nameAsc";
  }
  const label = t(`workflows.sort.${state.sort}`);
  const button = toolbarButton("sort", t("workflows.sortTitle", { sort: label }), (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (state.sortMenuElement) {
      closeWorkflowSortMenu();
      return;
    }
    openWorkflowSortMenu(el, event.currentTarget);
  });
  button.classList.add("workspace2-workflow-sort-button");
  button.dataset.sort = state.sort;
  button.classList.toggle("is-custom-order", state.customOrderEnabled);
  return button;
}

function closeWorkflowSortMenu() {
  closeWorkflowSortMenuRenderer({ state });
}

function openWorkflowSortMenu(el, anchor) {
  openWorkflowSortMenuRenderer({
    state,
    workflowSorts: WORKFLOW_SORTS,
    t,
    sortKey: WORKFLOW_SORT_KEY,
    folderFirstKey: WORKFLOW_FOLDER_FIRST_KEY,
    customOrderKey: WORKFLOW_CUSTOM_ORDER_KEY,
    renderPanel,
    refreshPanel,
    handleError,
    closeMenu: closeWorkflowSortMenu,
  }, el, anchor);
}

function prepareWorkspaceSidebarHost(el) {
  el.innerHTML = "";
  el.classList.add("workspace2-host");
  el.classList.remove("is-workspace2-surface-hidden");
  applyWorkspaceBackgroundEffect(el);
  el.style.height = "100%";
  el.style.maxHeight = "100%";
  el.style.overflow = "hidden";
  el.style.minHeight = "0";
}

function prepareWorkspaceModuleMount(el) {
  if (!el?.classList?.contains("workspace2-module-body")) {
    prepareWorkspaceSidebarHost(el);
    return;
  }
  el.innerHTML = "";
  el.classList.remove("workspace2-host", "is-glass-background");
  el.style.height = "100%";
  el.style.maxHeight = "100%";
  el.style.overflow = "hidden";
  el.style.minHeight = "0";
}

function createRootActionRow({ className = "", title, icon, text, control, setupDrop, onClick }) {
  const row = document.createElement("div");
  row.className = `workspace2-root-row ${className}`.trim();
  if (title) {
    row.title = title;
  }

  const target = document.createElement("div");
  target.className = "workspace2-root-target";
  target.append(iconSvg(icon));

  const label = document.createElement("div");
  label.className = "workspace2-name";
  label.textContent = text;
  target.append(label);

  if (typeof setupDrop === "function") {
    setupDrop(row, target);
  }
  if (typeof onClick === "function") {
    row.addEventListener("click", onClick);
  }

  row.append(target);
  if (control) {
    row.append(control);
  }
  return row;
}

function workspaceModuleLabel(moduleId) {
  if (moduleId === "nodes") {
    return t("workspace.tab.nodes");
  }
  if (moduleId === "templates") {
    return t("workspace.tab.templates");
  }
  const provider = findWorkspacePanelProvider(moduleId);
  if (provider) return resolveWorkspacePanelProviderLabel(provider).text;
  return t("workspace.tab.workflows");
}

function workspaceModuleTab(moduleId) {
  const provider = findWorkspacePanelProvider(moduleId);
  if (!provider) {
    return { id: moduleId, label: workspaceModuleLabel(moduleId) };
  }
  const label = String(provider.tabLabel || provider.title || provider.id);
  return {
    id: moduleId,
    label,
    tooltip: String(provider.tabTooltip || provider.title || label),
  };
}

function workspaceTabPlan() {
  return createWorkspaceTabPlan(WORKSPACE2_MODULES, workspacePanelProviders(), localStorage.getItem(PINNED_PROVIDER_KEY) || "");
}

function renderWorkspace2Panel(el) {
  disposeWorkspacePanelProvider();
  workspaceState.renderTarget = el;
  styles();
  setupWorkspaceKeyIsolation();
  setupWorkspaceGlassOverlayTracking();
  if (workspaceState.glassPortalElement?.isConnected) {
    workspaceState.glassPortalElement.remove();
  }
  workspaceState.glassPortalElement = null;
  prepareWorkspaceSidebarHost(el);

  const plan = workspaceTabPlan();
  const visibleIds = [...plan.coreIds, ...(plan.pinned ? [plan.pinned.id] : [])];
  const tabsWithOverflow = visibleIds.map((id) => ({
    ...workspaceModuleTab(id),
    overflow: id === plan.pinned?.id ? plan.overflowProviders : [],
  }));
  const panelHost = createWorkspacePanelHost({
    tabs: tabsWithOverflow,
    activeTabId: workspaceState.activeModule,
    onActivate: (moduleId) => {
      workspaceState.activeModule = moduleId;
      localStorage.setItem(WORKSPACE2_MODULE_KEY, moduleId);
      renderWorkspace2Panel(el);
    },
    settingsTitle: t("settings.title"),
    onOpenSettings: openWorkspaceSettings,
    createSettingsIcon: () => iconSvg("settings"),
    providerLabel: (provider) => resolveWorkspacePanelProviderLabel(provider).text,
    onActivateProvider: (id) => { workspaceState.activeModule = id; localStorage.setItem(WORKSPACE2_MODULE_KEY, id); renderWorkspace2Panel(el); },
    onPinProvider: (id) => { localStorage.setItem(PINNED_PROVIDER_KEY, id); workspaceState.activeModule = id; localStorage.setItem(WORKSPACE2_MODULE_KEY, id); renderWorkspace2Panel(el); },
    overflowLabel: t("workspace.extensions"),
    pinLabel: t("workspace.pin"),
  });
  applyWorkspaceBackgroundEffect(panelHost.shell);
  el.append(panelHost.shell);
  syncWorkspaceGlassOverlay();

  const provider = findWorkspacePanelProvider(workspaceState.activeModule);
  if (provider) {
    try {
      const dispose = provider.render({
        app, translate: t, surface: panelHost.shell,
        ui: workspaceState.panelUiTemplate?.create({ document }) ?? null,
        headerHost: panelHost.headerHost,
        toolbarHost: panelHost.toolbarHost,
        controlsHost: panelHost.controlsHost,
        // Compatibility name for existing Provider implementations.
        contextHost: panelHost.contextHost,
        contentHost: panelHost.contentHost,
      });
      workspaceState.providerDispose = typeof dispose === "function" ? dispose : null;
    } catch (error) {
      console.error("[WorkspaceKit] Provider render failed", provider.id, error);
      workspaceState.activeModule = "workflows";
      localStorage.setItem(WORKSPACE2_MODULE_KEY, "workflows");
      renderPanel(panelHost.contentHost);
    }
  } else if (workspaceState.activeModule === "nodes") {
    renderNodesPanel(panelHost.contentHost);
  } else if (workspaceState.activeModule === "templates") {
    renderTemplatesPanel(panelHost.contentHost);
  } else {
    renderPanel(panelHost.contentHost);
  }
  window.setTimeout(refreshWorkspacePanelAncestorsIfVisible, 0);
  window.setTimeout(refreshWorkspacePanelAncestorsIfVisible, 180);
}

function readDragItem(event) {
  const raw = event.dataTransfer?.getData(DRAG_TYPE);
  if (!raw) {
    const plain = event.dataTransfer?.getData("text/plain");
    if (!plain) {
      return state.draggingItem;
    }
    try {
      return JSON.parse(plain);
    } catch {
      return state.draggingItem;
    }
  }
  try {
    return JSON.parse(raw);
  } catch {
    return state.draggingItem;
  }
}

function canDrop(dragged, targetFolder) {
  if (!dragged || dragged.path === targetFolder) {
    return false;
  }
  if (dragged.type === "folder" && targetFolder.startsWith(`${dragged.path}/`)) {
    return false;
  }
  return parentPath(dragged.path) !== targetFolder;
}

function makeDropTarget(el, target, targetFolder) {
  target.dataset.workspace2DropTarget = targetFolder;
  target.addEventListener("dragover", (event) => {
    const dragged = state.draggingItem;
    if (!canDrop(dragged, targetFolder)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "move";
    target.classList.add("is-drop");
  });
  target.addEventListener("dragleave", () => {
    target.classList.remove("is-drop");
  });
  target.addEventListener("drop", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    target.classList.remove("is-drop");
    const dragged = readDragItem(event);
    if (!canDrop(dragged, targetFolder)) {
      return;
    }
    try {
      await moveItem(el, dragged.path, targetFolder);
    } catch (error) {
      handleError(el, error);
    } finally {
      state.draggingItem = null;
    }
  });
}

function workflowDropTargetElement(targetFolder) {
  if (!targetFolder) {
    return document.querySelector(".workspace2-tree[data-workspace2-drop-target]");
  }
  return document.querySelector(`[data-workspace2-item-path="${cssEscape(targetFolder)}"]`);
}

function highlightWorkflowDropRegion(targetFolder) {
  const targetElement = workflowDropTargetElement(targetFolder);
  targetElement?.classList.add("is-drop");
  if (!targetFolder) {
    return;
  }
  document.querySelectorAll("[data-workspace2-item-path]").forEach((row) => {
    const rowPath = row.dataset.workspace2ItemPath || "";
    if (rowPath.startsWith(`${targetFolder}/`)) {
      row.classList.add("is-drop-region");
    }
  });
}

function clearPointerDropHighlights() {
  document.querySelectorAll(".workspace2-row.is-drop, .workspace2-root.is-drop, .workspace2-root-row.is-drop, .workspace2-tree.is-drop, .workspace2-row.is-drop-region, .workspace2-row.is-reorder-before, .workspace2-row.is-reorder-after").forEach((node) => {
    node.classList.remove("is-drop", "is-drop-region", "is-reorder-before", "is-reorder-after");
  });
}

function setDraggingVisual(active) {
  document.querySelectorAll(".workspace2-panel").forEach((node) => {
    node.classList.toggle("is-dragging", active);
  });
}

function finishPointerDrag() {
  if (state.pointerDrag) {
    document.removeEventListener("pointermove", state.pointerDrag.onMove, true);
    document.removeEventListener("pointerup", state.pointerDrag.onUp, true);
    document.removeEventListener("pointercancel", state.pointerDrag.onCancel, true);
  }
  clearPointerDropHighlights();
  setDraggingVisual(false);
  state.draggingItem = null;
  state.pointerDrag?.ghost?.remove();
  state.pointerDrag = null;
}

function finishWorkflowReorderDrag() {
  const drag = state.reorderDrag;
  if (drag) {
    document.removeEventListener("pointermove", drag.onMove, true);
    document.removeEventListener("pointerup", drag.onUp, true);
    document.removeEventListener("pointercancel", drag.onCancel, true);
    drag.row?.classList.remove("is-reordering");
    drag.ghost?.remove();
  }
  clearPointerDropHighlights();
  setDraggingVisual(false);
  state.reorderDrag = null;
}

function workflowRowAtPoint(clientX, clientY) {
  const previousGhostDisplay = state.reorderDrag?.ghost?.style.display;
  if (state.reorderDrag?.ghost) {
    state.reorderDrag.ghost.style.display = "none";
  }
  const element = document.elementFromPoint(clientX, clientY);
  if (state.reorderDrag?.ghost) {
    state.reorderDrag.ghost.style.display = previousGhostDisplay || "";
  }
  return element?.closest?.(".workspace2-row[data-workspace2-item-path]") || null;
}

function updateWorkflowReorderDrag(event) {
  const drag = state.reorderDrag;
  if (!drag) {
    return;
  }

  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.active && Math.hypot(dx, dy) < 4) {
    return;
  }

  if (!drag.active) {
    drag.active = true;
    state.suppressClick = true;
    setDraggingVisual(true);
    drag.row.classList.add("is-reordering");
    drag.ghost = document.createElement("div");
    drag.ghost.className = "workspace2-drag-ghost";
    drag.ghost.textContent = drag.item.name;
    document.body.append(drag.ghost);
  }

  event.preventDefault();
  event.stopPropagation();

  drag.ghost.style.left = `${event.clientX + 12}px`;
  drag.ghost.style.top = `${event.clientY + 10}px`;

  clearPointerDropHighlights();
  const targetRow = workflowRowAtPoint(event.clientX, event.clientY);
  const targetPath = targetRow?.dataset.workspace2ItemPath || "";
  const targetParent = targetRow?.dataset.workspace2ParentPath || "";
  if (!targetRow || targetPath === drag.item.path || targetParent !== drag.parentPath) {
    drag.targetPath = "";
    drag.placement = "";
    return;
  }

  const rect = targetRow.getBoundingClientRect();
  drag.targetPath = targetPath;
  drag.placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  targetRow.classList.add(drag.placement === "before" ? "is-reorder-before" : "is-reorder-after");
}

function commitWorkflowReorderDrag(el, event) {
  const drag = state.reorderDrag;
  if (!drag) {
    return;
  }

  updateWorkflowReorderDrag(event);
  const shouldReorder = drag.active && drag.targetPath && drag.placement;
  const sourcePath = drag.item.path;
  const targetPath = drag.targetPath;
  const placement = drag.placement;
  const parent = drag.parentPath;
  finishWorkflowReorderDrag();

  if (!shouldReorder) {
    return;
  }

  const rows = [...el.querySelectorAll(`.workspace2-row[data-workspace2-parent-path="${cssEscape(parent)}"]`)];
  const order = rows.map((row) => row.dataset.workspace2ItemPath).filter(Boolean);
  const nextOrder = order.filter((path) => path !== sourcePath);
  const targetIndex = nextOrder.indexOf(targetPath);
  if (targetIndex === -1) {
    return;
  }
  nextOrder.splice(placement === "before" ? targetIndex : targetIndex + 1, 0, sourcePath);
  state.customOrder[parent] = nextOrder;
  saveWorkflowCustomOrder();
  renderPanel(el);
}

function beginWorkflowReorderDrag(el, handle, row, node) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !state.customOrderEnabled || state.editingPath === node.path) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const onMove = (moveEvent) => updateWorkflowReorderDrag(moveEvent);
    const onUp = (upEvent) => commitWorkflowReorderDrag(el, upEvent);
    const onCancel = () => finishWorkflowReorderDrag();
    state.reorderDrag = {
      item: {
        type: node.type,
        path: node.path,
        name: node.name,
      },
      parentPath: parentPath(node.path || ""),
      row,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      targetPath: "",
      placement: "",
      ghost: null,
      onMove,
      onUp,
      onCancel,
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onCancel, true);
    handle.setPointerCapture?.(event.pointerId);
  });
}

function findPointerDropTarget(clientX, clientY) {
  const previousGhostDisplay = state.pointerDrag?.ghost?.style.display;
  if (state.pointerDrag?.ghost) {
    state.pointerDrag.ghost.style.display = "none";
  }
  const hitElements = typeof document.elementsFromPoint === "function"
    ? document.elementsFromPoint(clientX, clientY)
    : [document.elementFromPoint(clientX, clientY)].filter(Boolean);
  if (state.pointerDrag?.ghost) {
    state.pointerDrag.ghost.style.display = previousGhostDisplay || "";
  }
  const hit = resolveWorkflowPointerDropHit(hitElements);
  if (hit?.kind === "direct" || hit?.kind === "tree") {
    return hit.target;
  }
  if (hit?.kind === "parent") return workflowDropTargetElement(hit.parentPath);
  return null;
}

function updatePointerDrag(el, event) {
  const drag = state.pointerDrag;
  if (!drag) {
    return;
  }

  const dx = event.clientX - drag.startX;
  const dy = event.clientY - drag.startY;
  if (!drag.active && Math.hypot(dx, dy) < 4) {
    return;
  }

  if (!drag.active) {
    drag.active = true;
    state.suppressClick = true;
    state.draggingItem = drag.item;
    setDraggingVisual(true);
    drag.ghost = document.createElement("div");
    drag.ghost.className = "workspace2-drag-ghost";
    drag.ghost.textContent = drag.item.name;
    document.body.append(drag.ghost);
  }

  event.preventDefault();
  event.stopPropagation();

  drag.ghost.style.left = `${event.clientX + 12}px`;
  drag.ghost.style.top = `${event.clientY + 10}px`;

  clearPointerDropHighlights();
  const target = findPointerDropTarget(event.clientX, event.clientY);
  const targetFolder = target?.dataset.workspace2DropTarget ?? null;
  if (target && canDrop(drag.item, targetFolder)) {
    drag.targetFolder = targetFolder;
    highlightWorkflowDropRegion(targetFolder);
  } else {
    drag.targetFolder = null;
  }
}

async function commitPointerDrag(el, event) {
  const drag = state.pointerDrag;
  if (!drag) {
    return;
  }

  updatePointerDrag(el, event);
  const shouldMove = drag.active && drag.targetFolder !== null;
  const sourcePath = drag.item.path;
  const targetFolder = drag.targetFolder;
  finishPointerDrag();

  if (!shouldMove) {
    return;
  }

  try {
    await moveItem(el, sourcePath, targetFolder);
  } catch (error) {
    handleError(el, error);
  }
}

function beginPointerDrag(el, row, node) {
  row.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || state.editingPath === node.path) {
      return;
    }
    event.preventDefault();
    if (event.target.closest("button,input,.workspace2-disclosure,.workspace2-reorder-handle")) {
      return;
    }
    const item = {
      type: node.type,
      path: node.path,
      name: node.name,
    };
    const onMove = (moveEvent) => updatePointerDrag(el, moveEvent);
    const onUp = (upEvent) => commitPointerDrag(el, upEvent);
    const onCancel = () => finishPointerDrag();
    state.pointerDrag = {
      item,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      targetFolder: null,
      ghost: null,
      onMove,
      onUp,
      onCancel,
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onCancel, true);
    row.setPointerCapture?.(event.pointerId);
  });
}

function openContextMenu(el, event, item) {
  event.preventDefault();
  event.stopPropagation();
  state.selectedPath = item.path;
  state.contextMenu = {
    x: event.clientX,
    y: event.clientY,
    item,
  };
  const panel = event.currentTarget?.closest?.(".workspace2-panel") || el.querySelector(".workspace2-panel");
  renderContextMenu(el, panel);
}

function closeContextMenu() {
  state.contextMenuElement?.remove();
  state.contextMenuElement = null;
  state.contextMenu = null;
}

const renderContextMenu = workflowContextMenu.render;

const renderTrashPanel = workflowTrash.render;

function beginWorkflowRename(el, path, surface) {
  state.editingPath = path;
  state.editingSurface = surface;
  renderPanel(el);
}

function createWorkflowRenameInput(el, item, surface) {
  return createWorkflowRenameInputRenderer({
    item,
    surface,
    displayName: workflowDisplayName,
    prepareInput: isolateComfyKeys,
    onCommit: (name) => renameItem(el, item, name),
    onError: (error) => handleWorkflowRenameError(el, error),
    onCancel: () => {
      state.editingPath = "";
      state.editingSurface = "";
      renderPanel(el);
    },
    isStillEditing: (path, targetSurface) => state.editingPath === path && state.editingSurface === targetSurface,
  });
}

function renderNode(el, list, node, depth) {
  // Keep the narrow adapter here: this is evaluated only while Browse renders,
  // never while entry.js registers the sidebar. All callbacks preserve their
  // existing transaction order in the composition root.
  renderWorkflowBrowseNode({
    state,
    t,
    matchesQuery,
    visibleChildren,
    parentPath,
    workflowFolderMeta,
    applyDecoratedIcon,
    defaultFolderIconClass: DEFAULT_FOLDER_ICON_CLASS,
    defaultFolderOpenIconClass: DEFAULT_FOLDER_OPEN_ICON_CLASS,
    defaultFileIconClass: DEFAULT_FILE_ICON_CLASS,
    getDisplayName: workflowDisplayName,
    createRenameInput: createWorkflowRenameInput,
    iconButton,
    dangerIconButton,
    onCloseContextMenu: closeContextMenu,
    onToggleFolder: toggleWorkflowFolder,
    onOpenWorkflow: async (target, path) => {
      await openWorkflow(path);
      renderPanel(target);
    },
    onOpenContextMenu: openContextMenu,
    onPointerDrag: beginPointerDrag,
    onDropTarget: makeDropTarget,
    onReorderDrag: beginWorkflowReorderDrag,
    onNewSubfolder: (target, path) => createFolder(target, path),
    onOpenWorkflowLocation: openWorkflowLocation,
    onCopyWorkflow: copyWorkflow,
    onRename: (target, path) => beginWorkflowRename(target, path, "browse"),
    onMoveToTrash: (target, item) => moveToTrash(target, item),
    onError: handleError,
  }, el, list, node, depth);
}

const renderWorkflowTreeBody = workflowResults.renderTreeBody;
const refreshWorkflowResults = workflowResults.refresh;
const scheduleWorkflowResultsRefresh = workflowResults.scheduleRefresh;

const isWorkflowSectionCollapsed = workflowSections.isCollapsed;
const setWorkflowSectionCollapsed = workflowSections.setCollapsed;
const createWorkflowSection = workflowSections.createSection;

function recentWorkflowRows(el) {
  const existing = new Map(state.items.filter((item) => item.type === "file").map((item) => [item.path, item]));
  const officialMode = state.isOfficialRoot && Boolean(getOfficialWorkflowStore(app));
  const activeOfficialWorkflow = officialMode ? getActiveOfficialWorkflow(app) : null;
  const recent = officialMode
    ? getOpenOfficialWorkflows(app)
      // ComfyUI can leave a transient empty slot in openWorkflows while a
      // deleted workflow is being removed from the official store. Rendering
      // must tolerate that intermediate state; otherwise the exception occurs
      // after the module body has been cleared and makes the panel look blank.
      .filter((workflow) => workflow && typeof workflow === "object")
      .map((workflow) => {
        const path = relativeWorkflowPathFromOfficial(workflow.path || "");
        return {
          path,
          name: workflow.filename || path,
          // The official store changes this path atomically. The filesystem
          // list can legitimately arrive one refresh later, so do not hide an
          // open tab just because its matching local item is briefly stale.
          item: existing.get(path) || {
            type: "file",
            name: workflow.filename || path.split("/").pop() || path,
            path,
          },
          officialWorkflow: workflow,
        };
      })
      .filter((entry) => entry.path)
    : readRecentWorkflows()
      .map((entry) => ({ ...entry, item: existing.get(entry.path) }))
      .filter((entry) => entry.item)
      .slice(0, workflowRecentLimit());
  const entries = recent.map((entry) => {
    const isOfficialWorkflow = Boolean(entry.officialWorkflow);
    const isActive = isOfficialWorkflow
      ? entry.officialWorkflow === activeOfficialWorkflow
      : entry.path === state.selectedPath;
    return {
      ...entry,
      isOfficialWorkflow,
      isActive,
      isDirty: isOfficialWorkflow
        ? workflowOpenState.isOfficialWorkflowDirty(entry.officialWorkflow)
        : isActive && state.workflowDirty,
      isRenaming: state.editingPath === entry.path && state.editingSurface === "open",
      displayName: workflowDisplayName(entry.item) || entry.name || entry.path,
    };
  });
  return renderOpenWorkflowList({
    entries,
    createRenameInput: (entry) => createWorkflowRenameInput(el, entry.item, "open"),
    onOpen: async (entry) => {
      state.selectedPath = entry.path;
      await openWorkflow(entry.path);
      renderPanel(el);
    },
    onSave: (entry) => saveCurrentWorkflowToPath(el, entry.path),
    onStartRename: (entry) => beginWorkflowRename(el, entry.path, "open"),
    onCloseOfficial: async (entry) => {
      if (entry.isDirty) {
        const choice = await workspace2ConfirmDirtyWorkflowClose(entry.displayName);
        if (!choice) return;
        if (choice === "save") {
          const saved = await saveOfficialWorkflow(entry.officialWorkflow);
          if (!saved) return;
        }
      }
      const closed = await closeOfficialWorkflow(app, entry.officialWorkflow);
      if (closed) {
        workflowOpenState.removeOfficialWorkflowPathState(entry.path);
        renderPanel(el);
      }
    },
    onRemoveRecent: (entry) => {
      removeRecentWorkflow(entry.path);
      renderPanel(el);
    },
    onError: (error) => handleError(el, error),
  });
}

function renderPanel(el) {
  const finish = startPerformanceSpan("workflows.render", {
    itemCount: state.items.length,
    trash: state.showTrash,
  });
  const snapshot = scrollSnapshot(el);
  state.workflowsTarget = el;
  startAutoRefresh(el);
  styles();
  setupWorkspaceKeyIsolation();
  closeContextMenu();
  closeWorkflowSortMenu();
  prepareWorkspaceModuleMount(el);

  // Consume the shared Blueprint without changing the established workflow
  // service/mount target. If a stale host cannot provide it during startup,
  // use an equivalent local slot structure rather than failing the panel.
  const panelUi = workspaceState.panelUiTemplate?.create?.({ document });
  const blueprint = panelUi?.createPanelBlueprint?.() || (() => {
    const element = document.createElement("div");
    const makeSlot = (name) => {
      const slot = document.createElement("div");
      slot.className = `workspacekit-ui-panel-${name}-slot`;
      element.append(slot);
      return slot;
    };
    const header = makeSlot("header");
    const toolbar = makeSlot("toolbar");
    const controls = makeSlot("controls");
    const content = makeSlot("content");
    const setSlot = (slot, value) => {
      const children = Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
      slot.replaceChildren(...children);
      slot.hidden = children.length === 0;
    };
    return {
      element, header, toolbar, controls, content,
      setHeader: (value) => setSlot(header, value),
      setToolbar: (value) => setSlot(toolbar, value),
      setControls: (value) => setSlot(controls, value),
      setContent: (value) => setSlot(content, value),
    };
  })();
  const panel = blueprint.element;
  panel.classList.add("workspace2-panel", "workspace2-workflow-blueprint");
  applyWorkflowUiScale(panel);
  panel.addEventListener("click", () => {
    closeContextMenu();
    closeWorkflowSortMenu();
  });

  const newFolder = toolbarButton("folderPlus", t("toolbar.newFolder"), async () => {
    try {
      await createFolder(el, selectedFolderPath());
    } catch (error) {
      handleError(el, error);
    }
  });

  const newWorkflow = toolbarButton("filePlus", t("toolbar.newWorkflow"), async () => {
    try {
      await createWorkflow(el);
    } catch (error) {
      handleError(el, error);
    }
  });

  const open = toolbarButton("folderOpen", t("toolbar.openWorkflow"), async () => {
    try {
      await openWorkflowFileFromPicker(el);
    } catch (error) {
      handleError(el, error);
    }
  });

  const trash = toolbarButton(state.showTrash ? "files" : "archiveTray", state.showTrash ? t("toolbar.showFiles") : t("toolbar.showTrash"), async () => {
    try {
      state.showTrash = !state.showTrash;
      if (state.showTrash) {
        await loadTrash();
      } else {
        await loadWorkflows();
      }
      renderPanel(el);
    } catch (error) {
      handleError(el, error);
    }
  });
  trash.classList.add("is-trash-toggle");
  if (state.showTrash) {
    trash.classList.add("is-active");
  }

  const header = createPanelHeader(t("workflows.title"), state.status);
  const toolbar = createSearchToolbar({
    focusKey: "workflow-search",
    placeholder: t("search.placeholder"),
    value: state.query,
    buttons: [newFolder, newWorkflow, open, workflowSortButton(el), trash],
    onInput: (value) => {
      state.query = value;
      scheduleWorkflowResultsRefresh(el);
    },
  });
  blueprint.setHeader(header);
  blueprint.setToolbar(toolbar);

  if (state.showTrash) {
    const emptyTrashRow = createRootActionRow({
      className: "workspace2-empty-trash-row",
      title: t("trash.moveAllToSystemTitle"),
      icon: "systemTrash",
      text: t("trash.moveAllToSystemShort"),
      control: fontControl(el),
      onClick: (event) => {
        event.stopPropagation();
        if (event.target?.closest?.(".workspace2-inline-confirm")) {
          return;
        }
        workspace2InlineConfirm(event.currentTarget, {
          confirmText: t("confirm.emptyTrash"),
          onConfirm: async () => {
            try {
              await emptyTrash(el);
            } catch (error) {
              handleError(el, error);
            }
          },
        });
      },
    });
    const trashContent = document.createElement("div");
    trashContent.className = "workspace2-workflow-content workspace2-workflow-trash-content";
    blueprint.setControls(emptyTrashRow);
    blueprint.setContent(trashContent);
    renderTrashPanel(el, trashContent);
    el.append(panel);
    finish({ renderedTrashCount: state.trashItems.length });
    return;
  }

  const tree = document.createElement("div");
  tree.className = "workspace2-tree";

  const moveRootRow = createRootActionRow({
    title: t("root.dropTitle"),
    icon: "rootArrow",
    text: t("root.move"),
    control: fontControl(el),
    setupDrop: (row) => makeDropTarget(el, row, ""),
  });

  renderWorkflowTreeBody(el, tree);

  const openSection = createWorkflowSection({
    title: t("workflows.recent"),
    collapsedKey: WORKFLOW_OPEN_SECTION_COLLAPSED_KEY,
    content: recentWorkflowRows(el),
  });

  const browseSection = createWorkflowSection({
    title: t("workflows.browse"),
    collapsedKey: WORKFLOW_BROWSE_SECTION_COLLAPSED_KEY,
    className: "is-browse",
    content: tree,
  });

  const workflowContent = document.createElement("div");
  workflowContent.className = "workspace2-workflow-content";
  workflowContent.append(openSection, browseSection);

  blueprint.setControls(moveRootRow);
  blueprint.setContent(workflowContent);
  renderContextMenu(el, panel);
  el.append(panel);
  restoreScrollSnapshot(el, snapshot);
}

function canvasGroupsList() {
  workspace2CanvasGroups.init();
  if (workspace2CanvasGroups._pendingGroups || workspace2CanvasGroups._needRestore) {
    workspace2CanvasGroups.restoreGroups?.();
  }
  return Object.values(workspace2CanvasGroups.groups || {}).sort((a, b) => String(a.title || a.id).localeCompare(String(b.title || b.id)));
}

function canvasGroupLabel(group) {
  return String(group?.title || "").trim() || group?.id || "Group";
}

function canvasGroupColor(group) {
  if (group?.bypassed) {
    return "hsla(280,60%,55%,0.75)";
  }
  const hue = Number(group?.colorHue ?? 48);
  const sat = Number(group?.colorSat ?? 100);
  const lit = Number(group?.colorLit ?? 55);
  const alpha = Number(group?.borderOpacity ?? 0.65);
  return `hsla(${hue},${sat}%,${lit}%,${alpha})`;
}

function canvasGroupMatches(group, query) {
  if (!query) {
    return true;
  }
  const text = [group.id, group.title, ...(group.nodeIds || [])].join(" ").toLowerCase();
  return text.includes(query);
}

function focusCanvasGroup(group) {
  const canvas = app?.canvas;
  const ds = canvas?.ds;
  const bounds = group?.bounds;
  if (!canvas?.canvas || !ds || !bounds) {
    return;
  }
  const scale = ds.scale || 1;
  const centerX = bounds.x + bounds.w / 2;
  const centerY = bounds.y + bounds.h / 2;
  ds.offset[0] = canvas.canvas.width / (2 * scale) - centerX;
  ds.offset[1] = canvas.canvas.height / (2 * scale) - centerY;
  workspace2CanvasGroups.updatePositions?.();
  canvas.setDirty?.(true, true);
  app.graph?.setDirtyCanvas?.(true, true);
}

function renameCanvasGroup(el, group) {
  const current = canvasGroupLabel(group);
  const value = window.prompt(t("canvasGroups.promptRename"), current);
  if (value === null) {
    return;
  }
  group.title = value.trim();
  workspace2CanvasGroups.rebuildGroupEl?.(group);
  workspace2CanvasGroups.syncGroupsToExtra?.();
  app.graph?.setDirtyCanvas?.(true, true);
  app.graph?.change?.();
  renderCanvasGroupsPanel(el);
}

function deleteCanvasGroup(el, group) {
  if (!window.confirm(t("canvasGroups.confirmDelete", { name: canvasGroupLabel(group) }))) {
    return;
  }
  workspace2CanvasGroups.removeGroup?.(group.id);
  renderCanvasGroupsPanel(el);
}

function renderCanvasGroupRow(el, group) {
  const row = document.createElement("div");
  row.className = "workspace2-canvas-group-row";
  if (group.bypassed) {
    row.classList.add("is-bypassed");
  }
  row.title = group.id;

  const swatch = document.createElement("span");
  swatch.className = "workspace2-canvas-group-swatch";
  swatch.style.setProperty("--workspace2-group-color", canvasGroupColor(group));

  const info = document.createElement("div");
  info.className = "workspace2-name";
  const title = document.createElement("div");
  title.className = "workspace2-canvas-group-title";
  title.textContent = canvasGroupLabel(group);
  const meta = document.createElement("div");
  meta.className = "workspace2-canvas-group-meta";
  meta.textContent = `${t("canvasGroups.nodes", { count: (group.nodeIds || []).length })}${group.bypassed ? " · bypass" : ""}`;
  info.append(title, meta);

  const actions = document.createElement("div");
  actions.className = "workspace2-actions";
  actions.append(
    iconButton("target", t("canvasGroups.locate"), () => focusCanvasGroup(group)),
    iconButton("edit", t("canvasGroups.rename"), () => renameCanvasGroup(el, group)),
    iconButton("restore", t("canvasGroups.toggleBypass"), () => {
      workspace2CanvasGroups.toggleBypass?.(group.id);
      renderCanvasGroupsPanel(el);
    }),
    dangerIconButton("trash", t("canvasGroups.delete"), () => deleteCanvasGroup(el, group)),
  );

  row.append(swatch, info, actions);
  return row;
}

function renderCanvasGroupsPanel(el) {
  canvasGroupsState.renderTarget = el;
  workspace2CanvasGroups.init();
  styles();
  setupWorkspaceKeyIsolation();
  prepareWorkspaceModuleMount(el);

  const panel = document.createElement("div");
  panel.className = "workspace2-panel";

  const top = document.createElement("div");
  top.className = "workspace2-top";
  const groups = canvasGroupsList();
  const query = canvasGroupsState.query.trim().toLowerCase();
  const visibleGroups = groups.filter((group) => canvasGroupMatches(group, query));
  const header = createPanelHeader(t("canvasGroups.title"), t("canvasGroups.status", { count: groups.length }));
  const create = toolbarButton("folderPlus", t("canvasGroups.create"), () => {
    workspace2CanvasGroups.createGroupFromSelection?.();
    renderCanvasGroupsPanel(el);
  });
  const refresh = toolbarButton("refresh", t("canvasGroups.refresh"), () => renderCanvasGroupsPanel(el));
  const toolbar = createSearchToolbar({
    focusKey: "canvas-groups-search",
    placeholder: t("canvasGroups.searchPlaceholder"),
    value: canvasGroupsState.query,
    buttons: [create, refresh],
    onInput: (value) => {
      canvasGroupsState.query = value;
      renderCanvasGroupsPanel(el);
    },
  });
  top.append(header, toolbar);

  const body = document.createElement("div");
  body.className = "workspace2-canvas-group-list";
  if (!visibleGroups.length) {
    const empty = document.createElement("div");
    empty.className = "workspace2-empty";
    empty.textContent = query ? t("canvasGroups.noMatches") : t("canvasGroups.empty");
    body.append(empty);
  } else {
    for (const group of visibleGroups) {
      body.append(renderCanvasGroupRow(el, group));
    }
  }

  panel.append(top, body);
  el.append(panel);
}

function renderTemplateRow(el, template) {
  const isEditing = templatesState.editingTemplateId === template.id;
  return renderTemplateRowRenderer({
    el,
    template,
    isEditing,
    isSelected: templatesState.pendingTemplate?.id === template.id,
    makeDropTarget: makeTemplateDropTarget,
    prepareRenameInput: isolateComfyKeys,
    onStartRename: () => {
      templatesState.editingTemplateId = template.id;
      renderTemplatesPanel(el);
    },
    onRename: (value) => renameTemplate(el, template, value),
    onRenameError: (error) => {
      templatesState.error = error.message;
      renderTemplatesPanel(el);
    },
    onCancelRename: () => {
      templatesState.editingTemplateId = "";
      renderTemplatesPanel(el);
    },
    onDelete: (anchor) => requestDeleteTemplate(el, template, anchor),
    onActionsPointerEnter: hideNodePreview,
    onDragStart: (event) => {
      hideNodePreview();
      templatesState.draggingTemplate = template;
      event.dataTransfer.effectAllowed = "copyMove";
      event.dataTransfer.setData(TEMPLATE_DRAG_TYPE, JSON.stringify(template));
      event.dataTransfer.setData("text/plain", template.name);
    },
    onDragEnd: () => {
      templatesState.draggingTemplate = null;
    },
    onOpenMenu: (event) => openTemplateContextMenu(el, event, template),
    onSelect: () => setPendingTemplate(templatesState.pendingTemplate?.id === template.id ? null : template),
    onPreviewEnter: (event) => {
      if (!templatesState.draggingTemplate) showTemplatePreview(template, event, { panelElement: el });
    },
    onPreviewMove: (event) => {
      if (!templatesState.draggingTemplate && nodesState.previewPopover && !nodesState.previewPopover.hidden) {
        positionNodePreviewPopover(nodesState.previewPopover, event, { panelElement: el });
      }
    },
    onPreviewLeave: () => {
      if (nodesState.previewPopover && !nodesState.previewPopover.hidden) hideNodePreview();
    },
    onOpenTemplate: async () => {
      hideNodePreview();
      await addTemplateToCanvas(template, canvasCenterPosition());
      await recordTemplateUse(el, template.id);
    },
    onOpenTemplateError: (error) => {
      templatesState.error = error.message;
      renderTemplatesPanel(el);
    },
  });
}

function renderTemplateGroupFolder(el, section, group, query, depth = 0) {
  const { groupTemplates, childGroups } = projectTemplateGroupResults({
    group,
    query,
    templates: templatesState.library?.templates || [],
  });
  if (query && !groupTemplates.length && !childGroups.length) {
    return;
  }
  const groupOpen = templatesState.expanded.has(group.id) || Boolean(query);

  renderTemplateGroupHeader({
    el,
    section,
    group,
    depth,
    groupOpen,
    isEditing: templatesState.editingGroupId === group.id,
    makeDropTarget: makeTemplateDropTarget,
    makeDragSource: makeTemplateGroupDragSource,
    onToggle: (event) => toggleTemplateGroup(el, group.id, event.ctrlKey || event.metaKey),
    onOpenMenu: (event) => openTemplateGroupContextMenu(el, event, group),
    prepareRenameInput: isolateComfyKeys,
    onCommitRename: (value) => commitTemplateGroupRename(el, group, value),
    onRenameError: (error) => {
      templatesState.error = error.message;
      renderTemplatesPanel(el);
    },
    onCancelRename: () => {
      templatesState.editingGroupId = "";
      renderTemplatesPanel(el);
    },
    onNewSubfolder: () => createTemplateGroup(el, group.id),
    onStartRename: () => {
      templatesState.editingGroupId = group.id;
      renderTemplatesPanel(el);
    },
    onDelete: (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestDeleteTemplateGroup(el, group, event.currentTarget);
    },
  });
  renderTemplateGroupContents({
    el,
    section,
    group,
    query,
    depth,
    groupOpen,
    childGroups,
    groupTemplates,
  });
}

function renderTemplatesBody(el, body) {
  if (!templatesState.library && !templatesState.loading) {
    loadTemplateLibrary().then(() => renderTemplatesPanel(el));
  }
  if (renderTemplateBodyState({ body, loading: templatesState.loading, error: templatesState.error })) return;
  const query = templatesState.query.trim();
  const allTemplates = templatesState.library?.templates || [];
  const { rootTemplates, rootGroups } = projectTemplateRootResults({ query, templates: allTemplates });
  renderTemplateRootResults({ el, body, query, rootTemplates, rootGroups });
}

function closeTemplateSortMenu() {
  if (templatesState.sortMenuCloseHandler) {
    window.removeEventListener("pointerdown", templatesState.sortMenuCloseHandler, true);
    document.removeEventListener("pointerdown", templatesState.sortMenuCloseHandler, true);
    window.removeEventListener("click", templatesState.sortMenuCloseHandler, true);
    document.removeEventListener("click", templatesState.sortMenuCloseHandler, true);
    window.removeEventListener("keydown", templatesState.sortMenuCloseHandler, true);
    templatesState.sortMenuCloseHandler = null;
  }
  templatesState.sortMenuElement?.remove();
  templatesState.sortMenuElement = null;
}

function templatesSortButton(el) {
  if (!TEMPLATE_SORTS.includes(templatesState.sort)) {
    templatesState.sort = "manual";
  }
  const label = t(`templates.sort.${templatesState.sort}`);
  const button = toolbarButton("sort", t("templates.sortTitle", { sort: label }), (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (templatesState.sortMenuElement) {
      closeTemplateSortMenu();
      return;
    }
    openSortMenu(el, event.currentTarget);
  });
  button.classList.add("workspace2-template-sort-button");
  button.dataset.sort = templatesState.sort;
  return button;
}

function openSortMenu(el, anchor) {
  closeTemplateSortMenu();
  const panel = anchor?.closest?.(".workspace2-panel") || el.querySelector(".workspace2-panel");
  if (!panel) {
    return;
  }
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  const rect = anchor.getBoundingClientRect();
  // .workspace2-context is position:fixed, so use the anchor's viewport
  // coordinates exactly like the Nodes and Workflows sort menus. Mixing in
  // panel-relative offsets made this menu jump above/away from its button.
  menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - 180))}px`;
  menu.style.top = `${rect.bottom + 4}px`;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("contextmenu", (event) => event.preventDefault());

  for (const sort of TEMPLATE_SORTS) {
    const option = document.createElement("button");
    option.type = "button";
    option.className = `workspace2-menu-item${sort === templatesState.sort ? " is-active" : ""}`;
    option.textContent = t(`templates.sort.${sort}`);
    option.addEventListener("click", () => {
      templatesState.sort = sort;
      localStorage.setItem(TEMPLATE_SORT_KEY, templatesState.sort);
      closeTemplateSortMenu();
      renderTemplatesPanel(el);
    });
    menu.append(option);
  }

  (panel || document.body).append(menu);
  templatesState.sortMenuElement = menu;
  templatesState.sortMenuCloseHandler = (event) => {
    if (event.type === "keydown" && event.key !== "Escape") {
      return;
    }
    if (menu.contains(event.target) || anchor.contains?.(event.target)) {
      return;
    }
    closeTemplateSortMenu();
  };
  setTimeout(() => {
    window.addEventListener("pointerdown", templatesState.sortMenuCloseHandler, true);
    document.addEventListener("pointerdown", templatesState.sortMenuCloseHandler, true);
    window.addEventListener("click", templatesState.sortMenuCloseHandler, true);
    document.addEventListener("click", templatesState.sortMenuCloseHandler, true);
    window.addEventListener("keydown", templatesState.sortMenuCloseHandler, true);
  }, 0);
}

function renderTemplatesPanel(el) {
  const finish = startPerformanceSpan("templates.render", {
    templateCount: templatesState.library?.templates?.length || 0,
  });
  const snapshot = scrollSnapshot(el);
  templatesState.renderTarget = el;
  setupNodeCanvasDrop();
  styles();
  setupWorkspaceKeyIsolation();
  closeTemplateContextMenu();
  closeTemplateSortMenu();
  prepareWorkspaceModuleMount(el);

  const panel = document.createElement("div");
  panel.className = "workspace2-panel";
  applyTemplateUiScale(panel);
  const top = document.createElement("div");
  top.className = "workspace2-top";
  const templates = templatesState.library?.templates || [];
  const header = createPanelHeader(
    t("templates.title"),
    t("templates.status", { count: templates.length }),
    { statusDataset: "workspace2TemplatesStatus" },
  );
  const newGroup = toolbarButton("folderPlus", t("templates.newGroup"), async () => {
    try {
      await createTemplateGroup(el);
    } catch (error) {
      templatesState.error = error.message;
      renderTemplatesPanel(el);
    }
  });
  const save = toolbarButton("template", t("templates.saveSelected"), async () => {
    try {
      await saveSelectedNodesAsTemplate(el);
    } catch (error) {
      templatesState.error = error.message;
      renderTemplatesPanel(el);
    }
  });
  const trash = toolbarButton(
    templatesState.showTrash ? "files" : "archiveTray",
    t(templatesState.showTrash ? "templates.showLibrary" : "templates.showTrash"),
    () => {
      templatesState.showTrash = !templatesState.showTrash;
      renderTemplatesPanel(el);
    },
  );
  trash.classList.add("is-trash-toggle");
  if (templatesState.showTrash) trash.classList.add("is-active");
  const toolbar = createSearchToolbar({
    focusKey: "templates-search",
    placeholder: t("templates.searchPlaceholder"),
    value: templatesState.query,
    buttons: [newGroup, save, templatesSortButton(el), trash],
    onInput: (value) => {
      templatesState.query = value;
      renderTemplatesPanel(el);
    },
  });
  top.append(header, toolbar);

  if (templatesState.showTrash) {
    const clearRow = createRootActionRow({
      className: "workspace2-empty-trash-row",
      title: t("templates.emptyTrash"),
      icon: "trash",
      text: t("templates.emptyTrash"),
      onClick: (event) => {
        if (event.target?.closest?.(".workspace2-inline-confirm")) return;
        workspace2InlineConfirm(event.currentTarget, {
          confirmText: t("confirm.emptyTrash"),
          onConfirm: async () => emptyTemplateTrash(el),
        });
      },
    });
    top.append(clearRow);
    const body = document.createElement("div");
    body.className = "workspace2-tree";
    renderTemplateTrashBody(el, body);
    panel.append(top, body);
    el.append(panel);
    restoreScrollSnapshot(el, snapshot);
    finish({ renderedTrashCount: templatesState.library?.trash?.length || 0 });
    return;
  }

  top.append(templatesRootRow(el));

  const body = document.createElement("div");
  body.className = "workspace2-tree";
  renderTemplatesBody(el, body);
  panel.append(top, body);
  el.append(panel);
  restoreScrollSnapshot(el, snapshot);
  finish();
}
function renderNodesBody(el, body) {
  if (!nodesState.library && !nodesState.loading) {
    loadNodeLibrary().then(() => renderNodesPanel(el));
  }

  if (nodesState.loading) {
    const loading = document.createElement("div");
    loading.className = "workspace2-empty";
    loading.textContent = t("nodes.loadingDefinitions");
    body.append(loading);
  } else if (nodesState.error) {
    const error = document.createElement("div");
    error.className = "workspace2-empty";
    error.textContent = t("status.error", { message: nodesState.error });
    body.append(error);
  } else if (nodesState.library) {
    if (nodesState.objectInfoLoading && !nodesState.objectInfo) {
      const loading = document.createElement("div");
      loading.className = "workspace2-empty";
      loading.textContent = t("nodes.updatingDefinitions");
      body.append(loading);
    }
    renderNSidebarMigration(el, body);
    renderNodeCategorySections(el, body);
  }
}

function refreshNodesResults(el) {
  const body = el?.querySelector?.(".workspace2-tree");
  if (!body) {
    renderNodesPanel(el);
    return;
  }
  hideNodePreview();
  closeNodeContextMenu();
  const query = nodesState.query.trim();
  const scrollTop = query ? 0 : body.scrollTop;
  body.replaceChildren();
  renderNodesBody(el, body);
  body.scrollTop = scrollTop;
}

function scheduleNodesResultsRefresh(el) {
  if (nodesState.resultsRefreshTimer) {
    clearTimeout(nodesState.resultsRefreshTimer);
  }
  nodesState.resultsRefreshTimer = window.setTimeout(() => {
    nodesState.resultsRefreshTimer = null;
    refreshNodesResults(el);
  }, NODE_SEARCH_RENDER_DELAY);
}

function renderNodesPanel(el) {
  const finish = startPerformanceSpan("nodes.render");
  const snapshot = scrollSnapshot(el);
  nodesState.renderTarget = el;
  setupNodeCanvasDrop();
  styles();
  setupWorkspaceKeyIsolation();
  hideNodePreview();
  closeNodeContextMenu();
  closeNodeSortMenu();
  closeOfficialFavoritesMenu();
  prepareWorkspaceModuleMount(el);

  const panel = document.createElement("div");
  panel.className = "workspace2-panel";
  applyNodeUiScale(panel);

  const top = document.createElement("div");
  top.className = "workspace2-top workspace2-node-top";

  const nodeTypes = getNodeDefinitions();
  const statusText = nodesState.pendingNode
    ? t("nodes.pendingPlace", { name: nodesState.pendingNode.title })
    : nodesState.loading
      ? t("status.loading")
      : nodesState.objectInfoLoading
        ? `${t("nodes.status", { count: nodeTypes.length })} · ${t("nodes.updatingDefinitions")}`
        : t("nodes.status", { count: nodeTypes.length });

  const newGroup = toolbarButton("folderPlus", t("nodes.newGroup"), async () => {
    try {
      await createNodeGroup(el);
    } catch (error) {
      nodesState.error = error.message;
      renderNodesPanel(el);
    }
  });

  const syncOfficial = toolbarButton("arrowsUpDown", t("nodes.officialFavoritesSyncMenu"), async (event) => {
    if (nodesState.officialFavoritesLoading) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (nodesState.officialFavoritesMenuElement) {
      closeOfficialFavoritesMenu();
      return;
    }
    openOfficialFavoritesMenu(el, event.currentTarget);
  });
  syncOfficial.disabled = nodesState.officialFavoritesLoading;
  syncOfficial.classList.add("workspace2-node-favorites-manager");

  const header = createPanelHeader(t("nodes.title"), statusText, { statusDataset: "workspace2NodesStatus" });
  const toolbar = createSearchToolbar({
    focusKey: "nodes-search",
    placeholder: t("nodes.searchPlaceholder"),
    value: nodesState.query,
    buttons: [newGroup, nodesPreviewModeButton(el), nodesSortButton(el), syncOfficial],
    onInput: (value) => {
      nodesState.query = value;
      scheduleNodesResultsRefresh(el);
    },
  });
  top.append(header, toolbar, nodesFavoriteRootRow(el), nodesViewTabs(el));

  const body = document.createElement("div");
  body.className = "workspace2-tree workspace2-node-tree";
  renderNodesBody(el, body);

  panel.append(top, body);
  el.append(panel);
  restoreScrollSnapshot(el, snapshot);
  finish({ nodeCount: nodeTypes.length });
}

function ensureNodePreviewPopover() {
  let preview = nodesState.previewPopover;
  if (preview?.isConnected) {
    return preview;
  }
  preview = document.createElement("div");
  preview.className = "workspace2-node-preview-popover";
  preview.hidden = true;
  document.body.append(preview);
  nodesState.previewPopover = preview;
  return preview;
}

function showNodePreview(node, event, options = {}) {
  if (!node || !event) {
    hideNodePreview();
    return;
  }
  nodesState.previewNode = node;
  const preview = ensureNodePreviewPopover();
  preview.innerHTML = "";
  preview.hidden = false;

  const body = document.createElement("div");
  body.className = "workspace2-node-preview-body";

  const definition = node.definition || {};
  const inputs = collectPreviewInputs(definition);
  const widgets = collectPreviewWidgets(definition);
  const outputs = collectPreviewOutputs(definition);
  appendNodePreviewCard(body, node, inputs, widgets, outputs);

  if (nodesState.previewMode !== "compact") {
    const details = document.createElement("div");
    details.className = "workspace2-node-preview-details";
    const title = document.createElement("div");
    title.className = "workspace2-node-preview-details-title";
    title.textContent = node.title || node.type;
    const meta = document.createElement("div");
    meta.className = "workspace2-node-preview-meta";
    meta.textContent = `${node.type} | ${node.category || t("nodes.uncategorized")}`;
    details.append(title, meta);

    if (node.description) {
      const desc = document.createElement("div");
      desc.className = "workspace2-node-preview-desc";
      desc.textContent = node.description;
      details.append(desc);
    }

    appendNodePreviewSection(details, t("nodes.previewInputs"), inputs, "input");
    appendNodePreviewSection(details, t("nodes.previewWidgets"), widgets, "widget");
    appendNodePreviewSection(details, t("nodes.previewOutputs"), outputs, "output");
    body.append(details);
  }
  preview.append(body);
  positionNodePreviewPopover(preview, event, options);
}

function templateNodePreviewModel(templateNode) {
  const type = String(templateNode?.type || "");
  const definition = getNodeDefinitionMap().get(type);
  const rawDefinition = definition?.definition || {};
  const node = {
    type,
    title: templateNode?.title || definition?.title || type,
    category: definition?.category || "",
    definition: rawDefinition,
  };
  const storedInputs = Array.isArray(templateNode?.inputs)
    ? templateNode.inputs
      .map((input) => ({
        name: String(input?.name || ""),
        type: String(input?.type || ""),
        optional: false,
      }))
      .filter((input) => input.name || input.type)
    : [];
  const storedOutputs = Array.isArray(templateNode?.outputs)
    ? templateNode.outputs
      .map((output) => ({
        name: String(output?.name || output?.type || ""),
        type: String(output?.type || output?.name || ""),
      }))
      .filter((output) => output.name || output.type)
    : [];
  const definitionInputs = rawDefinition ? collectPreviewInputs(rawDefinition) : [];
  const definitionWidgets = rawDefinition ? collectPreviewWidgets(rawDefinition) : [];
  const widgetValues = Array.isArray(templateNode?.widgets_values) ? templateNode.widgets_values : [];
  const widgets = definitionWidgets.map((widget, index) => ({
    ...widget,
    value: widgetValues[index] ?? widget.value,
  }));
  if (!widgets.length && widgetValues.length) {
    for (let index = 0; index < Math.min(widgetValues.length, 8); index += 1) {
      widgets.push({
        name: `#${index + 1}`,
        type: "",
        value: widgetValues[index],
        optional: false,
      });
    }
  }
  return {
    node,
    inputs: storedInputs.length ? storedInputs : definitionInputs,
    widgets,
    outputs: storedOutputs.length ? storedOutputs : (rawDefinition ? collectPreviewOutputs(rawDefinition) : []),
  };
}

function showTemplatePreview(template, event, options = {}) {
  if (!template || !event) {
    hideNodePreview();
    return;
  }
  const preview = ensureNodePreviewPopover();
  preview.innerHTML = "";
  preview.hidden = false;
  nodesState.previewNode = null;

  const body = document.createElement("div");
  body.className = "workspace2-node-preview-body";
  body.append(renderTemplateMinimap(template));

  const details = document.createElement("div");
  details.className = "workspace2-node-preview-details";
  const title = document.createElement("div");
  title.className = "workspace2-node-preview-details-title";
  title.textContent = template.name || t("templates.defaultName");
  const meta = document.createElement("div");
  meta.className = "workspace2-node-preview-meta";
  meta.textContent = t("templates.meta", {
    nodes: template.nodes?.length || 0,
    links: template.links?.length || 0,
  });
  details.append(title, meta);
  body.append(details);

  preview.append(body);
  positionNodePreviewPopover(preview, event, options);
}

function moveNodePreview(event) {
  const preview = nodesState.previewPopover;
  if (!preview?.isConnected || preview.hidden) {
    return;
  }
  positionNodePreviewPopover(preview, event);
}

function hideNodePreview() {
  nodesState.previewNode = null;
  if (nodesState.previewPopover?.isConnected) {
    nodesState.previewPopover.hidden = true;
  }
}

function closeNodeContextMenu() {
  nodesState.contextMenuElement?.remove();
  nodesState.contextMenuElement = null;
}

function closeNodeContextMenuFromEvent(event) {
  if (nodesState.contextMenuElement?.contains?.(event.target)) {
    return;
  }
  closeNodeContextMenu();
}

function nodesPreviewModeButton(el) {
  const detailed = nodesState.previewMode !== "compact";
  const title = t(detailed ? "nodes.previewModeDetailed" : "nodes.previewModeCompact");
  const button = toolbarButton(detailed ? "previewDetailed" : "previewCompact", title, () => {
    nodesState.previewMode = detailed ? "compact" : "detailed";
    localStorage.setItem(NODE_PREVIEW_MODE_KEY, nodesState.previewMode);
    hideNodePreview();
    renderNodesPanel(el);
  });
  button.classList.add("workspace2-node-preview-mode-button");
  return button;
}

function openNodeGroupContextMenu(el, event, group) {
  event.preventDefault();
  event.stopPropagation();
  closeNodeContextMenu();
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  menu.addEventListener("pointerdown", (menuEvent) => menuEvent.stopPropagation());
  menu.addEventListener("click", (menuEvent) => menuEvent.stopPropagation());
  menu.addEventListener("contextmenu", (menuEvent) => menuEvent.preventDefault());

  const addItem = (label, handler) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workspace2-menu-item";
    button.textContent = label;
    button.addEventListener("click", async (clickEvent) => {
      clickEvent.stopPropagation();
      closeNodeContextMenu();
      await handler();
    });
    menu.append(button);
  };

  addItem(t("menu.newSubfolder"), async () => createNodeGroup(el, group.id));
  addItem(t("nodes.renameGroup"), async () => renameNodeGroup(el, group));
  addItem(t("folder.personalize"), async () => personalizeNodeGroup(el, group, event));
  addItem(t("folder.resetStyle"), async () => resetNodeGroupStyle(el, group));
  addItem(t("nodes.deleteGroup"), () => requestDeleteNodeGroup(el, group));

  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  const left = Math.min(event.clientX, window.innerWidth - rect.width - 8);
  const top = Math.min(event.clientY, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
  nodesState.contextMenuElement = menu;
  window.setTimeout(() => {
    document.addEventListener("pointerdown", closeNodeContextMenuFromEvent, { once: true, capture: true });
    document.addEventListener("keydown", closeNodeContextMenuFromEvent, { once: true, capture: true });
  }, 0);
}

function openNodeContextMenu(el, event, node, options = {}) {
  event.preventDefault();
  event.stopPropagation();
  closeNodeContextMenu();
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  menu.addEventListener("pointerdown", (menuEvent) => menuEvent.stopPropagation());
  menu.addEventListener("click", (menuEvent) => menuEvent.stopPropagation());
  menu.addEventListener("contextmenu", (menuEvent) => menuEvent.preventDefault());

  const addItem = (label, handler) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workspace2-menu-item";
    button.textContent = label;
    button.addEventListener("click", async (clickEvent) => {
      clickEvent.stopPropagation();
      closeNodeContextMenu();
      await handler();
    });
    menu.append(button);
  };

  const favorite = getFavorite(node.type);
  if (options.favorite) {
    addItem(t("nodes.editAlias"), async () => editFavoriteAlias(el, options.favorite));
    addItem(t("nodes.removeFavorite"), async () => removeFavoriteNode(el, options.favorite.type));
  } else if (favorite) {
    addItem(t("nodes.removeFavorite"), async () => removeFavoriteNode(el, node.type));
  } else {
    addItem(t("nodes.addFavorite"), async () => addFavoriteNode(el, node));
  }
  addItem(t("nodes.placeOnCanvas"), async () => setPendingNode(node));
  addItem(t("nodes.copyNodeName"), async () => copyText(node.title || node.type));

  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  const left = Math.min(event.clientX, window.innerWidth - rect.width - 8);
  const top = Math.min(event.clientY, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
  nodesState.contextMenuElement = menu;
  window.setTimeout(() => {
    document.addEventListener("pointerdown", closeNodeContextMenuFromEvent, { once: true, capture: true });
    document.addEventListener("keydown", closeNodeContextMenuFromEvent, { once: true, capture: true });
  }, 0);
}

function appendNodePreviewCard(preview, node, inputs, widgets, outputs) {
  const card = document.createElement("div");
  card.className = "workspace2-node-preview-card";

  const header = document.createElement("div");
  header.className = "workspace2-node-preview-card-header";

  const heading = document.createElement("div");
  heading.className = "workspace2-node-preview-card-heading";
  const chevron = document.createElement("div");
  chevron.className = "workspace2-node-preview-card-chevron";
  const titleText = document.createElement("div");
  titleText.className = "workspace2-node-preview-card-name";
  titleText.textContent = node.title || node.type;
  heading.append(chevron, titleText);
  header.append(heading);

  const primaryOutput = outputs[0];
  if (primaryOutput) {
    const output = document.createElement("div");
    output.className = "workspace2-node-preview-card-output";
    const outputName = document.createElement("div");
    outputName.className = "workspace2-node-preview-card-output-name";
    outputName.textContent = primaryOutput.name || primaryOutput.type;
    const outputPort = document.createElement("div");
    outputPort.className = "workspace2-node-preview-port is-output";
    outputPort.style.setProperty("--workspace2-preview-port", previewPortColor(primaryOutput.type));
    output.append(outputName, outputPort);
    header.append(output);
  }

  const body = document.createElement("div");
  body.className = "workspace2-node-preview-card-body";
  const miniRows = buildNodePreviewMiniRows(inputs, widgets);
  for (const item of miniRows) {
    const row = document.createElement("div");
    row.className = `workspace2-node-preview-mini-row is-${item.kind}`;
    const port = document.createElement("div");
    port.className = "workspace2-node-preview-mini-port";
    port.style.setProperty("--workspace2-preview-port", previewPortColor(item.type));
    const name = document.createElement("div");
    name.className = "workspace2-node-preview-mini-label";
    name.textContent = item.optional ? `${item.name}?` : item.name;
    const control = document.createElement("div");
    control.className = previewMiniControlClass(item);
    control.textContent = previewMiniControlText(item);
    control.title = previewValue(item.value) || item.type || "";
    row.append(port, name, control);
    body.append(row);
  }
  if (!miniRows.length) {
    const empty = document.createElement("div");
    empty.className = "workspace2-node-preview-mini-empty";
    empty.textContent = node.category || node.type || "";
    body.append(empty);
  }

  card.append(header, body);
  preview.append(card);
}

function buildNodePreviewMiniRows(inputs, widgets) {
  const rows = [];
  const seen = new Set();
  for (const value of inputs) {
    const name = String(value?.name || "").trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    rows.push({ ...value, kind: "port" });
  }
  for (const value of widgets) {
    const name = String(value?.name || "").trim();
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    rows.push({ ...value, kind: "widget" });
    if (rows.length >= 12) {
      break;
    }
  }
  return rows.slice(0, 12);
}

function previewMiniControlClass(item) {
  const type = String(item?.type || "").toUpperCase();
  const classes = ["workspace2-node-preview-mini-widget"];
  if (item?.kind === "port") {
    classes.push("is-empty");
  } else if (type === "COMBO") {
    classes.push("is-combo");
  } else if (type === "BOOLEAN") {
    classes.push("is-boolean");
  } else if (type === "INT" || type === "FLOAT") {
    classes.push("is-number");
  }
  return classes.join(" ");
}

function previewMiniControlText(item) {
  if (item?.kind === "port") {
    return "";
  }
  const value = previewValue(item?.value);
  if (value) {
    return value;
  }
  return String(item?.type || "");
}

function previewPortColor(type) {
  const normalized = String(type || "").toUpperCase();
  const colors = {
    IMAGE: "#64b5f6",
    VAE: "#ff6e6e",
    LATENT: "#ff9cf9",
    MASK: "#81c784",
    CONDITIONING: "#ffa931",
    CLIP: "#ffd500",
    MODEL: "#b39ddb",
    CONTROL_NET: "#a5d6a7",
    COMBO: "#8ab4f8",
    STRING: "#8fd7a3",
    INT: "#f7c56b",
    FLOAT: "#f7c56b",
    BOOLEAN: "#f48fb1",
  };
  return colors[normalized] || "#8b8b8b";
}

function previewValue(value) {
  if (value === undefined || value === null || value === "") {
    return "";
  }
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > 34 ? `${text.slice(0, 31)}...` : text;
}

function appendNodePreviewSection(preview, label, values, kind) {
  if (!values.length) {
    return;
  }
  const section = document.createElement("div");
  section.className = "workspace2-node-preview-section";
  const title = document.createElement("div");
  title.className = "workspace2-node-preview-section-title";
  title.textContent = label;
  section.append(title);
  for (const value of values.slice(0, 24)) {
    const row = document.createElement("div");
    row.className = "workspace2-node-preview-row";
    const name = document.createElement("div");
    name.className = "workspace2-node-preview-name";
    name.textContent = value.optional ? `${value.name}?` : value.name;
    const type = document.createElement("div");
    type.className = "workspace2-node-preview-type";
    const defaultText = kind === "widget" ? previewValue(value.value) : "";
    type.textContent = defaultText ? `${value.type} = ${defaultText}` : value.type;
    row.append(name, type);
    section.append(row);
  }
  preview.append(section);
}

function renderNSidebarMigration(el, body) {
  if (!nodesState.nSidebarPreview && !nodesState.nSidebarLoading) {
    loadNSidebarPreview().then(() => {
      if (nodesState.renderTarget) {
        renderNodesPanel(nodesState.renderTarget);
      }
    });
    return;
  }
  if (nodesState.nSidebarLoading || !nodesState.nSidebarPreview?.found) {
    return;
  }
  if (nodesState.library.migration?.nSidebarImported) {
    return;
  }

  const preview = nodesState.nSidebarPreview;
  const section = document.createElement("div");
  section.className = "workspace2-root-row";
  section.title = preview.sourcePath || "";

  const info = document.createElement("div");
  info.className = "workspace2-root-target";
  info.append(iconSvg("restore"));
  const text = document.createElement("div");
  text.className = "workspace2-name";
  text.textContent = t("nodes.importNSidebarSummary", {
    groups: preview.summary.groupCount || 0,
    nodes: preview.summary.nodeCount || 0,
  });
  info.append(text);

  const button = iconButton("restore", t("nodes.importNSidebar"), async () => {
    await importNSidebarPreview(el);
  });

  section.append(info, button);
  body.append(section);
}

function renderFavoriteNodeSections(el, body) {
  const sectionId = "__bookmarked__";
  const nodeMap = getNodeDefinitionMap();
  const query = nodesState.query.trim().toLowerCase();
  const allFavorites = nodesState.library.favorites || [];
  const groupNameById = new Map((nodesState.library.groups || []).map((group) => [group.id, group.name]));
  const allFavoriteMatches = allFavorites
    .map((favorite) => ({
      favorite: favoriteDisplayNode(favorite, nodeMap),
      groupName: groupNameById.get(favorite.groupId) || "",
    }))
    .filter(({ favorite, groupName }) => nodeMatchesQuery(favorite, query, groupName))
    .sort((a, b) => query
      ? compareNodeSearchResults(a.favorite, b.favorite, query, "")
      : a.favorite.order - b.favorite.order);
  const favoriteMatches = query ? allFavoriteMatches.slice(0, NODE_SEARCH_RESULT_LIMIT) : allFavoriteMatches;

  if (query && !allFavoriteMatches.length) {
    return;
  }

  const rootFavorites = allFavorites
    .filter((favorite) => !favorite.groupId || favorite.groupId === NODE_DEFAULT_GROUP_ID)
    .map((favorite) => favoriteDisplayNode(favorite, nodeMap))
    .filter((favorite) => nodeMatchesQuery(favorite, query, ""))
    .sort((a, b) => query ? compareNodeSearchResults(a, b, query, "") : a.order - b.order);
  const userGroups = [...nodesState.library.groups]
    .filter((group) => group.id !== NODE_DEFAULT_GROUP_ID && !group.parentId)
    .sort((a, b) => a.order - b.order);

  const section = document.createElement("div");
  section.className = "workspace2-node-section";

  const sectionExpanded = renderTopSectionHeader(el, section, sectionId, t("nodes.categoryBookmarked"), query ? `${favoriteMatches.length}/${allFavoriteMatches.length}` : String(nodesState.library.favorites.length));
  body.append(section);

  if (!sectionExpanded && !query) {
    return;
  }

  if (query) {
    const list = document.createElement("div");
    list.className = "workspace2-node-list";
    list.dataset.workspace2FavoriteRegion = NODE_DEFAULT_GROUP_ID;
    for (const { favorite } of favoriteMatches) {
      list.append(renderFavoriteNodeRow(el, favorite));
    }
    section.append(list);
    return;
  }

  const rootList = document.createElement("div");
  rootList.className = "workspace2-node-list";
  rootList.dataset.workspace2FavoriteRegion = NODE_DEFAULT_GROUP_ID;
  for (const favorite of rootFavorites) {
    rootList.append(renderFavoriteNodeRow(el, favorite));
  }
  section.append(rootList);

  for (const group of userGroups) {
    renderFavoriteGroupFolder(el, section, group, nodeMap, query, 0);
  }

  if (query && !rootFavorites.length && !userGroups.length) {
    const empty = document.createElement("div");
    empty.className = "workspace2-empty";
    empty.textContent = t("nodes.noFavoriteMatches");
    section.append(empty);
  }
}

function toggleNodeGroup(el, groupId) {
  if (nodesState.expanded.has(groupId)) {
    nodesState.expanded.delete(groupId);
  } else {
    nodesState.expanded.add(groupId);
  }
  renderNodesPanel(el);
}

function officialTreeFolderKeys(folder) {
  const keys = [];
  if (!folder || folder.type !== "folder") {
    return keys;
  }
  keys.push(folder.key);
  for (const child of folder.children || []) {
    keys.push(...officialTreeFolderKeys(child));
  }
  return keys;
}

function toggleOfficialTreeFolder(el, folder, recursive = false) {
  const isOpen = nodesState.expanded.has(folder.key);
  if (recursive) {
    setExpandedRecursive(nodesState.expanded, officialTreeFolderKeys(folder), !isOpen);
  } else if (isOpen) {
    nodesState.expanded.delete(folder.key);
  } else {
    nodesState.expanded.add(folder.key);
  }
  renderNodesPanel(el);
}

function toggleFavoriteGroup(el, groupId, recursive = false) {
  const isOpen = nodesState.expanded.has(groupId);
  if (recursive) {
    // Ctrl/Cmd-click collapses (or expands) sibling groups at this level only;
    // descendants keep their own expanded state.
    const group = (nodesState.library.groups || []).find((item) => item.id === groupId);
    const siblingKeys = childNodeGroups(group?.parentId || "").map((item) => item.id);
    setExpandedRecursive(nodesState.expanded, siblingKeys, !isOpen);
  } else if (isOpen) {
    nodesState.expanded.delete(groupId);
  } else {
    nodesState.expanded.add(groupId);
  }
  renderNodesPanel(el);
}

function childNodeGroups(parentId) {
  return [...(nodesState.library.groups || [])]
    .filter((group) => group.id !== NODE_DEFAULT_GROUP_ID && group.parentId === parentId)
    .sort((a, b) => a.order - b.order);
}

function favoriteGroupHasQueryMatches(group, nodeMap, query) {
  const hasDirectMatch = nodesState.library.favorites
    .filter((favorite) => favorite.groupId === group.id)
    .map((favorite) => favoriteDisplayNode(favorite, nodeMap))
    .some((favorite) => nodeMatchesQuery(favorite, query, group.name));
  if (hasDirectMatch) {
    return true;
  }
  return childNodeGroups(group.id).some((childGroup) => favoriteGroupHasQueryMatches(childGroup, nodeMap, query));
}

function renderFavoriteGroupFolder(el, section, group, nodeMap, query, depth = 0) {
  const groupFavorites = nodesState.library.favorites
    .filter((favorite) => favorite.groupId === group.id)
    .map((favorite) => favoriteDisplayNode(favorite, nodeMap))
    .filter((favorite) => nodeMatchesQuery(favorite, query, group.name))
    .sort((a, b) => query ? compareNodeSearchResults(a, b, query, group.name) : a.order - b.order);
  const childGroups = childNodeGroups(group.id)
    .filter((childGroup) => !query || favoriteGroupHasQueryMatches(childGroup, nodeMap, query));
  if (query && !groupFavorites.length && !childGroups.length) {
    return;
  }
  const groupOpen = nodesState.expanded.has(group.id) || Boolean(query);

  const header = document.createElement("div");
  header.className = "workspace2-node-folder-header";
  header.style.setProperty("--indent", `${depth * 16 + 4}px`);
  header.dataset.workspace2FavoriteRegion = group.id;
  header.dataset.workspace2GroupId = group.id;
  makeFavoriteGroupDropTarget(el, header, group.id);
  makeNodeGroupDragSource(el, header, group);
  header.addEventListener("click", (event) => {
    if (event.target.closest("button,input")) {
      return;
    }
    if (nodesState.suppressClick) {
      nodesState.suppressClick = false;
      return;
    }
    event.stopPropagation();
    toggleFavoriteGroup(el, group.id, event.ctrlKey || event.metaKey);
  });
  header.addEventListener("contextmenu", (event) => openNodeGroupContextMenu(el, event, group));

  const disclosure = document.createElement("button");
  disclosure.className = `workspace2-disclosure ${groupOpen ? "is-open" : ""}`;
  disclosure.type = "button";
  disclosure.title = groupOpen ? t("folder.collapse") : t("folder.expand");
  disclosure.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleFavoriteGroup(el, group.id, event.ctrlKey || event.metaKey);
  });

  const icon = document.createElement("span");
  applyDecoratedIcon(icon, group.icon, group.color, groupOpen ? DEFAULT_FOLDER_OPEN_ICON_CLASS : DEFAULT_FOLDER_ICON_CLASS);
  const name = document.createElement("div");
  name.className = "workspace2-name";
  if (nodesState.editingGroupId === group.id) {
    const input = document.createElement("input");
    input.className = "workspace2-rename-input";
    input.value = group.name;
    isolateComfyKeys(input);
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        try {
          await commitNodeGroupRename(el, group, input.value);
        } catch (error) {
          handleError(el, error);
        }
      }
      if (event.key === "Escape") {
        nodesState.editingGroupId = "";
        renderNodesPanel(el);
      }
    });
    input.addEventListener("blur", async () => {
      try {
        await commitNodeGroupRename(el, group, input.value);
      } catch (error) {
        handleError(el, error);
      }
    });
    name.append(input);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  } else {
    name.textContent = group.name;
  }
  const actions = document.createElement("div");
  actions.className = "workspace2-actions";
  actions.append(
    iconButton("folderPlus", t("menu.newSubfolder"), async () => {
      await createNodeGroup(el, group.id);
    }),
    iconButton("edit", t("nodes.renameGroup"), async () => {
      await renameNodeGroup(el, group);
    }),
    dangerIconButton("trash", t("nodes.deleteGroupTitle"), (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestDeleteNodeGroup(el, group, event.currentTarget);
    }),
  );
  header.append(disclosure, icon, name, actions);
  section.append(header);

  if (groupOpen) {
    for (const childGroup of childGroups) {
      renderFavoriteGroupFolder(el, section, childGroup, nodeMap, query, depth + 1);
    }
    const list = document.createElement("div");
    list.className = "workspace2-node-list";
    list.style.setProperty("--indent", `${(depth + 1) * 16 + 4}px`);
    list.dataset.workspace2FavoriteRegion = group.id;
    for (const favorite of groupFavorites) {
      list.append(renderFavoriteNodeRow(el, favorite));
    }
    section.append(list);
  }
}
function renderFavoriteNodeRow(el, favorite) {
  const row = document.createElement("div");
  row.className = `workspace2-node-row ${favorite.invalid ? "is-invalid" : ""}`;
  row.dataset.workspace2NodeType = favorite.type;
  row.dataset.workspace2FavoriteRegion = favorite.groupId || NODE_DEFAULT_GROUP_ID;
  if (nodesState.pendingNode?.type === favorite.type) {
    row.classList.add("is-selected");
  }
  row.title = favorite.type;
  makeFavoriteDragSource(row, favorite);
  makeFavoriteGroupDropTarget(el, row, favorite.groupId, favorite.type);
  if (!favorite.invalid) {
    makeNodeCanvasDragSource(row, favorite);
    row.addEventListener("mouseenter", (event) => showNodePreview(favorite, event));
    row.addEventListener("mousemove", moveNodePreview);
    row.addEventListener("mouseleave", hideNodePreview);
    row.addEventListener("contextmenu", (event) => {
      showNodePreview(favorite, event);
      openNodeContextMenu(el, event, favorite, { favorite });
    });
    row.addEventListener("click", (event) => {
      if (nodesState.suppressClick) {
        nodesState.suppressClick = false;
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.target.closest("button,input")) {
        return;
      }
      event.stopPropagation();
      showNodePreview(favorite, event);
      setPendingNode(nodesState.pendingNode?.type === favorite.type ? null : favorite);
    });
  }

  const reorderHandle = document.createElement("span");
  if (nodesState.customOrderEnabled) {
    reorderHandle.className = "workspace2-reorder-handle";
    reorderHandle.title = t("nodes.reorderHandle");
    beginNodeReorderDrag(el, reorderHandle, row, {
      kind: "favorite",
      type: favorite.type,
      title: favorite.title,
      groupId: favorite.groupId || NODE_DEFAULT_GROUP_ID,
    });
  } else {
    reorderHandle.className = "workspace2-reorder-spacer";
  }

  const dot = document.createElement("span");
  dot.className = "workspace2-node-dot";

  const info = document.createElement("div");
  info.className = "workspace2-name";
  const name = document.createElement("div");
  name.className = "workspace2-name";
  name.textContent = favorite.title;
  info.append(name);

  const actions = document.createElement("div");
  actions.className = "workspace2-actions";
  actions.append(
    iconButton("edit", t("nodes.editAlias"), async () => {
      await editFavoriteAlias(el, favorite);
    }),
  );
  const favoriteButton = iconButton("starFilled", t("nodes.removeFavorite"), async () => {
    await removeFavoriteNode(el, favorite.type);
  });
  favoriteButton.classList.add("is-favorite-active");
  actions.append(favoriteButton);

  row.append(reorderHandle, dot, info, actions);
  return row;
}

function renderEssentialsNodeSection(el, body, nodes, favoriteTypes) {
  const query = nodesState.query.trim().toLowerCase();
  const sectionId = "__essentials__";
  const groups = new Map();
  for (const node of nodes) {
    const category = resolveEssentialsCategory(node);
    if (!category) {
      continue;
    }
    if (!groups.has(category)) {
      groups.set(category, []);
    }
    groups.get(category).push(node);
  }
  const essentialsTotal = [...groups.values()].reduce((sum, items) => sum + items.length, 0);
  if (!essentialsTotal && !query) {
    return;
  }

  const section = document.createElement("div");
  section.className = "workspace2-node-section";
  const sectionExpanded = renderTopSectionHeader(el, section, sectionId, t("nodes.categoryEssentials"), String(essentialsTotal));
  body.append(section);

  if (!sectionExpanded && !query) {
    return;
  }

  for (const category of ESSENTIALS_CATEGORY_ORDER) {
    const rankMap = ESSENTIALS_NODE_RANK.get(category);
    const categoryNodes = (groups.get(category) || []).sort((a, b) => {
      const diff = (rankMap?.get(a.type) ?? Number.MAX_SAFE_INTEGER) - (rankMap?.get(b.type) ?? Number.MAX_SAFE_INTEGER);
      return diff || a.title.localeCompare(b.title);
    });
    if (!categoryNodes.length) {
      continue;
    }

    const groupId = `${sectionId}:${category}`;
    const groupOpen = nodesState.expanded.has(groupId) || Boolean(query);
    const categoryHeader = document.createElement("div");
    categoryHeader.className = "workspace2-node-folder-header";
    categoryHeader.addEventListener("click", (event) => {
      if (event.target.closest("button,input")) {
        return;
      }
      event.stopPropagation();
      if (nodesState.expanded.has(groupId)) {
        nodesState.expanded.delete(groupId);
      } else {
        nodesState.expanded.add(groupId);
      }
      renderNodesPanel(el);
    });
    const disclosure = document.createElement("button");
    disclosure.className = `workspace2-disclosure ${groupOpen ? "is-open" : ""}`;
    disclosure.type = "button";
    disclosure.title = groupOpen ? t("folder.collapse") : t("folder.expand");
    disclosure.addEventListener("click", (event) => {
      event.stopPropagation();
      if (nodesState.expanded.has(groupId)) {
        nodesState.expanded.delete(groupId);
      } else {
        nodesState.expanded.add(groupId);
      }
      renderNodesPanel(el);
    });
    const name = document.createElement("div");
    name.className = "workspace2-name";
    name.textContent = essentialsCategoryLabel(category);
    const meta = document.createElement("div");
    meta.className = "workspace2-meta";
    meta.textContent = String(categoryNodes.length);
    categoryHeader.append(disclosure, name, meta);
    section.append(categoryHeader);

    if (groupOpen) {
      const list = document.createElement("div");
      list.className = "workspace2-node-list";
      for (const node of categoryNodes) {
        list.append(renderNodeRow(el, node, favoriteTypes.has(node.type)));
      }
      section.append(list);
    }
  }
}

function renderNodeCategorySections(el, body) {
  const {
    favoriteTypes,
    comfyNodes,
    extensionNodes,
    unknownNodes,
    visibleTotal,
    visibleSections,
  } = projectNodeCategories({
    allNodes: getNodeDefinitions(),
    query: nodesState.query,
    favorites: nodesState.library.favorites,
    visibleSections: nodesState.visibleSections,
  });

  if (visibleSections.bookmarked) {
    renderFavoriteNodeSections(el, body);
  }
  if (visibleSections.comfy) {
    renderNodeTopSection(el, body, "__comfy__", t("nodes.categoryComfy"), comfyNodes, visibleTotal, favoriteTypes);
  }
  if (visibleSections.extensions) {
    renderNodeTopSection(el, body, "__extensions__", t("nodes.categoryExtensions"), extensionNodes, visibleTotal, favoriteTypes);
  }
  if (unknownNodes.length) {
    renderNodeTopSection(el, body, "__unknown__", t("nodes.categoryUnknown"), unknownNodes, visibleTotal, favoriteTypes);
  }
}

function showFallbackPanel() {
  if (document.getElementById("workspace2-fallback")) {
    return;
  }

  const host = document.createElement("div");
  host.id = "workspace2-fallback";
  host.style.position = "fixed";
  host.style.right = "12px";
  host.style.bottom = "12px";
  host.style.zIndex = "10000";
  host.style.width = "430px";
  host.style.height = "70vh";
  host.style.border = "1px solid #555";
  host.style.boxShadow = "0 8px 24px rgba(0,0,0,.35)";
  document.body.append(host);
  renderWorkspace2Panel(host);
}

function registerWorkspace2SidebarTab() {
  if (!app.extensionManager?.registerSidebarTab) {
    return false;
  }

  const registry = globalThis.__workspace2RegisteredSidebarTabs ||= new Set();
  if (registry.has(WORKSPACE2_TAB_ID)) {
    console.debug("[Workspace2] Sidebar tab already registered; skipping duplicate registration.");
    return true;
  }

  // `setup()` registers before locale loading as an availability boundary.
  // Both bundled locales use WorkspaceKit as the tab title, so this stable
  // fallback avoids a translation-key label during an early registration.
  const title = state.localeReady ? t("workspace.title") : "WorkspaceKit";
  const tooltip = state.localeReady ? t("workspace.tooltip") : "WorkspaceKit";
  app.extensionManager.registerSidebarTab({
    id: WORKSPACE2_TAB_ID,
    icon: "pi pi-sitemap",
    title,
    tooltip,
    type: "custom",
    render: renderWorkspace2Panel,
  });
  registry.add(WORKSPACE2_TAB_ID);
  installWorkspace2SidebarEmojiIcon();
  return true;
}

function installWorkspace2SidebarEmojiIcon() {
  const styleId = "workspace2-sidebar-emoji-icon-style";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    // SidebarTabExtension.icon accepts an icon-class string, not arbitrary
    // text. Render the agreed emoji in Workspace2's own button only instead
    // of passing an invalid class to ComfyUI's shared sidebar component.
    style.textContent = `
      .workspace2-tab-button .sidebar-icon-wrapper > .side-bar-button-icon {
        display: none !important;
      }
      .workspace2-tab-button .sidebar-icon-wrapper::before {
        content: "🧩";
        display: block;
        font-size: 16px;
        line-height: 1;
      }
    `;
    document.head.append(style);
  }

  let attempts = 0;
  const markButton = () => {
    const button = findWorkspace2SidebarTabElement(WORKSPACE2_TAB_ID);
    if (button) {
      button.classList.add("workspace2-tab-button");
      return;
    }
    attempts += 1;
    if (attempts < 12) {
      window.setTimeout(markButton, 80);
    }
  };
  markButton();
}

function officialSidebarTabIds() {
  const getSidebarTabs = app.extensionManager?.getSidebarTabs;
  // An unavailable store API is not evidence that the tab was removed.  The
  // official registerSidebarTab API appends records, so treating this as an
  // empty list would create duplicate sidebar entries on a transient remount.
  if (typeof getSidebarTabs !== "function") return null;
  const tabs = getSidebarTabs.call(app.extensionManager);
  const list = Array.isArray(tabs) ? tabs : Array.isArray(tabs?.value) ? tabs.value : [];
  return new Set(list.map((tab) => tab?.id).filter(Boolean));
}

function recoverWorkspace2SidebarAfterRemount() {
  const registeredIds = officialSidebarTabIds();
  // When the official store still owns the tab, Vue will recreate its DOM.
  // Only reapply our emoji class; calling registerSidebarTab here would create
  // duplicate entries because the official API intentionally appends tabs.
  if (registeredIds === null || registeredIds.has(WORKSPACE2_TAB_ID)) {
    installWorkspace2SidebarEmojiIcon();
    return registeredIds === null ? "state-unavailable" : "already-registered";
  }
  const registry = globalThis.__workspace2RegisteredSidebarTabs ||= new Set();
  registry.delete(WORKSPACE2_TAB_ID);
  return registerWorkspace2SidebarTab() ? "re-registered" : "unavailable";
}

function setupWorkspace2SidebarRemountRecovery() {
  if (setupWorkspace2SidebarRemountRecovery.ready || !document.body) return;
  setupWorkspace2SidebarRemountRecovery.ready = true;
  let scheduled = false;
  const scheduleRecovery = () => {
    if (scheduled) return;
    scheduled = true;
    window.setTimeout(() => {
      scheduled = false;
      recoverWorkspace2SidebarAfterRemount();
    }, 0);
  };
  const mentionsWorkspaceKit = (node) => {
    if (!(node instanceof Element)) return false;
    const text = node.textContent || "";
    return text.includes("WorkspaceKit")
      || Boolean(node.matches?.(`[data-tab-id="${WORKSPACE2_TAB_ID}"], [data-sidebar-tab-id="${WORKSPACE2_TAB_ID}"]`))
      || Boolean(node.querySelector?.(`[data-tab-id="${WORKSPACE2_TAB_ID}"], [data-sidebar-tab-id="${WORKSPACE2_TAB_ID}"]`));
  };
  new MutationObserver((records) => {
    if (records.some((record) => [...record.addedNodes, ...record.removedNodes].some(mentionsWorkspaceKit))) {
      scheduleRecovery();
    }
  }).observe(document.body, { childList: true, subtree: true });
}

function setupWorkspace2ContextMenuOrdering() {
  if (setupWorkspace2ContextMenuOrdering.ready) {
    return;
  }
  setupWorkspace2ContextMenuOrdering.ready = true;

  const moveWorkspace2ItemsToTop = () => {
    for (const menu of document.querySelectorAll(".litecontextmenu")) {
      const entries = [...menu.querySelectorAll(":scope > .litemenu-entry")];
      // Always derive the order from the registered menu labels.  Repeated
      // insertBefore(entry, sameAnchor) reverses siblings and was responsible
      // for the visible "Save as template" one-row jump after the menu opened.
      const workspace2Entries = [...WORKSPACE2_MENU_LABELS]
        .map((label) => entries.find((entry) => entry.textContent?.trim() === label))
        .filter(Boolean);
      if (!workspace2Entries.length) {
        continue;
      }
      const isAlreadyFirst = workspace2Entries.every((entry, index) => entries[index] === entry);
      if (isAlreadyFirst) {
        continue;
      }
      // The official API appends extension items. Move only Workspace2's two
      // entries, preserving their internal order and leaving other extensions
      // untouched.
      const fragment = document.createDocumentFragment();
      workspace2Entries.forEach((entry) => fragment.append(entry));
      menu.insertBefore(fragment, entries.find((entry) => !workspace2Entries.includes(entry)) || null);
    }
  };

  // LiteGraph creates menu entries after the native contextmenu event. A
  // MutationObserver runs before the next paint, unlike the former timeout
  // passes, so the user never sees an initial row followed by a rearrangement.
  let queued = false;
  const queueOrdering = () => {
    if (queued) {
      return;
    }
    queued = true;
    queueMicrotask(() => {
      queued = false;
      moveWorkspace2ItemsToTop();
    });
  };
  new MutationObserver((records) => {
    if (records.some((record) => [...record.addedNodes].some((node) => (
      node instanceof Element
      && (node.matches?.(".litecontextmenu") || node.querySelector?.(".litecontextmenu"))
    )))) {
      queueOrdering();
    }
  }).observe(document.body, { childList: true, subtree: true });
  document.addEventListener("contextmenu", queueOrdering, true);
}

app.registerExtension({
  name: EXTENSION_NAME,
  commands: [
    {
      id: "Workspace2.CanvasGroups.CreateGroup",
      label: "WorkspaceKit: Create canvas group",
      function: () => {
        workspace2CanvasGroups.createGroupFromSelection?.();
      },
    },
    {
      id: "Workspace2.CanvasGroups.UngroupSelection",
      label: "WorkspaceKit: Ungroup selected canvas group",
      function: () => {
        workspace2CanvasGroups.ungroupSelection?.();
      },
    },
  ],
  keybindings: [
    {
      combo: { key: "g", shift: true },
      commandId: "Workspace2.CanvasGroups.UngroupSelection",
    },
  ],
  getCanvasMenuItems() {
    return [
      null,
      {
        content: `${WORKSPACE2_MENU_MARK}${menuLabel("groups.menuCreateSelected", "Group Selected Nodes (Ctrl+G)")}`,
        callback: () => {
          workspace2CanvasGroups.createGroupFromSelection?.();
        },
      },
      {
        content: `${WORKSPACE2_MENU_MARK}${menuLabel("groups.menuCreateEmpty", "New Empty Group")}`,
        callback: () => {
          workspace2CanvasGroups.createEmptyGroupAtContextPoint?.();
        },
      },
      {
        content: `${WORKSPACE2_MENU_MARK}${menuLabel("groups.menuSaveTemplate", "Save as Template (Alt+C)")}`,
        callback: () => {
          saveSelectedNodesAsTemplateFromContextMenu();
        },
      },
    ];
  },
  // ComfyUI calls this hook only when a node context menu is opened.  Keeping
  // it declarative avoids the legacy global LiteGraph menu monkey-patch from
  // leaking Workspace2 items into other extensions' menus.
  getNodeMenuItems(node) {
    return [
      {
        content: `${WORKSPACE2_MENU_MARK}${menuLabel("groups.menuCreateSelected", "Group Selected Nodes (Ctrl+G)")}`,
        callback: () => {
          workspace2CanvasGroups.createGroupFromSelection?.(node);
        },
      },
      {
        content: `${WORKSPACE2_MENU_MARK}${menuLabel("groups.menuSaveTemplate", "Save as Template (Alt+C)")}`,
        callback: () => {
          saveSelectedNodesAsTemplateFromContextMenu(node);
        },
      },
    ];
  },
  async setup() {
    installPerformanceDebugApi();
    const finish = startPerformanceSpan("workspace.setup");

    // Keep the official sidebar registration outside every optional startup
    // stage.  If it is unavailable, retain the existing fallback behavior.
    if (!registerWorkspace2SidebarTab()) {
      console.warn("[Workspace2] registerSidebarTab is not available; using fallback panel.");
      showFallbackPanel();
      finish({ sidebar: "fallback" });
      return;
    }
    workspaceState.sidebarRegistered = true;
    setupWorkspace2SidebarRemountRecovery();

    await runWorkspaceStartupStage("locale", async () => {
      await loadLocale();
      startLocaleWatcher();
    });
    await runWorkspaceStartupStage("panel-api", async () => {
      const panelUiTemplate = publishWorkspaceKitPanelUiTemplate(globalThis);
      if (!panelUiTemplate.ok) {
        console.warn("[WorkspaceKit] Panel UI Template v1 was not published", panelUiTemplate.code);
      } else {
        workspaceState.panelUiTemplate = panelUiTemplate.template;
      }
      const panelApi = publishWorkspaceKitPanelApi(globalThis, {
        providersEnabled: isWorkspacePanelIntegrationsEnabled(),
      });
      if (!panelApi.ok) {
        console.warn("[WorkspaceKit] Panel API v1 was not published", panelApi.code);
        return;
      }
      workspaceState.panelApi = panelApi.api;
      setupWorkspacePanelProviderLifecycle(panelApi.api);
      registerPendingWorkspaceKitPanelProviders(panelApi.api);
    });
    await runWorkspaceStartupStage("shortcuts", () => setupWorkspaceShortcuts());
    await runWorkspaceStartupStage("workflow-dirty-tracking", () => setupWorkflowDirtyTracking());
    await runWorkspaceStartupStage("official-workflow-sync", () => setupOfficialWorkflowStateSync());
    await runWorkspaceStartupStage("canvas-groups", () => {
      workspace2CanvasGroups.setNoticeHandler?.(workspace2Notice);
      workspace2CanvasGroups.init();
      installRgthreeFastGroupsBridge(workspace2CanvasGroups);
      registerWorkspace2CanvasGroupCommands();
    });
    await runWorkspaceStartupStage("node-adapter", () => detectOfficialNodeAdapter());
    await runWorkspaceStartupStage("official-favorites-probe", () => detectOfficialFavoritesProbe());
    await runWorkspaceStartupStage("workflows", async () => {
      try {
        await loadWorkflows();
      } catch (error) {
        state.status = t("status.error", { message: error.message });
        throw error;
      }
    });
    await runWorkspaceStartupStage("provider-claim", () => claimRegisteredWorkspacePanelProviders());
    await runWorkspaceStartupStage("template-prefetch", () => prefetchTemplateLibrary());

    finish({
      sidebar: "registered",
      lastCompletedStage: workspaceState.startup.lastCompletedStage,
      failedStages: workspaceState.startup.failures.map(({ stage }) => stage),
    }, workspaceState.startup.failures.length ? "partial" : "ok");
  },
});
