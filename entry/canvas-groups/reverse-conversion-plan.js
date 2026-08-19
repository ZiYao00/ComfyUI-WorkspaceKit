import { validateWorkspaceKitGroupConversionArchive } from "./conversion-archive.js";

const clone = value => JSON.parse(JSON.stringify(value));

/*
 * T-044: a native group converted to WorkspaceKit gets its title bar at the
 * opacity cap (0.5).
 *
 * A native group paints one solid colour across its whole body, so at WK's
 * default 0.25 the converted frame reads as a washed-out version of what the
 * user just had. The cap is the closest WK can come to native's solidity while
 * keeping the frame translucent enough to see nodes through.
 */
const CONVERTED_HEADER_OPACITY = 0.5;

const DEFAULT_STYLE = Object.freeze({
    fontSize: 16,
    colorHue: 48,
    colorSat: 100,
    colorLit: 55,
    useUnifiedColor: false,
    effect: "none",
    effectSpeed: 3,
    borderWidth: 2,
    borderOpacity: 0.4,
    cornerRadius: 8,
    shadowSize: 0,
    shadowColor: "#000000",
    contentPadding: 12,
    headerBgColor: "rgba(0,0,0,0.25)",
    backgroundFillEnabled: false,
    backgroundOpacity: 0.125,
    titleColor: "#F2F2F2",
});

/*
 * T-045: the look a native-origin group lands on.
 *
 * A native group carries only a colour, a title and geometry — it has no font
 * colour, border or effect to preserve. So rather than inheriting WK's generic
 * DEFAULT_STYLE is the user-approved landing style for native-origin groups:
 * 16px near-white title and matching 2px border at 40% opacity.  The native
 * colour remains the title-bar colour, so the converted group still identifies
 * with the native group it came from.
 *
 * White is expressed as HSL saturation 0 / lightness 100 because the border
 * colour is stored as hue/sat/lit, not a hex. `useUnifiedColor: true` is what
 * makes the border follow the title colour, so both end up near-white together.
 * Setting the title colour alone would leave the old HSL border colour behind.
 *
 * This applies ONLY to groups with no archive entry. A group that was WK before,
 * converted to native and is now coming back has its own saved style in the
 * archive, and restoring that is the whole point of the round trip.
 */
const CONVERTED_STYLE = Object.freeze({
    ...DEFAULT_STYLE,
    useUnifiedColor: true,
    titleColor: "#F2F2F2",
    colorSat: 0,
    colorLit: 95,
    borderWidth: 2,
});

// Native groups carry a solid hex `color`. Convert it to the rgba title bar WK
// renders, pinned to the conversion opacity. An unparseable or missing colour
// falls through to the caller's own fallback.
const convertedHeaderBgColor = (nativeColor) => {
    const raw = String(nativeColor || "").trim().toLowerCase();
    const match = raw.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (!match) return null;
    const body = match[1].length === 3
        ? [...match[1]].map(channel => channel + channel).join("")
        : match[1];
    const r = parseInt(body.slice(0, 2), 16);
    const g = parseInt(body.slice(2, 4), 16);
    const b = parseInt(body.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${CONVERTED_HEADER_OPACITY})`;
};

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
            ...(!archived ? CONVERTED_STYLE : {}),
            id,
            title: String(native.title || archived?.title || "Group"),
            nodeIds,
            allowEmpty: nodeIds.length === 0,
            bounds,
            headerBgColor: convertedHeaderBgColor(native.color)
                || archived?.headerBgColor
                || DEFAULT_STYLE.headerBgColor,
            nativeGroupColor: native.color || archived?.nativeGroupColor || null,
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
