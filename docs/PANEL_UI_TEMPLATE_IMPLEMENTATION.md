# Panel UI Template v1 — Implementation Tracker

Status: **active implementation program**  
Architecture reference: [Panel UI Template v1](PANEL_UI_TEMPLATE.md)
Panel-structure migration: [Panel Blueprint v1](PANEL_BLUEPRINT.md)

This document is the execution record for the Panel UI Template program. It is
not a release note: each batch must record its actual evidence before the next
behavior-changing batch begins.

## Program rules

1. Keep Provider behavior, graph/Undo semantics, and WorkspaceKit sidebar
   registration out of UI-core batches.
2. One batch has one ownership boundary and one explicit rollback point.
3. Do not combine UI Template migration with workflow, node-cache, template,
   glass Portal, or sidebar-recovery changes.
4. Before every behavior-changing batch, create complete snapshots of both
   WorkspaceKit and Layout repositories.
5. A static pass is not UI acceptance. Each changed runtime path needs both
   contract evidence and test-package evidence before the next migration.
6. Layout's Vendor UI directory is generated output. Never hand-edit it.

## Baseline snapshots

Created before program start; each archive excludes only its repository's
pre-existing `.codex-backups` directory and includes tracked and untracked
working files.

| Repository | Snapshot | SHA-256 |
| --- | --- | --- |
| WorkspaceKit | `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-panel-ui-template-20260724-153417.zip` | `7528B19F5515B4034FF41EE2BD988C2696426954FB914DE324DD0C2F19F95F2F` |
| Layout | `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-Layout-before-panel-ui-template-20260724-153417.zip` | `B5EBD2F855E7E98EB9B601332E91399A294FB529BC8A36C15DB26749AAC0388C` |

## Batch register

| Batch | Boundary | Code status | Evidence status | Rollback trigger |
| --- | --- | --- | --- | --- |
| 0 | Baseline, tracker, source map | Complete | Snapshots, full current contract suites, syntax, and served-resource checks passed | Any baseline contract failure |
| 1 | WorkspaceKit UI Kit source and deterministic export only | Complete | Primitive/export contracts, repeated-export hash check, and served-resource checks passed | Non-repeatable export or Vendor hash mismatch |
| 2 | Optional host UI capability and minimal example Provider | Code complete | Static API, Provider regression, and served-resource checks passed; real mounted Provider acceptance remains pending | Existing Provider/API v1 regression or sidebar entry failure |
| 3 | Layout merged-mode migration | Code complete | UI primitive, provider, and localization contracts passed. v1.1.0 removes the Layout-specific visual fallback; real theme/lifecycle acceptance remains pending | Command, toolbar, lifecycle, or visual regression |
| 4 | Layout standalone-mode Vendor migration | Code complete | Generated Vendor fallback and compatible-host preference contracts passed. v1.1.0 uses the same product-theme bridge; real standalone lifecycle acceptance remains pending | Standalone entry, offline, or fallback regression |
| 4.2 | Product component convergence | Code complete | v1.2.0 product-header/control contracts and hosted real-page screenshot passed; standalone and alternate-theme visual matrix remains pending | Built-in header regression, Layout visual drift, or Vendor mismatch |
| 4.3 | Capability compatibility contract | Code complete | v1.3.0 contract, Vendor export, v2-adapter/fallback, and false-capability tests passed | An incompatible host renders instead of falling back, or Vendor export diverges |
| 5 | Documentation, third-party example, release matrix | Pending | Not started | Incomplete compatibility or lifecycle evidence |
| S1 | Panel surface controller extraction | Deferred, separate program | Not started | Glass/transparent layout, Portal, or other-sidebar regression |
| S2 | Sidebar entry recovery extraction | Deferred, separate program | Not started | Duplicate/missing sidebar entry or official remount regression |

## Batch 0 — baseline and source map

### Scope

- Record repository snapshots and current UI ownership.
- Run existing WorkspaceKit and Layout static/contract suites without changing
  any runtime behavior.
- Document the exact UI-source map used to define Batch 1.

### Confirmed source map

| Area | Current owner | Batch 1 disposition |
| --- | --- | --- |
| WorkspaceKit sidebar shell/tab host | `entry/ui/workspace-panel-host.js` | Keep as host owner; consume UI Kit later. |
| WorkspaceKit header/search DOM | `entry/ui/panel-chrome.js` | Candidate primitive source. |
| WorkspaceKit common visual CSS | `entry/entry.js` style block | Extract only generic Token/primitive rules incrementally; do not move feature CSS in one batch. |
| Background state values | `entry/ui/panel-background-state.js` | Keep outside UI Kit. |
| Glass Portal/background application | `entry/entry.js` | Defer to S1; host-only lifecycle. |
| Sidebar registration/remount recovery | `entry/entry.js` | Defer to S2; host-only lifecycle. |
| Layout feature view | `web/ui/layout-module-view.js` | Retain behavior; later replace only visual construction. |
| Layout standalone chrome | `web/foundation/panel-chrome.js` | Migration target; do not extend as a second design source. |

