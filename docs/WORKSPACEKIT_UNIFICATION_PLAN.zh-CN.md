# WorkspaceKit 单插件合并、升级与长期维护总纲

> **状态**：执行中；2026-08-29 已由用户确认三仓完成提交、推送与完整备份。  
> **许可证路线**：**GPL-3.0-only 已锁定**；不再执行“保持 MIT + clean-room 重建”路线。  
> **建立日期**：2026-08-29  
> **主仓**：`G:\GitHub\ComfyUI-WorkspaceKit`  
> **源仓**：`G:\GitHub\ComfyUI-WorkspaceKit-Theme`、`G:\GitHub\ComfyUI-WorkspaceKit-Layout`  
> **目标**：将三个仓库最终收敛为一个可安装的 `ComfyUI-WorkspaceKit`，同时保留清晰模块边界、历史兼容、测试能力和未来扩展能力。

---

## 执行任务清单（唯一批次顺序）

> 状态只使用 `pending / in-progress / blocked / done`。每完成一个批次，先更新 `.dev-docs/DEV_LOG.zh-CN.md`，再把实际验证写入 `docs/TESTING.md`；只有用户可感知能力真正完成后才更新 `CHANGELOG.md`。

| 批次 | 任务 | 状态 | 主要交付物 / 完成条件 |
| --- | --- | --- | --- |
| B00 | 接管、基线与路线锁定 | **done 2026-08-29** | 三仓状态确认；GPL-3.0-only 路线锁定；总纲、DEV_LOG、AGENTS 边界已更新。 |
| B01 | 主仓许可证统一为 GPL-3.0-only | **done 2026-08-29** | `LICENSE` 已切 GPL-3.0-only；`pyproject.toml` classifier、中英文 README badge/License 已同步；原第三方 MIT attribution 保留在 notices。 |
| B02 | 三仓 provenance / migration inventory | **done 2026-08-29** | Theme/Layout 文件级迁移矩阵已固化；NodeAligner 与 Color Thief 来源已补入 `THIRD_PARTY_NOTICES.md`。 |
| B03 | Theme 核心业务迁入 `entry/appearance/` | **done 2026-08-29** | ThemeDocument、FieldMeta、ColorUtils、RuntimeAdapter 已进入主仓；`test-appearance-core.mjs` 已真实执行通过。 |
| B04 | Theme 服务端存储与主仓 Python 入口整合 | **done 2026-08-29** | `service/theme_storage.py`、`/workspacekit-theme/save` 路由、主仓 Appearance manifest 与 Python contract 已建立；`test-theme-storage.py` 已真实执行 4/4 通过。 |
| B05 | Theme UI/资源接入主仓 UI Kit / Settings | **code-integrated；product sealed 2026-08-29** | Appearance Editor v2、5 个内置 themes、主仓 UI Kit、共享 i18n/fallback、参考图配色代码均保留；但用户已决定 Theme 暂不进入当前产品线。L0 将「主题」默认隐藏，Settings 中对应开关固定为关闭/禁用状态，不向普通用户暴露未知功能。 |
| B06 | Theme 兼容迁移与完整验收 | **migration core done；product acceptance deferred** | 旧 Theme JSON 非破坏迁移与隔离测试已通过；Theme 业务功能真实页面验收延期到 Layout 产品线完成后的 Theme 阶段。本阶段只维护封印边界，不继续修改 Theme editor/storage/runtime。 |
| B07 | Layout V2 核心与 GPL NodeAligner 迁移边界 | **done 2026-08-29** | `LayoutTarget`、Geometry、Engine、Command Registry、Selection、ChangeSet、Transaction 已进入主仓；Layout Engine/Transaction 测试真实通过；GPL 来源与修改记录完整。 |
| B08 | Layout Node 命令逐项迁移 | **in-progress 2026-08-29** | Align / Distribution / Size / Fixed Spacing 已进入 Engine；用户已手测顶部对齐按钮有效。继续补 collapsed node / undo / redo / save-reload 真实验证。 |
| B09 | Groups × Layout 内部适配 | **in-progress 2026-08-29** | Group LayoutTarget adapter 已存在，Transaction 混合 Group contract 已通过；仍需真实页面 Group+Group、Node+Group align/distribute 验收。 |
| B10 | Layout UI / 共享 Shell 接入主仓 UI Kit | **L0 implementation done 2026-08-29；real-page gate pending** | L0 先收共享壳层：内置 Layout/Theme 的查找不再依赖外部 Provider availability；`createPanelBlueprint()` 提供安全 `setStatus` 兼容；Settings 增加工作流/节点/模板/排版/主题/外部扩展 6 个显示开关，主题默认隐藏且灰色封印；隐藏当前标签自动迁移到仍可见模块，隐藏入口也不能被快捷键绕过。109 项 JS + 9 项 Python contract、151 个前端模块语法通过。Layout 面板本身的上一版紧凑重排不再视为最终设计，L1 将按旧 Layout 的 8 个高频命令固定两行、NodeAligner 已验证 SVG 与 Adobe 操作记忆重新收敛。 |
| B11 | 必要的本机数据/偏好迁移 | **reduced scope 2026-08-29** | 两个旧插件未正式推广，不建设 standalone/Vendor/双宿主长期兼容。仅保留旧 Theme JSON 与 Layout preference 的 detect → migrate/copy → validate → preserve source；不自动删除旧插件/数据。 |
| B12 | 单插件总回归与文档收口 | **in-progress 2026-08-29** | L0 后整仓回归为 109 项 JS contract、9 项 Python contract、151 个 frontend module syntax 全部通过。新增 `scripts/e2e/l0-sidebar-visibility.mjs` 专门验证外部扩展 OFF、Theme 封印、标签隐藏与全隐藏状态；当前 `:8190` 未启动，`curl` 返回 HTTP `000`，Playwright 因无法出现 WK 入口而在进入功能断言前超时，因此真实 ComfyUI E2E/人工视觉仍是发布门，不能记为通过。产品路线保持 Layout → Theme/Appearance → WK Core。 |
| B13 | 旧仓 Deprecated 准备 | pending | 仅在主仓真实页面稳定后更新两个旧仓 README/状态说明；保留历史，不删除仓库，不在本任务自动 archive。 |

