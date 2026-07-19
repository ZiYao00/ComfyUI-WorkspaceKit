# WorkspaceKit Architecture

## Current repository

This repository was created from the existing `ComfyUI-Workspace2` history so that proven workflow, node, template, group, and trash behavior can be preserved. Public branding is moving to WorkspaceKit, while runtime identifiers remain unchanged until compatibility migrations are designed and tested.

## Target layers

```text
ComfyUI-WorkspaceKit
├── ComfyUI adapter
├── Event bus
├── Panel registry
├── Workspace state store
├── Workspace shell
├── Built-in panels
│   ├── Workflows
│   ├── Nodes and favorites
│   ├── Templates
│   └── Groups and trash
└── Compatibility migrations
```

## Boundaries

### ComfyUI adapter

Owns access to official extension hooks, settings, sidebar registration, canvas state, notifications, and any unavoidable compatibility shims. Other modules should not depend directly on global ComfyUI or LiteGraph objects.

### Event bus

Provides a small internal and public event channel. Public events must be documented and versioned. Event listeners must be removable.

Initial events:

```text
workspacekit:ready
workspacekit:panel-registered
workspacekit:panel-unregistered
workspacekit:panel-shown
workspacekit:panel-hidden
workspacekit:layout-changed
workspacekit:workspace-restored
```

### Panel registry

Owns panel definitions, duplicate protection, lifecycle, visibility, and the public registration API. It does not own panel-specific business logic.

Target public surface:

```js
window.WorkspaceKit = {
  apiVersion: 1,
  registerPanel(definition) {},
  unregisterPanel(panelId) {},
  showPanel(panelId) {},
  hidePanel(panelId) {},
  togglePanel(panelId) {},
  getPanel(panelId) {},
  listPanels() {},
  on(eventName, callback) {},
  off(eventName, callback) {},
};
```

A panel definition should include a unique id, title, icon, source, API version, default location, size constraints, `render(container, context)`, and `dispose()`.

### Workspace state store

Persists panel visibility, location, size, collapse state, tab group, and active workspace. It must use a versioned schema, validate loaded data, recover to defaults, and migrate old data without deleting the source.

Do not store workflows, model paths, credentials, private account data, or large content in workspace layout state.

### Workspace shell

Hosts built-in and external panels. The first implementation may remain inside the official sidebar. Floating, docking, tab grouping, and split regions are later capabilities built on top of the same registry.

### Built-in panels

Existing features should be migrated into the registry incrementally. Business services remain independent of panel lifecycle so hiding a panel does not destroy data or start unnecessary polling.

## Current `entry.js` decomposition plan

`entry.js` is currently the composition root and still contains legacy feature logic. The target is not an empty interface file: it must retain ComfyUI extension registration, sidebar lifecycle, shortcut routing, module construction, and the few cross-module bridges that need official `app` access. Feature state, file operations, and panel rendering should leave it incrementally.

### Already extracted

The maintainer-level ownership, dependency, and acceptance index is maintained
in [Module Map](MODULE_MAP.md). Keep this architecture overview and the module
map in sync when a module boundary changes.

| Area | Module | Ownership |
| --- | --- | --- |
| Core | `core/api.js`, `core/i18n.js`, `core/performance.js` | HTTP helpers, translation, timing. |
| Nodes | `nodes/cache-coordinator.js`, `nodes/panel-state.js`, `nodes/library-normalizer.js`, `nodes/library-loader.js`, `nodes/object-info-state.js` | Cross-tab node-cache refresh coordination, pure local preferences, node-library/server-cache response normalization, initial-library loading, and object-info state transitions. |
| Templates | `templates/library.js` | Template-library loading, persistence, and query data. |
| Workflows | `workflows/official-adapter.js` | Narrow ComfyUI official workflow Store adapter. |
| Workflows | `workflows/recents.js`, `workflows/open-state.js`, `workflows/item-store.js`, `workflows/path-state.js` | Open-history persistence, dirty/official-state bridge, locally mutated Browse-item collection, and path-dependent Browse UI state. |
| Workflows UI | `workflows/sections.js`, `results-renderer.js`, `context-menu-renderer.js`, `trash-renderer.js`, `tree-builder.js`, `search.js`, `row-renderer.js`, `sort-menu-renderer.js` | Presentation-only subtrees, read-only Browse search, state-to-tree data shaping, deferred Browse-row DOM/event binding, and the on-demand sort-menu DOM/listener lifecycle; action callbacks remain injected. |

### Required end state for the composition root

