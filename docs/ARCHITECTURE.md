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
