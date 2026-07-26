# WorkspaceKit Panel Provider API v1

Optional panels register through `window.WorkspaceKitPanelAPI`. Providers own
their feature behavior; WorkspaceKit owns tab placement and lifecycle.

```js
{
  apiVersion: 1,
  id: "example.panel",
  title: "Example",       // required fallback
  icon: "🧩",              // optional emoji/text icon
  getTitle: () => "示例",  // optional provider-localized title
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

WorkspaceKit displays `icon + getTitle()` when available, otherwise falls back
to `title`, then `id`. `getTitle()` errors are isolated and never hide a tab.
Providers must not import WorkspaceKit private modules or mutate its sidebar.
`renderSettings` is optional. When present, WorkspaceKit places it under
Settings > Advanced > Extension settings; Providers without it create no empty
settings area.

## Optional UI Template capability

Provider render context now supplies an optional **Panel UI Template v1**
capability. It is not required for registration, and existing Providers remain
valid when they ignore it.

When available, `ui` exposes `version`, `major`, `supports(requiredMajor)`,
and generic primitive factories such as `createModuleHeader`, `createSection`,
`createIconButton`, `createSegmentedControl`, `createRangeControl`,
`createCommandGrid`, and `createStandaloneShell`. Providers must check the
major contract they require and keep a safe local presentation fallback when
`ui` is absent or incompatible.

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
