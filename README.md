# ComfyUI-WorkspaceKit

English | [中文说明](README.zh-CN.md)

> **Maintenance notice:** I will be travelling and unable to update the plugin for the next 2–3 weeks. Please use the current public beta with appropriate backups; issues and pull requests may receive a delayed response.

ComfyUI-WorkspaceKit is a workspace enhancement extension for ComfyUI. It focuses on practical organization for large workflow libraries, large custom-node setups, node favorites, reusable node templates, and complex canvas layouts.

It does not try to replace the official ComfyUI UI. Instead, it adds a focused workspace layer for users who need faster organization, safer file operations, better node reuse, and clearer visual structure.

Current status: **public beta, 0.2.3**. It is usable for daily testing, but it is not a stable 1.0 release yet. Before using it in a main ComfyUI environment, back up your workflows, user settings, important node favorites, and important template data.

## When WorkspaceKit Helps

WorkspaceKit is designed for users who run into these problems after using ComfyUI for a while:

- Too many workflow files to manage comfortably in a plain list.
- Too many custom nodes and extensions mixed into the node browser.
- Frequently reused connected node groups that need to be saved as templates.
- Large workflows that need clearer groups, titles, and visual sections.
- File operations such as move, rename, and delete that need safer recovery behavior.

WorkspaceKit brings these daily organization tasks into one workspace sidebar.

## Main Features

WorkspaceKit currently provides one unified sidebar entry with three internal tabs:

- **Workflows 2**: Manage workflow files in the ComfyUI workflow directory.
- **Nodes 2**: Browse, search, favorite, group, and organize nodes.
- **Data backup and transfer**: Export WorkspaceKit-owned data and import it later with an automatic pre-import backup. Workflow files and the derived node cache are not included.
- **Templates**: Save selected connected nodes as reusable templates and organize them with groups.

It also includes two canvas helpers:

- **Group Enhancements**: Better canvas group shortcuts, title-bar style settings, and default group styling.
- **Title2**: A lightweight visual title / annotation node for large workflows.

## Features

### Workflows 2

Workflows 2 is for workflow-file organization, especially when you have many `.json` workflows.

Key features:

- Uses the official ComfyUI workflow directory by default.
- Tree-style folder management with folders and subfolders.
- Create, rename, and drag workflow files and folders.
- Drop support for folders, expanded folder areas, and the root area.
- Plugin-level trash and restore before moving items to the operating system trash.
- Sorting, custom order, and folder-first sorting.
- Recent workflow history with configurable item count.
- Search, clear search, refresh, and direct workflow opening.
- Open workflow file location.
- Folder icon and color customization.
- Recursive expand/collapse with `Ctrl + click`.

Advanced users can choose a custom workflow root. If you use this, choose a dedicated workflow folder. Do not use a disk root, Desktop, Downloads, or a large project directory.

### Nodes 2

Nodes 2 is for node discovery, favorites, and organization in large ComfyUI installs.

Key features:

- Reads available nodes from the current ComfyUI environment.
- Separates **Comfy** nodes and **Extensions**.
- Groups extension nodes by plugin source.
- Search with fuzzy search and pinyin search.
- Favorite root, favorite groups, and favorite subgroups.
- Drag nodes into favorite groups.
- Drag favorite nodes between groups.
- Drag nodes to canvas.
- Click a node, then click the canvas to place it.
- Node preview cards.
- Import/export with official ComfyUI favorites, with automatic settings backup before writing.
- Dimmed display for missing third-party nodes instead of silently deleting them.
- Node cache for faster first display in large node libraries.

### Templates

Templates are for reusable connected node groups. They are useful for saving common node structures such as loaders, preprocessors, control blocks, output chains, or post-processing chains.

Key features:

- Press `Alt+C` to save the currently selected nodes as a template.
- Preserves relative node positions and links.
- Drag templates to the canvas.
- Click a template, then click the canvas to place it.
- Template groups and subgroups.
- Template search, sorting, rename, and delete.
- Template hover preview.
- Template context menu: rename, place at canvas center, copy name, delete.
- Inline delete confirmation for templates and template groups.

During the beta compatibility period, template data continues to use the existing Workspace2-compatible location under the ComfyUI user directory. Existing template data therefore remains available after upgrading to WorkspaceKit. Back up important template data regularly.

