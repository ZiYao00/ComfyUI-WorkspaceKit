# WK 图标系统计划

> 状态：**Batch 0–4 已完成；2026-08-15 P-05 审计已完成，剩余跨主题/缩放的真实视觉验收。**
>
> 更新：2026-08-15
> 范围：`ComfyUI-WorkspaceKit`（真源）、`ComfyUI-WorkspaceKit-Layout`、`ComfyUI-WorkspaceKit-Theme`

## 1. 目标

WK、WK 版式与 WK 主题目前混用 emoji、PrimeIcons、手写 SVG 和不同色彩图标。此计划建立一个可离线运行、可随主题变色、可由家族模块复用的图标系统；不改动现有功能语义、Provider ID 或快捷键。

本计划的结果是统一**图标语言**，不是把界面里的每一个符号都机械替换为同一种图标。

## 2. 图标分层

| 层级 | 适用位置 | 规则 |
| --- | --- | --- |
| 家族入口图标 | 三个插件的独立侧边栏入口 | WK 拼图、WK 主题、WK 版式各保留可识别轮廓；使用同尺寸、单色 SVG、`currentColor`，不再混用彩色 emoji 或 PrimeIcons。 |
| 功能图标 | 工具栏、更多菜单、设置、行操作、回收站等 | 采用固定版本的 Lucide SVG 子集；统一线宽、圆角端点、尺寸、焦点与禁用态。 |
| 内容/数据图标 | 用户定义的文件夹 emoji、模板数据、节点类别等 | 不是 UI chrome，不强制替换；保留用户数据与既有含义。 |

顶部固定标签保持**纯文字**：`工作流 / 节点 / 模板 / 主题 / 版式`。图标只用于独立侧边栏入口和功能操作；扩展下拉菜单显示本地化名称与“当前”状态，不使用 emoji 前缀。

## 3. 命名与图标合同

| 身份 | 中文完整名 | English full name | 顶部短标签 | 侧边栏图标键 |
| --- | --- | --- | --- | --- |
| 宿主 | WK 面板 | WK Panel | — | `workspacekit` |
| 主题 | WK 主题 | WK Theme | 主题 / Theme | `theme` |
| 版式 | WK 版式 | WK Layout | 版式 / Layout | `layout` |

- `id`、仓库名、存储键和 Provider API 不随展示名称变化；
- Provider 同时声明稳定的 `iconKey` 与本地化的 `tabLabel` / `displayLabel`，宿主不再从显示文字猜测图标；
- 所有 SVG 使用 `viewBox`、`currentColor`、统一 `stroke-linecap` / `stroke-linejoin`；颜色由宿主主题和状态类控制，不写死深色或浅色值。

## 4. 本地化与许可证

- 功能图标使用 Lucide 的**选定 SVG 子集**，固定版本并保存到 WK 本地真源；不在运行时通过 CDN 或 npm 网络加载；
- 只导入实际使用的图标，记录图标名、来源版本、许可证和本地文件哈希；
- 在 `docs/THIRD_PARTY_NOTICES.md` 保留 Lucide 的 ISC 许可证说明；
- Layout、Theme 独立运行时只读取各自 Vendor 副本；安装兼容 WK 时优先使用宿主当前运行时图标能力。

## 5. 分批执行

| 批次 | 目标 | 修改范围 | 通过条件 |
| --- | --- | --- | --- |
| 0 | 图标盘点与命名基线 | 三仓文档、测试记录 | 找到每种图标来源、使用位置和替换归属；不改 UI。 |
| 1 | WK Icon Kit 真源 | WK `entry/ui-kit/`、导出/校验脚本、Vendor | 离线 SVG 子集、三枚入口图标、许可证和静态校验可用；不迁移业务按钮。 |
| 2 | 侧边栏入口迁移 | WK、Layout、Theme | 三个独立入口在深色/浅色/透明/磨砂下同尺寸、同色彩逻辑、可点击。 |
| 3 | 高频功能图标迁移 | 按模块分批 | 每批只处理一个区域，例如工作流回收站或 Theme 动作条；菜单与按钮语义不变。 |
| 4 | 清理旧路径与公开指南 | 三仓文档、示例 | 无仍在使用的旧 sidebar emoji/PrimeIcon 路径；Provider 指南说明 `iconKey`。 |

