# Panel Family-Module Provider 重搭方案

> **状态**:planned(等待主仓插件大量修复完成 + 重搭执行窗口)
> **写于**:2026-07-31,与用户协商确定
> **目标读者**:本会话后续轮次、其它会话接手本仓维护者、AI 智能体

---

## 0. 背景

v1 套件(16 文件,位于 `examples/family-module-provider/`)由 Theme Lab 集成的
batch4 阶段在本仓落地。落地后评估发现:

- 智能体套用本套件时,在**面板分区、视觉风格、合并/独立模式边界**三方面大量出错
- 用户判断"改造旧套件"比"重搭新套件"更费 token(多文件联动改 vs 一次性新写)
- 用户决定:**当下保留 v1 + 加警示横幅**(本仓已 commit `295c52f` 收 v1,
  本文档配套的横幅 commit 在 `45e6de9` 之后);**v2 重搭完成并测试通过后,
  立即删除 v1 整目录**。

本文档锁定 v2 的设计草案,避免后期回来又从头分析。

---

## 1. v1 已识别的问题(为什么必须重搭)

### 1.1 设计文档和示例代码是两份独立维护物

- 权威契约:`docs/PANEL_PROVIDER_API.md` / `docs/PANEL_BLUEPRINT.md` / `docs/PANEL_UI_TEMPLATE.md`
- 真实源:`entry/ui-kit/{blueprint,compatibility,manifest,primitives,styles,template,version}.js`
- vendor 副本(每个 consumer 一份):`examples/family-module-provider/web/vendor/workspacekit-ui/` + Layout / Theme 各自的 vendor
- 脚手架示例代码:`examples/family-module-provider/web/ui/*.js`

**任何一处 API 改动,要同时改 4 个地方**。v1 没解决这个问题。

### 1.2 `CHANGE ME` 散落 8 处,智能体不会识别"必改 vs 可改"

v1 标 `CHANGE ME` 的位置:

| 文件 | 位置 | 改什么 | 必改? |
|---|---|---|---|
| `web/ui/provider.js` L11-13 | `PROVIDER_ID / TITLE / ICON` | 插件身份 | **必改** |
| `web/ui/module-view.js` L10 | `ROOT_CLASS` | 作用域 class 前缀 | **必改**(不改则跟其它复用本套件的插件 class 撞) |
| `web/ui/standalone-panel.js` L12 | `PANEL_ID` | 独立模式侧边栏 id | **必改**(撞了 `registerSidebarTab` 静默失败) |
| `web/ui/standalone-panel.js` L29 | `icon` | PrimeVue 图标 class | 可改 |
| `web/foundation/i18n.js` L64 | `console.warn` 前缀 | 日志标记 | 可改 |
| `web/main.js` L16 | `EXTENSION_NAME` | extension 唯一名 | **必改** |

v1 README 没列"必改 N 项",智能体改完容易留雷。

### 1.3 primitives 单一来源约束没落地

v1 `provider.js` 显式硬编码:

```js
export const UI_REQUIREMENTS = Object.freeze({
    requiredMajor: 1,
    requiredCapabilities: Object.freeze([
        "module-header",
    ]),
});
```

但 `module-view.js` 实际用到的 primitives 是另一份:

```js
function supportsHostUi(ui) {
    return Boolean(
        ui?.supports?.(1)
        && typeof ui.createModuleHeader === "function"
        && typeof ui.createSection === "function"
        && typeof ui.createButton === "function",
    );
}
```

**两个数组在不同文件,需要人手/智能体跨文件对账**。这是典型的"该自动派生却硬编码"。

### 1.4 视觉规范没"一页纸"

v1 README 提"prefer `--workspacekit-ui-*` tokens",但:

- 没列**完整 token 表**——智能体不知道有哪些变量可用
- 没列**primitives 默认样式**(`createButton` 高多少、圆角多少、hover 态)——智能体拿到 API 后仍需自己摸索
- 没**"应该长什么样"的参考图**——智能体只有代码,没有视觉参考