### 批次执行规则

1. 一次只推进一个主批次；允许在同一批次内完成为其服务的最小测试和文档更新。
2. 不把源仓的 Provider、Standalone Host、Vendor UI 机械复制进主仓；只迁移长期有价值的业务能力。
3. 任何跨模块新接口都必须先写清 owner 和 forbidden responsibilities，再接入调用方。
4. Layout 允许依法保留 GPL-3.0-compatible / GPL-3.0-derived 实现，但必须保留原始版权、来源 commit/path、修改范围和许可证说明。
5. Theme 与 Layout 合并后只保留一个 UI Kit；内部模块不走 External Provider compatibility path。
6. 旧用户数据采用 detect → copy/transform → validate → preserve source；本任务不自动删除任何旧数据、旧插件目录或旧仓库。
7. 每一批如果无法用现有证据稳定下来，先标记 blocked 并停止扩大修改范围，不通过叠加补丁强行推进。

### B02 文件级迁移矩阵（2026-08-29 已审计）

#### Theme → `entry/appearance/`

| 源路径 | 处理 | 目标 / 原因 |
| --- | --- | --- |
| `js/lib/color_utils.js` | **直接迁移** | `entry/appearance/color-utils.js`；纯颜色工具，无 Provider 依赖。 |
| `js/lib/field_meta.js` | **直接迁移** | `entry/appearance/field-meta.js`；Theme 字段知识库。 |
| `js/lib/theme_document.js` | **直接迁移** | `entry/appearance/theme-document.js`；主题验证、克隆、字段读写、导出。 |
| `js/lib/reference_palette.js` | **行为迁移 / 实现替换** | `entry/appearance/reference-palette.js`；保留“本地参考图→推荐色”产品能力，但以 WorkspaceKit 自有的限尺寸 RGB 色桶算法替代 Color Thief。 |
| `js/lib/theme_runtime_adapter.js` | **改造迁移** | `entry/appearance/theme-runtime-adapter.js`；保留 ComfyUI/LiteGraph 兼容逻辑，后续收敛到主仓 adapter 边界。 |
| `js/lib/i18n.js` | **合并迁移** | Theme 文案并入主仓 `entry/locales/*` / `core/i18n.js`，不保留第二套全局 locale loader。 |
| `js/lib/theme_icons.js` | **不迁移旧图标实现** | B05 Editor 直接使用主仓 UI Kit primitives 与轻量语义符号；不再维护 Theme 独立图标系统。 |
| `js/lib/theme_lab_panel.js` | **改造迁移** | `entry/appearance/theme-editor.js`；保留编辑状态/导入导出/参考图/undo-redo，移除 standalone fallback 与 Vendor compatibility 分支。 |
| `js/theme_lab.css` | **改造迁移** | `entry/appearance/styles.js` 或模块 scoped CSS；只保留 Theme 专属样式，通用 chrome 交给 UI Kit。 |
| `theme_storage.py` | **直接/路径改造迁移** | `service/theme_storage.py`；保留 1MB 限制、原子写、备份与安全文件名，存储根改到主仓 Appearance 资源目录。 |
| `__init__.py` Theme save route | **整合迁移** | 路由整合进主仓 Python 入口，服务逻辑仍留 `service/theme_storage.py`。 |
| `js/themes/**` | **迁移** | `entry/appearance/themes/**`；manifest 与默认/WK 主题成为内置静态资源。 |
| `js/vendor/color-thief/**` | **不迁移运行时 Vendor** | B05 已由 `entry/appearance/reference-palette.js` 自有实现替代；只在 `THIRD_PARTY_NOTICES.md` 保留旧 Theme 的历史 provenance。 |
| `tests/*`、`js/lib/__tests__/*` | **改造迁移** | 对应主仓 `scripts/test-appearance-*.mjs` / Python service tests。 |
| `js/lib/provider.js` | **退役** | 内置模块不通过 External Provider API 注册。 |
| `js/lib/standalone-panel.js` | **退役** | 合并后无独立插件 fallback。 |
| `js/integrations/workspacekit-adapter.js` | **退役** | 不再跨插件发现 WorkspaceKit。 |
| `js/vendor/workspacekit-ui/**` | **退役** | 主仓 `entry/ui-kit/` 是唯一 UI source。 |
| `js/theme_lab.js` | **不直接迁移** | 其 extension registration / Provider / Standalone 职责由主仓 composition root 取代。 |
| `examples/**` | **参考/择优迁移** | 不作为运行时必需；有价值示例后续可移入 docs/examples。 |

#### Layout → `entry/layout/`

