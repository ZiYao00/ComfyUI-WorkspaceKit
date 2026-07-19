# Backup Convention

All rollback archives live under the repository-local `.codex-backups/` directory, which is ignored by Git.

| Directory | Contents |
| --- | --- |
| `00-legacy-workspace2/` | Pre-rename Workspace2 history and the final Workspace2 project snapshot. |
| `10-ui-canvas/` | Canvas groups, titles, localization, branding, and UI layout changes. |
| `20-workflows/` | Workflow open/save/rename/dirty-state and synchronization work. |
| `30-entry-splits/` | Backups taken before one bounded `entry.js` module extraction. |
| `40-templates-nodes/` | Templates, node browser, and node-tree changes. |
| `90-full-snapshots/` | Deliberately complete source snapshots. |

`30-entry-splits/oversized-legacy/` preserves two valid but oversized July 18 archives. They contain nested older ZIPs and flattened Git objects due to an earlier backup command; retain them for rollback history, but do not use their creation method again.

Before any source edit, create a source-only archive with:

```powershell
& .\scripts\create-project-backup.ps1 -Category 30-entry-splits -Label entry-workflows-example
```

Use the category matching the change. The script stores repository-relative file paths and excludes `.git`, `.codex-backups`, `__pycache__`, and `node_modules`. Do not delete or overwrite an existing backup as part of normal development.
