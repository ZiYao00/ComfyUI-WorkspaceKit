# Release preparation

## Repository

- Target GitHub repository: `https://github.com/ZiYao00/ComfyUI-Workspace2`
- Current release strategy: private GitHub testing first.
- License strategy: MIT, with third-party notices preserved.

## Author and attribution handling

- Project identity files should describe this project as `ComfyUI-Workspace2`.
- Old upstream project identity should not remain in README installation commands, project URLs, or package metadata.
- Upstream author/license information must be preserved in `THIRD_PARTY_NOTICES.md` and `LICENSE`.
- Do not describe Workspace2 as fully original or written from scratch.

## Files prepared

- `README.md`: Chinese-first project README.
- `LICENSE`: MIT license with Workspace2 and upstream copyright lines.
- `THIRD_PARTY_NOTICES.md`: upstream project credits and license notes.
- `CHANGELOG.md`: private test release notes.
- `.gitignore`: expanded cache/log/model/output ignores.
- `pyproject.toml`: repository and display name updated for Workspace2.
- Git remote `origin`: updated to `https://github.com/ZiYao00/ComfyUI-Workspace2.git`.
- Legacy `ui/` and `dist/` folders were moved out of the plugin directory after successful runtime testing.
- Legacy developer README and old unused backend service modules were moved out of the plugin directory.
- Legacy GitHub funding/action files and the old git-hook setup script were moved out of the plugin directory.

## Still needs review before push

- Confirm final Git status includes only intended active files and archived legacy deletions.
- `__pycache__/` and other generated files should not be committed.
- Run a final status, diff, large-file, and secret scan before commit.

## Suggested release policy for legacy folders

Current runtime loads `WEB_DIRECTORY = "entry"`, so the active Workspace2 frontend is under `entry/`.

The legacy `ui/` and `dist/` folders are not needed by the current tested Workspace2 runtime and were archived outside the release copy.

The following old backend modules were also archived because the current `__init__.py` does not import them and they register obsolete `/workspace/*` or `/model_manager/*` routes from the old plugin:

- `README_for_developer.md`
- `service/db_service.py`
- `service/file_sync_service.py`
- `service/media_service.py`
- `service/node_service.py`
- `service/scan_my_workflows_folder.py`
- `service/setting_service.py`
- `service/twoway_sync_folder_service.py`
- `service/model_manager/`

The following repository-maintenance files were also archived because they belonged to the old upstream release process:

- `.github/FUNDING.yml`
- `.github/workflows/publish_action.yml`
- `scripts/setupGitHooks.js`
