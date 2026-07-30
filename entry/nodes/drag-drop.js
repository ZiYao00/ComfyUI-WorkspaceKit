// Nodes panel drag/drop engine. Owns the pointer/HTML5 drag interactions for
// the Nodes tab: favorite-item drops, favorite/custom-order reordering, node
// group reparenting, dragging a node onto the canvas, and the persistent
// canvas-drop listeners. It holds no library or persistence logic of its own —
// every move, save, render, and canvas-coordinate lookup is injected by
// entry.js. State objects (`nodesState`, `templatesState`) are passed by
// reference because the panel/render code shares the same drag-state fields
// (pointerDrag, reorderDrag, groupDrag, draggingNode, pendingNode,
// suppressClick, renderTarget, canvasDropReady).
//
// Dependencies that entry.js defines *after* this factory runs (renderNodesPanel,
// saveNodeLibrary, the pending-node/canvas helpers, etc.) are injected as
// late-bound thunks so module evaluation never hits their temporal dead zone —
// the same pattern as createTemplateDragDrop.
import {
  COMFY_NODE_DRAG_TYPE,
  FAVORITE_DRAG_TYPE,
  NODE_DEFAULT_GROUP_ID,
  NODE_DRAG_TYPE,
  TEMPLATE_DRAG_TYPE,
} from "../core/constants.js";

