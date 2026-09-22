import assert from "node:assert/strict";
import {
  GROUP_RECOVERY_VERSION,
  createGroupRecoveryEnvelope,
  groupRecoveryScopeMatches,
  parseGroupRecoveryEnvelope,
  recoverableGroupsForScope,
} from "../entry/canvas-groups/persistence-policy.js";

const groups = {
  groupA: { id: "groupA", title: "A", nodeIds: ["1", "2"] },
};
const scopeA = { workflowPath: "workflows/A.json", nodeSignature: "1:GetNode|2:GetNode" };
const envelope = createGroupRecoveryEnvelope(groups, scopeA, 1234);

assert.equal(envelope.version, GROUP_RECOVERY_VERSION);
assert.deepEqual(parseGroupRecoveryEnvelope(JSON.stringify(envelope)), envelope);
assert.equal(groupRecoveryScopeMatches(scopeA, { ...scopeA }), true);
assert.equal(
  groupRecoveryScopeMatches(scopeA, { workflowPath: "workflows/B.json", nodeSignature: scopeA.nodeSignature }),
  false,
);
assert.equal(
  groupRecoveryScopeMatches(scopeA, { workflowPath: scopeA.workflowPath, nodeSignature: "1:GetNode" }),
  false,
);
assert.deepEqual(recoverableGroupsForScope(envelope, scopeA), groups);
assert.equal(
  recoverableGroupsForScope(envelope, { workflowPath: "workflows/B.json", nodeSignature: scopeA.nodeSignature }),
  null,
);

// v1 stored the bare group map under a global key. It has no workflow identity,
// so accepting it would allow A's groups to appear in B after a refresh.
assert.equal(parseGroupRecoveryEnvelope(JSON.stringify(groups)), null);

console.log("Group persistence policy contract passed.");
