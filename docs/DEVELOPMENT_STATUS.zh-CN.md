# 开发状态索引

> 更新：2026-08-01。此页是中文导航页，不替代测试证据或内部设计文档。

## 当前优先级

### 已完成：编组转换双向闭环

转换算法的夹具验收已覆盖：纯往返、混合、空工作流、重叠/边界、原生新增与删除、无效边界和失败注入。新增原生组会采用默认 WorkspaceKit 样式；已删除原生组不会静默复活。

当前测试包与主包的人工验收未发现异常。复杂夹具的保存并重开保留为后续版本改动时的回归项，而不是当前阻塞项。

- 事实证据：[测试记录](TESTING.md)
- 内部状态机与验收矩阵：[编组转换加固](../.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md)

### 已完成：Workflows 回收站可靠性

- 测试包已完成真实页面的删除、回收站显示、恢复、转系统回收站与清空全部；服务端也覆盖原子清单、补偿和中断恢复契约。
- 新建、打开、保存、重命名、移动及 Browse/官方 Store 同步继续作为后续改动的回归清单，不再以“未修复 P0”表述。

## 已实现，持续回归

| 领域 | 已完成基础 | 后续验收 |
| --- | --- | --- |
| Nodes2 缓存 | 服务端快照、签名、IndexedDB、跨标签协调 | 大插件量、多标签、独立浏览器配置、主包体验 |
| Templates | 首次打开解耦、基础模板交互 | 主包异常、复杂预览、批量恢复/撤销 |
| 外观 | 透明/磨砂、面板分区 | 暗色、浅色、透明、磨砂主包视觉回归 |
| 编组 UX | 双向转换入口、选择与设置调整 | 背景滑块第二阶段设计与复杂持久化验收 |
| Layout/Provider | 统一 UI Template、合并/独立路径、Vendor 回退与四种外观矩阵 | 后续 Provider 或 UI Template 版本升级时，按同一矩阵回归；不作为当前 P0 |

## 本轮文案与套件收尾（2026-08-01）

- 品牌规范已建立：对外产品名为 **ComfyUI WorkspaceKit（WK）**，中文正式名为 **WK 工作区**，系列称呼为 **WK 套件**；核心与关联模块统一使用 `WK 工作流 / 节点 / 模板 / 编组 / 版式 / 主题`。
- 中英文 README、Registry 显示名、双语语言包与回退字符串已完成首轮用户可见文案统一；技术仓库名、接口、存储键、Provider ID 与兼容路径均未修改。
- UI Template 的 primitive、API、兼容与导出合同已复跑通过；Layout 的 Vendor 回退、兼容宿主、Provider 和共享内容测试均通过。
- 测试包已在本轮重启后复核 WorkspaceKit 入口、核心标签、托管 Layout 标签和 Workflows 回收站完整路径。语言包最终呈现仍随 ComfyUI 的客户端语言加载时机保留为轻量回归项。

## 已规划，尚未进入实现

- Alt 拖拽复制 WorkspaceKit 编组、内部节点与连线。
- 编组批量删除确认或可靠撤销。
- `Shift+1` 至 `Shift+4` 自定义，及 ComfyUI/浏览器冲突提示。
- 数据导出/导入、schema、导入前自动备份体验完善。
- GIF 教程、Registry Banner、根目录风险提示。
- 继续小批次拆分 `entry.js`；当前模块边界见 [ENTRY_MAP.md](ENTRY_MAP.md) 与 [MODULE_MAP.md](MODULE_MAP.md)。

## 文档地图

| 文档 | 权威用途 |
| --- | --- |
| [TESTING.md](TESTING.md) | 可复现实验、错误、夹具与通过证据 |
| [ROADMAP.zh-CN.md](../ROADMAP.zh-CN.md) | 面向用户的产品计划 |
| [.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md](../.dev-docs/GROUP_CONVERSION_HARDENING.zh-CN.md) | 编组转换内部状态机和验收矩阵 |
| [PANEL_QUICKSTART.md](PANEL_QUICKSTART.md) | 新插件合并侧边栏的实际接入路径 |
| [PANEL_FAMILY_MODULE_REBUILD_PLAN.md](PANEL_FAMILY_MODULE_REBUILD_PLAN.md) | 家族模块 v2 重搭计划；v1 示例仅保留，不继续扩展 |
| [BREAKING_CHANGES_REPORT.md](BREAKING_CHANGES_REPORT.md) | UI Template consumer/export 变更审计与已知风险 |
| [BACKUP_CONVENTION.md](BACKUP_CONVENTION.md) | 备份规则 |

## 维护规则

1. 只有真实页面或可重复 E2E 结果才能标为“通过”。
2. `TESTING.md` 记录事实；路线图只记录产品状态。
3. 内部专项设计集中在 `.dev-docs/`，避免在 `docs/` 建立重复版本。
4. 每次新功能先在本索引登记分类，再决定是否需要新的专项文档。
