/**
 * Pure data helpers for the future WorkspaceKit ↔ ComfyUI native-group
 * conversion flow.
 *
 * This module deliberately does not touch LiteGraph, the active canvas, or
 * graph.extra. Stage 3 only defines and validates the reversible archive;
 * the transactional conversion commands are a later batch.
 */

export const GROUP_CONVERSION_SCHEMA_VERSION = 1;

const clone = value => {
    if (value === undefined) return undefined;
    return JSON.parse(JSON.stringify(value));
};

const asGroupMap = groups => {
    if (Array.isArray(groups)) {
        return Object.fromEntries(groups
            .filter(group => group && group.id !== undefined && group.id !== null)
            .map(group => [String(group.id), group]));
    }
    return groups && typeof groups === "object" ? groups : {};
};

/**
 * Build a conversion archive without changing the active representation.
 * `serializeGroup` is injected so the live Canvas Groups module remains the
 * single owner of the WorkspaceKit group schema, including background fields.
 */
export function createWorkspaceKitGroupConversionArchive(groups, serializeGroup, timestamp = new Date().toISOString()) {
    if (typeof serializeGroup !== "function") {
        throw new TypeError("serializeGroup must be a function");
    }

    const archiveGroups = {};
    for (const [id, group] of Object.entries(asGroupMap(groups))) {
        const serialized = serializeGroup(group);
        if (!serialized || serialized.id === undefined || serialized.id === null) {
            throw new Error(`WorkspaceKit group ${id} has no serializable id`);
        }
        archiveGroups[String(serialized.id)] = clone(serialized);
    }

    return {
        schemaVersion: GROUP_CONVERSION_SCHEMA_VERSION,
        source: "workspacekit",
        convertedAt: String(timestamp),
        groups: archiveGroups,
    };
}

/**
 * Validate only the invariants required before a transactional conversion.
 * It intentionally accepts future style fields so new visual controls do not
 * invalidate an older archive reader.
 */
export function validateWorkspaceKitGroupConversionArchive(archive) {
    if (!archive || typeof archive !== "object") return { valid: false, reason: "archive is not an object" };
    if (archive.schemaVersion !== GROUP_CONVERSION_SCHEMA_VERSION) {
        return { valid: false, reason: "unsupported schema version" };
    }
    if (archive.source !== "workspacekit") return { valid: false, reason: "unexpected archive source" };
    if (!archive.groups || typeof archive.groups !== "object" || Array.isArray(archive.groups)) {
        return { valid: false, reason: "groups must be an object" };
    }

    for (const [id, group] of Object.entries(archive.groups)) {
        if (!group || typeof group !== "object") return { valid: false, reason: `group ${id} is invalid` };
        if (String(group.id) !== String(id)) return { valid: false, reason: `group ${id} has mismatched id` };
        if (!Array.isArray(group.nodeIds)) return { valid: false, reason: `group ${id} has invalid nodeIds` };
        if (!group.bounds || typeof group.bounds !== "object") return { valid: false, reason: `group ${id} has invalid bounds` };
    }
    return { valid: true };
}
