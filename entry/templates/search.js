// Template search and ordering projection. This module has no template state
// of its own: the composition root injects generic text helpers and reads the
// selected sort mode. Keeping it data-only protects the established Alt+C
// timing path, template persistence, inline rename, drag/drop, and panel DOM.
export function createTemplateSearch({
  splitCamelCase,
  compactSearchFields,
  genericSearchScores,
  compareSearchScores,
  getSortMode,
}) {
  const templateSearchFields = (template) => {
    const nodeFields = (template.nodes || []).flatMap((node) => [
      node?.title,
      node?.type,
      splitCamelCase(node?.type || ""),
    ]);
    return compactSearchFields([
      template.name,
      ...nodeFields,
    ], [
      template.name,
      ...nodeFields,
    ]);
  };

  const templateMatchesQuery = (template, query) => {
    if (!query) return true;
    return genericSearchScores(templateSearchFields(template), query)[0] < 9;
  };

  const compareTemplatesBySort = (a, b, query = "") => {
    if (query) {
      return compareSearchScores(
        genericSearchScores(templateSearchFields(a), query),
        genericSearchScores(templateSearchFields(b), query),
      ) || a.name.localeCompare(b.name);
    }
    const sortMode = getSortMode();
    if (sortMode === "nameAsc") {
      return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" });
    }
    if (sortMode === "nameDesc") {
      return b.name.localeCompare(a.name, undefined, { numeric: true, sensitivity: "base" });
    }
    if (sortMode === "updatedDesc") {
      return Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0) || a.name.localeCompare(b.name);
    }
    if (sortMode === "updatedAsc") {
      return Number(a.updatedAt || a.createdAt || 0) - Number(b.updatedAt || b.createdAt || 0) || a.name.localeCompare(b.name);
    }
    return a.order - b.order || a.name.localeCompare(b.name);
  };

  const sortedVisibleTemplates = (templates, query) => {
    const normalizedQuery = String(query || "").trim().toLocaleLowerCase();
    const visible = [...templates].filter((template) => templateMatchesQuery(template, normalizedQuery));
    visible.sort((a, b) => compareTemplatesBySort(a, b, normalizedQuery));
    return visible;
  };

  return { templateSearchFields, templateMatchesQuery, compareTemplatesBySort, sortedVisibleTemplates };
}