### Required evidence

- [x] WorkspaceKit relevant syntax/contract suite passes: all current `scripts/test-*.mjs` contracts and `node --check entry/entry.js` passed on 2026-07-24.
- [x] Layout relevant syntax/contract suite passes: all current `tests/*.test.mjs` contracts and `node --check web/main.js` passed on 2026-07-24.
- [x] Test-package resource paths serve both existing plugins: port 8190 returned HTTP 200 for WorkspaceKit `entry.js` and Layout `main.js`, `layout-module-view.js`, and `workspacekit-provider.js` on 2026-07-24.
- [ ] Baseline visual/lifecycle acceptance is recorded before Batch 3.

## Batch 1 — UI Kit source and export

### Allowed changes

- Add a new WorkspaceKit `ui-kit/` source boundary containing only generic
  Tokens, primitive factories, style installation, and a standalone shell.
- Add deterministic export, manifest, SHA-256 inventory, and stale-copy tests.
- Add a generated Layout Vendor destination only through the export command.

### Forbidden changes

- Do not change current WorkspaceKit shell rendering, Provider render context,
  Layout rendering, panel background behavior, Portal movement, sidebar
  registration, graph commands, or settings behavior.

### Required evidence

- [x] Repeated export with unchanged source produces identical Vendor SHA-256 inventory on 2026-07-24.
- [x] Declared source content is hashed into the manifest inventory by the export contract; changed content produces a different hash.
- [x] A changed Vendor file or stale source/Vendor pair is rejected by the export-manifest contract.
- [x] UI Kit primitives mount in a fake document contract; the source and Vendor runtime resources both returned HTTP 200 from test port 8190 on 2026-07-24.

## Batch 2 — host capability

### Required evidence

- [x] Existing Provider API v1 tests pass unchanged.
- [x] WorkspaceKit publishes a separate, versioned `WorkspaceKitPanelUITemplate` runtime; its contract and source resource passed on 2026-07-24.
- [x] Provider render context supplies optional `ui`; current Layout Provider regression tests still pass while ignoring it.
- [ ] Minimal fake Provider mounts, switches, and disposes without duplicate DOM in the real test package.
- [ ] Integration enabled/disabled controls placement, not UI capability availability, in a real refresh acceptance.

## Batch 3 — Layout merged mode

### Required evidence

- [x] Layout command callbacks, density, toolbar modes, and localization remain unchanged in the module-view and Provider contract tests on 2026-07-24.
- [x] Hosted Layout uses the compatible host Template or the generated Vendor Template; it no longer selects legacy Layout chrome as the UI fallback.
- [x] Test-package hosted Layout opened on port 8190 after a clean Chrome reload on 2026-07-24: shared header/range/command-grid each mounted once and legacy Layout chrome count was zero.
- [x] Test-package switching Workflows → Layout left one shared header, one range, and one command grid; no WorkspaceKit/Layout console errors were recorded on 2026-07-24.
- [ ] Dark, light, transparent, and frosted visual comparison remains a manual visual acceptance item.

## Batch 4 — Layout standalone mode

### Required evidence

- [x] Layout without WorkspaceKit resolves the bundled Vendor Template in a direct contract test on 2026-07-24.
- [x] With a compatible WorkspaceKit Template, Layout resolves the host runtime in direct merged and standalone resolver tests on 2026-07-24.
- [x] A missing or incomplete host Template safely falls back to the generated Vendor runtime.
- [x] Export verification confirms the Vendor manifest and all required UI files are present under `web/vendor/workspacekit-ui`.
- [x] Test-package host-merged entry opened and remounted cleanly on port 8190 after a Chrome reload on 2026-07-24.
- [ ] Test-package visual acceptance still required for the standalone entry, theme changes, and offline fallback.

## Batch 4.1 — one visual source enforcement

### Scope

- Establish the WorkspaceKit product-theme token bridge in the editable UI Kit
  source, with ComfyUI tokens only as a true standalone fallback.
- Export that source deterministically to Layout's tracked Vendor runtime.
- Remove Layout module-view's former hand-built visual fallback. A complete
  compatible Template is now required; missing/incomplete integration is an
  explicit error instead of silently recreating old Layout chrome.

### Evidence

