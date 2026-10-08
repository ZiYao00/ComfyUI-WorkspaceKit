import assert from "node:assert/strict";
import {
  DEFAULT_THUMBNAIL_COUNT,
  canonicalKeyFrames,
  clampFrameIndex,
  formatTimestamp,
  frameFraction,
  frameIndexFromFraction,
  keyFramesInRange,
  normalizeKeyFrames,
  splitInputVideoPath,
  timestampForFrame,
  toggleKeyFrame,
} from "../entry/nodes/video-frame-picker-model.js";

assert.equal(DEFAULT_THUMBNAIL_COUNT, 12);

assert.deepEqual(normalizeKeyFrames("[]"), []);
assert.deepEqual(normalizeKeyFrames("[246,35,108,35]"), [35, 108, 246]);
assert.equal(canonicalKeyFrames("[246,35,108,35]"), "[35,108,246]");
assert.deepEqual(keyFramesInRange("[35,108,246]", 120), [35, 108]);
assert.deepEqual(toggleKeyFrame("[35,108]", 108), [35]);
assert.deepEqual(toggleKeyFrame("[35,108]", 70), [35, 70, 108]);
for (const invalid of ["not-json", "{}", "[0]", "[-1]", "[1.5]", "[true]"]) {
  assert.throws(() => normalizeKeyFrames(invalid));
}

assert.equal(clampFrameIndex(-10, 100), 1);
assert.equal(clampFrameIndex(44.6, 100), 45);
assert.equal(clampFrameIndex(500, 100), 100);

assert.equal(frameIndexFromFraction(0, 101), 1);
assert.equal(frameIndexFromFraction(0.5, 101), 51);
assert.equal(frameIndexFromFraction(1, 101), 101);
assert.equal(frameIndexFromFraction(2, 101), 101);

assert.equal(frameFraction(1, 101), 0);
assert.equal(frameFraction(51, 101), 0.5);
assert.equal(frameFraction(101, 101), 1);

assert.equal(timestampForFrame(1, 24), 0);
assert.equal(timestampForFrame(25, 24), 1);
assert.equal(formatTimestamp(3.59), "00:03.5");
assert.equal(formatTimestamp(65.25), "01:05.2");
assert.equal(formatTimestamp(3661.9), "01:01:01.9");

assert.deepEqual(splitInputVideoPath("clip.mp4"), { filename: "clip.mp4", subfolder: "" });
assert.deepEqual(splitInputVideoPath("video/tests/clip.webm"), {
  filename: "clip.webm",
  subfolder: "video/tests",
});
assert.deepEqual(splitInputVideoPath("video\\tests\\clip.mp4"), {
  filename: "clip.mp4",
  subfolder: "video/tests",
});

console.log("WK Video Frame Picker UI model contracts passed");
