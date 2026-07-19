# WorkspaceKit Module Map

This is the maintainer-facing index for modules extracted from `entry/entry.js`.
It complements [Architecture](ARCHITECTURE.md), which explains layer design,
and [Testing](TESTING.md), which records execution evidence. Update this map in
the same pull request as any module ownership change.

## Maintenance rules

- `entry.js` is the composition root: extension registration, sidebar lifecycle,
  global shortcuts, and narrow compatibility bridges remain there.
- A module must have one clear owner. It may receive state and callbacks during
  migration, but must document what it reads or writes.
- Do not add module-load listeners, scans, network calls, or official ComfyUI
  Store access unless that ownership is explicit in this map.
- Renderers receive callbacks; they do not perform filesystem changes or call
  official workflow APIs directly.
- Create a `30-entry-splits` backup and record syntax, contract, and test-package
  evidence before accepting a split.
- Merge modules only when they share one owner, change together repeatedly, and
  have the same dependency and test boundary. File count alone is not a reason.

## Core modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `core/api.js` | WorkspaceKit HTTP helpers | UI lifecycle | Endpoint callers and Python routes |
| `core/i18n.js` | Locale configuration and translation lookup | Panel rendering | Locale asset and fallback checks |
| `core/performance.js` | Performance spans and measurements | Business behavior | Instrumentation smoke checks |

## Nodes modules

| Module | Owns | Injected dependencies / state | Must not own | Validation status |
| --- | --- | --- | --- | --- |
| `nodes/cache-coordinator.js` | Cross-tab refresh lock | Browser coordination primitives | Node data shaping or UI | Existing node-cache acceptance |
| `nodes/panel-state.js` | Visible-section and custom-order local preferences | Storage keys, section filters, storage | Network, DOM, official Store | Storage contract passed; browser panel check pending |
| `nodes/library-normalizer.js` | Empty library defaults, group/favorite repair, server-cache payload shaping | Default group id, translation, clock | Fetch, IndexedDB, timers, rendering | Data contract passed; browser panel check pending |
| `nodes/library-loader.js` | Initial parallel library/cache/signature load and cache-choice decision | State, request helpers, cache helpers, render/refresh callbacks | `/object_info` implementation, lock, scheduler, renderer implementation | Lifecycle contract passed; test-package resource/UI recheck pending |
| `nodes/object-info-state.js` | Applying cached/fresh object-info and invalidating derived definitions | Nodes state, clock | Fetch, IndexedDB, scheduling, rendering | State contract passed; test-package resource/UI recheck pending |

## Templates modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `templates/library.js` | Template library data, persistence, query data | Alt+C routing and panel-specific DOM | Template-library contract and panel regression checks |

## Workflows modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `workflows/official-adapter.js` | Narrow official workflow Store compatibility access | Browse rendering or file operations | Official-state acceptance |
| `workflows/recents.js` | Open-history persistence | Official Store and filesystem access | Recents contract |
| `workflows/open-state.js` | Dirty/open state bridge | Browse file mutations | Dirty-state regression checks |
| `workflows/item-store.js` | Local Browse item collection and revision | Official Store activation | Item remap/revision contract |
| `workflows/path-state.js` | Browse path-dependent selection, expansion, and ordering | File requests | Path remap/remove contract |
| `workflows/sections.js` | Open/Browse section shell and collapse state | Workflow operations | DOM/storage contract and panel check |
| `workflows/tree-builder.js` | Browse items to tree projection | DOM and file operations | Tree order contract |
| `workflows/search.js` | Read-only Browse search projection | Filesystem and Store APIs | Recursive search contract |
| `workflows/results-renderer.js` | Mounted Browse tree refresh lifecycle | Workflow operations | Results refresh contract |
| `workflows/context-menu-renderer.js` | Browse context-menu presentation | File mutations; callbacks carry intent | Menu delegation contract |
| `workflows/trash-renderer.js` | Trash-list presentation | Restore/delete operations; callbacks carry intent | Trash rendering contract |
| `workflows/row-renderer.js` | Browse row DOM and callback binding | Filesystem and Store APIs | Test-package sidebar/tree acceptance |
| `workflows/sort-menu-renderer.js` | On-demand sort-menu DOM and close lifecycle | Persistence, refresh, translation, errors | Interaction contract passed; final browser Escape check pending |

## Required update checklist

For every added, removed, merged, or materially repurposed module:

1. Update this table with owner, injected dependencies, forbidden responsibilities, and validation state.
2. Update `docs/ARCHITECTURE.md` when a boundary or extraction order changes.
3. Add reproducible evidence or an explicit pending item to `docs/TESTING.md`.
4. Update `CONTRIBUTING.md` and the PR template if the maintenance rule itself changes.
5. Update both READMEs only when contributor-facing navigation or user-visible behavior changes.
