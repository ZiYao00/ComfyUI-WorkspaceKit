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
  render({ headerHost, contextHost, contentHost, surface, app, translate }) {
    // Append only to the supplied hosts; return dispose().
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

## Integration availability

`WorkspaceKitPanelAPI` is always published so compatible plugins can retain a
safe load-order path. WorkspaceKit may, however, mark Provider integration as
unavailable through the user setting. In that state `getProviders()` returns no
hostable Providers and a new `register()` result is `deferred-disabled`.
Providers are retained in memory rather than discarded; `setProvidersEnabled(true)`
emits `availability-changed` and makes them hostable again without another
plugin load. This is a product preference for sidebar composition, not a
security boundary.
