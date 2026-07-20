// Workflow rename-input presentation and event ordering only. Rename I/O,
// Workflow state, error rendering, and panel refresh remain injected from the
// entry. Enter and blur deliberately share one promise: previous regressions
// showed that two independent submissions require a second confirmation or
// leave the visible workflow list out of sync.
export function createWorkflowRenameInputFactory({ document, schedule = setTimeout }) {
  function createRenameInput({
    item,
    surface,
    displayName,
    prepareInput,
    onCommit,
    onError,
    onCancel,
    isStillEditing,
  }) {
    const input = document.createElement("input");
    input.className = "workspace2-rename-input";
    input.value = displayName(item);
    prepareInput(input);

    let renamePromise = null;
    const commitRename = () => {
      if (!renamePromise) {
        input.disabled = true;
        renamePromise = onCommit(input.value.trim());
      }
      return renamePromise;
    };

    input.addEventListener("click", (event) => event.stopPropagation());
    input.addEventListener("keydown", async (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        try {
          await commitRename();
        } catch (error) {
          onError(error);
        }
        return;
      }
      if (event.key === "Escape" && !renamePromise) {
        event.preventDefault();
        event.stopPropagation();
        onCancel();
      }
    });
    input.addEventListener("blur", async () => {
      if (renamePromise) return;
      try {
        await commitRename();
      } catch (error) {
        onError(error);
      }
    });
    schedule(() => {
      if (isStillEditing(item.path, surface)) {
        input.focus();
        input.select();
      }
    }, 0);
    return input;
  }

  return { createRenameInput };
}