每一批都要先创建对应仓库的源码备份。连续两次真实页面无法稳定定位问题时，回退本批而不叠加图标 CSS 补丁。

### Batch 0 基线记录（完成，2026-08-03）

- WK 宿主入口注册使用 `pi pi-sitemap`，随后由 `entry.js` 的专属 CSS 覆盖为 🧩；
- Layout 独立入口注册使用 `pi pi-minus`，随后由 `standalone-layout-panel.js` 的专属 CSS 覆盖为 📐；
- Theme 独立入口直接使用 `pi pi-palette`，Provider 使用彩色 🎨；
- WK 主面板已存在 `iconSvg()`；Theme 另有 `theme_icons.js`；Layout 主要通过 UI Template 的按钮原语生成图标按钮；
- 用户可配置的文件夹 PrimeIcon/emoji 与个性化 emoji 属于内容数据，不进入本轮替换范围。

结论：三仓并非缺少图标，而是入口、功能与数据图标没有明确所有权。Batch 1 只建立单一真源和离线 Vendor 能力，禁止提前改业务按钮或删除旧兼容路径。

### Batch 1 真源与 Vendor（完成，2026-08-03）

- 三仓修改前备份已创建：WK、Layout、Theme 各一份 `50-integrations/...before-wk-icon-kit-batch1-20260803-*` 源码压缩包；
- WK 真源新增 `entry/ui-kit/icons.js`：本地固定的功能 SVG 子集；截至 2026-08-15 审计共有 40 个键，包含三个入口键 `workspacekit` / `theme` / `layout`、`settings` / `trash` / `restore`，以及回收站返回、高频工具栏与行操作键；
- UI Template 升至 `1.5.0`，新增只增不破的 `icon-kit` capability 和 `createIcon(iconKey, options)`；
- 现有多目标导出已把 `icons.js` 与 `1.5.0` manifest 写入 Layout、Theme Vendor，并通过双端哈希校验；
- 已通过 `node --check`、Panel UI Template primitive / compatibility / export contracts。尚未在真实页面替换图标，因此本批不声称视觉验收完成。

### Batch 2 侧边栏入口迁移（部分完成，2026-08-03）

- 三仓修改前备份已创建：`50-integrations/...before-wk-icon-kit-batch1-20260803-*`；
- WK 的可见侧边栏入口已由 🧩 emoji 覆盖改为本地图标 `workspacekit` 的单色 SVG mask；ComfyUI 注册 API 仍保留隐藏的 class-string fallback，以兼容其当前 `registerSidebarTab()` 限制；
- Layout、Theme 的独立入口分别改为 `layout`、`theme` 的 SVG mask，并在注册后以延迟标记方式等待官方侧边栏 DOM 重建；
- Layout、Theme Provider 不再声明彩色 emoji，改为稳定 `iconKey`；顶部标签仍按既定规则只显示文字；
- 第一次真实页面验收发现 Theme Vendor 缺少新增 mask helper，导致 Theme 未加载。已通过唯一导出脚本重新同步 Vendor，禁止手工补文件；随后 `--all --verify`、三仓语法/Provider 合同和测试包 8190 的只读 smoke 均通过；
- 8190 实际页面已确认：WK 注册、Template 发布、`workspacekit-sidebar-icon-style`、入口 SVG mask 均存在，且 0 条 WK 相关控制台错误。

**验收边界修正（2026-08-03）：** 透明/磨砂是 WK 宿主的背景效果；Layout、Theme 独立模式没有该设置，不能把四背景状态作为其独立验收条件。用户已确认合并模式的深色、浅色、透明、磨砂状态正常。独立模式只需在 ComfyUI 深/浅主题中验收入口、名称、图标、打开与可读性；当前没有为此改写用户的合并设置。

### Batch 2.1 名称与 Layout 图标（完成，2026-08-03）

