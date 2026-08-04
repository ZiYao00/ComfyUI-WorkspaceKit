import assert from "node:assert/strict";
import {
  buildDdTranslationAliasIndex,
  resolveDdTranslationSearchAliases,
} from "../entry/nodes/dd-translation-aliases.js";

const payload = JSON.stringify({
  Nodes: {
    "Fast Groups Bypasser (rgthree)": { title: "忽略多框" },
    "Fast Groups Muter (rgthree)": { display_name: "静音多框" },
    "Image Alpha": { title: "图像" },
    "Image RGB": { title: "图像" },
  },
});

const index = buildDdTranslationAliasIndex(payload);
assert.equal(index.translatedBySourceKey.get("Fast Groups Bypasser (rgthree)"), "忽略多框");
assert.equal(index.sourceByTranslatedTitle.get("静音多框"), "Fast Groups Muter (rgthree)");
assert.equal(index.sourceByTranslatedTitle.get("图像"), null, "ambiguous translated titles must not resolve");

assert.deepEqual(
  resolveDdTranslationSearchAliases({ type: "Fast Groups Bypasser (rgthree)" }, index),
  ["忽略多框"],
  "an English source name must gain its translated search alias",
);

assert.deepEqual(
  resolveDdTranslationSearchAliases({ title: "忽略多框" }, index),
  ["Fast Groups Bypasser (rgthree)"],
);
assert.deepEqual(
  resolveDdTranslationSearchAliases({ rawTitle: "静音多框", title: "静音多框" }, index),
  ["Fast Groups Muter (rgthree)"],
);
assert.deepEqual(resolveDdTranslationSearchAliases({ title: "图像" }, index), []);
assert.deepEqual(resolveDdTranslationSearchAliases({ title: "未知节点" }, index), []);
assert.equal(buildDdTranslationAliasIndex("not json").size, 0);

console.log("DD Translation alias adapter tests passed");
