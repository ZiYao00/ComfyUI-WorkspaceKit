# WK Nodes 2.0 兼容计划

状态：当前 Nodes 2.0 **P0 范围已完成**：普通节点、节点/模板放置、官方节点共存、WK 编组专项及渲染器切换均有隔离真实页面证据。此结论只覆盖本文列出的 P0 验收矩阵；未来新增 WK 功能仍须分别纳入 Nodes 2.0 回归。

## 目标与边界

WK 必须在 Legacy Canvas 与 ComfyUI Nodes 2.0（Vue 节点渲染）下保持可用。业务数据模型、工作流文件、节点收藏、模板库和服务端接口不因渲染器不同而复制两套实现。

Nodes 2.0 改变的是图层、DOM 命中、坐标和部分选择交互；不等于重写 WK 的工作流、模板或后端数据服务。

## 当前第一项：WK Latent Size

`WK Latent Size` 是第一个标准后端节点样本：以 Flux 的百万像素/比例计算尺寸，创建可设置批次的 `LATENT`，并输出 `width`、`height`、`resolution`。

- 不覆盖 `ControlAltAI-Nodes` 或 `comfyui_essentials` 的节点 ID。
- 不加载额外 Canvas/Vue JavaScript，不依赖 LiteGraph prototype。
- 每次实现都须在 Legacy 和 Nodes 2.0 中验证菜单显示、参数编辑、连线、执行与重载。
- 相关来源和 MIT License 的本地留档位于 `.codex-backups/40-templates-nodes/third-party-node-sources-nodes2-p0-20260817-182231.zip`；不随 Git 发布。

## P0 执行顺序

| 阶段 | 范围 | 完成条件 |
| --- | --- | --- |
| P0-A | 只读审计与真实复现 | 记录当前 ComfyUI/Frontend/WK 版本、Legacy/Nodes 2.0 矩阵、首个真实失败点和风险触点；不改生产画布逻辑。 |
| P0-B | Graph Runtime Adapter | 集中提供渲染器检测、Graph surface 判断和 client→graph 坐标边界；未知环境 fail-open。 |
| P0-C | 节点/模板投放 | Nodes/Template 的拖放、点击放置、取消在两种渲染器下通过。 |
| P0-D | 官方交互共存 | 不阻挡官方节点拖动、控件、选择、右键、复制粘贴。 |
| P0-E | WK 编组专项 | 显示、命中、拖动、缩放、多选、调整大小、转换和嵌套编组在两种渲染器下验证；无法安全支持的高级能力必须显式降级。 |
| P0-F | 切换与回归 | Legacy↔Nodes 2.0、刷新、切工作流、缩放和复杂工作流通过。 |

## 实现规则

1. 不在业务模块散落 `if (Nodes2)`；运行时差异只进入 Adapter。
2. 不复制 ComfyUI_frontend 的 GPL 实现；只依据公开文档、可观察行为和公开运行时对象独立实现。
3. 不新增 `LGraphCanvas`、`LGraphNode` 或 `ComfyNode` prototype patch。
4. 不把私有 Vue store 或不稳定 DOM selector 当作核心接口；如必须使用 DOM 路径，必须集中、窄范围、可探测且 fail-open。
5. 编组是独立高风险阶段；不能以 z-index 修补替代真实的命中、拖动和层级验证。

## 最低验收矩阵

| 能力 | Legacy | Nodes 2.0 |
| --- | --- | --- |
| WK 入口和三个核心面板 | 必须通过 | 必须通过 |
| WK Latent Size | 必须通过 | 必须通过 |
| 节点/模板放置与取消 | 必须通过 | 必须通过 |
| 官方节点基础拖动、控件、选择、右键 | 不受 WK 影响 | 不受 WK 影响 |
| WK 编组显示与核心交互 | 必须通过 | 必须通过或安全降级 |
| Legacy↔Nodes 2.0 运行时切换 | 必须通过 | 必须通过 |