| 源路径 | 处理 | 目标 / 原因 |
| --- | --- | --- |
| `web/core/geometry-service.js` | **改造迁移** | `entry/layout/geometry-service.js`；先保留已验证 visual bounds 行为，再把 mutation 从 geometry 中移出。 |
| `web/core/selection-service.js` | **改造迁移** | `entry/layout/selection-service.js`；扩展为 Node/Group LayoutTarget selection。 |
| `web/core/legacy-command-registry.js` | **过渡迁移** | 只作为旧命令 ID / parity bridge；最终由正式 `command-registry.js` 取代。 |
| `web/legacy/nodealigner/node_info.js` | **GPL 过渡迁移** | 可在 GPL-3.0-only 主仓保留为 `entry/layout/legacy/nodealigner/` 的行为基线；保留 NodeAligner copyright、固定 commit 与修改记录，逐命令退出。 |
| `web/ui/layout-module-view.js` | **改造迁移** | `entry/layout/panel-renderer.js`；直接使用主仓 UI Kit，不再兼容 Vendor。 |
| `web/ui/layout-module-style.js` | **改造迁移** | 只保留 Layout 专属 scoped styles。 |
| `web/ui/presentation-icons.js` | **合并迁移** | 优先接主仓 icon semantics。 |
| `web/ui/top-toolbar.js` / styles | **改造迁移** | 内置 Layout toolbar controller，纳入主仓 toolbar/setting 生命周期。 |
| `web/locales/*` | **合并迁移** | Layout 文案进入主仓 locale。 |
| `tests/*.test.mjs` | **迁移/扩展** | 作为 Layout parity、geometry、UI contract 的初始安全网。 |
| `docs/research/**` / behavior baselines | **保留为来源参考** | 不全部复制；关键 NodeAligner provenance 写入主仓 notices，行为证据需要时引用旧仓历史。 |
| `web/foundation/i18n.js` / `panel-chrome.js` | **退役重复实现** | 使用主仓 core i18n / shared UI。 |
| `web/integrations/workspacekit-adapter.js` | **退役** | Layout 已成为内部模块。 |
| `web/ui/workspacekit-provider.js` | **退役** | 不再作为外部 Provider。 |
| `web/ui/standalone-layout-panel.js` | **退役** | 不再有 standalone extension path。 |
| `web/vendor/workspacekit-ui/**` | **退役** | 主仓 UI Kit 唯一来源。 |
| `web/main.js` | **不直接迁移** | 旧 canvas facade / polling / Provider bootstrap 仅作为迁移参考；新入口由主仓 composition root 构造。 |
| `__init__.py` | **不迁移** | Layout 无独立 Python runtime 能力需要保留。 |

#### B02 第三方来源边界

- `ComfyUI-NodeAligner`：GPL-3.0，固定 commit `321ec9dcb859404f4b89cbd359ebc2c25ac59146`；旧 Layout 的 `web/legacy/nodealigner/node_info.js` 是修改后的 derivative compatibility baseline。进入主仓后必须继续保留固定 commit、原版权/许可证、修改日期与本地目标路径。
- `Color Thief 3.3.0`：MIT，copyright (c) 2015 Lokesh Dhakar；仅作为旧 Theme 的历史 provenance 保留在 notices。统一版 B05 未迁其 Vendor 文件，参考图配色已换成 WorkspaceKit 自有实现。
- 主仓既有 `ComfyUI-N-Sidebar`、`comfyui-workspace-manager`、`ComfyUI-xiaozhuguang`、`pinyin-pro` 的 MIT notices 继续保留；主许可证改为 GPL 不改变这些第三方部分的原始 attribution。
- `ComfyUI-Align` 与 `ComfyUI-AlignLayout` 继续仅作研究参考，不因主仓切换 GPL 而自动获得复制许可。

---

## 0. 结论先行

未来不再把 WorkspaceKit / Layout / Theme 作为三个长期并行维护的运行时插件。

目标形态是：

```text
ComfyUI-WorkspaceKit
│
├── Workflows
├── Nodes
├── Templates
├── Groups
├── Layout
├── Appearance / Theme
│
├── Shared Core
├── ComfyUI Integration
├── UI Kit
├── Settings
└── Public Extension API
```

用户最终只需要安装：

```text
ComfyUI-WorkspaceKit
```

但“一个插件”**不等于一个大文件、一个大状态对象或一个大模块**。

必须继续遵守当前 `docs/MODULE_MAP.md` 的模块治理原则：

- 每个模块有唯一责任所有者；
- 明确 `Owns / Must not own / Validation`；
- UI 不拥有业务逻辑；
- ComfyUI / LiteGraph 私有访问集中在适配层；
- 跨模块通过稳定内部接口连接，而不是互相读取私有状态；
- `entry.js` 继续作为 composition root，而不是重新膨胀成万能入口。

---

## 1. 为什么要合并

### 1.1 当前三插件结构的长期成本已经显现

当前家族结构大致是：

```text
ComfyUI-WorkspaceKit
        │
        ├── Panel API
        ├── UI Template
        └── UI Kit source

ComfyUI-WorkspaceKit-Layout
        ├── WorkspaceKit Provider
        ├── Standalone Host
        └── Vendor WorkspaceKit UI

ComfyUI-WorkspaceKit-Theme
        ├── WorkspaceKit Provider
        ├── Standalone Host
        └── Vendor WorkspaceKit UI
```

这会产生大量“为了插件分离而存在”的维护工作：

- Provider 协议；
- 两种加载顺序；
- 独立 / 合并双宿主；
- Vendor UI 副本；
- UI Template 版本协商；
- API 兼容；
- 重复面板防护；
- 多仓同步；
- 多仓文档同步；
- 多仓发布；
- 多仓测试矩阵。

这些工作本身几乎不产生直接用户价值。

### 1.2 UI 更新暴露了根因

只要主仓 UI Kit 更新，Layout / Theme 就可能出现：

```text
主仓新 UI
↓
独立插件 Vendor 落后
↓
视觉不一致
↓
需要重新同步、适配、测试
```

这是架构导致的重复成本，不是一次偶发问题。

### 1.3 Groups × Layout 是合并的重要收益

Layout 后续必须支持：

- Node 对齐；
- Group 对齐；
- Group 与 Group 分布；
- Node + Group 混合选择；
- 未来 Reroute / 其它布局对象。

如果继续分仓，就需要维护跨插件的：

