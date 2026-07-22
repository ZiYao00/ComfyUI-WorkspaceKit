import { app } from "../../../scripts/app.js";

// P0 compatibility bridge for rgthree-comfy Fast Groups Muter/Bypasser.
//
// WorkspaceKit groups are DOM overlays stored in `extra.xzgGroups`; they are
// deliberately not LiteGraph `LGraphGroup` instances. Adding fake groups to
// `graph._groups` would make ComfyUI draw and serialize duplicate native boxes.
// Instead, this bridge decorates rgthree's FastGroupsService return value with
// short-lived adapter objects. The adapters expose only the fields rgthree's
// widgets use and resolve membership from WorkspaceKit's explicit `nodeIds`.
//
// Do not use this bridge as a general rgthree group API. Features that inspect
// `graph._groups` directly still intentionally see native LiteGraph groups only.

const RGTHREE_SERVICE_URL = "/extensions/rgthree-comfy/services/fast_groups_service.js";
const ADAPTER_MARK = "__workspaceKitRgthreeFastGroup";

const finiteNumber = (value, fallback) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

function hslToHex(hue, saturation, lightness) {
  const h = ((finiteNumber(hue, 48) % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, finiteNumber(saturation, 100))) / 100;
  const l = Math.max(0, Math.min(100, finiteNumber(lightness, 55))) / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const segment = h / 60;
  const x = chroma * (1 - Math.abs((segment % 2) - 1));
  const [r, g, b] = segment < 1 ? [chroma, x, 0]
    : segment < 2 ? [x, chroma, 0]
      : segment < 3 ? [0, chroma, x]
        : segment < 4 ? [0, x, chroma]
          : segment < 5 ? [x, 0, chroma]
            : [chroma, 0, x];
  const offset = l - chroma / 2;
  const toHex = (component) => Math.round((component + offset) * 255)
    .toString(16)
    .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function readGroupBounds(group) {
  const bounds = group?.bounds || {};
  return [
    finiteNumber(bounds.x, 0),
    finiteNumber(bounds.y, 0),
    Math.max(1, finiteNumber(bounds.w, 220)),
    Math.max(1, finiteNumber(bounds.h, 120)),
  ];
}

function graphNodes(graph) {
  if (Array.isArray(graph?._nodes)) return graph._nodes;
  if (Array.isArray(graph?.nodes)) return graph.nodes;
  return [];
}

function refreshAdapterMembers(adapter) {
  const ids = new Set((adapter.__workspaceKitNodeIds || []).map((id) => String(id)));
  const nodes = graphNodes(adapter.graph).filter((node) => ids.has(String(node?.id)));
  adapter._children.clear();
  adapter.nodes.length = 0;
  for (const node of nodes) {
    adapter._children.add(node);
    adapter.nodes.push(node);
  }
  const alwaysMode = globalThis.LiteGraph?.ALWAYS ?? 0;
  adapter.rgthree_hasAnyActiveNode = nodes.some((node) => node?.mode === alwaysMode);
}

function createAdapter(groupId) {
  const adapter = {
    [ADAPTER_MARK]: true,
    __workspaceKitGroupId: groupId,
    __workspaceKitNodeIds: [],
    title: "",
    color: "#f4c542",
    graph: null,
    _pos: [0, 0],
    _size: [220, 120],
    _bounding: [0, 0, 220, 120],
    pos: [0, 0],
    size: [220, 120],
    _children: new Set(),
    nodes: [],
    rgthree_hasAnyActiveNode: false,
    recomputeInsideNodes() {
      refreshAdapterMembers(this);
    },
  };
  return adapter;
}

function updateAdapter(adapter, group, graph) {
  const [x, y, width, height] = readGroupBounds(group);
  adapter.title = String(group?.title || "WorkspaceKit Group");
  adapter.color = hslToHex(group?.colorHue, group?.colorSat, group?.colorLit);
  adapter.graph = graph;
  adapter.__workspaceKitNodeIds = Array.isArray(group?.nodeIds) ? group.nodeIds : [];
  adapter._pos = [x, y];
  adapter._size = [width, height];
  adapter._bounding = [x, y, width, height];
  adapter.pos = adapter._pos;
  adapter.size = adapter._size;
  refreshAdapterMembers(adapter);
}

/**
 * Installs an inert-when-absent bridge into rgthree's FastGroupsService.
 * Returns a small diagnostics surface for runtime verification; it does not
 * expose or modify WorkspaceKit's execution-mode snapshots.
 */
export function installRgthreeFastGroupsBridge(canvasGroups) {
  const state = {
    attempts: 0,
    status: "waiting",
    service: null,
    adapters: new Map(),
  };

  const diagnostics = {
    getDiagnostics() {
      return {
        status: state.status,
        attempts: state.attempts,
        adapterCount: state.adapters.size,
        adapters: [...state.adapters.values()].map((adapter) => ({
          id: adapter.__workspaceKitGroupId,
          title: adapter.title,
          nodeCount: adapter.nodes.length,
          active: adapter.rgthree_hasAnyActiveNode,
          color: adapter.color,
        })),
      };
    },
  };
  window.WorkspaceKitRgthreeFastGroups = diagnostics;

  const syncAdapters = (graph) => {
    if (graph !== app?.graph) return [];

    const activeIds = new Set();
    for (const group of Object.values(canvasGroups?.groups || {})) {
      if (!group?.id) continue;
      const id = String(group.id);
      activeIds.add(id);
      const adapter = state.adapters.get(id) || createAdapter(id);
      updateAdapter(adapter, group, graph);
      state.adapters.set(id, adapter);
    }
    for (const id of state.adapters.keys()) {
      if (!activeIds.has(id)) state.adapters.delete(id);
    }
    return [...state.adapters.values()];
  };

  const patchService = (service) => {
    if (!service || typeof service.getGroupsUnsorted !== "function") {
      state.status = "service-unavailable";
      return false;
    }
    if (service.__workspaceKitFastGroupsBridge) {
      state.status = "already-installed";
      state.service = service;
      return true;
    }

    const originalGetGroupsUnsorted = service.getGroupsUnsorted.bind(service);
    service.getGroupsUnsorted = function workspaceKitGetGroupsUnsorted(now) {
      const nativeGroups = originalGetGroupsUnsorted(now) || [];
      const graph = app?.canvas?.getCurrentGraph?.() ?? app?.graph;
      const adapters = syncAdapters(graph);
      return adapters.length ? [...nativeGroups, ...adapters] : nativeGroups;
    };
    service.__workspaceKitFastGroupsBridge = true;
    state.service = service;
    state.status = "installed";
    console.info("[WorkspaceKit] rgthree Fast Groups bridge installed");
    return true;
  };

  const tryInstall = async () => {
    state.attempts += 1;
    try {
      const response = await fetch(RGTHREE_SERVICE_URL, { method: "HEAD", cache: "no-store" });
      if (!response.ok) {
        state.status = "rgthree-not-installed";
        return;
      }
      const module = await import(RGTHREE_SERVICE_URL);
      if (patchService(module?.SERVICE)) return;
    } catch (error) {
      state.status = "retrying";
      console.debug("[WorkspaceKit] rgthree Fast Groups bridge unavailable", error);
    }
    if (state.attempts < 12) setTimeout(tryInstall, 500);
  };

  void tryInstall();
  return diagnostics;
}
