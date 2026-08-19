/**
 * Workflow panel section shell.
 *
 * This module owns only the persisted collapsed state and the small DOM shell
 * shared by the Open and Browse sections. It deliberately receives the common
 * header helpers from entry.js: it must not import workflow data, official
 * Store state, or panel rendering actions.
 *
 * Regression boundary: Open and Browse belong to one content container. Keep
 * them as adjacent sections with spacing, not a second inherited border from a
 * parent toolbar. Browse may suppress its visible header while retaining this
 * shell as the tree's scroll/flex boundary.
 */
export function createWorkflowSectionRenderer({
  createSectionHeader,
  setSectionHeaderExpanded,
  storage,
}) {
  function isCollapsed(key) {
    return storage.getItem(key) === "1";
  }

  function setCollapsed(key, collapsed) {
    storage.setItem(key, collapsed ? "1" : "0");
  }

  function createSection({ title, collapsedKey, className = "", content, collapsible = true, showHeader = true }) {
    const section = document.createElement("section");
    section.className = `workspace2-workflow-section ${className}`.trim();
    const canCollapse = showHeader && collapsible;
    const collapsed = canCollapse && isCollapsed(collapsedKey);
    section.classList.toggle("is-collapsed", collapsed);

    let header = null;
    if (showHeader) {
      ({ header } = createSectionHeader({
        titleText: title,
        collapsible: canCollapse,
        expanded: !collapsed,
      }));
      header.classList.add("workspace2-workflow-section-header");
    }

    const body = document.createElement("div");
    body.className = "workspace2-workflow-section-content";
    body.append(content);

    if (canCollapse) {
      header.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const next = !section.classList.contains("is-collapsed");
        section.classList.toggle("is-collapsed", next);
        setSectionHeaderExpanded(header, !next);
        setCollapsed(collapsedKey, next);
      });
    }

    if (header) section.append(header);
    section.append(body);
    return section;
  }

  return {
    isCollapsed,
    setCollapsed,
    createSection,
  };
}
