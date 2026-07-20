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
| Shared UI | `ui/personalization-panel.js`, `ui/tree-expansion.js`, `ui/preview-positioner.js`, `ui/panel-chrome.js` | Shared icon/color personalization dialog DOM/callback delivery, generic expanded-key Set helper, bounded preview placement, and panel header/search DOM; callers retain data, visibility, content, query state, and mutation ownership. |
| Nodes | `nodes/cache-coordinator.js`, `nodes/object-info-cache.js`, `nodes/object-info-refresh.js`, `nodes/favorite-store.js`, `nodes/favorite-group-store.js`, `nodes/official-tree.js`, `nodes/official-tree-renderer.js`, `nodes/row-renderer.js`, `nodes/top-section-renderer.js`, `nodes/category-projection.js`, `nodes/panel-state.js`, `nodes/library-normalizer.js`, `nodes/library-loader.js`, `nodes/object-info-state.js` | Cross-tab refresh coordination, browser snapshot persistence, deferred refresh/upload coordination, local favorite and favorite-group mutations, official category-tree and category-result projection, category-folder, ordinary-row, and top-section rendering, pure local preferences, node-library/server-cache response normalization, initial-library loading, and object-info state transitions. |
| Templates | `templates/library.js`, `templates/search.js`, `templates/results-projection.js`, `templates/root-renderer.js`, `templates/body-state-renderer.js`, `templates/group-contents-renderer.js`, `templates/group-context-menu.js`, `templates/context-menu-renderer.js`, `templates/drag-drop.js`, `templates/group-header-renderer.js`, `templates/row-renderer.js`, `templates/minimap.js` | Template-library loading/persistence plus read-only search/order/results, root result DOM, loading/error notice DOM, expanded-group contents DOM, template group/template context-menu DOM and callback delegation, template/group drag-drop event wiring, group-header and template-row DOM/callback delegation, and saved-template canvas thumbnails. |
| Settings | `settings/controls.js`, `settings/dialog-sections.js`, `settings/dialog-shell.js` | Settings control DOM, content-section composition, and dialog-shell DOM; settings behavior remains injected from the entry. |
| Workflows | `workflows/official-adapter.js` | Narrow ComfyUI official workflow Store adapter. |
| Workflows | `workflows/recents.js`, `workflows/open-state.js`, `workflows/item-store.js`, `workflows/path-state.js`, `workflows/path-utils.js`, `workflows/folder-meta.js`, `workflows/custom-order-store.js` | Open-history persistence, dirty/official-state bridge, locally mutated Browse-item collection, path-dependent Browse UI state, pure workflow-path calculations, folder icon/color metadata persistence, and custom-order persistence. |
| Workflows UI | `workflows/sections.js`, `results-renderer.js`, `context-menu-renderer.js`, `trash-renderer.js`, `tree-builder.js`, `tree-interaction.js`, `search.js`, `row-renderer.js`, `sort-menu-renderer.js`, `rename-input.js`, `open-list-renderer.js` | Presentation-only subtrees, Browse tree expansion/scroll interaction, read-only Browse search, state-to-tree data shaping, deferred Browse/Open row DOM and callback binding, sort-menu lifecycle, and rename-input event ordering; action callbacks remain injected. |

### Required end state for the composition root

`entry.js` should eventually contain only these responsibilities:

1. Register the ComfyUI extension and WorkspaceKit sidebar entry.
2. Construct feature modules and inject the approved ComfyUI adapter, state, translations, and callbacks.
3. Route global shortcuts and cross-feature events without embedding feature-specific UI or file-operation details.
4. Own compatibility shims that cannot be isolated from ComfyUI/LiteGraph.

It must not become the permanent owner of workflow file operations, node-library normalization, Templates rendering, settings-dialog layout, or row-level DOM generation.

### Staged extraction order

