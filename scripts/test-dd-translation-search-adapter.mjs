import assert from "node:assert/strict";
import { createDdTranslationSearchAdapter } from "../entry/nodes/dd-translation-search-adapter.js";

let calls = 0;
let request;
const adapter = createDdTranslationSearchAdapter({
  fetchJson: async (path, options) => {
    calls += 1;
    request = { path, options };
    return { Nodes: { "Fast Groups Bypasser (rgthree)": { title: "忽略多框" } } };
  },
});

const [first, second] = await Promise.all([adapter.load(), adapter.load()]);
assert.equal(calls, 1, "the optional translation table is requested once per session");
assert.equal(first.translatedBySourceKey.get("Fast Groups Bypasser (rgthree)"), "忽略多框");
assert.equal(second, first);
assert.equal(request.path, "/agl/get_translation");
assert.equal(request.options.method, "POST");
assert.equal(request.options.body, "locale=zh-CN");

const missing = createDdTranslationSearchAdapter({ fetchJson: async () => { throw new Error("404"); } });
assert.equal((await missing.load()).size, 0, "an absent optional translator must be ignored");

console.log("DD Translation search adapter tests passed");
