// The workflow trash renderer owns only the visible list and its action
// controls. Restore and system-recycle-bin operations remain injected from
// entry.js because they coordinate filesystem results, panel refreshes, and
// inline-confirmation error reporting. Do not move those operation paths here.
export function createWorkflowTrashRenderer({
  state,
  t,
  applyDecoratedIcon,
  defaultFolderIconClass,
  defaultFileIconClass,
  iconButton,
  dangerIconButton,
  showInlineConfirm,
  handleError,
  onRestore,
  onMoveToSystemTrash,
}) {
  function render(el, panel) {
    const list = document.createElement("div");
    list.className = "workspace2-trash-list";

    if (!state.trashItems.length) {
      const empty = document.createElement("div");
      empty.className = "workspace2-empty";
      empty.textContent = t("trash.empty");
      list.append(empty);
    }

    for (const item of state.trashItems) {
      const row = document.createElement("div");
      row.className = "workspace2-trash-item";

      const info = document.createElement("div");
      info.className = "workspace2-trash-info";
      const icon = document.createElement("span");
      applyDecoratedIcon(
        icon,
        "",
        "",
        item.type === "folder" ? defaultFolderIconClass : defaultFileIconClass,
      );
      const text = document.createElement("div");
      text.className = "workspace2-trash-text";
      const name = document.createElement("div");
      name.className = "workspace2-trash-name";
      name.textContent = item.name;
      const meta = document.createElement("div");
      meta.className = "workspace2-trash-meta";
      meta.title = item.original_path;
      meta.textContent = `${item.original_path} | ${item.deleted_at || ""}`;
      text.append(name, meta);
      info.append(icon, text);

      const restore = iconButton("restore", t("trash.restore"), async () => {
        try {
          await onRestore(el, item);
        } catch (error) {
          handleError(el, error);
        }
      });

      const systemTrash = dangerIconButton("systemTrash", t("trash.systemDelete"), (event) => {
        event.preventDefault();
        event.stopPropagation();
        showInlineConfirm(event.currentTarget, {
          confirmText: t("confirm.moveToSystemTrash"),
          onConfirm: async () => {
            try {
              await onMoveToSystemTrash(el, item);
            } catch (error) {
              handleError(el, error);
            }
          },
        });
      });

      row.append(info, restore, systemTrash);
      list.append(row);
    }

    panel.append(list);
  }

  return { render };
}
