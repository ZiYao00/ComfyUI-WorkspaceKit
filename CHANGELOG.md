# Changelog

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