- [x] Complete snapshots were created before the batch: WorkspaceKit
  `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-layout-visual-unification-20260724-180523.zip`
  (SHA-256 `A4C031DC6FEA22B1FD31AB3269864CB085D71E10BBD8BBB5CC4BF9BC09AAA429`)
  and Layout
  `.codex-backups/10-ui-canvas/ComfyUI-WorkspaceKit-Layout-before-layout-visual-unification-20260724-180537.zip`
  (SHA-256 `202507DB87663DFD418571105E04D80D6368B97A28847D8891042E06D77BD27B`).
- [x] Template primitive, API, export, and host contracts passed with Template
  version `1.1.0`; generated Vendor verification passed after export.
- [x] Layout module-view, Provider, and standalone resolver suite passed (9/9),
  including the assertion that a missing Template is rejected rather than
  recreating a second Layout visual system.
- [ ] After a normal test-package refresh, compare Layout in merged and
  standalone placement under dark, light, transparent, and frosted WorkspaceKit
  backgrounds. This is the only remaining evidence needed to accept visual
  unification; static tests do not prove visual parity.

## Batch 4.2 — product component convergence

### Scope

- Use the existing Workflows/Nodes/Templates header DOM as the Template header
  DOM instead of maintaining a Template-only header structure.
- Give Layout's control band the same compact product toolbar rhythm, input
  treatment, action-button spacing, and Header/Controls/Content slot spacing.
- Keep Layout's command grid feature-owned; only its surrounding panel
  presentation is shared.

### Evidence

- [x] `panel-chrome.js` now delegates built-in title/status creation to
  `ui-kit/primitives.js` while retaining the established `workspace2-*` classes.
- [x] Template v1.2.0 export and generated Layout Vendor verification passed.
- [x] Test-package port 8190 was reloaded on 2026-07-26. The hosted Layout tab
  mounted one `workspace2-header workspacekit-ui-header`, three product slot
  classes, one command grid, and zero legacy Layout header/context elements.
- [x] Layout rendered the title, selection status, 21px range control, mode
  controls, and twelve disabled command buttons without a WorkspaceKit error.
- [ ] Standalone-placement and dark/light/transparent/frosted visual matrix
  still require separate acceptance; this batch does not claim them.

### Batch 4 snapshots

| Repository | Snapshot | SHA-256 |
| --- | --- | --- |
| WorkspaceKit | `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-before-layout-standalone-ui-migration-20260724-160117.zip` | `8EA04592E54CDB860332E37F514CBBC05320929CD5AE77BC9C075D71AB6BF69A` |
| Layout | `.codex-backups/50-integrations/ComfyUI-WorkspaceKit-Layout-before-layout-standalone-ui-migration-20260724-160117.zip` | `172C0E1F597C70A3FC7709BD5BBA4A51F11909227F42C577211F5AE910566984` |

## Batch 4.3 — capability compatibility contract

### Scope

- Publish Template v1.3.0 with an immutable capability contract.
- Make Layout declare the exact v1 primitives it requires instead of relying
  on a scattered function-name check.
- Export the same contract to the standalone Vendor runtime.

### Evidence

- [x] A newer v1.x host passes when it declares and implements Layout's
  required capabilities.
- [x] A future v2 host with an explicit v1 adapter passes.
- [x] A pure v2 host without v1 support falls back to Layout's Vendor v1.3.0.
- [x] A host that declares a capability but omits its factory function is
  rejected.
- [x] The generated Vendor manifest contains `compatibility.js` and verified
  all UI source hashes after export on 2026-07-26.

### Batch 4.3 snapshots

| Repository | Snapshot | SHA-256 |
| --- | --- | --- |
| WorkspaceKit | `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-before-ui-template-compatibility-contract-20260726.zip` | `A3F843BAF25307B6BCD4B4843FAD750C5258CC5F14BA79A02003352A6E4D310D` |
| Layout | `.codex-backups/90-full-snapshots/ComfyUI-WorkspaceKit-Layout-before-ui-template-compatibility-contract-20260726.zip` | `8670E6D04A78F5AF9568DED7C70471120944034128C17091F1E95246585D2CC3` |

## Batch 5 — external release readiness

### Required evidence

- [ ] Public UI capability signatures and CSS scope rules are documented.
- [ ] A minimal third-party Provider example passes independently.
- [ ] Compatibility, accessibility, narrow-width, theme, lifecycle, and fallback matrix is complete.
- [ ] Release notes state UI Template and Provider API compatibility versions separately.

## Deferred host-lifecycle extractions

S1 and S2 are intentionally not part of UI Kit implementation. Their source
code may be characterized during this program, but code extraction requires a
separate snapshot, a separate test plan, and no simultaneous Layout migration.