1. **Workflow operations service — high risk.** Pure path calculation has been isolated in `path-utils.js`; extract create, rename, move, trash, restore, list refresh, and local item remapping only as one dependency-injected service. Keep official Store activation, dirty-state tracking, and panel scheduling in the entry until a dedicated acceptance suite proves their call order.
2. **Workflow Browse/Open row renderers — complete.** `row-renderer.js` owns Browse row DOM, disclosure, actions, drag-handle presentation, and callback binding. `open-list-renderer.js` owns the Open section's row DOM, dirty marker, and action-button visibility after the entry has calculated official/local/active/dirty state. Both invoke injected callbacks only, so neither can call filesystem or official Store APIs. `rename-input.js` owns rename-input event ordering and focus; its callbacks retain all rename I/O, errors, and state changes in the entry. Test-package UI acceptance covered sidebar registration, Workflows panel rendering, folder expand/collapse, Esc cancellation of a live rename input, and current Open-row rendering.
3. **Workflow sort-menu renderer — extracted; final keyboard UI check pending.** `sort-menu-renderer.js` owns the on-demand menu DOM and outside-click/Escape listener lifecycle. `entry.js` retains the wrappers and injects sort state, persistence keys, rerender, refresh, translation, and error handling. Real UI has verified opening and sort selection; the extracted Escape handler was corrected after a focused menu button exposed a guard-order defect. Complete one normal ComfyUI test-page load that verifies Escape closing before marking this extraction complete.
4. **Nodes state and Nodes UI — in progress.** `panel-state.js`, `library-normalizer.js`, and `object-info-state.js` own pure preference/data/state transitions. `object-info-cache.js` owns browser snapshot persistence; `object-info-refresh.js` owns the deferred refresh, lock recheck, and upload lifecycle; `favorite-store.js` and `favorite-group-store.js` own local favorite and group mutations. `library-loader.js` owns the dependency-injected first-load lifecycle; `official-tree.js` and `category-projection.js` own the corresponding read-only projections; `official-tree-renderer.js`, `row-renderer.js`, and `top-section-renderer.js` own rendering layers. Keep preview/context-menu/drag behavior and section-state policy in the entry until each has its own evidence-backed boundary; do not mix this work with node-cache protocol changes.
5. **Templates UI — in progress.** `library.js` owns template-library loading and persistence; `search.js` owns read-only field matching and ordering; `results-projection.js` owns root/nested template search results; `root-renderer.js` owns root-result DOM; `body-state-renderer.js` owns loading/error notices; `group-contents-renderer.js` owns only expanded nested-group contents DOM; `group-context-menu.js` and `context-menu-renderer.js` own group/template menu DOM and delegate every mutation back to the entry; `drag-drop.js` owns template/group transfer parsing and DOM event wiring while the entry retains all moves and saves; `group-header-renderer.js` owns group-header DOM and inline-rename controls; `row-renderer.js` owns template-row DOM and event-to-callback delivery; `minimap.js` owns saved-template canvas thumbnail projection/drawing. Keep Alt+C routing, mutations, preview-popover lifecycle, expanded/editing state, and persistence in the entry; do not expand the next renderer boundary without a nested-group browser fixture.
6. **Settings and sidebar shell — in progress.** `settings/controls.js` owns settings-dialog control DOM, `dialog-sections.js` composes the five content sections through injected values/actions, and `dialog-shell.js` creates the backdrop/header DOM plus a close-intent callback. Keep localStorage reads/writes, node-cache implementation, background-material and glass-overlay behavior, dialog attach/remove lifecycle, version request, and global keyboard handlers in the entry until separately evidenced; those paths have previously affected sidebar placement.
7. **Shared preview placement — extracted.** `ui/preview-positioner.js` owns only geometry for cursor-following and sidebar-anchored preview placement. Nodes/Templates still own popover creation, state, content, show/hide decisions, and event timing. Keep the real hover regression separate: the in-app browser cannot currently produce a faithful native pointer-enter event.
8. **Shared panel chrome — extracted.** `ui/panel-chrome.js` owns only title/status and search/clear DOM, including IME composition handling. Workflows/Nodes/Templates/Groups retain query state, input callbacks, toolbar actions, and panel lifecycle. A shared contract and real rendering checks across the three main panels protect this common surface.

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
