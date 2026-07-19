# Contributing to WorkspaceKit

Thank you for helping improve WorkspaceKit.

## Before opening a change

- Search existing issues first.
- Keep changes focused on one problem.
- For behavior changes, explain the user problem before the implementation.
- Do not include generated files, local settings, workflow data, model files, logs, or secrets.
- Confirm the license of any copied or adapted code and update `THIRD_PARTY_NOTICES.md`.

## Development workflow

1. Fork the repository and create a focused branch.
2. Install the plugin in a test ComfyUI environment.
3. Make the smallest change that solves the issue.
4. Test both normal and failure paths.
5. Update `docs/MODULE_MAP.md`, `docs/ARCHITECTURE.md`, and `docs/TESTING.md` when a module boundary changes.
6. Update English and Chinese documentation when user-facing behavior changes.
7. Include screenshots or a short recording for UI changes.
8. Open a pull request using the repository template.

## Pull request expectations

A pull request should include:

- The problem being solved.
- The chosen approach and alternatives considered.
- Files and areas affected.
- ComfyUI and frontend versions tested.
- Whether Nodes 2.0 was enabled.
- Manual and automated test results.
- Compatibility or migration risks.
- Third-party code and license details, when applicable.

## Code principles

- Prefer official ComfyUI extension APIs.
- Preserve backward compatibility for existing Workspace2 data until a documented migration exists.
- Keep UI, storage, services, and ComfyUI adapters separated.
- Avoid broad prototype patches and undocumented global side effects.
- Optional integrations must fail safely.
- Keep `entry.js` as the composition root; do not move sidebar registration or global shortcut ownership into a feature renderer.
- New extracted modules must not do work at import time. Inject network, storage, rendering, and ComfyUI adapter dependencies explicitly.
- Update `docs/MODULE_MAP.md` with ownership, forbidden responsibilities, and validation status for every module boundary change.
- Do not merge modules merely to reduce file count. Merge only when they have the same owner, dependency boundary, and regression suite.

## Security and file operations

Workflow management touches user files. Changes involving move, rename, trash, restore, paths, or imports require explicit tests for invalid paths, traversal attempts, collisions, interrupted operations, and recovery behavior.

Report security issues privately according to `SECURITY.md` rather than opening a public issue.
