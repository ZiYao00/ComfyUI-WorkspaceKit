# ComfyUI-Workspace2

English | [中文说明](README.zh-CN.md)

ComfyUI-Workspace2 is a workspace enhancement extension for ComfyUI.

It was created because some daily ComfyUI workflows become difficult to manage once the number of workflows, custom nodes, favorites, and canvas groups grows. Workspace2 focuses on practical workspace organization: workflow folders, node favorites, node search, canvas groups, and visual title nodes.

This project does not try to replace the official ComfyUI UI. It adds a focused set of productivity features for users who need more structure in large ComfyUI setups.

Current status: **public beta, 0.1.x**. It is not a stable 1.0 release yet.

## Main Features

Workspace2 currently provides one sidebar entry with three internal tabs:

- **Workflows 2**: Manage workflow files in the official ComfyUI workflow directory.
- **Nodes 2**: Browse, search, favorite, group, and organize nodes.
- **Templates**: Save selected connected nodes as reusable templates and organize them with groups.

It also includes two canvas helpers:

- **Group Enhancements**: Better canvas group shortcuts, title-bar context settings, and default group styling.
- **Title2**: A lightweight visual title / annotation node for large workflows.

## Why Workspace2

### Workflow Management Pain Points

When a ComfyUI setup contains many workflows, a plain list becomes hard to manage.

Workspace2 improves this with:

- Tree-style workflow folder management.
- Folder and subfolder creation.
- Drag-and-drop workflow organization.
- Drop support for expanded folder areas and the root area.
- Plugin trash with restore support before moving items to the operating system trash.
- Workflow sorting, custom order, and folder-first sorting.
- Recent workflow history with configurable item count.
- Search, clear search, refresh, and direct workflow opening.
- Folder icon and color customization.
- Recursive expand/collapse with `Ctrl + click`.

### Node Management Pain Points

The official node browser is useful for adding nodes, but large setups with many extensions need stronger organization.

Workspace2 improves this with:

- Nodes2 sidebar node browser.
- Comfy and Extensions sections.
- Extension nodes grouped by plugin source.
- Fuzzy search and pinyin search.
- Favorite root, favorite groups, and favorite subgroups.
- Drag nodes into favorite groups.
- Drag favorite nodes between groups.
- Custom ordering for favorites and global nodes.
- Node preview cards.
- Drag-to-canvas and click-then-click-to-place node creation.
- Official ComfyUI favorite import/export with automatic settings backup before writing.
- Dimmed display for missing third-party nodes instead of silently deleting them.

### Canvas Group Pain Points

ComfyUI already supports canvas groups, but Workspace2 adds a workflow closer to common design tools:

- `Ctrl+G` to create a group.
- `Shift+G` to ungroup.
- Right-click a group title bar to edit group style.
- Save the current group style as the default group style.
- Move, resize, rename, and delete groups.
- Store group data in the workflow.

If `Ctrl+G` conflicts with an official ComfyUI keybinding, remove or change the official binding in ComfyUI settings first.

### Visual Title Pain Points

Large workflows often need clear section titles, annotations, and visual dividers. Regular note nodes are not always enough for this job.

Workspace2 adds **Title2**:

- Lightweight visual title / annotation node.
- Designed for workflow sections and visual organization.
- Text editing and style controls.
- Default font size: 24.
- Default transparent background.
- Default corner radius: 15.

## Shortcuts

- `Shift+W` or `Shift+1`: open Workflows 2.
- `Shift+N` or `Shift+2`: open Nodes 2.
- `Ctrl+G`: create canvas group.
- `Shift+G`: ungroup.
- `Ctrl + click` folder toggle: recursively expand or collapse folders.

## Installation

Clone this repository into your ComfyUI `custom_nodes` directory:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ZiYao00/ComfyUI-Workspace2.git
```

Then restart ComfyUI.

## Requirements

Workspace2 recommends:

```text
send2trash
```

Install the dependency inside the Python environment used by ComfyUI for cross-platform system trash support:

```bash
pip install -r requirements.txt
```

Do not update your ComfyUI Python environment unless you understand the environment you are modifying.

## System Trash Behavior

Workspace2 has two trash layers:

- **Workspace2 trash**: the plugin-level recoverable trash used when deleting workflows from Workflows 2.
- **System trash**: the operating system trash / recycle bin.

On Windows, Workspace2 has a built-in recycle bin fallback. On other platforms, system trash support depends on `send2trash` and the desktop environment it supports.

## Known Issues

- This is still a public beta.
- Screenshots and GIF tutorials are not included yet.
- Very large workflow directories may take longer to scan and refresh.
- Comfy Registry / ComfyUI Manager metadata is not finalized yet.
- If you choose a custom workflow root, use a dedicated workflow folder. Do not use a disk root, Desktop, Downloads, or a large project directory.

## Before First Use

Workspace2 moves, renames, and organizes workflow files. Before using it in a main ComfyUI environment, back up:

- Your ComfyUI workflow directory.
- Your ComfyUI user settings.
- Important node favorite data.

## Project Notes

I am a ComfyUI user, designer, and creator, not a professional programmer.

Maintainer: ZiYao00

Project homepage: https://github.com/ZiYao00/ComfyUI-Workspace2

This plugin was built with extensive help from Codex. Codex helped read old plugin code, inspect newer ComfyUI frontend behavior, migrate features, debug problems, and turn design ideas into a working extension.

Special thanks to the authors of these projects for providing useful foundations, references, and inspiration:

- [ComfyUI-N-Sidebar](https://github.com/Nuked88/ComfyUI-N-Sidebar)
- [comfyui-workspace-manager](https://github.com/11cafe/comfyui-workspace-manager)
- [ComfyUI-xiaozhuguang](https://github.com/xiaozhuguang/ComfyUI-xiaozhuguang)
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro)

Workspace2 references, migrates, or adapts some ideas and implementation details from these projects. This does not mean the original authors maintain or endorse Workspace2.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

## License

This project uses the MIT License.

Third-party code, references, and adapted implementations remain subject to their original licenses. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
