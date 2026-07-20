# Changelog

## 0.2.2 - 2026-07-20

Release-version governance and documentation synchronization.

### Changed

- Made `pyproject.toml` the authoritative package and Registry version source.
- Made the backend runtime version read that source instead of maintaining a second literal version.
- Added release-version validation and update tooling for future GitHub and Registry releases.
- Synchronized public-beta version status in the English and Chinese README files.

### Notes

- This GitHub release is `0.2.2`; the Comfy Registry listing remains on `0.2.1` until the next explicit Registry publication.

## 0.2.1 - 2026-07-20

First Comfy Registry release of WorkspaceKit.

### Changed

- Published the public-beta package to the Comfy Registry as `comfyui-workspacekit`.
- Standardized the release version as `0.2.1` across package metadata, runtime reporting, and README status lines.
- Made `pyproject.toml` the runtime version source and added a release-version check/update script.

### Notes

- The product remains a public beta; the semantic release version does not imply a stable 1.0 release.

## 0.2.1-beta / 0.2.1b0 - 2026-07-08

Release documentation, version alignment, and public beta packaging update.

### Added

- Added refreshed English and Chinese README pages for the v0.2.1-beta feature set.
- Added public Roadmap documents for GitHub readers.
- Added screenshot/GIF placeholder documentation without broken image links.
- Added a clearer `0.2.1-beta` release target for GitHub releases and tags.

### Changed

- Updated package and runtime version strings to `0.2.1b0`.
- Updated project metadata to mention reusable node templates.
- Reworked README language around beta status, backup guidance, system trash behavior, and template data.
- Clarified shortcut documentation for Templates, Workspace2 groups, and group-ignore behavior.

### Notes

- This release is still a public beta, not a stable 1.0 release.
- GitHub screenshots, Comfy Registry metadata, and Manager metadata are still pending.

## 0.2.0-beta - 2026-07-08

Feature expansion from the early public beta into the unified Workspace2 sidebar.

### Added

- Added a unified Workspace2 sidebar entry with Workflows, Nodes, and Templates tabs.
- Added the Templates tab for saving selected connected nodes as reusable templates.
- Added `Alt+C` template saving.
- Added template groups, subgroups, search, sorting, drag-and-drop organization, context menus, and inline delete confirmation.
- Added recent workflow history with configurable open history count.
- Added a Workspace2 settings panel.
- Added Nodes2 first-screen loading from frontend-registered nodes.
- Added background `/object_info` completion and IndexedDB node caching for large node libraries.
- Added Windows recycle bin fallback for system trash operations.

### Changed

- Improved Workflows2, Nodes2, and Templates layout consistency.
- Improved list text size and row-density behavior across the three tabs.
- Improved Nodes2 fuzzy search, pinyin search, extension grouping, and node preview modes.
- Replaced several browser confirmation dialogs with inline confirmations.
- Improved Canvas Groups style settings, margins, shadows, presets, and shortcut handling.

### Fixed

- Fixed language-pack path issues after GitHub clone.
- Fixed template loading with empty JSON responses.
- Fixed template placement preserving relative node positions and links.
- Fixed template drag-and-drop into groups.
- Fixed search inputs triggering ComfyUI shortcuts.
- Fixed Windows system trash failures when `send2trash` is unavailable.

## 0.1.1-beta / 0.1.1b0 - 2026-07-07

Public beta cleanup and documentation release preparation.

### Added

- Added an English GitHub homepage README.
- Added `README.zh-CN.md` for the Chinese documentation.
- Added public beta status, first-use backup guidance, known issues, and system trash behavior notes.
- Added pinyin-pro to third-party notices.
- Added a license header to the bundled `entry/pinyin-pro.esm.js` file.

### Changed

- Changed the system trash implementation to use `send2trash`.
- Updated trash UI text from Windows-only wording to generic system trash wording.
- Clarified that Workspace2 is a public beta instead of a private test package.
- Added a short comment to `requirements.txt` explaining why `send2trash` is required.

## 0.1.0 - Initial public beta baseline

Initial Workspace2 release preparation.

### Added

- Workflows2 sidebar tab for official ComfyUI workflow-folder management.
- Nodes2 sidebar tab for node browsing, search, favorites, groups, and drag-to-canvas.
- Node favorite import/export with ComfyUI official bookmarks.
- Plugin trash and restore workflow.
- Folder and favorite-group personalization.
- Title2 node.
- Canvas group enhancement module.
- Chinese-first README and third-party notices.

### Notes

- This release is a public beta baseline, not a stable 1.0 release.
- The project is based on MIT-licensed upstream projects and includes explicit third-party notices.
