# ComfyUI-Workspace2

[English](README.md) | 中文说明

ComfyUI-Workspace2 是一个面向 ComfyUI 的工作区增强插件。

我开发这个插件的本意，是因为 ComfyUI 官方当前的一些交互在大型工作流、节点收藏、画布整理这些日常场景里还不够顺手。于是我根据以前使用旧插件的习惯，把工作流管理、节点管理、编组增强和画布标题节点重新整合、迁移和更新了一遍。

它不是要替代 ComfyUI 官方功能，而是补齐一些高频操作的体验缺口。

当前状态：**公开测试版，0.1.x**。它还不是稳定版 1.0。

## 主要功能

插件目前主要提供两个侧边栏入口：

- **工作流2**：管理 ComfyUI 官方工作流目录里的工作流文件。
- **节点2**：浏览、搜索、收藏、分组和整理节点。

同时，插件还包含两个画布辅助能力：

- **编组增强**：强化画布编组快捷键、标题栏右键设置和默认编组样式。
- **标题2**：用于在复杂工作流中添加更清晰的标题和注释。

## 为什么需要 Workspace2

### 官方工作流管理的痛点

当工作流数量变多后，单纯列表很难长期整理。

Workspace2 的优化包括：

- 树状工作流文件夹管理。
- 文件夹和子文件夹创建。
- 工作流拖拽整理。
- 支持拖到文件夹、展开的文件夹区域和根目录。
- 插件回收站与恢复机制，再由用户决定是否移到系统回收站。
- 工作流排序、自定义顺序、优先文件夹。
- 搜索、清空搜索、刷新和点击名称直接打开工作流。
- 文件夹图标和颜色个性化。
- `Ctrl + 点击` 文件夹递归展开或折叠。

### 官方节点管理的痛点

官方节点管理器适合添加节点，但当安装了大量第三方插件后，还需要更强的整理能力。

Workspace2 的优化包括：

- 独立的 Nodes2 侧边栏节点管理器。
- Comfy 和扩展节点分区。
- 扩展节点按插件来源整理。
- 模糊搜索和拼音搜索。
- 收藏根位置、收藏分组和收藏子分组。
- 拖拽节点到收藏分组。
- 拖拽收藏节点在分组之间移动。
- 收藏节点和全局节点支持自定义顺序。
- 节点预览卡片。
- 拖拽节点到画布。
- 点击节点后，再点击画布放置节点。
- 与 ComfyUI 官方收藏进行导入、导出、备份、还原。
- 缺失的第三方节点会以更弱的样式显示，不会自动删除。

### 官方画布编组的痛点

ComfyUI 已经有画布编组，但在设计师习惯的工作方式里，还缺少一些细节。

Workspace2 的优化包括：

- `Ctrl+G` 创建编组。
- `Shift+G` 取消编组。
- 右击编组标题栏打开样式设置。
- 把当前编组样式保存为默认编组样式。
- 移动、调整、重命名、删除编组。
- 编组数据保存到工作流中。

如果 `Ctrl+G` 与 ComfyUI 官方快捷键冲突，需要先在 ComfyUI 快捷键设置里移除或修改官方绑定。

### 官方注释和标题的痛点

复杂工作流经常需要大标题、区域说明和视觉分隔。普通注释节点可以写文字，但不够适合作为清晰的视觉标题。

Workspace2 增加了 **标题2**：

- 轻量的画布标题 / 注释节点。
- 适合给复杂工作流添加区域标题和视觉结构。
- 支持文字编辑和样式调整。
- 默认字号为 24。
- 默认透明背景。
- 默认圆角为 15。

## 快捷键

- `Shift+W` 或 `Shift+1`：打开工作流2。
- `Shift+N` 或 `Shift+2`：打开节点2。
- `Ctrl+G`：创建画布编组。
- `Shift+G`：取消编组。
- `Ctrl + 点击` 文件夹开关：递归展开或折叠文件夹。

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

请在 ComfyUI 使用的 Python 环境中安装依赖：

```bash
pip install -r requirements.txt
```

不要在不了解 ComfyUI Python 环境的情况下随意更新依赖。

## 系统回收站说明

Workspace2 有两层回收站：

- **Workspace2 回收站**：插件自己的可恢复回收站，用于工作流删除后的恢复。
- **系统回收站**：操作系统的回收站，通过 `send2trash` 处理。

系统回收站功能依赖 `send2trash` 对当前操作系统和桌面环境的支持。

## 已知问题

- 当前仍然是公开测试版。
- README 暂时还没有补充截图和 GIF 教程。
- 如果工作流目录非常大，扫描和刷新可能会变慢。
- Comfy Registry / ComfyUI Manager 的上架信息还没有最终完善。
- 如果使用自定义工作流根目录，请只选择专门用于 ComfyUI 工作流的文件夹，不要选择磁盘根目录、桌面、下载目录或项目总目录。

## 首次使用前建议

Workspace2 会移动、重命名和整理工作流文件。首次在主 ComfyUI 环境中使用前，建议备份：

- ComfyUI 工作流目录。
- ComfyUI 用户设置。
- 重要的节点收藏数据。

## 项目说明

我是一个不懂代码的 ComfyUI 爱好者、设计师和创作者。

项目维护者：ZiYao00

项目主页：https://github.com/ZiYao00/ComfyUI-Workspace2

这个插件能做出来，非常感谢 Codex 的协助。Codex 帮我阅读旧插件代码、分析新版 ComfyUI 前端行为、迁移功能、调试问题，并逐步把想法整理成可以实际运行的插件。

同时也非常感谢以下插件和作者提供的基础、灵感和参考：

- [ComfyUI-N-Sidebar](https://github.com/Nuked88/ComfyUI-N-Sidebar)
- [comfyui-workspace-manager](https://github.com/11cafe/comfyui-workspace-manager)
- [ComfyUI-xiaozhuguang](https://github.com/xiaozhuguang/ComfyUI-xiaozhuguang)
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro)

Workspace2 参考、迁移或改造了这些项目中的部分思路和实现，但并不代表这些原项目作者参与维护 Workspace2。

详细来源说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

## 许可证

本项目使用 MIT License。

第三方项目代码、思路和改造部分仍遵循其原始许可证。详见 [LICENSE](LICENSE) 和 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
