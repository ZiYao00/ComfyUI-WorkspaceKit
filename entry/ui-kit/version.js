// Public version boundary for the reusable WorkspaceKit panel UI. This is
// intentionally separate from the WorkspaceKit plugin version and from the
// Provider API version.
// 1.1.0 establishes the WorkspaceKit product-theme bridge. Family panels use
// the same WorkspaceKit tokens when the host is present, while the Vendor
// runtime keeps ComfyUI-native fallbacks for a genuinely standalone install.
// 1.2.0 makes the established WorkspaceKit product header the Template
// header as well, so built-in tabs and family panels no longer maintain
// separate title/status DOM structures.
// 1.2.1 centers segmented icon controls with the same button geometry used
// by built-in panel toolbars, preventing baseline drift in hosted Layout.
// 1.3.0 publishes a capability contract so family plugins negotiate their
// required UI surface without treating every visual minor release as a break.
// 1.4.0 adds the dormant shared primitives used by the next Theme migration:
// disclosure sections, compact action bars, and drop surfaces. Existing
// family panels keep their current markup until an individual migration batch.
// 1.5.0 adds a local, versioned icon-kit capability. It is intentionally
// additive: existing panels can keep their own icons until their migration batch.
// 1.5.1 is a compatibility-only refresh after Layout became a built-in module.
// External Providers may opt into this UI Template, but tab registration and
// host slots remain the only required integration boundary.
export const PANEL_UI_TEMPLATE_VERSION = "1.5.1";
export const PANEL_UI_TEMPLATE_MAJOR = 1;

export function supportsPanelUiTemplate(requiredMajor) {
  return Number(requiredMajor) === PANEL_UI_TEMPLATE_MAJOR;
}
