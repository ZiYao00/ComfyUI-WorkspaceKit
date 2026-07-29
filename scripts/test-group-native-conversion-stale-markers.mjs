import assert from "node:assert/strict";
import { countStaleWorkspaceKitNodeMarkers } from "../entry/canvas-groups/conversion-result.js";

// A node that never had any WorkspaceKit marker: fields are `undefined`.
// This is the pre-conversion state for nodes outside any WorkspaceKit group.
const neverMarked = { id: "1" };

// A node whose markers were cleared by `_clearNodeGroupData`: `_xzgGroupId`
// and `_xzgGroupData` become `null` (not delete) so LiteGraph's serializer
// keeps the field present; `_xzgGroup` and `properties._xzgGroup` are deleted.
// This is the shape a correctly-cleaned node has after native conversion.
// The T-003 shared-member fixture on 2026-07-27 first exposed the bug where
// this cleaned shape was mis-classified as stale.
const cleaned = { id: "2", _xzgGroupId: null, _xzgGroupData: null };
const cleanedWithProperties = { id: "3", _xzgGroupId: null, _xzgGroupData: null, properties: {} };

// A stale node that still carries live WorkspaceKit membership data.
const staleById = { id: "4", _xzgGroupId: "g_something" };
const staleByData = { id: "5", _xzgGroupData: { id: "g_something" } };
const staleByProperty = { id: "6", properties: { _xzgGroup: { id: "g_something" } } };

// Empty object and empty string are non-null / non-undefined, so the `!= null`
// check treats them as stale too. This is intentional: if a serializer leaves
// an empty shell behind, we would rather fail loudly than silently accept it
// as a clean state. Only `null` (explicit clear by `_clearNodeGroupData`) and
// `undefined` (never marked) are non-stale.
const staleByEmptyObject = { id: "7", _xzgGroupData: {} };
const staleByEmptyString = { id: "8", _xzgGroupId: "" };

const sourceNodeIds = ["1", "2", "3", "4", "5", "6", "7", "8"];

const nodes = [neverMarked, cleaned, cleanedWithProperties, staleById, staleByData, staleByProperty, staleByEmptyObject, staleByEmptyString];

const count = countStaleWorkspaceKitNodeMarkers({ nodes, sourceNodeIds });
assert.equal(count, 5, `expected 5 stale markers (three explicit + two empty-shell), got ${count}. ` +
  `The two null-shape nodes must NOT count as stale — the T-003 shared-member fixture ` +
  `on 2026-07-27 exposed this regression when they did.`);

// Regression pin for T-003: a node whose markers were cleared by
// `_clearNodeGroupData` (all fields become `null`) must NOT count as stale.
assert.equal(
  countStaleWorkspaceKitNodeMarkers({ nodes: [cleaned], sourceNodeIds: ["2"] }),
  0,
  "T-003: a node cleared by _clearNodeGroupData (fields = null) must be non-stale"
);
assert.equal(
  countStaleWorkspaceKitNodeMarkers({ nodes: [cleanedWithProperties], sourceNodeIds: ["3"] }),
  0,
  "T-003: a node cleared with empty properties object must be non-stale"
);

// Nodes outside sourceNodeIds are ignored regardless of their marker state.
const staleOutsideSource = { id: "999", _xzgGroupId: "g_something" };
const countOutside = countStaleWorkspaceKitNodeMarkers({
  nodes: [staleOutsideSource],
  sourceNodeIds: ["1"],
});
assert.equal(countOutside, 0, "node outside sourceNodeIds must not be counted");

// Accept sourceNodeIds as either an Array or a Set.
const asSet = new Set(["4"]);
const countSet = countStaleWorkspaceKitNodeMarkers({ nodes: [staleById, cleaned], sourceNodeIds: asSet });
assert.equal(countSet, 1, "should accept a Set as sourceNodeIds");

// Non-array `nodes` returns 0 without throwing.
assert.equal(countStaleWorkspaceKitNodeMarkers({ nodes: null, sourceNodeIds: ["1"] }), 0);
assert.equal(countStaleWorkspaceKitNodeMarkers({ nodes: undefined, sourceNodeIds: ["1"] }), 0);

// Empty sourceNodeIds -> 0 regardless of node markers.
assert.equal(countStaleWorkspaceKitNodeMarkers({ nodes: [staleById], sourceNodeIds: [] }), 0);

console.log("test-group-native-conversion-stale-markers ok");
