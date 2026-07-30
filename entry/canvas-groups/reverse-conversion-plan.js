import { validateWorkspaceKitGroupConversionArchive } from "./conversion-archive.js";

const clone = value => JSON.parse(JSON.stringify(value));

const DEFAULT_STYLE = Object.freeze({
    fontSize: 14,
    colorHue: 48,
    colorSat: 100,
    colorLit: 55,
    useUnifiedColor: false,
    effect: "none",
    effectSpeed: 3,
    borderWidth: 2,
    borderOpacity: 0.65,
    cornerRadius: 8,
    shadowSize: 0,
    shadowColor: "#000000",
    contentPadding: 12,
    headerBgColor: "rgba(0,0,0,0.25)",
    backgroundFillEnabled: false,
    backgroundOpacity: 0.125,
    titleColor: "#FFD700",
});

const nativeBounds = group => {
    const bounds = group?.bounds || group?.bounding;
    if (Array.isArray(bounds) && bounds.length >= 4) {
        const [x, y, w, h] = bounds.map(Number);
        if ([x, y, w, h].every(Number.isFinite) && w > 0 && h > 0) return { x, y, w, h };
    }
    if (bounds && typeof bounds === "object") {
        const { x, y, w, h } = bounds;
        if ([x, y, w, h].every(value => Number.isFinite(Number(value))) && Number(w) > 0 && Number(h) > 0) {
            return { x: Number(x), y: Number(y), w: Number(w), h: Number(h) };
        }
    }
    if (Array.isArray(group?.pos) && Array.isArray(group?.size) && group.pos.length >= 2 && group.size.length >= 2) {
        const [x, y] = group.pos.map(Number);
        const [w, h] = group.size.map(Number);
        if ([x, y, w, h].every(Number.isFinite) && w > 0 && h > 0) return { x, y, w, h };
    }
    return null;
};

const uniqueId = (nativeId, usedIds) => {
    const base = `native_${String(nativeId)}`;
    let candidate = base;
    let suffix = 2;
    while (usedIds.has(candidate)) candidate = `${base}_${suffix++}`;
    usedIds.add(candidate);
    return candidate;
};

/**
 * Build, but do not apply, a reverse-conversion plan.
 *
 * Geometry, title and node membership come from the current native group.
 * A matching previous WorkspaceKit group only contributes presentation and
 * execution metadata. Native groups created after the forward conversion get
 * the same default style as a newly created WorkspaceKit group.
 */
export function createNativeToWorkspaceKitConversionPlan({ archive, nativeGroupIds, nativeGroups, reservedIds }) {
    if (!Array.isArray(nativeGroups) || !nativeGroups.length) {
        throw new Error("Cannot restore WorkspaceKit groups: no native groups exist");
    }
    const archiveCheck = archive ? validateWorkspaceKitGroupConversionArchive(archive) : { valid: true };
    if (!archiveCheck.valid) throw new Error(`Cannot restore WorkspaceKit groups: ${archiveCheck.reason}`);
    const archiveGroups = archive?.groups || {};
    const mapping = nativeGroupIds && typeof nativeGroupIds === "object" ? nativeGroupIds : {};

    const archiveByNativeId = new Map(Object.entries(mapping).map(([workspaceKitId, nativeId]) => [String(nativeId), String(workspaceKitId)]));
    // reservedIds lets a mixed-state reverse conversion avoid colliding with
    // WorkspaceKit groups that already exist on the canvas: those ids are seeded
    // as "used" so a freshly minted native_<id> can never overwrite one.
    const usedIds = new Set([
        ...Object.keys(archiveGroups),
        ...(Array.isArray(reservedIds) ? reservedIds.map(String) : []),
    ]);
    const reservedIdSet = new Set(Array.isArray(reservedIds) ? reservedIds.map(String) : []);
    const groups = {};
    const restoredGroupIds = [];
    const newGroupIds = [];

    for (const native of nativeGroups) {
        const bounds = nativeBounds(native);
        if (!bounds) throw new Error(`Cannot restore WorkspaceKit groups: native group ${native?.id ?? "unknown"} has invalid bounds`);
        const mappedId = archiveByNativeId.get(String(native.id));
        // A mapped archive id only applies if it is not already claimed by this
        // plan and not reserved by a live WorkspaceKit group (mixed state);
        // otherwise fall back to a fresh, non-colliding id.
        const archived = mappedId && !groups[mappedId] && !reservedIdSet.has(mappedId) ? archiveGroups[mappedId] : null;
        const id = archived ? String(archived.id) : uniqueId(native.id, usedIds);
        const nodeIds = Array.isArray(native.nodeIds) ? native.nodeIds.map(String) : [];
        groups[id] = {
            ...(archived ? clone(archived) : {}),
            ...(!archived ? DEFAULT_STYLE : {}),
            id,
            title: String(native.title || archived?.title || "Group"),
            nodeIds,
            allowEmpty: nodeIds.length === 0,
            bounds,
            headerBgColor: native.color || archived?.headerBgColor || DEFAULT_STYLE.headerBgColor,
        };
        if (archived) restoredGroupIds.push(id);
        else newGroupIds.push(id);
    }

    return {
        source: "native",
        groups,
        restoredGroupIds,
        newGroupIds,
        archivedGroupIdsWithoutNativeMatch: Object.keys(archiveGroups).filter(id => !restoredGroupIds.includes(id)),
    };
}