- 新增三仓修改前备份：`50-integrations/...before-wk-icon-names-batch2-1-20260803-*`；
- 独立壳层完整名统一为 `WK 版式 / WK 主题` 与 `WK Layout / WK Theme`；合并顶部标签仍为短名 `版式 / 主题` 与 `Layout / Theme`；
- Theme 移除独立壳层和内部标题中硬编码的 🎨，图标仅保留在侧边栏入口；Provider 的完整显示名与顶部短标签现在分开声明；
- Layout 新增 `layout.headerTitle`，使内部标题为短名而独立壳层与 Tooltip 使用完整 WK 名称；
- `layout` 图标由容易与 ComfyUI “Build an app”混淆的面板图形改为 Lucide `align-horizontal-distribute-center`，表达节点排列/分布语义；
- Template/Vendor 导出、WK smoke、Layout Provider 合同、Theme i18n/mount 合同均通过。Layout 的新标题键首次使测试夹具失败，已据此补齐夹具并复跑通过；8190 的运行时 Provider 注册表确认 Theme 为 `title: WK Theme`、`tabLabel: Theme`、`iconKey: theme`。该测试包本轮未加载 Layout Provider，因此 Layout 保持“源码/合同已通过、真实独立入口待测试包安装后验收”的状态。

### Batch 3.1 回收站双状态图标（完成，2026-08-03）

- 修改前备份：`.codex-backups/40-templates-nodes/ComfyUI-WorkspaceKit-before-icon-trash-restore-batch3-1-20260803-102337.zip`；
- WK 中央 `iconSvg()` 的 `trash` 与 `restore` 改为委托 Icon Kit；工作流与模板的删除、恢复动作因此使用同一份本地 Lucide SVG，而没有修改任何删除、恢复、确认、存储或文件系统逻辑；
- 回收站开关明确拆成两种语义：普通列表为红色 `trash`（进入回收站），回收站专属页面为信息蓝色 `arrowLeft`（返回工作流/模板列表）。`restore` 仅保留给单条已删除数据的恢复动作，绝不用于返回页面；
- 此批还将排序、刷新、导入/导出及官方收藏夹同步等高频工具栏图标迁入 Icon Kit；仅替换 SVG 渲染来源，不改原有按钮顺序、菜单、回调或数据行为。验收包括 `node --check`、Template UI contract、模板回收站数据合同、工作流行渲染合同、8190 只读 smoke 与 `git diff --check`；8190 smoke 已实际验证工作流与模板均为 `trash → arrowLeft`，且路由守卫未观察到 WorkspaceKit 数据写入。

### Batch 3.2 工作流行操作与右键菜单（完成，2026-08-03）

- 范围仅为 Browse 行操作与文件/文件夹右键菜单：`新建子文件夹`、`打开`、`重命名`、`移到根目录`、`移到回收站`、`复制`；文件操作、官方工作流同步与错误处理回调仍完全由 `entry.js` 注入；
- 右键菜单采用“图标 + 本地化文字”，行操作复用相同 Icon Kit 键；不改变菜单顺序、快捷键、确认弹窗、拖拽或轮询行为；
- `scripts/test-workflow-context-menu-renderer.mjs` 覆盖文件右键菜单的图标顺序、文本顺序与“打开”回调；行渲染的既有复制合同、Icon Kit contract、语法检查与 Vendor 哈希校验均通过；
- 8190 只读浏览器实际右击 Browse 文件行，确认菜单仍为“打开、重命名、移到根目录、移到回收站”，对应 `folderOpen` / `edit` / `rootArrow` / `trash`，且路由守卫未观察到 WorkspaceKit 数据写入、无 WK 控制台错误。

### Batch 3.3 三面板与设置页功能图标（完成，2026-08-03）

