import { app } from "../../scripts/app.js";
import { pinyin as pinyinPro } from "./pinyin-pro.esm.js";
import { workspace2CanvasGroups } from "./workspace2_canvas_groups.js?v=20260708_group_settings_animation_slider_hitbox";
import { fetchJson, postJson } from "./core/api.js";
import {
  installPerformanceDebugApi,
  measurePromise,
  startPerformanceSpan,
} from "./core/performance.js";
import { withNodeIndexRefreshLock } from "./nodes/cache-coordinator.js";
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
  WORKSPACE2_PANEL_BACKGROUND_MODE_KEY,
  WORKSPACE2_PANEL_GLASS_KEY,
  WORKSPACE2_PANEL_GLASS_TRANSPARENCY_KEY,
  WORKSPACE2_PANEL_OPACITY_KEY,
  WORKSPACE2_SHORTCUT_CLOSE_SAME_KEY,
  WORKSPACE2_TAB_ID,
} from "./core/constants.js";

const WORKFLOW_OPEN_SECTION_COLLAPSED_KEY = "workspace2.workflows.openCollapsed";
const WORKFLOW_BROWSE_SECTION_COLLAPSED_KEY = "workspace2.workflows.browseCollapsed";

const FALLBACK_STRINGS = {
  "zh-CN": {
    "workspace.title": "Workspace2",
    "workspace.tooltip": "Workspace2",
    "workspace.tab.workflows": "工作流",
    "workspace.tab.nodes": "节点",
    "workspace.tab.templates": "模板",
    "settings.title": "设置",
    "settings.shortcuts": "快捷键",
    "settings.behavior": "打开行为",
    "settings.recentWorkflows": "打开记录数量",
    "settings.panelOpacity": "面板透明度",
    "settings.panelGlass": "玻璃背景",
    "settings.panelBlur": "背景模糊",
    "settings.backgroundEffect": "背景效果",
    "settings.transparentBackground": "透明背景",
    "settings.glassBackground": "磨砂玻璃",
    "settings.nodeCache": "节点缓存",
    "settings.about": "关于",
    "settings.ctrlG": "启用 Workspace2 编组",
    "settings.ctrlGHelp": "开启后，Ctrl+G 会替换 ComfyUI 默认编组。",
    "settings.altCOpenTemplates": "Alt+C 保存后自动打开模板",
    "settings.closeSameModule": "重复按当前标签快捷键时关闭面板",
    "settings.shortcuts.workflow": "工作流面板",
    "settings.shortcuts.nodes": "节点面板",
    "settings.shortcuts.templates": "模板面板",
    "settings.shortcuts.saveTemplate": "保存模板",
    "settings.shortcuts.createGroup": "Workspace2 编组",
    "settings.shortcuts.ungroup": "取消编组",
    "settings.shortcuts.shiftLeftClickKey": "Shift + 左键",
    "settings.shortcuts.toggleGroupIgnore": "切换是否忽略编组",
    "settings.shortcutsHelp": "常用快捷键",
    "settings.cacheCount": "缓存节点：{count}",
    "settings.cacheUpdated": "更新时间：{time}",
    "settings.cacheEmpty": "暂无缓存",
    "settings.clearNodeCache": "清空节点缓存",
    "settings.nodeCacheCleared": "节点缓存已清空",
    "settings.close": "关闭",
    "settings.version": "版本：{version}",
    "settings.github": "GitHub：ZiYao00/ComfyUI-Workspace2",
    "confirm.cancel": "取消",
    "confirm.delete": "删除",
    "confirm.moveToSystemTrash": "移到系统回收站",
    "confirm.emptyTrash": "清空回收站",
    "trash.systemDeleteTitle": "移到系统回收站",
    "trash.emptyTitle": "清空 Workspace2 回收站",
    "trash.moveToSystem": "清空到系统回收站",
    "trash.moveAllToSystemShort": "清空到系统回收站",
    "status.systemTrashPartial": "部分项目移到系统回收站失败：{count} 个。{details}",
    "workflows.title": "工作流2",
    "workflows.current": "当前工作流",
    "workflows.recent": "打开",
    "workflows.browse": "浏览",
    "workflows.currentEmpty": "未从 Workflows2 打开工作流",
    "workflows.removeRecent": "从打开记录移除",
    "workflows.saveCurrent": "保存当前工作流",
    "toolbar.openWorkflow": "打开工作流",
    "nodes.title": "节点2",
    "nodes.status": "{count} 个节点",
    "nodes.searchPlaceholder": "搜索节点",
    "nodes.categoryBookmarked": "收藏",
    "nodes.categoryComfy": "Comfy",
    "nodes.categoryExtensions": "扩展",
    "nodes.view.bookmarked": "收藏",
    "nodes.view.comfy": "Comfy",
    "nodes.view.extensions": "扩展",
    "nodes.moveToFavoriteRoot": "移到收藏根位置",
    "nodes.moveToFavoriteRootTitle": "拖拽收藏节点到这里，移到收藏根位置",
    "nodes.loadingDefinitions": "正在加载节点信息，插件较多时首次打开可能需要几秒。",
    "nodes.updatingDefinitions": "正在后台更新完整节点信息...",
    "nodes.officialCategory.3d": "3D",
    "nodes.officialCategory.advanced": "高级",
    "nodes.officialCategory.audio": "音频",
    "nodes.officialCategory.conditioning": "条件",
    "nodes.officialCategory.experimental": "实验性",
    "nodes.officialCategory.image": "图像",
    "nodes.officialCategory.latent": "潜空间",
    "nodes.officialCategory.model": "模型",
    "nodes.officialCategory.text": "文本",
    "nodes.officialCategory.video": "视频",
    "search.placeholder": "搜索工作流",
    "root.move": "移到根目录",
    "status.loading": "正在加载...",
    "status.error": "错误：{message}",
    "status.openedWorkflowFile": "已打开工作流文件",
    "status.workflowSaved": "工作流已保存",
    "status.workflowSaveMismatch": "只能保存当前打开的工作流",
    "status.workflowSerializeUnavailable": "当前 ComfyUI 前端不支持直接保存当前画布",
    "workflows.sort.nameAsc": "名称 A-Z",
    "workflows.sort.nameDesc": "名称 Z-A",
    "workflows.sort.updatedDesc": "修改时间新到旧",
    "workflows.sort.updatedAsc": "修改时间旧到新",
    "workflows.customOrder": "自定义顺序",
    "workflows.folderFirst": "优先文件夹",
    "workflows.sortTitle": "工作流排序：{sort}。点击打开菜单。",
    "workflows.reorderHandle": "拖动调整顺序",
    "font.size": "列表字号",
    "search.clear": "清空搜索",
    "nodes.customOrder": "自定义顺序",
    "nodes.reorderHandle": "拖动调整顺序",
    "nodes.defaultGroupName": "新建分组",
    "nodes.previewModeDetailed": "节点预览：完整",
    "nodes.previewModeCompact": "节点预览：紧凑",
    "nodes.uiScaleTitle": "列表字号",
    "nodes.categoryUnknown": "来源未知",
    "nodes.deleteGroupTitle": "删除收藏分组",
    "menu.newSubfolder": "新建子文件夹",
    "row.openLocation": "打开工作流位置",
    "folder.personalize": "个性化",
    "folder.changeIcon": "修改图标",
    "folder.changeColor": "修改颜色",
    "folder.resetStyle": "重置样式",
    "folder.personalizeTitle": "个性化",
    "folder.personalizePreview": "预览",
    "folder.personalizeIcon": "图标",
    "folder.personalizeColor": "颜色",
    "folder.personalizeApply": "应用",
    "folder.personalizeReset": "重置",
    "folder.personalizeCancel": "取消",
    "folder.personalizeDefault": "默认",
    "folder.defaultName": "新建文件夹",
    "folder.promptIcon": "输入 PrimeIcons class（如 pi pi-folder）或 emoji。留空使用默认图标。",
    "folder.promptColor": "输入颜色，如 #8ab4f8。留空使用默认颜色。",
    "canvasGroups.title": "编组2",
    "canvasGroups.status": "{count} 个编组",
    "canvasGroups.searchPlaceholder": "搜索编组",
    "canvasGroups.create": "用当前选中节点创建编组",
    "canvasGroups.refresh": "刷新编组列表",
    "canvasGroups.empty": "当前工作流没有编组。",
    "canvasGroups.noMatches": "没有匹配的编组。",
    "canvasGroups.nodes": "{count} 个节点",
    "canvasGroups.locate": "定位编组",
    "canvasGroups.rename": "重命名编组",
    "canvasGroups.promptRename": "编组名称",
    "canvasGroups.toggleBypass": "绕过 / 恢复编组",
    "canvasGroups.delete": "删除编组",
    "canvasGroups.confirmDelete": "删除编组“{name}”？不会删除节点。",
    "templates.title": "模板",
    "templates.status": "{count} 个模板",
    "templates.searchPlaceholder": "搜索模板",
    "templates.saveSelected": "保存选中节点为模板",
    "templates.empty": "还没有模板。选择画布上的节点后按 Alt+C 保存。",
    "templates.noMatches": "没有匹配的模板。",
    "templates.promptName": "模板名称",
    "templates.defaultName": "节点模板",
    "templates.saved": "已保存模板：{name}",
    "templates.selectNodesFirst": "请先在画布上选中节点。",
    "templates.canvasUnavailable": "当前画布不可用。",
    "templates.createFailed": "无法创建节点：{type}",
    "templates.restoreMissing": "有 {count} 个节点无法创建：{types}",
    "templates.dropHint": "拖到画布创建模板",
    "templates.pendingPlace": "点击画布放置模板：{name}",
    "templates.meta": "{nodes} 个节点 · {links} 条连线",
    "templates.rename": "重命名",
    "templates.placeCenter": "放置到画布中心",
    "templates.delete": "删除模板",
    "templates.copyName": "复制模板名称",
    "templates.confirmDelete": "删除模板“{name}”？",
    "templates.deleteTitle": "删除模板",
    "templates.deleted": "已删除模板",
    "templates.newGroup": "新建模板分组",
    "templates.defaultGroupName": "新建模板分组",
    "templates.renameGroup": "重命名分组",
    "templates.deleteGroup": "删除分组",
    "templates.confirmDeleteGroup": "删除分组“{name}”？其中的模板会移到模板根位置。",
    "templates.deleteGroupTitle": "删除模板分组",
    "templates.moveToRoot": "移到模板根位置",
    "templates.moveToRootTitle": "拖拽模板到这里，移到模板根位置",
    "templates.emptyGroup": "这个分组还没有模板。",
    "templates.uiScaleTitle": "列表字号",
    "templates.sort.manual": "自定义顺序",
    "templates.sort.nameAsc": "名称 A-Z",
    "templates.sort.nameDesc": "名称 Z-A",
    "templates.sort.updatedDesc": "最近更新",
    "templates.sort.updatedAsc": "最早更新",
    "templates.sortTitle": "模板排序：{sort}。点击打开菜单。",
  },
  "en-US": {
    "workspace.title": "Workspace2",
    "workspace.tooltip": "Workspace2",
    "workspace.tab.workflows": "Workflows",
    "workspace.tab.nodes": "Nodes",
    "workspace.tab.templates": "Templates",
    "settings.title": "Settings",
    "settings.shortcuts": "Shortcuts",
    "settings.behavior": "Open behavior",
    "settings.recentWorkflows": "Open history count",
    "settings.panelOpacity": "Panel opacity",
    "settings.panelGlass": "Glass background",
    "settings.panelBlur": "Background blur",
    "settings.backgroundEffect": "Background effect",
    "settings.transparentBackground": "Transparent background",
    "settings.glassBackground": "Frosted glass",
    "settings.nodeCache": "Node cache",
    "settings.about": "About",
    "settings.ctrlG": "Enable Workspace2 groups",
    "settings.ctrlGHelp": "When enabled, Ctrl+G replaces the ComfyUI default group command.",
    "settings.altCOpenTemplates": "Open Templates after Alt+C saves",
    "settings.closeSameModule": "Close the panel when pressing the current tab shortcut again",
    "settings.shortcuts.workflow": "Workflows panel",
    "settings.shortcuts.nodes": "Nodes panel",
    "settings.shortcuts.templates": "Templates panel",
    "settings.shortcuts.saveTemplate": "Save template",
    "settings.shortcuts.createGroup": "Workspace2 group",
    "settings.shortcuts.ungroup": "Ungroup",
    "settings.shortcuts.shiftLeftClickKey": "Shift + Left Click",
    "settings.shortcuts.toggleGroupIgnore": "Toggle group ignore",
    "settings.shortcutsHelp": "Common shortcuts",
    "settings.cacheCount": "Cached nodes: {count}",
    "settings.cacheUpdated": "Updated: {time}",
    "settings.cacheEmpty": "No cache yet",
    "settings.clearNodeCache": "Clear node cache",
    "settings.nodeCacheCleared": "Node cache cleared",
    "settings.close": "Close",
    "settings.version": "Version: {version}",
    "settings.github": "GitHub: ZiYao00/ComfyUI-Workspace2",
    "confirm.cancel": "Cancel",
    "confirm.delete": "Delete",
    "confirm.moveToSystemTrash": "Move to system trash",
    "confirm.emptyTrash": "Empty trash",
    "trash.systemDeleteTitle": "Move to system trash",
    "trash.emptyTitle": "Empty Workspace2 trash",
    "trash.moveToSystem": "Move All to System Trash",
    "trash.moveAllToSystemShort": "Move All to System Trash",
    "status.systemTrashPartial": "Move to system trash partial: {count} failed. {details}",
    "workflows.title": "Workflows 2",
    "workflows.current": "Current workflow",
    "workflows.recent": "Open",
    "workflows.browse": "Browse",
    "workflows.currentEmpty": "No workflow opened from Workflows2",
    "workflows.removeRecent": "Remove from open history",
    "workflows.saveCurrent": "Save current workflow",
    "toolbar.openWorkflow": "Open workflow",
    "nodes.title": "Nodes 2",
    "nodes.status": "{count} nodes",
    "nodes.searchPlaceholder": "Search nodes",
    "nodes.categoryBookmarked": "Favorites",
    "nodes.categoryComfy": "Comfy",
    "nodes.categoryExtensions": "Extensions",
    "nodes.view.bookmarked": "Favorites",
    "nodes.view.comfy": "Comfy",
    "nodes.view.extensions": "Extensions",
    "nodes.moveToFavoriteRoot": "Move to Favorites Root",
    "nodes.moveToFavoriteRootTitle": "Drop a favorite node here to move it to the favorites root",
    "nodes.loadingDefinitions": "Loading node information. Large plugin setups may take a few seconds the first time.",
    "nodes.updatingDefinitions": "Updating full node information in the background...",
    "nodes.officialCategory.3d": "3D",
    "nodes.officialCategory.advanced": "Advanced",
    "nodes.officialCategory.audio": "Audio",
    "nodes.officialCategory.conditioning": "Conditioning",
    "nodes.officialCategory.experimental": "Experimental",
    "nodes.officialCategory.image": "Image",
    "nodes.officialCategory.latent": "Latent",
    "nodes.officialCategory.model": "Model",
    "nodes.officialCategory.text": "Text",
    "nodes.officialCategory.video": "Video",
    "search.placeholder": "Search workflows",
    "root.move": "Move to Root",
    "status.loading": "Loading...",
    "status.error": "Error: {message}",
    "status.openedWorkflowFile": "Opened workflow file",
    "status.workflowSaved": "Workflow saved",
    "status.workflowSaveMismatch": "Only the current open workflow can be saved",
    "status.workflowSerializeUnavailable": "The current ComfyUI frontend does not expose a graph serializer",
    "workflows.sort.nameAsc": "Name A-Z",
    "workflows.sort.nameDesc": "Name Z-A",
    "workflows.sort.updatedDesc": "Newest modified",
    "workflows.sort.updatedAsc": "Oldest modified",
    "workflows.customOrder": "Custom order",
    "workflows.folderFirst": "Folders first",
    "workflows.sortTitle": "Workflow sort: {sort}. Click to open menu.",
    "workflows.reorderHandle": "Drag to reorder",
    "font.size": "List text size",
    "search.clear": "Clear search",
    "nodes.customOrder": "Custom order",
    "nodes.reorderHandle": "Drag to reorder",
    "nodes.defaultGroupName": "New group",
    "nodes.previewModeDetailed": "Node preview: Detailed",
    "nodes.previewModeCompact": "Node preview: Compact",
    "nodes.uiScaleTitle": "List text size",
    "nodes.categoryUnknown": "Unknown source",
    "nodes.deleteGroupTitle": "Delete favorite group",
    "menu.newSubfolder": "New subfolder",
    "row.openLocation": "Show workflow in folder",
    "folder.personalize": "Personalize",
    "folder.changeIcon": "Change icon",
    "folder.changeColor": "Change color",
    "folder.resetStyle": "Reset style",
    "folder.personalizeTitle": "Personalize",
    "folder.personalizePreview": "Preview",
    "folder.personalizeIcon": "Icon",
    "folder.personalizeColor": "Color",
    "folder.personalizeApply": "Apply",
    "folder.personalizeReset": "Reset",
    "folder.personalizeCancel": "Cancel",
    "folder.personalizeDefault": "Default",
    "folder.defaultName": "New folder",
    "folder.promptIcon": "Enter a PrimeIcons class, such as pi pi-folder, or an emoji. Leave empty for the default icon.",
    "folder.promptColor": "Enter a color, such as #8ab4f8. Leave empty for the default color.",
    "canvasGroups.title": "Groups 2",
    "canvasGroups.status": "{count} groups",
    "canvasGroups.searchPlaceholder": "Search groups",
    "canvasGroups.create": "Create group from selected nodes",
    "canvasGroups.refresh": "Refresh group list",
    "canvasGroups.empty": "This workflow has no groups.",
    "canvasGroups.noMatches": "No matching groups.",
    "canvasGroups.nodes": "{count} nodes",
    "canvasGroups.locate": "Locate group",
    "canvasGroups.rename": "Rename group",
    "canvasGroups.promptRename": "Group name",
    "canvasGroups.toggleBypass": "Bypass / restore group",
    "canvasGroups.delete": "Delete group",
    "canvasGroups.confirmDelete": "Delete group \"{name}\"? Nodes will not be deleted.",
    "templates.title": "Templates",
    "templates.status": "{count} templates",
    "templates.searchPlaceholder": "Search templates",
    "templates.saveSelected": "Save selected nodes as template",
    "templates.empty": "No templates yet. Select canvas nodes and press Alt+C to save.",
    "templates.noMatches": "No matching templates.",
    "templates.promptName": "Template name",
    "templates.defaultName": "Node template",
    "templates.saved": "Saved template: {name}",
    "templates.selectNodesFirst": "Select nodes on the canvas first.",
    "templates.canvasUnavailable": "Canvas is not available.",
    "templates.createFailed": "Could not create node: {type}",
    "templates.restoreMissing": "{count} nodes could not be created: {types}",
    "templates.dropHint": "Drag to canvas to create template",
    "templates.pendingPlace": "Click the canvas to place template: {name}",
    "templates.meta": "{nodes} nodes · {links} links",
    "templates.rename": "Rename",
    "templates.placeCenter": "Place at canvas center",
    "templates.delete": "Delete template",
    "templates.copyName": "Copy template name",
    "templates.confirmDelete": "Delete template \"{name}\"?",
    "templates.deleteTitle": "Delete template",
    "templates.deleted": "Deleted template",
    "templates.newGroup": "New template group",
    "templates.defaultGroupName": "New template group",
    "templates.renameGroup": "Rename group",
    "templates.deleteGroup": "Delete group",
    "templates.confirmDeleteGroup": "Delete group \"{name}\"? Templates in it will move to the template root.",
    "templates.deleteGroupTitle": "Delete template group",
    "templates.moveToRoot": "Move to Template Root",
    "templates.moveToRootTitle": "Drop a template here to move it to the template root",
    "templates.emptyGroup": "No templates in this group.",
    "templates.uiScaleTitle": "List text size",
    "templates.sort.manual": "Custom order",
    "templates.sort.nameAsc": "Name A-Z",
    "templates.sort.nameDesc": "Name Z-A",
    "templates.sort.updatedDesc": "Recently updated",
    "templates.sort.updatedAsc": "Oldest updated",
    "templates.sortTitle": "Template sort: {sort}. Click to open menu.",
  },
};
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

const state = {
  query: "",
  items: [],
  root: "",
  officialRoot: "",
  folderMeta: {},
  isOfficialRoot: true,
  status: "Loading...",
  signature: "",
  trashSignature: "",
  refreshTimer: null,
  refreshTarget: null,
  expanded: new Set([""]),
  selectedPath: "",
  editingPath: "",
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
  customOrder: readWorkflowCustomOrder(),
  locale: DEFAULT_LOCALE,
  strings: {},
  localeTimer: null,
  workflowsTarget: null,
  resultsRefreshTimer: null,
};

const canvasGroupsState = {
  query: "",
  renderTarget: null,
};

const workspaceState = {
  activeModule: normalizeWorkspaceModule(localStorage.getItem(WORKSPACE2_MODULE_KEY)),
  renderTarget: null,
  settingsElement: null,
  settingsCloseHandler: null,
};

const templatesState = {
  query: "",
  library: null,
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
};