## 证据记录格式

每个结论应记录：环境、ComfyUI backend/frontend 版本、WK revision、渲染器、复现步骤、观察结果、控制台、相关官方来源、相关 WK 文件、风险和下一步。

`docs/TESTING.md` 只记录已经执行的测试，不提前写通过结论。

## 已记录证据

### 2026-08-17 - P0-A Legacy 基线与首个节点

- 测试包：ComfyUI `0.33.0`、Python `3.12.10`、WK `0.2.6`，地址 `http://127.0.0.1:8190/`。
- 只读探针 `scripts/e2e/p0-nodes2-runtime-audit.mjs` 观察到
  `Comfy.VueNodes.Enabled=false`、`LGraphCanvas` / `LGraph` 存在、页面中
  Vue 节点元素数量为 0。因此本次已证实的是 Legacy 基线，不能推断
  Nodes 2.0 已兼容。
- 触点审计：普通 Python 节点不接触画布渲染器；节点/模板投放集中于
  `entry/nodes/drag-drop.js` 与其由 `entry.js` 注入的画布 helper；WK 编组
  当前直接依赖 LiteGraph 的画布、缩放偏移、选择集与绘制钩子，仍是 P0-E
  专项风险。
- `WK Latent Size` 已在 Legacy 实际页面创建，6 个输入控件与 `LATENT` /
  `width` / `height` / `resolution` 四个输出均正确。实际队列执行
  `WK Latent Size → Save Latent` 成功；临时输出已在验证后删除。
- 隔离浏览器将 Nodes 2.0 临时设为 `true` 后重载，`WK Latent Size` 的
  控件与端口仍正确，结束时恢复原始值。WK Nodes 面板的真实
  “点击节点 → 点击空白画布”也通过：`GetNode` 成功创建，且临时节点已
  从内存图中移除。当前无需为了这条已通过路径新增猜测性的运行时 Adapter。
- 模板面板也在同一隔离 Nodes 2.0 环境通过：选择现有模板后点击空白画布，
  成功恢复 10 个节点。验收脚本在结束时删除全部临时图节点，并将模板库恢复为
  测试前的完整快照。

下一步：进入 WK 编组专项。编组不能因普通节点、节点投放或模板投放通过而
标记为完整兼容。

### 2026-08-17 - P0-E-1 编组创建与视觉边界

- 首次真实 Nodes 2.0 烟雾验收发现：图数据中的 `node.size` 为 `210×60`，
  但已渲染的 Vue 节点约为 `225×116`；同时 `boundingRect` 在布局前可为
  `[0,0,0,0]`。旧的 Canvas 尺寸路径会使 WK 编组裁掉节点的右、下边。
- 新增 `entry/canvas-groups/node-visual-bounds.js`：有效的原生
  `boundingRect` 优先；Nodes 2.0 可用时，从 `node-body-{id}` 最近的
  `.lg-node` 读取真实 DOM 矩形并换算为图坐标；DOM 不可用时回退到原有
  `node.pos/node.size`。不改图数据、拖动、序列化或转换逻辑。
- 真实 Nodes 2.0 验收创建两个临时节点并建 WK 编组，编组 DOM 框完整包含
  两个 DOM 节点；临时节点与编组均在隔离浏览器中销毁。Legacy 相关合同与
  全部前端模块语法检查已通过。

### 2026-08-17 - P0-E-2 编组核心交互

- 同一隔离 Nodes 2.0 页面中，真实拖动一个 WK 编组标题栏 `45×27` 屏幕像素（缩放
  `0.9`）后，编组与两个成员节点均移动 `50×30` 图坐标；没有修改工作流文件。
- 以正常点击第一个标题栏、`Shift` 点击第二个标题栏的真实交互选择两个编组后，
  拖动第二个标题栏 `36×18` 屏幕像素，两个编组及四个成员节点均移动 `40×20`
  图坐标；随后按 `Esc`，多选状态清空。