- 范围为 Workflows、Nodes、Templates 的搜索工具栏、行操作、菜单，以及 WorkspaceKit 设置页的功能图标；用户定义的文件夹 PrimeIcon/emoji 和模板内容数据不属于 UI chrome，保持原样；
- `iconSvg()` 改为无条件优先委托本地 Icon Kit，旧手写 SVG 仅作为未知第三方键的兼容回退；不改任何按钮回调、快捷键、文件读写、节点收藏或设置存储；
- 静态检查确认原 `iconSvg()` 的 32 个功能键均已存在于 Icon Kit；8190 只读页面确认工作流/模板回收站切换、节点页的 `x` / `folderPlus` / `previewDetailed` / `sort` / `arrowsUpDown`，以及设置页关闭、分类、恢复、清空、导入/导出按钮均带 Icon Kit 标识；路由守卫无数据写入，WK 控制台错误为 0；
- smoke 的模板标签定位改为第 3 个核心标签，消除中文界面把英文 `Templates` 写死导致的假失败。

### Batch 4 Provider 指南与兼容边界（完成，2026-08-03）

- `PANEL_PROVIDER_API.md`、`PANEL_QUICKSTART.md` 与 `PANEL_UI_TEMPLATE.md` 补充 `iconKey` / `ui.createIcon()` / `icon-kit` 的使用边界；顶部标签仍只显示本地化文字，不重新引入 emoji；Family Provider 示例同步由 `PROVIDER_ICON` emoji 改为 `PROVIDER_ICON_KEY`；
- `icon: "pi pi-sitemap"` 仅保留为当前 ComfyUI SidebarTab API 所需的隐藏 class-string 注册回退，实际 WK 入口由本地 SVG mask 覆盖；不移除该回退，以免 API 仍要求 `icon` 时导致入口消失；
- 不删除用户定义文件夹 emoji、PrimeIcon 或模板内容图标；这些属于数据，不是 UI chrome。

### 收尾记录（2026-08-03）

改名遗留与校验噪声已清理，未触碰本计划剩余的公开指南与跨主题视觉验收：

- `installWorkspace2SidebarEmojiIcon` → `installWorkspace2SidebarIcon` 的改名此前只更新了 `entry.js` 的三处引用，`scripts/test-sidebar-startup-resilience.mjs` 仍按旧名做源码字面量断言，导致整套测试长期有一项失败。断言已更新；`npm test` 现为 67 项 JS 合同、3 项 Python 合同与版本检查全绿。
- `--all --verify` 曾对 Layout 与 Theme 各报 5 个哈希不匹配。经 `diff --strip-trailing-cr` 证实内容完全一致，差异仅为行尾符：Windows 上 Git 的 `autocrlf` 把 WK 真源改为 CRLF，而导出的 Vendor 副本保持 LF。浏览器不关心行尾符，运行时未受影响；但**长期为红的校验比没有校验更危险**——它会掩盖自己本该发现的真实内容分歧（见 Batch 2 记录：Vendor 缺少 helper 曾导致 Theme 完全无法加载）。已让哈希在比较前归一化行尾符；磁盘上的 manifest 在归一化后本就匹配，因此**无需重新导出**。并已实测：向 Theme Vendor 注入一行注释立即报 `hash mismatch: version.js`，还原后转绿——对行尾符宽容，对内容依然严格。
- `docs/ENTRY_MAP.md` 的侧边栏区段仍是旧函数名与抽取前的行号（L11865–12178，实际已前移约 4000 行），文件头还写着 ~12,200 行（实际 8,047 行）。已更新该区段锚点与总行数，并说明入口现为本地 SVG mask、`icon: "pi pi-sitemap"` 仅作注册回退；`docs/TESTING.md` 基线中的旧 CSS id 与过时合同数也已更正。

### P-05 当前审计（2026-08-15）

- 已建立源码回退包：`.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-p05-icon-system-audit-20260815-081519.zip`（349 个源文件）。
- 静态盘点覆盖 `iconSvg()`、工具栏、图标按钮与菜单项：24 个实际功能引用全部存在于本地 Icon Kit 的 40 个定义中。
- 唯一不在 Icon Kit 的字面量是 `pi pi-sitemap`。它只作为当前 ComfyUI `SidebarTabExtension` 的注册 class-string 兼容回退；可见侧边栏入口仍由 `workspacekit` SVG mask 绘制，不能将其误报为未迁移图标。
- 已通过 Panel UI Template compatibility / export 与 sidebar-startup-resilience 合同。没有为凑“图标任务”而改动按钮语义、尺寸、颜色或回调。

