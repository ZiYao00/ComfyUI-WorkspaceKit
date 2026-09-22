export const GROUP_RECOVERY_VERSION = 2;

function plainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function normalizeGroupRecoveryScope(scope = {}) {
  return {
    workflowPath: typeof scope.workflowPath === "string" ? scope.workflowPath : "",
    nodeSignature: typeof scope.nodeSignature === "string" ? scope.nodeSignature : "",
  };
}

export function createGroupRecoveryEnvelope(groups, scope, writtenAt = Date.now()) {
  if (!plainObject(groups)) {
    throw new TypeError("WorkspaceKit group recovery requires a groups object.");
  }
  return {
    version: GROUP_RECOVERY_VERSION,
    scope: normalizeGroupRecoveryScope(scope),
    groups,
    writtenAt: Number.isFinite(writtenAt) ? writtenAt : Date.now(),
  };
}

export function parseGroupRecoveryEnvelope(raw) {
  if (!raw) return null;
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (
    !plainObject(parsed)
    || parsed.version !== GROUP_RECOVERY_VERSION
    || !plainObject(parsed.groups)
    || !plainObject(parsed.scope)
  ) {
    return null;
  }
  return {
    version: GROUP_RECOVERY_VERSION,
    scope: normalizeGroupRecoveryScope(parsed.scope),
    groups: parsed.groups,
    writtenAt: Number.isFinite(parsed.writtenAt) ? parsed.writtenAt : 0,
  };
}

export function groupRecoveryScopeMatches(savedScope, currentScope) {
  const saved = normalizeGroupRecoveryScope(savedScope);
  const current = normalizeGroupRecoveryScope(currentScope);
  if (!saved.nodeSignature || !current.nodeSignature || saved.nodeSignature !== current.nodeSignature) {
    return false;
  }
  if (saved.workflowPath || current.workflowPath) {
    return Boolean(saved.workflowPath)
      && Boolean(current.workflowPath)
      && saved.workflowPath === current.workflowPath;
  }
  return true;
}

export function recoverableGroupsForScope(envelope, currentScope) {
  const parsed = parseGroupRecoveryEnvelope(envelope);
  if (!parsed || !groupRecoveryScopeMatches(parsed.scope, currentScope)) return null;
  return Object.keys(parsed.groups).length ? parsed.groups : null;
}
