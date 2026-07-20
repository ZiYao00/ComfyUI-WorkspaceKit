// Template-group header DOM only. The entry injects all state changes and mutations.
export function createTemplateGroupHeaderRenderer({
  document,
  translate,
  iconButton,
  dangerIconButton,
  applyDecoratedIcon,
  defaultOpenIconClass,
  defaultIconClass,
  schedule = setTimeout,
}) {
  function renderTemplateGroupHeader({
    el,
    section,
    group,
    depth,
    groupOpen,
    isEditing,
    makeDropTarget,
    makeDragSource,
    onToggle,
    onOpenMenu,
    prepareRenameInput,
    onCommitRename,
    onRenameError,
    onCancelRename,
    onNewSubfolder,
    onStartRename,
    onDelete,
  }) {
    const header = document.createElement("div");
    header.className = "workspace2-node-folder-header";
    header.style.setProperty("--indent", `${depth * 16 + 4}px`);
    header.dataset.workspace2TemplateGroupId = group.id;
    makeDropTarget(el, header, group.id);
    makeDragSource(header, group);
    header.addEventListener("click", (event) => {
      if (event.target.closest("button,input")) return;
      event.stopPropagation();
      onToggle(event);
    });
    header.addEventListener("contextmenu", (event) => onOpenMenu(event));

    const disclosure = document.createElement("button");
    disclosure.className = `workspace2-disclosure ${groupOpen ? "is-open" : ""}`;
    disclosure.type = "button";
    disclosure.title = groupOpen ? translate("folder.collapse") : translate("folder.expand");
    disclosure.addEventListener("click", (event) => {
      event.stopPropagation();
      onToggle(event);
    });

    const icon = document.createElement("span");
    applyDecoratedIcon(icon, group.icon, group.color, groupOpen ? defaultOpenIconClass : defaultIconClass);

    const name = document.createElement("div");
    name.className = "workspace2-name";
    if (isEditing) {
      const input = document.createElement("input");
      input.className = "workspace2-rename-input";
      input.value = group.name;
      prepareRenameInput(input);
      input.addEventListener("click", (event) => event.stopPropagation());
      input.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          try { await onCommitRename(input.value); } catch (error) { onRenameError(error); }
        }
        if (event.key === "Escape") {
          event.preventDefault();
          onCancelRename();
        }
      });
      input.addEventListener("blur", async () => {
        try { await onCommitRename(input.value); } catch (error) { onRenameError(error); }
      });
      name.append(input);
      schedule(() => { input.focus(); input.select(); }, 0);
    } else {
      name.textContent = group.name;
    }

    const actions = document.createElement("div");
    actions.className = "workspace2-actions";
    actions.append(
      iconButton("folderPlus", translate("menu.newSubfolder"), onNewSubfolder),
      iconButton("edit", translate("templates.renameGroup"), onStartRename),
      dangerIconButton("trash", translate("templates.deleteGroupTitle"), onDelete),
    );
    header.append(disclosure, icon, name, actions);
    section.append(header);
    return header;
  }

  return { renderTemplateGroupHeader };
}