**下一步验收而非重写：** 在 WK 合并模式下检查深色、浅色、透明、磨砂四态，以及 100% / 125% / 150% 缩放下的侧边栏入口、三面板工具栏、回收站和设置图标。发现真实不一致时，再按一个区域一批修复。

### P-05a 图标语义层与高频新建动作（完成静态验证，2026-08-15）

- `entry/ui-kit/icon-semantics.js` 建立了唯一的“功能语义 → 本地 Icon Kit 键”映射；UI 调用可使用如 `nodes.groups.create`，不再把业务含义直接绑定到 `folderPlus` 的具体图形。
- 第一轮已迁移工作流文件菜单的打开/新建工作流/新建文件夹，以及节点、模板、画布编组页的“新建分组”入口。未知旧键仍可原样解析，因此本批不影响尚未迁移的区域。
- 高频新建动作不再共用一个文件夹加号：工作流文件夹使用 `folderPlusModern`，节点与画布编组使用 `layersPlus`，模板组使用 `libraryPlus`。这三项只改变可见图形，不改按钮文字、快捷键、菜单顺序或回调。
- 新图形路径来源、固定提交、许可与本地改动范围已登记到 `docs/THIRD_PARTY_NOTICES.md`。`test-icon-semantics.mjs` 断言所有语义解析到现有本地图标，且三种新建语义不能退化为相同图形；95 项 JavaScript 合同测试通过。

**仍待真实页面验收：** 测试包的插件目录已确认链接到 WK 真源，且 8190 服务正常；刷新页面后应检查这三个新建按钮的辨识度、暗/浅主题可读性与 100% / 125% / 150% 缩放表现。若视觉方向不合适，只改本节的映射或少数 SVG 定义，不回头改各面板业务代码。

### P-05b 工作流工具栏与文件菜单语义迁移（完成静态验证，2026-08-15）

- 已建立单独源码回退包：`.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-workflow-icon-semantics-20260815-083613.zip`（351 个源文件）。
- 范围严格限于工作流顶部的打开、进入/离开回收站，以及“文件”菜单内的打开、新建、保存、另存为、重命名、复制、两种导出和移入回收站。它们均改为 `workflows.*` 语义键。
- 菜单顺序、文字、禁用条件、官方命令调用、文件系统操作与回收站行为均未改动；行操作、Browse 右键菜单和回收站列表明确不在本批，留给下一工作流区域批次。
- `test-icon-semantics.mjs` 追加了工作流保存与回收站双状态的映射断言；95 项 JavaScript 合同测试及文件菜单合同测试通过。

### P-05c 工作流 Browse、右键菜单与回收站语义迁移（完成静态验证，2026-08-15）

- 已建立源码回退包：`.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-workflow-row-icon-semantics-20260815-091511.zip`（351 个源文件）。
- Browse 行、文件/文件夹右键菜单与工作流回收站列表均改为 `workflows.row.*`、`workflows.folder.*`、`workflows.trash.*` 语义键；包括新建子文件夹、打开位置、复制、改名、移到根目录、解散层级、移入回收站、恢复与转系统回收站。
- 此批没有改动操作回调、删除确认、文件读写、拖拽、重命名或官方工作流同步。行渲染与右键菜单合同由“固定 SVG 键”升级为“固定语义、固定菜单顺序”；相关专项测试和完整 95 项 JavaScript 合同测试均通过。

### P-05 收尾与视觉偏好记录（2026-08-15）

