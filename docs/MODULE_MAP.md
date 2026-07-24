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
| `core/startup-stage.js` | Isolated optional-startup stage runner and concise failure recording | Sidebar registration, feature behavior, UI rendering, or error presentation | Sidebar-startup resilience contract and test-package served-source check passed |

## Public integration modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `integrations/panel-api.js` | Versioned browser Provider registry, validation, ID de-duplication, availability gate, lifecycle notification, and safe global publication of `WorkspaceKitPanelAPI` | Sidebar rendering, provider DOM, Layout command behavior, persistence, network, or provider-specific settings | API availability/registration contract passed; host integration acceptance remains separate |

## Shared UI modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `ui/personalization-panel.js` | Shared icon/color personalization dialog DOM, viewport clamping, choice selection, Escape/outside dismissal, and apply/reset callback delivery | Workflow/template/node-group data, endpoint calls, persistence, rendering decisions, or official Store access | Dialog contract, test-package resource/sidebar-load check, and real safe Esc-close interaction passed |
| `ui/tree-expansion.js` | Shared recursive add/remove of caller-supplied expanded-key Sets | Tree shape, persistence, rendering, panel state, network, files, or official Store access | Expansion contract, test-package resource check, and WorkspaceKit panel-load check passed |
| `ui/decorated-icon.js` | Shared Prime-icon/emoji class, text, and color-variable presentation | Icon choice, feature data, persistence, rendering policy, network, files, or official Store access | Icon contract passed; user-tested panel regression passed |
| `ui/panel-background-state.js` | Persisted transparent/frosted background value normalization and blur/opacity snapping | DOM placement, overlay lifecycle, settings rendering, or panel behavior | Background-state contract and test-package resource check passed |
| `ui/workspace-panel-host.js` | Sidebar shell, built-in/pinned tab strip, settings control, provider overflow menu, and stable host slots | Workflow/Node/Template business logic, Provider registration, or Provider command behavior | Host contract and test-package source-resource check passed; broader Provider matrix remains pending |
| `ui/provider-tabs.js`, `ui/provider-label.js` | Provider tab planning, pinning policy, and localized Provider label resolution | Provider registration, rendering, persistence writes, or extension behavior | Provider/API contracts passed; real multi-provider matrix remains pending |
| `ui/module-shortcuts.js` | Fixed Shift+1/2/3/4 shortcut matching and enabled-preference policy | Custom key assignment, browser/ComfyUI conflict policy, sidebar activation, or keyboard listener registration | Module-shortcut contract passed; real keyboard matrix remains pending |

## Canvas-group modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `canvas-groups/pointer-actions.js` | Semantic Ctrl/Meta Ignore, Alt Disable, and Shift selection gesture resolution | DOM listeners, group mutation, persistence, canvas state, or workflow serialization | Pointer-action contract and test-package modifier-click acceptance passed |
| `canvas-groups/multi-drag-plan.js` | Pure de-duplicated group/node movement plan for multi-selected overlay groups; persisted `group.nodeIds` are authoritative and bounds are legacy fallback only | DOM listeners, graph mutation, persistence, group selection state, or workflow serialization | Membership, de-duplication, coordinate-container compatibility, and legacy-fallback contract passed; real test-package two-group drag acceptance passed |
| `canvas-groups/selection-cancel-events.js` | Pure eligibility rules for clearing transient group selection from canvas blank-space pointer input and Escape | DOM listener registration, group mutation, persistence, canvas state, or workflow serialization | Pointer and editable-focus contract passed; real-page acceptance pending a test frontend that reaches canvas initialization |
| `canvas-groups/delete-key-events.js` | Pure eligibility rules for handling unmodified Delete only when WorkspaceKit group selection exists and native node deletion does not | DOM listeners, group mutation, persistence, native node selection, or workflow serialization | Delete-key policy contract and real test-package single/multi/native-delete acceptance passed |
| `canvas-groups/marquee-selection.js` | Canvas marquee rectangle normalization and read-only overlay-group intersection selection | Native ComfyUI marquee handling, DOM listeners, group mutation, persistence, or workflow serialization | Marquee contract and test-package acceptance passed; native-compatibility regression remains pending |

## Nodes modules

