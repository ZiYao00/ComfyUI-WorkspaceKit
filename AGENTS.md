# WorkspaceKit Development Rules

## Scope

This repository is the main `ComfyUI-WorkspaceKit` plugin. It provides workflow, node, favorite, template, group, trash, workspace, and panel-host capabilities. Node alignment and distribution belong in the separate `ComfyUI-WorkspaceKit-Layout` repository.

## Before editing

1. Run `Get-Location` and `git status --short`.
2. Report the files that will be changed and why.
3. Inspect existing code and official ComfyUI frontend APIs before writing replacements.
4. Preserve uncommitted user changes.

## Safety

- Do not delete directories or run recursive/bulk deletion commands.
- Do not move or overwrite user workflow, favorite, template, or trash data without a migration and rollback plan.
- Do not commit or push unless explicitly requested.
- Read and write Chinese text as UTF-8.
- Do not modify files outside this repository.

## Architecture

- Prefer official ComfyUI extension APIs.
- Keep ComfyUI-specific access inside adapter modules.
- Do not spread `app.canvas`, `LiteGraph`, prototype patches, or direct DOM assumptions across UI modules.
- UI, panel registry, workspace state, data services, and compatibility migrations must remain separated.
- Public panel APIs must be versioned and must degrade safely when optional plugins are missing.

## Compatibility

- New public names use `WorkspaceKit`.
- Existing `Workspace2` storage keys, filenames, API paths, and workflow data must remain readable until an explicit migration is implemented and tested.
- Do not perform blind global replacements inside runtime code.

## Third-party code

Before copying implementation code, record the source repository, file path, commit, license, copied scope, and modifications in `THIRD_PARTY_NOTICES.md`. Prefer independent implementations when license compatibility is unclear.

## Validation

At minimum, validate Python syntax, JavaScript syntax or lint where available, plugin import, frontend registration, existing core behavior, and `git status --short`. Report incomplete checks honestly.
