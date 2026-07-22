// Browse rows are rendered only when the Workflows panel needs them. Keeping
// this as a direct function (rather than a top-level factory) prevents a
// callback-binding mistake from aborting entry.js before sidebar registration.
// All workflow actions are supplied by the caller; this module owns no files,
// network requests, official Store calls, or dirty-state/rename transactions.
export function renderWorkflowBrowseNode(deps, el, list, node, depth) {
  const {
    state,
    t,
    matchesQuery,
    visibleChildren,
    parentPath,
    workflowFolderMeta,
    applyDecoratedIcon,
    defaultFolderIconClass,
    defaultFolderOpenIconClass,
    defaultFileIconClass,
    getDisplayName,
    createRenameInput,
    iconButton,
    dangerIconButton,
    onCloseContextMenu,
    onToggleFolder,
    onOpenWorkflow,
    onOpenContextMenu,
    onPointerDrag,
    onDropTarget,
    onReorderDrag,
    onNewSubfolder,
    onOpenWorkflowLocation,
    onCopyWorkflow,
    onRename,
    onMoveToTrash,
    onError,
  } = deps;

  if (!matchesQuery(node, state.query.trim().toLowerCase())) {
    return;
  }

  const row = document.createElement("div");
  row.className = "workspace2-row";
  row.classList.add(node.type === "folder" ? "is-folder" : "is-file");
  row.style.setProperty("--indent", `${depth * 16 + 4}px`);
  row.title = node.path || t("root.unknown");
  row.dataset.workspace2ItemPath = node.path || "";
  row.dataset.workspace2ParentPath = parentPath(node.path || "");
  row.draggable = false;
  if (state.selectedPath === node.path) {
    row.classList.add("is-selected");
  }

  row.addEventListener("click", async (event) => {
    if (state.suppressClick) {
      state.suppressClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (state.editingPath === node.path) {
      return;
    }
    event.stopPropagation();
    state.selectedPath = node.path;
    onCloseContextMenu();
    if (node.type === "folder") {
      onToggleFolder(el, node, event.ctrlKey || event.metaKey);
      return;
    }
    try {
      await onOpenWorkflow(el, node.path);
    } catch (error) {
      onError(el, error);
    }
  });
  row.addEventListener("contextmenu", (event) => onOpenContextMenu(el, event, node));

  if (node.path) {
    onPointerDrag(el, row, node);
  }
  if (node.type === "folder") {
    onDropTarget(el, row, node.path);
  }

  const disclosure = document.createElement(node.type === "folder" ? "button" : "span");
  if (node.type === "folder") {
    disclosure.className = `workspace2-disclosure ${state.expanded.has(node.path) || state.query ? "is-open" : ""}`;
    disclosure.type = "button";
    disclosure.title = state.expanded.has(node.path) ? t("folder.collapse") : t("folder.expand");
    disclosure.addEventListener("click", (event) => {
      event.stopPropagation();
      onToggleFolder(el, node, event.ctrlKey || event.metaKey);
    });
  } else {
    disclosure.className = "workspace2-spacer";
  }

  const reorderHandle = document.createElement("span");
  if (state.customOrderEnabled && node.path) {
    reorderHandle.className = "workspace2-reorder-handle";
    reorderHandle.title = t("workflows.reorderHandle");
    onReorderDrag(el, reorderHandle, row, node);
  } else {
    reorderHandle.className = "workspace2-reorder-spacer";
  }

  const icon = document.createElement("span");
  const meta = node.type === "folder" ? workflowFolderMeta(node.path) : {};
  applyDecoratedIcon(
    icon,
    node.type === "folder" ? meta.icon : "",
    node.type === "folder" ? meta.color : "",
    node.type === "folder"
      ? (state.expanded.has(node.path) || state.query ? defaultFolderOpenIconClass : defaultFolderIconClass)
      : defaultFileIconClass,
  );

  const nameCell = document.createElement("div");
  nameCell.className = "workspace2-name";
  if (state.editingPath === node.path && state.editingSurface !== "open") {
    nameCell.append(createRenameInput(el, node, "browse"));
  } else {
    const name = document.createElement("span");
    name.textContent = getDisplayName(node);
    nameCell.append(name);
    if (node.type === "file" && node.size_bytes) {
      const size = document.createElement("span");
      size.className = "workspace2-meta";
      size.textContent = `${Math.ceil(node.size_bytes / 1024)} KB`;
      nameCell.append(size);
    }
  }

  const actions = document.createElement("div");
  actions.className = "workspace2-actions";
  if (node.type === "folder") {
    actions.append(iconButton("folderPlus", t("menu.newSubfolder"), async () => {
      try {
        await onNewSubfolder(el, node.path);
      } catch (error) {
        onError(el, error);
      }
    }));
  } else {
    actions.append(iconButton("folderOpen", t("row.openLocation"), async () => {
      try {
        await onOpenWorkflowLocation(node.path);
      } catch (error) {
        onError(el, error);
      }
    }));
    actions.append(iconButton("copy", t("row.copy"), async () => {
      try {
        await onCopyWorkflow(el, node);
      } catch (error) {
        onError(el, error);
      }
    }));
  }
  actions.append(iconButton("edit", t("row.rename"), () => onRename(el, node.path)));
  actions.append(dangerIconButton("trash", t("row.moveToTrash"), async () => {
    try {
      await onMoveToTrash(el, node);
    } catch (error) {
      onError(el, error);
    }
  }));

  row.append(reorderHandle, disclosure, icon, nameCell, actions);
  list.append(row);

  if (node.type === "folder" && (state.expanded.has(node.path) || state.query)) {
    for (const child of visibleChildren(node)) {
      renderWorkflowBrowseNode(deps, el, list, child, depth + 1);
    }
  }
}
