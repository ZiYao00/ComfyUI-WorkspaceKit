const LOCK_NAME = "workspace2-node-index-refresh";
const LEASE_KEY = "workspace2.nodeIndex.refreshLease";
const LEASE_MS = 60_000;
const POLL_MS = 500;

function wait(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

function readLease() {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(LEASE_KEY) || "null");
  } catch {
    return null;
  }
}

async function withLocalStorageLease(task) {
  if (!globalThis.localStorage) {
    return task();
  }
  const owner = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const deadline = Date.now() + LEASE_MS;
  while (Date.now() < deadline) {
    const lease = readLease();
    if (!lease?.expiresAt || lease.expiresAt <= Date.now()) {
      globalThis.localStorage.setItem(LEASE_KEY, JSON.stringify({
        owner,
        expiresAt: Date.now() + LEASE_MS,
      }));
      if (readLease()?.owner === owner) {
        try {
          return await task();
        } finally {
          if (readLease()?.owner === owner) {
            globalThis.localStorage.removeItem(LEASE_KEY);
          }
        }
      }
    }
    await wait(POLL_MS);
  }
  return task();
}

export async function withNodeIndexRefreshLock(task) {
  if (globalThis.navigator?.locks?.request) {
    return globalThis.navigator.locks.request(
      LOCK_NAME,
      { mode: "exclusive" },
      task,
    );
  }
  return withLocalStorageLease(task);
}