const nodesState = {
  query: "",
  library: null,
  objectInfo: null,
  loading: false,
  objectInfoLoading: false,
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
  visibleSections: readNodeVisibleSections(),
  sort: NODE_SORTS.includes(localStorage.getItem(NODE_SORT_KEY)) ? localStorage.getItem(NODE_SORT_KEY) : "original",
  customOrderEnabled: localStorage.getItem(NODE_CUSTOM_ORDER_ENABLED_KEY) === "1",
  customOrder: readNodeCustomOrder(),
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

function findOfficialVueApp() {
  const candidates = [
    ["app.vueApp", app?.vueApp],
    ["app._vueApp", app?._vueApp],
    ["app.ui.vueApp", app?.ui?.vueApp],
    ["app.extensionManager.vueApp", app?.extensionManager?.vueApp],
    ["#app.__vue_app__", document.querySelector("#app")?.__vue_app__],
    ["body.__vue_app__", document.body?.__vue_app__],
  ];
  return candidates
    .filter(([, value]) => Boolean(value))
    .map(([path, value]) => ({
      path,
      keys: limitedKeys(value),
      hasContext: Boolean(value?._context),
      contextKeys: limitedKeys(value?._context),
      providesKeys: limitedKeys(value?._context?.provides),
    }));
}

function findOfficialNodeObjects() {
  const candidatePaths = [
    "nodeDefStore",
    "nodeStore",
    "nodeLibrary",
    "nodeLibraryService",
    "nodeOrganizationService",
    "extensionManager.nodeDefStore",
    "extensionManager.nodeStore",
    "extensionManager.nodeLibrary",
    "extensionManager.nodeLibraryService",
    "extensionManager.nodeOrganizationService",
    "ui.nodeDefStore",
    "ui.nodeStore",
    "ui.nodeLibrary",
    "ui.nodeLibraryService",
    "ui.nodeOrganizationService",
  ];
  const found = [];
  for (const path of candidatePaths) {
    const value = valueAtPath(app, path);
    if (!value) {
      continue;
    }
    found.push({
      path: `app.${path}`,
      keys: limitedKeys(value),
      nodeKeys: limitedKeys(value, /node|sort|organ/i),
      hasGetSortingStrategies: typeof value.getSortingStrategies === "function",
      hasOrganizeNodesByTab: typeof value.organizeNodesByTab === "function",
      hasBuildNodeDefTree: typeof value.buildNodeDefTree === "function",
    });
  }
  return found;
}

function findOfficialNodePreviewContainers() {
  const selectors = [
    "#node-library-node-preview-container",
    "[id*='node-preview']",
    "[class*='node-preview']",
  ];
  return selectors.map((selector) => ({
    selector,
    count: document.querySelectorAll(selector).length,
  }));
}

function findOfficialNodeLibraryDom() {
  const selectors = [
    "[role='tree']",
    "[role='treeitem']",
    "[id*='node-library']",
    "[class*='node-library']",
  ];
  return selectors.map((selector) => ({
    selector,
    count: document.querySelectorAll(selector).length,
  }));
}

function defaultNodeVisibleSections() {
  return { bookmarked: true, comfy: true, extensions: true };
}

function readNodeVisibleSections() {
  const defaults = defaultNodeVisibleSections();
  try {
    const parsed = JSON.parse(localStorage.getItem(NODE_VISIBLE_SECTIONS_KEY) || "{}");
    const next = { ...defaults };
    for (const key of NODE_SECTION_FILTERS) {
      if (typeof parsed?.[key] === "boolean") {
        next[key] = parsed[key];
      }
    }
    if (!Object.values(next).some(Boolean)) {
      return defaults;
    }
    return next;
  } catch {
    return defaults;
  }
}

function saveNodeVisibleSections() {
  localStorage.setItem(NODE_VISIBLE_SECTIONS_KEY, JSON.stringify(nodesState.visibleSections));
}

function readNodeCustomOrder() {
  try {
    const parsed = JSON.parse(localStorage.getItem(NODE_CUSTOM_ORDER_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveNodeCustomOrder() {
  localStorage.setItem(NODE_CUSTOM_ORDER_KEY, JSON.stringify(nodesState.customOrder || {}));
}

function detectOfficialNodeAdapter() {
  const extensionManager = app?.extensionManager;
  const adapter = {
    checkedAt: new Date().toISOString(),
    available: false,
    reason: "",
    appKeys: limitedKeys(app, /node|vue|store|library|extension|sidebar|workflow/i, 60),
    extensionManagerKeys: limitedKeys(extensionManager, /node|vue|store|library|sidebar|tab|workflow|setting/i, 80),
    vueApps: findOfficialVueApp(),
    nodeObjects: findOfficialNodeObjects(),
    previewContainers: findOfficialNodePreviewContainers(),
    nodeLibraryDom: findOfficialNodeLibraryDom(),
    globalNodeKeys: limitedKeys(globalThis, /comfy|node|vue|pinia|litegraph/i, 80),
  };
  adapter.hasNodeOrganizationService = adapter.nodeObjects.some((item) => item.hasOrganizeNodesByTab || item.hasGetSortingStrategies);
  adapter.hasVueAppContext = adapter.vueApps.some((item) => item.hasContext);
  adapter.hasPreviewContainer = adapter.previewContainers.some((item) => item.count > 0);
  adapter.hasNodeLibraryDom = adapter.nodeLibraryDom.some((item) => item.count > 0);
  adapter.available = adapter.hasNodeOrganizationService || adapter.hasVueAppContext || adapter.hasPreviewContainer;
  adapter.reason = adapter.available
    ? "Official frontend runtime objects were found. Inspect nodeObjects/vueApps before binding to them."
    : adapter.hasNodeLibraryDom
      ? "Official node-library DOM was found, but no stable service, Vue context, or preview container is exposed."
      : "No stable official node-library runtime object was found from Workspace2 setup.";
  nodesState.officialAdapter = adapter;
  globalThis.__workspace2OfficialNodeAdapter = adapter;
  globalThis.__workspace2ProbeOfficialNodeAdapter = detectOfficialNodeAdapter;
  try {
    localStorage.setItem(OFFICIAL_NODE_ADAPTER_KEY, JSON.stringify(adapter));
  } catch {
    // Ignore storage failures; the global debug object is the primary probe result.
  }
  console.info("[Workspace2] official node adapter probe", adapter);
  return adapter;
}

function summarizeOfficialFavoriteValue(value) {
  if (Array.isArray(value)) {
    const strings = value.filter((item) => typeof item === "string");
    return {
      type: "array",
      count: value.length,
      stringCount: strings.length,
      sample: strings.slice(0, 20),
      looksLikeNodeList: strings.length === value.length,
    };
  }
  if (value && typeof value === "object") {
    return {
      type: "object",
      keys: Object.keys(value).slice(0, 30),
      count: Object.keys(value).length,
    };
  }
  return {
    type: typeof value,
    value: String(value).slice(0, 160),
  };
}

function findLocalOfficialFavoriteCandidates() {
  const candidates = [];
  const patterns = [/node.*bookmark/i, /bookmark.*node/i, /node.*favorite/i, /favorite.*node/i, /node.*pinned/i, /pinned.*node/i];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !patterns.some((pattern) => pattern.test(key))) {
      continue;
    }
    const raw = localStorage.getItem(key) || "";
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {}
    candidates.push({
      key,
      storage: "localStorage",
      rawLength: raw.length,
      summary: summarizeOfficialFavoriteValue(parsed ?? raw),
    });
  }
  return candidates;
}

async function detectOfficialFavoritesProbe() {
  const probe = {
    checkedAt: new Date().toISOString(),
    localStorage: findLocalOfficialFavoriteCandidates(),
    backend: null,
    runtime: {
      appKeys: limitedKeys(app, /favorite|bookmark|node|library|store/i, 80),
      extensionManagerKeys: limitedKeys(app?.extensionManager, /favorite|bookmark|node|library|store/i, 80),
    },
  };
  try {
    const response = await fetchJson("/workspace2/nodes/official-favorites/probe");
    probe.backend = response.probe || null;
  } catch (error) {
    probe.backend = {
      error: error.message,
      note: "Backend route may require restarting ComfyUI after installing this probe.",
    };
  }
  probe.found = Boolean(probe.localStorage.length || probe.backend?.found);
  globalThis.__workspace2OfficialFavoritesProbe = probe;
  globalThis.__workspace2ProbeOfficialFavorites = detectOfficialFavoritesProbe;
  console.info("[Workspace2] official favorites probe", probe);
  return probe;
}

function isOfficialFavoriteFolderMarker(value) {
  return typeof value === "string" && value.trim().endsWith("/");
}

function collectOfficialFavoritesFromProbe(probe) {
  const seen = new Set();
  const items = [];
  const groups = [];
  const add = (value) => {
    if (typeof value !== "string") {
      return;
    }
    const nodeType = value.trim();
    if (!nodeType || isOfficialFavoriteFolderMarker(nodeType) || seen.has(nodeType)) {
      return;
    }
    seen.add(nodeType);
    items.push(nodeType);
  };
  const addList = (items) => {
    if (!Array.isArray(items)) {
      return;
    }
    for (const item of items) {
      add(item);
    }
  };

  for (const item of probe?.localStorage || []) {
    addList(item?.sample);
    addList(item?.nodes);
  }
  for (const file of probe?.backend?.files || []) {
    for (const match of file?.matches || []) {
      addList(match?.summary?.nodes);
      if (match?.summary?.looksLikeNodeList) {
        addList(match?.summary?.sample);
      }
      if (Array.isArray(match?.summary?.groups)) {
        groups.push(...match.summary.groups);
      }
    }
  }
  return { items, groups };
}

function resolveOfficialFavoriteType(rawType, nodeMap) {
  const value = String(rawType || "").trim();
  if (!value || isOfficialFavoriteFolderMarker(value)) {
    return "";
  }
  if (nodeMap.has(value)) {
    return value;
  }
  const leaf = value.split("/").filter(Boolean).pop() || value;
  return nodeMap.has(leaf) ? leaf : value;
}

function collectOfficialFavoriteImportItems(officialFavorites, nodeMap) {
  const items = [];
  const seen = new Set();
  const add = (rawType, groupName = "") => {
    const nodeType = resolveOfficialFavoriteType(rawType, nodeMap);
    if (!nodeType || seen.has(nodeType)) {
      return;
    }
    seen.add(nodeType);
    items.push({
      type: nodeType,
      rawType: String(rawType || ""),
      groupName: String(groupName || "").trim(),
    });
  };
  for (const group of officialFavorites.groups || []) {
    for (const rawType of group.nodes || []) {
      add(rawType, group.name);
    }
  }
  for (const rawType of officialFavorites.items || []) {
    add(rawType, "");
  }
  return items;
}

async function importWorkspace2FavoritesToOfficial(el) {
  if (!nodesState.library) {
    await loadNodeLibrary();
  }
  const groupCount = Math.max(0, (nodesState.library?.groups || []).length - 1);
  const nodeCount = (nodesState.library?.favorites || []).length;
  if (!nodeCount) {
    alert(t("nodes.noFavoritesToExport"));
    return;
  }
  if (!confirm(t("nodes.confirmImportWorkspace2ToOfficial", { groups: groupCount, nodes: nodeCount }))) {
    return;
  }
  const result = await postJson("/workspace2/nodes/official-favorites/import_from_workspace2", {});
  alert(t("nodes.importWorkspace2ToOfficialDone", {
    groups: result.groupCount || 0,
    nodes: result.nodeCount || 0,
  }));
  nodesState.officialFavoritesProbe = null;
  await detectOfficialFavoritesProbe();
  renderNodesPanel(el);
}

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
  return WORKSPACE2_MODULES.includes(moduleId) ? moduleId : "workflows";
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
  const localeFallback = FALLBACK_STRINGS[state.locale]?.[key];
  const defaultFallback = FALLBACK_STRINGS[DEFAULT_LOCALE]?.[key];
  const template = localeFallback || state.strings[key] || defaultFallback || key;
  if (template === key) {
    warnMissingTranslation(key);
  }
  return String(template).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
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
    if (event.shiftKey && !event.ctrlKey && (event.code === "KeyW" || event.code === "Digit1")) {
      event.preventDefault();
      event.stopPropagation();
      event.workspace2Handled = true;
      activateWorkspace2Module("workflows");
      return;
    }
    if (event.shiftKey && !event.ctrlKey && (event.code === "KeyN" || event.code === "Digit2")) {
      event.preventDefault();
      event.stopPropagation();
      event.workspace2Handled = true;
      activateWorkspace2Module("nodes");
      return;
    }
    if (event.shiftKey && !event.ctrlKey && event.code === "Digit3") {
      event.preventDefault();
      event.stopPropagation();
      event.workspace2Handled = true;
      activateWorkspace2Module("templates");
      return;
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

function isWorkspace2PanelOpen() {
  return Boolean(workspaceState.renderTarget?.isConnected && workspaceState.renderTarget.querySelector?.(".workspace2-shell"));
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

function activateWorkspace2Module(moduleId) {
  const nextModule = normalizeWorkspaceModule(moduleId);
  if (isWorkspace2ShortcutCloseSameEnabled() && isWorkspace2PanelOpen() && workspaceState.activeModule === nextModule) {
    return closeWorkspace2Sidebar();
  }
  return openWorkspace2Module(nextModule);
}

function openWorkspace2Module(moduleId) {
  const nextModule = normalizeWorkspaceModule(moduleId);
  workspaceState.activeModule = nextModule;
  localStorage.setItem(WORKSPACE2_MODULE_KEY, nextModule);
  if (isWorkspace2PanelOpen()) {
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
  const message = "Ctrl+G is still handled by ComfyUI. Remove the official Ctrl+G binding to use Workspace2 groups.";
  const toast = app.extensionManager?.toast;
  if (toast?.addAlert) {
    toast.addAlert(message);
  } else if (toast?.add) {
    toast.add({ severity: "warn", summary: "Workspace2", detail: message, life: 5000 });
  } else {
    console.warn(`[Workspace2] ${message}`);
  }
}

function isWorkspace2AltCOpenTemplatesEnabled() {
  return localStorage.getItem(WORKSPACE2_ALT_C_OPEN_TEMPLATES_KEY) !== "0";
}

function isWorkspace2ShortcutCloseSameEnabled() {
  return localStorage.getItem(WORKSPACE2_SHORTCUT_CLOSE_SAME_KEY) !== "0";
}

function snapPanelOpacity(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 100;
  }
  return Math.max(5, Math.min(100, Math.round(numeric)));
}

function panelOpacity() {
  return snapPanelOpacity(localStorage.getItem(WORKSPACE2_PANEL_OPACITY_KEY) || "100");
}

function snapGlassTransparency(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return 45;
  }
  return Math.max(5, Math.min(95, Math.round(numeric)));
}

function panelBackgroundMode() {
  const stored = localStorage.getItem(WORKSPACE2_PANEL_BACKGROUND_MODE_KEY);
  if (stored === "transparent" || stored === "glass") {
    return stored;
  }
  const migrated = localStorage.getItem(WORKSPACE2_PANEL_GLASS_KEY) === "1"
    ? "glass"
    : "transparent";
  localStorage.setItem(WORKSPACE2_PANEL_BACKGROUND_MODE_KEY, migrated);
  return migrated;
}

function isPanelGlassEnabled() {
  return panelBackgroundMode() === "glass";
}

function glassTransparency() {
  return snapGlassTransparency(
    localStorage.getItem(WORKSPACE2_PANEL_GLASS_TRANSPARENCY_KEY) || "70",
  );
}

function cleanupWorkspacePanelAncestors() {
  document.querySelectorAll(".workspace2-sidebar-transparent-root[data-workspace2-transparent-root='1']").forEach((node) => {
    node.classList.remove("workspace2-sidebar-transparent-root");
    node.removeAttribute("data-workspace2-transparent-root");
  });
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

function refreshWorkspacePanelAncestorsIfVisible() {
  const host = document.querySelector(".workspace2-host");
  if (isElementVisible(host)) {
    applyWorkspaceBackgroundEffect(host);
    syncWorkspaceGlassOverlay();
  } else {
    workspaceState.glassPortalElement?.classList.add("is-workspace2-overlay-hidden");
    cleanupWorkspacePanelAncestors();
  }
}

function hideWorkspace2SidebarSurfaces() {
  document.querySelectorAll(".workspace2-host").forEach((node) => {
    node.classList.add("is-workspace2-surface-hidden");
  });
  document.querySelectorAll(".workspace2-shell").forEach((node) => {
    node.classList.add("is-workspace2-overlay-hidden");
  });
  workspaceState.glassPortalElement?.classList.add("is-workspace2-overlay-hidden");
}

function findClosestSidebarTabButton(target) {
  const element = target instanceof Element
    ? target
    : target?.parentElement instanceof Element
      ? target.parentElement
      : null;
  if (!element) {
    return null;
  }
  const button = element.closest([
    ".side-bar-button",
    ".assets-tab-button",
    "[data-sidebar-tab-id]",
    "[data-tab-id]",
    "[role='tab']",
  ].join(","));
  if (button?.classList.contains("side-bar-button") && button.closest(".sidebar-item-group.mt-auto")) {
    return null;
  }
  return button;
}

function isWorkspace2SidebarTabButton(button) {
  if (!(button instanceof Element)) {
    return false;
  }
  if (button.classList.contains("workspace2-tab-button")) {
    return true;
  }
  const tabId = button.getAttribute("data-sidebar-tab-id")
    || button.getAttribute("data-tab-id")
    || button.getAttribute("data-id")
    || button.id
    || "";
  if (tabId === WORKSPACE2_TAB_ID) {
    return true;
  }
  const labels = [
    button.textContent || "",
    button.getAttribute("title") || "",
    button.getAttribute("aria-label") || "",
  ].map((label) => label.trim()).filter(Boolean);
  return labels.some((label) => label === t("workspace.title") || label === t("workspace.tooltip"));
}

function setupWorkspacePanelOpacityCleanup() {
  if (workspaceState.opacityCleanupReady) {
    return;
  }
  workspaceState.opacityCleanupReady = true;
  const scheduleRefresh = (event) => {
    if (event.target?.closest?.(".workspace2-host,.workspace2-shell,.workspace2-settings-backdrop,.workspace2-context-menu,.workspace2-menu")) {
      return;
    }
    const sidebarButton = findClosestSidebarTabButton(event.target);
    if (sidebarButton && !isWorkspace2SidebarTabButton(sidebarButton)) {
      hideWorkspace2SidebarSurfaces();
      window.setTimeout(refreshWorkspacePanelAncestorsIfVisible, 0);
      return;
    }
    window.setTimeout(refreshWorkspacePanelAncestorsIfVisible, 0);
    window.setTimeout(refreshWorkspacePanelAncestorsIfVisible, 160);
  };
  document.addEventListener("pointerdown", scheduleRefresh, true);
  document.addEventListener("click", scheduleRefresh, true);
}

function markWorkspacePanelAncestors(host) {
  cleanupWorkspacePanelAncestors();
  let node = host?.parentElement;
  let depth = 0;
  while (node && node !== document.body && depth < 12 && node.contains(host)) {
    node.classList.add("workspace2-sidebar-transparent-root");
    node.setAttribute("data-workspace2-transparent-root", "1");
    node = node.parentElement;
    depth += 1;
  }
}

function applyWorkspaceBackgroundEffect(panel) {
  setupWorkspacePanelOpacityCleanup();
  if (!panel?.classList?.contains("workspace2-host") && !panel?.classList?.contains("workspace2-shell")) {
    return;
  }
  const glass = isPanelGlassEnabled();
  const glassOpacity = 100 - glassTransparency();
  const alpha = glass ? `${glassOpacity}%` : `${panelOpacity()}%`;
  const blur = glass ? "24px" : "0px";
  const saturate = glass ? "1.35" : "1";
  const brightness = glass ? "1.08" : "1";
  const highlightAlpha = glass ? Math.max(0.008, Math.min(0.038, glassOpacity * 0.00075)) : 0;
  const highlight = glass ? `rgba(230, 235, 255, ${highlightAlpha.toFixed(3)})` : "transparent";
  const fillAlpha = glass
    ? Math.max(0.025, Math.min(0.30, glassOpacity * 0.009))
    : panelOpacity() / 100;
  const mistAlpha = glass ? Math.max(0.012, Math.min(0.12, glassOpacity * 0.0025)) : 0;
  const edgeAlpha = glass ? Math.max(0.055, Math.min(0.22, glassOpacity * 0.004)) : 0;
  const tabAlpha = glass ? Math.max(0.045, Math.min(0.18, glassOpacity * 0.0032)) : 0;
  const controlAlpha = glass ? Math.max(0.04, Math.min(0.18, glassOpacity * 0.0032)) : 0;
  const hoverAlpha = glass ? Math.max(0.065, Math.min(0.20, glassOpacity * 0.0038)) : 0;
  const panelFill = glass
    ? `rgba(24, 30, 46, ${fillAlpha.toFixed(3)})`
    : `color-mix(in srgb, var(--workspace2-shell-surface) ${alpha}, transparent)`;
  const panelMist = glass ? `rgba(245, 248, 255, ${mistAlpha.toFixed(3)})` : "transparent";
  const panelStroke = glass ? `rgba(255, 255, 255, ${edgeAlpha.toFixed(3)})` : "rgba(255, 255, 255, 0)";
  const panelCoolSheen = glass ? `rgba(132, 166, 255, ${Math.max(0.012, Math.min(0.075, glassOpacity * 0.0018)).toFixed(3)})` : "transparent";
  const panelTopSheen = glass ? `rgba(255, 255, 255, ${Math.max(0.008, Math.min(0.035, glassOpacity * 0.0008)).toFixed(3)})` : "transparent";
  const panelShade = glass ? `rgba(8, 12, 22, ${Math.max(0.012, Math.min(0.085, glassOpacity * 0.0017)).toFixed(3)})` : "transparent";
  const tabSurface = glass ? `rgba(255, 255, 255, ${tabAlpha.toFixed(3)})` : "";
  const controlSurface = glass ? `rgba(255, 255, 255, ${controlAlpha.toFixed(3)})` : "";
  const controlBorder = glass ? `rgba(255, 255, 255, ${Math.max(0.16, Math.min(0.28, edgeAlpha + 0.02)).toFixed(3)})` : "";
  const controlShadow = glass ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(9, 14, 24, 0.12)" : "";
  const hoverSurface = glass ? `rgba(255, 255, 255, ${hoverAlpha.toFixed(3)})` : "";
  panel?.style?.setProperty("--workspace2-panel-alpha", alpha);
  panel?.style?.setProperty("--workspace2-panel-blur", blur);
  panel?.style?.setProperty("--workspace2-panel-saturate", saturate);
  panel?.style?.setProperty("--workspace2-panel-brightness", brightness);
  panel?.style?.setProperty("--workspace2-glass-highlight", highlight);
  panel?.style?.setProperty("--workspace2-panel-fill", panelFill);
  panel?.style?.setProperty("--workspace2-panel-mist", panelMist);
  panel?.style?.setProperty("--workspace2-panel-stroke", panelStroke);
  panel?.style?.setProperty("--workspace2-panel-cool-sheen", panelCoolSheen);
  panel?.style?.setProperty("--workspace2-panel-top-sheen", panelTopSheen);
  panel?.style?.setProperty("--workspace2-panel-shade", panelShade);
  if (tabSurface) {
    panel?.style?.setProperty("--workspace2-tab-bg-glass", tabSurface);
  } else {
    panel?.style?.removeProperty?.("--workspace2-tab-bg-glass");
  }
  if (controlSurface) {
    panel?.style?.setProperty("--workspace2-control-bg-glass", controlSurface);
    panel?.style?.setProperty("--workspace2-control-border-glass", controlBorder);
    panel?.style?.setProperty("--workspace2-control-shadow-glass", controlShadow);
    panel?.style?.setProperty("--workspace2-hover-glass", hoverSurface);
  } else {
    panel?.style?.removeProperty?.("--workspace2-control-bg-glass");
    panel?.style?.removeProperty?.("--workspace2-control-border-glass");
    panel?.style?.removeProperty?.("--workspace2-control-shadow-glass");
    panel?.style?.removeProperty?.("--workspace2-hover-glass");
  }
  panel?.classList?.toggle("is-glass-background", glass);
  if (panel?.classList?.contains("workspace2-host")) {
    markWorkspacePanelAncestors(panel);
    panel.querySelectorAll?.(".workspace2-shell").forEach((node) => {
      node.style.setProperty("--workspace2-panel-alpha", alpha);
      node.style.setProperty("--workspace2-panel-blur", blur);
      node.style.setProperty("--workspace2-panel-saturate", saturate);
      node.style.setProperty("--workspace2-panel-brightness", brightness);
      node.style.setProperty("--workspace2-glass-highlight", highlight);
      node.style.setProperty("--workspace2-panel-fill", panelFill);
      node.style.setProperty("--workspace2-panel-mist", panelMist);
      node.style.setProperty("--workspace2-panel-stroke", panelStroke);
      node.style.setProperty("--workspace2-panel-cool-sheen", panelCoolSheen);
      node.style.setProperty("--workspace2-panel-top-sheen", panelTopSheen);
      node.style.setProperty("--workspace2-panel-shade", panelShade);
      if (tabSurface) {
        node.style.setProperty("--workspace2-tab-bg-glass", tabSurface);
      } else {
        node.style.removeProperty("--workspace2-tab-bg-glass");
      }
      if (controlSurface) {
        node.style.setProperty("--workspace2-control-bg-glass", controlSurface);
        node.style.setProperty("--workspace2-control-border-glass", controlBorder);
        node.style.setProperty("--workspace2-control-shadow-glass", controlShadow);
        node.style.setProperty("--workspace2-hover-glass", hoverSurface);
      } else {
        node.style.removeProperty("--workspace2-control-bg-glass");
        node.style.removeProperty("--workspace2-control-border-glass");
        node.style.removeProperty("--workspace2-control-shadow-glass");
        node.style.removeProperty("--workspace2-hover-glass");
      }
      node.classList.toggle("is-glass-background", glass);
    });
  }
}

function syncWorkspaceGlassOverlay() {
  const host = workspaceState.renderTarget;
  const shell = workspaceState.glassPortalElement
    || host?.querySelector?.(".workspace2-shell");
  if (!host || !shell) {
    return;
  }
  if (isPanelGlassEnabled()) {
    if (!isElementVisible(host)) {
      shell.classList.add("is-workspace2-overlay-hidden");
      return;
    }
    const rect = host.getBoundingClientRect();
    if (shell.parentElement !== document.body) {
      document.body.append(shell);
    }
    shell.classList.add("workspace2-glass-overlay");
    shell.style.left = `${Math.round(rect.left)}px`;
    shell.style.top = `${Math.round(rect.top)}px`;
    shell.style.width = `${Math.round(rect.width)}px`;
    shell.style.height = `${Math.round(rect.height)}px`;
    shell.classList.remove("is-workspace2-overlay-hidden");
    workspaceState.glassPortalElement = shell;
    return;
  }
  shell.classList.remove("workspace2-glass-overlay", "is-workspace2-overlay-hidden");
  for (const property of ["left", "top", "width", "height"]) {
    shell.style.removeProperty(property);
  }
  if (shell.parentElement !== host) {
    host.append(shell);
  }
  workspaceState.glassPortalElement = null;
}

function setupWorkspaceGlassOverlayTracking() {
  if (workspaceState.glassOverlayTrackingReady) {
    return;
  }
  workspaceState.glassOverlayTrackingReady = true;
  window.addEventListener("resize", () => {
    window.requestAnimationFrame(syncWorkspaceGlassOverlay);
  });
}

function setPanelOpacity(value) {
  const next = snapPanelOpacity(value);
  localStorage.setItem(WORKSPACE2_PANEL_OPACITY_KEY, String(next));
  cleanupWorkspacePanelAncestors();
  document.querySelectorAll(".workspace2-host, .workspace2-shell").forEach(applyWorkspaceBackgroundEffect);
  return next;
}

function setPanelBackgroundMode(mode) {
  const next = mode === "glass" ? "glass" : "transparent";
  localStorage.setItem(WORKSPACE2_PANEL_BACKGROUND_MODE_KEY, next);
  localStorage.setItem(WORKSPACE2_PANEL_GLASS_KEY, next === "glass" ? "1" : "0");
  document.querySelectorAll(".workspace2-host, .workspace2-shell").forEach(applyWorkspaceBackgroundEffect);
  syncWorkspaceGlassOverlay();
}

function setGlassTransparency(value) {
  const next = snapGlassTransparency(value);
  localStorage.setItem(WORKSPACE2_PANEL_GLASS_TRANSPARENCY_KEY, String(next));
  document.querySelectorAll(".workspace2-host, .workspace2-shell").forEach(applyWorkspaceBackgroundEffect);
  syncWorkspaceGlassOverlay();
}

function closeWorkspaceSettings() {
  if (workspaceState.settingsCloseHandler) {
    window.removeEventListener("keydown", workspaceState.settingsCloseHandler, true);
    workspaceState.settingsCloseHandler = null;
  }
  workspaceState.settingsElement?.remove();
  workspaceState.settingsElement = null;
}

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

function settingsCheckbox(label, checked, onChange) {
  const row = document.createElement("div");
  row.className = "workspace2-settings-row";
  const wrapper = document.createElement("label");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));
  wrapper.append(input, document.createTextNode(label));
  row.append(wrapper);
  return row;
}

function settingsSection(title, children = []) {
  const section = document.createElement("section");
  section.className = "workspace2-settings-section";
  const heading = document.createElement("div");
  heading.className = "workspace2-settings-section-title";
  heading.textContent = title;
  section.append(heading, ...children);
  return section;
}

function settingsHelp(text) {
  const help = document.createElement("div");
  help.className = "workspace2-settings-help";
  help.textContent = text;
  return help;
}

function settingsShortcutGrid() {
  const shortcuts = [
    ["Shift + 1", t("settings.shortcuts.workflow")],
    ["Shift + 2", t("settings.shortcuts.nodes")],
    ["Shift + 3", t("settings.shortcuts.templates")],
    ["Alt + C", t("settings.shortcuts.saveTemplate")],
    ["Ctrl + G", t("settings.shortcuts.createGroup")],
    ["Shift + G", t("settings.shortcuts.ungroup")],
    [t("settings.shortcuts.shiftLeftClickKey"), t("settings.shortcuts.toggleGroupIgnore")],
  ];
  const grid = document.createElement("div");
  grid.className = "workspace2-settings-shortcut-grid";
  grid.style.cssText = "display:grid;grid-auto-flow:column;grid-template-rows:repeat(4,auto);grid-template-columns:1fr 1fr;gap:6px 12px;margin:4px 0 10px;";
  for (const [keys, label] of shortcuts) {
    const item = document.createElement("div");
    item.className = "workspace2-settings-shortcut-item";
    item.style.cssText = "display:grid;grid-template-columns:72px minmax(0,1fr);gap:7px;align-items:center;min-width:0;font-size:12px;line-height:1.35;";
    const key = document.createElement("span");
    key.textContent = keys;
    key.style.cssText = "color:var(--descrip-text,#aaa);font-weight:400;white-space:nowrap;";
    const text = document.createElement("span");
    text.textContent = label;
    text.style.cssText = "color:var(--descrip-text,#aaa);font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";
    item.append(key, text);
    grid.append(item);
  }
  return grid;
}

function settingsRange(label, value, { min, max, step = 1, snap, onChange, disabled = false }) {
  const row = document.createElement("div");
  row.className = "workspace2-settings-row";
  const text = document.createElement("span");
  text.textContent = label;
  const control = document.createElement("label");
  control.className = "workspace2-settings-range";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = String(step);
  slider.value = String(value);
  slider.disabled = disabled;
  row.classList.toggle("is-disabled", disabled);
  isolateComfyKeys(slider);
  const output = document.createElement("span");
  output.textContent = String(value);
  slider.addEventListener("input", () => {
    const next = typeof snap === "function" ? snap(slider.value) : Number(slider.value);
    slider.value = String(next);
    output.textContent = String(next);
    onChange?.(next);
  });
  control.append(slider, output);
  row.append(text, control);
  return row;
}

function settingsModeRange(label, mode, selected, value, { min, max, snap, onChange, onSelect }) {
  const row = document.createElement("div");
  row.className = "workspace2-settings-row workspace2-settings-mode-row";
  row.dataset.mode = mode;

  const choice = document.createElement("label");
  choice.className = "workspace2-settings-mode-choice";
  const radio = document.createElement("input");
  radio.type = "radio";
  radio.name = "workspace2-background-mode";
  radio.value = mode;
  radio.checked = selected;
  const text = document.createElement("span");
  text.textContent = label;
  choice.append(radio, text);

  const control = document.createElement("label");
  control.className = "workspace2-settings-range";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = String(min);
  slider.max = String(max);
  slider.step = "1";
  slider.value = String(value);
  slider.disabled = !selected;
  isolateComfyKeys(slider);
  const output = document.createElement("span");
  output.textContent = String(value);
  control.append(slider, output);

  row.classList.toggle("is-disabled", !selected);
  radio.addEventListener("change", () => {
    if (radio.checked) {
      onSelect?.(mode);
    }
  });
  slider.addEventListener("input", () => {
    const next = typeof snap === "function" ? snap(slider.value) : Number(slider.value);
    slider.value = String(next);
    output.textContent = String(next);
    onChange?.(next);
  });

  row.append(choice, control);
  return row;
}

function updateSettingsModeRange(row, selected) {
  const radio = row?.querySelector?.('input[type="radio"]');
  const slider = row?.querySelector?.('input[type="range"]');
  if (!radio || !slider) {
    return;
  }
  radio.checked = selected;
  slider.disabled = !selected;
  row.classList.toggle("is-disabled", !selected);
}

function openWorkspaceSettings() {
  closeWorkspaceSettings();

  const backdrop = document.createElement("div");
  backdrop.className = "workspace2-settings-backdrop";
  backdrop.addEventListener("pointerdown", (event) => {
    if (event.target === backdrop) {
      closeWorkspaceSettings();
    }
  });

  const dialog = document.createElement("div");
  dialog.className = "workspace2-settings-dialog";
  dialog.addEventListener("pointerdown", (event) => event.stopPropagation());
  dialog.addEventListener("click", (event) => event.stopPropagation());

  const header = document.createElement("div");
  header.className = "workspace2-settings-header";
  const title = document.createElement("div");
  title.className = "workspace2-settings-title";
  title.textContent = t("settings.title");
  const close = toolbarButton("x", t("settings.close"), closeWorkspaceSettings);
  header.append(title, close);

  const shortcuts = settingsSection(t("settings.shortcuts"), [
    settingsShortcutGrid(),
    settingsCheckbox(t("settings.ctrlG"), isWorkspace2CtrlGCreateEnabled(), (checked) => {
      localStorage.setItem(CANVAS_GROUP_CTRL_G_KEY, checked ? "1" : "0");
    }),
    settingsHelp(t("settings.ctrlGHelp")),
  ]);

  const behavior = settingsSection(t("settings.behavior"), [
    settingsCheckbox(t("settings.altCOpenTemplates"), isWorkspace2AltCOpenTemplatesEnabled(), (checked) => {
      localStorage.setItem(WORKSPACE2_ALT_C_OPEN_TEMPLATES_KEY, checked ? "1" : "0");
    }),
    settingsRange(t("settings.recentWorkflows"), workflowRecentLimit(), {
      min: 2,
      max: 20,
      snap: snapWorkflowRecentLimit,
      onChange: (value) => {
        setWorkflowRecentLimit(value);
      },
    }),
  ]);

  let transparentModeRow;
  let glassModeRow;
  const selectBackgroundMode = (mode) => {
    setPanelBackgroundMode(mode);
    updateSettingsModeRange(transparentModeRow, mode === "transparent");
    updateSettingsModeRange(glassModeRow, mode === "glass");
  };
  transparentModeRow = settingsModeRange(
    t("settings.transparentBackground"),
    "transparent",
    panelBackgroundMode() === "transparent",
    panelOpacity(),
    {
      min: 5,
      max: 100,
      snap: snapPanelOpacity,
      onChange: setPanelOpacity,
      onSelect: selectBackgroundMode,
    },
  );
  glassModeRow = settingsModeRange(
    t("settings.glassBackground"),
    "glass",
    panelBackgroundMode() === "glass",
    glassTransparency(),
    {
      min: 5,
      max: 95,
      snap: snapGlassTransparency,
      onChange: setGlassTransparency,
      onSelect: selectBackgroundMode,
    },
  );
  const backgroundEffect = settingsSection(t("settings.backgroundEffect"), [
    transparentModeRow,
    glassModeRow,
  ]);

  const cacheCount = nodesState.objectInfo ? Object.keys(nodesState.objectInfo).length : 0;
  const cacheInfo = settingsHelp(cacheCount
    ? `${t("settings.cacheCount", { count: cacheCount })}\n${t("settings.cacheUpdated", { time: formatTimestamp(nodesState.objectInfoCachedAt) })}`
    : t("settings.cacheEmpty"));
  const clearCache = toolbarButton("trash", t("settings.clearNodeCache"), async () => {
    try {
      await clearCachedObjectInfo();
      cacheInfo.textContent = t("settings.nodeCacheCleared");
    } catch (error) {
      cacheInfo.textContent = error.message || String(error);
    }
  });
  const cacheRow = document.createElement("div");
  cacheRow.className = "workspace2-settings-row";
  cacheRow.append(cacheInfo, clearCache);
  const nodeCache = settingsSection(t("settings.nodeCache"), [cacheRow]);

  const about = settingsSection(t("settings.about"), [
    settingsHelp(t("settings.version", { version: "0.2.0-beta" })),
    settingsHelp(t("settings.github")),
  ]);

  dialog.append(header, shortcuts, behavior, backgroundEffect, nodeCache, about);
  backdrop.append(dialog);
  document.body.append(backdrop);
  workspaceState.settingsElement = backdrop;

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
      label: "Workspace2: Create canvas group",
      function: () => {
        workspace2CanvasGroups.createGroupFromSelection?.();
      },
    },
    {
      id: "Workspace2.CanvasGroups.UngroupSelection",
      label: "Workspace2: Ungroup selected canvas group",
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
  const element = findWorkspace2SidebarTabElement(tabId);
  if (element) {
    element.click();
    return true;
  }

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
    ? t("workspace.title")
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

let workspace2ConfirmClose = null;
let workspace2InlineConfirmClose = null;

function closeWorkspace2OverlaysForConfirm() {
  try { hideNodePreview(); } catch (error) {}
  try { closeTemplateContextMenu(); } catch (error) {}
  try { closeNodeContextMenu(); } catch (error) {}
  try { closeContextMenu(); } catch (error) {}
}

function workspace2Confirm({ title = "", message = "", confirmText = t("confirm.delete"), danger = true } = {}) {
  if (workspace2ConfirmClose) {
    workspace2ConfirmClose(false);
  }
  closeWorkspace2OverlaysForConfirm();
  return new Promise((resolve) => {
    let settled = false;
    const backdrop = document.createElement("div");
    backdrop.className = "workspace2-confirm-backdrop";
    const dialog = document.createElement("div");
    dialog.className = "workspace2-confirm-dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    isolateComfyKeys(dialog);

    const titleEl = document.createElement("div");
    titleEl.className = "workspace2-confirm-title";
    titleEl.textContent = title || confirmText;
    const messageEl = document.createElement("div");
    messageEl.className = "workspace2-confirm-message";
    messageEl.textContent = message;
    const actions = document.createElement("div");
    actions.className = "workspace2-confirm-actions";
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "workspace2-confirm-button is-secondary";
    cancel.textContent = t("confirm.cancel");
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = `workspace2-confirm-button${danger ? " is-danger" : ""}`;
    confirm.textContent = confirmText;
    actions.append(cancel, confirm);
    dialog.append(titleEl, messageEl, actions);
    backdrop.append(dialog);

    const cleanup = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      document.removeEventListener("keydown", onKeydown, true);
      workspace2ConfirmClose = null;
      backdrop.remove();
      resolve(Boolean(result));
    };
    const onKeydown = (event) => {
      event.stopPropagation();
      if (event.key === "Escape") {
        event.preventDefault();
        cleanup(false);
      }
    };
    workspace2ConfirmClose = cleanup;
    backdrop.addEventListener("pointerdown", (event) => {
      if (event.target === backdrop) {
        cleanup(false);
      }
      event.stopPropagation();
    });
    backdrop.addEventListener("click", (event) => event.stopPropagation());
    dialog.addEventListener("pointerdown", (event) => event.stopPropagation());
    cancel.addEventListener("click", () => cleanup(false));
    confirm.addEventListener("click", () => cleanup(true));
    document.addEventListener("keydown", onKeydown, true);
    document.body.append(backdrop);
    setTimeout(() => cancel.focus(), 0);
  });
}

function workspace2InlineConfirm(anchor, { confirmText = t("confirm.delete"), onConfirm } = {}) {
  if (!anchor || typeof onConfirm !== "function") {
    return;
  }
  if (workspace2InlineConfirmClose) {
    workspace2InlineConfirmClose();
  }
  closeWorkspace2OverlaysForConfirm();

  const container = anchor.classList?.contains("workspace2-actions")
    ? anchor
    : anchor.closest?.(".workspace2-actions") || anchor.closest?.(".workspace2-root-row") || anchor.parentElement;
  if (!container) {
    return;
  }
  const replaceActions = container.classList?.contains("workspace2-actions");
  const replaceRootRowControl = container.classList?.contains("workspace2-root-row");
  const originalChildren = (replaceActions || replaceRootRowControl) ? Array.from(container.childNodes) : [];
  const inline = document.createElement("span");
  inline.className = "workspace2-inline-confirm";
  isolateComfyKeys(inline);

  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.className = "workspace2-inline-confirm-button";
  cancel.textContent = t("confirm.cancel");
  const confirm = document.createElement("button");
  confirm.type = "button";
  confirm.className = "workspace2-inline-confirm-button is-danger";
  confirm.textContent = confirmText;
  inline.append(cancel, confirm);

  const cleanup = () => {
    if (workspace2InlineConfirmClose !== cleanup) {
      return;
    }
    workspace2InlineConfirmClose = null;
    if (!container.isConnected) {
      return;
    }
    if (replaceActions || replaceRootRowControl) {
      container.replaceChildren(...originalChildren);
    } else {
      inline.remove();
    }
  };
  workspace2InlineConfirmClose = cleanup;
  cancel.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    cleanup();
  });
  confirm.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopPropagation();
    cleanup();
    await onConfirm();
  });
  inline.addEventListener("pointerdown", (event) => event.stopPropagation());
  inline.addEventListener("click", (event) => event.stopPropagation());

  if (replaceActions) {
    container.replaceChildren(inline);
  } else if (replaceRootRowControl) {
    container.replaceChildren(originalChildren[0], inline);
  } else {
    container.append(inline);
  }
}