| Module | Owns | Injected dependencies / state | Must not own | Validation status |
| --- | --- | --- | --- | --- |
| `nodes/cache-coordinator.js` | Cross-tab refresh lock | Browser coordination primitives | Node data shaping or UI | Existing node-cache acceptance |
| `nodes/object-info-cache.js` | Browser IndexedDB object-info snapshot read/write/delete | Cache keys, browser IndexedDB, clock, clear callback | Fetch, refresh scheduling, rendering, Nodes state transitions | Storage contract and test-package Nodes panel-open check passed; cache clear/reload sequence pending |
| `nodes/object-info-refresh.js` | Deferred object-info refresh, cross-tab recheck, and optional server snapshot upload | Nodes state, cache/state helpers, timer, lock, HTTP and browser primitives | Initial library load, Nodes DOM construction, cache schema normalization | Refresh contract and test-package Nodes panel-open check passed; deferred refresh/cache-hit UI sequence pending |
| `nodes/favorite-store.js` | Local favorite lookup, add/remove, alias, ordering, and cross-group moves | Nodes library state, default group id, clock | DOM, drag listeners, dialogs, persistence, official-favorites synchronization | Data contract and test-package resource check passed; fresh-page favorite UI check pending |
| `nodes/favorite-group-store.js` | Favorite-group lookup, naming, hierarchy validation, create/delete/move mutations | Nodes library state, default group id, clock | DOM, dialogs, drag listeners, persistence, expanded/editor state | Data contract and test-package resource check passed; fresh-page group UI check pending |
| `nodes/official-tree.js` | Read-only official-node category tree projection, leaf counts, and deterministic ordering | Category-path/classification callback, translated labels, sort rank, Nodes order preference callbacks | Category classification, DOM/event handling, persistence, network, cache, official Store access | Tree contract and test-package resource check passed; fresh-page tree UI check pending |
| `nodes/official-tree-renderer.js` | Official category-folder header DOM and recursive tree placement | Document, tree data, query/expanded state readers, node-row/toggle/icon/translation callbacks | Node-row DOM/actions, expand-state mutation, global listeners, persistence, network, cache, official Store access | Renderer contract and test-package resource check passed; fresh-page tree UI check pending |
| `nodes/row-renderer.js` | Ordinary official-node row DOM and local event wiring | Document, state readers, drag/preview/menu/pending/order/favorite/translation/button callbacks | Canvas drag implementation, preview/menu behavior, state mutation, favorite persistence, global listeners, network, cache, official Store access | Row contract and test-package resource check passed; fresh-page row UI check pending |
| `nodes/top-section-renderer.js` | Comfy/Extensions/Unknown top-section shell and flat-search versus category-tree presentation | Document, query reader, header/row/tree callbacks, translation | Search filtering, section state mutation, node interactions, global listeners, persistence, network, cache, official Store access | Section contract and test-package resource check passed; fresh-page section UI check pending |
| `nodes/category-projection.js` | Read-only query/result filtering, hidden-node exclusion, source buckets, favorite lookup, visible totals, and visible-section fallback | Query/sort/classification/default-section callbacks, search limit | DOM, state mutation, persistence, node interactions, global listeners, network, cache, official Store access | Projection contract and test-package resource check passed; fresh-page category UI check pending |
| `nodes/panel-state.js` | Visible-section and custom-order local preferences | Storage keys, section filters, storage | Network, DOM, official Store | Storage contract passed; browser panel check pending |
| `nodes/library-normalizer.js` | Empty library defaults, group/favorite repair, server-cache payload shaping | Default group id, translation, clock | Fetch, IndexedDB, timers, rendering | Data contract passed; browser panel check pending |
| `nodes/library-loader.js` | Initial parallel library/cache/signature load and cache-choice decision | State, request helpers, cache helpers, render/refresh callbacks | `/object_info` implementation, lock, scheduler, renderer implementation | Lifecycle contract passed; test-package resource/UI recheck pending |
| `nodes/object-info-state.js` | Applying cached/fresh object-info and invalidating derived definitions | Nodes state, clock | Fetch, IndexedDB, scheduling, rendering | State contract passed; test-package resource/UI recheck pending |

