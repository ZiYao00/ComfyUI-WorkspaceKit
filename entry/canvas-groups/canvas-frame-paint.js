// Canvas-only frame painting for WorkspaceKit groups.
//
// The group header and hit targets remain DOM overlays because they are
// interactive.  The visual frame belongs below nodes, however, so it is drawn
// through LiteGraph's background pass.  Keep this module free of `app` and DOM
// access: rendering contracts can then test it with a small canvas-context spy.

const finite = (value, fallback = 0) => {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function roundedRectPath(ctx, x, y, width, height, radius) {
  const r = Math.min(Math.max(0, radius), width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + width - r, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + r)
  ctx.lineTo(x + width, y + height - r)
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height)
  ctx.lineTo(x + r, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

/**
 * Build the old DOM conic-gradient frame as a Canvas stroke style. Chromium
 * provides `createConicGradient`; the solid-colour fallback keeps an archived
 * marquee group visible on a rare older canvas implementation rather than
 * throwing during the whole background pass.
 */
export function createCanvasMarqueeGradient(ctx, {
  bounds = {},
  angleDegrees = 0,
  lightness = 65,
} = {}) {
  const x = finite(bounds.x)
  const y = finite(bounds.y)
  const width = Math.max(0, finite(bounds.w))
  const height = Math.max(0, finite(bounds.h))
  const hueAngle = finite(angleDegrees) * Math.PI / 180
  const l = Math.max(0, Math.min(100, finite(lightness, 65)))
  if (typeof ctx?.createConicGradient !== "function") {
    return `hsl(0,100%,${l}%)`
  }
  const gradient = ctx.createConicGradient(hueAngle, x + width / 2, y + height / 2)
  for (let hue = 0; hue <= 360; hue += 30) {
    gradient.addColorStop(hue / 360, `hsl(${hue},100%,${l}%)`)
  }
  return gradient
}

/**
 * Paint one group border and its optional shadow beneath nodes. `glowLayers`
 * is intentionally a Canvas-only list: each layer carries its own blur and
 * colour, so the legacy three-pass glow can move off the DOM overlay without
 * approximating it as one oversized ordinary shadow.
 * `scale` is only used to retain the existing one-device-pixel minimum at very
 * low zoom; all other values stay in graph coordinates because the LiteGraph
 * background context is already transformed.
 */
export function drawCanvasGroupFrame(ctx, options = {}) {
  const bounds = options.bounds || {}
  const x = finite(bounds.x)
  const y = finite(bounds.y)
  const width = Math.max(0, finite(bounds.w))
  const height = Math.max(0, finite(bounds.h))
  if (!ctx || !width || !height) return false

  const scale = Math.max(0.01, finite(options.scale, 1))
  const borderWidth = Math.max(1 / scale, finite(options.borderWidth, 1))
  const radius = Math.min(Math.max(0, finite(options.cornerRadius, 0)), width / 2, height / 2)
  const shadowSize = Math.max(0, finite(options.shadowSize, 0))
  const glowLayers = Array.isArray(options.glowLayers) ? options.glowLayers : []
  const frame = () => {
    roundedRectPath(ctx, x + borderWidth / 2, y + borderWidth / 2, Math.max(0, width - borderWidth), Math.max(0, height - borderWidth), Math.max(0, radius - borderWidth / 2))
    ctx.stroke()
  }

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, finite(options.opacity, 1)))
  ctx.lineWidth = borderWidth
  for (const layer of glowLayers) {
    const blur = Math.max(0, finite(layer?.blur, 0))
    if (!blur) continue
    ctx.strokeStyle = layer?.color || options.borderColor || "rgba(255, 204, 0, 0.65)"
    ctx.shadowColor = layer?.color || "transparent"
    ctx.shadowBlur = blur
    frame()
  }
  ctx.strokeStyle = options.borderColor || "rgba(255, 204, 0, 0.65)"
  ctx.shadowColor = options.shadowColor || "transparent"
  ctx.shadowBlur = shadowSize
  frame()
  ctx.restore()
  return true
}
