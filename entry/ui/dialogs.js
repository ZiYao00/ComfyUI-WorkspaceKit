// WorkspaceKit modal dialog primitives: themed confirm, notice, dirty-close,
// and inline-confirm overlays. Generic UI with no domain coupling.
//
// Injected dependencies:
//   t            - translation function t(key, values)
//   isolateComfyKeys(el) - stops ComfyUI global key handling inside the dialog
//   closeOverlays()      - closes other transient WorkspaceKit overlays first
//
// The single-open-dialog state (confirmClose / inlineConfirmClose) is private
// to this factory; only one dialog cluster instance should be created.
export function createWorkspace2Dialogs({ t, isolateComfyKeys, closeOverlays }) {
  let workspace2ConfirmClose = null;
  let workspace2InlineConfirmClose = null;

  function workspace2Confirm({ title = "", message = "", confirmText = t("confirm.delete"), danger = true } = {}) {
    if (workspace2ConfirmClose) {
      workspace2ConfirmClose(false);
    }
    closeOverlays();
    return new Promise((resolve) => {
      let settled = false;
      const backdrop = document.createElement("div");
      backdrop.className = "workspace2-confirm-backdrop";
      const dialog = document.createElement("div");
      dialog.className = "workspace2-confirm-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      isolateComfyKeys(dialog);
  
      const titleEl = document.createElement("div");
      titleEl.className = "workspace2-confirm-title";
      titleEl.textContent = title || confirmText;
      const messageEl = document.createElement("div");
      messageEl.className = "workspace2-confirm-message";
      messageEl.textContent = message;
      const actions = document.createElement("div");
      actions.className = "workspace2-confirm-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "workspace2-confirm-button is-secondary";
      cancel.textContent = t("confirm.cancel");
      const confirm = document.createElement("button");
      confirm.type = "button";
      confirm.className = `workspace2-confirm-button${danger ? " is-danger" : ""}`;
      confirm.textContent = confirmText;
      actions.append(cancel, confirm);
      dialog.append(titleEl, messageEl, actions);
      backdrop.append(dialog);
  
      const cleanup = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        document.removeEventListener("keydown", onKeydown, true);
        workspace2ConfirmClose = null;
        backdrop.remove();
        resolve(Boolean(result));
      };
      const onKeydown = (event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          cleanup(false);
        }
      };
      workspace2ConfirmClose = cleanup;
      backdrop.addEventListener("pointerdown", (event) => {
        if (event.target === backdrop) {
          cleanup(false);
        }
        event.stopPropagation();
      });
      backdrop.addEventListener("click", (event) => event.stopPropagation());
      dialog.addEventListener("pointerdown", (event) => event.stopPropagation());
      cancel.addEventListener("click", () => cleanup(false));
      confirm.addEventListener("click", () => cleanup(true));
      document.addEventListener("keydown", onKeydown, true);
      document.body.append(backdrop);
      setTimeout(() => cancel.focus(), 0);
    });
  }
  
  // Reuse the same themed dialog shell for informational feedback. This keeps
  // normal validation messages out of the browser's native alert() UI while
  // avoiding a misleading Cancel/Confirm choice for a one-step notice.
  function workspace2Notice({ title = "", message = "", closeText = t("settings.close") } = {}) {
    if (workspace2ConfirmClose) {
      workspace2ConfirmClose(false);
    }
    closeOverlays();
    return new Promise((resolve) => {
      let settled = false;
      const backdrop = document.createElement("div");
      backdrop.className = "workspace2-confirm-backdrop";
      const dialog = document.createElement("div");
      dialog.className = "workspace2-confirm-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      isolateComfyKeys(dialog);
  
      const titleEl = document.createElement("div");
      titleEl.className = "workspace2-confirm-title";
      titleEl.textContent = title || closeText;
      const messageEl = document.createElement("div");
      messageEl.className = "workspace2-confirm-message";
      messageEl.textContent = message;
      const actions = document.createElement("div");
      actions.className = "workspace2-confirm-actions";
      const close = document.createElement("button");
      close.type = "button";
      close.className = "workspace2-confirm-button";
      close.textContent = closeText;
      actions.append(close);
      dialog.append(titleEl, messageEl, actions);
      backdrop.append(dialog);
  
      const cleanup = () => {
        if (settled) return;
        settled = true;
        document.removeEventListener("keydown", onKeydown, true);
        workspace2ConfirmClose = null;
        backdrop.remove();
        resolve();
      };
      const onKeydown = (event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          cleanup();
        }
      };
      workspace2ConfirmClose = cleanup;
      backdrop.addEventListener("pointerdown", (event) => {
        if (event.target === backdrop) cleanup();
        event.stopPropagation();
      });
      backdrop.addEventListener("click", (event) => event.stopPropagation());
      dialog.addEventListener("pointerdown", (event) => event.stopPropagation());
      close.addEventListener("click", cleanup);
      document.addEventListener("keydown", onKeydown, true);
      document.body.append(backdrop);
      setTimeout(() => close.focus(), 0);
    });
  }
  
  /**
   * The official workflow service exposes a three-way dirty-close dialog, but
   * that service is not a stable extension API. Keep the same data-safe choice
   * in Workspace2 rather than calling the store's destructive close method
   * directly: save, discard, or cancel.
   */
  function workspace2ConfirmDirtyWorkflowClose(name) {
    if (workspace2ConfirmClose) {
      workspace2ConfirmClose(null);
    }
    closeOverlays();
    return new Promise((resolve) => {
      let settled = false;
      const backdrop = document.createElement("div");
      backdrop.className = "workspace2-confirm-backdrop";
      const dialog = document.createElement("div");
      dialog.className = "workspace2-confirm-dialog";
      dialog.setAttribute("role", "dialog");
      dialog.setAttribute("aria-modal", "true");
      isolateComfyKeys(dialog);
  
      const title = document.createElement("div");
      title.className = "workspace2-confirm-title";
      title.textContent = t("workflows.closeUnsavedTitle");
      const message = document.createElement("div");
      message.className = "workspace2-confirm-message";
      message.textContent = t("workflows.closeUnsavedMessage", { name });
      const actions = document.createElement("div");
      actions.className = "workspace2-confirm-actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "workspace2-confirm-button is-secondary";
      cancel.textContent = t("confirm.cancel");
      const discard = document.createElement("button");
      discard.type = "button";
      discard.className = "workspace2-confirm-button is-danger";
      discard.textContent = t("workflows.closeDiscard");
      const save = document.createElement("button");
      save.type = "button";
      save.className = "workspace2-confirm-button";
      save.textContent = t("workflows.closeSave");
      actions.append(cancel, discard, save);
      dialog.append(title, message, actions);
      backdrop.append(dialog);
  
      const cleanup = (result) => {
        if (settled) {
          return;
        }
        settled = true;
        document.removeEventListener("keydown", onKeydown, true);
        workspace2ConfirmClose = null;
        backdrop.remove();
        resolve(result);
      };
      const onKeydown = (event) => {
        event.stopPropagation();
        if (event.key === "Escape") {
          event.preventDefault();
          cleanup(null);
        }
      };
      workspace2ConfirmClose = cleanup;
      backdrop.addEventListener("pointerdown", (event) => {
        if (event.target === backdrop) {
          cleanup(null);
        }
        event.stopPropagation();
      });
      backdrop.addEventListener("click", (event) => event.stopPropagation());
      dialog.addEventListener("pointerdown", (event) => event.stopPropagation());
      cancel.addEventListener("click", () => cleanup(null));
      discard.addEventListener("click", () => cleanup("discard"));
      save.addEventListener("click", () => cleanup("save"));
      document.addEventListener("keydown", onKeydown, true);
      document.body.append(backdrop);
      setTimeout(() => cancel.focus(), 0);
    });
  }
  
  function workspace2InlineConfirm(anchor, { confirmText = t("confirm.delete"), onConfirm } = {}) {
    if (!anchor || typeof onConfirm !== "function") {
      return;
    }
    if (workspace2InlineConfirmClose) {
      workspace2InlineConfirmClose();
    }
    closeOverlays();
  
    const container = anchor.classList?.contains("workspace2-actions")
      ? anchor
      : anchor.closest?.(".workspace2-actions") || anchor.closest?.(".workspace2-root-row") || anchor.parentElement;
    if (!container) {
      return;
    }
    const replaceActions = container.classList?.contains("workspace2-actions");
    const replaceRootRowControl = container.classList?.contains("workspace2-root-row");
    const originalChildren = (replaceActions || replaceRootRowControl) ? Array.from(container.childNodes) : [];
    const inline = document.createElement("span");
    inline.className = "workspace2-inline-confirm";
    isolateComfyKeys(inline);
  
    const cancel = document.createElement("button");
    cancel.type = "button";
    cancel.className = "workspace2-inline-confirm-button";
    cancel.textContent = t("confirm.cancel");
    const confirm = document.createElement("button");
    confirm.type = "button";
    confirm.className = "workspace2-inline-confirm-button is-danger";
    confirm.textContent = confirmText;
    inline.append(cancel, confirm);
  
    const cleanup = () => {
      if (workspace2InlineConfirmClose !== cleanup) {
        return;
      }
      workspace2InlineConfirmClose = null;
      if (!container.isConnected) {
        return;
      }
      if (replaceActions || replaceRootRowControl) {
        container.replaceChildren(...originalChildren);
      } else {
        inline.remove();
      }
    };
    workspace2InlineConfirmClose = cleanup;
    cancel.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      cleanup();
    });
    confirm.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      cleanup();
      await onConfirm();
    });
    inline.addEventListener("pointerdown", (event) => event.stopPropagation());
    inline.addEventListener("click", (event) => event.stopPropagation());
  
    if (replaceActions) {
      container.replaceChildren(inline);
    } else if (replaceRootRowControl) {
      container.replaceChildren(originalChildren[0], inline);
    } else {
      container.append(inline);
    }
  }

  return {
    workspace2Confirm,
    workspace2Notice,
    workspace2ConfirmDirtyWorkflowClose,
    workspace2InlineConfirm,
  };
}