### Group Enhancements

Group Enhancements make canvas groups closer to common design-tool behavior.

Key features:

- `Ctrl+G` creates a WorkspaceKit group from the selected nodes.
- `Shift+G` ungroups.
- `Shift + left click` toggles whether WorkspaceKit groups ignore node selection.
- Right-click a group title bar to edit group style.
- Save the current group style as one of the default group presets.
- Configure group margin, border, shadow, animation, and related visual settings.
- Group data is saved into the workflow.

If `Ctrl+G` conflicts with an official ComfyUI keybinding, change the official keybinding first or disable the WorkspaceKit Ctrl+G option in settings.

### Title2

Title2 is a lightweight visual title / annotation node for large workflows.

Default style:

- Font size: 24
- Background: transparent
- Corner radius: 15

## Shortcuts

| Shortcut | Action |
|---|---|
| `Shift+1` / `Shift+W` | Open Workflows 2 |
| `Shift+2` / `Shift+N` | Open Nodes 2 |
| `Shift+3` | Open Templates |
| `Alt+C` | Save selected nodes as a template |
| `Ctrl+G` | Create WorkspaceKit group |
| `Shift+G` | Ungroup |
| `Ctrl + click` folder toggle | Recursively expand or collapse folders / groups |
| `Shift + left click` | Toggle whether WorkspaceKit groups ignore node selection |

## Installation

Clone this repository into your ComfyUI `custom_nodes` directory:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ZiYao00/ComfyUI-WorkspaceKit.git
```

Then restart ComfyUI.

## Requirements

WorkspaceKit recommends:

```text
send2trash
```

Install the dependency inside the Python environment used by ComfyUI for better cross-platform system trash support:

```bash
pip install -r requirements.txt
```

Do not update your ComfyUI Python environment unless you understand the environment you are modifying.

## System Trash Behavior

WorkspaceKit has two trash layers:

- **WorkspaceKit trash**: the plugin-level recoverable trash used when deleting workflows from Workflows 2.
- **System trash**: the operating system trash / recycle bin.

On Windows, WorkspaceKit has a built-in recycle bin fallback. On other platforms, system trash support depends on `send2trash` and the desktop environment it supports.

## Before First Use

WorkspaceKit moves, renames, and organizes workflow files. Before using it in a main ComfyUI environment, back up:

- Your ComfyUI workflow directory.
- Your ComfyUI user settings.
- Important node favorite data.
- Important template data.

## Known Issues

- This is still a public beta, not a stable 1.0 release.
- Screenshots and GIF tutorials are not included yet.
- Very large workflow directories may take longer to scan and refresh.
- The Registry listing is published; visual metadata such as an icon, banner, screenshots, and GIF tutorials can still be improved.
- Template deletion currently uses inline confirmation; undo or template trash can be improved in a future version.
- Nodes 2 search speed, ranking quality, and pinyin matching still need more testing in very large node libraries.

## Project Notes

I am a ComfyUI user, designer, and creator, not a professional programmer. This plugin was built with extensive help from Codex. Codex helped read old plugin code, inspect newer ComfyUI frontend behavior, migrate features, debug problems, and turn design ideas into a working extension.

Maintainer: ZiYao00

Project homepage: https://github.com/ZiYao00/ComfyUI-WorkspaceKit

Developer documentation: [Architecture](docs/ARCHITECTURE.md), [Module Map](docs/MODULE_MAP.md), [Testing Log](docs/TESTING.md), and [Contributing](CONTRIBUTING.md).

## Credits

Special thanks to the authors of these projects for providing useful foundations, references, and inspiration:

- [ComfyUI-N-Sidebar](https://github.com/Nuked88/ComfyUI-N-Sidebar)
- [comfyui-workspace-manager](https://github.com/11cafe/comfyui-workspace-manager)
- [ComfyUI-xiaozhuguang](https://github.com/xiaozhuguang/ComfyUI-xiaozhuguang)
- [pinyin-pro](https://github.com/zh-lx/pinyin-pro)

WorkspaceKit references, migrates, or adapts some ideas and implementation details from these projects. This does not mean the original authors maintain or endorse WorkspaceKit.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

## License

This project uses the MIT License.

Third-party code, references, and adapted implementations remain subject to their original licenses. See [LICENSE](LICENSE) and [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