- 本阶段已完成图标语义基础、工作流区域迁移与静态回归；本轮到此收尾，不再扩大图标替换范围。
- 用户明确偏好：高频对象图标，尤其“新建文件夹”和“打开”，外轮廓应有圆润转角；视觉上明显直角、硬朗的文件夹轮廓不作为 WK 的候选方向。
- 这是视觉选择规则，不通过 CSS 强行把直角 SVG “圆角化”，也不在本轮为两枚图标单独重绘。
- `.dev-docs/icon-candidate-gallery.html` 仅为本地研究页，不属于插件运行时或发行内容。未来若正式换整套图标库，应先按上述偏好选择主库，再通过语义映射和资产注册层一次迁移，避免在各面板逐处改 SVG。

### P-05d WK 其余功能图标语义迁移（完成静态验证，2026-08-15）

- 已建立源码回退包：`.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-before-icon-semantics-wk-remaining-panels-20260815-182759.zip`（351 个源文件）。
- 节点、模板、画布编组和设置页的功能图标已迁到语义键：覆盖设置分类和数据导入/导出、节点的排序/同步/预览/收藏管理、模板的排序/保存/回收站/行操作、画布编组行操作与搜索框清空。
- 仅改 `iconSvg()`、工具栏和行渲染的输入键；不改变实际 SVG 图形、入口图标、按钮顺序、设置存储、删除流程或回调行为。
- `test-icon-semantics.mjs` 追加设置、节点、模板与画布编组断言；完整 95 项 JavaScript 合同测试与 `git diff --check` 通过。

### P-05e 家族功能图标适配层（完成静态验证，2026-08-15）

- 三枚侧边栏入口图标维持现状，未改 WK 的 🧩、Layout 的 `layout` 或 Theme 的 `theme` 入口资产与注册回退。
- Layout 新增 `layout.toolbar.*` 语义到其既有展示 SVG 的适配层；Theme 新增 `theme.*` 语义到其既有 Theme SVG 的适配层。两者的内部按钮不再在调用位置绑定资产键。
- 已建立独立源码回退包：`ComfyUI-WorkspaceKit-Layout/.codex-backups/50-integrations/ComfyUI-WorkspaceKit-Layout-before-icon-semantics-adapter-20260815-183121.zip` 与 `ComfyUI-WorkspaceKit-Theme/.codex-backups/50-integrations/ComfyUI-WorkspaceKit-Theme-before-icon-semantics-adapter-20260815-183121.zip`。
- 这一层先统一“调用方式”，保持现有图形不变；将来正式筛选新图标库时，可逐个替换映射目标，不必重新改 Layout/Theme 的功能逻辑。

### P-05f 暂停与命名交接（2026-08-15）

- 当前图标语义迁移已停在“调用层统一、入口图标不动”的边界；本轮未提交、未推送，保留现有未提交改动。
- 已确认的家族中文全名为 `WK 面板`、`WK 布局`、`WK 主题`，并预留 `WK 图库`、`WK 模型`；英文完整名为 `WK Panel`、`WK Layout`、`WK Theme`、`WK Gallery`、`WK Models`。
- WK 面板核心标签的未来顺序为 `工作流 / 节点 / 模板 / 图库 / 模型`；Layout、Theme 保持可选 Provider，合并后使用短标签 `布局 / 主题`，不占用图库或模型的位置。
- 技术身份、仓库名、Provider ID、`iconKey`、存储键与侧边栏入口图标均未改动。待新的 UI 面板改革计划完成评审后，再决定命名合同、Vendor 真源和图标资产的下一批实施顺序。

## 6. 验收矩阵

- WK、Layout、Theme：独立入口和 WK 合并入口分别验证；
- 深色、浅色、透明、磨砂：颜色对比、悬停、激活、禁用状态可读；
- 100%、125%、150% 页面缩放：图标不变形、不因缩放显得过细；
- 键盘焦点、tooltip、菜单文本与图标对齐正常；
- 无网络时仍能完整加载，不出现图标请求失败或控制台错误。

## 7. 非目标

- 不复制 Obsidian 的应用资源或品牌素材；
- 不把用户内容 emoji、文件夹图标或主题预览色块改成 Lucide；
- 不与 Theme 当前暂停的新功能、布局重构或 Provider API 升级混在同一批；
- 不将整套 Lucide 图标库无选择地塞进每个插件。
