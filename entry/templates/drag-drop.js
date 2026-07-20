// Template drag/drop wiring only. The entry owns all moves, persistence, errors, and rerenders.
export function createTemplateDragDrop({
  state,
  templateDragType,
  templateGroupDragType,
  isGroupDescendant,
  onMoveTemplate,
  onMoveGroup,
  onError,
}) {
  function readDraggedTemplate(event) {
    const raw = event.dataTransfer?.getData(templateDragType);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return state.draggingTemplate;
      }
    }
    return state.draggingTemplate;
  }

  function readDraggedTemplateGroup(event) {
    const raw = event.dataTransfer?.getData(templateGroupDragType);
    if (!raw) {
      return state.draggingGroupId ? { id: state.draggingGroupId } : null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return state.draggingGroupId ? { id: state.draggingGroupId } : null;
    }
  }

  function makeTemplateGroupDragSource(row, group) {
    row.draggable = true;
    row.addEventListener("dragstart", (event) => {
      if (event.target.closest("button,input,.workspace2-actions,.workspace2-disclosure")) {
        event.preventDefault();
        return;
      }
      state.draggingGroupId = group.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData(templateGroupDragType, JSON.stringify({ id: group.id }));
      event.dataTransfer.setData("text/plain", group.name);
      row.closest(".workspace2-panel")?.classList.add("is-dragging");
    });
    row.addEventListener("dragend", () => {
      state.draggingGroupId = "";
      row.closest(".workspace2-panel")?.classList.remove("is-dragging");
    });
  }

  function makeTemplateDropTarget(el, target, groupId = "", beforeTemplateId = "") {
    target.dataset.workspace2TemplateTarget = groupId;
    target.dataset.workspace2TemplateBefore = beforeTemplateId;
    target.addEventListener("dragover", (event) => {
      const template = readDraggedTemplate(event);
      const group = readDraggedTemplateGroup(event);
      if (!template?.id && !group?.id) {
        return;
      }
      if (group?.id && (group.id === groupId || isGroupDescendant(groupId, group.id))) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "move";
      target.classList.add("is-drop");
    });
    target.addEventListener("dragleave", () => {
      target.classList.remove("is-drop");
    });
    target.addEventListener("drop", async (event) => {
      const template = readDraggedTemplate(event);
      const group = readDraggedTemplateGroup(event);
      target.classList.remove("is-drop");
      if (!template?.id && !group?.id) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      try {
        if (group?.id) {
          await onMoveGroup(el, group.id, groupId);
        } else {
          await onMoveTemplate(el, template.id, groupId, beforeTemplateId);
        }
      } catch (error) {
        onError(el, error);
      }
    });
  }

  return { readDraggedTemplate, makeTemplateGroupDragSource, makeTemplateDropTarget };
}
