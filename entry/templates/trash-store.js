/**
 * Template trash data operations.
 *
 * Templates are records inside one library JSON document, unlike workflows
 * which are files.  Keep this deliberately separate from the workflow trash
 * service: a template deletion must be reversible by moving its complete
 * record into `library.trash`, never by touching the system Recycle Bin.
 *
 * These helpers are pure so the delete/restore contract can be regression
 * tested without changing a user's saved template library.
 */

function cloneTemplate(template) {
  return {
    ...template,
    nodes: Array.isArray(template?.nodes) ? [...template.nodes] : [],
    links: Array.isArray(template?.links) ? [...template.links] : [],
  };
}

export function moveTemplateToTrash(library, template, deletedAt = Date.now()) {
  if (!template?.id) return library;
  const templateId = String(template.id);
  const trash = Array.isArray(library?.trash) ? library.trash : [];
  const templates = Array.isArray(library?.templates) ? library.templates : [];
  return {
    ...library,
    templates: templates.filter((item) => item?.id !== templateId),
    // A second delete of the same record replaces its previous trash entry,
    // preserving one stable restore target per template id.
    trash: [
      {
        id: templateId,
        template: cloneTemplate(template),
        originalGroupId: String(template.groupId || ""),
        deletedAt: Number(deletedAt),
      },
      ...trash.filter((entry) => entry?.template?.id !== templateId),
    ],
  };
}

export function templateGroupSubtreeIds(library, groupId) {
  const groups = Array.isArray(library?.groups) ? library.groups : [];
  const rootId = String(groupId || "");
  if (!rootId || !groups.some((group) => group?.id === rootId)) {
    return new Set();
  }
  const ids = new Set([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const group of groups) {
      if (group?.id && ids.has(String(group.parentId || "")) && !ids.has(String(group.id))) {
        ids.add(String(group.id));
        changed = true;
      }
    }
  }
  return ids;
}

export function dissolveTemplateGroup(library, groupId) {
  const groups = Array.isArray(library?.groups) ? library.groups : [];
  const root = groups.find((group) => group?.id === groupId);
  if (!root) return library;
  const parentId = String(root.parentId || "");
  return {
    ...library,
    groups: groups
      .filter((group) => group?.id !== groupId)
      .map((group) => (group?.parentId === groupId ? { ...group, parentId } : group)),
    templates: (library?.templates || []).map((template) => (
      template?.groupId === groupId ? { ...template, groupId: parentId } : template
    )),
  };
}

export function moveTemplateGroupToTrash(library, groupId, deletedAt = Date.now()) {
  const groupIds = templateGroupSubtreeIds(library, groupId);
  if (!groupIds.size) return library;
  let next = library;
  for (const template of library?.templates || []) {
    if (groupIds.has(String(template?.groupId || ""))) {
      next = moveTemplateToTrash(next, template, deletedAt);
    }
  }
  return {
    ...next,
    groups: (next.groups || []).filter((group) => !groupIds.has(String(group?.id || ""))),
  };
}

export function restoreTemplateFromTrash(library, entry, now = Date.now()) {
  const template = entry?.template;
  if (!template?.id) return library;
  const templateId = String(template.id);
  const groupIds = new Set((library?.groups || []).map((group) => group.id));
  const groupId = groupIds.has(entry.originalGroupId) ? entry.originalGroupId : "";
  return {
    ...library,
    templates: [
      { ...cloneTemplate(template), groupId, updatedAt: Number(now) },
      ...(library?.templates || []).filter((item) => item?.id !== templateId),
    ],
    trash: (library?.trash || []).filter((item) => item?.id !== entry.id),
  };
}

export function permanentlyDeleteTemplateFromTrash(library, entry) {
  if (!entry?.id) return library;
  return {
    ...library,
    trash: (library?.trash || []).filter((item) => item?.id !== entry.id),
  };
}

export function emptyTemplateTrash(library) {
  return { ...library, trash: [] };
}
