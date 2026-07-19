// Nodes-panel preferences only. This module deliberately owns no node-library
// data, cache protocol, DOM listener, or official ComfyUI Store access.
//
// A previous entry.js split showed that import-time side effects can prevent
// the whole sidebar from registering. Keep this factory pure: it receives the
// existing keys and filters, and it touches storage only when a caller asks it
// to read or save a preference.
export function createNodePanelState({
  sectionFilters,
  visibleSectionsKey,
  customOrderKey,
  storageRef = globalThis.localStorage,
}) {
  const defaultVisibleSections = () => ({
    bookmarked: true,
    comfy: true,
    extensions: true,
  });

  const readVisibleSections = () => {
    const defaults = defaultVisibleSections();
    try {
      const parsed = JSON.parse(storageRef.getItem(visibleSectionsKey) || "{}");
      const next = { ...defaults };
      for (const key of sectionFilters) {
        if (typeof parsed?.[key] === "boolean") {
          next[key] = parsed[key];
        }
      }
      // Keep at least one section visible. A corrupt or all-hidden preference
      // must not leave the Nodes panel appearing empty after a reload.
      return Object.values(next).some(Boolean) ? next : defaults;
    } catch {
      return defaults;
    }
  };

  const saveVisibleSections = (visibleSections) => {
    storageRef.setItem(visibleSectionsKey, JSON.stringify(visibleSections));
  };

  const readCustomOrder = () => {
    try {
      const parsed = JSON.parse(storageRef.getItem(customOrderKey) || "{}");
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  };

  const saveCustomOrder = (customOrder) => {
    storageRef.setItem(customOrderKey, JSON.stringify(customOrder || {}));
  };

  return {
    defaultVisibleSections,
    readVisibleSections,
    saveVisibleSections,
    readCustomOrder,
    saveCustomOrder,
  };
}
