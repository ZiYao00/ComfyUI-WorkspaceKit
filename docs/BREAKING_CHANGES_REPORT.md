# WorkspaceKit 主仓破坏性变更清单

> **定位**：2026-07-31 的历史审计快照，不是当前公开 API、UI Template 契约或
> 开发进度真源。
> **写于**:2026-07-31,在 batch4 中途暂停,响应用户"暂停,先报告契约变更"要求
> **范围**:本仓 `G:\GitHub\ComfyUI-WorkspaceKit`,不包含 `G:\GitHub\ComfyUI-WorkspaceKit-Theme` / `-Layout` 子项目
> **目的**:明确 Theme Lab 集成对主仓契约的潜在影响,方便 review 时逐项核对

当前公开契约请查看 `PANEL_PROVIDER_API.md`、`PANEL_BLUEPRINT.md` 和
`PANEL_UI_TEMPLATE.md`；当前 UI 重建计划请查看
[`WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md`](WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md)。

## TL;DR

**`scripts/export-panel-ui-template.mjs` 有 1 处行为变化** + **3 个新文件**。
**主仓核心契约(`entry/`、`docs/PANEL_*.md`、provider API、Blueprint、UI Template)零修改**。
主仓现有调用方行为兼容,新增 `--all` / `--all --verify` 是可选能力。

---

## 1. 改动的文件 (4 个,全部非契约)

### 1.1 `scripts/export-panel-ui-template.mjs` (修改,+70/-28 行)

**用途**:把 `entry/ui-kit/` 下的 Panel UI Template 源码复制到外部 plugin 的 `vendor/workspacekit-ui/` 目录,供 plugin 独立运行。

**行为变化**:

| 调用 | 旧行为 | 新行为 | 是否破坏 |
|---|---|---|---|
| `node scripts/export-panel-ui-template.mjs` | 导到 `../ComfyUI-WorkspaceKit-Layout/web/vendor/workspacekit-ui` | **同左**(默认回退到 Layout 路径,保留肌肉记忆) | ❌ |
| `node scripts/export-panel-ui-template.mjs ../some/path` | 导到 `<path>/web/vendor/workspacekit-ui` | **同左** | ❌ |
| `node scripts/export-panel-ui-template.mjs --verify` | 验证默认 Layout 路径 | **同左** | ❌ |
| `node scripts/export-panel-ui-template.mjs --all` | ❌ 不识别 → 落到默认 Layout | ✅ 读 `ui-template-consumers.json` 遍历所有 consumer 导出 | ✅ 新能力 |
| `node scripts/export-panel-ui-template.mjs --all --verify` | ❌ 不识别 | ✅ 遍历所有 consumer 只验证不写 | ✅ 新能力 |

**注意**:
- `--all` 和 `--verify` 是新增 flag,旧调用无 `--all` 行为完全一致
- 旧调用 `scripts/export-panel-ui-template.mjs <path>`(单参数)继续可用
- **没有任何 Provider API 签名、Blueprint slot 命名、UI Template 导出文件列表的修改**

### 1.2 `scripts/ui-template-consumers.json` (新建,17 行)

**用途**:`--all` 模式读取的 consumer 清单。

**当前内容**:
```json
{
  "schemaVersion": 1,
  "consumers": [
    { "name": "Layout", "path": "../ComfyUI-WorkspaceKit-Layout" },
    { "name": "Theme",  "path": "../ComfyUI-WorkspaceKit-Theme", "vendorDir": "js/vendor/workspacekit-ui" }
  ]
}
```

**风险**:
- 文件不存在 + 用户用 `--all` → 报错 "consumer manifest ... lists no consumers"(明确失败,不会静默)
- 字段 `path` 用相对路径,相对 `scripts/` 目录,**谁改路径谁维护**(见 README)
- `schemaVersion: 1` 字段是给将来 breaking change 用的,目前没消费方读

### 1.3 `examples/family-module-provider/` (新建,16 个文件)

**用途**:C 档 Plugin 脚手架,放到 `examples/`(per 主仓 `docs/PUBLIC_CONTRACT.md` 规则,examples 是非破坏的)。

**包含**:
- `README.md` — 使用说明
- `web/main.js` — 入口
- `web/foundation/i18n.js` — 简易 i18n
- `web/integrations/workspacekit-adapter.js` — 复用 Theme 的 bridge
- `web/locales/{en-US,zh-CN}.json` — 文案
- `web/ui/{provider,module-view,standalone-panel}.js` — 3 个核心模块
- `web/vendor/workspacekit-ui/` — **vendored copy**(7 文件,与 Layout 一致)
- `__init__.py` — ComfyUI extension metadata

**风险**:
- `examples/` 在主仓有现成惯例(参见 `examples/minimal-panel-provider/`),新加的 `family-module-provider` 跟它并列,语义一致
- **本批的 batch3 smoke 已确认 `node scripts/export-panel-ui-template.mjs --all --verify` 不会重写这个 vendor**(本脚手架**不**进 consumers 清单,是"源",不是"活 consumer")
- **.codex-backups 风格**:`examples/family-module-provider/.codex-backups/` 应在主仓 ui-kit 升级后手动重导,本批未引入自动同步机制

### 1.4 `docs/PANEL_QUICKSTART.md` (新建,~250 行)

**用途**:30 秒快速接入文档,补 `docs/PANEL_PROVIDER_API.md` 的"太长不看"问题。