## Templates modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `templates/library.js` | Template library data, persistence, query data | Alt+C routing and panel-specific DOM | Template-library contract and panel regression checks |
| `templates/search.js` | Template search fields, matching, visible-result projection, and manual/name/update ordering | Generic text-score helpers and selected-sort reader | Alt+C routing, template mutations, persistence, drag/drop, DOM, panel lifecycle | Search contract and test-package resource check passed; fresh-page Templates search UI check pending |
| `templates/results-projection.js` | Root/nested template and group search-result projection, including recursive group matching | Child-group, search-match, and sort callbacks | DOM, state mutation, persistence, Alt+C routing, rename, drag/drop, panel lifecycle | Projection contract and test-package resource check passed; fresh-page Templates results UI check pending |
| `templates/root-renderer.js` | Root-level Templates empty state, list container, root template rows, and root group placement | Document, translation, drop-target, row, and group-render callbacks | Data loading, state mutation, Alt+C, persistence, rename, drag/drop implementation, panel lifecycle | Renderer contract and test-package resource check passed; fresh-page Templates root UI check pending |
| `templates/body-state-renderer.js` | Templates loading/error body notice DOM | Document and translation | Fetching, state changes, rerender scheduling, Alt+C routing, all other panel DOM | State-renderer contract and test-package resource check passed; fresh-page Templates state UI check pending |
| `templates/group-contents-renderer.js` | Expanded nested-group child-folder placement and template-list DOM | Document, group/row/drop callbacks and projected contents | Group-header DOM, editing, menus, drag source, expand-state policy, data projection, persistence, Alt+C lifecycle | Contents contract and test-package Templates regression check passed; real nested group interaction pending fixture |
| `templates/group-context-menu.js` | Template-group context-menu DOM, positioning, close lifecycle, and callback delegation | Template/group mutations, persistence, drag/drop, Alt+C lifecycle, or panel data ownership | Menu contract and user-tested real menu regression passed |
| `templates/drag-drop.js` | Template/group drag transfer parsing, group-source wiring, legal drop-target feedback, and callback delegation | Template/group moves, saving, error state, render, library ownership, or canvas placement | Drag/drop contract passed; real nested-group browser interaction pending fixture |
| `templates/group-header-renderer.js` | Template-group header DOM, inline rename input, icons/actions, and callback delegation | Template library, expanded/editing/error state, mutations, persistence, rendering orchestration, or drag/drop implementation | Header contract and real test-package group-expand check passed |
| `templates/row-renderer.js` | Template-row DOM, rename input, action control, and event-to-callback delivery | Template state, preview, canvas placement, persistence, error state, drag/drop target implementation, or panel lifecycle | Row contract and real test-package row-select check passed |
| `templates/context-menu-renderer.js` | Template context-menu DOM, replacement cleanup, close-listener lifecycle, and action callback delegation | Template state, rename/delete persistence, clipboard, canvas placement, error state, or panel rendering | Menu contract and real test-package right-click/Esc check passed |
| `templates/minimap.js` | Saved-template minimap node projection, bounds, fill-color selection, and canvas thumbnail drawing | Live graph access, template-library mutations, preview-popover lifecycle, node-definition lookup, drag/drop, or persistence | Minimap contract passed; test-package hover-preview check pending |

## Shared UI modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `ui/preview-positioner.js` | Shared preview cursor/panel placement, viewport bounds, and sidebar-side calculation | Preview content, preview visibility/state, caller lifecycle, node/template data, or panel rendering | Position contract and test-package Templates render regression passed; real hover event remains browser-input pending |
| `ui/panel-chrome.js` | Shared panel header and search-toolbar DOM, clear action, IME composition handling, and input callback delivery | Query state, search result updates, toolbar business actions, panel lifecycle, or persistence | Chrome contract and real test-package Workflows/Nodes/Templates render checks passed |

## Settings modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `settings/controls.js` | Settings dialog control DOM: sections, help, checkbox, shortcut grid, ranges, background-mode rows, and disabled-state update | Persistence, glass/opacity behavior, dialog lifecycle, global keyboard handling, network, or sidebar placement | Control contract and test-package Settings dialog acceptance passed |
| `settings/dialog-sections.js` | Settings content sections: shortcuts, behavior, background mode, integration gate, cache, data transfer, and about/version placeholders; composes semantic action rows through injected action/confirmation helpers | LocalStorage, node-cache implementation, glass behavior, version request, dialog lifecycle, global keyboard handling, or sidebar placement | Section and action-wiring contracts passed; Advanced-page operation-row user acceptance passed |
| `settings/dialog-shell.js` | Settings backdrop, dialog shell, title/header DOM, and close-intent callback | Attaching/removing the dialog, Escape, version request, persistence, glass behavior, global listeners, page-navigation policy, or sidebar placement | Shell contract and test-package Settings dialog acceptance passed |

