// Reflection-based compatibility bridge into the official ComfyUI frontend:
// locate its Vue app, node objects, preview/library DOM, and native favorites,
// then import WorkspaceKit favorites into the official favorites store. No UI
// rendering of its own; pure detection + one import action. The globalThis
// __workspace2* assignments are console-inspection debug hooks (no readers).
//
// Injected deps use the original identifier names so the moved bodies are
// verbatim: nodesState (shared mutable — officialAdapter / officialFavoritesProbe
// are also written by the caller), t (translation), limitedKeys / valueAtPath
// (shared reflection utils that stay in entry.js), loadNodeLibrary and
// renderNodesPanel (callbacks for the import action). app / fetchJson / postJson
// / OFFICIAL_NODE_ADAPTER_KEY are stable leaf-module imports.
import { app } from "../../../scripts/app.js";
import { fetchJson, postJson } from "../core/api.js";
import { OFFICIAL_NODE_ADAPTER_KEY } from "../core/constants.js";

export function createOfficialNodeAdapter({
  nodesState,
  t,
  limitedKeys,
  valueAtPath,
  loadNodeLibrary,
  renderNodesPanel,
}) {
  function findOfficialVueApp() {
    const candidates = [
      ["app.vueApp", app?.vueApp],
      ["app._vueApp", app?._vueApp],
      ["app.ui.vueApp", app?.ui?.vueApp],
      ["app.extensionManager.vueApp", app?.extensionManager?.vueApp],
      ["#app.__vue_app__", document.querySelector("#app")?.__vue_app__],
      ["body.__vue_app__", document.body?.__vue_app__],
    ];
    return candidates
      .filter(([, value]) => Boolean(value))
      .map(([path, value]) => ({
        path,
        keys: limitedKeys(value),
        hasContext: Boolean(value?._context),
        contextKeys: limitedKeys(value?._context),
        providesKeys: limitedKeys(value?._context?.provides),
      }));
  }
  
  function findOfficialNodeObjects() {
    const candidatePaths = [
      "nodeDefStore",
      "nodeStore",
      "nodeLibrary",
      "nodeLibraryService",
      "nodeOrganizationService",
      "extensionManager.nodeDefStore",
      "extensionManager.nodeStore",
      "extensionManager.nodeLibrary",
      "extensionManager.nodeLibraryService",
      "extensionManager.nodeOrganizationService",
      "ui.nodeDefStore",
      "ui.nodeStore",
      "ui.nodeLibrary",
      "ui.nodeLibraryService",
      "ui.nodeOrganizationService",
    ];
    const found = [];
    for (const path of candidatePaths) {
      const value = valueAtPath(app, path);
      if (!value) {
        continue;
      }
      found.push({
        path: `app.${path}`,
        keys: limitedKeys(value),
        nodeKeys: limitedKeys(value, /node|sort|organ/i),
        hasGetSortingStrategies: typeof value.getSortingStrategies === "function",
        hasOrganizeNodesByTab: typeof value.organizeNodesByTab === "function",
        hasBuildNodeDefTree: typeof value.buildNodeDefTree === "function",
      });
    }
    return found;
  }
  
  function findOfficialNodePreviewContainers() {
    const selectors = [
      "#node-library-node-preview-container",
      "[id*='node-preview']",
      "[class*='node-preview']",
    ];
    return selectors.map((selector) => ({
      selector,
      count: document.querySelectorAll(selector).length,
    }));
  }
  
  function findOfficialNodeLibraryDom() {
    const selectors = [
      "[role='tree']",
      "[role='treeitem']",
      "[id*='node-library']",
      "[class*='node-library']",
    ];
    return selectors.map((selector) => ({
      selector,
      count: document.querySelectorAll(selector).length,
    }));
  }
  
  function detectOfficialNodeAdapter() {
    const extensionManager = app?.extensionManager;
    const adapter = {
      checkedAt: new Date().toISOString(),
      available: false,
      reason: "",
      appKeys: limitedKeys(app, /node|vue|store|library|extension|sidebar|workflow/i, 60),
      extensionManagerKeys: limitedKeys(extensionManager, /node|vue|store|library|sidebar|tab|workflow|setting/i, 80),
      vueApps: findOfficialVueApp(),
      nodeObjects: findOfficialNodeObjects(),
      previewContainers: findOfficialNodePreviewContainers(),
      nodeLibraryDom: findOfficialNodeLibraryDom(),
      globalNodeKeys: limitedKeys(globalThis, /comfy|node|vue|pinia|litegraph/i, 80),
    };
    adapter.hasNodeOrganizationService = adapter.nodeObjects.some((item) => item.hasOrganizeNodesByTab || item.hasGetSortingStrategies);
    adapter.hasVueAppContext = adapter.vueApps.some((item) => item.hasContext);
    adapter.hasPreviewContainer = adapter.previewContainers.some((item) => item.count > 0);
    adapter.hasNodeLibraryDom = adapter.nodeLibraryDom.some((item) => item.count > 0);
    adapter.available = adapter.hasNodeOrganizationService || adapter.hasVueAppContext || adapter.hasPreviewContainer;
    adapter.reason = adapter.available
      ? "Official frontend runtime objects were found. Inspect nodeObjects/vueApps before binding to them."
      : adapter.hasNodeLibraryDom
        ? "Official node-library DOM was found, but no stable service, Vue context, or preview container is exposed."
        : "No stable official node-library runtime object was found from Workspace2 setup.";
    nodesState.officialAdapter = adapter;
    globalThis.__workspace2OfficialNodeAdapter = adapter;
    globalThis.__workspace2ProbeOfficialNodeAdapter = detectOfficialNodeAdapter;
    try {
      localStorage.setItem(OFFICIAL_NODE_ADAPTER_KEY, JSON.stringify(adapter));
    } catch {
      // Ignore storage failures; the global debug object is the primary probe result.
    }
    console.info("[Workspace2] official node adapter probe", adapter);
    return adapter;
  }
  
  function summarizeOfficialFavoriteValue(value) {
    if (Array.isArray(value)) {
      const strings = value.filter((item) => typeof item === "string");
      return {
        type: "array",
        count: value.length,
        stringCount: strings.length,
        sample: strings.slice(0, 20),
        looksLikeNodeList: strings.length === value.length,
      };
    }
    if (value && typeof value === "object") {
      return {
        type: "object",
        keys: Object.keys(value).slice(0, 30),
        count: Object.keys(value).length,
      };
    }
    return {
      type: typeof value,
      value: String(value).slice(0, 160),
    };
  }
  
  function findLocalOfficialFavoriteCandidates() {
    const candidates = [];
    const patterns = [/node.*bookmark/i, /bookmark.*node/i, /node.*favorite/i, /favorite.*node/i, /node.*pinned/i, /pinned.*node/i];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key || !patterns.some((pattern) => pattern.test(key))) {
        continue;
      }
      const raw = localStorage.getItem(key) || "";
      let parsed = null;
      try {
        parsed = JSON.parse(raw);
      } catch {}
      candidates.push({
        key,
        storage: "localStorage",
        rawLength: raw.length,
        summary: summarizeOfficialFavoriteValue(parsed ?? raw),
      });
    }
    return candidates;
  }
  
  async function detectOfficialFavoritesProbe() {
    const probe = {
      checkedAt: new Date().toISOString(),
      localStorage: findLocalOfficialFavoriteCandidates(),
      backend: null,
      runtime: {
        appKeys: limitedKeys(app, /favorite|bookmark|node|library|store/i, 80),
        extensionManagerKeys: limitedKeys(app?.extensionManager, /favorite|bookmark|node|library|store/i, 80),
      },
    };
    try {
      const response = await fetchJson("/workspace2/nodes/official-favorites/probe");
      probe.backend = response.probe || null;
    } catch (error) {
      probe.backend = {
        error: error.message,
        note: "Backend route may require restarting ComfyUI after installing this probe.",
      };
    }
    probe.found = Boolean(probe.localStorage.length || probe.backend?.found);
    globalThis.__workspace2OfficialFavoritesProbe = probe;
    globalThis.__workspace2ProbeOfficialFavorites = detectOfficialFavoritesProbe;
    console.info("[Workspace2] official favorites probe", probe);
    return probe;
  }
  
  function isOfficialFavoriteFolderMarker(value) {
    return typeof value === "string" && value.trim().endsWith("/");
  }
  
  function collectOfficialFavoritesFromProbe(probe) {
    const seen = new Set();
    const items = [];
    const groups = [];
    const add = (value) => {
      if (typeof value !== "string") {
        return;
      }
      const nodeType = value.trim();
      if (!nodeType || isOfficialFavoriteFolderMarker(nodeType) || seen.has(nodeType)) {
        return;
      }
      seen.add(nodeType);
      items.push(nodeType);
    };
    const addList = (items) => {
      if (!Array.isArray(items)) {
        return;
      }
      for (const item of items) {
        add(item);
      }
    };
  
    for (const item of probe?.localStorage || []) {
      addList(item?.sample);
      addList(item?.nodes);
    }
    for (const file of probe?.backend?.files || []) {
      for (const match of file?.matches || []) {
        addList(match?.summary?.nodes);
        if (match?.summary?.looksLikeNodeList) {
          addList(match?.summary?.sample);
        }
        if (Array.isArray(match?.summary?.groups)) {
          groups.push(...match.summary.groups);
        }
      }
    }
    return { items, groups };
  }
  
  function resolveOfficialFavoriteType(rawType, nodeMap) {
    const value = String(rawType || "").trim();
    if (!value || isOfficialFavoriteFolderMarker(value)) {
      return "";
    }
    if (nodeMap.has(value)) {
      return value;
    }
    const leaf = value.split("/").filter(Boolean).pop() || value;
    return nodeMap.has(leaf) ? leaf : value;
  }
  
  function collectOfficialFavoriteImportItems(officialFavorites, nodeMap) {
    const items = [];
    const seen = new Set();
    const add = (rawType, groupName = "") => {
      const nodeType = resolveOfficialFavoriteType(rawType, nodeMap);
      if (!nodeType || seen.has(nodeType)) {
        return;
      }
      seen.add(nodeType);
      items.push({
        type: nodeType,
        rawType: String(rawType || ""),
        groupName: String(groupName || "").trim(),
      });
    };
    for (const group of officialFavorites.groups || []) {
      for (const rawType of group.nodes || []) {
        add(rawType, group.name);
      }
    }
    for (const rawType of officialFavorites.items || []) {
      add(rawType, "");
    }
    return items;
  }
  
  async function importWorkspace2FavoritesToOfficial(el) {
    if (!nodesState.library) {
      await loadNodeLibrary();
    }
    const groupCount = Math.max(0, (nodesState.library?.groups || []).length - 1);
    const nodeCount = (nodesState.library?.favorites || []).length;
    if (!nodeCount) {
      alert(t("nodes.noFavoritesToExport"));
      return;
    }
    if (!confirm(t("nodes.confirmImportWorkspace2ToOfficial", { groups: groupCount, nodes: nodeCount }))) {
      return;
    }
    const result = await postJson("/workspace2/nodes/official-favorites/import_from_workspace2", {});
    alert(t("nodes.importWorkspace2ToOfficialDone", {
      groups: result.groupCount || 0,
      nodes: result.nodeCount || 0,
    }));
    nodesState.officialFavoritesProbe = null;
    await detectOfficialFavoritesProbe();
    renderNodesPanel(el);
  }

  return {
    detectOfficialNodeAdapter,
    detectOfficialFavoritesProbe,
    collectOfficialFavoritesFromProbe,
    collectOfficialFavoriteImportItems,
    importWorkspace2FavoritesToOfficial,
  };
}
