// Field metadata for the WorkspaceKit Appearance editor.
//
// Two independent axes per field:
//   - section: the theme JSON structure (colors.node_slot / litegraph_base /
//     comfy_base). Fixed by the data format; the data layer reads/writes by it.
//   - group: a UI-only grouping that may span sections, ordered by how often
//     the user actually adjusts it.

export const GROUP_META = [
  { id: "node-title", label: "节点标题", description: "节点顶部标题栏的颜色与选中态。" },
  { id: "node-panel", label: "节点面板", description: "节点主体背景、轮廓、旁路/错误状态、阴影、形状与徽章。" },
  { id: "node-font", label: "节点字体", description: "节点内文字的颜色与字号。" },
  { id: "slots-links", label: "端子 / 连线", description: "各数据类型的插槽颜色，以及默认/事件/正在连接的连接线。" },
  { id: "background", label: "背景 / 画布", description: "画布底色与背景图片。" },
  { id: "widgets", label: "控件", description: "节点上的输入控件（滑块、下拉、文本框）样式。" },
  { id: "interface", label: "界面", description: "ComfyUI 菜单、侧边栏、输入框、表格等界面颜色。" },
  { id: "other", label: "其他", description: "主题文件中未被识别归类的字段，原样保留。" },
];

export const SECTION_META = {
  node_slot: {
    label: "节点插槽",
    description: "输入输出插槽及其连接线的数据类型颜色。",
  },
  litegraph_base: {
    label: "节点画布",
    description: "LiteGraph 节点、控件、连接线和画布的基础样式。",
  },
  comfy_base: {
    label: "ComfyUI 界面",
    description: "菜单、侧边栏、输入框、表格及其他界面颜色。",
  },
};

const color = (label, group, description = "") => ({ type: "color", label, group, description });
const number = (label, group, min, max, step = 1, description = "") => ({
  type: "number",
  label,
  group,
  min,
  max,
  step,
  description,
});
const select = (label, group, options, description = "") => ({
  type: "select",
  label,
  group,
  options,
  description,
});
const text = (label, group, description = "") => ({ type: "text", label, group, description });

