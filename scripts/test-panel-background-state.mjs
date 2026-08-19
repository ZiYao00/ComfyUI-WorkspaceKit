import assert from "node:assert/strict";
import { createPanelBackgroundState } from "../entry/ui/panel-background-state.js";

const values = new Map();
const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
const state = createPanelBackgroundState(storage);

assert.equal(state.snapPanelOpacity(-10), 5);
assert.equal(state.snapPanelOpacity(140), 100);
assert.equal(state.snapGlassTransparency(0), 5);
assert.equal(state.snapGlassTransparency(100), 95);
assert.equal(state.snapGlassBlur(-1), 0);
assert.equal(state.snapGlassBlur(101), 100);
assert.equal(state.panelBackgroundMode(), "transparent");
assert.equal(state.setPanelBackgroundModeValue("glass"), "glass");
assert.equal(state.panelBackgroundMode(), "glass");
assert.equal(state.setPanelOpacityValue(73), 73);
assert.equal(state.panelOpacity(), 73);
assert.equal(state.setGlassTransparencyValue(61), 61);
assert.equal(state.glassTransparency(), 61);
assert.equal(state.setGlassBlurValue(88), 88);
assert.equal(state.glassBlur(), 88);
assert.equal(state.glassBlurPixels(0), 6, "new zero must equal the former 20% glass appearance");
assert.equal(state.glassBlurPixels(100), 32);

// Existing users keep the same perceived blur after the 0–20% dead range is
// removed: a stored legacy 20 becomes new 0 exactly once.
const legacyValues = new Map([["workspace2.panelBlur", "20"]]);
const legacyStorage = { getItem: (key) => legacyValues.get(key) ?? null, setItem: (key, value) => legacyValues.set(key, value) };
const migrated = createPanelBackgroundState(legacyStorage);
assert.equal(migrated.glassBlur(), 0);
assert.equal(legacyValues.get("workspace2.panelBlur"), "0");
assert.equal(legacyValues.get("workspace2.panelBlurScaleVersion"), "2");
assert.equal(migrated.glassBlurPixels(), 6);

console.log("Panel background state contract passed.");