async function loadLocale() {
  state.locale = detectLocale();
  state.strings = {};
  try {
    const response = await fetch(localeAssetUrl(state.locale), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    state.strings = await response.json();
  } catch (error) {
    if (state.locale !== DEFAULT_LOCALE) {
      const response = await fetch(localeAssetUrl(DEFAULT_LOCALE), { cache: "no-store" });
      state.strings = response.ok ? await response.json() : {};
    }
  }
}

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

function styles() {
  if (document.getElementById("workspace2-styles")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "workspace2-styles";
  style.textContent = `
    .workspace2-host {
      --workspace2-panel-alpha: 100%;
      --workspace2-panel-blur: 0px;
      --workspace2-panel-saturate: 1;
      --workspace2-panel-brightness: 1;
      --workspace2-shell-surface: var(--comfy-menu-bg, var(--bg-color, var(--p-content-background, #202124)));
      background: transparent !important;
      height: 100%;
      max-height: 100%;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .workspace2-host.is-workspace2-surface-hidden {
      display: none !important;
      pointer-events: none !important;
      visibility: hidden !important;
    }
    .workspace2-sidebar-transparent-root {
      background: transparent !important;
    }
    .workspace2-panel {
      --workspace2-tree-font: 12px;
      --workspace2-folder-font: 12px;
      --workspace2-node-font: 11px;
      --workspace2-meta-font: 10px;
      --workspace2-row-height: 28px;
      --workspace2-node-row-height: var(--workspace2-row-height);
      --workspace2-node-row-padding-y: 2px;
      --workspace2-node-list-gap: 2px;
      --workspace2-radius: var(--p-border-radius, 6px);
      --workspace2-radius-sm: calc(var(--workspace2-radius) - 1px);
      --workspace2-surface: var(--comfy-menu-bg, var(--bg-color, var(--p-content-background, #202124)));
      --workspace2-control-bg: var(--comfy-input-bg, var(--p-form-field-background, #111));
      --workspace2-border: var(--border-color, var(--p-content-border-color, rgba(255, 255, 255, 0.14)));
      --workspace2-muted: var(--descrip-text, var(--p-text-muted-color, rgba(255, 255, 255, 0.55)));
      --workspace2-hover: var(--comfy-menu-hover-bg, var(--content-hover-bg, var(--p-list-option-hover-background, rgba(255, 255, 255, 0.075))));
      --workspace2-accent: var(--p-primary-color, var(--accent-color, #0A84FF));
      --workspace2-accent-muted: color-mix(in srgb, var(--workspace2-accent) 58%, var(--workspace2-tab-bg, var(--workspace2-surface)));
      --workspace2-section-disclosure-color: color-mix(in srgb, var(--workspace2-accent) 46%, var(--workspace2-muted));
      --workspace2-section-disclosure-hover-color: color-mix(in srgb, var(--workspace2-accent) 66%, var(--workspace2-muted));
      --workspace2-accent-soft: color-mix(in srgb, var(--workspace2-accent) 10%, transparent);
      --workspace2-accent-mid: color-mix(in srgb, var(--workspace2-accent) 18%, transparent);
      --workspace2-accent-strong: color-mix(in srgb, var(--workspace2-accent) 30%, transparent);
      --workspace2-accent-border: color-mix(in srgb, var(--workspace2-accent) 42%, transparent);
      --workspace2-danger: #FF453A;
      --workspace2-danger-soft: rgba(255, 69, 58, 0.10);
      --workspace2-danger-mid: rgba(255, 69, 58, 0.22);
      --workspace2-danger-border: rgba(255, 69, 58, 0.58);
      --workspace2-tab-bg: var(--comfy-menu-secondary-bg, var(--comfy-menu-bg, var(--content-bg, var(--p-tabs-tab-background, #202124))));
      --workspace2-tab-hover-bg: var(--comfy-menu-hover-bg, var(--content-hover-bg, color-mix(in srgb, var(--workspace2-accent) 10%, var(--workspace2-tab-bg))));
      --workspace2-tab-active-bg: color-mix(in srgb, var(--contrast-mix-color, var(--workspace2-accent)) 24%, var(--workspace2-tab-bg));
      --workspace2-panel-alpha: 100%;
      --workspace2-panel-blur: 0px;
      --workspace2-panel-saturate: 1;
      box-sizing: border-box;
      height: 100%;
      max-height: 100%;
      min-height: 320px;
      padding: 10px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: transparent;
      font: 12px/1.35 var(--font-family, Arial, sans-serif);
      overflow: hidden;
      display: flex;
      flex-direction: column;
      gap: 8px;
      user-select: none;
      min-height: 0;
    }
    .workspace2-panel.font-medium {
      --workspace2-tree-font: 13px;
      --workspace2-folder-font: 13px;
      --workspace2-node-font: 12px;
      --workspace2-meta-font: 10.5px;
      --workspace2-row-height: 31px;
    }
    .workspace2-panel.font-large {
      --workspace2-tree-font: 14px;
      --workspace2-folder-font: 14px;
      --workspace2-node-font: 13px;
      --workspace2-meta-font: 11px;
      --workspace2-row-height: 34px;
    }
    .workspace2-panel.node-spacing-medium {
      --workspace2-node-row-height: calc(var(--workspace2-row-height) + 4px);
      --workspace2-node-row-padding-y: 4px;
      --workspace2-node-list-gap: 4px;
    }
    .workspace2-panel.node-spacing-large {
      --workspace2-node-row-height: calc(var(--workspace2-row-height) + 8px);
      --workspace2-node-row-padding-y: 5px;
      --workspace2-node-list-gap: 6px;
    }
    .workspace2-panel * { box-sizing: border-box; }
    .workspace2-shell {
      --workspace2-border: var(--border-color, var(--p-content-border-color, rgba(255, 255, 255, 0.14)));
      --workspace2-accent: var(--p-primary-color, var(--accent-color, #0A84FF));
      --workspace2-accent-muted: color-mix(in srgb, var(--workspace2-accent) 58%, var(--workspace2-tab-bg));
      --workspace2-tab-bg: var(--workspace2-tab-bg-glass, var(--comfy-menu-secondary-bg, var(--comfy-menu-bg, var(--content-bg, var(--p-tabs-tab-background, #202124)))));
      --workspace2-tab-hover-bg: var(--comfy-menu-hover-bg, var(--content-hover-bg, color-mix(in srgb, var(--workspace2-accent) 10%, var(--workspace2-tab-bg))));
      --workspace2-tab-active-bg: color-mix(in srgb, var(--workspace2-accent) 12%, var(--workspace2-tab-bg));
      --workspace2-panel-fill: transparent;
      --workspace2-panel-mist: transparent;
      --workspace2-panel-stroke: rgba(255, 255, 255, 0);
      --workspace2-panel-cool-sheen: transparent;
      --workspace2-panel-top-sheen: transparent;
      --workspace2-panel-shade: transparent;
      position: relative;
      height: 100%;
      max-height: 100%;
      min-height: 0;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      background: transparent;
      border-radius: 12px;
    }
    .workspace2-shell::before {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      background:
        radial-gradient(115% 70% at 12% -12%, var(--workspace2-panel-top-sheen), transparent 72%),
        radial-gradient(92% 64% at 100% 100%, var(--workspace2-panel-cool-sheen), transparent 62%),
        linear-gradient(145deg, var(--workspace2-glass-highlight, transparent), transparent 58%),
        linear-gradient(180deg, var(--workspace2-panel-mist), transparent 68%),
        linear-gradient(180deg, transparent 50%, var(--workspace2-panel-shade) 100%),
        var(--workspace2-panel-fill);
      border: 1px solid var(--workspace2-panel-stroke);
      border-radius: inherit;
      backdrop-filter:
        blur(var(--workspace2-panel-blur))
        saturate(var(--workspace2-panel-saturate))
        brightness(var(--workspace2-panel-brightness));
      -webkit-backdrop-filter:
        blur(var(--workspace2-panel-blur))
        saturate(var(--workspace2-panel-saturate))
        brightness(var(--workspace2-panel-brightness));
    }
    .workspace2-shell.is-glass-background::before {
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.18),
        inset 1px 0 0 rgba(255, 255, 255, 0.08),
        inset -1px 0 0 rgba(255, 255, 255, 0.06),
        0 12px 36px rgba(0, 0, 0, 0.14);
    }
    .workspace2-shell.workspace2-glass-overlay {
      position: fixed;
      z-index: 1100;
      max-height: none;
      border-radius: 12px;
      overflow: hidden;
    }
    .workspace2-shell.workspace2-glass-overlay.is-workspace2-overlay-hidden {
      visibility: hidden;
      pointer-events: none;
    }
    .workspace2-module-tabs {
      position: relative;
      z-index: 1;
      flex: 0 0 auto;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr)) 30px;
      gap: 7px;
      padding: 9px 10px 7px;
      border-bottom: 1px solid color-mix(in srgb, var(--p-content-border-color, var(--border-color, rgba(255, 255, 255, 0.14))) 62%, transparent);
      background: transparent;
    }
    .workspace2-module-tab {
      position: relative;
      min-height: 30px;
      border: 1px solid color-mix(in srgb, var(--p-content-border-color, var(--border-color, rgba(255, 255, 255, 0.14))) 78%, transparent);
      border-radius: 8px;
      color: var(--p-text-muted-color, rgba(255, 255, 255, 0.68));
      background: var(--workspace2-tab-bg);
      font: 500 12px/1.2 var(--font-family, Arial, sans-serif);
      cursor: pointer;
      transition: background 120ms ease, border-color 120ms ease, color 120ms ease, box-shadow 120ms ease;
    }
    .workspace2-module-tab:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--workspace2-tab-hover-bg);
      border-color: color-mix(in srgb, var(--p-primary-color, var(--accent-color, #0A84FF)) 32%, var(--workspace2-border, rgba(255,255,255,.14)));
    }
    .workspace2-module-tab.is-active {
      color: var(--p-text-color, var(--fg-color, #f5f8ff));
      border-color: color-mix(in srgb, var(--workspace2-accent) 28%, var(--workspace2-border));
      background: var(--workspace2-tab-active-bg);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 8%, transparent), 0 0 0 1px rgba(0, 0, 0, 0.05);
    }
    .workspace2-module-tab.is-active::after {
      content: "";
      position: absolute;
      left: 12px;
      right: 12px;
      bottom: 4px;
      height: 2px;
      border-radius: 2px;
      background: var(--workspace2-accent-muted);
    }
    .workspace2-module-settings {
      min-width: 30px;
      min-height: 28px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--p-content-border-color, var(--border-color, rgba(255, 255, 255, 0.14)));
      border-radius: var(--p-border-radius, 6px);
      color: var(--p-text-muted-color, rgba(255, 255, 255, 0.62));
      background: transparent;
      cursor: pointer;
    }
    .workspace2-module-settings:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-list-option-hover-background, rgba(255, 255, 255, 0.075));
    }
    .workspace2-module-settings svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      fill: none;
    }
    .workspace2-module-body {
      position: relative;
      z-index: 1;
      flex: 1 1 auto;
      min-height: 0;
      overflow: hidden;
    }
    .workspace2-settings-backdrop {
      --workspace2-surface: var(--comfy-menu-bg, var(--p-content-background, var(--bg-color, #202124)));
      --workspace2-control-bg: var(--comfy-input-bg, var(--p-form-field-background, var(--workspace2-surface)));
      --workspace2-border: var(--border-color, var(--p-content-border-color, color-mix(in srgb, currentColor 18%, transparent)));
      --workspace2-muted: var(--descrip-text, var(--p-text-muted-color, color-mix(in srgb, currentColor 62%, transparent)));
      --workspace2-hover: var(--comfy-menu-hover-bg, var(--content-hover-bg, var(--p-list-option-hover-background, color-mix(in srgb, currentColor 7%, transparent))));
      --workspace2-accent: var(--p-primary-color, var(--accent-color, #0A84FF));
      position: fixed;
      inset: 0;
      z-index: 100002;
      background: rgba(0, 0, 0, 0.10);
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 8vh 16px 16px;
    }
    .workspace2-settings-dialog {
      width: min(430px, calc(100vw - 32px));
      max-height: min(720px, calc(100vh - 64px));
      overflow: auto;
      border: 1px solid var(--workspace2-border, rgba(255, 255, 255, 0.14));
      border-radius: 10px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--workspace2-surface);
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.42);
      padding: 12px;
    }
    .workspace2-settings-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      margin-bottom: 10px;
    }
    .workspace2-settings-title {
      font: 600 14px/1.3 var(--font-family, Arial, sans-serif);
    }
    .workspace2-settings-section {
      border-top: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 70%, transparent);
      padding: 10px 0;
    }
    .workspace2-settings-section-title {
      color: var(--workspace2-muted, rgba(255,255,255,.55));
      font: 600 11px/1.3 var(--font-family, Arial, sans-serif);
      margin-bottom: 8px;
    }
    .workspace2-settings-row {
      min-height: 30px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 4px 0;
      font-size: 12px;
    }
    .workspace2-settings-row.is-disabled {
      opacity: 0.52;
    }
    .workspace2-settings-mode-row.is-disabled {
      opacity: 1;
    }
    .workspace2-settings-mode-row.is-disabled .workspace2-settings-range {
      opacity: 0.42;
    }
    .workspace2-settings-mode-choice {
      min-width: 0;
      flex: 1 1 auto;
      font-weight: 500;
    }
    .workspace2-settings-mode-choice input {
      accent-color: var(--workspace2-accent);
    }
    .workspace2-settings-row label {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }
    .workspace2-settings-range {
      width: 148px;
      display: grid !important;
      grid-template-columns: minmax(0, 1fr) 24px;
      align-items: center;
      gap: 8px;
      cursor: default !important;
    }
    .workspace2-settings-range input {
      min-width: 0;
      width: 100%;
      accent-color: var(--workspace2-accent);
    }
    .workspace2-settings-range span {
      color: var(--workspace2-muted);
      text-align: right;
      font-size: 11px;
    }
    .workspace2-settings-help {
      color: var(--workspace2-muted, rgba(255,255,255,.55));
      font-size: 11px;
      line-height: 1.45;
      margin: 4px 0 8px;
    }
    .workspace2-confirm-backdrop {
      position: fixed;
      inset: 0;
      z-index: 100010;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 18px;
      background: rgba(0, 0, 0, 0.34);
    }
    .workspace2-confirm-dialog {
      width: min(360px, calc(100vw - 36px));
      border: 1px solid var(--workspace2-border, rgba(255, 255, 255, 0.14));
      border-radius: 12px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-content-background, var(--comfy-menu-bg, #202124));
      box-shadow: 0 18px 60px rgba(0, 0, 0, 0.44);
      padding: 14px;
    }
    .workspace2-confirm-title {
      font: 650 14px/1.35 var(--font-family, Arial, sans-serif);
      margin-bottom: 7px;
    }
    .workspace2-confirm-message {
      color: var(--p-text-muted-color, var(--workspace2-muted, rgba(255,255,255,.62)));
      font: 12px/1.55 var(--font-family, Arial, sans-serif);
      word-break: break-word;
      margin-bottom: 14px;
    }
    .workspace2-confirm-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .workspace2-confirm-button {
      min-height: 28px;
      padding: 0 12px;
      border: 1px solid var(--workspace2-border, rgba(255, 255, 255, 0.14));
      border-radius: 8px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-content-background, rgba(255, 255, 255, 0.05));
      cursor: pointer;
      font: 12px/1 var(--font-family, Arial, sans-serif);
    }
    .workspace2-confirm-button:hover {
      background: var(--p-list-option-hover-background, rgba(255, 255, 255, 0.08));
    }
    .workspace2-confirm-button.is-danger {
      border-color: color-mix(in srgb, var(--p-red-500, #ff453a) 58%, transparent);
      color: #fff;
      background: color-mix(in srgb, var(--p-red-500, #ff453a) 76%, #000);
    }
    .workspace2-confirm-button.is-danger:hover {
      background: color-mix(in srgb, var(--p-red-500, #ff453a) 88%, #000);
    }
    .workspace2-inline-confirm {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 6px;
      min-width: max-content;
    }
    .workspace2-inline-confirm-button {
      min-height: 24px;
      padding: 0 8px;
      border: 1px solid var(--workspace2-border, rgba(255, 255, 255, 0.14));
      border-radius: 7px;
      color: var(--p-text-muted-color, var(--workspace2-muted, rgba(255,255,255,.62)));
      background: color-mix(in srgb, var(--p-content-background, #202124) 88%, white);
      cursor: pointer;
      font: 12px/1 var(--font-family, Arial, sans-serif);
      white-space: nowrap;
    }
    .workspace2-inline-confirm-button:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--p-list-option-hover-background, rgba(255, 255, 255, 0.08));
    }
    .workspace2-inline-confirm-button.is-danger {
      border-color: color-mix(in srgb, var(--p-red-500, #ff453a) 55%, transparent);
      color: #fff;
      background: color-mix(in srgb, var(--p-red-500, #ff453a) 74%, #000);
    }
    .workspace2-inline-confirm-button.is-danger:hover {
      background: color-mix(in srgb, var(--p-red-500, #ff453a) 88%, #000);
    }
    .workspace2-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      min-height: 28px;
    }
    .workspace2-title {
      font-size: 14px;
      font-weight: 700;
    }
    .workspace2-status {
      opacity: 0.72;
      text-align: right;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-toolbar {
      display: grid;
      grid-template-columns: minmax(90px, 1fr) repeat(var(--workspace2-toolbar-actions, 6), 30px);
      gap: 6px;
      align-items: center;
    }
    .workspace2-search-wrap {
      position: relative;
      min-width: 0;
    }
    .workspace2-top {
      flex: 0 0 auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-bottom: 8px;
      border-bottom: 1px solid color-mix(in srgb, var(--workspace2-border) 62%, transparent);
      background: transparent;
      z-index: 20;
    }
    .workspace2-node-top {
      padding-bottom: 6px;
      border-bottom: 0;
    }
    .workspace2-input,
    .workspace2-button {
      min-height: 28px;
      border: 1px solid var(--workspace2-control-border-glass, var(--workspace2-border));
      border-radius: var(--workspace2-radius);
      color: inherit;
      background: var(--workspace2-control-bg-glass, var(--workspace2-control-bg));
      box-shadow: var(--workspace2-control-shadow-glass, none);
    }
    .workspace2-input {
      width: 100%;
      min-width: 0;
      padding: 4px 28px 4px 7px;
      user-select: text;
    }
    .workspace2-search-clear {
      position: absolute;
      right: 4px;
      top: 50%;
      width: 20px;
      height: 20px;
      border: 0;
      border-radius: 999px;
      padding: 3px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--workspace2-muted);
      background: transparent;
      transform: translateY(-50%);
      cursor: pointer;
    }
    .workspace2-search-clear:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--workspace2-hover);
    }
    .workspace2-search-clear[hidden] {
      display: none;
    }
    .workspace2-button {
      width: 30px;
      padding: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .workspace2-button:hover,
    .workspace2-icon-button:hover,
    .workspace2-menu-item:hover {
      background: var(--workspace2-hover-glass, var(--workspace2-hover));
    }
    .workspace2-button.is-trash-toggle {
      border-color: var(--workspace2-accent-border);
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-button.is-trash-toggle:hover,
    .workspace2-button.is-trash-toggle.is-active {
      border-color: var(--workspace2-accent);
      background: var(--workspace2-accent-mid);
    }
    .workspace2-node-sort-button[data-sort="alphabetical"] {
      border-color: var(--workspace2-accent-border);
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-workflow-sort-button:not([data-sort="nameAsc"]) {
      border-color: var(--workspace2-accent-border);
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-workflow-sort-button.is-custom-order {
      border-color: var(--workspace2-accent);
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-mid);
    }
    .workspace2-node-sort-button.is-custom-order {
      border-color: var(--workspace2-accent);
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-mid);
    }
    .workspace2-root {
      min-height: 28px;
      display: grid;
      grid-template-columns: 16px minmax(0, 1fr) auto;
      align-items: center;
      gap: 7px;
      padding: 4px 6px;
      border: 1px dashed transparent;
      border-radius: var(--workspace2-radius-sm);
      opacity: 0.82;
      overflow-wrap: anywhere;
    }
    .workspace2-root-label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-root-label.is-custom::after {
      content: "custom";
      margin-left: 6px;
      padding: 1px 5px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border) 80%, transparent);
      border-radius: 999px;
      font-size: 10px;
      opacity: .72;
      text-transform: uppercase;
    }
    .workspace2-tree {
      flex: 1 1 auto;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: var(--workspace2-node-list-gap);
      overflow: auto;
      border: 1px dashed transparent;
      border-radius: var(--workspace2-radius);
      padding-bottom: 18px;
      scrollbar-width: thin;
    }
    .workspace2-tree.is-drop {
      border-color: var(--workspace2-accent-border);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-row {
      min-height: var(--workspace2-row-height);
      display: grid;
      grid-template-columns: 16px 18px 18px minmax(0, 1fr) auto;
      align-items: center;
      gap: 4px;
      padding: 2px 5px 2px var(--indent);
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
      cursor: default;
      font-size: var(--workspace2-folder-font);
    }
    .workspace2-row.is-file {
      grid-template-columns: 16px 18px minmax(0, 1fr) auto;
      font-size: var(--workspace2-tree-font);
    }
    .workspace2-row.is-folder {
      font-weight: 500;
    }
    .workspace2-row.is-file .workspace2-spacer {
      display: none;
    }
    .workspace2-row:hover {
      background: var(--workspace2-hover-glass, var(--workspace2-hover));
    }
    .workspace2-row.is-selected {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent-border);
    }
    .workspace2-node-row.is-selected {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent-border);
    }
    .workspace2-template-row {
      min-height: var(--workspace2-node-row-height);
      display: grid;
      grid-template-columns: 18px minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      padding: calc(var(--workspace2-node-row-padding-y) + 1px) 7px;
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
      cursor: grab;
      font-size: var(--workspace2-node-font);
    }
    .workspace2-template-row:hover {
      background: var(--workspace2-hover);
      border-color: var(--workspace2-border);
    }
    .workspace2-template-row.is-selected {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent-border);
    }
    .workspace2-template-list > .workspace2-template-row {
      margin-left: var(--indent, 0px);
    }
    .workspace2-template-row:active {
      cursor: grabbing;
    }
    .workspace2-template-row svg {
      width: 16px;
      height: 16px;
      stroke: currentColor;
      fill: none;
      opacity: 0.78;
    }
    .workspace2-template-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 500;
    }
    .workspace2-template-info {
      min-width: 0;
    }
    .workspace2-template-meta {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--workspace2-muted);
      font-size: var(--workspace2-meta-font);
    }
    .workspace2-workflow-section {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .workspace2-workflow-section + .workspace2-workflow-section {
      margin-top: 18px;
    }
    .workspace2-workflow-section.is-browse {
      flex: 1 1 auto;
    }
    .workspace2-section-header {
      min-height: 24px;
      width: 100%;
      padding: 4px 5px 3px;
      border: 0;
      border-radius: 0;
      display: grid;
      grid-template-columns: auto minmax(0, auto) minmax(12px, 1fr) auto;
      align-items: center;
      gap: 7px;
      color: var(--workspace2-muted);
      background: transparent;
      font: 500 12px/1.2 var(--font-family, Arial, sans-serif);
      text-align: left;
    }
    .workspace2-section-header.is-interactive {
      cursor: pointer;
      appearance: none;
    }
    .workspace2-section-header.is-interactive:hover {
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: color-mix(in srgb, var(--workspace2-hover) 30%, transparent);
    }
    .workspace2-section-title {
      min-width: 0;
      white-space: nowrap;
    }
    .workspace2-section-line {
      height: 1px;
      min-width: 12px;
      background: color-mix(in srgb, var(--workspace2-border) 56%, transparent);
    }
    .workspace2-section-header.is-interactive:hover .workspace2-section-line {
      background: color-mix(in srgb, var(--workspace2-border) 78%, transparent);
    }
    .workspace2-section-header.is-interactive:hover .workspace2-section-disclosure {
      color: var(--workspace2-section-disclosure-hover-color);
    }
    .workspace2-section-disclosure {
      width: 16px;
      height: 16px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--workspace2-section-disclosure-color);
      opacity: 1;
      font-family: var(--font-family, Arial, sans-serif);
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      transition: color 120ms ease;
    }
    .workspace2-section-disclosure.is-hidden {
      display: none;
    }
    .workspace2-workflow-section-content {
      display: flex;
      flex-direction: column;
      min-height: 0;
    }
    .workspace2-workflow-section.is-browse .workspace2-workflow-section-content {
      flex: 1 1 auto;
    }
    .workspace2-workflow-section.is-collapsed .workspace2-workflow-section-content {
      display: none;
    }
    .workspace2-recent-workflows {
      display: flex;
      flex-direction: column;
      gap: 3px;
      margin: 0;
      padding: 2px 0 0;
    }
    .workspace2-current-workflow {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 8px;
      min-height: 25px;
      padding: 2px 4px 2px 6px;
      border-radius: var(--workspace2-radius-sm);
    }
    .workspace2-current-workflow:hover,
    .workspace2-current-workflow.is-selected {
      background: var(--workspace2-hover);
    }
    .workspace2-current-workflow-label {
      display: none;
      color: var(--workspace2-muted);
      font-size: var(--workspace2-meta-font);
      line-height: 1.2;
      padding: 0 6px 2px;
    }
    .workspace2-current-workflow-info {
      min-width: 0;
      padding: 0;
      border: 0;
      color: inherit;
      background: transparent;
      cursor: pointer;
      text-align: left;
    }
    .workspace2-current-workflow-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: var(--workspace2-tree-font);
      font-weight: 500;
    }
    .workspace2-current-workflow-name.is-empty {
      padding: 1px 6px;
      color: var(--workspace2-muted);
      font-weight: 400;
    }
    .workspace2-current-workflow .workspace2-actions {
      opacity: 1;
    }
    .workspace2-row.is-drop,
    .workspace2-root.is-drop,
    .workspace2-root-row.is-drop,
    [data-workspace2-favorite-target].is-drop,
    [data-workspace2-template-target].is-drop {
      border-color: var(--workspace2-accent);
      background: var(--workspace2-accent-strong);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 30%, transparent);
    }
    .workspace2-row.is-drop-region,
    .workspace2-node-row.is-drop-region,
    .workspace2-node-folder-header.is-drop-region,
    .workspace2-node-list.is-drop-region {
      background: color-mix(in srgb, var(--workspace2-accent) 14%, transparent);
      box-shadow: inset 2px 0 0 color-mix(in srgb, var(--workspace2-accent) 72%, transparent);
    }
    .workspace2-row.is-reorder-before,
    .workspace2-node-row.is-reorder-before {
      border-top-color: var(--workspace2-accent);
      box-shadow: inset 0 2px 0 var(--workspace2-accent);
    }
    .workspace2-row.is-reorder-after,
    .workspace2-node-row.is-reorder-after {
      border-bottom-color: var(--workspace2-accent);
      box-shadow: inset 0 -2px 0 var(--workspace2-accent);
    }
    .workspace2-disclosure {
      width: 18px;
      height: 22px;
      border: 0;
      color: inherit;
      background: transparent;
      cursor: pointer;
      opacity: 0.85;
      padding: 0;
    }
    .workspace2-disclosure::before {
      content: "";
      display: inline-block;
      width: 0;
      height: 0;
      border-top: 4px solid transparent;
      border-bottom: 4px solid transparent;
      border-left: 6px solid currentColor;
      transform: translateY(1px);
    }
    .workspace2-disclosure.is-open::before {
      transform: rotate(90deg) translateX(1px);
    }
    .workspace2-spacer {
      width: 18px;
      height: 22px;
    }
    .workspace2-reorder-spacer {
      width: 16px;
      height: 14px;
      display: inline-block;
    }
    .workspace2-folder-icon,
    .workspace2-file-icon,
    .workspace2-prime-icon,
    .workspace2-emoji-icon,
    .workspace2-reorder-handle {
      width: 16px;
      height: 14px;
      display: inline-block;
      position: relative;
      flex: 0 0 auto;
    }
    .workspace2-prime-icon,
    .workspace2-emoji-icon {
      color: var(--workspace2-icon-color, currentColor);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      line-height: 1;
    }
    .workspace2-emoji-icon {
      font-size: 13px;
    }
    .workspace2-folder-icon::before {
      content: "";
      position: absolute;
      left: 2px;
      top: 3px;
      width: 6px;
      height: 3px;
      border: 1.5px solid currentColor;
      border-bottom: 0;
      border-radius: 2px 2px 0 0;
      opacity: .7;
    }
    .workspace2-folder-icon::after {
      content: "";
      position: absolute;
      left: 1px;
      right: 1px;
      bottom: 1px;
      height: 10px;
      border: 1.5px solid currentColor;
      border-radius: 2px;
      opacity: .72;
    }
    .workspace2-file-icon::before {
      content: "";
      position: absolute;
      left: 5px;
      top: 5px;
      width: 6px;
      height: 6px;
      border-radius: 999px;
      background: var(--workspace2-muted);
      opacity: 0.9;
    }
    .workspace2-reorder-handle {
      display: inline-grid;
      place-items: center;
      cursor: grab;
      color: var(--workspace2-muted);
      opacity: 0.85;
      user-select: none;
      touch-action: none;
    }
    .workspace2-reorder-handle::before {
      content: "⋮⋮";
      font-size: 13px;
      line-height: 1;
      letter-spacing: 0;
      transform: rotate(90deg);
    }
    .workspace2-reorder-handle:hover,
    .workspace2-row.is-reordering .workspace2-reorder-handle {
      color: var(--workspace2-accent);
      opacity: 1;
    }
    .workspace2-name {
      min-width: 0;
      user-select: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-row.is-folder > .workspace2-name,
    .workspace2-node-folder-header > .workspace2-name {
      opacity: 1;
    }
    .workspace2-row.is-file > .workspace2-name,
    .workspace2-node-row .workspace2-name,
    .workspace2-template-name {
      opacity: .8;
    }
    .workspace2-meta {
      color: var(--workspace2-muted);
      opacity: 1;
      font-size: var(--workspace2-meta-font);
      margin-left: 6px;
    }
    .workspace2-actions {
      display: flex;
      gap: 4px;
      opacity: 0;
    }
    .workspace2-row:hover .workspace2-actions,
    .workspace2-row.is-selected .workspace2-actions,
    .workspace2-node-row:hover .workspace2-actions,
    .workspace2-node-row.is-selected .workspace2-actions,
    .workspace2-template-row:hover .workspace2-actions,
    .workspace2-node-folder-header:hover .workspace2-actions {
      opacity: 1;
    }
    .workspace2-panel.is-dragging,
    .workspace2-panel.is-dragging * {
      user-select: none !important;
      -webkit-user-select: none !important;
    }
    .workspace2-icon-button {
      min-width: 24px;
      height: 22px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border) 78%, transparent);
      border-radius: var(--workspace2-radius-sm);
      color: inherit;
      background: transparent;
      cursor: pointer;
      font-size: 11px;
      padding: 0 5px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .workspace2-button svg,
    .workspace2-icon-button svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .workspace2-icon-button.is-favorite-active {
      color: #ffd60a;
      border-color: rgba(255, 214, 10, 0.45);
      background: rgba(255, 214, 10, 0.08);
    }
    .workspace2-icon-button.is-favorite-active:hover {
      border-color: rgba(255, 214, 10, 0.65);
      background: rgba(255, 214, 10, 0.16);
    }
    .workspace2-icon-button.is-danger-action {
      color: var(--workspace2-muted);
    }
    .workspace2-icon-button.is-danger-action:hover {
      color: var(--workspace2-danger);
      border-color: var(--workspace2-danger-border);
      background: var(--workspace2-danger-soft);
    }
    .workspace2-rename-input {
      width: 100%;
      min-height: 22px;
      border: 1px solid var(--workspace2-accent);
      border-radius: var(--workspace2-radius-sm);
      color: inherit;
      background: var(--workspace2-control-bg);
      padding: 1px 5px;
      user-select: text;
    }
    .workspace2-empty {
      margin: 12px 4px;
      opacity: 0.65;
    }
    .workspace2-node-section {
      margin: 8px 0 10px;
    }
    .workspace2-node-tree > .workspace2-node-section + .workspace2-node-section {
      margin-top: 18px;
    }
    .workspace2-section-header .workspace2-meta {
      font-size: var(--workspace2-meta-font);
      margin-left: 0;
    }
    .workspace2-node-folder-header {
      min-height: var(--workspace2-row-height);
      display: grid;
      grid-template-columns: 18px 18px minmax(0, 1fr) auto;
      align-items: center;
      gap: 5px;
      padding: var(--workspace2-node-row-padding-y) 5px var(--workspace2-node-row-padding-y) var(--indent, 5px);
      border-radius: var(--workspace2-radius-sm);
      font-size: var(--workspace2-folder-font);
      font-weight: 500;
      cursor: pointer;
    }
    .workspace2-node-folder-header .workspace2-folder-icon {
      width: 16px;
      height: 14px;
    }
    .workspace2-node-folder-header:hover {
      background: var(--workspace2-hover);
    }
    .workspace2-node-list {
      display: flex;
      flex-direction: column;
      gap: var(--workspace2-node-list-gap);
    }
    .workspace2-node-list > .workspace2-node-row {
      margin-left: var(--indent, 0px);
    }
    .workspace2-node-folder-header + .workspace2-node-list .workspace2-node-row {
      margin-left: var(--indent, 18px);
    }
    .workspace2-node-row {
      min-height: var(--workspace2-node-row-height);
      display: grid;
      grid-template-columns: 16px 8px minmax(0, 1fr) auto;
      align-items: center;
      gap: 5px;
      padding: var(--workspace2-node-row-padding-y) 5px var(--workspace2-node-row-padding-y) 8px;
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
      font-size: var(--workspace2-node-font);
      user-select: none;
    }
    .workspace2-node-row:hover {
      background: var(--workspace2-hover);
    }
    .workspace2-node-row > svg {
      width: 15px;
      height: 15px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .workspace2-node-row.is-invalid {
      opacity: 0.55;
      color: color-mix(in srgb, var(--workspace2-muted) 78%, transparent);
    }
    .workspace2-node-row.is-invalid .workspace2-node-dot {
      opacity: .35;
    }
    .workspace2-node-row.is-invalid:hover {
      background: color-mix(in srgb, var(--workspace2-hover) 45%, transparent);
    }
    .workspace2-node-dot {
      width: 5px;
      height: 5px;
      border-radius: 999px;
      background: var(--workspace2-muted);
      opacity: 0.85;
      justify-self: center;
    }
    .workspace2-node-category {
      min-width: 0;
      color: var(--workspace2-muted);
      opacity: 1;
      font-size: var(--workspace2-meta-font);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-popover {
      position: fixed;
      width: min(360px, calc(100vw - 24px));
      max-height: min(560px, calc(100vh - 24px));
      overflow: auto;
      z-index: 12000;
      pointer-events: none;
      border: 1px solid #51535c;
      border-radius: 10px;
      padding: 10px 11px 12px;
      background: #111215;
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.34);
      font-size: 9px;
      color: var(--p-text-color, var(--fg-color, #f2f2f2));
    }
    .workspace2-node-preview-details {
      padding: 9px 2px 0;
    }
    .workspace2-node-preview-details-title {
      font-size: 13px;
      font-weight: 700;
      line-height: 1.25;
      margin-bottom: 4px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-header {
      min-height: 28px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0;
      background: transparent;
      border-bottom: 0;
    }
    .workspace2-node-preview-dot {
      width: 8px;
      height: 8px;
      flex: 0 0 8px;
      border-radius: 50%;
      background: var(--workspace2-accent);
      box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.08);
    }
    .workspace2-node-preview-title {
      font-size: 9.5px;
      font-weight: 500;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-body {
      padding: 0;
    }
    .workspace2-template-minimap {
      display: block;
      width: 100%;
      height: auto;
      margin-bottom: 8px;
      border: 1px solid #494c55;
      border-radius: 10px;
      background: #181a1f;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    }
    .workspace2-node-preview-card {
      margin-bottom: 0;
      overflow: hidden;
      border: 1px solid #494c55;
      border-radius: 12px;
      background: #282a2e;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.045);
    }
    .workspace2-node-preview-card + .workspace2-node-preview-card {
      margin-top: 8px;
    }
    .workspace2-node-preview-card-header {
      min-height: 31px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 6px 12px 3px;
      background: transparent;
      font-size: 11.5px;
    }
    .workspace2-node-preview-card-heading {
      min-width: 0;
      flex: 1 1 auto;
      display: flex;
      align-items: center;
      gap: 7px;
    }
    .workspace2-node-preview-card-chevron {
      width: 0;
      height: 0;
      flex: 0 0 auto;
      border-left: 4px solid transparent;
      border-right: 4px solid transparent;
      border-top: 5px solid #aeb0b5;
      opacity: 0.9;
    }
    .workspace2-node-preview-card-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #f0f0f2;
      font-weight: 650;
      line-height: 1.2;
    }
    .workspace2-node-preview-card-output {
      min-width: 0;
      flex: 0 1 64px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
      color: #bfc1c7;
      font-size: 11.5px;
      line-height: 1;
    }
    .workspace2-node-preview-card-output-name {
      min-width: 0;
      max-width: 48px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-card-body {
      padding: 3px 12px 10px;
    }
    .workspace2-node-preview-mini-row {
      min-height: 23px;
      display: grid;
      grid-template-columns: 8px minmax(58px, 0.56fr) minmax(130px, 1.44fr);
      align-items: center;
      gap: 8px;
    }
    .workspace2-node-preview-mini-row + .workspace2-node-preview-mini-row {
      margin-top: 1px;
    }
    .workspace2-node-preview-mini-port {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--workspace2-preview-port, #8b8b8b);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.42);
    }
    .workspace2-node-preview-mini-row.is-widget .workspace2-node-preview-mini-port {
      visibility: hidden;
    }
    .workspace2-node-preview-mini-label {
      min-width: 0;
      color: #bebfc4;
      font-size: 11.5px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-mini-widget {
      min-width: 0;
      height: 20px;
      border: 1px solid #33363d;
      border-radius: 7px;
      background: #303238;
      color: #aeb0b5;
      font-size: 10px;
      line-height: 18px;
      padding: 0 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-shadow:
        inset 0 1px 0 rgba(255, 255, 255, 0.04),
        0 1px 0 rgba(0, 0, 0, 0.25);
    }
    .workspace2-node-preview-mini-widget.is-empty {
      visibility: hidden;
    }
    .workspace2-node-preview-mini-widget.is-combo {
      position: relative;
      padding-right: 18px;
    }
    .workspace2-node-preview-mini-widget.is-combo::after {
      content: "";
      position: absolute;
      right: 7px;
      top: 50%;
      width: 0;
      height: 0;
      border-left: 3px solid transparent;
      border-right: 3px solid transparent;
      border-top: 4px solid #aeb0b5;
      transform: translateY(-35%);
      opacity: 0.82;
    }
    .workspace2-node-preview-mini-widget.is-boolean {
      width: 38px;
      justify-self: start;
      border-radius: 999px;
      padding: 0;
    }
    .workspace2-node-preview-mini-widget.is-boolean::before {
      content: "";
      display: block;
      width: 14px;
      height: 14px;
      margin: 2px;
      border-radius: 50%;
      background: #8f9299;
    }
    .workspace2-node-preview-mini-widget.is-number {
      width: min(96px, 100%);
      justify-self: start;
    }
    .workspace2-node-preview-mini-empty {
      min-height: 18px;
      color: var(--workspace2-muted);
      font-size: 11px;
    }
    .workspace2-node-preview-slot-row {
      min-height: 18px;
      display: grid;
      grid-template-columns: 8px minmax(0, 0.68fr) minmax(54px, 1fr) minmax(0, 0.68fr) 8px;
      align-items: center;
      gap: 4px;
    }
    .workspace2-node-preview-slot-row + .workspace2-node-preview-slot-row {
      margin-top: 2px;
    }
    .workspace2-node-preview-slot-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-slot-name.is-output {
      text-align: right;
    }
    .workspace2-node-preview-slot-type {
      min-width: 0;
      height: 16px;
      border-radius: 5px;
      background: color-mix(in srgb, var(--workspace2-border) 42%, transparent);
      color: transparent;
      opacity: 1;
      overflow: hidden;
      text-align: center;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-node-preview-widget-row {
      min-height: 18px;
      display: grid;
      grid-template-columns: 8px minmax(0, 0.68fr) minmax(54px, 1fr) 8px;
      align-items: center;
      gap: 4px;
      margin-top: 3px;
      color: color-mix(in srgb, var(--p-text-color, var(--fg-color, #fff)) 76%, transparent);
    }
    .workspace2-node-preview-widget-arrow {
      opacity: 0.55;
      text-align: center;
    }
    .workspace2-node-preview-meta {
      opacity: 0.58;
      overflow-wrap: anywhere;
      margin-bottom: 6px;
      font-size: 11px;
    }
    .workspace2-node-preview-desc {
      opacity: 0.82;
      margin: 6px 0;
      line-height: 1.3;
      font-size: 11px;
    }
    .workspace2-node-preview-section {
      margin-top: 11px;
      border-top: 1px solid #4d5058;
      padding-top: 9px;
    }
    .workspace2-node-preview-section-title {
      margin-bottom: 8px;
      color: #a4a6ad;
      font-size: 11px;
      font-weight: 700;
      text-transform: none;
    }
    .workspace2-node-preview-row {
      min-height: 23px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
    }
    .workspace2-node-preview-row + .workspace2-node-preview-row {
      margin-top: 1px;
    }
    .workspace2-node-preview-port {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: var(--workspace2-preview-port, #888);
    }
    .workspace2-node-preview-port.is-widget {
      border-radius: 2px;
    }
    .workspace2-node-preview-port.is-output {
      justify-self: end;
    }
    .workspace2-node-preview-name,
    .workspace2-node-preview-type {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 11px;
    }
    .workspace2-node-preview-name {
      color: #f0f0f2;
      font-weight: 650;
    }
    .workspace2-node-preview-type {
      color: #a3a5ab;
      opacity: 1;
      text-align: right;
      font-weight: 500;
    }
    .workspace2-canvas-group-list {
      flex: 1 1 auto;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .workspace2-canvas-group-row {
      min-height: 34px;
      display: grid;
      grid-template-columns: 12px minmax(0, 1fr) auto;
      align-items: center;
      gap: 6px;
      padding: 5px;
      border: 1px solid transparent;
      border-radius: var(--workspace2-radius-sm);
      font-size: var(--workspace2-tree-font);
    }
    .workspace2-canvas-group-row:hover {
      background: var(--workspace2-hover);
    }
    .workspace2-canvas-group-row.is-bypassed {
      opacity: 0.72;
    }
    .workspace2-canvas-group-swatch {
      width: 8px;
      height: 20px;
      border-radius: 999px;
      background: var(--workspace2-group-color, var(--workspace2-accent));
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.18);
    }
    .workspace2-canvas-group-title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-canvas-group-meta {
      color: var(--workspace2-muted);
      font-size: var(--workspace2-meta-font);
      white-space: nowrap;
    }
    .workspace2-trash-list {
      flex: 1 1 auto;
      overflow: auto;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .workspace2-trash-item {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto auto;
      gap: 6px;
      align-items: center;
      min-height: 38px;
      padding: 5px;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      font-size: var(--workspace2-tree-font);
    }
    .workspace2-trash-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
    }
    .workspace2-trash-meta {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.62;
      font-size: var(--workspace2-meta-font);
    }
    .workspace2-root-row {
      min-height: 32px;
      height: 32px;
      display: grid;
      grid-template-columns: minmax(0, 1fr) 156px;
      align-items: center;
      gap: 8px;
      padding: 0 8px;
      border: 1px solid color-mix(in srgb, var(--workspace2-accent) 24%, var(--workspace2-border));
      border-radius: var(--workspace2-radius);
      opacity: 0.96;
      background: color-mix(in srgb, var(--workspace2-accent) 7%, transparent);
      font-size: 12px;
    }
    .workspace2-root-row:hover,
    .workspace2-panel.is-dragging .workspace2-root-row {
      background: var(--workspace2-accent-mid);
      border-color: var(--workspace2-accent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 18%, transparent);
    }
    .workspace2-root-row.is-drop {
      background: var(--workspace2-accent-strong);
      border-color: var(--workspace2-accent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 28%, transparent), 0 0 0 1px color-mix(in srgb, var(--workspace2-accent) 18%, transparent);
    }
    .workspace2-root-row .workspace2-name {
      font-weight: 500;
    }
    .workspace2-root-target {
      min-width: 0;
      display: inline-flex;
      align-items: center;
      gap: 7px;
      overflow: hidden;
    }
    .workspace2-root-target svg {
      width: 15px;
      height: 15px;
      flex: 0 0 15px;
      stroke: currentColor;
      fill: none;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .workspace2-font-control {
      height: 28px;
      width: 156px;
      min-width: 156px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      gap: 5px;
      position: relative;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      white-space: nowrap;
    }
    .workspace2-font-control span {
      display: none;
      width: 18px;
      opacity: .72;
      font-size: 11px;
      text-align: center;
    }
    .workspace2-font-slider {
      width: 100%;
      min-width: 0;
      accent-color: var(--accent-color, #8ab4f8);
    }
    .workspace2-slider-value {
      position: absolute;
      right: 0;
      top: -22px;
      min-width: 34px;
      padding: 2px 6px;
      border-radius: var(--workspace2-radius-sm);
      color: var(--p-text-color, var(--fg-color, #fff));
      background: color-mix(in srgb, var(--workspace2-control-bg) 92%, black);
      border: 1px solid color-mix(in srgb, var(--workspace2-border) 80%, transparent);
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      font-size: 10px;
      line-height: 1.2;
      text-align: center;
      pointer-events: none;
      opacity: 0;
      transform: translateY(2px);
      transition: opacity 120ms ease, transform 120ms ease;
      z-index: 2;
    }
    .workspace2-font-control.is-adjusting .workspace2-slider-value,
    .workspace2-node-density.is-adjusting .workspace2-slider-value,
    .workspace2-font-control:focus-within .workspace2-slider-value,
    .workspace2-node-density:focus-within .workspace2-slider-value {
      opacity: 1;
      transform: translateY(0);
    }
    .workspace2-node-settings {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 6px;
    }
    .workspace2-node-density {
      width: 156px;
      min-width: 156px;
      height: 28px;
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      align-items: center;
      gap: 6px;
      position: relative;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      font-size: var(--workspace2-meta-font);
      white-space: nowrap;
    }
    .workspace2-node-root-row {
      grid-template-columns: minmax(0, 1fr) 156px;
    }
    .workspace2-node-density input {
      width: 100%;
      min-width: 0;
      accent-color: var(--workspace2-accent);
    }
    .workspace2-node-density span:last-child {
      display: none;
      opacity: .72;
      text-align: right;
    }
    .workspace2-node-tabs {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      min-height: 27px;
      padding: 8px 0 0;
      border: 0;
      border-top: 1px solid color-mix(in srgb, var(--workspace2-border) 72%, transparent);
      border-radius: 0;
      background: transparent;
    }
    .workspace2-node-tab {
      min-width: 0;
      min-height: 23px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      border: 0;
      border-radius: var(--workspace2-radius-sm);
      color: var(--workspace2-muted);
      background: transparent;
      cursor: pointer;
      font-size: var(--workspace2-meta-font);
      opacity: .72;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      padding: 3px 6px;
    }
    .workspace2-node-tab::before {
      display: none;
      content: none;
    }
    .workspace2-node-tab:hover {
      background: var(--workspace2-hover);
      opacity: .9;
    }
    .workspace2-node-tab.is-active {
      background: var(--workspace2-accent-soft);
      color: var(--workspace2-accent);
      opacity: 1;
      font-weight: 500;
    }
    .workspace2-node-tab.is-active::before {
      background: currentColor;
      box-shadow: inset 0 0 0 2px var(--workspace2-control-bg);
    }
    .workspace2-node-range {
      height: 28px;
      display: grid;
      grid-template-columns: auto minmax(44px, 1fr) 18px;
      align-items: center;
      gap: 6px;
      min-width: 0;
      padding: 0 7px;
      border: 1px solid var(--workspace2-border);
      border-radius: var(--workspace2-radius-sm);
      background: var(--workspace2-control-bg);
      white-space: nowrap;
      font-size: var(--workspace2-meta-font);
    }
    .workspace2-node-range input {
      min-width: 0;
      width: 100%;
      accent-color: var(--workspace2-accent);
    }
    .workspace2-node-range span:last-child {
      opacity: .72;
      text-align: right;
    }
    .workspace2-empty-trash-row {
      color: var(--workspace2-danger);
      border-color: var(--workspace2-danger-border);
      background: var(--workspace2-danger-soft);
    }
    .workspace2-empty-trash-row:hover {
      background: var(--workspace2-danger-mid);
      border-color: var(--workspace2-danger);
    }
    .workspace2-context {
      position: fixed;
      z-index: 100000;
      min-width: 160px;
      padding: 4px;
      border: 1px solid var(--border-color, #555);
      border-radius: 6px;
      background: var(--comfy-menu-bg, #202124);
      box-shadow: 0 10px 30px rgba(0,0,0,.35);
    }
    .workspace2-menu-item {
      display: block;
      width: 100%;
      min-height: 28px;
      border: 0;
      border-radius: 4px;
      color: inherit;
      background: transparent;
      text-align: left;
      padding: 5px 9px;
      cursor: pointer;
    }
    .workspace2-menu-divider {
      height: 1px;
      margin: 4px 6px;
      background: color-mix(in srgb, var(--workspace2-border) 80%, transparent);
    }
    .workspace2-menu-check-item {
      position: relative;
      padding-left: 25px;
    }
    .workspace2-menu-check-item.is-active::before {
      content: "✓";
      position: absolute;
      left: 9px;
      top: 5px;
      color: var(--workspace2-accent);
      font-weight: 700;
    }
    .workspace2-menu-item.is-active {
      color: var(--workspace2-accent);
      background: var(--workspace2-accent-soft);
    }
    .workspace2-menu-item:disabled {
      opacity: 0.45;
      cursor: default;
    }
    .workspace2-personalize-panel {
      position: fixed;
      z-index: 100002;
      width: 282px;
      padding: 10px;
      border: 1px solid var(--workspace2-border, rgba(255,255,255,.14));
      border-radius: 10px;
      color: var(--p-text-color, var(--fg-color, #ddd));
      background: var(--workspace2-surface, var(--comfy-menu-bg, #202124));
      box-shadow: 0 14px 34px rgba(0,0,0,.42);
      display: flex;
      flex-direction: column;
      gap: 10px;
      font: 12px/1.35 var(--font-family, Arial, sans-serif);
    }
    .workspace2-personalize-title {
      font-size: 13px;
      font-weight: 700;
    }
    .workspace2-personalize-preview {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 32px;
      padding: 6px 8px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 70%, transparent);
      border-radius: 8px;
      background: color-mix(in srgb, var(--workspace2-hover, rgba(255,255,255,.075)) 60%, transparent);
    }
    .workspace2-personalize-preview-name {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .workspace2-personalize-label {
      color: var(--workspace2-muted, rgba(255,255,255,.55));
      font-size: 11px;
    }
    .workspace2-personalize-grid {
      display: grid;
      grid-template-columns: repeat(8, 1fr);
      gap: 5px;
    }
    .workspace2-personalize-choice,
    .workspace2-personalize-swatch {
      min-width: 0;
      height: 25px;
      border: 1px solid color-mix(in srgb, var(--workspace2-border, rgba(255,255,255,.14)) 80%, transparent);
      border-radius: 7px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
    }
    .workspace2-personalize-choice.is-active,
    .workspace2-personalize-swatch.is-active {
      border-color: var(--workspace2-accent, #0A84FF);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--workspace2-accent, #0A84FF) 45%, transparent);
    }
    .workspace2-personalize-swatch {
      background: var(--workspace2-swatch-color, transparent);
    }
    .workspace2-personalize-color-row {
      display: grid;
      grid-template-columns: 1fr 38px;
      gap: 7px;
      align-items: center;
    }
    .workspace2-personalize-color-row input[type="color"] {
      width: 38px;
      height: 28px;
      padding: 0;
      border: 1px solid var(--workspace2-border, rgba(255,255,255,.14));
      border-radius: 7px;
      background: transparent;
    }
    .workspace2-personalize-actions {
      display: flex;
      justify-content: flex-end;
      gap: 6px;
    }
    .workspace2-personalize-actions button {
      min-height: 27px;
      border: 1px solid var(--workspace2-border, rgba(255,255,255,.14));
      border-radius: 7px;
      color: inherit;
      background: var(--workspace2-control-bg, #111);
      cursor: pointer;
      padding: 3px 9px;
    }
    .workspace2-personalize-actions button.is-primary {
      border-color: var(--workspace2-accent, #0A84FF);
      background: var(--workspace2-accent, #0A84FF);
      color: white;
    }
    .workspace2-drag-ghost {
      position: fixed;
      z-index: 100001;
      pointer-events: none;
      max-width: 280px;
      padding: 5px 9px;
      border: 1px solid var(--accent-color, #8ab4f8);
      border-radius: 5px;
      color: var(--fg-color, #ddd);
      background: var(--comfy-menu-bg, #202124);
      box-shadow: 0 8px 24px rgba(0,0,0,.35);
      opacity: 0.92;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `;
  document.head.append(style);
}

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
    state.items = data.items || [];
    state.root = data.root || "";
    state.officialRoot = data.official_root || "";
    state.folderMeta = data.folder_meta || {};
    state.isOfficialRoot = data.is_official_root !== false;
    state.signature = workflowSignature(state.items);
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

function parentPath(path) {
  const index = path.lastIndexOf("/");
  return index === -1 ? "" : path.slice(0, index);
}

function normalizeMetaPath(path) {
  return String(path || "").replace(/\\/g, "/");
}

function isPrimeIconClass(icon) {
  return /^pi(\s|$)/.test(String(icon || "").trim());
}

function applyDecoratedIcon(element, icon, color, fallbackClass) {
  const value = String(icon || "").trim();
  element.className = "";
  element.textContent = "";
  element.style.removeProperty("--workspace2-icon-color");
  if (color) {
    element.style.setProperty("--workspace2-icon-color", String(color));
  }
  if (value && !isPrimeIconClass(value)) {
    element.className = "workspace2-emoji-icon";
    element.textContent = value;
    return;
  }
  element.className = `workspace2-prime-icon ${value || fallbackClass}`;
}

const PERSONALIZE_EMOJIS = ["📁", "⭐", "🔖", "🏷️", "🔥", "🖼️", "🎨", "🧩", "⚙️", "📦", "📝", "❤️", "💡", "🎬", "🧠", "✨"];
const PERSONALIZE_COLORS = ["", "#0A84FF", "#30D158", "#FF9F0A", "#FF453A", "#BF5AF2", "#FF375F", "#FFD60A", "#8E8E93"];

function closePersonalizationPanel() {
  const panel = document.querySelector(".workspace2-personalize-panel");
  if (panel?.workspace2CloseHandler) {
    document.removeEventListener("pointerdown", panel.workspace2CloseHandler, true);
    document.removeEventListener("keydown", panel.workspace2CloseHandler, true);
  }
  panel?.remove();
}

function clampFloatingPanel(left, top, width = 282, height = 360) {
  const margin = 10;
  return {
    left: Math.min(Math.max(margin, left), Math.max(margin, window.innerWidth - width - margin)),
    top: Math.min(Math.max(margin, top), Math.max(margin, window.innerHeight - height - margin)),
  };
}

function openPersonalizationPanel(options) {
  closePersonalizationPanel();
  const {
    title = t("folder.personalizeTitle"),
    name = "",
    icon = "",
    color = "",
    anchor = null,
    onApply,
    onReset,
  } = options || {};
  let selectedIcon = String(icon || "").trim();
  let selectedColor = String(color || "").trim();

  const panel = document.createElement("div");
  panel.className = "workspace2-personalize-panel";
  const anchorRect = anchor?.getBoundingClientRect?.();
  const x = Number(anchor?.clientX ?? anchorRect?.left ?? window.innerWidth / 2);
  const y = Number(anchor?.clientY ?? anchorRect?.bottom ?? window.innerHeight / 2);
  const pos = clampFloatingPanel(x, y);
  panel.style.left = `${pos.left}px`;
  panel.style.top = `${pos.top}px`;
  panel.addEventListener("pointerdown", (event) => event.stopPropagation(), true);
  panel.addEventListener("click", (event) => event.stopPropagation());
  panel.addEventListener("contextmenu", (event) => event.preventDefault());

  const heading = document.createElement("div");
  heading.className = "workspace2-personalize-title";
  heading.textContent = title;

  const preview = document.createElement("div");
  preview.className = "workspace2-personalize-preview";
  const previewIcon = document.createElement("span");
  const previewName = document.createElement("div");
  previewName.className = "workspace2-personalize-preview-name";
  previewName.textContent = name || title;
  preview.append(previewIcon, previewName);

  const iconLabel = document.createElement("div");
  iconLabel.className = "workspace2-personalize-label";
  iconLabel.textContent = t("folder.personalizeIcon");
  const iconGrid = document.createElement("div");
  iconGrid.className = "workspace2-personalize-grid";

  const colorLabel = document.createElement("div");
  colorLabel.className = "workspace2-personalize-label";
  colorLabel.textContent = t("folder.personalizeColor");
  const colorGrid = document.createElement("div");
  colorGrid.className = "workspace2-personalize-grid";

  const colorRow = document.createElement("div");
  colorRow.className = "workspace2-personalize-color-row";
  const colorText = document.createElement("div");
  colorText.className = "workspace2-personalize-label";
  colorText.textContent = "Color";
  const colorInput = document.createElement("input");
  colorInput.type = "color";
  colorInput.value = /^#[0-9a-f]{6}$/i.test(selectedColor) ? selectedColor : "#0A84FF";
  colorRow.append(colorText, colorInput);

  const refresh = () => {
    applyDecoratedIcon(previewIcon, selectedIcon, selectedColor, DEFAULT_FOLDER_ICON_CLASS);
    iconGrid.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.icon === selectedIcon);
    });
    colorGrid.querySelectorAll("button").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.color === selectedColor);
    });
  };

  const defaultIcon = document.createElement("button");
  defaultIcon.type = "button";
  defaultIcon.className = "workspace2-personalize-choice";
  defaultIcon.textContent = "∅";
  defaultIcon.title = t("folder.personalizeDefault");
  defaultIcon.dataset.icon = "";
  defaultIcon.addEventListener("click", () => {
    selectedIcon = "";
    refresh();
  });
  iconGrid.append(defaultIcon);
  for (const emoji of PERSONALIZE_EMOJIS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workspace2-personalize-choice";
    button.textContent = emoji;
    button.dataset.icon = emoji;
    button.addEventListener("click", () => {
      selectedIcon = emoji;
      refresh();
    });
    iconGrid.append(button);
  }

  for (const swatch of PERSONALIZE_COLORS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "workspace2-personalize-swatch";
    button.title = swatch || t("folder.personalizeDefault");
    button.dataset.color = swatch;
    if (swatch) {
      button.style.setProperty("--workspace2-swatch-color", swatch);
    } else {
      button.textContent = "∅";
    }
    button.addEventListener("click", () => {
      selectedColor = swatch;
      if (swatch) {
        colorInput.value = swatch;
      }
      refresh();
    });
    colorGrid.append(button);
  }
  colorInput.addEventListener("input", () => {
    selectedColor = colorInput.value;
    refresh();
  });

  const actions = document.createElement("div");
  actions.className = "workspace2-personalize-actions";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = t("folder.personalizeCancel");
  cancel.addEventListener("click", closePersonalizationPanel);
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = t("folder.personalizeReset");
  reset.addEventListener("click", async () => {
    try {
      await onReset?.();
      closePersonalizationPanel();
    } catch (error) {
      console.error("[Workspace2] personalize reset failed", error);
    }
  });
  const apply = document.createElement("button");
  apply.type = "button";
  apply.className = "is-primary";
  apply.textContent = t("folder.personalizeApply");
  apply.addEventListener("click", async () => {
    try {
      await onApply?.({ icon: selectedIcon, color: selectedColor });
      closePersonalizationPanel();
    } catch (error) {
      console.error("[Workspace2] personalize apply failed", error);
    }
  });
  actions.append(cancel, reset, apply);

  panel.append(heading, preview, iconLabel, iconGrid, colorLabel, colorGrid, colorRow, actions);
  document.body.append(panel);
  refresh();

  panel.workspace2CloseHandler = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      closePersonalizationPanel();
      return;
    }
    if (event.type === "pointerdown" && !panel.contains(event.target)) {
      closePersonalizationPanel();
    }
  };
  setTimeout(() => {
    document.addEventListener("pointerdown", panel.workspace2CloseHandler, true);
    document.addEventListener("keydown", panel.workspace2CloseHandler, true);
  }, 0);
}