export const FIELD_META = {
  node_slot: {
    "*": color("默认插槽颜色", "slots-links", "未单独定义的数据类型使用此颜色；空值表示沿用前端默认值。"),
    CLIP: color("CLIP", "slots-links", "文本编码器（CLIP）相关插槽。"),
    CLIP_VISION: color("CLIP Vision", "slots-links"),
    CLIP_VISION_OUTPUT: color("CLIP Vision 输出", "slots-links"),
    CONDITIONING: color("Conditioning", "slots-links", "正/负向提示词条件，连线最常见的类型之一。"),
    CONTROL_NET: color("ControlNet", "slots-links"),
    CONTROL_NET_STACK: color("ControlNet Stack", "slots-links", "ControlNet 堆叠（多个 ControlNet 串联）。"),
    CONTROL_NET_WEIGHTS: color("ControlNet Weights", "slots-links", "ControlNet 权重参数。"),
    IMAGE: color("Image", "slots-links", "图像数据，连线最常见的类型之一。"),
    IMAGEUPLOAD: color("Image Upload", "slots-links"),
    IMAGE_LIST: color("Image List", "slots-links"),
    IMAGE_LIST_SIMPLE: color("Image List Simple", "slots-links"),
    LATENT: color("Latent", "slots-links", "潜空间数据，采样流程的核心类型。"),
    MASK: color("Mask", "slots-links", "遮罩数据。"),
    MODEL: color("Model", "slots-links", "主模型（UNet）连线。"),
    STYLE_MODEL: color("Style Model", "slots-links"),
    VAE: color("VAE", "slots-links"),
    NOISE: color("Noise", "slots-links"),
    GUIDER: color("Guider", "slots-links"),
    SAMPLER: color("Sampler", "slots-links"),
    SCHEDULE: color("Schedule", "slots-links"),
    SIGMAS: color("Sigmas", "slots-links"),
    TAESD: color("TAESD", "slots-links"),
    BOOLEAN: color("Boolean", "slots-links", "布尔（真/假）参数插槽。"),
    INT: color("Integer", "slots-links", "整数参数插槽。"),
    FLOAT: color("Float", "slots-links", "浮点数参数插槽。"),
    STRING: color("String", "slots-links", "字符串参数插槽。"),
    SEED: color("Seed", "slots-links", "随机种子参数插槽。"),
    UPSCALE_MODEL: color("Upscale Model", "slots-links"),
  },
  litegraph_base: {
    BACKGROUND_IMAGE: text("画布背景图片", "background", "通常为 URL 或 data:image Base64。留空则不使用背景图。"),
    CLEAR_BACKGROUND_COLOR: color("画布背景色", "background", "整个节点画布的底色。"),
    NODE_TITLE_COLOR: color("标题文字", "node-title", "节点标题栏上的文字颜色。"),
    NODE_SELECTED_TITLE_COLOR: color("选中标题文字", "node-title", "节点被选中时标题文字的颜色。"),
    NODE_DEFAULT_COLOR: color("标题栏底色", "node-title", "节点标题栏的背景色。"),
    NODE_TEXT_SIZE: number("节点文字大小", "node-font", 8, 40, 1, "节点内主要文字的字号（像素）。"),
    NODE_TEXT_COLOR: color("节点文字", "node-font", "节点主体内的正文文字颜色。"),
    NODE_TEXT_HIGHLIGHT_COLOR: color("高亮文字", "node-font", "节点内被高亮/选中文本的颜色。"),
    NODE_SUBTEXT_SIZE: number("次级文字大小", "node-font", 6, 32, 1, "节点内次要说明文字的字号（像素）。"),
    DEFAULT_GROUP_FONT: number("分组标题字号", "node-font", 8, 64, 1, "画布分组框标题的字号（像素）。"),
    NODE_DEFAULT_BGCOLOR: color("主体背景", "node-panel", "节点主体（标题栏以下）的背景色。"),
    NODE_DEFAULT_BOXCOLOR: color("标识框", "node-panel", "节点上的小标识方块颜色。"),
    NODE_DEFAULT_SHAPE: select("节点形状", "node-panel", [
      { value: 0, label: "Box / 方形" },
      { value: 1, label: "Round / 圆角" },
      { value: 2, label: "Card / 卡片" },
      { value: 3, label: "Circle / 圆形" },
    ], "节点外框的默认形状。"),
    NODE_BOX_OUTLINE_COLOR: color("选中轮廓", "node-panel", "节点被选中时的外轮廓颜色。"),
    NODE_BYPASS_BGCOLOR: color("旁路背景", "node-panel", "节点处于 Bypass（旁路）状态时的背景色。"),
    NODE_ERROR_COLOUR: color("错误状态", "node-panel", "这是错误状态颜色，不是 Never/禁用节点颜色。"),
    DEFAULT_SHADOW_COLOR: color("节点阴影", "node-panel", "节点投影的颜色。"),
    BADGE_FG_COLOR: color("徽章前景", "node-panel", "节点角标/徽章上的文字颜色。"),
    BADGE_BG_COLOR: color("徽章背景", "node-panel", "节点角标/徽章的背景色。"),
    WIDGET_BGCOLOR: color("控件背景", "widgets", "节点上输入控件的背景色。"),
    WIDGET_OUTLINE_COLOR: color("控件轮廓", "widgets"),
    WIDGET_TEXT_COLOR: color("控件文字", "widgets"),
    WIDGET_SECONDARY_TEXT_COLOR: color("控件次要文字", "widgets", "控件上的次要/提示文字。"),
    WIDGET_DISABLED_TEXT_COLOR: color("控件禁用文字", "widgets", "控件被禁用时的文字颜色。"),
    LINK_COLOR: color("默认连接线", "slots-links", "未指定类型时连接线的默认颜色。"),
    EVENT_LINK_COLOR: color("事件连接线", "slots-links", "事件/触发类连接线的颜色。"),
    CONNECTING_LINK_COLOR: color("正在连接的线", "slots-links", "拖拽建立连接时那根线的颜色。"),
  },
  comfy_base: {
    "fg-color": color("界面前景色", "interface", "界面主要文字/图标颜色。"),
    "bg-color": color("界面背景色", "interface", "界面整体背景色。"),
    "comfy-menu-bg": color("菜单背景", "interface", "顶部菜单与侧边栏的背景色。"),
    "comfy-menu-secondary-bg": color("次级菜单背景", "interface"),
    "comfy-input-bg": color("输入框背景", "interface"),
    "input-text": color("输入文字", "interface"),
    "descrip-text": color("描述文字", "interface", "说明/提示类的次要文字颜色。"),
    "drag-text": color("拖拽提示文字", "interface"),
    "error-text": color("错误文字", "interface"),
    "border-color": color("界面边框", "interface"),
    "tr-even-bg-color": color("表格偶数行", "interface"),
    "tr-odd-bg-color": color("表格奇数行", "interface"),
    "content-bg": color("内容区背景", "interface"),
    "content-fg": color("内容区前景", "interface"),
    "content-hover-bg": color("内容区悬停背景", "interface"),
    "content-hover-fg": color("内容区悬停前景", "interface"),
    "bar-shadow": text("栏阴影", "interface", "CSS box-shadow 格式，例如 rgba(0,0,0,.5) 0 0 .5rem。"),
  },
};

export const KNOWN_KEYS = Object.fromEntries(
  Object.entries(FIELD_META).map(([section, fields]) => [section, Object.keys(fields)]),
);

export function inferFieldMeta(section, key, value) {
  const known = FIELD_META[section]?.[key];
  if (known) return known;

  if (typeof value === "number") {
    return number(key, "other", -9999, 9999, Number.isInteger(value) ? 1 : 0.01, "主题文件中的未识别数值字段。请在真实画布中验证效果。");
  }

  const looksLikeColor =
    typeof value === "string" &&
    (/^#(?:[0-9a-f]{3,8})$/i.test(value.trim()) || /^rgba?\(/i.test(value.trim()));

  if (looksLikeColor || (typeof value === "string" && /color|colour|bg|fg/i.test(key))) {
    return color(key, "other", "主题文件中的未识别颜色字段。字段会被原样保留。");
  }

  return text(key, "other", "主题文件中的未识别字段。字段会被原样保留。");
}
