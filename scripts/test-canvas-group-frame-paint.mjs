import assert from "node:assert/strict"
import { createCanvasMarqueeGradient, drawCanvasGroupFrame } from "../entry/canvas-groups/canvas-frame-paint.js"

function createContext() {
  const calls = []
  return {
    calls,
    save: () => calls.push("save"), restore: () => calls.push("restore"), beginPath: () => calls.push("beginPath"),
    moveTo: () => calls.push("moveTo"), lineTo: () => calls.push("lineTo"), quadraticCurveTo: () => calls.push("curve"),
    closePath: () => calls.push("closePath"), stroke: () => calls.push("stroke"),
    createConicGradient: (angle, x, y) => {
      calls.push(["conic", angle, x, y])
      return { addColorStop: (offset, color) => calls.push(["stop", offset, color]) }
    },
    set lineWidth(value) { calls.push(["lineWidth", value]) }, set strokeStyle(value) { calls.push(["strokeStyle", value]) },
    set shadowColor(value) { calls.push(["shadowColor", value]) }, set shadowBlur(value) { calls.push(["shadowBlur", value]) },
    set globalAlpha(value) { calls.push(["globalAlpha", value]) },
  }
}

const ctx = createContext()
assert.equal(drawCanvasGroupFrame(ctx, {
  bounds: { x: 10, y: 20, w: 200, h: 80 }, scale: 0.5, borderWidth: 1,
  cornerRadius: 8, borderColor: "hsla(48,100%,55%,0.65)", shadowSize: 6, shadowColor: "#000", opacity: 0.4,
}), true)
assert.ok(ctx.calls.includes("stroke"))
assert.deepEqual(ctx.calls.find((call) => Array.isArray(call) && call[0] === "lineWidth"), ["lineWidth", 2])
assert.deepEqual(ctx.calls.find((call) => Array.isArray(call) && call[0] === "globalAlpha"), ["globalAlpha", 0.4])
assert.deepEqual(ctx.calls.find((call) => Array.isArray(call) && call[0] === "shadowBlur"), ["shadowBlur", 6])
const glowCtx = createContext()
assert.equal(drawCanvasGroupFrame(glowCtx, {
  bounds: { x: 10, y: 20, w: 200, h: 80 }, borderWidth: 2, cornerRadius: 8,
  borderColor: "hsla(48,100%,55%,0.65)",
  glowLayers: [
    { color: "hsla(48,100%,55%,0.5)", blur: 35 },
    { color: "hsla(48,100%,55%,1)", blur: 12 },
    { color: "hsla(48,100%,55%,1)", blur: 3 },
  ],
}), true)
assert.equal(glowCtx.calls.filter((call) => call === "stroke").length, 4)
assert.deepEqual(
  glowCtx.calls.filter((call) => Array.isArray(call) && call[0] === "shadowBlur").map((call) => call[1]),
  [35, 12, 3, 0],
)
const gradientCtx = createContext()
const gradient = createCanvasMarqueeGradient(gradientCtx, {
  bounds: { x: 10, y: 20, w: 200, h: 80 }, angleDegrees: 90, lightness: 55,
})
assert.equal(typeof gradient.addColorStop, "function")
assert.deepEqual(gradientCtx.calls.find((call) => Array.isArray(call) && call[0] === "conic"), ["conic", Math.PI / 2, 110, 60])
assert.equal(gradientCtx.calls.filter((call) => Array.isArray(call) && call[0] === "stop").length, 13)
assert.equal(createCanvasMarqueeGradient({}, { lightness: 55 }), "hsl(0,100%,55%)")
assert.equal(drawCanvasGroupFrame(createContext(), { bounds: { x: 0, y: 0, w: 0, h: 20 } }), false)

console.log("Canvas group frame paint contract passed.")