function workflowFolderMeta(path) {
  return state.folderMeta?.[normalizeMetaPath(path)] || {};
}

async function saveWorkflowFolderMeta(el, path, patch) {
  const key = normalizeMetaPath(path);
  const nextMeta = { ...(state.folderMeta || {}) };
  const nextValue = { ...(nextMeta[key] || {}), ...patch };
  for (const field of ["icon", "color"]) {
    if (!String(nextValue[field] || "").trim()) {
      delete nextValue[field];
    }
  }
  if (nextValue.icon || nextValue.color) {
    nextMeta[key] = nextValue;
  } else {
    delete nextMeta[key];
  }
  const data = await postJson("/workspace2/folder-meta", { folder_meta: nextMeta });
  state.folderMeta = data.folder_meta || nextMeta;
  renderPanel(el);
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

async function resetWorkflowFolderStyle(el, item) {
  await saveWorkflowFolderMeta(el, item.path, { icon: "", color: "" });
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

function openNodeCacheDb() {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(new Error("IndexedDB is not available."));
      return;
    }
    const request = indexedDB.open(NODE_OBJECT_INFO_CACHE_DB, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(NODE_OBJECT_INFO_CACHE_STORE, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB."));
  });
}

async function readCachedObjectInfo() {
  let db;
  try {
    db = await openNodeCacheDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(NODE_OBJECT_INFO_CACHE_STORE, "readonly");
      const store = tx.objectStore(NODE_OBJECT_INFO_CACHE_STORE);
      const request = store.get(NODE_OBJECT_INFO_CACHE_KEY);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error || new Error("Failed to read node cache."));
    });
  } finally {
    db?.close?.();
  }
}