- Group discovery；
- selection；
- bounds；
- mutation；
- undo；
- compatibility version；
- load order；
- missing-plugin fallback。

合并后这些变成内部模块接口，显著降低复杂度。

---

## 2. 三个仓库在合并后的定位

### 2.1 `ComfyUI-WorkspaceKit`

**唯一长期主仓、唯一发行插件。**

负责：

- 核心启动；
- Workflows；
- Nodes；
- Templates；
- Groups；
- Layout；
- Appearance / Theme；
- UI Kit；
- Settings；
- ComfyUI adapter；
- 对外扩展 API。

### 2.2 `ComfyUI-WorkspaceKit-Theme`

未来状态：

```text
Active
→ Merge Source
→ Maintenance-only
→ Deprecated
→ Archived
```

它不应继续作为独立 UI 体系存在。

Theme Lab 的产品能力应迁移为 WorkspaceKit 内部的 `Appearance / Theme` 模块。

### 2.3 `ComfyUI-WorkspaceKit-Layout`

未来状态：

```text
Active Compatibility Reference
→ Layout V2 Migration Source
→ Maintenance-only
→ Deprecated
→ Archived
```

旧仓在迁移期的重要价值是：

- 已验证行为参考；
- 回归测试参考；
- UI / 产品交互参考；
- NodeAligner 兼容行为基线；
- 历史版本与 Git provenance。

**不应简单把整个旧仓目录复制进主仓。**

---

## 3. 许可证决策：MIT 还是 GPL-3.0

### 3.1 当前状态

截至本文建立时：

```text
ComfyUI-WorkspaceKit        → MIT
ComfyUI-WorkspaceKit-Theme  → MIT
ComfyUI-WorkspaceKit-Layout → GPL-3.0-only
```

Layout 使用 GPL-3.0 的核心原因，是仍包含 / 演进自 `ComfyUI-NodeAligner` GPL-3.0 兼容基线。

### 3.2 把主仓改为 GPL-3.0 的主要好处

对于本项目，GPL 的最大实际收益不是“功能更强”，而是：

#### A. 降低 Layout 合并成本

如果完整许可证审计确认相关代码可在 GPL-3.0 下组合，则可以保留更多已经验证过的 Layout / NodeAligner 派生实现，而不必为了保持 MIT 专门重新实现大量行为。

这意味着：

```text
更少重写
+ 更少行为回归风险
+ 更快合并
+ 更容易保留旧 Layout 的测试结果
```

#### B. 统一三仓许可证边界

合并后一个发行插件使用一个主要许可证，维护和贡献规则更简单。

#### C. Copyleft 约束

如果他人分发修改版 GPL 插件，通常需要按 GPL 条件提供对应源代码。

如果项目希望减少“拿走代码、闭源修改、重新分发”的情况，GPL 比 MIT 更强。

#### D. 后续复用 GPL 兼容代码更方便

未来研究或整合其它 GPL-compatible ComfyUI 项目时，许可证设计空间通常比坚持 MIT 更大。

### 3.3 改 GPL-3.0 的代价

GPL 不是“全面优于 MIT”。主要代价：

- 分发组合或修改版本时有更强的源码与许可证义务；
- 某些企业或商业闭源项目会主动避开 GPL 依赖；
- 生态采用面可能比 MIT 窄；
- 许可证说明、第三方 notices 和分发方式要更严谨。

### 3.4 保持 MIT 的主要好处

- 对第三方使用、修改、集成限制最少；
- 更容易进入商业 / 企业环境；
- 生态扩散阻力较低；
- 当前主仓 / Theme 已经使用 MIT，无需改变外部预期。

代价是：

> Layout 中 GPL-derived 的实现不能直接当作 MIT 代码搬入主仓，需要经过完整 provenance audit，并对不能安全迁移的部分重新实现。

### 3.5 当前建议

**现在不立即改 LICENSE。**

先完成一次许可证与来源审计，再做正式决策。

建议设置 License Gate：

```text
Gate L1
│
├── 统计 Layout 中 GPL-derived 文件 / 函数 / 测试
├── 统计 WorkspaceKit / Theme 第三方依赖许可证
├── 判断保持 MIT 需要重写的真实工作量
├── 判断 GPL 对未来发行是否可接受
│
└── 决策：
    ├── Route GPL：主仓统一 GPL-3.0
    └── Route MIT：Layout V2 clean implementation
```

如果项目最优先目标是：

> **一个人长期维护简单、减少重复重写、快速合并。**

则 GPL-3.0 是非常值得考虑的路线。

如果最优先目标是：

> **最大化第三方自由集成和商业采用。**

则应优先保持 MIT，并承担 Layout V2 重建成本。

> 本节是工程与许可证管理建议，不替代正式法律意见。真正改许可证前仍要检查所有第三方来源和历史贡献。

---

## 4. 合并后的目标目录结构

不要求一次性调整成下面的精确文件名，但模块边界应最终趋近：

```text
ComfyUI-WorkspaceKit/
│
├── entry/
│   ├── entry.js                    # Composition root
│   │
│   ├── core/
│   │   ├── commands/
│   │   ├── events/
│   │   ├── state/
│   │   └── shared utilities
│   │
│   ├── integrations/
│   │   ├── comfyui/
│   │   ├── canvas/
│   │   ├── selection/
│   │   └── undo/
│   │
│   ├── ui-kit/
│   │   ├── tokens
│   │   ├── icons
│   │   ├── primitives
│   │   ├── blueprint
│   │   └── styles
│   │
│   ├── appearance/
│   │   ├── theme-document
│   │   ├── runtime-adapter
│   │   ├── theme-editor
│   │   ├── personalization
│   │   └── persistence
│   │
│   ├── workflows/
│   ├── nodes/
│   ├── templates/
│   │
│   ├── canvas-groups/
│   │   └── layout-target-adapter.js
│   │
│   ├── layout/
│   │   ├── command-registry.js
│   │   ├── selection-service.js
│   │   ├── geometry-service.js
│   │   ├── layout-engine.js
│   │   ├── layout-target.js
│   │   ├── transaction.js
│   │   ├── panel-renderer.js
│   │   ├── toolbar-controller.js
│   │   └── settings.js
│   │
│   └── public-api/
│       └── external provider / extension APIs
│
├── service/
├── scripts/
├── tests/
└── docs/
```