- 缩放验收曾出现下边界裁切。复核后发现根因是测试刚 `graph.add()` Vue 节点便立即
  建组，首个中间 DOM 布局高度尚未稳定；并非缩放转换修改了既有 bounds。验收夹具
  现在要求连续两帧视觉 bounds 一致后才创建临时编组。`0.9 → 1.0` 的真实滚轮缩放后，
  编组 DOM 框完整包含两个 `.lg-node` DOM 框。
- 调整大小的首个真实 Nodes 2.0 尝试失败后，已记录到手柄被节点输入端口覆盖，旧的
  “节点优先”规则将其设为 `pointer-events:none`。修复仅将显式的 `14px` 右下角调整
  手柄移出可透传拖动边集合；左右/底部拖动边仍保持节点优先。真实重验在 `0.9` 缩放下
  拖动 `45×30` 屏幕像素，编组宽高精确增加 `50×33.33` 图坐标，两个成员节点位置不变。
- 嵌套验收创建一个单节点子编组，再以三个节点创建完全包含它的父编组。数据模型中，
  父组只保存直属节点、子组保存自己的成员，避免节点列表重复；父框仍完整包含子框。
  在 `0.9` 缩放下拖父标题栏 `45×27` 屏幕像素后，父框、子框和全部三个节点均移动
  `50×30` 图坐标。全部为隔离浏览器中的临时图数据，结束后清理。
- 转换验收在隔离浏览器内存图中执行 `WorkspaceKit → LiteGraph 原生 → WorkspaceKit`：
  正向生成 1 个原生组并清除 WK 覆盖层，反向恢复 1 个 WK 组并清除原生组；标题、尺寸和
  两个节点位置保持。Vue DOM→图坐标可能产生小数，而 LiteGraph 原生组持久化坐标为整数，
  往返 `x/y` 最大量化为 1 图单位，已作为原生边界接受，而非节点/组的移动。
- 保存/重载验收使用隔离浏览器内存图：WK 编组已出现在 `graph.serialize()` 的
  `extra.xzgGroups`，随后通过 `app.loadGraphData(snapshot)` 重载。标题、完整 bounds、成员
  IDs、两个节点位置与 1 个 WK 覆盖层均恢复。没有调用工作流保存接口或写入测试包文件。
- 该阶段的视觉边界解析仍只在 `entry/canvas-groups/node-visual-bounds.js` 集中处理：
  真实可用 DOM 边界优先，Legacy 无 DOM 时保留图数据回退。没有新增 LiteGraph 或
  Vue 原型补丁。

P0-E 的创建、命中、拖动、缩放、多选、调整大小、嵌套、转换及内存保存/重载均已有
隔离 Nodes 2.0 证据。P0-F 的 Legacy↔Nodes 2.0 切换与复杂工作流载入也已有证据；
P0-D 官方交互共存仍未专项验收。

### 2026-08-18 - P0-F 渲染器切换与复杂工作流

- 以三个独立只读页面依次验证 Legacy → Nodes 2.0 → Legacy：三种状态均检测到 WK
  侧边栏入口、WK 编组覆盖层和官方 `#graph-canvas`。Nodes 2.0 状态检测到 10 个
  `.lg-node` Vue 节点；两次 Legacy 状态均为 0。
- 复杂工作流只读载入：`VIDEO/wan22-i2v-SVI_Kenpechi_v3.5.json` 在 Nodes 2.0 下的
  接口数据和实际画布均为 303 节点、28 个 LiteGraph 原生编组、0 个 WK 覆盖组，且
  页面存在 303 个 Vue 节点。没有调用保存或修改文件。

下一步：完成 P0-D，并复验人工回归发现的透明标题与单编组拖动。

### 2026-08-18 - 人工 Nodes 2.0 回归与纠正