async function writeCachedObjectInfo(objectInfo, signature = "") {
  if (!objectInfo || typeof objectInfo !== "object" || Array.isArray(objectInfo)) {
    return;
  }
  let db;
  try {
    db = await openNodeCacheDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(NODE_OBJECT_INFO_CACHE_STORE, "readwrite");
      const store = tx.objectStore(NODE_OBJECT_INFO_CACHE_STORE);
      store.put({
        key: NODE_OBJECT_INFO_CACHE_KEY,
        updatedAt: Date.now(),
        count: Object.keys(objectInfo).length,
        signature: String(signature || ""),
        objectInfo,
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to write node cache."));
      tx.onabort = () => reject(tx.error || new Error("Node cache write was aborted."));
    });
  } finally {
    db?.close?.();
  }
}

async function clearCachedObjectInfo() {
  let db;
  try {
    db = await openNodeCacheDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(NODE_OBJECT_INFO_CACHE_STORE, "readwrite");
      tx.objectStore(NODE_OBJECT_INFO_CACHE_STORE).delete(NODE_OBJECT_INFO_CACHE_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("Failed to clear node cache."));
      tx.onabort = () => reject(tx.error || new Error("Node cache clear was aborted."));
    });
    nodesState.objectInfoCachedAt = 0;
    nodesState.objectInfoFromCache = false;
    nodesState.objectInfo = null;
    nodesState.library = null;
    nodesState.nodeDefinitionsCache = null;
    nodesState.nodeDefinitionMapCache = null;
    nodesState.nodeDefinitionsSource = null;
  } finally {
    db?.close?.();
  }
}

function readWorkflowCustomOrder() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WORKFLOW_ORDER_KEY) || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveWorkflowCustomOrder() {
  localStorage.setItem(WORKFLOW_ORDER_KEY, JSON.stringify(state.customOrder || {}));
}

function replaceWorkflowPathPrefix(value, oldPath, newPath) {
  const text = String(value || "");
  if (!text || !oldPath || text === newPath) {
    return text;
  }
  if (text === oldPath) {
    return newPath;
  }
  return text.startsWith(`${oldPath}/`) ? `${newPath}${text.slice(oldPath.length)}` : text;
}

function workflowPathIsWithin(path, parent) {
  const value = String(path || "");
  const prefix = String(parent || "");
  return Boolean(prefix) && (value === prefix || value.startsWith(`${prefix}/`));
}

function commitLocalWorkflowItems(items) {
  state.items = items;
  state.signature = workflowSignature(items);
}

function addLocalWorkflowItem(item) {
  commitLocalWorkflowItems([
    ...state.items.filter((entry) => entry.path !== item.path),
    item,
  ]);
}

function remapLocalWorkflowItems(oldPath, newPath) {
  const nextName = String(newPath || "").split("/").pop() || newPath;
  commitLocalWorkflowItems(state.items.map((entry) => {
    if (!workflowPathIsWithin(entry.path, oldPath)) {
      return entry;
    }
    const path = replaceWorkflowPathPrefix(entry.path, oldPath, newPath);
    return {
      ...entry,
      path,
      name: entry.path === oldPath ? nextName : entry.name,
      updated_at: Date.now(),
    };
  }));
}

function removeLocalWorkflowItems(path) {
  commitLocalWorkflowItems(
    state.items.filter((entry) => !workflowPathIsWithin(entry.path, path)),
  );
}

function remapWorkflowPathState(oldPath, newPath) {
  if (!oldPath || !newPath || oldPath === newPath) {
    return;
  }

  if (state.selectedPath) {
    state.selectedPath = replaceWorkflowPathPrefix(state.selectedPath, oldPath, newPath);
  }
  if (state.editingPath) {
    state.editingPath = replaceWorkflowPathPrefix(state.editingPath, oldPath, newPath);
  }

  state.expanded = new Set([...state.expanded].map((path) => replaceWorkflowPathPrefix(path, oldPath, newPath)));

  const nextOrder = {};
  for (const [parent, order] of Object.entries(state.customOrder || {})) {
    const nextParent = replaceWorkflowPathPrefix(parent, oldPath, newPath);
    nextOrder[nextParent] = Array.isArray(order)
      ? order.map((path) => replaceWorkflowPathPrefix(path, oldPath, newPath))
      : order;
  }
  state.customOrder = nextOrder;
  saveWorkflowCustomOrder();
  updateRecentWorkflowPath(oldPath, newPath);
}

function removeWorkflowPathState(path) {
  if (!path) {
    return;
  }
  if (workflowPathIsWithin(state.selectedPath, path)) {
    state.selectedPath = "";
  }
  if (workflowPathIsWithin(state.editingPath, path)) {
    state.editingPath = "";
  }
  state.expanded = new Set(
    [...state.expanded].filter((entry) => !workflowPathIsWithin(entry, path)),
  );
  const nextOrder = {};
  for (const [parent, order] of Object.entries(state.customOrder || {})) {
    if (workflowPathIsWithin(parent, path)) {
      continue;
    }
    nextOrder[parent] = Array.isArray(order)
      ? order.filter((entry) => !workflowPathIsWithin(entry, path))
      : order;
  }
  state.customOrder = nextOrder;
  saveWorkflowCustomOrder();
  removeRecentWorkflowTree(path);
}

function buildTree() {
  const root = {
    type: "folder",
    name: "Root",
    path: "",
    children: [],
  };
  const folders = new Map([["", root]]);

  for (const item of state.items) {
    if (item.type !== "folder") {
      continue;
    }
    folders.set(item.path, { ...item, children: [] });
  }

  const sortedFolders = [...folders.values()]
    .filter((item) => item.path)
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const folder of sortedFolders) {
    const parent = folders.get(parentPath(folder.path)) || root;
    parent.children.push(folder);
  }

  for (const item of state.items) {
    if (item.type !== "file") {
      continue;
    }
    const parent = folders.get(parentPath(item.path)) || root;
    parent.children.push({ ...item, children: [] });
  }

  sortTree(root);
  return root;
}

