// Renders only the already-projected Templates root results. Data loading,
// errors, query state, template/group row behavior, drop behavior, and all
// Alt+C lifecycle responsibilities remain injected from entry.js. This module
// must stay a small DOM boundary: it owns no global listener or template state.
export function createTemplateRootRenderer({
  document,
  translate,
  makeTemplateDropTarget,
  renderTemplateRow,
  renderTemplateGroupFolder,
}) {
  const renderTemplateRootResults = ({ el, body, query, rootTemplates, rootGroups }) => {
    if (!rootTemplates.length && !rootGroups.length) {
      const empty = document.createElement("div");
      empty.className = "workspace2-empty";
      empty.textContent = query ? translate("templates.noMatches") : translate("templates.empty");
      body.append(empty);
      return;
    }

    const section = document.createElement("div");
    section.className = "workspace2-node-section";
    const rootList = document.createElement("div");
    rootList.className = "workspace2-node-list workspace2-template-list";
    makeTemplateDropTarget(el, rootList, "");
    for (const template of rootTemplates) {
      rootList.append(renderTemplateRow(el, template));
    }
    section.append(rootList);
    for (const group of rootGroups) {
      renderTemplateGroupFolder(el, section, group, query, 0);
    }
    body.append(section);
  };

  return { renderTemplateRootResults };
}
