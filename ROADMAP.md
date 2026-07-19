# Roadmap

This roadmap is for public GitHub readers. It tracks broad product direction, not private development notes.

## Completed

- Fixed Canvas Groups changing a zero-argument `loadGraphData()` call and triggering an `extra` read failure while restoring the previous workflow in multi-extension setups.
- Unified WorkspaceKit sidebar entry with Workflows, Nodes, and Templates tabs.
- Workflows2 workflow-folder management, drag-and-drop organization, sorting, recent workflow history, plugin trash, and system trash handoff.
- Nodes2 node browsing, search, favorites, favorite groups, official favorite import/export, and large-library cache support.
- Templates for saving selected connected nodes as reusable node templates.
- Template groups, subgroups, search, sorting, drag-and-drop organization, preview, and inline delete confirmation.
- Templates first-open path: idle prefetch, per-session request sharing, phase timing, and deferral of stale node-definition refresh while Templates is active.
- Canvas Groups enhancements, including WorkspaceKit group shortcuts and title-bar style settings.
- Canvas Group header actions: queue this group's output nodes, bypass, and disable, with per-node execution-mode snapshot and restore.
- Title2 visual title / annotation node.
- WorkspaceKit settings panel first version.
- English/Chinese localization infrastructure and the Group Settings / Transparent Title dialog localization pass.
- Persistent server-side `/object_info` snapshot cache: signature validation, compressed chunk upload, atomic disk writes, and browser IndexedDB reuse.
- English and Chinese README documentation, issue templates, pull-request template, contribution guidance, and security policy.

## In Progress

- README screenshots and GIF tutorials.
- Workflows2 open-history synchronization stability with the official ComfyUI workflow manager.
- Unsaved-state indicators, save actions, and close behavior for current/open workflow rows.
- Official workflow-list refresh stability after Workflows2 rename, delete, and trash-empty actions.
- Large node-library validation for setups with many custom nodes.
- Node preview polish for complex nodes.
- Template preview polish.
- Final visual acceptance for section headers across dark, light, transparent, and frosted-glass backgrounds.
- Safer template deletion with undo or a template trash mechanism.
- Data backup and restore entry for WorkspaceKit settings, Nodes2 favorites, Templates, and folder metadata.
- Comfy Registry / ComfyUI Manager metadata and public release packaging.

## Stabilization Batches

These batches are ordered from large-install and main-package feedback. Each batch is verified independently before the next one starts so regressions remain attributable.

1. **Stop redundant workflow synchronization (in progress)**
   - Reuse the official ComfyUI workflow Store for normal opens and synchronize only when the target is missing.
   - Avoid a second official-list synchronization while opening a newly created workflow.
   - Acceptance: normal opens do not call `syncWorkflows()`; creation calls it at most once.
2. **Performance baseline and coordinated node caching (in progress)**
   - Record separate timings for startup, workflow scans, node cache, `/object_info`, template requests, and rendering.
   - Use a shared server cache plus an IndexedDB snapshot, with one background update job shared across refreshes and browser tabs.
   - Do not build the full node index before Nodes2 is opened; validate plugin changes in low-priority batches.
   - Acceptance: cached Nodes2 first paint targets under 500ms; multiple tabs never duplicate an index build.
   - Current: frontend phase timing, a lightweight node signature, browser IndexedDB reuse, cross-tab single-job coordination, and the signature-guarded server snapshot cache are implemented. On 2026-07-16, stale snapshots were correctly rejected as the live installation changed from 198 plugins / 6,135 nodes to 200 plugins / 6,323 nodes; Nodes2 rebuilt and atomically stored matching snapshots. A valid snapshot is now returned with negotiated gzip (11.89 MB transferred for the 6,323-node snapshot, instead of about 50.35 MB uncompressed). Parallel-tab timing remains release validation, not an implementation blocker.
3. **Templates delay retest and isolation**
   - Separate endpoint, JSON parsing, preview, and browser main-thread timing.
   - Node background updates must not block the Templates first paint; large previews are generated on demand.
   - Current: verified in the test package with two templates: idle prefetch request 128.1ms, normalization 0.2ms, first render 2.6ms. The template page performed no `/object_info` refresh while it remained active. User acceptance passed; a main-package retest remains a release gate.
4. **Incremental Workflows2 updates**
   - Update local state first for create, rename, move, delete, and restore, then coalesce background refreshes.
   - Remove repeated full-directory scans and blocking official synchronization after operations.
   - Add regression coverage for rename, move, delete, restore, save, and official-list synchronization.
   - Current: the P0 regression checklist is documented in `docs/TESTING.md` and awaits a complete run. Official-list refreshes are coalesced; folder/workflow creation, rename, move, move-to-trash, restore, and trash cleanup use local incremental updates. Root switching keeps one necessary full load because the entire data source changes.
5. **Panel information architecture and glass effect**
   - Rename “Recent workflows” to “Open”, add a “Browse” section, and persist collapse state for both.
   - Separate sections with hierarchy, whitespace, and heading extension lines rather than opaque color blocks or repeated dividers.
   - Fix glass-background layering and opacity/blur control interaction.
   - Current: Open/Browse collapse state is implemented and node top-level sections also collapse through a shared section-header structure. Workflow sections now share one content container, so the top-container border no longer sits between Open and Browse; Node sections remain unchanged. Background settings use mutually exclusive Transparent/Frosted Glass modes with fixed blur, a frosted material layer, and 5–95 transparency control. Test-package acceptance passed; retain one main-package visual regression pass before release.
6. **Engineering and release readiness**
   - Continue splitting `entry.js` into workflows, nodes, templates, and settings modules.
   - Add minimal CI for Python, JavaScript, JSON, and service-level tests.
   - Add data export/import, schema versioning, and automatic pre-import backup.
   - Complete screenshots and Registry / Manager metadata.
- Current: API, constants, performance logging, node-cache coordination, the Nodes panel-state preferences, library normalizer, initial-library loader, and object-info state helpers, the Templates data library, the official workflow adapter, the Workflows recent-history, open-state, item, and path-state stores, plus the Open/Browse section shell, tree builder, read-only Browse search, Browse-results refresh lifecycle, Browse context-menu renderer, trash-list renderer, Browse row renderer, and sort-menu renderer have been extracted. Issue/PR templates, contribution guidance, and security policy are complete. The sort-menu renderer has passed its menu/open-action UI check; one normal test-package Escape-key acceptance remains. The next extraction order is remaining Nodes cache lifecycle, Nodes UI, Templates UI, then Settings; preserve regression checks between each batch.

Test evidence, performance measurements, and errors without a confirmed root cause are recorded in `docs/TESTING.md`.

## Planned

- Custom workflow root UI risk warning.
- Gradual frontend module split to reduce `entry.js` maintenance risk.
- More complete backup export/import flow with schema versioning and automatic pre-import backup.
- Better public release packaging and version tag workflow.

## Not Planned

- Model downloader.
- Cloud sync.
- Image gallery.
- Built-in terminal.
- Replacing the official ComfyUI UI.