function sortTree(node) {
  node.children.sort((a, b) => {
    if (state.folderFirst && a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    if (state.customOrderEnabled) {
      return compareWorkflowItems(a, b, node.path || "");
    }
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return compareWorkflowItems(a, b);
  });
  for (const child of node.children) {
    if (child.type === "folder") {
      sortTree(child);
    }
  }
}

function compareWorkflowItems(a, b, parent = "") {
  const nameCompare = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  const updatedA = Number(a.updated_at || 0);
  const updatedB = Number(b.updated_at || 0);
  if (state.customOrderEnabled) {
    const order = Array.isArray(state.customOrder?.[parent]) ? state.customOrder[parent] : [];
    const indexA = order.indexOf(a.path);
    const indexB = order.indexOf(b.path);
    if (indexA !== -1 || indexB !== -1) {
      if (indexA === -1) {
        return 1;
      }
      if (indexB === -1) {
        return -1;
      }
      return indexA - indexB;
    }
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
  }
  if (state.sort === "nameDesc") {
    return -nameCompare;
  }
  if (state.sort === "updatedDesc") {
    return (updatedB - updatedA) || nameCompare;
  }
  if (state.sort === "updatedAsc") {
    return (updatedA - updatedB) || nameCompare;
  }
  return nameCompare;
}

function workflowSearchFields(node) {
  const displayName = workflowDisplayName(node);
  const pathText = String(node?.path || "");
  const parentText = parentPath(pathText);
  const pathParts = pathText.split("/").filter(Boolean);
  return compactSearchFields([
    displayName,
    node?.name,
    splitCamelCase(displayName),
    pathText,
    parentText,
    ...pathParts,
  ], [
    displayName,
    node?.name,
    pathText,
    parentText,
    ...pathParts,
  ]);
}

function workflowMatchesSelf(node, query) {
  return genericSearchScores(workflowSearchFields(node), query)[0] < 9;
}

function matchesQuery(node, query) {
  if (!query) {
    return true;
  }
  if (workflowMatchesSelf(node, query)) {
    return true;
  }
  return node.children?.some((child) => matchesQuery(child, query));
}

function visibleChildren(node) {
  const query = state.query.trim().toLowerCase();
  if (!query) {
    return node.children;
  }
  return node.children.filter((child) => matchesQuery(child, query));
}

function getTreeScrollTop(el) {
  return el.querySelector(".workspace2-tree")?.scrollTop || 0;
}

function restoreTreeScrollTop(el, scrollTop) {
  if (!Number.isFinite(scrollTop)) {
    return;
  }
  requestAnimationFrame(() => {
    const tree = el.querySelector(".workspace2-tree");
    if (tree) {
      tree.scrollTop = scrollTop;
    }
  });
}

function setExpandedRecursive(expandedSet, keys, shouldExpand) {
  for (const key of keys) {
    if (!key) {
      continue;
    }
    if (shouldExpand) {
      expandedSet.add(key);
    } else {
      expandedSet.delete(key);
    }
  }
}

function workflowFolderKeys(node) {
  const keys = [];
  if (!node || node.type !== "folder") {
    return keys;
  }
  if (node.path) {
    keys.push(node.path);
  }
  for (const child of node.children || []) {
    keys.push(...workflowFolderKeys(child));
  }
  return keys;
}

function toggleWorkflowFolder(el, node, recursive = false) {
  if (!node || node.type !== "folder") {
    return;
  }
  const isOpen = state.expanded.has(node.path);
  if (recursive) {
    setExpandedRecursive(state.expanded, workflowFolderKeys(node), !isOpen);
  } else if (isOpen) {
    state.expanded.delete(node.path);
  } else {
    state.expanded.add(node.path);
  }
  renderPanel(el);
}

async function refreshPanel(el, options = {}) {
  await loadWorkflows();
  renderPanel(el);
  restoreTreeScrollTop(el, options.scrollTop);
}

function handleError(el, error) {
  state.status = t("status.error", { message: error.message });
  renderPanel(el);
}

function officialWorkflowPath(path) {
  return `workflows/${String(path || "").replace(/^\/+/, "")}`;
}

async function openWorkflowFromOfficialStore(path) {
  if (!state.isOfficialRoot) {
    return false;
  }

  const workflowStore = app.extensionManager?.workflow;
  if (!workflowStore?.getWorkflowByPath) {
    return false;
  }

  const storePath = officialWorkflowPath(path);
  let workflow = workflowStore.getWorkflowByPath(storePath);
  if (!workflow && typeof workflowStore.syncWorkflows === "function") {
    await workflowStore.syncWorkflows();
    workflow = workflowStore.getWorkflowByPath(storePath);
  }
  if (!workflow) {
    return false;
  }

  const loadFromRemote = !workflow.isLoaded;
  if (loadFromRemote && typeof workflow.load === "function") {
    await workflow.load();
  }

  const workflowData = workflow.activeState || (workflow.content ? JSON.parse(workflow.content) : null);
  if (!workflowData) {
    return false;
  }

  await app.loadGraphData(workflowData, true, true, workflow, {
    checkForRerouteMigration: false,
    deferWarnings: true,
    skipAssetScans: !loadFromRemote,
  });
  return true;
}

async function openWorkflow(path) {
  let opened = false;
  try {
    opened = await openWorkflowFromOfficialStore(path);
  } catch (error) {
    console.debug("[Workspace2] Official workflow open failed; using fallback", error);
  }

  if (!opened) {
    const data = await fetchJson(`/workspace2/workflow/read?path=${encodeURIComponent(path)}`);
    await app.loadGraphData(data.workflow);
  }
  state.selectedPath = path;
  recordRecentWorkflow(path);
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

async function saveCurrentWorkflowToPath(el, path) {
  if (!path || path !== state.selectedPath) {
    throw new Error(t("status.workflowSaveMismatch"));
  }
  const workflow = serializeCurrentWorkflow();
  if (!workflow) {
    throw new Error(t("status.workflowSerializeUnavailable"));
  }
  await postJson("/workspace2/workflow/save", { path, workflow });
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
  state.status = t("status.folderCreated");
  renderPanel(el);
  refreshOfficialWorkflowsDeferred(250);
}

function selectedFolderPath() {
  const selected = state.items.find((item) => item.path === state.selectedPath);
  return selected?.type === "folder" ? selected.path : "";
}

function joinPath(parent, name) {
  return parent ? `${parent}/${name}` : name;
}

function workflowRenameTargetPath(item, newName) {
  const parent = parentPath(item.path);
  let name = String(newName || "").trim();
  if (item.type === "file" && !name.toLowerCase().endsWith(".json")) {
    name = `${name}.json`;
  }
  return joinPath(parent, name);
}

function relativeWorkflowPathFromOfficial(path) {
  return String(path || "").replace(/^workflows\/+/, "");
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
  if (!newName || newName === item.name) {
    state.editingPath = "";
    renderPanel(el);
    return;
  }
  const oldPath = item.path;
  const wasSelected = state.selectedPath === oldPath;
  let nextPath = workflowRenameTargetPath(item, newName);
  const conflict = state.items.some((entry) =>
    entry.path !== oldPath && entry.path.toLowerCase() === nextPath.toLowerCase()
  );
  if (conflict) {
    throw new Error("Target already exists");
  }

  const workflowStore = app.extensionManager?.workflow;
  const officialWorkflow = state.isOfficialRoot && item.type === "file"
    ? workflowStore?.getWorkflowByPath?.(officialWorkflowPath(oldPath))
    : null;
  if (officialWorkflow && typeof workflowStore?.renameWorkflow === "function") {
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
  state.status = t("status.renamed");
  if (wasSelected) {
    state.selectedPath = nextPath;
    recordRecentWorkflow(nextPath);
  }
  if (!officialWorkflow) {
    refreshOfficialWorkflowsDeferred(500);
  }
  renderPanel(el);
}

async function moveItem(el, sourcePath, targetFolder) {
  const source = state.items.find((entry) => entry.path === sourcePath);
  const data = await postJson("/workspace2/move", {
    source_path: sourcePath,
    target_folder: targetFolder,
  });
  const nextPath = data?.path || joinPath(
    targetFolder,
    source?.name || sourcePath.split("/").pop(),
  );
  remapLocalWorkflowItems(sourcePath, nextPath);
  remapWorkflowPathState(sourcePath, nextPath);
  state.expanded.add(targetFolder);
  state.status = targetFolder ? t("status.movedTo", { target: targetFolder }) : t("status.movedToRoot");
  renderPanel(el);
  refreshOfficialWorkflowsDeferred(250);
}

async function moveToTrash(el, item) {
  const scrollTop = getTreeScrollTop(el);
  await postJson("/workspace2/trash/move", { path: item.path });
  removeLocalWorkflowItems(item.path);
  removeWorkflowPathState(item.path);
  state.status = t("status.movedToTrash");
  renderPanel(el);
  restoreTreeScrollTop(el, scrollTop);
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
    const items = data.items || [];
    const nextSignature = workflowSignature(items);
    if (nextSignature !== state.signature) {
      state.items = items;
      state.root = data.root || state.root;
      state.officialRoot = data.official_root || state.officialRoot;
      state.folderMeta = data.folder_meta || state.folderMeta || {};
      state.isOfficialRoot = data.is_official_root !== false;
      state.signature = nextSignature;
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

function emptyNodeLibrary() {
  return {
    version: 2,
    groups: [
      {
        id: NODE_DEFAULT_GROUP_ID,
        name: t("nodes.defaultGroup"),
        order: 0,
        collapsed: false,
      },
    ],
    favorites: [],
    settings: {
      searchMode: "basic",
      enablePinyinSearch: false,
      enableFuzzySearch: false,
      sortMode: "manual",
      showOriginalCategory: true,
      showNodeType: true,
    },
    migration: {
      nSidebarImported: false,
      nSidebarImportedAt: 0,
    },
  };
}

function normalizeNodeLibrary(library) {
  const fallback = emptyNodeLibrary();
  if (!library || typeof library !== "object") {
    return fallback;
  }
  const groups = (Array.isArray(library.groups) && library.groups.length ? library.groups : fallback.groups).map((group, index) => ({
    id: String(group.id || `group-${index}`),
    name: String(group.name || group.id || `Group ${index + 1}`),
    parentId: String(group.parentId || ""),
    order: Number(group.order ?? index),
    collapsed: Boolean(group.collapsed),
    icon: String(group.icon || ""),
    color: String(group.color || ""),
  }));
  if (!groups.some((group) => group.id === NODE_DEFAULT_GROUP_ID)) {
    groups.unshift(fallback.groups[0]);
  }
  const groupIds = new Set(groups.map((group) => group.id));
  for (const group of groups) {
    if (group.id === NODE_DEFAULT_GROUP_ID || !groupIds.has(group.parentId) || group.parentId === group.id) {
      group.parentId = "";
    }
  }
  const favorites = Array.isArray(library.favorites)
    ? library.favorites
        .filter((favorite) => favorite?.type)
        .map((favorite, index) => ({
          type: String(favorite.type),
          title: String(favorite.title || favorite.type),
          alias: String(favorite.alias || ""),
          groupId: groupIds.has(favorite.groupId) ? favorite.groupId : NODE_DEFAULT_GROUP_ID,
          order: Number(favorite.order ?? index),
          rating: Number(favorite.rating || 0),
          useCount: Number(favorite.useCount || 0),
          lastUsed: Number(favorite.lastUsed || 0),
          addedAt: Number(favorite.addedAt || Date.now()),
          invalid: Boolean(favorite.invalid),
          source: String(favorite.source || "manual"),
        }))
    : [];
  return {
    ...fallback,
    ...library,
    groups,
    favorites,
    settings: { ...fallback.settings, ...(library.settings || {}) },
    migration: { ...fallback.migration, ...(library.migration || {}) },
  };
}

async function loadNodeLibrary() {
  if (nodesState.loadPromise) {
    return nodesState.loadPromise;
  }
  nodesState.loadPromise = loadNodeLibraryInternal().finally(() => {
    nodesState.loadPromise = null;
  });
  return nodesState.loadPromise;
}

async function loadNodeLibraryInternal() {
  const finish = startPerformanceSpan("nodes.initial-load");
  nodesState.loading = true;
  nodesState.objectInfoLoading = true;
  nodesState.error = "";
  nodesState.objectInfoError = "";
  try {
    const [libraryData, nodeFrequencyData, cachedObjectInfo, signatureData] = await Promise.all([
      measurePromise("nodes.library-request", () => fetchJson("/workspace2/nodes/library")),
      measurePromise(
        "nodes.frequency-map-request",
        () => fetchStaticJson("/assets/sorted-custom-node-map.json").catch(() => ({})),
      ),
      measurePromise(
        "nodes.indexeddb-read",
        () => readCachedObjectInfo().catch((error) => {
          console.debug("[Workspace2] Node cache read failed", error);
          return null;
        }),
      ),
      measurePromise(
        "nodes.signature-request",
        () => fetchJson("/workspace2/nodes/index-signature").catch((error) => {
          console.debug("[Workspace2] Node signature request failed", error);
          return null;
        }),
      ),
    ]);
    nodesState.library = normalizeNodeLibrary(libraryData.library);
    nodesState.nodeFrequencyLookup = nodeFrequencyData && typeof nodeFrequencyData === "object" ? nodeFrequencyData : {};
    if (cachedObjectInfo?.objectInfo && typeof cachedObjectInfo.objectInfo === "object") {
      nodesState.objectInfo = cachedObjectInfo.objectInfo;
      nodesState.objectInfoCachedAt = Number(cachedObjectInfo.updatedAt || 0);
      nodesState.objectInfoFromCache = true;
    }
    const nodeIndexSignature = String(signatureData?.signature || "");
    const cacheIsCurrent = Boolean(
      nodeIndexSignature
      && cachedObjectInfo?.signature === nodeIndexSignature
      && cachedObjectInfo?.objectInfo,
    );
    nodesState.nodeDefinitionsCache = null;
    nodesState.nodeDefinitionMapCache = null;
    nodesState.nodeDefinitionsSource = null;
    nodesState.loading = false;
    nodesState.objectInfoLoading = !cacheIsCurrent;
    if (nodesState.renderTarget?.isConnected) {
      renderNodesPanel(nodesState.renderTarget);
    }
    finish({
      cachedNodeCount: Object.keys(nodesState.objectInfo || {}).length,
      cacheHit: Boolean(cachedObjectInfo?.objectInfo),
      cacheCurrent: cacheIsCurrent,
    });
    if (!cacheIsCurrent) {
      refreshFullObjectInfoCoordinated(nodeIndexSignature).catch((error) => {
        nodesState.objectInfoError = error.message || String(error);
        nodesState.objectInfoLoading = false;
      });
    }
  } catch (error) {
    nodesState.error = error.message;
    nodesState.library = emptyNodeLibrary();
    nodesState.objectInfo = {};
    nodesState.nodeFrequencyLookup = {};
    nodesState.nodeDefinitionsCache = null;
    nodesState.nodeDefinitionMapCache = null;
    nodesState.nodeDefinitionsSource = null;
    nodesState.loading = false;
    nodesState.objectInfoLoading = false;
    finish({ error: error?.message || String(error) }, "error");
  }
}

function applyCachedObjectInfo(cachedObjectInfo) {
  if (!cachedObjectInfo?.objectInfo || typeof cachedObjectInfo.objectInfo !== "object") {
    return false;
  }
  nodesState.objectInfo = cachedObjectInfo.objectInfo;
  nodesState.objectInfoCachedAt = Number(cachedObjectInfo.updatedAt || 0);
  nodesState.objectInfoFromCache = true;
  nodesState.nodeDefinitionsCache = null;
  nodesState.nodeDefinitionMapCache = null;
  nodesState.nodeDefinitionsSource = null;
  return true;
}

async function refreshFullObjectInfoCoordinated(signature) {
  return withNodeIndexRefreshLock(async () => {
    const latestCache = await readCachedObjectInfo().catch(() => null);
    if (signature && latestCache?.signature === signature && applyCachedObjectInfo(latestCache)) {
      nodesState.objectInfoLoading = false;
      if (nodesState.renderTarget?.isConnected) {
        renderNodesPanel(nodesState.renderTarget);
      }
      return;
    }
    await loadFullObjectInfo(signature);
  });
}

async function loadFullObjectInfo(signature = "") {
  const finish = startPerformanceSpan("nodes.object-info-refresh");
  try {
    const objectInfoData = await measurePromise(
      "nodes.object-info-request",
      () => fetchJsonWithTimeout("/object_info"),
    );
    nodesState.objectInfo = objectInfoData || {};
    nodesState.objectInfoCachedAt = Date.now();
    nodesState.objectInfoFromCache = false;
    nodesState.nodeDefinitionsCache = null;
    nodesState.nodeDefinitionMapCache = null;
    nodesState.nodeDefinitionsSource = null;
    nodesState.objectInfoError = "";
    await measurePromise(
      "nodes.indexeddb-write",
      () => writeCachedObjectInfo(nodesState.objectInfo, signature),
    );
    finish({ nodeCount: Object.keys(nodesState.objectInfo).length });
  } catch (error) {
    nodesState.objectInfoError = error.message || String(error);
    finish({ error: nodesState.objectInfoError }, "error");
  } finally {
    nodesState.objectInfoLoading = false;
    if (nodesState.renderTarget?.isConnected) {
      renderNodesPanel(nodesState.renderTarget);
    }
  }
}

async function saveNodeLibrary(el) {
  const data = await postJson("/workspace2/nodes/library", { library: nodesState.library });
  nodesState.library = normalizeNodeLibrary(data.library);
  if (el) {
    renderNodesPanel(el);
  }
}

function emptyTemplateLibrary() {
  return {
    version: 1,
    groups: [],
    templates: [],
    settings: {},
  };
}

function normalizeTemplateLibrary(library) {
  const fallback = emptyTemplateLibrary();
  if (!library || typeof library !== "object") {
    return fallback;
  }
  const groups = Array.isArray(library.groups)
    ? library.groups.map((group, index) => ({
        id: String(group.id || `group-${index}`),
        name: String(group.name || group.id || `Group ${index + 1}`),
        parentId: String(group.parentId || ""),
        order: Number(group.order ?? index),
        collapsed: Boolean(group.collapsed),
        icon: String(group.icon || ""),
        color: String(group.color || ""),
      }))
    : [];
  const groupIds = new Set(groups.map((group) => group.id));
  for (const group of groups) {
    if (group.parentId === group.id || !groupIds.has(group.parentId)) {
      group.parentId = "";
    }
  }
  const templates = Array.isArray(library.templates)
    ? library.templates
        .filter((template) => template?.id && template?.name)
        .map((template, index) => ({
          id: String(template.id),
          name: String(template.name),
          groupId: groupIds.has(template.groupId) ? String(template.groupId) : "",
          order: Number(template.order ?? index),
          nodes: Array.isArray(template.nodes) ? template.nodes : [],
          links: Array.isArray(template.links) ? template.links : [],
          bounds: template.bounds && typeof template.bounds === "object" ? template.bounds : {},
          createdAt: Number(template.createdAt || Date.now()),
          updatedAt: Number(template.updatedAt || Date.now()),
          useCount: Number(template.useCount || 0),
          lastUsed: Number(template.lastUsed || 0),
          source: String(template.source || "workspace2"),
        }))
    : [];
  return {
    ...fallback,
    ...library,
    groups,
    templates,
    settings: { ...fallback.settings, ...(library.settings || {}) },
  };
}

async function loadTemplateLibrary() {
  const finish = startPerformanceSpan("templates.load");
  templatesState.loading = true;
  templatesState.error = "";
  try {
    const data = await fetchJson("/workspace2/templates/library");
    templatesState.library = normalizeTemplateLibrary(data.library);
    finish({ templateCount: templatesState.library.templates.length });
  } catch (error) {
    templatesState.error = error.message;
    templatesState.library = emptyTemplateLibrary();
    finish({ error: templatesState.error }, "error");
  } finally {
    templatesState.loading = false;
  }
}

async function saveTemplateLibrary(el) {
  const data = await postJson("/workspace2/templates/library", { library: templatesState.library });
  templatesState.library = normalizeTemplateLibrary(data.library);
  if (el?.isConnected) {
    renderTemplatesPanel(el);
  }
}

function uniqueTemplateGroupName(baseName = t("templates.defaultGroupName")) {
  const existing = new Set((templatesState.library?.groups || []).map((group) => String(group.name || "").toLowerCase()));
  let name = baseName;
  let index = 2;
  while (existing.has(name.toLowerCase())) {
    name = `${baseName} ${index}`;
    index += 1;
  }
  return name;
}

function getTemplateGroup(groupId) {
  return (templatesState.library?.groups || []).find((group) => group.id === groupId) || null;
}

function childTemplateGroups(parentId = "") {
  return [...(templatesState.library?.groups || [])]
    .filter((group) => (group.parentId || "") === parentId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

function templateGroupKeys(groupId) {
  const keys = [];
  const group = getTemplateGroup(groupId);
  if (!group) {
    return keys;
  }
  keys.push(group.id);
  for (const child of childTemplateGroups(group.id)) {
    keys.push(...templateGroupKeys(child.id));
  }
  return keys;
}

function isTemplateGroupDescendant(groupId, possibleAncestorId) {
  let current = getTemplateGroup(groupId);
  const visited = new Set();
  while (current?.parentId) {
    if (current.parentId === possibleAncestorId) {
      return true;
    }
    if (visited.has(current.parentId)) {
      return false;
    }
    visited.add(current.parentId);
    current = getTemplateGroup(current.parentId);
  }
  return false;
}

function normalizeTemplateOrders(groupId = "") {
  (templatesState.library?.templates || [])
    .filter((template) => (template.groupId || "") === groupId)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .forEach((template, index) => {
      template.order = index;
    });
}

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

function selectedGraphNodes() {
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

function serializeSelectedTemplate(name = "") {
  const selectedNodes = selectedGraphNodes();
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

async function saveSelectedNodesAsTemplate(el = templatesState.renderTarget) {
  if (!templatesState.library) {
    await loadTemplateLibrary();
  }
  const selectedNodes = selectedGraphNodes();
  if (!selectedNodes.length) {
    alert(t("templates.selectNodesFirst"));
    return null;
  }
  const template = serializeSelectedTemplate(uniqueTemplateName(defaultTemplateName(selectedNodes)));
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

async function saveSelectedNodesAsTemplateFromShortcut() {
  try {
    const template = await saveSelectedNodesAsTemplate(null);
    if (!template) {
      return;
    }
    templatesState.editingTemplateId = template.id;
    if (isWorkspace2AltCOpenTemplatesEnabled()) {
      openWorkspace2Module("templates");
    } else if (templatesState.renderTarget?.isConnected) {
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

function templateSearchFields(template) {
  const nodeFields = (template.nodes || []).flatMap((node) => [
    node?.title,
    node?.type,
    splitCamelCase(node?.type || ""),
  ]);
  return compactSearchFields([
    template.name,
    ...nodeFields,
  ], [
    template.name,
    ...nodeFields,
  ]);
}

function templateMatchesQuery(template, query) {
  if (!query) {
    return true;
  }
  return genericSearchScores(templateSearchFields(template), query)[0] < 9;
}

function sortedVisibleTemplates() {
  const query = templatesState.query.trim().toLocaleLowerCase();
  const templates = [...(templatesState.library?.templates || [])]
    .filter((template) => templateMatchesQuery(template, query));
  if (query) {
    templates.sort((a, b) => compareSearchScores(
      genericSearchScores(templateSearchFields(a), query),
      genericSearchScores(templateSearchFields(b), query),
    ) || a.name.localeCompare(b.name));
  } else {
    templates.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
  }
  return templates;
}

function compareTemplatesBySort(a, b, query = "") {
  if (query) {
    return compareSearchScores(
      genericSearchScores(templateSearchFields(a), query),
      genericSearchScores(templateSearchFields(b), query),
    ) || a.name.localeCompare(b.name);
  }
  if (templatesState.sort === "nameAsc") {
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
  }
  if (templatesState.sort === "nameDesc") {
    return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" });
  }
  if (templatesState.sort === "updatedDesc") {
    return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0) || a.name.localeCompare(b.name);
  }
  if (templatesState.sort === "updatedAsc") {
    return Number(a.updatedAt || a.createdAt || 0) - Number(b.updatedAt || b.createdAt || 0) || a.name.localeCompare(b.name);
  }
  return a.order - b.order || a.name.localeCompare(b.name);
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
  templatesState.library.templates = templatesState.library.templates.filter((item) => item.id !== template.id);
  templatesState.editingTemplateId = "";
  await saveTemplateLibrary(el);
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
  if (templatesState.contextMenuCloseHandler) {
    window.removeEventListener("pointerdown", templatesState.contextMenuCloseHandler, true);
    document.removeEventListener("pointerdown", templatesState.contextMenuCloseHandler, true);
    window.removeEventListener("keydown", templatesState.contextMenuCloseHandler, true);
    templatesState.contextMenuCloseHandler = null;
  }
  templatesState.contextMenuElement?.remove();
  templatesState.contextMenuElement = null;
  const context = templatesState.contextMenu;
  if (!context) {
    return;
  }
  const { template, x, y } = context;
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("contextmenu", (event) => event.preventDefault());

  const addItem = (label, onClick) => {
    const button = document.createElement("button");
    button.className = "workspace2-menu-item";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async () => {
      closeTemplateContextMenu();
      try {
        await onClick();
      } catch (error) {
        templatesState.error = error.message;
        renderTemplatesPanel(el);
      }
    });
    menu.append(button);
  };

  addItem(t("templates.rename"), () => {
    templatesState.editingTemplateId = template.id;
    renderTemplatesPanel(el);
  });
  addItem(t("templates.placeCenter"), () => placeTemplateAtCanvasCenter(el, template));
  addItem(t("templates.copyName"), () => copyText(template.name));
  addItem(t("templates.delete"), () => requestDeleteTemplate(el, template));

  document.body.append(menu);
  templatesState.contextMenuElement = menu;

  const closeHandler = (event) => {
    if (event.type === "keydown" && event.key !== "Escape") {
      return;
    }
    if (menu.contains(event.target)) {
      return;
    }
    closeTemplateContextMenu();
  };
  templatesState.contextMenuCloseHandler = closeHandler;
  setTimeout(() => {
    if (templatesState.contextMenuCloseHandler !== closeHandler) {
      return;
    }
    window.addEventListener("pointerdown", closeHandler, true);
    document.addEventListener("pointerdown", closeHandler, true);
    window.addEventListener("keydown", closeHandler, true);
  }, 0);
}

function readDraggedTemplate(event) {
  const raw = event.dataTransfer?.getData(TEMPLATE_DRAG_TYPE);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return templatesState.draggingTemplate;
    }
  }
  return templatesState.draggingTemplate;
}

function readDraggedTemplateGroup(event) {
  const raw = event.dataTransfer?.getData(TEMPLATE_GROUP_DRAG_TYPE);
  if (!raw) {
    return templatesState.draggingGroupId ? { id: templatesState.draggingGroupId } : null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return templatesState.draggingGroupId ? { id: templatesState.draggingGroupId } : null;
  }
}

function makeTemplateGroupDragSource(row, group) {
  row.draggable = true;
  row.addEventListener("dragstart", (event) => {
    if (event.target.closest("button,input,.workspace2-actions,.workspace2-disclosure")) {
      event.preventDefault();
      return;
    }
    templatesState.draggingGroupId = group.id;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData(TEMPLATE_GROUP_DRAG_TYPE, JSON.stringify({ id: group.id }));
    event.dataTransfer.setData("text/plain", group.name);
    row.closest(".workspace2-panel")?.classList.add("is-dragging");
  });
  row.addEventListener("dragend", () => {
    templatesState.draggingGroupId = "";
    row.closest(".workspace2-panel")?.classList.remove("is-dragging");
  });
}

function makeTemplateDropTarget(el, target, groupId = "", beforeTemplateId = "") {
  target.dataset.workspace2TemplateTarget = groupId;
  target.dataset.workspace2TemplateBefore = beforeTemplateId;
  target.addEventListener("dragover", (event) => {
    const template = readDraggedTemplate(event);
    const group = readDraggedTemplateGroup(event);
    if (!template?.id && !group?.id) {
      return;
    }
    if (group?.id && (group.id === groupId || isTemplateGroupDescendant(groupId, group.id))) {
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
    const template = readDraggedTemplate(event);
    const group = readDraggedTemplateGroup(event);
    target.classList.remove("is-drop");
    if (!template?.id && !group?.id) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    try {
      if (group?.id) {
        await moveTemplateGroupToParent(el, group.id, groupId);
      } else {
        await moveTemplateToGroup(el, template.id, groupId, beforeTemplateId);
      }
    } catch (error) {
      templatesState.error = error.message;
      renderTemplatesPanel(el);
    }
  });
}

function toggleTemplateGroup(el, groupId, recursive = false) {
  const isOpen = templatesState.expanded.has(groupId);
  if (recursive) {
    setExpandedRecursive(templatesState.expanded, templateGroupKeys(groupId), !isOpen);
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
  event.preventDefault();
  event.stopPropagation();
  closeTemplateContextMenu();
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
      closeTemplateContextMenu();
      try {
        await handler();
      } catch (error) {
        templatesState.error = error.message;
        renderTemplatesPanel(el);
      }
    });
    menu.append(button);
  };

  addItem(t("menu.newSubfolder"), () => createTemplateGroup(el, group.id));
  addItem(t("templates.renameGroup"), () => {
    templatesState.editingGroupId = group.id;
    renderTemplatesPanel(el);
  });
  addItem(t("folder.personalize"), () => personalizeTemplateGroup(el, group, event));
  addItem(t("folder.resetStyle"), () => resetTemplateGroupStyle(el, group));
  addItem(t("templates.deleteGroup"), () => requestDeleteTemplateGroup(el, group));

  document.body.append(menu);
  const rect = menu.getBoundingClientRect();
  const left = Math.min(event.clientX, window.innerWidth - rect.width - 8);
  const top = Math.min(event.clientY, window.innerHeight - rect.height - 8);
  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
  templatesState.contextMenuElement = menu;
  window.setTimeout(() => {
    document.addEventListener("pointerdown", closeTemplateContextMenuFromEvent, { once: true, capture: true });
    document.addEventListener("keydown", closeTemplateContextMenuFromEvent, { once: true, capture: true });
  }, 0);
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
  const categoryParts = normalizeNodeCategory(definition?.category || "");
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
    source: NODE_SOURCE.UNKNOWN,
    definition,
  };
}

function getNodeDefinitions() {
  const objectInfoSource = nodesState.objectInfo && Object.keys(nodesState.objectInfo).length
    ? nodesState.objectInfo
    : globalThis.LiteGraph?.registered_node_types || {};
  if (nodesState.nodeDefinitionsCache && nodesState.nodeDefinitionsSource === objectInfoSource) {
    return nodesState.nodeDefinitionsCache;
  }

  let definitions;
  if (nodesState.objectInfo && Object.keys(nodesState.objectInfo).length) {
    definitions = Object.entries(nodesState.objectInfo)
      .map(([type, definition]) => wrapObjectInfoNode(type, definition))
      .sort((a, b) => a.title.localeCompare(b.title));
  } else {
    definitions = Object.entries(objectInfoSource)
      .map(([type, definition]) => wrapRegisteredNode(type, definition))
      .sort((a, b) => a.title.localeCompare(b.title));
  }
  nodesState.nodeDefinitionsSource = objectInfoSource;
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

function getFavorite(type) {
  return nodesState.library?.favorites?.find((favorite) => favorite.type === type) || null;
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

function pinyinText(value, mode = "full") {
  const text = String(value || "");
  if (!text || !/[\u3400-\u9fff]/.test(text)) {
    return "";
  }
  try {
    return pinyinPro(text, {
      pattern: mode === "initial" ? "first" : "pinyin",
      toneType: "none",
      type: "string",
    }).replace(/\s/g, "").toLowerCase();
  } catch {
    return "";
  }
}

function pinyinSearchText(values) {
  return values
    .flatMap((value) => [pinyinText(value, "full"), pinyinText(value, "initial")])
    .filter(Boolean)
    .join(" ");
}

function nodePinyinSearchText(node, groupName = "") {
  const values = [
    node?.title,
    node?.alias,
    node?.category,
    nodeGroupLabel(node),
    ...officialNodeCategoryParts(node),
    groupName,
    ...(Array.isArray(node?.searchAliases) ? node.searchAliases : []),
  ];
  return pinyinSearchText(values);
}

function fuzzySearchMatch(value, query) {
  const haystack = String(value || "").replace(/\s+/g, "");
  const needle = String(query || "").replace(/\s+/g, "");
  if (!haystack || !needle) {
    return false;
  }
  let index = 0;
  for (const char of haystack) {
    if (char === needle[index]) {
      index += 1;
      if (index === needle.length) {
        return true;
      }
    }
  }
  return false;
}

const nodeSearchFieldCache = new WeakMap();

function compactSearchFields(values, pinyinValues = []) {
  const fields = values.filter((value) => String(value || "").trim());
  const pinyin = pinyinSearchText(pinyinValues);
  if (pinyin) {
    fields.push(pinyin);
  }
  return fields;
}

function getNodeFrequencyByName(nodeName) {
  return Number(nodesState.nodeFrequencyLookup?.[nodeName] || 0);
}

function officialSearchWords(value) {
  return String(value || "")
    .split(/ |\b|(?<=[a-z])(?=[A-Z])|(?=[A-Z][a-z])/)
    .map((item) => item.toLocaleLowerCase())
    .filter(Boolean);
}

function officialCalcAuxSingle(query, item, score = 0) {
  const text = String(item || "").toLocaleLowerCase();
  const itemWords = officialSearchWords(item);
  const queryParts = String(query || "").split(" ").filter(Boolean);
  let main = 9;
  let aux1 = 0;
  let aux2 = 0;

  if (text === query) {
    main = 0;
  } else if (text.startsWith(query)) {
    main = 1;
    aux2 = text.length;
  } else if (itemWords.includes(query)) {
    main = 2;
    aux1 = text.indexOf(query) + text.length * 0.5;
    aux2 = text.length;
  } else if (text.includes(query)) {
    main = 3;
    aux1 = text.indexOf(query) + text.length * 0.5;
    aux2 = text.length;
  } else if (queryParts.length && queryParts.every((part) => itemWords.includes(part))) {
    const indexes = queryParts.map((part) => itemWords.indexOf(part));
    const min = Math.min(...indexes);
    const max = Math.max(...indexes);
    main = 4;
    aux1 = max - min + max * 0.5 + text.length * 0.5;
    aux2 = text.length;
  } else if (queryParts.length && queryParts.every((part) => text.includes(part))) {
    const min = Math.min(...queryParts.map((part) => text.indexOf(part)));
    const max = Math.max(...queryParts.map((part) => text.indexOf(part) + part.length));
    main = 5;
    aux1 = max - min + max * 0.5 + text.length * 0.5;
    aux2 = text.length;
  }

  const lengthPenalty = 0.2 * (1 - Math.min(text.length, query.length) / Math.max(text.length, query.length));
  return [main, aux1, aux2, score + (Number.isFinite(lengthPenalty) ? lengthPenalty : 0)];
}

function compareSearchScores(a, b) {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1) {
    if (a[index] !== b[index]) {
      return a[index] - b[index];
    }
  }
  return a.length - b.length;
}

function genericSearchScores(fields, query, frequencyScore = 0) {
  const normalized = String(query || "").trim().toLocaleLowerCase();
  if (!normalized) {
    return [0, frequencyScore, 0, 0, 0];
  }
  const scores = fields
    .map((value) => officialCalcAuxSingle(normalized, value, 0))
    .sort(compareSearchScores);
  const best = scores[0] || [9, 0, 0, 1];
  const deprecatedPenalty = fields
    .some((value) => String(value || "").toLocaleLowerCase().includes("deprecated")) && best[0] !== 0 ? 5 : 0;
  return [best[0] + deprecatedPenalty, frequencyScore, ...best.slice(1)];
}

function officialNodeSearchFields(node, groupName = "") {
  let fieldsByGroup = nodeSearchFieldCache.get(node);
  if (!fieldsByGroup) {
    fieldsByGroup = new Map();
    nodeSearchFieldCache.set(node, fieldsByGroup);
  }
  const cacheKey = String(groupName || "");
  if (fieldsByGroup.has(cacheKey)) {
    return fieldsByGroup.get(cacheKey);
  }
  const aliases = Array.isArray(node?.searchAliases) ? node.searchAliases : [];
  const fields = compactSearchFields([
    node?.type,
    splitCamelCase(node?.type),
    node?.title,
    node?.alias,
    ...aliases,
  ], [
    node?.title,
    node?.alias,
    node?.category,
    nodeGroupLabel(node),
    ...officialNodeCategoryParts(node),
    groupName,
    ...aliases,
  ]);
  fieldsByGroup.set(cacheKey, fields);
  return fields;
}

function officialNodeSearchScores(node, query, groupName = "") {
  return genericSearchScores(officialNodeSearchFields(node, groupName), query, -getNodeFrequencyByName(node?.type));
}

function packNodeSearchScores(scores) {
  return scores.reduce((total, score, index) => total + score * Math.pow(1000, Math.max(0, 5 - index)), 0);
}

function compareNodeSearchResults(a, b, query, groupName = "") {
  const normalized = String(query || "").trim().toLocaleLowerCase();
  if (!normalized) {
    const freqDiff = getNodeFrequencyByName(b.type) - getNodeFrequencyByName(a.type);
    return freqDiff || a.title.localeCompare(b.title);
  }
  return compareSearchScores(
    officialNodeSearchScores(a, normalized, groupName),
    officialNodeSearchScores(b, normalized, groupName),
  ) || a.title.localeCompare(b.title);
}

function sortNodeSearchResults(nodes, query, groupName = "") {
  const normalized = String(query || "").trim().toLocaleLowerCase();
  if (!normalized) {
    return nodes.sort((a, b) => compareNodeSearchResults(a, b, ""));
  }
  return nodes.sort((a, b) => compareNodeSearchResults(a, b, normalized, groupName));
}

function nodeSearchText(node, groupName = "") {
  return [
    node.title,
    node.type,
    splitCamelCase(node.type),
    node.alias,
    node.category,
    node.pythonModule,
    groupName,
    nodePinyinSearchText(node, groupName),
    ...(node.searchAliases || []),
  ]
    .filter(Boolean)
    .join(" ");
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
  const id = `group-${Date.now().toString(36)}`;
  const order = nodesState.library.groups.length;
  nodesState.library.groups.push({
    id,
    name: uniqueNodeGroupName(),
    parentId: normalizedParentId,
    order,
    collapsed: false,
  });
  if (normalizedParentId) {
    nodesState.expanded.add(normalizedParentId);
  }
  nodesState.expanded.add(id);
  nodesState.editingGroupId = id;
  await saveNodeLibrary(el);
}

function uniqueNodeGroupName(baseName = t("nodes.defaultGroupName")) {
  const existing = new Set((nodesState.library?.groups || []).map((group) => String(group.name || "").toLowerCase()));
  let name = baseName;
  let index = 2;
  while (existing.has(name.toLowerCase())) {
    name = `${baseName} ${index}`;
    index += 1;
  }
  return name;
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
  if (group.id === NODE_DEFAULT_GROUP_ID) {
    return;
  }
  for (const favorite of nodesState.library.favorites) {
    if (favorite.groupId === group.id) {
      favorite.groupId = NODE_DEFAULT_GROUP_ID;
    }
  }
  nodesState.library.groups = nodesState.library.groups.filter((item) => item.id !== group.id);
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
  if (getFavorite(node.type)) {
    await moveFavoriteToGroup(el, node.type, groupId, beforeType);
    return;
  }
  const favorite = {
    type: node.type,
    title: node.title || node.type,
    alias: "",
    groupId,
    order: 0,
    rating: 0,
    useCount: 0,
    lastUsed: 0,
    addedAt: Date.now(),
    invalid: false,
    source: "manual",
  };
  nodesState.library.favorites.push(favorite);
  const targetItems = nodesState.library.favorites
    .filter((item) => item.groupId === groupId && item.type !== node.type)
    .sort((a, b) => a.order - b.order);
  const beforeIndex = beforeType ? targetItems.findIndex((item) => item.type === beforeType) : -1;
  const insertIndex = beforeIndex >= 0 ? beforeIndex : targetItems.length;
  targetItems.splice(insertIndex, 0, favorite);
  targetItems.forEach((item, index) => {
    item.order = index;
  });
  await saveNodeLibrary(el);
}

async function removeFavoriteNode(el, type) {
  nodesState.library.favorites = nodesState.library.favorites.filter((favorite) => favorite.type !== type);
  await saveNodeLibrary(el);
}

async function editFavoriteAlias(el, favorite) {
  const current = favorite.alias || "";
  const alias = window.prompt(t("nodes.promptAlias"), current);
  if (alias === null) {
    return;
  }
  const item = getFavorite(favorite.type);
  if (!item) {
    return;
  }
  item.alias = alias.trim();
  await saveNodeLibrary(el);
}

function normalizeFavoriteOrders(groupId) {
  nodesState.library.favorites
    .filter((favorite) => favorite.groupId === groupId)
    .sort((a, b) => a.order - b.order)
    .forEach((favorite, index) => {
      favorite.order = index;
    });
}

async function moveFavoriteToGroup(el, type, targetGroupId, beforeType = "") {
  const favorite = getFavorite(type);
  if (!favorite) {
    return;
  }
  const sourceGroupId = favorite.groupId;
  if (sourceGroupId === targetGroupId && beforeType === type) {
    return;
  }
  favorite.groupId = targetGroupId;
  normalizeFavoriteOrders(sourceGroupId);
  const targetItems = nodesState.library.favorites
    .filter((item) => item.groupId === targetGroupId && item.type !== type)
    .sort((a, b) => a.order - b.order);
  const beforeIndex = beforeType ? targetItems.findIndex((item) => item.type === beforeType) : -1;
  const insertIndex = beforeIndex >= 0 ? beforeIndex : targetItems.length;
  targetItems.splice(insertIndex, 0, favorite);
  targetItems.forEach((item, index) => {
    item.order = index;
  });
  await saveNodeLibrary(el);
}

function getNodeGroup(groupId) {
  return (nodesState.library?.groups || []).find((group) => group.id === groupId) || null;
}

function isNodeGroupDescendant(groupId, possibleAncestorId) {
  let current = getNodeGroup(groupId);
  const visited = new Set();
  while (current?.parentId) {
    if (current.parentId === possibleAncestorId) {
      return true;
    }
    if (visited.has(current.parentId)) {
      return false;
    }
    visited.add(current.parentId);
    current = getNodeGroup(current.parentId);
  }
  return false;
}

async function moveNodeGroupToParent(el, groupId, targetParentId = "") {
  const group = getNodeGroup(groupId);
  if (!group || group.id === NODE_DEFAULT_GROUP_ID) {
    return;
  }
  const normalizedParentId = targetParentId && targetParentId !== NODE_DEFAULT_GROUP_ID ? String(targetParentId) : "";
  if (normalizedParentId === group.id || isNodeGroupDescendant(normalizedParentId, group.id)) {
    return;
  }
  if (group.parentId === normalizedParentId) {
    return;
  }
  group.parentId = normalizedParentId;
  const siblings = (nodesState.library.groups || [])
    .filter((item) => item.id !== group.id && item.id !== NODE_DEFAULT_GROUP_ID && (item.parentId || "") === normalizedParentId)
    .sort((a, b) => a.order - b.order);
  group.order = siblings.length ? Math.max(...siblings.map((item) => Number(item.order) || 0)) + 1 : 0;
  if (normalizedParentId) {
    nodesState.expanded.add(normalizedParentId);
  }
  await saveNodeLibrary(el);
}

function readFavoriteDrag(event) {
  const raw = event.dataTransfer?.getData(FAVORITE_DRAG_TYPE);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function makeFavoriteGroupDropTarget(el, target, groupId, beforeType = "") {
  target.dataset.workspace2FavoriteTarget = groupId;
  target.dataset.workspace2FavoriteBefore = beforeType;
  target.dataset.workspace2GroupTarget = groupId === NODE_DEFAULT_GROUP_ID ? "" : groupId;
  target.addEventListener("dragover", (event) => {
    const dragged = readFavoriteDrag(event);
    if (!dragged?.type) {
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
    const dragged = readFavoriteDrag(event);
    target.classList.remove("is-drop");
    if (!dragged?.type) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    try {
      await moveFavoriteToGroup(el, dragged.type, groupId, beforeType);
    } catch (error) {
      nodesState.error = error.message;
      renderNodesPanel(el);
    }
  });
}

function makeFavoriteDragSource(row, favorite) {
  row.dataset.workspace2FavoriteSource = favorite.type;
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

function rawNodePackageName(node) {
  const parts = String(node?.pythonModule || "").split(".");
  if (parts[0] === "custom_nodes" && parts[1]) {
    return parts[1].split("@")[0];
  }
  return "";
}

function normalizeExtensionCategoryIdentity(value) {
  return shortenNodeSourceName(value)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function isDuplicateExtensionCategory(packageName, rawPackageName, categoryPart) {
  const normalizedCategory = normalizeExtensionCategoryIdentity(categoryPart);
  if (!normalizedCategory) {
    return false;
  }
  return [packageName, rawPackageName]
    .map(normalizeExtensionCategoryIdentity)
    .filter(Boolean)
    .some((value) => value === normalizedCategory);
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
  if (node?.source === NODE_SOURCE.CUSTOM) {
    const packageName = nodePackageName(node) || t("nodes.categoryUnknown");
    const rawPackageName = rawNodePackageName(node);
    const categoryParts = [...parts];
    if (categoryParts.length && isDuplicateExtensionCategory(packageName, rawPackageName, categoryParts[0])) {
      categoryParts.shift();
    }
    return [{ key: `pkg:${rawPackageName || packageName}`, label: packageName }, ...categoryParts];
  }
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

function createNodeTreeFolder(key, label) {
  return {
    key,
    label,
    type: "folder",
    children: [],
    childMap: new Map(),
    totalLeaves: 0,
  };
}

function nodeTreePartLabel(part) {
  return typeof part === "object" && part ? String(part.label || part.key || "") : String(part || "");
}

function nodeTreePartKey(part) {
  return typeof part === "object" && part ? String(part.key || part.label || "") : String(part || "");
}

function buildOfficialNodeTree(sectionId, nodes) {
  const root = createNodeTreeFolder(sectionId, "");
  for (const node of nodes) {
    let current = root;
    for (const part of officialNodeCategoryParts(node)) {
      const partKey = nodeTreePartKey(part);
      const partLabel = nodeTreePartLabel(part);
      if (!partKey) {
        continue;
      }
      const folderKey = `${current.key}/${partKey}`;
      if (!current.childMap.has(partKey)) {
        const folder = createNodeTreeFolder(folderKey, partLabel);
        current.childMap.set(partKey, folder);
        current.children.push(folder);
      }
      current = current.childMap.get(partKey);
    }
    current.children.push({
      key: `${current.key}/${node.type}`,
      label: node.title || node.type,
      type: "node",
      node,
      totalLeaves: 1,
    });
  }
  finalizeOfficialNodeTree(root);
  sortOfficialNodeTree(root);
  return root;
}

function finalizeOfficialNodeTree(node) {
  if (node.type === "node") {
    node.totalLeaves = 1;
    return 1;
  }
  node.totalLeaves = node.children.reduce((sum, child) => sum + finalizeOfficialNodeTree(child), 0);
  delete node.childMap;
  return node.totalLeaves;
}

function isUnknownNodeFolder(child) {
  return child?.type === "folder" && String(child.label || "") === t("nodes.uncategorized");
}

function sortOfficialNodeTree(node) {
  if (node.type === "node" || !node.children) {
    return;
  }
  node.children.sort((a, b) => {
    const unknownA = isUnknownNodeFolder(a);
    const unknownB = isUnknownNodeFolder(b);
    if (unknownA !== unknownB) {
      return unknownA ? -1 : 1;
    }
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    const rankA = comfyCategorySortRank(a.label);
    const rankB = comfyCategorySortRank(b.label);
    if (rankA !== rankB) {
      return rankA - rankB;
    }
    if (nodesState.customOrderEnabled) {
      const order = Array.isArray(nodesState.customOrder?.[node.key]) ? nodesState.customOrder[node.key] : [];
      const orderKeyA = a.type === "node" ? a.node?.type : a.key;
      const orderKeyB = b.type === "node" ? b.node?.type : b.key;
      const indexA = order.indexOf(orderKeyA);
      const indexB = order.indexOf(orderKeyB);
      if (indexA !== -1 || indexB !== -1) {
        if (indexA === -1) {
          return 1;
        }
        if (indexB === -1) {
          return -1;
        }
        return indexA - indexB;
      }
    }
    if (nodesState.sort !== "alphabetical") {
      return 0;
    }
    return String(a.label || "").localeCompare(String(b.label || ""));
  });
  for (const child of node.children) {
    sortOfficialNodeTree(child);
  }
}

function renderOfficialNodeTree(el, section, tree, favoriteTypes, depth = 0) {
  for (const child of tree.children || []) {
    if (child.type === "node") {
      section.append(renderAllNodeRow(el, child.node, favoriteTypes.has(child.node.type), depth, tree.key));
    } else {
      renderOfficialNodeFolder(el, section, child, favoriteTypes, depth);
    }
  }
}

function renderOfficialNodeFolder(el, section, folder, favoriteTypes, depth) {
  const query = nodesState.query.trim();
  const groupOpen = nodesState.expanded.has(folder.key) || Boolean(query);
  const categoryHeader = document.createElement("div");
  categoryHeader.className = "workspace2-node-folder-header";
  categoryHeader.style.paddingLeft = `${8 + depth * 24}px`;
  categoryHeader.addEventListener("click", (event) => {
    if (event.target.closest("button,input")) {
      return;
    }
    event.stopPropagation();
    toggleOfficialTreeFolder(el, folder, event.ctrlKey || event.metaKey);
  });

  const disclosure = document.createElement("button");
  disclosure.className = `workspace2-disclosure ${groupOpen ? "is-open" : ""}`;
  disclosure.type = "button";
  disclosure.title = groupOpen ? t("folder.collapse") : t("folder.expand");
  disclosure.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleOfficialTreeFolder(el, folder, event.ctrlKey || event.metaKey);
  });

  const icon = document.createElement("span");
  applyDecoratedIcon(icon, "", "", groupOpen ? DEFAULT_FOLDER_OPEN_ICON_CLASS : DEFAULT_FOLDER_ICON_CLASS);
  const name = document.createElement("div");
  name.className = "workspace2-name";
  name.textContent = folder.label;
  const meta = document.createElement("div");
  meta.className = "workspace2-meta";
  meta.textContent = String(folder.totalLeaves);
  categoryHeader.append(disclosure, icon, name, meta);
  section.append(categoryHeader);

  if (groupOpen) {
    renderOfficialNodeTree(el, section, folder, favoriteTypes, depth + 1);
  }
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

function makeNodeCanvasDragSource(row, node) {
  row.draggable = false;
  row.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button,input,.workspace2-reorder-handle")) {
      return;
    }
    event.preventDefault();
    const drag = {
      node: {
        type: node.type,
        title: node.title || node.type,
      },
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      ghost: null,
      onMove: null,
      onUp: null,
      onCancel: null,
    };
    drag.onMove = (moveEvent) => updateNodePointerDrag(moveEvent);
    drag.onUp = (upEvent) => commitNodePointerDrag(upEvent);
    drag.onCancel = () => finishNodePointerDrag();
    nodesState.pointerDrag = drag;
    document.addEventListener("pointermove", drag.onMove, true);
    document.addEventListener("pointerup", drag.onUp, true);
    document.addEventListener("pointercancel", drag.onCancel, true);
    row.setPointerCapture?.(event.pointerId);
  });
}

function clearNodeReorderHighlights() {
  document.querySelectorAll(".workspace2-node-row.is-reorder-before, .workspace2-node-row.is-reorder-after").forEach((row) => {
    row.classList.remove("is-reorder-before", "is-reorder-after");
  });
}

function finishNodeReorderDrag() {
  const drag = nodesState.reorderDrag;
  if (drag) {
    document.removeEventListener("pointermove", drag.onMove, true);
    document.removeEventListener("pointerup", drag.onUp, true);
    document.removeEventListener("pointercancel", drag.onCancel, true);
    drag.row?.classList.remove("is-reordering");
    drag.ghost?.remove();
  }
  clearNodeReorderHighlights();
  setDraggingVisual(false);
  nodesState.reorderDrag = null;
}

function nodeReorderRowAtPoint(clientX, clientY) {
  const previousGhostDisplay = nodesState.reorderDrag?.ghost?.style.display;
  if (nodesState.reorderDrag?.ghost) {
    nodesState.reorderDrag.ghost.style.display = "none";
  }
  const element = document.elementFromPoint(clientX, clientY);
  if (nodesState.reorderDrag?.ghost) {
    nodesState.reorderDrag.ghost.style.display = previousGhostDisplay || "";
  }
  return element?.closest?.(".workspace2-node-row[data-workspace2-node-type]") || null;
}

function updateNodeReorderDrag(event) {
  const drag = nodesState.reorderDrag;
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
    nodesState.suppressClick = true;
    setDraggingVisual(true);
    drag.row.classList.add("is-reordering");
    drag.ghost = document.createElement("div");
    drag.ghost.className = "workspace2-drag-ghost";
    drag.ghost.textContent = drag.title;
    document.body.append(drag.ghost);
  }

  event.preventDefault();
  event.stopPropagation();
  drag.ghost.style.left = `${event.clientX + 12}px`;
  drag.ghost.style.top = `${event.clientY + 10}px`;

  clearNodeReorderHighlights();
  const targetRow = nodeReorderRowAtPoint(event.clientX, event.clientY);
  const targetType = targetRow?.dataset.workspace2NodeType || "";
  if (!targetRow || targetType === drag.type) {
    drag.targetType = "";
    drag.placement = "";
    return;
  }
  if (drag.kind === "favorite") {
    if (targetRow.dataset.workspace2FavoriteRegion !== drag.groupId) {
      drag.targetType = "";
      drag.placement = "";
      return;
    }
  } else if (targetRow.dataset.workspace2NodeParentKey !== drag.parentKey) {
    drag.targetType = "";
    drag.placement = "";
    return;
  }

  const rect = targetRow.getBoundingClientRect();
  drag.targetType = targetType;
  drag.placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  targetRow.classList.add(drag.placement === "before" ? "is-reorder-before" : "is-reorder-after");
}

async function commitNodeReorderDrag(el, event) {
  const drag = nodesState.reorderDrag;
  if (!drag) {
    return;
  }
  updateNodeReorderDrag(event);
  const shouldReorder = drag.active && drag.targetType && drag.placement;
  const sourceType = drag.type;
  const targetType = drag.targetType;
  const placement = drag.placement;
  const groupId = drag.groupId;
  const parentKey = drag.parentKey;
  const kind = drag.kind;
  finishNodeReorderDrag();
  if (!shouldReorder) {
    return;
  }

  if (kind === "favorite") {
    const items = nodesState.library.favorites
      .filter((favorite) => (favorite.groupId || NODE_DEFAULT_GROUP_ID) === groupId)
      .sort((a, b) => a.order - b.order);
    const next = items.filter((favorite) => favorite.type !== sourceType);
    const targetIndex = next.findIndex((favorite) => favorite.type === targetType);
    if (targetIndex === -1) {
      return;
    }
    const source = items.find((favorite) => favorite.type === sourceType);
    if (!source) {
      return;
    }
    next.splice(placement === "before" ? targetIndex : targetIndex + 1, 0, source);
    next.forEach((favorite, index) => {
      favorite.order = index;
    });
    await saveNodeLibrary(el);
    return;
  }

  const rows = [...el.querySelectorAll(`.workspace2-node-row[data-workspace2-node-parent-key="${cssEscape(parentKey)}"]`)];
  const order = rows.map((row) => row.dataset.workspace2NodeType).filter(Boolean);
  const nextOrder = order.filter((type) => type !== sourceType);
  const targetIndex = nextOrder.indexOf(targetType);
  if (targetIndex === -1) {
    return;
  }
  nextOrder.splice(placement === "before" ? targetIndex : targetIndex + 1, 0, sourceType);
  nodesState.customOrder[parentKey] = nextOrder;
  saveNodeCustomOrder();
  renderNodesPanel(el);
}

function beginNodeReorderDrag(el, handle, row, options) {
  handle.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !nodesState.customOrderEnabled) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const onMove = (moveEvent) => updateNodeReorderDrag(moveEvent);
    const onUp = (upEvent) => {
      commitNodeReorderDrag(el, upEvent).catch((error) => {
        nodesState.error = error.message;
        renderNodesPanel(el);
      });
    };
    const onCancel = () => finishNodeReorderDrag();
    nodesState.reorderDrag = {
      ...options,
      row,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      targetType: "",
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

function clearFavoriteDropHighlights() {
  document.querySelectorAll("[data-workspace2-favorite-target].is-drop, [data-workspace2-group-target].is-drop, [data-workspace2-favorite-region].is-drop-region").forEach((target) => {
    target.classList.remove("is-drop", "is-drop-region");
  });
}

function highlightFavoriteDropRegion(groupId) {
  document.querySelectorAll(`[data-workspace2-favorite-region="${cssEscape(groupId)}"]`).forEach((target) => {
    target.classList.add("is-drop-region");
  });
}

function finishNodePointerDrag() {
  const drag = nodesState.pointerDrag;
  if (drag) {
    document.removeEventListener("pointermove", drag.onMove, true);
    document.removeEventListener("pointerup", drag.onUp, true);
    document.removeEventListener("pointercancel", drag.onCancel, true);
    drag.ghost?.remove();
  }
  clearFavoriteDropHighlights();
  setDraggingVisual(false);
  nodesState.pointerDrag = null;
  nodesState.draggingNode = null;
}

function finishNodeGroupPointerDrag() {
  const drag = nodesState.groupDrag;
  if (drag) {
    document.removeEventListener("pointermove", drag.onMove, true);
    document.removeEventListener("pointerup", drag.onUp, true);
    document.removeEventListener("pointercancel", drag.onCancel, true);
    drag.ghost?.remove();
  }
  clearFavoriteDropHighlights();
  setDraggingVisual(false);
  nodesState.groupDrag = null;
}

function validNodeGroupDropTarget(draggedGroupId, targetGroupId) {
  const normalizedTarget = targetGroupId && targetGroupId !== NODE_DEFAULT_GROUP_ID ? String(targetGroupId) : "";
  if (!draggedGroupId || draggedGroupId === NODE_DEFAULT_GROUP_ID) {
    return false;
  }
  if (normalizedTarget === draggedGroupId) {
    return false;
  }
  if (normalizedTarget && isNodeGroupDescendant(normalizedTarget, draggedGroupId)) {
    return false;
  }
  return true;
}

function findNodeGroupDropTargetAt(event, draggedGroupId) {
  const dropElement = document.elementFromPoint(event.clientX, event.clientY);
  const target = dropElement?.closest?.("[data-workspace2-group-target]");
  if (!target) {
    return null;
  }
  const targetGroupId = target.dataset.workspace2GroupTarget || "";
  if (!validNodeGroupDropTarget(draggedGroupId, targetGroupId)) {
    return null;
  }
  return target;
}

function updateNodeGroupPointerDrag(event) {
  const drag = nodesState.groupDrag;
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
    nodesState.suppressClick = true;
    setDraggingVisual(true);
    drag.ghost = document.createElement("div");
    drag.ghost.className = "workspace2-drag-ghost";
    drag.ghost.textContent = drag.group.name;
    document.body.append(drag.ghost);
  }
  event.preventDefault();
  event.stopPropagation();
  drag.ghost.style.left = `${event.clientX + 12}px`;
  drag.ghost.style.top = `${event.clientY + 10}px`;

  clearFavoriteDropHighlights();
  const target = findNodeGroupDropTargetAt(event, drag.group.id);
  if (target) {
    target.classList.add("is-drop");
    highlightFavoriteDropRegion(target.dataset.workspace2GroupTarget || NODE_DEFAULT_GROUP_ID);
  }
  drag.ghost.style.borderColor = target ? "var(--workspace2-accent)" : "var(--border-color, #555)";
}

async function commitNodeGroupPointerDrag(event) {
  const drag = nodesState.groupDrag;
  if (!drag) {
    return;
  }
  updateNodeGroupPointerDrag(event);
  const target = findNodeGroupDropTargetAt(event, drag.group.id);
  const targetGroupId = target?.dataset.workspace2GroupTarget || "";
  const shouldMove = drag.active && target;
  finishNodeGroupPointerDrag();
  if (!shouldMove) {
    return;
  }
  try {
    await moveNodeGroupToParent(nodesState.renderTarget, drag.group.id, targetGroupId);
  } catch (error) {
    nodesState.error = error.message;
    if (nodesState.renderTarget) {
      renderNodesPanel(nodesState.renderTarget);
    }
  }
}

function comfyCategorySortRank(label) {
  const index = COMFY_CATEGORY_ORDER_KEYS.findIndex((key) => t(key) === label);
  return index === -1 ? 1000 : index;
}

function makeNodeGroupDragSource(el, header, group) {
  header.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.target.closest("button,input,.workspace2-actions,.workspace2-disclosure")) {
      return;
    }
    const onMove = (moveEvent) => updateNodeGroupPointerDrag(moveEvent);
    const onUp = (upEvent) => commitNodeGroupPointerDrag(upEvent);
    const onCancel = () => finishNodeGroupPointerDrag();
    nodesState.groupDrag = {
      group,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
      ghost: null,
      onMove,
      onUp,
      onCancel,
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", onUp, true);
    document.addEventListener("pointercancel", onCancel, true);
    header.setPointerCapture?.(event.pointerId);
  });
}

function updateNodePointerDrag(event) {
  const drag = nodesState.pointerDrag;
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
    nodesState.suppressClick = true;
    nodesState.draggingNode = drag.node;
    setDraggingVisual(true);
    drag.ghost = document.createElement("div");
    drag.ghost.className = "workspace2-drag-ghost";
    drag.ghost.textContent = drag.node.title;
    document.body.append(drag.ghost);
  }
  event.preventDefault();
  event.stopPropagation();
  drag.ghost.style.left = `${event.clientX + 12}px`;
  drag.ghost.style.top = `${event.clientY + 10}px`;

  clearFavoriteDropHighlights();
  const dropElement = document.elementFromPoint(event.clientX, event.clientY);
  const favoriteTarget = dropElement?.closest?.("[data-workspace2-favorite-target]");
  if (favoriteTarget) {
    favoriteTarget.classList.add("is-drop");
    highlightFavoriteDropRegion(favoriteTarget.dataset.workspace2FavoriteTarget || NODE_DEFAULT_GROUP_ID);
  }
  drag.ghost.style.borderColor = favoriteTarget || isCanvasDropTarget(dropElement)
    ? "var(--workspace2-accent)"
    : "var(--border-color, #555)";
}

async function commitNodePointerDrag(event) {
  const drag = nodesState.pointerDrag;
  if (!drag) {
    return;
  }
  updateNodePointerDrag(event);
  const dropElement = document.elementFromPoint(event.clientX, event.clientY);
  const favoriteTarget = dropElement?.closest?.("[data-workspace2-favorite-target]");
  const shouldFavorite = drag.active && favoriteTarget;
  const shouldCreate = drag.active && !shouldFavorite && isCanvasDropTarget(dropElement);
  const nodeType = drag.node.type;
  const pos = shouldCreate ? canvasPositionFromClient(event.clientX, event.clientY) : null;
  const targetGroupId = favoriteTarget?.dataset.workspace2FavoriteTarget || NODE_DEFAULT_GROUP_ID;
  const beforeType = favoriteTarget?.dataset.workspace2FavoriteBefore || "";
  finishNodePointerDrag();
  if (shouldFavorite) {
    try {
      if (getFavorite(nodeType)) {
        await moveFavoriteToGroup(nodesState.renderTarget, nodeType, targetGroupId, beforeType);
      } else {
        await addFavoriteNode(nodesState.renderTarget, drag.node, targetGroupId, beforeType);
      }
    } catch (error) {
      nodesState.error = error.message;
      if (nodesState.renderTarget) {
        renderNodesPanel(nodesState.renderTarget);
      }
    }
    return;
  }
  if (!shouldCreate) {
    return;
  }
  try {
    await addNodeToCanvas(nodesState.renderTarget, nodeType, pos);
  } catch (error) {
    nodesState.error = error.message;
    if (nodesState.renderTarget) {
      renderNodesPanel(nodesState.renderTarget);
    }
  }
}

function readDraggedNode(event) {
  const raw = event.dataTransfer?.getData(NODE_DRAG_TYPE);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      return nodesState.draggingNode;
    }
  }
  const comfyNodeType = event.dataTransfer?.getData(COMFY_NODE_DRAG_TYPE);
  if (comfyNodeType) {
    return { type: comfyNodeType, title: comfyNodeType };
  }
  return nodesState.draggingNode;
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
    status.textContent = nodesState.pendingNode
      ? t("nodes.pendingPlace", { name: nodesState.pendingNode.title })
      : t("nodes.status", { count: nodeTypes.length });
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

function setupNodeCanvasDrop() {
  if (nodesState.canvasDropReady) {
    return;
  }
  nodesState.canvasDropReady = true;

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && templatesState.pendingTemplate) {
      event.stopPropagation();
      setPendingTemplate(null);
      return;
    }
    if (event.key === "Escape" && nodesState.pendingNode) {
      event.stopPropagation();
      setPendingNode(null);
    }
  }, true);

  document.addEventListener("click", async (event) => {
    if (templatesState.pendingTemplate && isCanvasDropTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      try {
        await placePendingTemplateAt(event.clientX, event.clientY);
      } catch (error) {
        templatesState.error = error.message;
        if (templatesState.renderTarget) {
          renderTemplatesPanel(templatesState.renderTarget);
        }
      }
      return;
    }
    if (!nodesState.pendingNode || !isCanvasDropTarget(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    try {
      await placePendingNodeAt(event.clientX, event.clientY);
    } catch (error) {
      nodesState.error = error.message;
      if (nodesState.renderTarget) {
        renderNodesPanel(nodesState.renderTarget);
      }
    }
  }, true);

  document.addEventListener("mousemove", (event) => {
    if (templatesState.pendingTemplate) {
      if (!isCanvasDropTarget(event.target)) {
        hideNodePreview();
        return;
      }
      showTemplatePreview(templatesState.pendingTemplate, event, { followCursor: true });
      return;
    }
    if (!nodesState.pendingNode) {
      return;
    }
    if (!isCanvasDropTarget(event.target)) {
      hideNodePreview();
      return;
    }
    showPendingNodeCanvasPreview(event);
  }, true);

  document.addEventListener("dragover", (event) => {
    const transferTypes = Array.from(event.dataTransfer?.types || []);
    const hasTemplate = templatesState.draggingTemplate || transferTypes.includes(TEMPLATE_DRAG_TYPE);
    if ((!nodesState.draggingNode && !hasTemplate) || !isCanvasDropTarget(event.target)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  document.addEventListener("drop", async (event) => {
    const template = readDraggedTemplate(event);
    if (template && isCanvasDropTarget(event.target)) {
      event.preventDefault();
      event.stopPropagation();
      const pos = canvasPositionFromClient(event.clientX, event.clientY);
      try {
        await addTemplateToCanvas(template, pos);
        await recordTemplateUse(templatesState.renderTarget, template.id);
      } catch (error) {
        templatesState.error = error.message;
        if (templatesState.renderTarget) {
          renderTemplatesPanel(templatesState.renderTarget);
        }
      } finally {
        templatesState.draggingTemplate = null;
      }
      return;
    }
    const dragged = readDraggedNode(event);
    if (!dragged || !isCanvasDropTarget(event.target)) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const pos = canvasPositionFromClient(event.clientX, event.clientY);
    try {
      await addNodeToCanvas(nodesState.renderTarget, dragged.type, pos);
    } catch (error) {
      nodesState.error = error.message;
      if (nodesState.renderTarget) {
        renderNodesPanel(nodesState.renderTarget);
      }
    } finally {
      nodesState.draggingNode = null;
    }
  });
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
  const normalized = Math.max(2, Math.min(20, Math.round(Number(value) || 5)));
  return Math.abs(normalized - 5) <= 1 ? 5 : normalized;
}

function workflowRecentLimit() {
  return snapWorkflowRecentLimit(localStorage.getItem(WORKFLOW_RECENT_LIMIT_KEY) || "5");
}

function setWorkflowRecentLimit(value) {
  const limit = snapWorkflowRecentLimit(value);
  localStorage.setItem(WORKFLOW_RECENT_LIMIT_KEY, String(limit));
  writeRecentWorkflows(readRecentWorkflows().slice(0, limit));
  if (state.workflowsTarget) {
    renderPanel(state.workflowsTarget);
  }
}

function readRecentWorkflows() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WORKFLOW_RECENT_KEY) || "[]");
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .map((item) => ({
        path: String(item?.path || ""),
        name: String(item?.name || ""),
        openedAt: Number(item?.openedAt || 0),
      }))
      .filter((item) => item.path);
  } catch (error) {
    return [];
  }
}

function writeRecentWorkflows(items) {
  localStorage.setItem(WORKFLOW_RECENT_KEY, JSON.stringify(items.slice(0, workflowRecentLimit())));
}

function recordRecentWorkflow(path) {
  const normalizedPath = String(path || "");
  if (!normalizedPath) {
    return;
  }
  const item = state.items.find((entry) => entry.path === normalizedPath);
  const name = item ? workflowDisplayName(item) : normalizedPath.split(/[\\/]/).pop() || normalizedPath;
  const recent = readRecentWorkflows();
  const existingIndex = recent.findIndex((entry) => entry.path === normalizedPath);
  if (existingIndex >= 0) {
    recent[existingIndex] = {
      ...recent[existingIndex],
      name,
      openedAt: Date.now(),
    };
    writeRecentWorkflows(recent);
    return;
  }
  writeRecentWorkflows([{
    path: normalizedPath,
    name,
    openedAt: Date.now(),
  }, ...recent]);
}

function updateRecentWorkflowPath(oldPath, newPath) {
  const normalizedOld = String(oldPath || "");
  const normalizedNew = String(newPath || "");
  if (!normalizedOld || !normalizedNew || normalizedOld === normalizedNew) {
    return;
  }
  const existing = state.items.find((entry) => entry.path === normalizedNew);
  const fallbackName = normalizedNew.split(/[\\/]/).pop() || normalizedNew;
  const next = [];
  const seen = new Set();
  for (const entry of readRecentWorkflows()) {
    const path = replaceWorkflowPathPrefix(entry.path, normalizedOld, normalizedNew);
    if (!path || seen.has(path)) {
      continue;
    }
    seen.add(path);
    next.push({
      ...entry,
      path,
      name: path === normalizedNew ? (existing ? workflowDisplayName(existing) : fallbackName) : entry.name,
    });
  }
  writeRecentWorkflows(next);
}

function removeRecentWorkflow(path) {
  const normalizedPath = String(path || "");
  if (!normalizedPath) {
    return;
  }
  writeRecentWorkflows(readRecentWorkflows().filter((entry) => entry.path !== normalizedPath));
}

function removeRecentWorkflowTree(path) {
  const normalizedPath = String(path || "");
  if (!normalizedPath) {
    return;
  }
  writeRecentWorkflows(
    readRecentWorkflows().filter((entry) => !workflowPathIsWithin(entry.path, normalizedPath)),
  );
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
  const defaults = defaultNodeVisibleSections();
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
      saveNodeVisibleSections();
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
  if (state.sortMenuCloseHandler) {
    window.removeEventListener("pointerdown", state.sortMenuCloseHandler, true);
    document.removeEventListener("pointerdown", state.sortMenuCloseHandler, true);
    window.removeEventListener("click", state.sortMenuCloseHandler, true);
    document.removeEventListener("click", state.sortMenuCloseHandler, true);
    window.removeEventListener("keydown", state.sortMenuCloseHandler, true);
    state.sortMenuCloseHandler = null;
  }
  state.sortMenuElement?.remove();
  state.sortMenuElement = null;
}

function openWorkflowSortMenu(el, anchor) {
  closeWorkflowSortMenu();
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

  for (const sort of WORKFLOW_SORTS) {
    const option = document.createElement("button");
    option.className = `workspace2-menu-item${sort === state.sort ? " is-active" : ""}`;
    option.type = "button";
    option.textContent = t(`workflows.sort.${sort}`);
    option.addEventListener("click", () => {
      state.sort = sort;
      localStorage.setItem(WORKFLOW_SORT_KEY, state.sort);
      closeWorkflowSortMenu();
      renderPanel(el);
    });
    menu.append(option);
  }

  const divider = document.createElement("div");
  divider.className = "workspace2-menu-divider";
  menu.append(divider);

  const folderFirst = document.createElement("button");
  folderFirst.className = `workspace2-menu-item workspace2-menu-check-item${state.folderFirst ? " is-active" : ""}`;
  folderFirst.type = "button";
  folderFirst.textContent = t("workflows.folderFirst");
  folderFirst.addEventListener("click", () => {
    state.folderFirst = !state.folderFirst;
    localStorage.setItem(WORKFLOW_FOLDER_FIRST_KEY, state.folderFirst ? "1" : "0");
    closeWorkflowSortMenu();
    renderPanel(el);
  });
  menu.append(folderFirst);

  const custom = document.createElement("button");
  custom.className = `workspace2-menu-item workspace2-menu-check-item${state.customOrderEnabled ? " is-active" : ""}`;
  custom.type = "button";
  custom.textContent = t("workflows.customOrder");
  custom.addEventListener("click", () => {
    state.customOrderEnabled = !state.customOrderEnabled;
    localStorage.setItem(WORKFLOW_CUSTOM_ORDER_KEY, state.customOrderEnabled ? "1" : "0");
    closeWorkflowSortMenu();
    renderPanel(el);
  });
  menu.append(custom);

  const refreshDivider = document.createElement("div");
  refreshDivider.className = "workspace2-menu-divider";
  menu.append(refreshDivider);

  const refresh = document.createElement("button");
  refresh.className = "workspace2-menu-item";
  refresh.type = "button";
  refresh.textContent = t("workflows.refresh");
  refresh.addEventListener("click", async () => {
    closeWorkflowSortMenu();
    try {
      await refreshPanel(el);
    } catch (error) {
      handleError(el, error);
    }
  });
  menu.append(refresh);

  panel.append(menu);
  state.sortMenuElement = menu;
  state.sortMenuCloseHandler = (event) => {
    if (event.type === "keydown" && event.key !== "Escape") {
      return;
    }
    if (menu.contains(event.target) || anchor.contains(event.target)) {
      return;
    }
    closeWorkflowSortMenu();
  };
  setTimeout(() => {
    window.addEventListener("pointerdown", state.sortMenuCloseHandler, true);
    document.addEventListener("pointerdown", state.sortMenuCloseHandler, true);
    window.addEventListener("click", state.sortMenuCloseHandler, true);
    document.addEventListener("click", state.sortMenuCloseHandler, true);
    window.addEventListener("keydown", state.sortMenuCloseHandler, true);
  }, 0);
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

function createPanelHeader(titleText, statusText, options = {}) {
  const header = document.createElement("div");
  header.className = "workspace2-header";

  const title = document.createElement("div");
  title.className = "workspace2-title";
  title.textContent = titleText;

  const status = document.createElement("div");
  status.className = "workspace2-status";
  status.textContent = statusText;
  if (options.statusDataset) {
    status.dataset[options.statusDataset] = "1";
  }

  header.append(title, status);
  return header;
}

function createSearchToolbar({ focusKey, placeholder, value, onInput, buttons = [] }) {
  const toolbar = document.createElement("div");
  toolbar.className = "workspace2-toolbar";
  toolbar.style.setProperty("--workspace2-toolbar-actions", String(buttons.length));

  const searchWrap = document.createElement("div");
  searchWrap.className = "workspace2-search-wrap";

  const search = document.createElement("input");
  search.className = "workspace2-input";
  search.dataset.workspace2Focus = focusKey;
  search.placeholder = placeholder;
  search.value = value;
  isolateComfyKeys(search);
  search.addEventListener("click", (event) => event.stopPropagation());

  const clear = document.createElement("button");
  clear.type = "button";
  clear.className = "workspace2-search-clear";
  clear.title = t("search.clear");
  clear.setAttribute("aria-label", t("search.clear"));
  clear.append(iconSvg("x"));

  const updateClear = () => {
    clear.hidden = !search.value;
  };
  const emitInput = () => {
    updateClear();
    onInput(search.value);
  };
  let isComposing = false;
  search.addEventListener("compositionstart", () => {
    isComposing = true;
  });
  search.addEventListener("compositionend", () => {
    isComposing = false;
    emitInput();
  });
  search.addEventListener("input", (event) => {
    updateClear();
    if (isComposing || event.isComposing) {
      return;
    }
    emitInput();
  });
  clear.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
  });
  clear.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (!search.value) {
      search.focus();
      return;
    }
    search.value = "";
    emitInput();
    search.focus();
  });
  updateClear();

  searchWrap.append(search, clear);
  toolbar.append(searchWrap, ...buttons);
  return toolbar;
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
  return t("workspace.tab.workflows");
}