## Workflows modules

| Module | Owns | Must not own | Validation |
| --- | --- | --- | --- |
| `workflows/official-adapter.js` | Narrow official workflow Store compatibility access | Browse rendering or file operations | Official-state acceptance |
| `workflows/recents.js` | Open-history persistence | Official Store and filesystem access | Recents contract |
| `workflows/open-state.js` | Dirty/open state bridge | Browse file mutations | Dirty-state regression checks |
| `workflows/item-store.js` | Local Browse item collection and revision | Official Store activation | Item remap/revision contract |
| `workflows/path-state.js` | Browse path-dependent selection, expansion, and ordering | File requests | Path remap/remove contract |
| `workflows/path-utils.js` | Pure workflow-path normalization, parent/prefix relations, rename targets, and official-root conversion | Filesystem operations, state, endpoint helpers, and official Store access | Path-utils contract, test-package resource check, and non-mutating Workflows-panel open check passed |
| `workflows/folder-meta.js` | Folder icon/color metadata lookup, empty-field cleanup, endpoint save, local metadata replacement, and post-save render intent | Personalization-dialog DOM, workflow file mutations, official Store, polling, or sidebar ownership | Folder-meta contract, test-package resource check, and non-mutating Workflows-panel check passed |
| `workflows/custom-order-store.js` | Browse custom-order JSON read/save and malformed-value fallback | Path remapping, reorder decisions, rendering, file requests, or official Store access | Custom-order contract, test-package resource check, and non-mutating Workflows panel check passed |
| `workflows/tree-interaction.js` | Browse tree scroll snapshot/restore, folder descendant keys, and folder expand/collapse state | Shared expansion policy, filesystem operations, sorting, polling, persistence, and official Store access | Tree-interaction contract, test-package resource check, and real folder expand/collapse check passed |
| `workflows/sections.js` | Open/Browse section shell and collapse state | Workflow operations | DOM/storage contract and panel check |
| `workflows/tree-builder.js` | Browse items to tree projection | DOM and file operations | Tree order contract |
| `workflows/search.js` | Read-only Browse search projection | Filesystem and Store APIs | Recursive search contract |
| `workflows/results-renderer.js` | Mounted Browse tree refresh lifecycle | Workflow operations | Results refresh contract |
| `workflows/context-menu-renderer.js` | Browse context-menu presentation | File mutations; callbacks carry intent | Menu delegation contract |
| `workflows/trash-renderer.js` | Trash-list presentation | Restore/delete operations; callbacks carry intent | Trash rendering contract |
| `workflows/row-renderer.js` | Browse row DOM and callback binding | Filesystem and Store APIs | Test-package sidebar/tree acceptance |
| `workflows/sort-menu-renderer.js` | On-demand sort-menu DOM and close lifecycle | Persistence, refresh, translation, errors | Interaction contract passed; final browser Escape check pending |
| `workflows/rename-input.js` | Workflow rename-input DOM, Enter/blur single-flight coordination, Escape cancel, and focus delivery | Rename I/O, workflow state, error rendering, panel refresh, or official Store APIs | Rename-input contract and real test-package Esc-cancel check passed |
| `workflows/open-list-renderer.js` | Open-workflow section/list/row DOM, dirty marker, action-button visibility, and callback binding | Official/local workflow discovery, dirty-state calculation, open/save/close/rename/remove operations, persistence, or Store APIs | Open-list contract and real test-package current-row rendering check passed |

## Required update checklist

For every added, removed, merged, or materially repurposed module:

1. Update this table with owner, injected dependencies, forbidden responsibilities, and validation state.
2. Update `docs/ARCHITECTURE.md` when a boundary or extraction order changes.
3. Add reproducible evidence or an explicit pending item to `docs/TESTING.md`.
4. Update `CONTRIBUTING.md` and the PR template if the maintenance rule itself changes.
5. Update both READMEs only when contributor-facing navigation or user-visible behavior changes.
