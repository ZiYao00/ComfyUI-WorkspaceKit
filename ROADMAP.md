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
- Title2 visual title / annotation node.
- WorkspaceKit settings panel first version.
- English and Chinese README documentation.

## In Progress

- README screenshots and GIF tutorials.
- Workflows2 open-history synchronization stability with the official ComfyUI workflow manager.
- Unsaved-state indicators, save actions, and close behavior for current/open workflow rows.
- Official workflow-list refresh stability after Workflows2 rename, delete, and trash-empty actions.
- Live preview and persistence for the WorkspaceKit panel opacity setting.
- Large node-library validation for setups with many custom nodes.
- Node preview polish for complex nodes.
- Template preview polish.
- Final visual acceptance for section headers across dark, light, transparent, and frosted-glass backgrounds.
- Safer template deletion with undo or a template trash mechanism.
- Data backup and restore entry for WorkspaceKit settings, Nodes2 favorites, Templates, and folder metadata.
- Comfy Registry / ComfyUI Manager metadata.

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
   - Current: frontend phase timing, a lightweight node signature, and single-job coordination across browser tabs are available; the shared server-side node-data cache has not started.
3. **Templates delay retest and isolation**
   - Separate endpoint, JSON parsing, preview, and browser main-thread timing.
   - Node background updates must not block the Templates first paint; large previews are generated on demand.
   - Current: verified in the test package with two templates: idle prefetch request 128.1ms, normalization 0.2ms, first render 2.6ms. The template page performed no `/object_info` refresh while it remained active. Retest on the main package remains a release gate.
4. **Incremental Workflows2 updates**
   - Update local state first for create, rename, move, delete, and restore, then coalesce background refreshes.
   - Remove repeated full-directory scans and blocking official synchronization after operations.
   - Add regression coverage for rename, move, delete, restore, save, and official-list synchronization.
   - Current: the P0 regression checklist is documented in `docs/TESTING.md` and awaits a complete run. Official-list refreshes are coalesced; folder/workflow creation, rename, move, move-to-trash, restore, and trash cleanup use local incremental updates. Root switching keeps one necessary full load because the entire data source changes.
5. **Panel information architecture and glass effect**
   - Rename “Recent workflows” to “Open”, add a “Browse” section, and persist collapse state for both.
   - Separate sections with hierarchy, whitespace, and heading extension lines rather than opaque color blocks or repeated dividers.
   - Fix glass-background layering and opacity/blur control interaction.
   - Current: Open/Browse collapse state is implemented and node top-level sections also collapse through a shared section-header structure. Workflow sections now share one content container, so the top-container border no longer sits between Open and Browse; Node sections remain unchanged. Background settings use mutually exclusive Transparent/Frosted Glass modes with fixed blur, a frosted material layer, and 5–95 transparency control. Final visual acceptance of heading icons, theme color, and whitespace remains pending.
6. **Engineering and release readiness**
   - Continue splitting `entry.js` into workflows, nodes, templates, and settings modules.
   - Add minimal CI for Python, JavaScript, JSON, and service-level tests.
   - Add data export/import, schema versioning, and automatic pre-import backup.
   - Complete screenshots, Registry / Manager metadata, issue templates, and contribution guidance.
   - Current: API, constants, performance logging, and node-cache coordination have been extracted; full workflows, nodes, templates, and settings module splits have not started.

Test evidence, performance measurements, and errors without a confirmed root cause are recorded in `docs/TESTING.md`.

## Planned

- Custom workflow root UI risk warning.
- GitHub issue templates and contribution guidance.
- Gradual frontend module split to reduce `entry.js` maintenance risk.
- More complete backup export/import flow with schema versioning and automatic pre-import backup.
- Better public release packaging and version tag workflow.

## Not Planned

- Model downloader.
- Cloud sync.
- Image gallery.
- Built-in terminal.
- Replacing the official ComfyUI UI.