function renderWorkspaceModuleTabs(el) {
  const tabs = document.createElement("div");
  tabs.className = "workspace2-module-tabs";
  for (const moduleId of WORKSPACE2_MODULES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `workspace2-module-tab ${workspaceState.activeModule === moduleId ? "is-active" : ""}`;
    button.textContent = workspaceModuleLabel(moduleId);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      workspaceState.activeModule = moduleId;
      localStorage.setItem(WORKSPACE2_MODULE_KEY, moduleId);
      renderWorkspace2Panel(el);
    });
    tabs.append(button);
  }
  const settings = document.createElement("button");
  settings.type = "button";
  settings.className = "workspace2-module-settings";
  settings.title = t("settings.title");
  settings.setAttribute("aria-label", t("settings.title"));
  settings.append(iconSvg("settings"));
  settings.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    openWorkspaceSettings();
  });
  tabs.append(settings);
  return tabs;
}

function renderWorkspace2Panel(el) {
  workspaceState.renderTarget = el;
  styles();
  setupWorkspaceKeyIsolation();
  setupWorkspaceGlassOverlayTracking();
  if (workspaceState.glassPortalElement?.isConnected) {
    workspaceState.glassPortalElement.remove();
  }
  workspaceState.glassPortalElement = null;
  prepareWorkspaceSidebarHost(el);

  const shell = document.createElement("div");
  shell.className = "workspace2-shell";
  applyWorkspaceBackgroundEffect(shell);
  const body = document.createElement("div");
  body.className = "workspace2-module-body";
  shell.append(renderWorkspaceModuleTabs(el), body);
  el.append(shell);
  syncWorkspaceGlassOverlay();

  if (workspaceState.activeModule === "nodes") {
    renderNodesPanel(body);
  } else if (workspaceState.activeModule === "templates") {
    renderTemplatesPanel(body);
  } else {
    renderPanel(body);
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
  const element = document.elementFromPoint(clientX, clientY);
  if (state.pointerDrag?.ghost) {
    state.pointerDrag.ghost.style.display = previousGhostDisplay || "";
  }
  const itemRow = element?.closest?.("[data-workspace2-parent-path]") || null;
  const directTarget = element?.closest?.("[data-workspace2-drop-target]") || null;
  if (directTarget && !directTarget.classList.contains("workspace2-tree")) {
    return directTarget;
  }
  const parentPathValue = itemRow?.dataset.workspace2ParentPath;
  if (parentPathValue !== undefined) {
    return workflowDropTargetElement(parentPathValue);
  }
  return directTarget;
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

function renderContextMenu(el, panel) {
  state.contextMenuElement?.remove();
  state.contextMenuElement = null;
  if (!state.contextMenu) {
    return;
  }
  if (!panel) {
    return;
  }

  const { item, x, y } = state.contextMenu;
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.addEventListener("click", (event) => event.stopPropagation());
  menu.addEventListener("contextmenu", (event) => event.preventDefault());

  const addItem = (label, onClick) => {
    const button = document.createElement("button");
    button.className = "workspace2-menu-item";
    button.type = "button";
    button.textContent = label;
    button.addEventListener("click", async () => {
      closeContextMenu();
      try {
        await onClick();
      } catch (error) {
        handleError(el, error);
      }
    });
    menu.append(button);
  };

  if (item.type === "folder") {
    addItem(t("menu.newSubfolder"), () => createFolder(el, item.path));
    addItem(t("folder.personalize"), () => personalizeWorkflowFolder(el, item, { clientX: x, clientY: y }));
    addItem(t("folder.resetStyle"), () => resetWorkflowFolderStyle(el, item));
  } else {
    addItem(t("menu.open"), () => openWorkflow(item.path));
  }
  addItem(t("menu.rename"), () => {
    state.editingPath = item.path;
    renderPanel(el);
  });
  addItem(t("menu.moveToRoot"), () => moveItem(el, item.path, ""));
  addItem(t("menu.moveToTrash"), () => moveToTrash(el, item));

  panel.append(menu);
  state.contextMenuElement = menu;
}

function renderTrashPanel(el, panel) {
  const list = document.createElement("div");
  list.className = "workspace2-trash-list";

  if (!state.trashItems.length) {
    const empty = document.createElement("div");
    empty.className = "workspace2-empty";
    empty.textContent = t("trash.empty");
    list.append(empty);
  }

  for (const item of state.trashItems) {
    const row = document.createElement("div");
    row.className = "workspace2-trash-item";

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "workspace2-trash-name";
    name.textContent = `${item.type === "folder" ? t("trash.folderPrefix") : t("trash.filePrefix")}${item.name}`;
    const meta = document.createElement("div");
    meta.className = "workspace2-trash-meta";
    meta.title = item.original_path;
    meta.textContent = `${item.original_path} | ${item.deleted_at || ""}`;
    info.append(name, meta);

    const restore = iconButton("restore", t("trash.restore"), async () => {
      try {
        await restoreTrashItemSmart(el, item);
      } catch (error) {
        handleError(el, error);
      }
    });

    const systemTrash = dangerIconButton("systemTrash", t("trash.systemDelete"), (event) => {
      event.preventDefault();
      event.stopPropagation();
      workspace2InlineConfirm(event.currentTarget, {
        confirmText: t("confirm.moveToSystemTrash"),
        onConfirm: async () => {
          try {
            await moveTrashItemToSystemTrash(el, item);
          } catch (error) {
            handleError(el, error);
          }
        },
      });
    });

    row.append(info, restore, systemTrash);
    list.append(row);
  }

  panel.append(list);
}

function renderNode(el, list, node, depth) {
  if (!matchesQuery(node, state.query.trim().toLowerCase())) {
    return;
  }

  const row = document.createElement("div");
  row.className = "workspace2-row";
  row.classList.add(node.type === "folder" ? "is-folder" : "is-file");
  row.style.setProperty("--indent", `${depth * 16 + 4}px`);
  row.title = node.path || t("root.unknown");
  row.dataset.workspace2ItemPath = node.path || "";
  row.dataset.workspace2ParentPath = parentPath(node.path || "");
  row.draggable = false;
  if (state.selectedPath === node.path) {
    row.classList.add("is-selected");
  }

  row.addEventListener("click", async (event) => {
    if (state.suppressClick) {
      state.suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (state.editingPath === node.path) {
      return;
    }
    event.stopPropagation();
    state.selectedPath = node.path;
    closeContextMenu();
    if (node.type === "folder") {
      toggleWorkflowFolder(el, node, event.ctrlKey || event.metaKey);
      return;
    }
    try {
      await openWorkflow(node.path);
      renderPanel(el);
    } catch (error) {
      handleError(el, error);
    }
  });
  row.addEventListener("contextmenu", (event) => openContextMenu(el, event, node));

  if (node.path) {
    beginPointerDrag(el, row, node);
  }

  if (node.type === "folder") {
    makeDropTarget(el, row, node.path);
  }

  const disclosure = document.createElement(node.type === "folder" ? "button" : "span");
  if (node.type === "folder") {
    disclosure.className = `workspace2-disclosure ${state.expanded.has(node.path) || state.query ? "is-open" : ""}`;
    disclosure.type = "button";
    disclosure.title = state.expanded.has(node.path) ? t("folder.collapse") : t("folder.expand");
    disclosure.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleWorkflowFolder(el, node, event.ctrlKey || event.metaKey);
    });
  } else {
    disclosure.className = "workspace2-spacer";
  }

  const reorderHandle = document.createElement("span");
  if (state.customOrderEnabled && node.path) {
    reorderHandle.className = "workspace2-reorder-handle";
    reorderHandle.title = t("workflows.reorderHandle");
    beginWorkflowReorderDrag(el, reorderHandle, row, node);
  } else {
    reorderHandle.className = "workspace2-reorder-spacer";
  }

  const icon = document.createElement("span");
  const meta = node.type === "folder" ? workflowFolderMeta(node.path) : {};
  applyDecoratedIcon(
    icon,
    node.type === "folder" ? meta.icon : "",
    node.type === "folder" ? meta.color : "",
    node.type === "folder" ? (state.expanded.has(node.path) || state.query ? DEFAULT_FOLDER_OPEN_ICON_CLASS : DEFAULT_FOLDER_ICON_CLASS) : DEFAULT_FILE_ICON_CLASS,
  );

  const nameCell = document.createElement("div");
  nameCell.className = "workspace2-name";

  if (state.editingPath === node.path) {
    const input = document.createElement("input");
    input.className = "workspace2-rename-input";
    input.value = workflowDisplayName(node);
    isolateComfyKeys(input);
    let renameSubmitted = false;
    const commitRename = async () => {
      if (renameSubmitted) {
        return;
      }
      renameSubmitted = true;
      await renameItem(el, node, input.value.trim());
    };
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        try {
          await commitRename();
        } catch (error) {
          handleError(el, error);
        }
      }
      if (event.key === "Escape") {
        renameSubmitted = true;
        state.editingPath = "";
        renderPanel(el);
      }
    });
    input.addEventListener("blur", async () => {
      try {
        await commitRename();
      } catch (error) {
        handleError(el, error);
      }
    });
    nameCell.append(input);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  } else {
    const name = document.createElement("span");
    name.textContent = workflowDisplayName(node);
    nameCell.append(name);
    if (node.type === "file" && node.size_bytes) {
      const meta = document.createElement("span");
      meta.className = "workspace2-meta";
      meta.textContent = `${Math.ceil(node.size_bytes / 1024)} KB`;
      nameCell.append(meta);
    }
  }

  const actions = document.createElement("div");
  actions.className = "workspace2-actions";

  if (node.type === "folder") {
    actions.append(
      iconButton("folderPlus", t("menu.newSubfolder"), async () => {
        try {
          await createFolder(el, node.path);
        } catch (error) {
          handleError(el, error);
        }
      }),
    );
  } else {
    actions.append(
      iconButton("folderOpen", t("row.openLocation"), async () => {
        try {
          await openWorkflowLocation(node.path);
        } catch (error) {
          handleError(el, error);
        }
      }),
    );
  }

  actions.append(
    iconButton("edit", t("row.rename"), () => {
      state.editingPath = node.path;
      renderPanel(el);
    }),
  );
  actions.append(
    dangerIconButton("trash", t("row.moveToTrash"), async () => {
      try {
        await moveToTrash(el, node);
      } catch (error) {
        handleError(el, error);
      }
    }),
  );

  row.append(reorderHandle, disclosure, icon, nameCell, actions);
  list.append(row);

  if (node.type === "folder" && (state.expanded.has(node.path) || state.query)) {
    for (const child of visibleChildren(node)) {
      renderNode(el, list, child, depth + 1);
    }
  }
}

