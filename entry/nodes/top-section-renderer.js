// Renders one top-level Nodes section shell (Comfy, Extensions, or Unknown).
// It chooses between the existing flat search results and the official category
// tree. Header collapse state, search data, row DOM, and tree construction are
// all injected, so this module neither reads Nodes state nor owns interaction,
// cache, persistence, or sidebar lifecycle behavior.
export function createNodeTopSectionRenderer({
  document,
  getQuery,
  translate,
  renderTopSectionHeader,
  renderNodeRow,
  buildOfficialNodeTree,
  renderOfficialNodeTree,
}) {
  const renderNodeTopSection = (el, body, sectionId, titleText, nodes, totalCount, favoriteTypes) => {
    const section = document.createElement("div");
    section.className = "workspace2-node-section";
    const sectionExpanded = renderTopSectionHeader(el, section, sectionId, titleText, `${nodes.length}/${totalCount}`);
    body.append(section);

    const query = getQuery().trim();
    if (!sectionExpanded && !query) return;

    if (!nodes.length) {
      const empty = document.createElement("div");
      empty.className = "workspace2-empty";
      empty.textContent = translate("nodes.noNodeMatches");
      section.append(empty);
      return;
    }

    if (query) {
      const list = document.createElement("div");
      list.className = "workspace2-node-list";
      for (const node of nodes) {
        list.append(renderNodeRow(el, node, favoriteTypes.has(node.type)));
      }
      section.append(list);
      return;
    }

    renderOfficialNodeTree(el, section, buildOfficialNodeTree(sectionId, nodes), favoriteTypes);
  };

  return { renderNodeTopSection };
}
