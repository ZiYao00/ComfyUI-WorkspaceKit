# ComfyUI-Workspace2

ComfyUI-Workspace2 是一个面向 ComfyUI 的工作区增强插件。

它目前主要提供两个侧边栏入口：

- 工作流2：用于管理 ComfyUI 官方工作流目录里的工作流文件。
- 节点2：用于浏览、搜索、收藏和整理节点。

同时，插件还包含一些画布辅助能力，例如编组增强和标题节点。

这个项目不是“完全从零原创”的插件。它是在 Codex 协助下，参考、迁移和整合多个优秀 ComfyUI 插件后，为新版 ComfyUI 重新整理出来的个人工作流增强插件。

## 当前功能

### 工作流2

- 使用 ComfyUI 官方默认工作流目录。
- 树状文件夹管理。
- 新建文件夹、新建子文件夹、重命名、删除到插件回收站。
- 工作流拖拽整理。
- 文件夹展开区域支持拖拽放入。
- 工作流点击名称直接打开。
- 打开工作流所在位置。
- 插件回收站与恢复。
- 回收站项目可移到系统回收站。
- 工作流排序、自定义顺序、优先文件夹。
- 文件夹个性化：图标和颜色。
- 搜索、刷新、新建工作流。
- 字号滑块。
- 快捷键：Shift+W 或 Shift+1。

### 节点2

- 独立侧边栏节点管理器。
- 从 ComfyUI `/object_info` 读取当前可用节点。
- 显示官方节点与已加载扩展节点。
- 节点搜索。
- 节点收藏。
- 收藏分组。
- 新建收藏分组、新建子分组、重命名、删除。
- 拖拽节点到收藏根位置或收藏分组。
- 拖拽收藏节点移动分组。
- 收藏节点自定义排序。
- 节点拖拽到画布。
- 点击节点后，再点击画布放置节点。
- 放置节点时显示预览卡片。
- 节点右键菜单。
- 与 ComfyUI 官方收藏进行导入、导出、备份、还原。
- 缺失的第三方节点会以更弱的样式显示，不会自动删除。
- 收藏分组个性化：图标和颜色。
- 字号滑块。
- 快捷键：Shift+N 或 Shift+2。

### 标题2

- 一个用于画布注释/标题的轻量节点。
- 支持文字编辑和样式调整。
- 默认透明背景。

### 编组增强

- 支持从选中节点创建画布编组。
- 支持移动、调整、重命名、删除编组。
- 支持保存到工作流数据中。
- 当前不再显示独立侧边栏入口，主要作为画布增强能力使用。

## 安装

进入 ComfyUI 的 `custom_nodes` 目录：

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ZiYao00/ComfyUI-Workspace2.git
```

然后重启 ComfyUI。

## 依赖

当前插件需要：

```text
send2trash
```

如果你的环境缺少它，可以在 ComfyUI 对应 Python 环境中安装：

```bash
pip install -r requirements.txt
```

不要在不了解 ComfyUI Python 环境的情况下随意更新依赖。

## 项目说明

我是一个不懂代码的 ComfyUI 爱好者、设计师和创作者。

项目维护者：ZiYao00

项目主页：https://github.com/ZiYao00/ComfyUI-Workspace2

这个插件能做出来，非常感谢 Codex 的协助。Codex 帮我阅读旧插件代码、分析新版 ComfyUI 前端行为、迁移功能、调试问题，并逐步把想法整理成可以实际运行的插件。

同时也非常感谢以下插件和作者提供的基础、灵感和参考：

- [ComfyUI-N-Sidebar](https://github.com/Nuked88/ComfyUI-N-Sidebar)
- [comfyui-workspace-manager](https://github.com/11cafe/comfyui-workspace-manager)
- [ComfyUI-xiaozhuguang](https://github.com/xiaozhuguang/ComfyUI-xiaozhuguang)

Workspace2 参考、迁移或改造了这些项目中的部分思路和实现，但并不代表这些原项目作者参与维护 Workspace2。

详细来源说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 许可证

本项目使用 MIT License。

第三方项目代码、思路和改造部分仍遵循其原始许可证。详见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 当前状态

这是一个仍在快速迭代中的插件。当前仓库先作为私有测试和整理版本使用。

如果你要在主 ComfyUI 环境中使用，建议先备份工作流和 ComfyUI 用户设置。
