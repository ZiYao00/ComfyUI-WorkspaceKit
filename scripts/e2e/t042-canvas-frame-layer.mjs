// T-042 B1 real-page regression. Creates disposable nodes and one WK group;
// it verifies that the visible ordinary frame no longer belongs to the DOM
// overlay, while the Canvas background hook remains attached beneath nodes.
import assert from "node:assert/strict"
import { chromium } from "playwright"

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
const errors = []
const consoleMessages = []
const failedRequests = []
const workspaceKitResources = []
page.on("pageerror", (error) => errors.push(error.message))
page.on("console", (message) => {
  if (["warning", "error"].includes(message.type())) consoleMessages.push(`${message.type()}: ${message.text()}`)
})
page.on("requestfailed", (request) => {
  failedRequests.push({ url: request.url(), failure: request.failure()?.errorText || "unknown" })
})
page.on("response", (response) => {
  if (response.url().includes("/extensions/ComfyUI-WorkspaceKit/")) {
    workspaceKitResources.push({ url: response.url(), status: response.status() })
  }
})
let fixture = null

try {
  await page.goto("http://127.0.0.1:8190/", { waitUntil: "domcontentloaded", timeout: 30_000 })
  await page.waitForFunction(() => {
    const rawTabs = window.app?.extensionManager?.getSidebarTabs?.()
    const tabs = Array.isArray(rawTabs) ? rawTabs : Array.isArray(rawTabs?.value) ? rawTabs.value : []
    return Boolean(window.app?.graph && window.Workspace2CanvasGroups && tabs.some((tab) => tab?.id === "workspace2"))
  }, null, { timeout: 30_000, polling: 250 })
  // Sidebar registration is the product availability boundary. Group init is
  // explicitly requested here only to make this isolated frame fixture
  // deterministic; the normal extension setup invokes the same idempotent call.
  await page.evaluate(() => window.Workspace2CanvasGroups.init())
  await page.waitForFunction(() => Boolean(window.Workspace2CanvasGroups?.overlay), null, { timeout: 10_000, polling: 250 })
  fixture = await page.evaluate(async () => {
    const { app, LiteGraph, Workspace2CanvasGroups: groups } = window
    const rawSidebarTabs = app.extensionManager?.getSidebarTabs?.()
    const sidebarTabs = Array.isArray(rawSidebarTabs)
      ? rawSidebarTabs
      : Array.isArray(rawSidebarTabs?.value)
        ? rawSidebarTabs.value
        : []
    const first = LiteGraph.createNode("GetNode")
    const second = LiteGraph.createNode("GetNode")
    first.title = "T042 canvas frame A"
    second.title = "T042 canvas frame B"
    first.pos = [180, 180]
    second.pos = [480, 280]
    app.graph.add(first)
    app.graph.add(second)
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
    app.canvas.deselectAllNodes?.()
    app.canvas.selectItems?.([first, second])
    await groups.createGroupFromSelection()
    const groupId = Object.keys(groups.groups).find((id) => groups.groups[id]?.nodeIds?.includes(first.id) && groups.groups[id]?.nodeIds?.includes(second.id))
    if (!groupId) throw new Error("T-042 fixture group was not created")
    const group = groups.groups[groupId]
    Object.assign(group, { effect: "none", borderWidth: 4, shadowSize: 12, shadowColor: "#000000", backgroundFillEnabled: true })
    groups.updatePositions()
    app.graph.setDirtyCanvas?.(true, true)
    await new Promise((resolve) => requestAnimationFrame(resolve))
    const element = groups.groupEls[groupId]
    const style = getComputedStyle(element)
    const canvasEffect = async (effect) => {
      const originalBackground = app.canvas.onDrawBackground
      let backgroundCalls = 0
      app.canvas.onDrawBackground = function (...args) {
        backgroundCalls += 1
        return originalBackground.apply(this, args)
      }
      try {
        Object.assign(group, { effect, shadowSize: 12 })
        groups.updatePositions()
        app.graph.setDirtyCanvas?.(true, true)
        await new Promise((resolve) => setTimeout(resolve, 120))
        const effectStyle = getComputedStyle(element)
        return {
          domBorder: effectStyle.borderTopWidth,
          domShadow: effectStyle.boxShadow,
          backgroundCalls,
        }
      } finally {
        app.canvas.onDrawBackground = originalBackground
        group.effect = "none"
        groups.updatePositions()
      }
    }
    window.__t042CanvasFixture = { canvasEffect }
    return {
      groupId,
      nodeIds: [first.id, second.id],
      domBorder: style.borderTopWidth,
      domShadow: style.boxShadow,
      backgroundHook: Boolean(app.canvas.__workspace2GroupBackgroundHook),
      rendererCanvas: groups._backgroundRendererCanvas === app.canvas,
      sidebarRegistered: sidebarTabs.some((tab) => tab?.id === "workspace2"),
    }
  })
  assert.equal(fixture.domBorder, "0px")
  assert.equal(fixture.domShadow, "none")
  assert.equal(fixture.backgroundHook, true)
  assert.equal(fixture.rendererCanvas, true)
  assert.equal(fixture.sidebarRegistered, true)
  fixture.pulse = await page.evaluate(async () => window.__t042CanvasFixture.canvasEffect("pulse"))
  fixture.rainbow = await page.evaluate(async () => window.__t042CanvasFixture.canvasEffect("rainbow"))
  fixture.glow = await page.evaluate(async () => window.__t042CanvasFixture.canvasEffect("glow"))
  fixture.marquee = await page.evaluate(async () => window.__t042CanvasFixture.canvasEffect("marquee"))
  fixture.marqueeBreathe = await page.evaluate(async () => window.__t042CanvasFixture.canvasEffect("marqueebreathe"))
  for (const effectResult of [fixture.pulse, fixture.rainbow, fixture.glow, fixture.marquee, fixture.marqueeBreathe]) {
    assert.equal(effectResult.domBorder, "0px")
    assert.equal(effectResult.domShadow, "none")
    assert.ok(effectResult.backgroundCalls > 0)
  }
  assert.deepEqual(errors, [])
  console.log(JSON.stringify(fixture))
} catch (error) {
  const directModuleImports = await page.evaluate(async () => {
    const paths = [
      "/extensions/ComfyUI-WorkspaceKit/canvas-groups/canvas-frame-paint.js",
      "/extensions/ComfyUI-WorkspaceKit/workspace2_canvas_groups.js",
      "/extensions/ComfyUI-WorkspaceKit/entry.js",
    ]
    const results = []
    for (const path of paths) {
      try {
        await import(`${path}?t042_debug=${Date.now()}`)
        results.push({ path, ok: true })
      } catch (moduleError) {
        results.push({ path, ok: false, error: String(moduleError?.message || moduleError) })
      }
    }
    return results
  }).catch(() => [])
  const diagnostic = await page.evaluate(() => ({
    hasApp: Boolean(window.app),
    hasGraph: Boolean(window.app?.graph),
    hasGroups: Boolean(window.Workspace2CanvasGroups),
    sidebarEntries: document.querySelectorAll(".workspace2-tab-button").length,
    title: document.title,
  })).catch(() => ({}))
  console.error(JSON.stringify({ diagnostic, errors, consoleMessages, failedRequests, workspaceKitResources, directModuleImports }, null, 2))
  throw error
} finally {
  if (fixture) {
    await page.evaluate(({ groupId, nodeIds }) => {
      const groups = window.Workspace2CanvasGroups
      groups?.killGroup?.(groupId)
      for (const nodeId of nodeIds) {
        const node = window.app?.graph?.getNodeById?.(nodeId)
        if (node) window.app.graph.remove(node)
      }
      window.app?.graph?.setDirtyCanvas?.(true, true)
      delete window.__t042CanvasFixture
    }, fixture).catch(() => {})
  }
  await browser.close()
}
