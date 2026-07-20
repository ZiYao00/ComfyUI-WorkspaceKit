import assert from "node:assert/strict";
import { createPreviewPositioner } from "../entry/ui/preview-positioner.js";

const makePreview = (width, height) => ({
  style: {},
  getBoundingClientRect: () => ({ width, height }),
});
const panel = { getBoundingClientRect: () => ({ left: 0, right: 280, top: 0, height: 700 }) };
const left = createPreviewPositioner({
  window: { innerWidth: 1000, innerHeight: 700 },
  getSidebarSetting: () => "left",
  getRenderTarget: () => panel,
});
const cursorPreview = makePreview(240, 180);
left.positionPreviewAtCursor(cursorPreview, { clientX: 900, clientY: 650 });
assert.equal(cursorPreview.style.left, "644px");
assert.equal(cursorPreview.style.top, "454px");

const panelPreview = makePreview(248, 300);
left.positionPreviewPopover(panelPreview, { currentTarget: { getBoundingClientRect: () => ({ top: 600, height: 30 }), closest: () => null }, clientX: 30, clientY: 30 });
assert.equal(panelPreview.style.width, "248px");
assert.equal(panelPreview.style.left, "296px");
assert.equal(panelPreview.style.top, "384px");

const right = createPreviewPositioner({
  window: { innerWidth: 1000, innerHeight: 700 },
  getSidebarSetting: () => "right",
  getRenderTarget: () => ({ getBoundingClientRect: () => ({ left: 720, right: 1000, top: 0, height: 700 }) }),
});
const rightPreview = makePreview(248, 160);
right.positionPreviewPopover(rightPreview, { currentTarget: { getBoundingClientRect: () => ({ top: 100, height: 30 }), closest: () => null } });
assert.equal(rightPreview.style.left, "456px");
assert.equal(rightPreview.style.top, "67px");

const followPreview = makePreview(240, 180);
left.positionPreviewPopover(followPreview, { clientX: 20, clientY: 30 }, { followCursor: true });
assert.equal(followPreview.style.left, "36px");
assert.equal(followPreview.style.top, "46px");
console.log("preview positioner contract passed");
