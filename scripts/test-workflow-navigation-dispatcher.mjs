import assert from "node:assert/strict";
import { createLatestWorkflowNavigationDispatcher } from "../entry/workflows/navigation-dispatcher.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

{
  const calls = [];
  const gates = new Map();
  const dispatch = createLatestWorkflowNavigationDispatcher((path, requestId) => {
    calls.push({ path, requestId });
    const gate = deferred();
    gates.set(path, gate);
    return gate.promise;
  });

  const openB = dispatch("B.json", 1);
  const openC = dispatch("C.json", 2);
  const openD = dispatch("D.json", 3);

  assert.deepEqual(calls, [{ path: "B.json", requestId: 1 }], "only the first official command may be in flight");
  assert.deepEqual(await openC, {
    opened: false,
    initializeCleanState: false,
    reason: "superseded-before-dispatch",
    superseded: true,
  });

  gates.get("B.json").resolve({ opened: true, initializeCleanState: true, reason: "opened" });
  assert.deepEqual(await openB, { opened: true, initializeCleanState: true, reason: "opened" });

  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    calls,
    [
      { path: "B.json", requestId: 1 },
      { path: "D.json", requestId: 3 },
    ],
    "the newest pending intent must replace stale intermediate clicks",
  );

  gates.get("D.json").resolve({ opened: true, initializeCleanState: true, reason: "opened" });
  assert.deepEqual(await openD, { opened: true, initializeCleanState: true, reason: "opened" });
}

{
  const calls = [];
  const dispatch = createLatestWorkflowNavigationDispatcher(async (path) => {
    calls.push(path);
    if (path === "broken.json") throw new Error("boom");
    return { opened: true, initializeCleanState: false, reason: "opened" };
  });

  await assert.rejects(dispatch("broken.json", 1), /boom/);
  assert.deepEqual(await dispatch("healthy.json", 2), {
    opened: true,
    initializeCleanState: false,
    reason: "opened",
  });
  assert.deepEqual(calls, ["broken.json", "healthy.json"], "one failed official command must not stall later navigation");
}

console.log("latest workflow navigation dispatcher contract passed");
