import { createPanelUiPrimitives } from "../ui-kit/primitives.js";

// Shared panel header/search DOM. Callers retain query state and decide what a
// search input changes. IME composition is handled here so Workflows, Nodes,
// Templates, and Groups do not drift into inconsistent search behavior.
export function createPanelChrome({ document, translate, iconSvg, prepareInput }) {
  const productUi = createPanelUiPrimitives(document);
  const createPanelHeader = (titleText, statusText, options = {}) => {
    return productUi.createModuleHeader({
      title: titleText,
      status: statusText,
      statusDataset: options.statusDataset,
    }).element;
  };

  const createSearchToolbar = ({ focusKey, placeholder, value, onInput, buttons = [] }) => {
    const toolbar = document.createElement("div");
    toolbar.className = "workspace2-toolbar";
    toolbar.style.setProperty("--workspace2-toolbar-actions", String(buttons.length));
    const searchWrap = document.createElement("div");
    searchWrap.className = "workspace2-search-wrap";
    const search = document.createElement("input");
    search.className = "workspace2-input";
    search.dataset.workspace2Focus = focusKey;
    search.placeholder = placeholder;
    search.value = value;
    prepareInput(search);
    search.addEventListener("click", (event) => event.stopPropagation());

    const clear = document.createElement("button");
    clear.type = "button";
    clear.className = "workspace2-search-clear";
    clear.title = translate("search.clear");
    clear.setAttribute("aria-label", translate("search.clear"));
    clear.append(iconSvg("x"));
    const updateClear = () => { clear.hidden = !search.value; };
    const emitInput = () => {
      updateClear();
      onInput(search.value);
    };
    const clearSearch = () => {
      if (!search.value) return false;
      search.value = "";
      emitInput();
      search.focus();
      return true;
    };
    // WorkspaceKit's global capture-phase key isolation runs before an input's
    // own keydown listener. Expose this narrowly-scoped callback so that layer
    // can consume Escape without allowing ComfyUI's global Escape handling to
    // close the panel before the local clear action runs.
    search.workspace2ClearSearch = () => (isComposing ? false : clearSearch());
    let isComposing = false;
    search.addEventListener("compositionstart", () => { isComposing = true; });
    search.addEventListener("compositionend", () => {
      isComposing = false;
      emitInput();
    });
    search.addEventListener("input", (event) => {
      updateClear();
      if (isComposing || event.isComposing) return;
      emitInput();
    });
    search.addEventListener("keydown", (event) => {
      // Let an active IME own Escape. Otherwise Escape is the keyboard
      // equivalent of the visible clear button and must not reach ComfyUI.
      if (event.key !== "Escape" || isComposing || !clearSearch()) return;
      event.preventDefault();
      event.stopPropagation();
    });
    clear.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    clear.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      clearSearch();
      search.focus();
    });
    updateClear();
    searchWrap.append(search, clear);
    toolbar.append(searchWrap, ...buttons);
    return toolbar;
  };

  return { createPanelHeader, createSearchToolbar };
}