### 1.5 合并 tab 模式和独立 tab 模式的边界没说清

- v1 `standalone-panel.js` 第 14-23 行探测 `target.WorkspaceKitPanelUITemplate` 选宿主
- v1 `provider.js` 第 61 行做"宿主能用就用宿主,否则用 vendor"
- v1 `provider.js` 第 32 行有 `onHostClaimed: () => unregisterStandalonePanel(app)`

**这套"双源 + 一份 UI + 自动 unregister"的设计意图,文档里没一句话讲清楚**。
智能体分不清:

- "我该往哪个 slot 写?"(5 个 host 各放什么)
- "哪些 class 是宿主提供、哪些要自己装 `<style>`?"
- "如果宿主晚于本插件加载,会怎样?"

### 1.6 vendor 同步是手动

`scripts/export-panel-ui-template.mjs --all` 只写 `consumers.json` 里的目标,
**不写** `examples/family-module-provider/web/vendor/`(报告 §1.3 第 72 行明说)。
v1 的 vendor 是落盘时手动 copy 的,主仓 `entry/ui-kit/` 升级时**不会自动跟上**。

---

## 2. v2 的设计目标

| 目标 | 验收口径 |
|---|---|
| **G1. 复制后 5 分钟起步** | 复制目录到 `ComfyUI/custom_nodes/<your-plugin>/`,改名 + 改图标 ≤ 5 处,可见 tab |
| **G2. 智能体不出错** | 智能体拿到 v2 目录,只读 README + `module-view.js` 示例,就能正确写新面板,无需再翻权威文档 |
| **G3. 视觉 100% 一致** | 不出现"自己写的按钮颜色 / 图标风格 / 间距"——所有 chrome 走 vendor primitives + tokens |
| **G4. 合并/独立共享 1 份 UI** | module-view 不区分"在合并 tab 还是独立 tab 跑"——同一份代码,同一份 UI Template |
| **G5. primitives 单一来源** | module-view 的 `USED_PRIMITIVES` 是单一 export,provider 自动派生 `UI_REQUIREMENTS` |
| **G6. vendor 自动同步** | 主仓 `entry/ui-kit/` 改动后,examples vendor 在 `--all` 范围内能自动跟上(或者加 CI 检查脚本) |

---

## 3. v2 文件清单(目标 ~10 文件,对照 v1 16 文件)

```
family-module-provider/                      (v2 目标)
  __init__.py                                1   (从 v1 继承)
  SELFCOPY.md                                1   (新建:复制后必改/可改清单)
  web/
    main.js                                  1   (从 v1 继承, ~30 行不变)
    integrations/workspacekit-adapter.js     1   (从 v1 继承, 不改)
    foundation/i18n.js                       1   (从 v1 继承, 改 console.warn 注入化)
    ui/
      provider.js                            1   (改:primitives 自动派生,不再硬编码)
      module-view.js                         1   (改:export USED_PRIMITIVES 单一来源)
      standalone-panel.js                    1   (从 v1 继承, 改 icon 来源)
    locales/{en-US,zh-CN}.json               2   (从 v1 继承, 补全 key + 兜底串)
    vendor/workspacekit-ui/                  1 dir  (主仓 ui-kit 一键同步)
```

净减约 6 文件(SELFCOPY.md 是新增,primitives/style 等由 vendor 接手,集成层和 i18n 基础层大幅收敛)。

---

## 4. v2 与主仓契约的关系