function renderWorkflowTreeBody(el, tree) {
  if (!tree.dataset.workspace2RootDropReady) {
    makeDropTarget(el, tree, "");
    tree.dataset.workspace2RootDropReady = "1";
  }
  const root = buildTree();
  const children = visibleChildren(root);
  if (!children.length) {
    const empty = document.createElement("div");
    empty.className = "workspace2-empty";
    empty.textContent = state.query ? t("empty.noMatches") : t("empty.noWorkflows");
    tree.append(empty);
    return;
  }
  for (const child of children) {
    renderNode(el, tree, child, 0);
  }
}

function refreshWorkflowResults(el) {
  if (state.showTrash) {
    renderPanel(el);
    return;
  }
  const tree = el?.querySelector?.(".workspace2-tree");
  if (!tree) {
    renderPanel(el);
    return;
  }
  closeContextMenu();
  const query = state.query.trim();
  const scrollTop = query ? 0 : tree.scrollTop;
  tree.replaceChildren();
  renderWorkflowTreeBody(el, tree);
  tree.scrollTop = scrollTop;
}

function scheduleWorkflowResultsRefresh(el) {
  if (state.resultsRefreshTimer) {
    clearTimeout(state.resultsRefreshTimer);
  }
  state.resultsRefreshTimer = window.setTimeout(() => {
    state.resultsRefreshTimer = null;
    refreshWorkflowResults(el);
  }, WORKFLOW_SEARCH_RENDER_DELAY);
}

function isWorkflowSectionCollapsed(key) {
  return localStorage.getItem(key) === "1";
}

function setWorkflowSectionCollapsed(key, collapsed) {
  localStorage.setItem(key, collapsed ? "1" : "0");
}

function createWorkflowSection({ title, collapsedKey, className = "", content }) {
  const section = document.createElement("section");
  section.className = `workspace2-workflow-section ${className}`.trim();
  const collapsed = isWorkflowSectionCollapsed(collapsedKey);
  section.classList.toggle("is-collapsed", collapsed);

  const { header } = createSectionHeader({
    titleText: title,
    collapsible: true,
    expanded: !collapsed,
  });

  const body = document.createElement("div");
  body.className = "workspace2-workflow-section-content";
  body.append(content);

  header.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    const next = !section.classList.contains("is-collapsed");
    section.classList.toggle("is-collapsed", next);
    setSectionHeaderExpanded(header, !next);
    setWorkflowSectionCollapsed(collapsedKey, next);
  });

  section.append(header, body);
  return section;
}

function recentWorkflowRows(el) {
  const existing = new Map(state.items.filter((item) => item.type === "file").map((item) => [item.path, item]));
  const recent = readRecentWorkflows()
    .map((entry) => ({ ...entry, item: existing.get(entry.path) }))
    .filter((entry) => entry.item)
    .slice(0, workflowRecentLimit());
  const section = document.createElement("div");
  section.className = "workspace2-recent-workflows";
  const label = document.createElement("div");
  label.className = "workspace2-current-workflow-label";
  label.textContent = t("workflows.recent");
  section.append(label);

  if (!recent.length) {
    const empty = document.createElement("div");
    empty.className = "workspace2-current-workflow-name is-empty";
    empty.textContent = t("workflows.currentEmpty");
    section.append(empty);
    return section;
  }

  for (const entry of recent) {
    const row = document.createElement("div");
    row.className = "workspace2-current-workflow";
    if (entry.path === state.selectedPath) {
      row.classList.add("is-selected");
    }
    const info = document.createElement("button");
    info.type = "button";
    info.className = "workspace2-current-workflow-info";
    info.title = entry.path;
    const name = document.createElement("div");
    name.className = "workspace2-current-workflow-name";
    name.textContent = workflowDisplayName(entry.item) || entry.name || entry.path;
    info.append(name);
    info.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      try {
        state.selectedPath = entry.path;
        await openWorkflow(entry.path);
        renderPanel(el);
      } catch (error) {
        handleError(el, error);
      }
    });

    const actions = document.createElement("div");
    actions.className = "workspace2-actions";
    if (entry.path === state.selectedPath) {
      actions.append(
        iconButton("save", t("workflows.saveCurrent"), async (event) => {
          event.preventDefault();
          event.stopPropagation();
          try {
            await saveCurrentWorkflowToPath(el, entry.path);
          } catch (error) {
            handleError(el, error);
          }
        }),
      );
    }
    actions.append(
      iconButton("x", t("workflows.removeRecent"), (event) => {
        event.preventDefault();
        event.stopPropagation();
        removeRecentWorkflow(entry.path);
        renderPanel(el);
      }),
    );
    row.append(info, actions);
    section.append(row);
  }
  return section;
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

  const panel = document.createElement("div");
  panel.className = "workspace2-panel";
  applyWorkflowUiScale(panel);
  panel.addEventListener("click", () => {
    closeContextMenu();
    closeWorkflowSortMenu();
  });

  const top = document.createElement("div");
  top.className = "workspace2-top";

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
  top.append(header, toolbar);

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
    top.append(emptyTrashRow);
    panel.append(top);
    renderTrashPanel(el, panel);
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

  top.append(moveRootRow, openSection);
  panel.append(top, browseSection);
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
  const row = document.createElement("div");
  row.className = "workspace2-template-row";
  const isEditing = templatesState.editingTemplateId === template.id;
  if (templatesState.pendingTemplate?.id === template.id) {
    row.classList.add("is-selected");
  }
  row.draggable = !isEditing;
  row.title = t("templates.dropHint");
  row.dataset.workspace2TemplateId = template.id;
  makeTemplateDropTarget(el, row, template.groupId || "", template.id);

  const icon = iconSvg("template");
  const info = document.createElement("div");
  info.className = "workspace2-template-info";
  const name = document.createElement("div");
  name.className = "workspace2-template-name";
  if (isEditing) {
    const input = document.createElement("input");
    input.className = "workspace2-rename-input";
    input.value = template.name;
    isolateComfyKeys(input);
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        try {
          await renameTemplate(el, template, input.value);
        } catch (error) {
          templatesState.error = error.message;
          renderTemplatesPanel(el);
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        templatesState.editingTemplateId = "";
        renderTemplatesPanel(el);
      }
    });
    input.addEventListener("blur", async () => {
      try {
        await renameTemplate(el, template, input.value);
      } catch (error) {
        templatesState.error = error.message;
        renderTemplatesPanel(el);
      }
    });
    name.append(input);
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  } else {
    name.textContent = template.name;
  }
  const meta = document.createElement("div");
  meta.className = "workspace2-template-meta";
  meta.textContent = t("templates.meta", {
    nodes: template.nodes?.length || 0,
    links: template.links?.length || 0,
  });
  info.append(name, meta);
  const actions = document.createElement("div");
  actions.className = "workspace2-actions";
  actions.addEventListener("pointerenter", hideNodePreview);
  actions.append(
    dangerIconButton("trash", t("templates.delete"), (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestDeleteTemplate(el, template, event.currentTarget);
    }),
  );
  row.append(icon, info, actions);

  row.addEventListener("dragstart", (event) => {
    if (event.target?.closest?.("button,input,.workspace2-actions")) {
      event.preventDefault();
      return;
    }
    hideNodePreview();
    templatesState.draggingTemplate = template;
    event.dataTransfer.effectAllowed = "copyMove";
    event.dataTransfer.setData(TEMPLATE_DRAG_TYPE, JSON.stringify(template));
    event.dataTransfer.setData("text/plain", template.name);
  });
  row.addEventListener("dragend", () => {
    templatesState.draggingTemplate = null;
  });
  row.addEventListener("contextmenu", (event) => {
    openTemplateContextMenu(el, event, template);
  });
  row.addEventListener("click", (event) => {
    if (isEditing || event.target?.closest?.("button,input,.workspace2-actions")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    setPendingTemplate(templatesState.pendingTemplate?.id === template.id ? null : template);
  });
  row.addEventListener("pointerenter", (event) => {
    if (!isEditing && !templatesState.draggingTemplate && !event.target?.closest?.(".workspace2-actions")) {
      showTemplatePreview(template, event, { panelElement: el });
    }
  });
  row.addEventListener("pointermove", (event) => {
    if (event.target?.closest?.(".workspace2-actions")) {
      hideNodePreview();
      return;
    }
    if (!isEditing && !templatesState.draggingTemplate && nodesState.previewPopover && !nodesState.previewPopover.hidden) {
      positionNodePreviewPopover(nodesState.previewPopover, event, { panelElement: el });
    }
  });
  row.addEventListener("pointerleave", () => {
    if (nodesState.previewPopover && !nodesState.previewPopover.hidden) {
      hideNodePreview();
    }
  });
  row.addEventListener("dblclick", async (event) => {
    if (event.target?.closest?.("button,input,.workspace2-actions")) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    hideNodePreview();
    try {
      await addTemplateToCanvas(template, canvasCenterPosition());
      await recordTemplateUse(el, template.id);
    } catch (error) {
      templatesState.error = error.message;
      renderTemplatesPanel(el);
    }
  });
  return row;
}

function templateMatchesGroup(group, query) {
  const directTemplates = (templatesState.library?.templates || [])
    .filter((template) => template.groupId === group.id)
    .some((template) => templateMatchesQuery(template, query));
  if (directTemplates) {
    return true;
  }
  if (query && group.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) {
    return true;
  }
  return childTemplateGroups(group.id).some((child) => templateMatchesGroup(child, query));
}

function renderTemplateGroupFolder(el, section, group, query, depth = 0) {
  const groupTemplates = (templatesState.library?.templates || [])
    .filter((template) => template.groupId === group.id)
    .filter((template) => templateMatchesQuery(template, query))
    .sort((a, b) => compareTemplatesBySort(a, b, query));
  const childGroups = childTemplateGroups(group.id)
    .filter((childGroup) => !query || templateMatchesGroup(childGroup, query));
  if (query && !groupTemplates.length && !childGroups.length) {
    return;
  }
  const groupOpen = templatesState.expanded.has(group.id) || Boolean(query);

  const header = document.createElement("div");
  header.className = "workspace2-node-folder-header";
  header.style.setProperty("--indent", `${depth * 16 + 4}px`);
  header.dataset.workspace2TemplateGroupId = group.id;
  makeTemplateDropTarget(el, header, group.id);
  makeTemplateGroupDragSource(header, group);
  header.addEventListener("click", (event) => {
    if (event.target.closest("button,input")) {
      return;
    }
    event.stopPropagation();
    toggleTemplateGroup(el, group.id, event.ctrlKey || event.metaKey);
  });
  header.addEventListener("contextmenu", (event) => openTemplateGroupContextMenu(el, event, group));

  const disclosure = document.createElement("button");
  disclosure.className = `workspace2-disclosure ${groupOpen ? "is-open" : ""}`;
  disclosure.type = "button";
  disclosure.title = groupOpen ? t("folder.collapse") : t("folder.expand");
  disclosure.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleTemplateGroup(el, group.id, event.ctrlKey || event.metaKey);
  });

  const icon = document.createElement("span");
  applyDecoratedIcon(icon, group.icon, group.color, groupOpen ? DEFAULT_FOLDER_OPEN_ICON_CLASS : DEFAULT_FOLDER_ICON_CLASS);

  const name = document.createElement("div");
  name.className = "workspace2-name";
  if (templatesState.editingGroupId === group.id) {
    const input = document.createElement("input");
    input.className = "workspace2-rename-input";
    input.value = group.name;
    isolateComfyKeys(input);
    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        try {
          await commitTemplateGroupRename(el, group, input.value);
        } catch (error) {
          templatesState.error = error.message;
          renderTemplatesPanel(el);
        }
      }
      if (event.key === "Escape") {
        event.preventDefault();
        templatesState.editingGroupId = "";
        renderTemplatesPanel(el);
      }
    });
    input.addEventListener("blur", async () => {
      try {
        await commitTemplateGroupRename(el, group, input.value);
      } catch (error) {
        templatesState.error = error.message;
        renderTemplatesPanel(el);
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
    iconButton("folderPlus", t("menu.newSubfolder"), async () => createTemplateGroup(el, group.id)),
    iconButton("edit", t("templates.renameGroup"), () => {
      templatesState.editingGroupId = group.id;
      renderTemplatesPanel(el);
    }),
    dangerIconButton("trash", t("templates.deleteGroupTitle"), (event) => {
      event.preventDefault();
      event.stopPropagation();
      requestDeleteTemplateGroup(el, group, event.currentTarget);
    }),
  );

  header.append(disclosure, icon, name, actions);
  section.append(header);

  if (!groupOpen) {
    return;
  }
  for (const childGroup of childGroups) {
    renderTemplateGroupFolder(el, section, childGroup, query, depth + 1);
  }
  const list = document.createElement("div");
  list.className = "workspace2-node-list workspace2-template-list";
  list.style.setProperty("--indent", `${(depth + 1) * 16 + 4}px`);
  makeTemplateDropTarget(el, list, group.id);
  for (const template of groupTemplates) {
    list.append(renderTemplateRow(el, template));
  }
  section.append(list);
}

function renderTemplatesBody(el, body) {
  if (!templatesState.library && !templatesState.loading) {
    loadTemplateLibrary().then(() => renderTemplatesPanel(el));
  }

  if (templatesState.loading) {
    const loading = document.createElement("div");
    loading.className = "workspace2-empty";
    loading.textContent = t("status.loading");
    body.append(loading);
    return;
  }
  if (templatesState.error) {
    const error = document.createElement("div");
    error.className = "workspace2-empty";
    error.textContent = t("status.error", { message: templatesState.error });
    body.append(error);
    return;
  }
  const query = templatesState.query.trim();
  const allTemplates = templatesState.library?.templates || [];
  const rootTemplates = allTemplates
    .filter((template) => !template.groupId)
    .filter((template) => templateMatchesQuery(template, query))
    .sort((a, b) => compareTemplatesBySort(a, b, query));
  const rootGroups = childTemplateGroups("")
    .filter((group) => !query || templateMatchesGroup(group, query));
  const hasMatches = rootTemplates.length || rootGroups.length;
  if (!hasMatches) {
    const empty = document.createElement("div");
    empty.className = "workspace2-empty";
    empty.textContent = query ? t("templates.noMatches") : t("templates.empty");
    body.append(empty);
    return;
  }

  const section = document.createElement("div");
  section.className = "workspace2-node-section";
  const rootList = document.createElement("div");
  rootList.className = "workspace2-node-list workspace2-template-list";
  makeTemplateDropTarget(el, rootList, "");
  for (const template of rootTemplates) {
    rootList.append(renderTemplateRow(el, template));
  }
  section.append(rootList);
  for (const group of rootGroups) {
    renderTemplateGroupFolder(el, section, group, query, 0);
  }
  body.append(section);
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
    openTemplateSortMenu(el, event.currentTarget);
  });
  button.classList.add("workspace2-template-sort-button");
  button.dataset.sort = templatesState.sort;
  return button;
}

function openTemplateSortMenu(el, anchor) {
  closeTemplateSortMenu();
  const panel = anchor?.closest?.(".workspace2-panel") || el.querySelector(".workspace2-panel");
  const menu = document.createElement("div");
  menu.className = "workspace2-context";
  const rect = anchor.getBoundingClientRect();
  const panelRect = panel?.getBoundingClientRect();
  menu.style.left = `${Math.max(8, rect.left - (panelRect?.left || 0))}px`;
  menu.style.top = `${rect.bottom - (panelRect?.top || 0) + 4}px`;
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
  const header = createPanelHeader(t("templates.title"), t("templates.status", { count: templates.length }), { statusDataset: "workspace2TemplatesStatus" });
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
  const toolbar = createSearchToolbar({
    focusKey: "templates-search",
    placeholder: t("templates.searchPlaceholder"),
    value: templatesState.query,
    buttons: [newGroup, save, templatesSortButton(el)],
    onInput: (value) => {
      templatesState.query = value;
      renderTemplatesPanel(el);
    },
  });
  const rootRow = templatesRootRow(el);
  top.append(header, toolbar, rootRow);

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

  const header = createPanelHeader(t("nodes.title"), statusText, { statusDataset: "workspace2NodesStatus" });
  const toolbar = createSearchToolbar({
    focusKey: "nodes-search",
    placeholder: t("nodes.searchPlaceholder"),
    value: nodesState.query,
    buttons: [newGroup, nodesPreviewModeButton(el), syncOfficial, nodesSortButton(el)],
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

function sidebarLocation() {
  const value = app.ui?.settings?.getSettingValue?.("Comfy.Sidebar.Location")
    ?? app.extensionManager?.setting?.get?.("Comfy.Sidebar.Location")
    ?? localStorage.getItem("Comfy.Sidebar.Location");
  return String(value || "left").toLowerCase() === "right" ? "right" : "left";
}

function positionNodePreviewAtCursor(preview, event) {
  const gap = 16;
  const rect = preview.getBoundingClientRect();
  let left = event.clientX + gap;
  let top = event.clientY + gap;
  if (left + rect.width > window.innerWidth - 8) {
    left = Math.max(8, event.clientX - rect.width - gap);
  }
  if (top + rect.height > window.innerHeight - 8) {
    top = Math.max(8, event.clientY - rect.height - gap);
  }
  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
}

function positionNodePreviewPopover(preview, event, options = {}) {
  if (options.followCursor) {
    positionNodePreviewAtCursor(preview, event);
    return;
  }
  const gap = 16;
  const previewWidth = Math.min(248, window.innerWidth - 24);
  const targetRect = event?.currentTarget?.getBoundingClientRect?.();
  const localPanel = event?.currentTarget?.closest?.(".workspace2-panel,.workspace2-shell");
  const panelRect = options.panelElement?.getBoundingClientRect?.()
    || localPanel?.getBoundingClientRect?.()
    || nodesState.renderTarget?.getBoundingClientRect?.()
    || targetRect;
  const clientX = event?.clientX || 0;
  const clientY = event?.clientY || 0;
  preview.style.left = "0px";
  preview.style.top = "0px";
  preview.style.width = `${previewWidth}px`;
  const rect = preview.getBoundingClientRect();
  let left;
  if (sidebarLocation() === "left") {
    left = (panelRect?.right ?? clientX) + gap;
    if (left + previewWidth > window.innerWidth - 8) {
      left = Math.max(8, (panelRect?.left ?? clientX) - previewWidth - gap);
    }
  } else {
    left = (panelRect?.left ?? clientX) - previewWidth - gap;
    if (left < 8) {
      left = Math.min(window.innerWidth - previewWidth - 8, (panelRect?.right ?? clientX) + gap);
    }
  }
  const anchorY = targetRect ? targetRect.top + targetRect.height / 2 : clientY;
  let top = anchorY - rect.height * 0.3;
  if (top + rect.height > window.innerHeight - gap) {
    top = window.innerHeight - rect.height - gap;
  }
  top = Math.max(gap, top);
  preview.style.left = `${left}px`;
  preview.style.top = `${top}px`;
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

function templatePreviewNodes(template) {
  return (Array.isArray(template?.nodes) ? template.nodes : [])
    .map((node) => {
      const relPos = Array.isArray(node?.relPos) ? node.relPos : null;
      const pos = relPos || (Array.isArray(node?.pos) ? node.pos : [0, 0]);
      const size = vectorPair(node?.size, [180, 80]);
      return {
        id: String(node?.id ?? ""),
        type: String(node?.type || ""),
        title: String(node?.title || node?.type || ""),
        x: Number(pos?.[0] || 0),
        y: Number(pos?.[1] || 0),
        width: Math.max(40, Number(size[0] || 180)),
        height: Math.max(24, Number(size[1] || 80)),
        color: String(node?.color || ""),
        bgcolor: String(node?.bgcolor || ""),
        mode: Number(node?.mode || 0),
      };
    })
    .filter((node) => node.type || node.id);
}

function templatePreviewBounds(nodes) {
  if (!nodes.length) {
    return { minX: 0, minY: 0, width: 100, height: 100 };
  }
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const node of nodes) {
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + node.width);
    maxY = Math.max(maxY, node.y + node.height);
  }
  const width = Math.max(100, maxX - minX);
  const height = Math.max(100, maxY - minY);
  return { minX, minY, width, height };
}

function templatePreviewNodeFill(node) {
  if (node.mode === 4) {
    return "#45424d";
  }
  if (node.bgcolor && /^(#|rgb|hsl)/i.test(node.bgcolor)) {
    return node.bgcolor;
  }
  if (node.color && /^(#|rgb|hsl)/i.test(node.color)) {
    return node.color;
  }
  const normalized = node.type.toLowerCase();
  if (normalized.includes("image")) return "#335f87";
  if (normalized.includes("latent")) return "#6f4a82";
  if (normalized.includes("model")) return "#615384";
  if (normalized.includes("clip") || normalized.includes("text")) return "#70623e";
  if (normalized.includes("vae")) return "#804b4b";
  return "#4f5663";
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function renderTemplateMinimap(template, options = {}) {
  const width = Number(options.width || 320);
  const height = Number(options.height || 190);
  const padding = 18;
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  const canvas = document.createElement("canvas");
  canvas.className = "workspace2-template-minimap";
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = "100%";
  canvas.style.aspectRatio = `${width} / ${height}`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return canvas;
  }
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#181a1f";
  ctx.fillRect(0, 0, width, height);

  const nodes = templatePreviewNodes(template);
  if (!nodes.length) {
    ctx.fillStyle = "#7e828c";
    ctx.font = "12px sans-serif";
    ctx.fillText(t("templates.empty"), padding, height / 2);
    return canvas;
  }

  const bounds = templatePreviewBounds(nodes);
  const scale = Math.min(
    (width - padding * 2) / bounds.width,
    (height - padding * 2) / bounds.height,
  );
  const offsetX = (width - bounds.width * scale) / 2 - bounds.minX * scale;
  const offsetY = (height - bounds.height * scale) / 2 - bounds.minY * scale;
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const project = (x, y) => [x * scale + offsetX, y * scale + offsetY];

  ctx.save();
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(178, 184, 196, 0.32)";
  for (const link of Array.isArray(template?.links) ? template.links : []) {
    const origin = nodeById.get(String(link?.origin_id ?? ""));
    const target = nodeById.get(String(link?.target_id ?? ""));
    if (!origin || !target) {
      continue;
    }
    const [x1, y1] = project(origin.x + origin.width, origin.y + origin.height * 0.5);
    const [x2, y2] = project(target.x, target.y + target.height * 0.5);
    const dx = Math.max(16, Math.abs(x2 - x1) * 0.45);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.bezierCurveTo(x1 + dx, y1, x2 - dx, y2, x2, y2);
    ctx.stroke();
  }
  ctx.restore();

  for (const node of nodes) {
    const [x, y] = project(node.x, node.y);
    const nodeWidth = Math.max(12, node.width * scale);
    const nodeHeight = Math.max(8, node.height * scale);
    const radius = Math.min(5, Math.max(2, nodeHeight * 0.16));
    ctx.fillStyle = templatePreviewNodeFill(node);
    ctx.strokeStyle = "rgba(226, 229, 235, 0.42)";
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, x, y, nodeWidth, nodeHeight, radius);
    ctx.fill();
    ctx.stroke();

    if (nodeWidth > 28 && nodeHeight > 12) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
      ctx.fillRect(x + 5, y + 5, Math.max(8, nodeWidth * 0.36), 2);
    }
  }

  return canvas;
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

function favoriteGroupKeys(groupId) {
  const keys = [];
  if (!groupId || groupId === NODE_DEFAULT_GROUP_ID) {
    return keys;
  }
  keys.push(groupId);
  for (const child of childNodeGroups(groupId)) {
    keys.push(...favoriteGroupKeys(child.id));
  }
  return keys;
}

function toggleFavoriteGroup(el, groupId, recursive = false) {
  const isOpen = nodesState.expanded.has(groupId);
  if (recursive) {
    setExpandedRecursive(nodesState.expanded, favoriteGroupKeys(groupId), !isOpen);
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
        list.append(renderAllNodeRow(el, node, favoriteTypes.has(node.type)));
      }
      section.append(list);
    }
  }
}

function renderNodeCategorySections(el, body) {
  const query = nodesState.query.trim().toLowerCase();
  const allNodes = getNodeDefinitions();
  const matchingNodes = allNodes.filter((node) => nodeMatchesQuery(node, query));
  const filtered = query ? sortNodeSearchResults(matchingNodes, query) : matchingNodes;
  const favoriteTypes = new Set(nodesState.library.favorites.map((favorite) => favorite.type));
  const comfyNodes = [];
  const extensionNodes = [];
  const unknownNodes = [];
  const visibleNodes = [];
  let visibleTotal = 0;
  for (const node of filtered) {
    if (isHiddenOfficialNodeSection(node)) {
      continue;
    }
    visibleTotal += 1;
    if (query && visibleNodes.length >= NODE_SEARCH_RESULT_LIMIT) {
      continue;
    }
    visibleNodes.push(node);
  }

  for (const node of query ? visibleNodes : filtered) {
    if (isHiddenOfficialNodeSection(node)) {
      continue;
    }
    if (isComfyCoreNode(node)) {
      comfyNodes.push(node);
    } else if (node.source === NODE_SOURCE.CUSTOM) {
      extensionNodes.push(node);
    } else {
      unknownNodes.push(node);
    }
  }

  const visibleSections = { ...defaultNodeVisibleSections(), ...(nodesState.visibleSections || {}) };
  if (!Object.values(visibleSections).some(Boolean)) {
    Object.assign(visibleSections, defaultNodeVisibleSections());
  }

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

function renderNodeTopSection(el, body, sectionId, titleText, nodes, totalCount, favoriteTypes) {
  const section = document.createElement("div");
  section.className = "workspace2-node-section";
  const sectionExpanded = renderTopSectionHeader(el, section, sectionId, titleText, `${nodes.length}/${totalCount}`);
  body.append(section);

  if (!sectionExpanded && !nodesState.query.trim()) {
    return;
  }

  if (!nodes.length) {
    const empty = document.createElement("div");
    empty.className = "workspace2-empty";
    empty.textContent = t("nodes.noNodeMatches");
    section.append(empty);
    return;
  }

  if (nodesState.query.trim()) {
    const list = document.createElement("div");
    list.className = "workspace2-node-list";
    for (const node of nodes) {
      list.append(renderAllNodeRow(el, node, favoriteTypes.has(node.type)));
    }
    section.append(list);
    return;
  }

  renderOfficialNodeTree(el, section, buildOfficialNodeTree(sectionId, nodes), favoriteTypes);
}
function renderAllNodeRow(el, node, isFavorite, depth = 0, parentKey = "") {
  const row = document.createElement("div");
  row.className = "workspace2-node-row";
  row.style.paddingLeft = `${8 + depth * 24}px`;
  row.dataset.workspace2NodeType = node.type;
  row.dataset.workspace2NodeParentKey = parentKey;
  if (nodesState.pendingNode?.type === node.type) {
    row.classList.add("is-selected");
  }
  row.title = node.type;
  makeNodeCanvasDragSource(row, node);
  row.addEventListener("mouseenter", (event) => showNodePreview(node, event));
  row.addEventListener("mousemove", moveNodePreview);
  row.addEventListener("mouseleave", hideNodePreview);
  row.addEventListener("contextmenu", (event) => {
    showNodePreview(node, event);
    openNodeContextMenu(el, event, node);
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
    showNodePreview(node, event);
    setPendingNode(nodesState.pendingNode?.type === node.type ? null : node);
  });

  const reorderHandle = document.createElement("span");
  if (nodesState.customOrderEnabled) {
    reorderHandle.className = "workspace2-reorder-handle";
    reorderHandle.title = t("nodes.reorderHandle");
    beginNodeReorderDrag(el, reorderHandle, row, {
      kind: "global",
      type: node.type,
      title: node.title,
      parentKey,
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
  name.textContent = node.title;
  info.append(name);

  const actions = document.createElement("div");
  actions.className = "workspace2-actions";
  const favoriteButton = iconButton(isFavorite ? "starFilled" : "star", isFavorite ? t("nodes.removeFavorite") : t("nodes.addFavorite"), async () => {
    if (isFavorite) {
      await removeFavoriteNode(el, node.type);
    } else {
      await addFavoriteNode(el, node);
    }
  });
  if (isFavorite) {
    favoriteButton.classList.add("is-favorite-active");
  }
  actions.append(favoriteButton);

  row.append(reorderHandle, dot, info, actions);
  return row;
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

  app.extensionManager.registerSidebarTab({
    id: WORKSPACE2_TAB_ID,
    icon: "pi pi-sitemap",
    title: t("workspace.title"),
    tooltip: t("workspace.tooltip"),
    type: "custom",
    render: renderWorkspace2Panel,
  });
  registry.add(WORKSPACE2_TAB_ID);
  return true;
}

app.registerExtension({
  name: EXTENSION_NAME,
  commands: [
    {
      id: "Workspace2.CanvasGroups.CreateGroup",
      label: "Workspace2: Create canvas group",
      function: () => {
        workspace2CanvasGroups.createGroupFromSelection?.();
      },
    },
    {
      id: "Workspace2.CanvasGroups.UngroupSelection",
      label: "Workspace2: Ungroup selected canvas group",
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
        content: "Workspace2 编组",
        callback: () => {
          workspace2CanvasGroups.createGroupFromSelection?.();
        },
      },
    ];
  },
  async setup() {
    installPerformanceDebugApi();
    const finish = startPerformanceSpan("workspace.setup");
    await loadLocale();
    startLocaleWatcher();
    setupWorkspaceShortcuts();
    workspace2CanvasGroups.init();
    registerWorkspace2CanvasGroupCommands();
    detectOfficialNodeAdapter();
    detectOfficialFavoritesProbe().catch((error) => {
      console.debug("[Workspace2] official favorites probe failed", error);
    });
    try {
      await loadWorkflows();
    } catch (error) {
      state.status = t("status.error", { message: error.message });
    }
    if (registerWorkspace2SidebarTab()) {
      finish({ sidebar: "registered" });
      return;
    }

    console.warn("[Workspace2] registerSidebarTab is not available; using fallback panel.");
    showFallbackPanel();
    finish({ sidebar: "fallback" });
  },
});

