// Renders only the contents below an already-rendered Templates group header:
// recursive child-group placement and the group's template list. Header DOM,
// inline rename, menu actions, drag-source setup, expand-state policy, data
// projection, and persistence remain in entry.js. This narrow boundary avoids
// reintroducing the sidebar/Alt+C regressions seen when lifecycle code moved.
export function createTemplateGroupContentsRenderer({
  document,
  makeTemplateDropTarget,
  renderTemplateRow,
  renderTemplateGroupFolder,
}) {
  const renderTemplateGroupContents = ({
    el,
    section,
    group,
    query,
    depth,
    groupOpen,
    childGroups,
    groupTemplates,
  }) => {
    if (!groupOpen) return false;
    for (const childGroup of childGroups) {
      renderTemplateGroupFolder(el, section, childGroup, query, depth + 1);
    }
    const list = document.createElement("div");
    list.className = "workspace2-node-list workspace2-template-list";
    list.style.setProperty("--indent", `${(depth + 1) * 16 + 4}px`);
    makeTemplateDropTarget(el, list, group.id);
    for (const template of groupTemplates) {
      list.append(renderTemplateRow(el, template));
    }
    section.append(list);
    return true;
  };

  return { renderTemplateGroupContents };
}