**与现有 docs 关系**:
- 不覆盖 `docs/PANEL_PROVIDER_API.md`(权威 API 文档)
- 不覆盖 `docs/PANEL_BLUEPRINT.md`(权威 Blueprint 文档)
- 不覆盖 `docs/PANEL_UI_TEMPLATE.md`(权威 UI Template 文档)
- 只引用,提供更短路径

**风险**:
- 文末提到"v0.3+ locale API 走 `app.ui.settings.getSettingValue`"——这是我后来调研后定的,但**主仓 docs/PANEL_PROVIDER_API.md 没明确说 locale 怎么读**(它只说 `app.translate` 是 i18n 入口)
- 快速文档里出现的 API 路径(`window.comfyAPI.app.app.ui.settings.getSettingValue('Comfy.Locale')`)是基于实测,**主仓本身没文档化这条路径**——如果将来 ComfyUI 改 API,本条会失效

---

## 2. 没有改动的契约 (主仓核心)

为防止遗漏,以下**保持 100% 原样**的契约:

| 契约 | 位置 | 状态 |
|---|---|---|
| Provider API v1 | `entry/integrations/workspacekit-panel-api.js` | ✅ 零修改 |
| Blueprint (header/toolbar/controls/content) | `entry/ui/workspace-panel-host.js` | ✅ 零修改 |
| UI Template 导出文件列表 | `entry/ui-kit/export.js` `PANEL_UI_TEMPLATE_EXPORT_FILES` | ✅ 零修改 |
| Vendor 目录结构(7 文件) | `entry/ui-kit/{blueprint,compatibility,manifest,primitives,styles,template,version}.js` | ✅ 零修改 |
| 公开 API 文档 | `docs/PANEL_PROVIDER_API.md` / `docs/PANEL_BLUEPRINT.md` / `docs/PANEL_UI_TEMPLATE.md` | ✅ 零修改 |
| 测试基础设施 | `scripts/test-*.mjs` / `scripts/e2e/t0*.mjs` | ✅ 零修改 |

---

## 3. 对外部 Plugin 的兼容性影响

### Layout (`G:\GitHub\ComfyUI-WorkspaceKit-Layout`)

- 默认 export 目标仍是 `Layout/web/vendor/workspacekit-ui`
- 旧调用 `node scripts/export-panel-ui-template.mjs` 行为不变
- 跑 `--all` 时,Layout 是第 1 个 consumer,**会和旧行为完全一致地写一份**
- **无破坏**

### Theme (`G:\GitHub\ComfyUI-WorkspaceKit-Theme`)

- 本批之前需手动跑:`node scripts/export-panel-ui-template.mjs ../ComfyUI-WorkspaceKit-Theme`(但 Theme 的 vendor 路径是 `js/vendor/`,不是默认的 `web/vendor/`,**所以旧调用其实不工作**——必须 `cd` 进 Theme 目录后用相对路径)
- 跑 `--all` 时,Theme 用 `vendorDir: "js/vendor/workspacekit-ui"` 正确导出
- **本次 batch4 跑过 `--all --verify` 确认 vendor 同步** ✅

### 其它 Plugin (未来加入)

- 加 `consumers.json` 一行即可被 `--all` 覆盖
- 不在清单里 = 不被影响(向后兼容)
- 字段 `vendorDir` 可选,默认 `"web/vendor/workspacekit-ui"`(跟 Layout 一致)

---

## 4. 已知未解决的问题(留给未来批次)

| 问题 | 影响 | 建议处理 |
|---|---|---|
| `examples/family-module-provider/.codex-backups/` 不会随主仓 ui-kit 升级自动重导 | 脚手架用的 vendor 落后 | 文档化手动重导命令,或加 CI 检查 |
| `docs/PANEL_QUICKSTART.md` 提到的 ComfyUI locale API 是实测,主仓没文档化 | 若 ComfyUI 改 API,文档失效 | 在 `docs/PANEL_PROVIDER_API.md` 加一节"i18n" |
| `ui-template-consumers.json` 路径用相对 `scripts/` 解析 | 谁挪 scripts/ 谁要改 manifest | 未来可改成绝对路径或 anchor |
| `examples/family-module-provider/` 本身是"示例",但里面 vendored copy 是真 copy(8 个文件 ~16KB) | 误导以为是"active plugin" | README 已说"不进入 consumers 清单",但加 `🚧 EXAMPLE — not a runtime consumer` 注释更稳 |

---

## 5. 给 Reviewer 的快速检查

1. `git status` 在主仓只有 1 modified + 3 untracked
2. 跑 `git diff scripts/export-panel-ui-template.mjs` 看 70 行新增是否在 `resolveConsumers()` 内部 + 循环展开里
3. 跑 `node scripts/export-panel-ui-template.mjs --all --verify` 应该 2 个 consumer 都 verify 通过
4. 跑 `node scripts/export-panel-ui-template.mjs` 默认行为应该是导到 Layout
5. 跑 `node scripts/export-panel-ui-template.mjs --verify` 应该走默认 verify

如果以上 5 步都通过,**主仓契约没有破坏性变更**。Theme 端的破坏性变更是 Theme 自己的事,见 `docs/PROGRESS_BATCH4-6.md`(本仓的进度文档)。

---

## 6. 相关链接

- [[workspacekit-plugin-architecture]] 架构决策
- [[workspacekit-theme-refactor]] Theme 端进度
- [Theme batch4-6 进度](docs/PROGRESS_BATCH4-6.md) (本仓)
- 主仓原始契约: `docs/PANEL_PROVIDER_API.md` / `docs/PANEL_BLUEPRINT.md` / `docs/PANEL_UI_TEMPLATE.md`
