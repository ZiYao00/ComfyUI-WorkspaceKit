// Presentation-only renderer for the Workflows "Open" section. The entry
// supplies already-computed active/dirty/official state and owns every
// operation. This separation is intentional: official Store transitions can
// momentarily lag file-list refreshes, so this module must never infer state
// or call filesystem/Store APIs on its own.
export function createWorkflowOpenListRenderer({ document, translate, iconButton }) {
  function runAction(event, action, onError) {
    event.preventDefault();
    event.stopPropagation();
    Promise.resolve(action()).catch(onError);
  }

  function renderOpenWorkflowList({
    entries,
    createRenameInput,
    onOpen,
    onSave,
    onStartRename,
    onCloseOfficial,
    onRemoveRecent,
    onError,
  }) {
    const section = document.createElement("div");
    section.className = "workspace2-recent-workflows";
    const label = document.createElement("div");
    label.className = "workspace2-current-workflow-label";
    label.textContent = translate("workflows.recent");
    section.append(label);

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "workspace2-current-workflow-name is-empty";
      empty.textContent = translate("workflows.currentEmpty");
      section.append(empty);
      return section;
    }

    for (const entry of entries) {
      const row = document.createElement("div");
      row.className = "workspace2-current-workflow";
      if (entry.isActive) row.classList.add("is-selected");
      const info = document.createElement(entry.isRenaming ? "div" : "button");
      if (!entry.isRenaming) info.type = "button";
      info.className = "workspace2-current-workflow-info";
      info.title = entry.path;
      if (entry.isDirty) {
        const dirtyDot = document.createElement("span");
        dirtyDot.className = "workspace2-current-workflow-dirty-dot";
        dirtyDot.title = translate("workflows.unsavedChanges");
        dirtyDot.setAttribute("aria-label", translate("workflows.unsavedChanges"));
        info.append(dirtyDot);
      }
      if (entry.isRenaming) {
        info.append(createRenameInput(entry));
      } else {
        const name = document.createElement("div");
        name.className = "workspace2-current-workflow-name";
        name.textContent = entry.displayName;
        info.append(name);
        info.addEventListener("click", (event) => runAction(event, () => onOpen(entry), onError));
      }

      const actions = document.createElement("div");
      actions.className = "workspace2-actions";
      // Every unsaved workflow keeps its marker, while only the active canvas
      // workflow receives a save button.
      if (entry.isDirty && entry.isActive) {
        actions.append(iconButton("save", translate("workflows.saveCurrent"), (event) => runAction(event, () => onSave(entry), onError)));
      }
      if (entry.isOfficialWorkflow) {
        actions.append(iconButton("edit", translate("row.rename"), (event) => runAction(event, () => onStartRename(entry), onError)));
        actions.append(iconButton("x", translate("workflows.close"), (event) => runAction(event, () => onCloseOfficial(entry), onError)));
      } else {
        actions.append(iconButton("x", translate("workflows.removeRecent"), (event) => runAction(event, () => onRemoveRecent(entry), onError)));
      }
      row.append(info, actions);
      section.append(row);
    }
    return section;
  }

  return { renderOpenWorkflowList };
}