- 人工验收否定了此前“P0 已完成”的表述：开启 Nodes 2.0 后，`Transparent Title（透明标题）` 不可见；拖动单个 WK 编组时，框体移动而内部节点不跟随。
- 已确认根因一：透明标题只使用 LiteGraph Canvas 的 `onDrawBackground`，而 Nodes 2.0 使用 Vue DOM，不会执行该可见绘制路径。修复改为只对 `Workspace2Title` 挂载 Node 2.0 DOM 呈现层；隔离页面已确认默认文字可见、尺寸为 `260×90`。双击编辑的真实鼠标路径仍待人工复验。
- 已确认根因二：单拖、多拖及调尺寸路径仍只监听 `mousemove/mouseup`；Nodes 2.0 的 pointer-captured 手势不保证这些兼容鼠标事件。三条路径已统一为 `pointermove/pointerup/pointercancel` 加旧鼠标事件的可重复监听/一次性清理。隔离真实鼠标拖动 `45×27` 像素（缩放 `0.9`）后，编组及两个成员节点均移动 `50×30` 图坐标。
- 修复后真实鼠标验证：透明标题 Node 2.0 DOM 呈现层显示默认文字、尺寸为 `260×90`；对可见节点区域双击会打开既有编辑器。单编组标题栏拖动 `45×27` 屏幕像素（缩放 `0.9`）时，编组及两个成员节点均移动 `50×30` 图坐标。

### 2026-08-18 - P0-D 官方交互共存

- 在隔离 Nodes 2.0 页面创建三个临时官方节点，并保持 WK 编组覆盖层已初始化。普通节点从 `(160,160)` 实际拖动至 `(200,182)`；点击后进入官方选择集；右键 `contextmenu` 事件正常到达。
- `Ctrl+C / Ctrl+V` 将图节点数从 `3` 增至 `4`；`CLIPTextEncode` 的真实文本控件可输入并保留 `WK Nodes2 control probe`。WK 覆盖层计算样式保持 `pointer-events: none`，因此不占用官方节点本体命中。
- `WK Latent Size` 的 `megapixels` 已保持 Flux Resolution Calc 的 `0.1–2.5 / 0.1 step`；`aspect_ratio` 已补齐原节点的全部 23 个比例。该节点继续以 WK 自有后端实现产生 LATENT 与尺寸输出，不复制原插件代码。

## P0 收口结论

P0-A 至 P0-F 已完成。提交前已执行 Python 节点合同、前端模块语法、组命中合同、视觉边界合同、透明标题 Nodes 2.0 可见/双击编辑、单编组真实拖动及官方节点共存验证。后续新功能进入时，必须在对应功能批次补充 Legacy 与 Nodes 2.0 双路径测试，不将本次 P0 结论外推为所有未来功能自动兼容。

### 2026-08-18 - 编组节点位置桥接复验

- 用户真实验收发现此前“成员节点已随编组移动”的结论不充分：旧验收只读取
  `node.pos`，没有测量 Nodes 2.0 的 `.lg-node` 实际 DOM 位置。
- 根因是逐项写入 `node.pos[0]` / `node.pos[1]` 只改变兼容图数据，未必通知 Vue
  布局层。`entry/canvas-groups/node-position-sync.js` 将这一差异集中处理：Nodes 2.0
  改为整体赋值 `node.pos = [x, y]`，Legacy 保留原有就地写入。
- 隔离真实浏览器在 `0.9` 缩放下复验单编组：标题栏拖动 `45×27` 屏幕像素后，编组和
  两个节点的图坐标均移动 `50×30`；两个 `.lg-node` DOM 矩形均移动 `45×27`。
- 多选两个编组复验：拖动 `36×18` 屏幕像素后，四个成员节点图坐标均移动 `40×20`，
  四个 DOM 矩形均移动 `36×18`；节点坐标容器前后均为 `Float64Array`。验收脚本现已把
  数据坐标、DOM 坐标及容器类型一并作为通过条件。