---

## 5. 内部模块边界

### 5.1 `entry.js`

最终只负责：

1. 注册 ComfyUI extension；
2. 构造内部模块；
3. 注入 ComfyUI adapter、共享 state、translation、commands；
4. 注册全局 shortcut；
5. 处理少数必须位于 composition root 的兼容桥。

不得重新拥有：

- Layout 算法；
- Theme 文档逻辑；
- Groups 几何算法；
- Workflow 文件操作；
- Nodes library 业务；
- Templates renderer；
- 具体面板 DOM。

### 5.2 `ui-kit`

唯一 UI 设计系统来源。

负责：

- tokens；
- primitives；
- icons；
- Panel Blueprint；
- shared styles。

合并完成后，内部模块**直接使用主仓 UI Kit**。

不再为内置 Layout / Theme 维护：

- Vendor WorkspaceKit UI；
- UI Template 版本协商；
- Host capability negotiation。

这些仅保留给真正的外部插件 API。

### 5.3 `appearance`

由 Theme Lab 演进而来。

负责：

- ThemeDocument；
- 主题字段元数据；
- Color utilities；
- Theme Runtime Adapter；
- JSON import/export；
- realtime preview；
- undo/redo（主题编辑会话）；
- reference image palette；
- Theme Editor UI；
- 后续主题持久化。

不得直接拥有其它业务模块的数据。

### 5.4 `layout`

负责布局产品能力：

- align；
- distribute；
- fixed spacing；
- sizing；
- key target；
- future auto layout；
- combination presets；
- future smart guides / snapping。

不得直接读取 Groups 私有 state 或直接依赖具体 DOM frame。

### 5.5 `canvas-groups`

继续拥有：

- group selection；
- membership；
- frame behavior；
- drag；
- resize；
- conversion；
- persistence；
- rendering。

它额外提供：

```text
Group → LayoutTarget
```

适配接口，而不是让 Layout 侵入其内部实现。

---

## 6. LayoutTarget：Groups 与 Layout 统一的核心抽象

Layout Engine 不直接认识：

- LiteGraph node；
- WorkspaceKit group；
- reroute；
- DOM frame。

它只认识统一目标：

```js
{
  id,
  type,
  visualBounds,
  logicalBounds,
  movable,
  resizable,
  metadata
}
```

未来由不同 adapter 提供：

```text
ComfyUI Node
   ↓
Node Layout Adapter
   ↓
LayoutTarget

WorkspaceKit Group
   ↓
Group Layout Adapter
   ↓
LayoutTarget

Reroute
   ↓
Reroute Layout Adapter
   ↓
LayoutTarget
```

Layout Engine 只负责：

> 计算这些目标应该在哪里。

它输出 ChangeSet，不直接修改真实对象。

---

## 7. Layout V2 执行链

目标执行链：

```text
UI / Shortcut
      ↓
Command Registry
      ↓
Selection Service
      ↓
LayoutTarget normalization
      ↓
Layout Engine
      ↓
ChangeSet
      ↓
Validation
      ↓
Undo / Transaction Adapter
      ↓
Node / Group mutation adapters
      ↓
Canvas redraw + graph change
```

必须保证：

```text
一次用户命令
=
一次完整事务
=
一次 Undo
```

任何验证或计算失败：

```text
Apply nothing
```

不得出现部分对象已经移动、部分对象失败的状态。

---

## 8. Group 对齐语义

目标支持：

```text
Node + Node
Group + Group
Node + Group
Node + Group + Group + Node
```

例如：

```text
[Group A]   [Node B]   [Group C]
```

执行水平分布时：

Layout Engine 只处理三个 `LayoutTarget`。

输出：

```text
Target A delta
Target B delta
Target C delta
```

随后：

```text
Node Adapter
→ node.pos

Group Adapter
→ group representation + member nodes
```

最终合并到同一个 transaction。

### 8.1 禁止的实现

不得在 `layout-engine.js` 中出现：

```text
workspace group DOM
private group state
nodeIds persistence details
LiteGraph global mutation
localStorage
```

---

## 9. UI 合并策略

### 9.1 内置模块不再使用 Provider 机制

合并前：

```text
Layout / Theme
→ WorkspaceKit Provider
→ WorkspaceKit Host
```

合并后：

```text
WorkspaceKit Internal Module Registry
→ Built-in panel/tab
```

内部模块可以复用与 external Provider 相同的 UI primitives，但无需走外部兼容协议。

### 9.2 Public Panel API 继续保留

不要因为 Layout / Theme 内置就删除 Panel Provider API。

它应该重新明确定位为：

> **给第三方外部 ComfyUI 插件接入 WorkspaceKit 的公共扩展接口。**

结构变成：

```text
WorkspaceKit built-in modules
→ internal interfaces

Third-party extension
→ Public Panel API
```

### 9.3 Vendor UI 的处理

最终：

```text
Layout Vendor UI → 删除 / 退役
Theme Vendor UI  → 删除 / 退役
```

但是只有在：

- 新内部模块 UI 完成；
- 旧插件进入 deprecated；
- 无 standalone 独立运行需求；

之后才可以清理。

---

## 10. Theme / Appearance 迁移策略