| 契约 | v2 期间状态 | v2 是否改它 |
|---|---|---|
| Provider API v1 (`entry/integrations/workspacekit-panel-api.js`) | 不动 | ❌ |
| Blueprint (header/toolbar/controls/content) (`entry/ui/workspace-panel-host.js`) | 不动 | ❌ |
| UI Template 导出文件列表 (`entry/ui-kit/export.js` `PANEL_UI_TEMPLATE_EXPORT_FILES`) | 不动 | ❌ |
| Vendor 目录结构(7 文件) | 不动 | ❌ |
| **权威 API 文档**(`docs/PANEL_PROVIDER_API.md` 等) | **要补** | ✅ 加 2 节: §"Blueprint 分区总览" + §"视觉规范一页纸" |
| `scripts/export-panel-ui-template.mjs` `--all` | 已就位 | ❌(batch4 已合入) |
| `scripts/ui-template-consumers.json` | 已就位 | ❌(batch4 已合入) |
| **新:`scripts/verify-example-vendors.mjs`** | 新建 | ✅ 检测 `entry/ui-kit/` 改了但 examples vendor 没改 |

---

## 5. 执行步骤(顺序)

### Phase A:文档加固(估时 30-60 分钟,纯文档,无运行时影响)

1. 在 `docs/PANEL_PROVIDER_API.md` 末尾加 **"Panel Blueprint 分区总览"** 一节
   - 5 个 slot 的 ASCII 图
   - 每个 slot 写一行"放什么 / 不放什么"
   - 引用 `entry/ui/workspace-panel-host.js` 的具体行号
2. 在 `docs/PANEL_UI_TEMPLATE.md` 加 **"视觉规范一页纸"** 一节
   - `--workspacekit-ui-*` 完整 token 表
   - `createButton / Section / ModuleHeader / etc.` 默认样式规范
   - 视觉参考(已部署 Layout 截图为参考)
3. 把 `docs/PANEL_QUICKSTART.md` 末尾实测的 ComfyUI locale API 路径
   搬进 `docs/PANEL_PROVIDER_API.md` 的 i18n 节(报告 §1.4 第 87 行)

### Phase B:v2 套件实现(估时 1-2 小时,改示例代码)

4. 改 `examples/family-module-provider/web/ui/module-view.js`
   - 新增 `export const USED_PRIMITIVES = ['createModuleHeader', 'createSection', 'createButton']`
   - `supportsHostUi` 改为读 `USED_PRIMITIVES` 列表
5. 改 `examples/family-module-provider/web/ui/provider.js`
   - 删 `UI_REQUIREMENTS` 硬编码数组
   - 改为 `requiredCapabilities: USED_PRIMITIVES` 形式(从 module-view import)
6. 改 `examples/family-module-provider/web/foundation/i18n.js`
   - 把 console.warn 前缀做成 module-level `LOG_PREFIX` 常量
   - 把 locale key 列表显式 export(便于智能体检索)
7. 改 `examples/family-module-provider/web/ui/standalone-panel.js`
   - icon 从硬编码 `"pi pi-th-large"` 改为读 provider 的 `icon` 字段(单点改)
8. 改 `examples/family-module-provider/web/locales/{en-US,zh-CN}.json`
   - 补全 key + 加 fallback 串(防止运行时 missing translation)
9. 新建 `examples/family-module-provider/SELFCOPY.md`
   - 必改 6 项 + 每项的不改后果
   - 可改 N 项清单
   - 跑通验证清单(本仓有 vendor,无 WorkspaceKit 宿主)

### Phase C:vendor 同步校验(估时 30 分钟,新建工具)

10. 新建 `scripts/verify-example-vendors.mjs`
    - 比较 `entry/ui-kit/` 跟 `examples/family-module-provider/web/vendor/workspacekit-ui/` 的文件清单 + hash
    - 不一致时 exit 1 + 列出哪些文件
11. (可选)在 `package.json` 加 `verify:vendors` 脚本调用之

### Phase D:实跑 + 验收(估时 30-60 分钟,需 ComfyUI 实际跑)

12. 复制 `examples/family-module-provider/` 到 `ComfyUI/custom_nodes/test-scaffold/`
13. 改 `__init__.py` 里的 `WEB_DIRECTORY` 路径
14. 在 ComfyUI 注册后,验证:
    - [ ] 侧边栏看到新 tab
    - [ ] 不装 WorkspaceKit 时,独立模式能显示
    - [ ] 安装 WorkspaceKit 时,合并模式不重复显示
    - [ ] 切 locale (en → zh),所有字符串切换,无 console 缺失警告
    - [ ] `node scripts/verify-example-vendors.mjs` exit 0
