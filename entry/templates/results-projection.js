// Read-only template/group result projection shared by the root and nested
// Templates views. It receives all data and ordering callbacks from entry.js,
// so it cannot fetch, save, mutate groups, create DOM, or interfere with the
// Alt+C/rename/drag lifecycle. Keep recursive matching here rather than in a
// renderer so root and nested search results use one rule.
export function createTemplateResultsProjection({
  getChildGroups,
  templateMatchesQuery,
  compareTemplatesBySort,
}) {
  const templateMatchesGroup = (group, query, templates) => {
    const directTemplates = templates
      .filter((template) => template.groupId === group.id)
      .some((template) => templateMatchesQuery(template, query));
    if (directTemplates) return true;
    if (query && group.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) return true;
    return getChildGroups(group.id).some((child) => templateMatchesGroup(child, query, templates));
  };

  const projectTemplateGroupResults = ({ group, query, templates }) => {
    const groupTemplates = templates
      .filter((template) => template.groupId === group.id)
      .filter((template) => templateMatchesQuery(template, query))
      .sort((a, b) => compareTemplatesBySort(a, b, query));
    const childGroups = getChildGroups(group.id)
      .filter((childGroup) => !query || templateMatchesGroup(childGroup, query, templates));
    return { groupTemplates, childGroups };
  };

  const projectTemplateRootResults = ({ query, templates }) => {
    const rootTemplates = templates
      .filter((template) => !template.groupId)
      .filter((template) => templateMatchesQuery(template, query))
      .sort((a, b) => compareTemplatesBySort(a, b, query));
    const rootGroups = getChildGroups("")
      .filter((group) => !query || templateMatchesGroup(group, query, templates));
    return { rootTemplates, rootGroups };
  };

  return { templateMatchesGroup, projectTemplateGroupResults, projectTemplateRootResults };
}
