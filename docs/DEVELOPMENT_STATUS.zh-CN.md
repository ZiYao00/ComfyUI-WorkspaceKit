# WorkspaceKit 文档导航

> 更新：2026-08-02。此页是公开文档入口与维护说明，不记录逐批开发进度。

## 进度与发布的三文档机制

| 发生什么 | 只更新哪里 | 说明 |
| --- | --- | --- |
| 任务开始、状态变化、技术债或未决项 | 本地 `.dev-docs/DEV_LOG.zh-CN.md` | 唯一开发进度真源；该目录不发布到 GitHub |
| 可重复测试、真实页面验收或已知失败 | [TESTING.md](TESTING.md) | 只记录事实、命令、环境与结果 |
| 用户可感知的已完成变更、准备发布 | [CHANGELOG.md](../CHANGELOG.md) | 只在功能完成后进入 Unreleased 或版本说明 |

`ROADMAP.md` 只在产品方向变化时更新；架构/API/UI Template 文档只在对应公开契约稳定后更新。不要为每个小批次重复修改这些文档。

## 用户与贡献者入口

| 目的 | 文档 |
| --- | --- |
| 安装、功能概览与使用说明 | [README.zh-CN.md](../README.zh-CN.md) / [README.md](../README.md) |
| 未来产品方向 | [ROADMAP.zh-CN.md](../ROADMAP.zh-CN.md) / [ROADMAP.md](ROADMAP.md) |
| 版本历史 | [CHANGELOG.md](../CHANGELOG.md) |
| 贡献、安全与版本规则 | [CONTRIBUTING.md](../CONTRIBUTING.md) / [SECURITY.md](../SECURITY.md) / [RELEASE_VERSIONING.md](RELEASE_VERSIONING.md) |

## 开发与集成入口

| 目的 | 文档 |
| --- | --- |
| 可重复测试证据 | [TESTING.md](TESTING.md) |
| 总体架构、入口与模块边界 | [ARCHITECTURE.md](ARCHITECTURE.md) / [ENTRY_MAP.md](ENTRY_MAP.md) / [MODULE_MAP.md](MODULE_MAP.md) |
| Provider 注册、面板分区与 UI Template | [PANEL_PROVIDER_API.md](PANEL_PROVIDER_API.md) / [PANEL_BLUEPRINT.md](PANEL_BLUEPRINT.md) / [PANEL_UI_TEMPLATE.md](PANEL_UI_TEMPLATE.md) |
| 新建可独立/合并的家族插件 | [PANEL_QUICKSTART.md](PANEL_QUICKSTART.md) |
| 已确认的 WK UI Template 重建与 Theme 迁移方案 | [WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md](WK_UI_TEMPLATE_REBUILD_AND_MIGRATION_PLAN.zh-CN.md) |
| WK、Layout、Theme 的统一图标系统 | [WK_ICON_SYSTEM_PLAN.zh-CN.md](WK_ICON_SYSTEM_PLAN.zh-CN.md) |
| 备份规则 | [BACKUP_CONVENTION.md](BACKUP_CONVENTION.md) |

## 历史与专项参考

- [PANEL_FAMILY_MODULE_REBUILD_PLAN.md](PANEL_FAMILY_MODULE_REBUILD_PLAN.md)：家族模块 v2 示例的历史草案，不替代当前 UI Template 重建计划；
- [BREAKING_CHANGES_REPORT.md](BREAKING_CHANGES_REPORT.md)：一次性 UI Template consumer/export 审计快照，不是长期运行时契约；
- 历史技术名称如 `Workspace2` 只在测试记录、兼容层和旧数据说明中保留，不能作为新的对外命名依据。
