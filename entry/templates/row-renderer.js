// Template-row DOM and event forwarding only. Entry-owned callbacks retain
// state, preview, canvas, persistence, and error handling. Keeping those
// effects injected prevents a renderer split from changing Alt+C, drag/drop,
// or template-placement behavior. Factories return named objects so their
// entry wiring is explicit and contract-testable.
export function createTemplateRowRenderer({
  document,
  translate,
  iconSvg,
  dangerIconButton,
  schedule = setTimeout,
}) {
  function isRowControl(event) {
    return Boolean(event.target?.closest?.("button,input,.workspace2-actions"));
  }

  function renderTemplateRow({
    el,
    template,
    isEditing,
    isSelected,
    makeDropTarget,
    prepareRenameInput,
    onRename,
    onRenameError,
    onCancelRename,
    onDelete,
    onActionsPointerEnter,
    onDragStart,
    onDragEnd,
    onOpenMenu,
    onSelect,
    onPreviewEnter,
    onPreviewMove,
    onPreviewLeave,
    onOpenTemplate,
    onOpenTemplateError,
  }) {
    const row = document.createElement("div");
    row.className = "workspace2-template-row";
    if (isSelected) row.classList.add("is-selected");
    row.draggable = !isEditing;
    row.title = translate("templates.dropHint");
    row.dataset.workspace2TemplateId = template.id;
    makeDropTarget(el, row, template.groupId || "", template.id);

    const icon = iconSvg("template");
    const info = document.createElement("div");
    info.className = "workspace2-template-info";
    const name = document.createElement("div");
    name.className = "workspace2-template-name";
    if (isEditing) {
      const input = document.createElement("input");
      input.className = "workspace2-rename-input";
      input.value = template.name;
      prepareRenameInput(input);
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          try {
            await onRename(input.value);
          } catch (error) {
            onRenameError(error);
          }
        }
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          onCancelRename();
        }
      });
      input.addEventListener("blur", async () => {
        try {
          await onRename(input.value);
        } catch (error) {
          onRenameError(error);
        }
      });
      name.append(input);
      schedule(() => {
        input.focus();
        input.select();
      }, 0);
    } else {
      name.textContent = template.name;
    }

    const meta = document.createElement("div");
    meta.className = "workspace2-template-meta";
    meta.textContent = translate("templates.meta", {
      nodes: template.nodes?.length || 0,
      links: template.links?.length || 0,
    });
    info.append(name, meta);

    const actions = document.createElement("div");
    actions.className = "workspace2-actions";
    actions.addEventListener("pointerenter", onActionsPointerEnter);
    actions.append(
      dangerIconButton("trash", translate("templates.delete"), (event) => {
        event.preventDefault();
        event.stopPropagation();
        onDelete(event.currentTarget);
      }),
    );
    row.append(icon, info, actions);

    row.addEventListener("dragstart", (event) => {
      if (isRowControl(event)) {
        event.preventDefault();
        return;
      }
      onDragStart(event);
    });
    row.addEventListener("dragend", onDragEnd);
    row.addEventListener("contextmenu", (event) => onOpenMenu(event));
    row.addEventListener("click", (event) => {
      if (isEditing || isRowControl(event)) return;
      event.preventDefault();
      event.stopPropagation();
      onSelect(event);
    });
    row.addEventListener("pointerenter", (event) => {
      if (!isEditing && !isRowControl(event)) onPreviewEnter(event);
    });
    row.addEventListener("pointermove", (event) => {
      if (isRowControl(event)) {
        onActionsPointerEnter(event);
        return;
      }
      if (!isEditing) onPreviewMove(event);
    });
    row.addEventListener("pointerleave", (event) => onPreviewLeave(event));
    row.addEventListener("dblclick", async (event) => {
      if (isRowControl(event)) return;
      event.preventDefault();
      event.stopPropagation();
      try {
        await onOpenTemplate(event);
      } catch (error) {
        onOpenTemplateError(error);
      }
    });
    return row;
  }

  return { renderTemplateRow };
}