Theme 比 Layout 更适合作为第一个合并模块，因为：

- 当前为 MIT；
- 不涉及 NodeAligner GPL；
- 不涉及复杂 canvas geometry transaction；
- 已经有较清晰的 `ThemeDocument / RuntimeAdapter / Panel` 分层；
- 与主仓 `ui-kit / panel-appearance / personalization` 高度相关。

### 10.1 迁移原则

优先迁移业务模块：

```text
ThemeDocument
FieldMeta
ColorUtils
ReferencePalette
ThemeRuntimeAdapter
Theme Lab UI behavior
```

不迁移独立插件特有壳：

```text
WorkspaceKit Provider
Standalone Panel
Vendor WorkspaceKit UI
双宿主兼容代码
```

### 10.2 目标

Theme 最终成为：

```text
WorkspaceKit Appearance System
```

而不是独立 Theme 插件。

---

## 11. Layout 迁移策略

### 11.1 不做目录级直接搬运

禁止：

```text
copy ComfyUI-WorkspaceKit-Layout/web
→ ComfyUI-WorkspaceKit/entry/layout
```

因为旧仓目前同时包含：

- 产品逻辑；
- NodeAligner compatibility；
- standalone host；
- WorkspaceKit provider；
- Vendor UI；
- bridge / polling / shadow button routing；
- GPL-derived 内容。

必须按责任迁移。

### 11.2 Layout V2 优先建立新核心

核心目标：

```text
Command Registry
Selection Service V2
Geometry Service
LayoutTarget
Layout Engine
ChangeSet
Transaction / Undo Adapter
```

旧 Layout 作为：

```text
behavior oracle + regression reference
```

而不是新架构运行核心。

### 11.3 NodeAligner 退出原则

迁移顺序按命令进行：

```text
旧命令行为记录
↓
新 Engine 实现
↓
characterization / parity test
↓
真实 ComfyUI acceptance
↓
切换命令执行路径
↓
旧 compatibility path 标记 unused
```

所有命令完成后，才能退出 NodeAligner runtime。

---

## 12. 产品命令建议

Layout V2 建议至少明确：

### Alignment

- Left；
- Horizontal Center；
- Right；
- Top；
- Vertical Center；
- Bottom。

### Distribution

- Horizontal Distribution；
- Vertical Distribution。

建议：普通 distribution 至少 3 个 target。

### Fixed Spacing

- Horizontal fixed gap；
- Vertical fixed gap。

建议：至少 2 个 target，支持 0 gap；负值需单独设计 overlap 语义。

### Size

保留 / 整理：

- Equal maximum width；
- Equal minimum width；
- Equal maximum height；
- Equal minimum height；
- Equal size。

未来：

- Match key target width；
- Match key target height；
- Match key target size。

### Advanced

在基础引擎稳定后再进入：

- Key target；
- Auto layout；
- Combination presets；
- Smart guides；
- Snapping；
- Radial menu。

---

## 13. 迁移阶段总表

### Phase 0 — Freeze / Baseline

目的：保留三个仓当前真实可工作的基线。

执行：

- 分别检查 `Get-Location`；
- 分别检查 `git status --short`；
- 当前修改必须独立收尾；
- 不把未提交修改直接混入合并；
- 记录当前功能和测试；
- 建立可回退版本 / tag / source archive（按项目既有流程）。

完成条件：

> 三仓均有明确、可重现、可测试的迁移起点。

---

### Phase 1 — Three-repo Audit

建立一份迁移矩阵：

| 能力 | 当前仓 | 目标模块 | 是否重复 | 许可证 | 数据迁移 | 测试 |
| --- | --- | --- | --- | --- | --- | --- |
| Panel UI | WorkspaceKit | ui-kit | 是 | MIT | 否 | 有 |
| Theme Lab | Theme | appearance | 部分 | MIT | 是 | 有 |
| Layout | Layout | layout | 部分 | GPL | 是 | 有 |
| Groups | WorkspaceKit | canvas-groups | 否 | MIT | 是 | 有 |

必须补充到具体文件 / responsibility 级别后才能开始正式搬迁。

---

### Phase 2 — License Gate + Unified Architecture

执行：

1. 完成 GPL / MIT provenance audit；
2. 决定主仓最终许可证；
3. 确定 internal module interface；
4. 更新 `docs/ARCHITECTURE.md`；
5. 更新 `docs/MODULE_MAP.md`；
6. 定义迁移期间 compatibility strategy。

完成条件：

> 不再存在“边搬代码边决定许可证 / 边界”的情况。

---

### Phase 3 — Merge Theme First

迁移 Theme 的业务模块到 `entry/appearance/`。

保留原 Theme repo 作为回归基线。

重点验证：

- Theme Editor；
- JSON import/export；
- preview；
- undo/redo；
- reference image palette；
- ComfyUI theme application；
- 主仓 appearance settings；
- UI Kit 视觉一致性。

合并成功后：

> 新 Theme 功能只在 WorkspaceKit 主仓继续开发。

旧 Theme 仓只修严重兼容问题。

---

### Phase 4 — Build Layout V2 Core in Main Repo

新增主仓 Layout 核心，不先迁 UI 壳。

优先顺序：

```text
LayoutTarget
→ Geometry
→ Layout Engine
→ Command Registry
→ Selection
→ ChangeSet
→ Transaction / Undo
```

要求：

- Engine 为纯计算；
- 不访问 DOM / window / localStorage / ComfyUI global；
- calculation before mutation；
- one command = one transaction。

---

### Phase 5 — Node Layout Parity

逐项替代旧 Layout / NodeAligner：

```text
Align
→ Distribution
→ Size
→ Fixed Spacing
```

每个操作都必须：

