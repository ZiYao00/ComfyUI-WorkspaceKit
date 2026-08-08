# ComfyUI WorkspaceKit (WK Panel)

**English** · [简体中文](README.zh-CN.md)

> ## A high-efficiency workspace plugin for ComfyUI creators
>
> **Manage workflows, node favorites, and reusable templates in one place, and organize complex canvases with more capable groups.**

![Version](https://img.shields.io/badge/version-0.2.5-blue)
![Status](https://img.shields.io/badge/status-public%20beta-orange)
![License](https://img.shields.io/badge/license-MIT-green)

ComfyUI WorkspaceKit (WK) brings workflow management, node favorites, template reuse, and canvas organization into one focused sidebar entry. Its Chinese product name is **WK 面板**.

`ComfyUI-WorkspaceKit` remains the repository name, installation directory, Provider API, storage-key prefix, and Registry identifier; WK is a user-facing brand and module convention only.

Current status: **public beta, 0.2.5**. Back up important workflows, user settings, node favorites, and template data before first using it in a production ComfyUI environment.

![WorkspaceKit overview](Preview/001.jpg)

<p align="center">
  <a href="#why-a-workspace">Why a workspace</a> ·
  <a href="#features">Features</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#shortcuts">Shortcuts</a> ·
  <a href="#data-safety-and-backups">Data safety</a>
</p>

> **Maintenance note:** updates and Issue / PR replies may be delayed for the next 2–3 weeks.

## Why a workspace

Workflows, nodes, and node templates look like three different kinds of content, but long-term use repeats the same handful of actions:

- Finding one target among many items.
- Grouping things by project, purpose, or habit.
- Dragging items into position or onto the canvas.
- Previewing something before committing to it.
- Keeping a recovery path after a deletion.

WorkspaceKit does not replace ComfyUI's official interface, and it is not about packing more buttons into the sidebar. It adds the workspace capabilities heavy users gradually need: **find content quickly, keep a clear structure, reuse structures you already built, and recover data after a mistake.**

## The WK Suite

Use **ComfyUI WorkspaceKit (WK)** on first mention, then **WK**. The core modules are **WK Workflows**, **WK Nodes**, **WK Templates**, and **WK Groups**; related family modules are **WK Layout** and **WK Theme**. Inside the sidebar, tabs stay concise: Workflows, Nodes, Templates, Layout, Theme.

| Common problem | WorkspaceKit approach | Result |
| --- | --- | --- |
| Too many workflows | **WK Workflows**: folder tree, search, drag and drop, sorting, recents | Organize by project and find files faster |
| Nodes are hard to find or remember | **WK Nodes**: source categories, search, pinyin search, favorite groups | Build a personal node library |
| Repeated node structures | **WK Templates**: preserve node positions and links | Save once and reuse anytime |
| Large canvases become hard to read | **WK Groups + Transparent Title** | Clearer work areas and hierarchy |
| Risk of accidental deletion or migration loss | **Two-stage trash + data backup and transfer** | Safer recovery, backup, and migration |

## Three kinds of working assets

The three tabs are three asset types inside one workspace. They share similar search, tree grouping, drag-and-drop, and recovery behavior while keeping the actions that suit each one.

| Tab | What it manages | Problem it solves | Common actions |
|---|---|---|---|
| **Workflows** | Complete `.json` workflow files | Accumulated workflows become hard to maintain per project | Create folders, search, sort, drag, open, restore |
| **Nodes** | Official and third-party nodes available in the current ComfyUI, plus personal favorites | With many extensions, node names, sources, and frequency are hard to track | Search, favorite groups, preview, place on canvas |
| **Templates** | Already-connected node structures | Common structures should not be rebuilt and rewired every time | Save, group, preview, drag to canvas, restore |

## One consistent interface

The three built-in tabs use the same interface language:

- **Tab navigation**: Workflows, Nodes, and Templates share one entry, with `Shift+1`, `Shift+2`, and `Shift+3` to switch; a pinned compatible extension tab uses `Shift+4`.
- **Title and status area**: modules report loading, refreshing, and processing state in a fixed place.
- **Search and action bar**: the search field, clear-search, and current module actions live in one area; `Esc` clears the search.
- **Tree content area**: workflow folders, node favorite groups, and template groups can all be expanded, collapsed, and reorganized by dragging.
- **Context menus and inline confirmation**: rename, move, preview, and delete stay close to their object; anything that changes data keeps a confirmation or a recovery path.

`Ctrl + click` a folder or group that has child levels to recursively expand or collapse it. This applies to tree folders and groups, not to section headers such as Open / Browse or Favorites / Comfy / Extensions.

## Organization must be recoverable

WorkspaceKit manages real workflow files, and it stores node favorites and templates that users accumulate over time. Recovery is therefore part of the basic design, not an extra behind the delete button.

| Protection | Actual behavior |
|---|---|
| **Two-stage workflow trash** | Workflows first enter WorkspaceKit trash and can be restored; once you are sure, move them to the system trash. |
| **Separate template trash** | Deleted templates and template groups can be restored from the template trash. |
| **Automatic backup before writing official favorites** | Exchanging data with ComfyUI's official favorites backs up the relevant settings file first. |
| **Automatic backup before import** | Importing a WorkspaceKit data package backs up current WorkspaceKit data first. |
| **Missing nodes are kept** | Third-party nodes that are not installed or failed to load appear dimmed instead of being silently removed. |
| **Legacy storage compatibility** | Upgrading from Workspace2 keeps reading the compatible storage location, so existing template data survives. |

Deletion has two stages:

```text
Workflow directory
    ↓ delete
WK Trash (recoverable)
    ↓ confirmed cleanup
System Trash / Recycle Bin
```

Templates use a separate recoverable template trash. It is not shared with the workflow trash and never writes to the system trash.

![Separate trash and restore](Preview/FileRecovery.gif)

## Features

### WK Groups

![WK Groups](Preview/002.jpg)

WK Groups are more than visual frames. They turn a section of a large workflow into a region that can be selected, moved, toggled, and styled as a unit.

- Select nodes and press `Ctrl+G` to create a WK Group.
- `Shift+G` removes one or more group frames without deleting their nodes or links.
- `Delete` removes selected group frames while keeping nodes and links.
- `Ctrl/Meta + left click` the title bar toggles **Ignore** for the whole group.
- `Alt + left click` the title bar toggles **Disable** for the whole group.
- `Shift + left click` the title bar adds or removes a group from multi-selection.
- Double-click a title bar to select the group, its member nodes, and fully nested child groups.
- `Ctrl + drag` on blank canvas extends ComfyUI's native marquee selection to WK Groups.
- Node membership follows native ComfyUI logic: a node belongs to the group when its center enters the group bounds.
- Title-bar action icons appear only while the pointer is inside the group, keeping large canvases cleaner.
- Group execution state is reflected visually; the run icon is dimmed when the group has no executable output.
- Right-click the title bar to configure color, background, border, margin, shadow, opacity, animation, and corner radius.
- Save frequently used group styles as presets.
- Group colors stay compatible with native ComfyUI groups, and groups convert between the two.
- Group data is saved with the workflow.

If `Ctrl+G` conflicts with an official ComfyUI keybinding, change the official binding first or disable the WorkspaceKit shortcut in settings.

Converting a native group into a WK Group:

![Native group to WK Group conversion](Preview/GroupConversion.gif)

WK Groups remember the state of their member nodes:

![Group member state memory](Preview/GroupedMemory.gif)

### WK Workflows

![WK Workflows](Preview/003.jpg)

- Uses the official ComfyUI workflow directory by default.
- Tree-style folders and subfolders.
- Create, rename, copy, drag, and move workflow files and folders.
- Search, clear search, refresh, sorting, and custom ordering.
- Recent workflow history.
- Deleted items enter WorkspaceKit trash first, then can be restored or moved to the system trash.
- Folder icons and colors.
- `Ctrl + click` to recursively expand or collapse folders.
- Optional custom workflow root.
- Open a workflow's file location directly.

**Quick access:** `Shift+1` / `Shift+W`

| Search-bar action | Purpose |
|---|---|
| Create folder | Create a folder in the current browse location. |
| Create workflow | Create an empty workflow. |
| Import | Select and import a workflow from disk. |
| Sort | Choose name, modified-time, or custom ordering; folders can be prioritized. |
| Trash | Open deleted workflows; click again to return to the list. |

Advanced users can choose a custom workflow root. Use a dedicated workflow directory only; do not use a drive root, Desktop, Downloads, or a large project directory.

#### Dissolve and Flatten All

The folder context menu offers two folder-organization actions. They are deliberately separate operations.

**Dissolve** removes only the current folder level and promotes its contents by one level.

```text
A/
└─ B/
   └─ C/
      └─ flow.json

After dissolving B:

A/
└─ C/
   └─ flow.json
```

**Flatten All** removes the selected folder and every subfolder below it, promoting all contained files.

```text
A/
└─ B/
   └─ C/
      └─ flow.json

After flattening A:

flow.json
```

- They are separate so a one-level cleanup cannot accidentally destroy an entire hand-built hierarchy.
- Flatten All always requires confirmation.
- Name collisions are auto-numbered, for example `flow (2).json`, with the extension kept last.
- The same model is available for template groups.
- After updating to a build that adds a new backend route, fully restart ComfyUI.

### WK Nodes

![WK Nodes](Preview/004.jpg)

- Separates **Comfy** nodes and **Extensions**.
- Groups extension nodes by plugin source.
- Search with fuzzy search and pinyin search.
- Favorite root, favorite groups, and favorite subgroups.
- Drag nodes into favorite groups or onto the canvas.
- Click a node, then click the canvas to place it.
- Detailed and compact node previews.
- Import, export, back up, and restore official ComfyUI favorites and WorkspaceKit favorites, with an automatic backup before writing.
- Missing third-party nodes are dimmed instead of silently removed.
- Node caching improves first display for large node libraries.

**Quick access:** `Shift+2` / `Shift+N`

| Search-bar action | Purpose |
|---|---|
| New favorite group | Create a node-favorites group. |
| Preview mode | Switch between detailed and compact node previews. |
| Sort | Change the node display order. |
| Favorite Manager | Import, export, back up, and restore official and WorkspaceKit favorites. |

### WK Templates

![WK Templates](Preview/005.jpg)

Templates are reusable connected node groups. Use them for common structures such as loaders, preprocessing, control blocks, or output chains.

- Press `Alt+C` to save selected connected nodes as a template.
- Preserves relative node positions and links.
- Drag templates to the canvas, or click a template and then click the canvas to place it.
- Template groups, subgroups, search, sorting, and rename.
- Template hover preview.
- Inline rename button and a context menu (rename, place at canvas center, delete).
- Inline delete confirmation for templates and template groups, followed by recoverable template trash.
- Template groups also support Dissolve and Flatten All.

**Quick access:** `Shift+3` · **Save template:** `Alt+C`

| Search-bar action | Purpose |
|---|---|
| New template group | Create a template group. |
| Save selected nodes as template | Save the selected connected nodes. |
| Sort | Change template ordering. |
| Trash | View, restore, or clear deleted templates. |

During the beta compatibility period, template data continues to use the existing Workspace2-compatible location under the ComfyUI user directory. Existing template data remains available after upgrading. Back up important template data regularly.

### Transparent Title

![Transparent Title](Preview/006.jpg)

A lightweight visual title and annotation node for large workflows. It appears in
the ComfyUI node menu under the **🧩 WorkspaceKit** category as
**Transparent Title（透明标题）**.

Default style:

- Font size: 24
- Background: transparent
- Corner radius: 15

## Efficiency actions

| Action | Problem it solves |
|---|---|
| `Shift+1 / 2 / 3` to switch tabs | No hunting for several sidebar icons, and no leaving the canvas. |
| Fuzzy search and pinyin search | Find a node without recalling its exact English name. |
| Drag to canvas, or click then place | Fast when you want speed, precise when the sidebar is narrow. |
| `Alt+C` to save a template | Stop rebuilding and rewiring structures you already made. |
| Recent workflow history | Frequently switched projects need no directory digging. |
| Node caching | Large node libraries show their first screen faster on reopen. |

## Shortcuts

| Shortcut | Action |
|---|---|
| `Shift+1` / `Shift+W` | Open Workflows |
| `Shift+2` / `Shift+N` | Open Nodes |
| `Shift+3` | Open Templates |
| `Shift+4` | Open the pinned compatible extension tab, when present |
| `Alt+C` | Save selected nodes as a template |
| `Ctrl+G` | Create a WorkspaceKit group |
| `Shift+G` | Ungroup selected group frames, keeping nodes |
| `Delete` | Remove selected group frames; nodes and links are retained |
| `Ctrl + click` folder/group toggle | Recursively expand or collapse |
| `Ctrl/Meta + left click` group title bar | Toggle Ignore |
| `Alt + left click` group title bar | Toggle Disable |
| `Shift + left click` group title bar | Add/remove a group from multi-selection |
| `Ctrl + drag` blank canvas | Native marquee plus WorkspaceKit group selection |

## Settings

WorkspaceKit settings cover:

- Module shortcuts and opening behavior.
- Group shortcuts and mouse gestures.
- Recent-workflow item count.
- Transparent or frosted-glass background.
- Node cache inspection and cleanup.
- WorkspaceKit data backup and transfer.
- Whether compatible extensions merge into the WorkspaceKit tab bar.

Disabling a shortcut returns that key combination to ComfyUI or the browser.

Compatible external modules can merge into the same panel through the Provider API, or stay standalone.

## Installation

### ComfyUI Manager / Registry (recommended)

Search for `WorkspaceKit` or `comfyui-workspacekit` in ComfyUI Manager, install it, then restart ComfyUI.

### Git

From ComfyUI's `custom_nodes` directory:

```bash
cd ComfyUI/custom_nodes
git clone https://github.com/ZiYao00/ComfyUI-WorkspaceKit.git
cd ComfyUI-WorkspaceKit
python -m pip install -r requirements.txt
```

Restart ComfyUI when finished. For Windows Portable, run this from the ComfyUI root directory:

```powershell
.\python_embeded\python.exe -m pip install -r .\ComfyUI\custom_nodes\ComfyUI-WorkspaceKit\requirements.txt
```

Install the dependency into the Python environment actually used by ComfyUI, and do not update unrelated dependencies.

### System trash dependency

`send2trash` is recommended and included in the project requirements:

```bash
pip install -r requirements.txt
```

Windows has a built-in recycle-bin fallback. On other platforms, system-trash support comes from `send2trash` and the desktop environment it supports.

## Data Safety and Backups

WorkspaceKit can export and import the data it manages, which is useful when migrating:

- Node favorites
- Template data
- Folder metadata
- WorkspaceKit settings

An automatic backup is created before import. Workflow files themselves and the reproducible node cache are not included in the export package.

WorkspaceKit performs real workflow-file operations: rename, move, folder move, delete, restore, dissolve, and flatten. Even with WK Trash and system trash as two recovery layers, back up the following before first use in a primary ComfyUI environment:

- Your ComfyUI workflow directory
- Your ComfyUI user settings
- Important node-favorite data
- Important template data

## Five-Minute Quick Start

1. Open WorkspaceKit from the sidebar, then use `Shift+1`, `Shift+2`, and `Shift+3` to switch between Workflows, Nodes, and Templates.
2. Create a folder in WK Workflows and drag a workflow into it.
3. Search for a frequently used node in WK Nodes and drag it into a favorites group.
4. Select connected nodes on the canvas and press `Alt+C` to save a template.
5. Select nodes and press `Ctrl+G` to create your first WK Group.

## Current Status and Known Limits

- This is a public beta, not a stable 1.0 release.
- Very large workflow directories can take longer to scan and refresh.
- Emptying the trash into the system trash takes time proportional to the number of items.
- Search speed, ranking quality, and pinyin matching still need validation in very large node libraries.
- Template trash supports restore; bulk restore and a fuller undo experience can still improve.
- The Registry listing is published; icon, banner, and tutorial assets can continue to improve.
- The `main` branch may contain features and fixes that have not yet reached a formal release.

## Project Notes

This project was developed entirely with **Codex (ChatGPT)**. I am a ComfyUI designer and creator without programming knowledge. I define the product requirements, interaction design, testing, and feedback; Codex handles code reading, implementation, feature migration, debugging, and documentation.

- Maintainer: ZiYao00
- Project homepage: https://github.com/ZiYao00/ComfyUI-WorkspaceKit
- Developer documentation: [Chinese Development Status Index](docs/DEVELOPMENT_STATUS.zh-CN.md), [Chinese Branding and Naming](docs/BRANDING_AND_NAMING.zh-CN.md), [Architecture](docs/ARCHITECTURE.md), [Module Map](docs/MODULE_MAP.md), [Testing Log](docs/TESTING.md), [Contributing](CONTRIBUTING.md)
- Version history: [CHANGELOG.md](CHANGELOG.md)
- Planned work: [ROADMAP.zh-CN.md](ROADMAP.zh-CN.md)

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