`entry.js` should eventually contain only these responsibilities:

1. Register the ComfyUI extension and WorkspaceKit sidebar entry.
2. Construct feature modules and inject the approved ComfyUI adapter, state, translations, and callbacks.
3. Route global shortcuts and cross-feature events without embedding feature-specific UI or file-operation details.
4. Own compatibility shims that cannot be isolated from ComfyUI/LiteGraph.

It must not become the permanent owner of workflow file operations, node-library normalization, Templates rendering, settings-dialog layout, or row-level DOM generation.

### Staged extraction order

1. **Workflow operations service — high risk.** Extract create, rename, move, trash, restore, list refresh, and local item remapping as one dependency-injected service. Keep official Store activation, dirty-state tracking, and panel scheduling in the entry until a dedicated acceptance suite proves their call order.
2. **Workflow Browse row renderer — complete.** `row-renderer.js` owns row DOM, disclosure, actions, drag-handle presentation, and callback binding. It is invoked only from the existing `renderNode` wrapper, so it cannot abort sidebar registration at entry-module load time. Open/rename/move/drag callbacks remain injected; it must not call filesystem or official Store APIs. Test-package UI acceptance covered sidebar registration, Workflows panel rendering, and folder expand/collapse.
3. **Workflow sort-menu renderer — extracted; final keyboard UI check pending.** `sort-menu-renderer.js` owns the on-demand menu DOM and outside-click/Escape listener lifecycle. `entry.js` retains the wrappers and injects sort state, persistence keys, rerender, refresh, translation, and error handling. Real UI has verified opening and sort selection; the extracted Escape handler was corrected after a focused menu button exposed a guard-order defect. Complete one normal ComfyUI test-page load that verifies Escape closing before marking this extraction complete.
4. **Nodes state and Nodes UI — in progress.** `panel-state.js`, `library-normalizer.js`, and `object-info-state.js` own pure preference/data/state transitions. `library-loader.js` owns the dependency-injected first-load lifecycle while refresh functions remain in the entry. Next separate the remaining cache-refresh scheduler and favorite state, then the node-tree renderer. Do not mix this work with node-cache protocol changes.
5. **Templates UI.** Keep the existing library data module; extract panel/context-menu/rendering ownership independently from Alt+C routing.
6. **Settings and sidebar shell.** Extract settings-dialog rows and background-material controls, then the common shell/shortcut coordinator.

### State and dependency rules

- A module may receive `state` during transition, but new code must document the subset it reads or writes. The next step after a stable extraction is to replace that shared subset with a feature-owned store.
- Renderers receive callbacks; they do not import service endpoints, mutate official workflow objects, or start background scans.
- Official ComfyUI adapters remain narrow and are the only code allowed to directly call official workflow Store APIs.
- One extraction batch moves one coherent owner only. It must not combine a structural move with behavior changes.

### Acceptance gates for every batch

1. Create a source-only archive using `scripts/create-project-backup.ps1` in `30-entry-splits`.
2. Run syntax and isolated module-contract checks.
3. Verify the affected flow in the test package, without using the main package as a development target.
4. Check the browser console for WorkspaceKit errors and record the result in `docs/TESTING.md`.
5. If the same batch cannot be repaired after two or three evidence-backed attempts, restore the immediately preceding archive instead of continuing to patch around an unknown regression.

### Compatibility migrations

Runtime identifiers containing `workspace2` must be inventoried before changes. Migration code should support old and new identifiers, log once, preserve source data, and provide a rollback path.

## Optional Layout integration

`ComfyUI-WorkspaceKit-Layout` is a separate repository. It must first attempt to register with a compatible `window.WorkspaceKit` API. When the API is not ready, it listens for `workspacekit:ready`. When integration is unavailable or incompatible, it uses its standalone host.

WorkspaceKit never imports Layout implementation code. Layout never accesses WorkspaceKit private stores.

## Failure policy

- Invalid persisted layout: restore defaults.
- Duplicate panel id: reject the later registration and log the source.
- Panel render failure: isolate the panel and keep ComfyUI running.
- Unsupported API version: warn and allow the extension to fall back.
- Missing optional extension: no error.
- Migration failure: keep old data and stop the migration rather than partially overwriting it.

## Testing focus

- Panel registration and duplicate protection.
- Listener cleanup.
- State schema validation and migration.
- Either plugin load order.
- Missing optional plugin.
- Corrupt layout state.
- Existing Workspace2 user data.
- ComfyUI startup after a panel throws.