1. 有纯计算测试；
2. 有旧行为对照；
3. 有真实 ComfyUI canvas acceptance；
4. 验证 undo / redo；
5. 验证 collapsed node。

---

### Phase 6 — Groups × Layout

新增：

```text
entry/canvas-groups/layout-target-adapter.js
```

目标顺序：

```text
Group bounds read
→ Group move transaction
→ Group + Group align
→ Node + Group mixed align
→ Distribution
→ Size（仅在语义明确后）
```

Group resize 不应因为“已有 Layout size command”就自动启用；必须单独定义：

- frame resize 是否移动内部 nodes；
- resize 是否缩放 nodes；
- 是否只是改变 group bounds；
- native Group 与 WorkspaceKit Group 的差异。

没有明确产品语义前，只支持 Group move / align / distribute。

---

### Phase 7 — Internal UI Integration

Layout 直接使用主仓：

```text
entry/ui-kit
```

迁移：

- Layout panel；
- command grid；
- toolbar；
- settings；
- shortcut；
- selection toolbox（后续）。

此阶段不再维护 Layout standalone / Provider 双模式。

---

### Phase 8 — Data / Settings / Command Compatibility

合并必须保证老用户不因升级丢设置。

#### Command IDs

尽量保留已有：

```text
workspacekit.layout.*
```

避免破坏：

- shortcuts；
- automation；
- future external references。

#### Storage / Settings

对旧键建立 migration：

```text
旧 Layout keys
旧 Theme keys
旧 Workspace2 / WorkspaceKit keys
↓
versioned WorkspaceKit schema
```

原则：

- detect；
- copy / transform；
- validate；
- preserve source；
- log once；
- rollback-safe。

禁止在迁移成功前删除旧数据。

---

### Phase 9 — Duplicate Plugin Detection

升级后的用户可能同时存在：

```text
New WorkspaceKit with built-in Layout / Theme
+
Old WorkspaceKit-Layout
+
Old WorkspaceKit-Theme
```

新主仓必须检测旧插件的 runtime identifiers。

第一阶段只提示：

```text
检测到独立版 WorkspaceKit Layout / Theme。
新版 WorkspaceKit 已内置对应功能，建议禁用旧插件以避免重复 UI、命令或样式。
```

**不得自动删除用户文件或插件目录。**

在兼容期可以选择安全地阻止重复内部模块注册，但必须有清晰日志。

---

### Phase 10 — Deprecate Old Repositories

确认主仓功能稳定后：

旧仓 README 添加迁移说明：

```text
This project has been integrated into ComfyUI-WorkspaceKit.
```

状态：

```text
Maintenance-only
→ Deprecated
→ Archive
```

不要删除仓库历史。

保留：

- Git history；
- releases；
- issue reference；
- license / provenance；
- compatibility documentation。

---

### Phase 11 — Unified Release

最终发布：

```text
ComfyUI-WorkspaceKit
```

一个安装入口。

README 应明确包含：

```text
Workflows
Nodes
Templates
Groups
Layout
Appearance / Theme
```

并说明每个模块可以独立启用 / 关闭（在架构允许的范围内）。

---

## 14. 模块启用策略

合并不代表所有功能必须永远强制开启。

建议设置层最终允许：

```text
WorkspaceKit Modules

[✓] Workflows
[✓] Nodes
[✓] Templates
[✓] Groups
[✓] Layout
[✓] Appearance / Theme
```

但需要区分：

### 可选 Feature Module

- Layout；
- Theme editor；
- Nodes enhancements；
- Templates 等。

### Core Infrastructure

不应由用户随意关闭：

- UI Kit；
- core event / state；
- command registry infrastructure；
- ComfyUI adapter；
- migration system。

---

## 15. 测试体系

合并后测试必须按层组织，而不是把全部行为变成 UI 测试。

### 15.1 Pure Core

重点：

- Layout Engine；
- geometry；
- selection projection；
- group move plan；
- theme document；
- color utilities；
- data migration。

### 15.2 Adapter Contract

验证：

- ComfyUI node read/write；
- canvas redraw；
- graph dirty；
- undo transaction；
- group adapter；
- theme runtime adapter。

### 15.3 UI Contract

验证：

- panel render；
- commands wiring；
- disabled state；
- theme / appearance；
- shortcuts；
- settings。

### 15.4 Real ComfyUI E2E

至少覆盖：

- Nodes 2.0 on/off（如果仍支持 legacy）；
- normal nodes；
- collapsed nodes；
- WorkspaceKit groups；
- mixed node + group；
- undo/redo；
- workflow save/reload；
- dark/light/WorkspaceKit appearance；
- old settings migration；
- duplicate old-plugin detection。

---

## 16. Layout V2 最低测试矩阵

每个成熟 operation 至少考虑：

```text
empty selection
single item
2 items
3+ items
negative coordinates
fractional coordinates
equal coordinates
different sizes
collapsed node
locked / unsupported target
Node + Group
two Groups
mixed selection
undo
redo
save + reload
```

不是所有 operation 都必须支持所有 target；不支持时必须显式返回 unsupported，而不是错误地当作 node 处理。

---

## 17. 版本与发布策略

不要把“仓库合并”伪装成普通 patch release。

建议：

```text
当前稳定线
→ 最后独立插件兼容版本
→ WorkspaceKit unified preview / beta
→ Unified stable release
```

版本号具体如何提升，以合并时主仓正式版本为准。

如果用户可见安装方式、设置结构、许可证或模块归属发生显著变化，应在：

- CHANGELOG；
- README；
- migration guide；

中明确标记。

---

## 18. 文档治理

合并完成后：

### `docs/ARCHITECTURE.md`

只描述：

- 真实架构；
- 模块边界；
- 数据流；
- compatibility boundary。

### `docs/MODULE_MAP.md`

作为维护者权威索引：

