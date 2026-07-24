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
assert.equal(state.glassBlurPixels(0), 0);
assert.equal(state.glassBlurPixels(100), 32);

console.log("Panel background state contract passed.");
