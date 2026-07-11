const MAX_ENTRIES = 200;
const entries = [];

function now() {
  return globalThis.performance?.now?.() ?? Date.now();
}

function record(entry) {
  entries.push(entry);
  if (entries.length > MAX_ENTRIES) {
    entries.splice(0, entries.length - MAX_ENTRIES);
  }
  console.debug(`[Workspace2 Performance] ${entry.name}: ${entry.durationMs}ms`, entry.detail);
  return entry;
}

export function startPerformanceSpan(name, detail = {}) {
  const startedAt = now();
  let finished = false;
  return (extraDetail = {}, status = "ok") => {
    if (finished) {
      return null;
    }
    finished = true;
    return record({
      name,
      status,
      durationMs: Math.round((now() - startedAt) * 10) / 10,
      timestamp: Date.now(),
      detail: { ...detail, ...extraDetail },
    });
  };
}

export async function measurePromise(name, task, detail = {}) {
  const finish = startPerformanceSpan(name, detail);
  try {
    const result = await task();
    finish();
    return result;
  } catch (error) {
    finish({ error: error?.message || String(error) }, "error");
    throw error;
  }
}

export function installPerformanceDebugApi() {
  if (globalThis.workspace2Performance) {
    return;
  }
  Object.defineProperty(globalThis, "workspace2Performance", {
    configurable: true,
    value: Object.freeze({
      getEntries: () => entries.map((entry) => ({
        ...entry,
        detail: { ...entry.detail },
      })),
      clear: () => {
        entries.length = 0;
      },
    }),
  });
}
