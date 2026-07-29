import { validateWorkspaceKitGroupConversionArchive } from "./conversion-archive.js";

/**
 * Pure post-condition validation for WorkspaceKit -> native group conversion.
 *
 * Keeping this separate from LiteGraph and the DOM makes the transaction's
 * success boundary testable: a conversion is successful only when every
 * required persisted and in-memory result is present together.
 */
export function validateNativeGroupConversionResult({
    nativeGroups,
    originalNativeGroups,
    sourceGroupIds,
    nativeGroupIds,
    representation,
    archive,
    workspaceKitGroupCount,
    persistedWorkspaceKitGroupCount,
    staleNodeMarkerCount,
}) {
    const currentNativeGroups = Array.isArray(nativeGroups) ? nativeGroups : [];
    const existingNativeGroups = Array.isArray(originalNativeGroups) ? originalNativeGroups : [];
    const sourceIds = (sourceGroupIds || []).map(String);
    const mapping = nativeGroupIds && typeof nativeGroupIds === "object" ? nativeGroupIds : {};
    const archiveCheck = validateWorkspaceKitGroupConversionArchive(archive);

    if (!archiveCheck.valid) return { valid: false, reason: `invalid archive: ${archiveCheck.reason}` };
    if (representation !== "native") return { valid: false, reason: "representation was not set to native" };
    if (Number(workspaceKitGroupCount || 0) !== 0) return { valid: false, reason: "WorkspaceKit groups remain in memory" };
    if (Number(persistedWorkspaceKitGroupCount || 0) !== 0) return { valid: false, reason: "WorkspaceKit groups remain in workflow data" };
    if (Number(staleNodeMarkerCount || 0) !== 0) return { valid: false, reason: "stale WorkspaceKit node markers remain" };
    if (sourceIds.length !== Object.keys(mapping).length || sourceIds.some(id => mapping[id] === undefined)) {
        return { valid: false, reason: "native group mapping does not cover every source group" };
    }
    if (currentNativeGroups.length !== existingNativeGroups.length + sourceIds.length) {
        return { valid: false, reason: "native group count does not match the conversion result" };
    }
    if (existingNativeGroups.some(group => !currentNativeGroups.includes(group))) {
        return { valid: false, reason: "an existing native group was removed" };
    }

    const nativeIds = new Set(currentNativeGroups.map(group => String(group?.id)));
    const mappedIds = Object.values(mapping).map(String);
    if (new Set(mappedIds).size !== sourceIds.length || mappedIds.some(id => !nativeIds.has(id))) {
        return { valid: false, reason: "a converted native group is missing" };
    }
    return { valid: true };
}

/**
 * Count nodes that still carry a WorkspaceKit group marker.
 *
 * A marker is "stale" only when it has a value that the runtime would treat as
 * live-group membership. `_clearNodeGroupData` in `workspace2_canvas_groups.js`
 * clears the current-serializer fields by assignment to `null` (not `delete`)
 * so LiteGraph's serializer keeps the fields present when persisting an
 * already-native workflow. Treating `null` as stale would reject correctly
 * cleaned nodes — verified by the T-003 shared-member fixture on 2026-07-27.
 *
 * A `undefined` value means the field never existed. A `null` value means the
 * field was cleared. Both are non-stale. Any other value is stale, including
 * empty string and empty object.
 */
export function countStaleWorkspaceKitNodeMarkers({ nodes, sourceNodeIds }) {
    const sourceSet = sourceNodeIds instanceof Set
        ? sourceNodeIds
        : new Set((sourceNodeIds || []).map(String));
    if (!Array.isArray(nodes)) return 0;
    let count = 0;
    for (const node of nodes) {
        if (!node) continue;
        if (!sourceSet.has(String(node.id))) continue;
        if (node._xzgGroupId != null
            || node._xzgGroupData != null
            || node.properties?._xzgGroup != null) {
            count++;
        }
    }
    return count;
}
