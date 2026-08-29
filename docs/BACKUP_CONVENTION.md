# Backup Convention

All rollback archives live under the repository-local `.codex-backups/` directory, which is ignored by Git.

## Categories

| Directory | Contents |
| --- | --- |
| `00-legacy-workspace2/` | Pre-rename Workspace2 history and the final Workspace2 project snapshot. |
| `10-ui-canvas/` | Canvas groups, titles, localization, branding, and UI layout changes. |
| `20-workflows/` | Workflow open/save/rename/dirty-state and synchronization work. |
| `30-entry-splits/` | Backups taken before one bounded `entry.js` module extraction. |
| `40-templates-nodes/` | Templates, node browser, and node-tree changes. |
| `50-integrations/` | Provider API, cross-plugin integration, settings shell, and compatibility-layer changes. |
| `90-full-snapshots/` | Deliberately complete source snapshots (batch starts, release preparation, or changes hard to classify). |

The sibling `ComfyUI-WorkspaceKit-Layout` repository shares this classification and additionally documents the same seven categories in its own `.codex-backups/README.md`. The `create-project-backup.ps1` script accepts all seven names in `-Category`; empty categories do not create their target directory until first use.

## Local root and legacy references

`.codex-backups/` is the single local backup root for this repository. The
former root `.backup/` was consolidated into
`.codex-backups/legacy-file-snapshots/` on 2026-08-14; those entries are
partial file-level references, not complete rollback archives. The former
standalone `node.zip` snapshot is no longer retained and must not be cited as a
current rollback point.

The root-local `.codex-backups/README.md` is the short operational guide for
this machine. This tracked document remains the contributor-facing convention.

`30-entry-splits/oversized-legacy/` preserves two valid but oversized July 18 archives. They contain nested older ZIPs and flattened Git objects due to an earlier backup command; retain them for rollback history, but do not use their creation method again.

## Creating a backup

Before any source edit that affects features, architecture, data format, integration contracts, or many files, create a source-only archive with either PowerShell runtime:

```powershell
# Windows PowerShell 5.1 (preinstalled on Windows 10/11)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\create-project-backup.ps1 -Category 30-entry-splits -Label entry-workflows-example
```

```powershell
# PowerShell 7+ (recommended for consistency with pwsh-based CI)
pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\create-project-backup.ps1 -Category 30-entry-splits -Label entry-workflows-example
```

Both runtimes produce archives with identical repository-relative entry lists. The `-Label` must be a short kebab-case English description of *what is about to change* (e.g. `workflow-split-layout`, `group-alt-drag-copy`). The script stores repository-relative POSIX-style paths and excludes `.git`, `.codex-backups`, `.dev-docs`, `__pycache__`, `node_modules`, `.venv`, `venv`, `env`, and any pre-existing archive files (`*.zip`, `*.7z`, `*.rar`, `*.tar`, `*.gz`).

## Internal development docs

Some documentation records ongoing development state — the backlog, tech-debt register, batch dashboard, and the group/settings/UI-template implementation trackers — rather than user- or contributor-facing product surface. Those files live in `.dev-docs/` at the repository root and are excluded from both Git (via `.gitignore`) and backup archives. Their `.md` files are only meaningful during active development on this machine; a fork or a Registry install does not need them and should not receive them.

The following categories stay under `docs/` because external readers or the Registry publishing pipeline may follow their links: architecture, module map, product requirements, roadmap (internal feature-level), Panel Provider API, Panel UI Template, backup convention, release versioning, README content audit, and the testing log.

## Retention

- One "before" snapshot per independent change batch. Do not overwrite an earlier snapshot when extending or retrying a batch — take a new one.
- Do not delete an existing backup as part of normal development. When disk space forces cleanup, confirm each candidate archive individually.
- Record archive size for every snapshot and SHA-256 for important ones (test log entries or commit messages should cite the archive path).
- A backup is not a release: after modifying, still run syntax checks, contract tests, and any real-page acceptance the batch requires.
- Restore by extracting to a temporary location and comparing diffs; do not overwrite the current working tree directly.
- For a cleanup approved by the user, first verify the retained baseline, then move each confirmed candidate to a dated local staging directory such as `_delete-candidates-YYYYMMDD/`. The user may then permanently remove that staging directory from the Windows Recycle Bin.

## Git and layout

- `.codex-backups/` is excluded by `.gitignore`; snapshots stay local.
- The script itself lives in `scripts/`; both this document and the sibling `ComfyUI-WorkspaceKit-Layout/.codex-backups/README.md` describe the same policy.