export function createNodeDragDrop({
  nodesState,
  templatesState,
  document,
  // Shared visual + escaping helpers (defined once in entry.js).
  setDraggingVisual,
  cssEscape,
  // Canvas helpers deliberately kept in entry.js (they have external callers).
  isCanvasDropTarget,
  canvasPositionFromClient,
  // Store lookups.
  getFavorite,
  isNodeGroupDescendant,
  // Persistence + render (module-scope in entry.js; injected as thunks).
  saveNodeLibrary,
  saveCustomOrder,
  renderNodesPanel,
  renderTemplatesPanel,
  moveFavoriteToGroup,
  moveNodeGroupToParent,
  addFavoriteNode,
  addNodeToCanvas,
  // Pending-node / canvas-preview helpers (stay in entry.js).
  setPendingNode,
  placePendingNodeAt,
  showPendingNodeCanvasPreview,
  hideNodePreview,
  // Template canvas-drop helpers (stay in entry.js / template store).
  setPendingTemplate,
  placePendingTemplateAt,
  showTemplatePreview,
  readDraggedTemplate,
  addTemplateToCanvas,
  recordTemplateUse,
}) {
  function readFavoriteDrag(event) {
    const raw = event.dataTransfer?.getData(FAVORITE_DRAG_TYPE);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function makeFavoriteGroupDropTarget(el, target, groupId, beforeType = "") {
    target.dataset.workspace2FavoriteTarget = groupId;
    target.dataset.workspace2FavoriteBefore = beforeType;
    target.dataset.workspace2GroupTarget = groupId === NODE_DEFAULT_GROUP_ID ? "" : groupId;
    target.addEventListener("dragover", (event) => {
      const dragged = readFavoriteDrag(event);
      if (!dragged?.type) {
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
      const dragged = readFavoriteDrag(event);
      target.classList.remove("is-drop");
      if (!dragged?.type) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      try {
        await moveFavoriteToGroup(el, dragged.type, groupId, beforeType);
      } catch (error) {
        nodesState.error = error.message;
        renderNodesPanel(el);
      }
    });
  }

  function makeFavoriteDragSource(row, favorite) {
    row.dataset.workspace2FavoriteSource = favorite.type;
  }

  function makeNodeCanvasDragSource(row, node) {
    row.draggable = false;
    row.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button,input,.workspace2-reorder-handle")) {
        return;
      }
      event.preventDefault();
      const drag = {
        node: {
          type: node.type,
          title: node.title || node.type,
        },
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        ghost: null,
        onMove: null,
        onUp: null,
        onCancel: null,
      };
      drag.onMove = (moveEvent) => updateNodePointerDrag(moveEvent);
      drag.onUp = (upEvent) => commitNodePointerDrag(upEvent);
      drag.onCancel = () => finishNodePointerDrag();
      nodesState.pointerDrag = drag;
      document.addEventListener("pointermove", drag.onMove, true);
      document.addEventListener("pointerup", drag.onUp, true);
      document.addEventListener("pointercancel", drag.onCancel, true);
      row.setPointerCapture?.(event.pointerId);
    });
  }

  function clearNodeReorderHighlights() {
    document.querySelectorAll(".workspace2-node-row.is-reorder-before, .workspace2-node-row.is-reorder-after").forEach((row) => {
      row.classList.remove("is-reorder-before", "is-reorder-after");
    });
  }

  function finishNodeReorderDrag() {
    const drag = nodesState.reorderDrag;
    if (drag) {
      document.removeEventListener("pointermove", drag.onMove, true);
      document.removeEventListener("pointerup", drag.onUp, true);
      document.removeEventListener("pointercancel", drag.onCancel, true);
      drag.row?.classList.remove("is-reordering");
      drag.ghost?.remove();
    }
    clearNodeReorderHighlights();
    setDraggingVisual(false);
    nodesState.reorderDrag = null;
  }

  function nodeReorderRowAtPoint(clientX, clientY) {
    const previousGhostDisplay = nodesState.reorderDrag?.ghost?.style.display;
    if (nodesState.reorderDrag?.ghost) {
      nodesState.reorderDrag.ghost.style.display = "none";
    }
    const element = document.elementFromPoint(clientX, clientY);
    if (nodesState.reorderDrag?.ghost) {
      nodesState.reorderDrag.ghost.style.display = previousGhostDisplay || "";
    }
    return element?.closest?.(".workspace2-node-row[data-workspace2-node-type]") || null;
  }

  function updateNodeReorderDrag(event) {
    const drag = nodesState.reorderDrag;
    if (!drag) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active && Math.hypot(dx, dy) < 4) {
      return;
    }
    if (!drag.active) {
      drag.active = true;
      nodesState.suppressClick = true;
      setDraggingVisual(true);
      drag.row.classList.add("is-reordering");
      drag.ghost = document.createElement("div");
      drag.ghost.className = "workspace2-drag-ghost";
      drag.ghost.textContent = drag.title;
      document.body.append(drag.ghost);
    }

    event.preventDefault();
    event.stopPropagation();
    drag.ghost.style.left = `${event.clientX + 12}px`;
    drag.ghost.style.top = `${event.clientY + 10}px`;

    clearNodeReorderHighlights();
    const targetRow = nodeReorderRowAtPoint(event.clientX, event.clientY);
    const targetType = targetRow?.dataset.workspace2NodeType || "";
    if (!targetRow || targetType === drag.type) {
      drag.targetType = "";
      drag.placement = "";
      return;
    }
    if (drag.kind === "favorite") {
      if (targetRow.dataset.workspace2FavoriteRegion !== drag.groupId) {
        drag.targetType = "";
        drag.placement = "";
        return;
      }
    } else if (targetRow.dataset.workspace2NodeParentKey !== drag.parentKey) {
      drag.targetType = "";
      drag.placement = "";
      return;
    }

    const rect = targetRow.getBoundingClientRect();
    drag.targetType = targetType;
    drag.placement = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    targetRow.classList.add(drag.placement === "before" ? "is-reorder-before" : "is-reorder-after");
  }

  async function commitNodeReorderDrag(el, event) {
    const drag = nodesState.reorderDrag;
    if (!drag) {
      return;
    }
    updateNodeReorderDrag(event);
    const shouldReorder = drag.active && drag.targetType && drag.placement;
    const sourceType = drag.type;
    const targetType = drag.targetType;
    const placement = drag.placement;
    const groupId = drag.groupId;
    const parentKey = drag.parentKey;
    const kind = drag.kind;
    finishNodeReorderDrag();
    if (!shouldReorder) {
      return;
    }

    if (kind === "favorite") {
      const items = nodesState.library.favorites
        .filter((favorite) => (favorite.groupId || NODE_DEFAULT_GROUP_ID) === groupId)
        .sort((a, b) => a.order - b.order);
      const next = items.filter((favorite) => favorite.type !== sourceType);
      const targetIndex = next.findIndex((favorite) => favorite.type === targetType);
      if (targetIndex === -1) {
        return;
      }
      const source = items.find((favorite) => favorite.type === sourceType);
      if (!source) {
        return;
      }
      next.splice(placement === "before" ? targetIndex : targetIndex + 1, 0, source);
      next.forEach((favorite, index) => {
        favorite.order = index;
      });
      await saveNodeLibrary(el);
      return;
    }

    const rows = [...el.querySelectorAll(`.workspace2-node-row[data-workspace2-node-parent-key="${cssEscape(parentKey)}"]`)];
    const order = rows.map((row) => row.dataset.workspace2NodeType).filter(Boolean);
    const nextOrder = order.filter((type) => type !== sourceType);
    const targetIndex = nextOrder.indexOf(targetType);
    if (targetIndex === -1) {
      return;
    }
    nextOrder.splice(placement === "before" ? targetIndex : targetIndex + 1, 0, sourceType);
    nodesState.customOrder[parentKey] = nextOrder;
    saveCustomOrder(nodesState.customOrder);
    renderNodesPanel(el);
  }

  function beginNodeReorderDrag(el, handle, row, options) {
    handle.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || !nodesState.customOrderEnabled) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const onMove = (moveEvent) => updateNodeReorderDrag(moveEvent);
      const onUp = (upEvent) => {
        commitNodeReorderDrag(el, upEvent).catch((error) => {
          nodesState.error = error.message;
          renderNodesPanel(el);
        });
      };
      const onCancel = () => finishNodeReorderDrag();
      nodesState.reorderDrag = {
        ...options,
        row,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        targetType: "",
        placement: "",
        ghost: null,
        onMove,
        onUp,
        onCancel,
      };
      document.addEventListener("pointermove", onMove, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("pointercancel", onCancel, true);
      handle.setPointerCapture?.(event.pointerId);
    });
  }

  function clearFavoriteDropHighlights() {
    document.querySelectorAll("[data-workspace2-favorite-target].is-drop, [data-workspace2-group-target].is-drop, [data-workspace2-favorite-region].is-drop-region").forEach((target) => {
      target.classList.remove("is-drop", "is-drop-region");
    });
  }

  function highlightFavoriteDropRegion(groupId) {
    document.querySelectorAll(`[data-workspace2-favorite-region="${cssEscape(groupId)}"]`).forEach((target) => {
      target.classList.add("is-drop-region");
    });
  }

  function finishNodePointerDrag() {
    const drag = nodesState.pointerDrag;
    if (drag) {
      document.removeEventListener("pointermove", drag.onMove, true);
      document.removeEventListener("pointerup", drag.onUp, true);
      document.removeEventListener("pointercancel", drag.onCancel, true);
      drag.ghost?.remove();
    }
    clearFavoriteDropHighlights();
    setDraggingVisual(false);
    nodesState.pointerDrag = null;
    nodesState.draggingNode = null;
  }

  function finishNodeGroupPointerDrag() {
    const drag = nodesState.groupDrag;
    if (drag) {
      document.removeEventListener("pointermove", drag.onMove, true);
      document.removeEventListener("pointerup", drag.onUp, true);
      document.removeEventListener("pointercancel", drag.onCancel, true);
      drag.ghost?.remove();
    }
    clearFavoriteDropHighlights();
    setDraggingVisual(false);
    nodesState.groupDrag = null;
  }

  function validNodeGroupDropTarget(draggedGroupId, targetGroupId) {
    const normalizedTarget = targetGroupId && targetGroupId !== NODE_DEFAULT_GROUP_ID ? String(targetGroupId) : "";
    if (!draggedGroupId || draggedGroupId === NODE_DEFAULT_GROUP_ID) {
      return false;
    }
    if (normalizedTarget === draggedGroupId) {
      return false;
    }
    if (normalizedTarget && isNodeGroupDescendant(normalizedTarget, draggedGroupId)) {
      return false;
    }
    return true;
  }

  function findNodeGroupDropTargetAt(event, draggedGroupId) {
    const dropElement = document.elementFromPoint(event.clientX, event.clientY);
    const target = dropElement?.closest?.("[data-workspace2-group-target]");
    if (!target) {
      return null;
    }
    const targetGroupId = target.dataset.workspace2GroupTarget || "";
    if (!validNodeGroupDropTarget(draggedGroupId, targetGroupId)) {
      return null;
    }
    return target;
  }

  function updateNodeGroupPointerDrag(event) {
    const drag = nodesState.groupDrag;
    if (!drag) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active && Math.hypot(dx, dy) < 4) {
      return;
    }
    if (!drag.active) {
      drag.active = true;
      nodesState.suppressClick = true;
      setDraggingVisual(true);
      drag.ghost = document.createElement("div");
      drag.ghost.className = "workspace2-drag-ghost";
      drag.ghost.textContent = drag.group.name;
      document.body.append(drag.ghost);
    }
    event.preventDefault();
    event.stopPropagation();
    drag.ghost.style.left = `${event.clientX + 12}px`;
    drag.ghost.style.top = `${event.clientY + 10}px`;

    clearFavoriteDropHighlights();
    const target = findNodeGroupDropTargetAt(event, drag.group.id);
    if (target) {
      target.classList.add("is-drop");
      highlightFavoriteDropRegion(target.dataset.workspace2GroupTarget || NODE_DEFAULT_GROUP_ID);
    }
    drag.ghost.style.borderColor = target ? "var(--workspace2-accent)" : "var(--border-color, #555)";
  }

  async function commitNodeGroupPointerDrag(event) {
    const drag = nodesState.groupDrag;
    if (!drag) {
      return;
    }
    updateNodeGroupPointerDrag(event);
    const target = findNodeGroupDropTargetAt(event, drag.group.id);
    const targetGroupId = target?.dataset.workspace2GroupTarget || "";
    const shouldMove = drag.active && target;
    finishNodeGroupPointerDrag();
    if (!shouldMove) {
      return;
    }
    try {
      await moveNodeGroupToParent(nodesState.renderTarget, drag.group.id, targetGroupId);
    } catch (error) {
      nodesState.error = error.message;
      if (nodesState.renderTarget) {
        renderNodesPanel(nodesState.renderTarget);
      }
    }
  }

  function makeNodeGroupDragSource(el, header, group) {
    header.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.target.closest("button,input,.workspace2-actions,.workspace2-disclosure")) {
        return;
      }
      const onMove = (moveEvent) => updateNodeGroupPointerDrag(moveEvent);
      const onUp = (upEvent) => commitNodeGroupPointerDrag(upEvent);
      const onCancel = () => finishNodeGroupPointerDrag();
      nodesState.groupDrag = {
        group,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        ghost: null,
        onMove,
        onUp,
        onCancel,
      };
      document.addEventListener("pointermove", onMove, true);
      document.addEventListener("pointerup", onUp, true);
      document.addEventListener("pointercancel", onCancel, true);
      header.setPointerCapture?.(event.pointerId);
    });
  }

  function updateNodePointerDrag(event) {
    const drag = nodesState.pointerDrag;
    if (!drag) {
      return;
    }
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active && Math.hypot(dx, dy) < 4) {
      return;
    }
    if (!drag.active) {
      drag.active = true;
      nodesState.suppressClick = true;
      nodesState.draggingNode = drag.node;
      setDraggingVisual(true);
      drag.ghost = document.createElement("div");
      drag.ghost.className = "workspace2-drag-ghost";
      drag.ghost.textContent = drag.node.title;
      document.body.append(drag.ghost);
    }
    event.preventDefault();
    event.stopPropagation();
    drag.ghost.style.left = `${event.clientX + 12}px`;
    drag.ghost.style.top = `${event.clientY + 10}px`;

    clearFavoriteDropHighlights();
    const dropElement = document.elementFromPoint(event.clientX, event.clientY);
    const favoriteTarget = dropElement?.closest?.("[data-workspace2-favorite-target]");
    if (favoriteTarget) {
      favoriteTarget.classList.add("is-drop");
      highlightFavoriteDropRegion(favoriteTarget.dataset.workspace2FavoriteTarget || NODE_DEFAULT_GROUP_ID);
    }
    drag.ghost.style.borderColor = favoriteTarget || isCanvasDropTarget(dropElement)
      ? "var(--workspace2-accent)"
      : "var(--border-color, #555)";
  }

  async function commitNodePointerDrag(event) {
    const drag = nodesState.pointerDrag;
    if (!drag) {
      return;
    }
    updateNodePointerDrag(event);
    const dropElement = document.elementFromPoint(event.clientX, event.clientY);
    const favoriteTarget = dropElement?.closest?.("[data-workspace2-favorite-target]");
    const shouldFavorite = drag.active && favoriteTarget;
    const shouldCreate = drag.active && !shouldFavorite && isCanvasDropTarget(dropElement);
    const nodeType = drag.node.type;
    const pos = shouldCreate ? canvasPositionFromClient(event.clientX, event.clientY) : null;
    const targetGroupId = favoriteTarget?.dataset.workspace2FavoriteTarget || NODE_DEFAULT_GROUP_ID;
    const beforeType = favoriteTarget?.dataset.workspace2FavoriteBefore || "";
    finishNodePointerDrag();
    if (shouldFavorite) {
      try {
        if (getFavorite(nodeType)) {
          await moveFavoriteToGroup(nodesState.renderTarget, nodeType, targetGroupId, beforeType);
        } else {
          await addFavoriteNode(nodesState.renderTarget, drag.node, targetGroupId, beforeType);
        }
      } catch (error) {
        nodesState.error = error.message;
        if (nodesState.renderTarget) {
          renderNodesPanel(nodesState.renderTarget);
        }
      }
      return;
    }
    if (!shouldCreate) {
      return;
    }
    try {
      await addNodeToCanvas(nodesState.renderTarget, nodeType, pos);
    } catch (error) {
      nodesState.error = error.message;
      if (nodesState.renderTarget) {
        renderNodesPanel(nodesState.renderTarget);
      }
    }
  }

  function readDraggedNode(event) {
    const raw = event.dataTransfer?.getData(NODE_DRAG_TYPE);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return nodesState.draggingNode;
      }
    }
    const comfyNodeType = event.dataTransfer?.getData(COMFY_NODE_DRAG_TYPE);
    if (comfyNodeType) {
      return { type: comfyNodeType, title: comfyNodeType };
    }
    return nodesState.draggingNode;
  }

  function setupNodeCanvasDrop() {
    if (nodesState.canvasDropReady) {
      return;
    }
    nodesState.canvasDropReady = true;

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && templatesState.pendingTemplate) {
        event.stopPropagation();
        setPendingTemplate(null);
        return;
      }
      if (event.key === "Escape" && nodesState.pendingNode) {
        event.stopPropagation();
        setPendingNode(null);
      }
    }, true);

    document.addEventListener("click", async (event) => {
      if (templatesState.pendingTemplate && isCanvasDropTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        try {
          await placePendingTemplateAt(event.clientX, event.clientY);
        } catch (error) {
          templatesState.error = error.message;
          if (templatesState.renderTarget) {
            renderTemplatesPanel(templatesState.renderTarget);
          }
        }
        return;
      }
      if (!nodesState.pendingNode || !isCanvasDropTarget(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      try {
        await placePendingNodeAt(event.clientX, event.clientY);
      } catch (error) {
        nodesState.error = error.message;
        if (nodesState.renderTarget) {
          renderNodesPanel(nodesState.renderTarget);
        }
      }
    }, true);

    document.addEventListener("mousemove", (event) => {
      if (templatesState.pendingTemplate) {
        if (!isCanvasDropTarget(event.target)) {
          hideNodePreview();
          return;
        }
        showTemplatePreview(templatesState.pendingTemplate, event, { followCursor: true });
        return;
      }
      if (!nodesState.pendingNode) {
        return;
      }
      if (!isCanvasDropTarget(event.target)) {
        hideNodePreview();
        return;
      }
      showPendingNodeCanvasPreview(event);
    }, true);

    document.addEventListener("dragover", (event) => {
      const transferTypes = Array.from(event.dataTransfer?.types || []);
      const hasTemplate = templatesState.draggingTemplate || transferTypes.includes(TEMPLATE_DRAG_TYPE);
      if ((!nodesState.draggingNode && !hasTemplate) || !isCanvasDropTarget(event.target)) {
        return;
      }
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    });

    document.addEventListener("drop", async (event) => {
      const template = readDraggedTemplate(event);
      if (template && isCanvasDropTarget(event.target)) {
        event.preventDefault();
        event.stopPropagation();
        const pos = canvasPositionFromClient(event.clientX, event.clientY);
        try {
          await addTemplateToCanvas(template, pos);
          await recordTemplateUse(templatesState.renderTarget, template.id);
        } catch (error) {
          templatesState.error = error.message;
          if (templatesState.renderTarget) {
            renderTemplatesPanel(templatesState.renderTarget);
          }
        } finally {
          templatesState.draggingTemplate = null;
        }
        return;
      }
      const dragged = readDraggedNode(event);
      if (!dragged || !isCanvasDropTarget(event.target)) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      const pos = canvasPositionFromClient(event.clientX, event.clientY);
      try {
        await addNodeToCanvas(nodesState.renderTarget, dragged.type, pos);
      } catch (error) {
        nodesState.error = error.message;
        if (nodesState.renderTarget) {
          renderNodesPanel(nodesState.renderTarget);
        }
      } finally {
        nodesState.draggingNode = null;
      }
    });
  }

  return {
    readFavoriteDrag,
    makeFavoriteGroupDropTarget,
    makeFavoriteDragSource,
    makeNodeCanvasDragSource,
    beginNodeReorderDrag,
    clearFavoriteDropHighlights,
    highlightFavoriteDropRegion,
    finishNodePointerDrag,
    finishNodeGroupPointerDrag,
    validNodeGroupDropTarget,
    findNodeGroupDropTargetAt,
    updateNodeGroupPointerDrag,
    commitNodeGroupPointerDrag,
    makeNodeGroupDragSource,
    updateNodePointerDrag,
    commitNodePointerDrag,
    readDraggedNode,
    setupNodeCanvasDrop,
  };
}
