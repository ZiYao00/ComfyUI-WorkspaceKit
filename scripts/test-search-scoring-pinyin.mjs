import assert from "node:assert/strict";
import { compactSearchFields, genericSearchScores, pinyinSearchText } from "../entry/core/search-scoring.js";

const searchText = pinyinSearchText(["忽略多框"]);
assert.match(searchText, /hulüeduokuang/);
assert.match(searchText, /hulueduokuang/);
assert.match(searchText, /hldk/);
assert.ok(
  genericSearchScores(compactSearchFields([], ["忽略多框"]), "hulueduokuang")[0] < 9,
  "plain keyboard pinyin must match a translated node title",
);

console.log("pinyin search compatibility tests passed");
