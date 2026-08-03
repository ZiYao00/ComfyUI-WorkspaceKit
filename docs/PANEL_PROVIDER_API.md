# WorkspaceKit Panel Provider API v1

Optional panels register through `window.WorkspaceKitPanelAPI`. Providers own
their feature behavior; WorkspaceKit owns tab placement and lifecycle.

```js
{
  apiVersion: 1,
  id: "example.panel",
  title: "Example",          // required fallback
  iconKey: "example",        // optional local icon identity
  getTitle: () => "示例",     // optional provider-localized title
  render({ headerHost, contextHost, contentHost, surface, app, translate, ui }) {
    // Append only to the supplied hosts; return dispose().
    // ui is optional; an existing Provider may safely ignore it.
    return () => {};
  },
  onHostClaimed() {
    // Optional: remove a standalone fallback only after host confirmation.
  },
  renderSettings({ document, container, app, translate }) {
    // Optional. Append only to container; throw-safe per Provider.
  },
}
```

WorkspaceKit displays the localized title in its top tab strip, falling back to
`title`, then `id`. It intentionally does not place an emoji before every tab.
`iconKey` identifies a Provider's local functional/entry icon; a Provider must
continue to work if the host does not recognize that key. `getTitle()` errors
are isolated and never hide a tab. Providers must not import WorkspaceKit
private modules or mutate its sidebar.
`renderSettings` is optional. When present, WorkspaceKit places it under
Settings > Advanced > Extension settings; Providers without it create no empty
settings area.

## Optional UI Template capability

Provider render context now supplies an optional **Panel UI Template v1**
capability. It is not required for registration, and existing Providers remain
valid when they ignore it.

When available, `ui` exposes `version`, `major`, `supports(requiredMajor)`,
and generic primitive factories such as `createModuleHeader`, `createSection`,
`createIcon`, `createIconButton`, `createSegmentedControl`, `createRangeControl`,
`createCommandGrid`, and `createStandaloneShell`. Providers must check the
major contract they require and keep a safe local presentation fallback when
`ui` is absent or incompatible.

`ui.createIcon(iconKey, { size, className })` returns the host's local SVG
element. Use it for functional controls only, after checking that the Provider
requires the `icon-kit` capability. Do not pass user-entered emoji, file icons,
or arbitrary SVG markup into this API; those remain Provider/content data.

The UI Template runtime is published independently from the setting that
allows Providers to merge into the WorkspaceKit tab strip. That setting affects
panel placement, not whether a standalone family plugin may use a compatible
installed Template.

The standalone-family fallback behavior, compatibility rules, and remaining
implementation/acceptance plan are documented in
[Panel UI Template v1](PANEL_UI_TEMPLATE.md).

## Integration availability

`WorkspaceKitPanelAPI` is always published so compatible plugins can retain a
safe load-order path. WorkspaceKit may, however, mark Provider integration as
unavailable through the user setting. In that state `getProviders()` returns no
hostable Providers and a new `register()` result is `deferred-disabled`.
Providers are retained in memory rather than discarded; `setProvidersEnabled(true)`
emits `availability-changed` and makes them hostable again without another
plugin load. This is a product preference for sidebar composition, not a
security boundary.

## CSS scope rules for third-party providers

Providers own only the DOM they append to the supplied hosts. To keep the
shared sidebar stable across releases:

- Prefix every custom selector with your provider's own root class (for
  example `.example-panel-provider`). Install styles once, keyed by a unique
  `<style>` id.
- Never target WorkspaceKit internal classes (`workspace2-*`, `xzg-*`) or use
  broad global selectors (bare element selectors, `*`, or `body`-level rules).
  Those classes are private and may change without notice.
- Feature-specific visuals stay with the provider. Use the optional `ui`
  Panel UI Template primitives for shared chrome (header/section/controls)
  instead of re-styling WorkspaceKit's.

## Copyable example

A complete, dependency-free example provider lives in
`examples/minimal-panel-provider/`. It shows load-order-safe registration
(register now, or queue on `window.WorkspaceKitPanelProviderRegistry`), a
`render()`/`dispose()` pair that appends a single scoped root, optional use of
the `ui` capability with a local fallback, and scoped styling. Its contract is
covered on the running test package by `scripts/e2e/t016-example-provider.mjs`.