15. 删除 `ComfyUI/custom_nodes/test-scaffold/`

### Phase E:删除 v1(估时 5 分钟)

16. `git rm -r examples/family-module-provider/`
17. 提交 `chore(examples): remove v1 family-module-provider scaffold (superseded by v2)`
18. push

---

## 6. 验收标准(Phase D 完后)

- [ ] 智能体拿到 v2 目录,5 分钟内能写出第 1 个非空面板
- [ ] 不装 WorkspaceKit 时,独立 tab 模式能正常显示
- [ ] 安装 WorkspaceKit 时,合并 tab 模式不重复显示
- [ ] 切 locale (en ↔ zh),所有字符串切换,无 console 缺失警告
- [ ] vendor 目录跟主仓 `entry/ui-kit/` 一致(`scripts/verify-example-vendors.mjs` exit 0)
- [ ] `node --check` 通过所有 `examples/family-module-provider/web/**/*.js`
- [ ] 主仓契约(`entry/integrations/workspacekit-panel-api.js` 等)零修改(已用 `git diff` 确认)

---

## 7. 待确认(留给后续轮次)

| Q | 问题 | 默认答案(未确认) |
|---|---|---|
| Q1 | v2 就位后,Theme 是否要立刻迁移?还是观察一阵? | 观察一阵(主仓先稳) |
| Q2 | Theme 端踩过的雷(直接把 UI 代码搬过来用,无视 Layout vendor 模式)要不要写进本文档作为"避坑指南"? | 要写,作为 §8(本轮未写) |
| Q3 | Phase E 删 v1 时,是 PR 合入主仓时一起删,还是先保留 v1 一阵? | 合 PR 时一起删(本轮确认) |
| Q4 | Phase D 的"实跑"是否在用户本地 ComfyUI 跑,还是只用 `node --check` + 静态校验? | 用户本地实跑(本轮确认) |
| Q5 | v2 的 `web/locales/` 是否要兜底 `fallbackStrings`(嵌入式 i18n),还是只走 `fetch`? | 留 fetch,本地兜底延后 |

---

## 8. 已知未解决的问题(留给未来批次)

- vendor 自动同步工具:本方案 Phase C 是"检查脚本",不是"自动同步"。自动同步需要 CI,本方案不碰。
- Theme 端"避坑指南":等 Q2 确认后补。
- v2 的 module-view 模板示例:目前 v1 只有一个 hello world(点击计数),v2 建议至少 2 个示例("分区布局" + "表单输入"),等 Phase B 实际做时再定。

---

## 9. 关键文件锚点(本会话后续轮次用)

| 文件 | 用途 | 预计改动时机 |
|---|---|---|
| `examples/family-module-provider/web/ui/module-view.js` | v2 核心编辑对象 | Phase B 步骤 4 |
| `examples/family-module-provider/web/ui/provider.js` | v2 核心编辑对象 | Phase B 步骤 5 |
| `examples/family-module-provider/web/foundation/i18n.js` | v2 核心编辑对象 | Phase B 步骤 6 |
| `examples/family-module-provider/SELFCOPY.md` | v2 新建 | Phase B 步骤 9 |
| `docs/PANEL_PROVIDER_API.md` | 权威 API 文档加固 | Phase A 步骤 1, 3 |
| `docs/PANEL_UI_TEMPLATE.md` | 权威 API 文档加固 | Phase A 步骤 2 |
| `scripts/verify-example-vendors.mjs` | 新建工具 | Phase C 步骤 10 |

---

_本方案写于 2026-07-31,与 v1 套件入库 commit `295c52f` 配套。本会话后续轮次直接按 §5 步骤执行,无需再分析。_