```text
Module
Owns
Must not own
Dependencies
Validation
```

Layout / Appearance 合入后必须各自增加完整区域。

### `ROADMAP.md`

只记录未来工作，不记录大量已完成历史。

### `CHANGELOG.md`

只记录实际完成的用户可见 / 维护者重要变化。

### 本文档

本文负责：

> 三仓 → 单插件的长期迁移总纲。

执行过程中如果整体路线改变，更新本文；普通模块实现进度不要不断堆进本文。

---

## 19. AI / Agent 执行规则

以后任何 Agent 执行本计划前必须：

1. 阅读本文件；
2. 阅读主仓 `AGENTS.md`；
3. 阅读 `docs/ARCHITECTURE.md`；
4. 阅读 `docs/MODULE_MAP.md`；
5. 检查涉及源仓的当前状态；
6. 执行前明确本批次文件范围；
7. 不把用户现有未提交修改混进结构迁移；
8. 一批只迁移一个 coherent owner；
9. 每批建立对应 tests / acceptance；
10. 不自动 commit / push；
11. 不自动删除旧仓、旧插件或用户数据。

### 禁止“大爆炸式合并”

禁止一次性：

```text
复制两个仓
+ 改目录
+ 改 UI
+ 改数据
+ 改许可证
+ 删除旧实现
```

这种批次无法定位回归，也无法可靠回退。

---

## 20. 每次未来升级的标准流程

合并完成后，新增或升级 WorkspaceKit 功能统一使用：

```text
1. Identify owner
2. Read module boundary
3. Check current Git state
4. Update pure/domain logic first
5. Update adapters if host API changed
6. Update UI only through shared UI Kit
7. Add/update tests
8. Real ComfyUI acceptance
9. Update MODULE_MAP if ownership changed
10. Update CHANGELOG for meaningful change
```

### UI Kit 更新规则

内置模块：

```text
直接跟随主仓 UI Kit
```

外部 Provider：

```text
通过 Public UI Template / compatibility contract
```

不再出现“主仓内置模块还维护 Vendor UI”的情况。

---

## 21. 不应该做的事情

### 不要为了文件少而合并模块

文件数量不是坏事。

只有同时满足：

- 同一个责任 owner；
- 总是一起变化；
- 相同依赖边界；
- 相同测试边界；

才考虑合并模块。

### 不要让 Layout Engine 操作 DOM / ComfyUI globals

否则未来 Groups / Nodes 2.0 / frontend API 一升级，Layout 全部跟着变化。

### 不要让 Theme 成为第二套 UI Kit

Theme 是 Appearance / palette / runtime editing。

UI Kit 是组件设计系统。

两者必须分开。

### 不要因为合仓就删除 Public API

Public API 仍然是未来第三方插件扩展 WorkspaceKit 的关键能力。

### 不要提前删除旧仓

旧仓在迁移阶段是：

- behavior reference；
- regression oracle；
- provenance record；
- rollback source。

---

## 22. 首轮正式执行建议

真正开始合并时，不直接进入 Layout。

推荐顺序：

```text
Batch 1
三仓完整审计 + License Gate

Batch 2
主仓统一内部 Module / Appearance 边界

Batch 3
Theme business modules → WorkspaceKit Appearance

Batch 4
Theme UI → shared UI Kit

Batch 5
Theme migration / compatibility / acceptance

Batch 6
Layout V2 core skeleton

Batch 7+
逐个 Layout command parity migration

之后
Groups × Layout
→ Layout UI
→ data migration
→ old repo deprecation
```

原因：Theme 迁移可以先证明“独立家族插件 → 内置模块”的完整流程，同时不被 GPL 和复杂 Canvas transaction 阻塞。

---

## 23. 最终验收标准

只有满足以下条件，才能认为“三插件合一”完成：

### Installation

- 用户只安装 `ComfyUI-WorkspaceKit`；
- 不依赖旧 Layout / Theme 才能获得完整功能。

### UI

- Workflows / Nodes / Templates / Groups / Layout / Appearance 使用同一个 UI Kit；
- 不存在内置 Layout / Theme Vendor UI 副本。

### Architecture

- Layout Engine 与 Group implementation 解耦；
- Theme 与 UI Kit 解耦；
- `entry.js` 未重新膨胀为业务实现仓库；
- MODULE_MAP 覆盖新增模块。

### Layout

- 核心 Node 功能达到旧版本行为目标；
- Group 基础 align / distribute 可工作；
- Node + Group mixed selection 有明确语义；
- 一次 command = 一次 undo transaction。

### Theme

- Theme Lab 核心能力迁移完整；
- 导入 / 导出 / preview / apply / undo-redo 正常；
- 不再需要独立 Provider / Standalone 双宿主。

### Compatibility

- 旧 settings 可迁移；
- 旧 command IDs 尽量保持；
- 检测旧 Layout / Theme 插件并提示冲突；
- 不自动删除旧数据。

### License

- 主仓许可证决策已完成；
- Third-party notices 完整；
- Layout provenance 审计完成；
- 发布内容与最终许可证兼容。

### Testing

- pure core tests；
- adapter tests；
- UI contracts；
- real ComfyUI E2E；
- migration tests；
- save/reload + undo/redo；

全部达到该阶段定义的 release gate。

---

## 24. 一句话原则

未来 WorkspaceKit 的方向不是：

> 三个插件通过越来越复杂的 API 努力保持同步。

而是：

> **一个 WorkspaceKit 产品、一个安装入口、一个 UI Kit、清晰的内部模块边界，以及只对真正外部插件开放的公共扩展 API。**

合并的目的不是减少目录数量，而是减少重复维护、兼容层和跨仓协调，同时让 Layout、Groups、Theme、UI 真正成为同一产品体系中的专业模块。
