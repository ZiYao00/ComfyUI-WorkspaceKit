# Native ComfyUI Behavior Reference

Verified facts about how native ComfyUI / LiteGraph behaves, with the source
location for each claim. **Purpose: never look the same thing up twice.**

Reading the frontend bundle is expensive — it is minified into single-line
megabyte files, and a naive `grep` can return hundreds of KB for a two-line
answer. Everything below was extracted with targeted offset reads. Add to this
file whenever you verify another native behaviour; do not re-derive.

**Verified against:** `comfyui_frontend_package` **1.45.20**, at
`ComfyUI/web_custom_versions/comfyui-frontend-package-1.45.20/comfyui_frontend_package/static/assets/`
(main bundle `api-*.js`; Vue graph view in `GraphView-*.js`). All snippets are
verbatim minified source, so single letters are minifier-renamed locals.

> **Version caution:** these are facts about *this* frontend build. When the test
> package's frontend version changes, re-verify anything you depend on before
> trusting it. Record the new version alongside the old rather than overwriting.

**How to extract more cheaply than grep:**

```bash
python -c "
s=open('api-DzWNw5Ki.js',encoding='utf-8').read()
i=s.find('functionNameToFind(')
print(s[i:i+400])
"
```

---

## 1. Draw order — why nodes sit above groups

Two canvases. `drawFrontCanvas()` draws the background canvas first, then nodes:

```js
drawFrontCanvas(){ ... if(this.bgcanvas==this.canvas)this.drawBackCanvas();
  else{ ... ctx.drawImage(this.bgcanvas,0,0,...) }
  ... for(let n of visible_nodes){ ctx.save(); ...; this.drawNode(n,ctx); ctx.restore() }
  ... this.onDrawForeground?.(ctx,this.visible_area) ... }
  this.onDrawOverlay?.(ctx) ...
```

Groups are drawn inside `drawBackCanvas()`, **before** `onDrawBackground`:

```js
drawBackCanvas(){ ... this.graph._groups.length&&this.drawGroups(bgcanvas,ctx),
  this.onDrawBackground?.(ctx,this.visible_area), ... this.drawConnections(ctx) ... }
```

**Consequences:**

| Hook | When | Relative to nodes |
| --- | --- | --- |
| `drawGroups` (native groups) | in `drawBackCanvas` | below |
| `onDrawBackground` | in `drawBackCanvas`, right after groups | below |
| node loop | in `drawFrontCanvas` | — |
| `onDrawForeground` | in `drawFrontCanvas`, after nodes | above |
| `onDrawOverlay` | after everything, outside the graph transform | above |

So **`onDrawBackground` is the only hook that renders beneath nodes** — WK's
group body fill, frames, shadows and animations now hook it through
`setupBackgroundRenderer()` / T-042.

A native group's title being covered by a node is therefore **native behaviour**,
not a defect.

`drawGroups` also halves alpha for all groups:

```js
drawGroups(e,t){ ... t.save(),t.globalAlpha=.5*this.editor_alpha; ...
  for(let e of n) overlapBounding(this.visible_area,e._bounding)&&( ... e.draw(this,t)); t.restore() }
```

---

## 2. Node membership in a group — centre point, not a percentage

```js
recomputeInsideNodes(e=100,t=new Set){ ...
  for(let e of n) containsCentre(this._bounding,e.boundingRect)&&(this._nodes.push(e),a.add(e)); ... }

function containsCentre(e,t){ return isInRect(t[0]+t[2]*.5, t[1]+t[3]*.5, e) }
```

**A node belongs to a group iff its centre point is inside the group's bounds.**
It is a boolean test — there is no area-overlap percentage anywhere in this path.
A node may hang far outside the frame and still be a member; a node may overlap
heavily and not be one.

Group-in-group nesting uses **full containment** instead:

```js
function containsRect(e,t){ let n=e[0]+e[2],r=e[1]+e[3],i=t[0]+t[2],a=t[1]+t[3];
  return !(e[0]===t[0]&&e[1]===t[1]&&n===i&&r===a) && e[0]<=t[0]&&e[1]<=t[1]&&n>=i&&r>=a }
```

Note the leading inequality: an exactly-equal rect is **not** contained, so a
group never nests inside itself.

> Both a "more than 1/4" and a "90–95%" guess were recorded in discussion before
> this was checked. Both were wrong. Check here first.

---

## 3. Hit-test order on mouse down — nodes win

```js
processMouseDown(e){ ...
  let o = t.getNodeOnPos(e.canvasX,e.canvasY,this.visible_nodes) ?? void 0; ...
  if(e.button===0&&!n.isDouble) this._processPrimaryButton(e,o); ... }
```

The node lookup happens **before** any group consideration, and the resolved node
is passed into `_processPrimaryButton`. Groups are only reached when no node was
hit — `_getPositionableOnPos` falls through to
`this.graph?.getGroupTitlebarOnPos(e,t)` last, after IO nodes and reroutes.

Group hit tests, newest-group-first:

```js
getGroupOnPos(e,t){ for(let n=this._groups.length-1;n>=0;n--){ let r=this._groups[n];
  if(r.isPointInside(e,t)) return r } }
getGroupTitlebarOnPos(e,t){ for(let n=this._groups.length-1;n>=0;n--){ let r=this._groups[n];
  if(r.isPointInTitlebar(e,t)) return r } }
```

Resize corner and point-inside test:

```js
isInResize(e,t){ let n=this.boundingRect,r=n[0]+n[2],i=n[1]+n[3];
  return e<r&&t<i&&e-r+(t-i)>-LGraphGroup.resizeLength }
isPointInside(e,t){ return isInRect(e,t,this.boundingRect) }
```

**Rule to mirror: node first, group second.** A WK overlay element with
`pointer-events:auto` inverts this and steals the click — the T-041 defect.

Group geometry constants: `minWidth=140`, `minHeight=80`, `resizeLength=10`,
`padding=4`, `defaultColour='#335'`.

---

## 3b. Pointer capture during a node drag — which events a third party still sees

Verified by direct measurement on the live test package (2026-08-05), not from
the bundle: instrument `document` capture-phase listeners for all five names,
drag a node, and count.

LiteGraph takes pointer capture on the node's `pointerdown` and calls
`preventDefault` on the gesture. Observed counts on `document` (capture phase),
with `hasPointerCapture(1) === true` throughout the drag and a
`setPointerCapture(1)` / `releasePointerCapture(1)` pair bracketing it:

| event | during the drag | on release | after release |
| --- | --- | --- | --- |
| `pointermove` | fires (target `CANVAS`, `buttons:1`) | – | fires |
| `mousemove` | **0** | – | fires again |
| `pointerup` | – | **1** (target `CANVAS`, `buttons:0`) | – |
| `mouseup` | – | **0** | – |
| `pointercancel` | – | 0 (normal release) | – |

Two consequences for any extension that wants to follow a native node drag
without taking it over:

1. **Listen on the pointer family for both motion and teardown.** The
   compatibility mouse events are suppressed for the drag's whole duration and
   resume the instant the button is released — the exact inverse of what a
   follower needs. A `mouseup`-based teardown never runs at all.
2. **Assume more than one end signal.** A release can deliver `pointerup` and
   then a trailing move; an interruption delivers `pointercancel` instead. Make
   teardown idempotent rather than picking one event and trusting it.

Both mistakes were live WK defects — see CANVAS_GROUPS_MAP "Drag & resize" and
`entry/canvas-groups/drag-teardown.js`.

---

## 4. Ignore (bypass) and mute (never) visuals

Opacity is applied per node while drawing:

```js
getNodeModeAlpha(e){ return e.flags.ghost ? .3
  : e.mode===B.BYPASS ? .2
  : e.mode===B.NEVER  ? .4
  : this.editor_alpha }
```

Background colour is replaced only for bypass:

```js
get renderingBgColor(){ let e=this.bgcolor||this.constructor.bgcolor||Q.NODE_DEFAULT_BGCOLOR,
  t={opacity:Q.nodeOpacity,lightness:Q.nodeLightness};
  return me(this.mode===B.BYPASS ? Q.NODE_DEFAULT_BYPASS_COLOR : e, t) }
```

```js
NODE_DEFAULT_BYPASS_COLOR = `#FF00FF`
```

| State | Mode | Colour | Alpha |
| --- | --- | --- | --- |
| Ignore / bypass | `BYPASS` (4) | `#FF00FF` magenta replaces bg | `.2` |
| Mute / disable | `NEVER` (2) | unchanged | `.4` |
| Ghost | — | unchanged | `.3` |
| Normal | `ALWAYS` (0) | unchanged | `editor_alpha` |

**The magenta is theme-overridable in name only — read `NODE_DEFAULT_BYPASS_COLOR`,
not `NODE_BYPASS_BGCOLOR`.** `NODE_BYPASS_BGCOLOR` is the name that appears in the
theme colour-palette schema, so it looks like the right source, but the node
rendering path above reads `NODE_DEFAULT_BYPASS_COLOR` and ignores it. Measured on
the live page (2026-08-05, T-038):

```
LiteGraph.NODE_BYPASS_BGCOLOR       = '#cba6f7'   ← lavender, theme value, UNUSED by drawNode
LiteGraph.NODE_DEFAULT_BYPASS_COLOR = '#FF00FF'
bypassed node .renderingBgColor     = 'hsla(300, 100%, 50%, 0.9)'   ← i.e. #FF00FF
app.canvas.getNodeModeAlpha(node)   = 0.2                            ← confirms the table above
app.extensionManager.setting.get('Comfy.ColorPalette') = null        ← not a usable source
```

Reading `NODE_BYPASS_BGCOLOR` first made a bypassed WorkspaceKit frame lavender
while the nodes inside it went magenta. Anything that must match a bypassed node's
colour should read `NODE_DEFAULT_BYPASS_COLOR` first and treat
`NODE_BYPASS_BGCOLOR` only as a fallback for builds lacking it.

Mode values used in WK: `MODE_ALWAYS = 0`, `MODE_BYPASS = 4`; mute/never is `2`.

---

## 5. Node rendering mode — nodes are canvas pixels, not DOM

```js
vueNodesMode = !1
```

Default off in this build, so nodes render through `drawNode()` onto the canvas.
Where `vueNodesMode` is true, node layout comes from a layout store
(`U.getNodeLayoutRef`, `U.querySlotAtPoint`) instead of `boundingRect`.

**Do not assume DOM nodes.** Any WK feature that needs to be under a node must
draw on the canvas. Any feature that hit-tests nodes must use
`graph.getNodeOnPos(x, y, nodes, margin)` in canvas coordinates, not
`document.elementFromPoint`.

---

## 6. Group colour identity

Native group colours come from `LGraphCanvas.node_colors[*].groupcolor`. WK reads
this live palette (`readNativeGroupColorPresets()` in
`entry/canvas-groups/native-color-compat.js`) rather than shipping its own hues,
so a converted group keeps the exact hex a native group would have. This is what
lets rgthree's colour filters and WK ⇄ native conversion agree on identity.
WK's own `GROUP_COLOR_PRESETS` is a fallback for frontends exposing fewer than
ten valid entries.

### The palette, measured (2026-08-06)

Nine entries, in `Object.keys` order — which is the order the native right-click
colour submenu shows:

| # | key | `groupcolor` | expanded |
|---|---|---|---|
| 1 | `red` | `#A88` | `#aa8888` |
| 2 | `brown` | `#b06634` | — |
| 3 | `green` | `#8A8` | `#88aa88` |
| 4 | `blue` | `#88A` | `#8888aa` |
| 5 | `pale_blue` | `#3f789e` | — |
| 6 | `cyan` | `#8AA` | `#88aaaa` |
| 7 | `purple` | `#a1309b` | — |
| 8 | `yellow` | `#b58b2a` | — |
| 9 | `black` | `#444` | `#444444` |

Two things this settles:

**There is no tenth "no colour" entry.** The `No color` item in the native
submenu is not a colour — it is an operation that **deletes the colour field**.
A group with no `color` serializes without the key at all
(`{"id":-1,"title":"probe","bounding":[...],"flags":{}}`) and falls back to
`#333` with an `#AAA` title. Anything counting native colours gets nine.

**Five entries are three-digit shorthands** whose channels all sit between
`0x88` and `0xAA`. `red`/`green`/`blue`/`cyan` are therefore nearly
indistinguishable at swatch size, and sit oddly next to the four modern
six-digit entries. WK brightens them **for display only** — see
"Store native, paint bright (T-044)" in
[CANVAS_GROUPS_MAP.md](CANVAS_GROUPS_MAP.md).

A fresh `LGraphGroup` defaults to `color = '#3f789e'` (`pale_blue`).

---

## 6b. rgthree `matchColors` — what it actually accepts

`rgthree-comfy/src_web/comfyui/fast_groups_muter.ts` L150–176. The resolution is:

```
split on ","  →  trim, lowercase
  →  if LGraphCanvas.node_colors[word] exists, replace with its groupcolor
  →  strip "#", expand a 3-digit value to 6
  →  compare against the group's own color, same normalization
```

Three consequences for anything writing colours a user will filter on:

1. **A colour name and a hex are both valid** (`red`, `pale_blue`, `#a4d399`).
2. **An unrecognised word is treated as a hex, not rejected.** `other` becomes
   the colour `#other`, matches nothing, and **fails silently** — no error, no
   warning. So a swatch with no native colour name must offer its hex, never an
   invented label.
3. **A group with no colour is skipped entirely** (`if (!groupColor) continue`).
   A "no colour" group disappears from the Fast Groups list rather than
   appearing unfiltered.

Verified live: `red` resolves to `#aa8888` and matches a WK group carrying that
stored colour; the brightened display value `#d65151` does not match, which is
the check that proves WK never persists its display colour.

rgthree is MIT (Regis Gaughan III, 2023) — this is a behavioural description
read from its source, no code copied.

---

## 7. rgthree group-header toggles (third-party, for comparison only)

`rgthree-comfy/web/comfyui/feature_group_fast_toggle.js` draws its toggles as
`Path2D` shapes stroked/filled directly on the canvas (eye arcs plus seven
eyelash strokes for mute; a broken vs. continuous line for bypass), configured
through `group_header_fast_toggle.{enabled,toggles,show}`.

Because they are canvas paths and WK's group header is DOM, **the icons cannot be
reused directly** — this was evaluated and declined (see
`.dev-docs/CANVAS_GROUP_INTERACTION_PLAN.zh-CN.md` §7). rgthree is MIT
(Regis Gaughan III, 2023). Copying any implementation code would require a
`THIRD_PARTY_NOTICES.md` entry first.

---

## Related documents

- [CANVAS_GROUPS_MAP.md](CANVAS_GROUPS_MAP.md) — where WK's group code lives
- [ENTRY_MAP.md](ENTRY_MAP.md) — where `entry.js` code lives
- `.dev-docs/CANVAS_GROUP_INTERACTION_PLAN.zh-CN.md` — the design decisions these
  facts drove (batch-scoped; expires with the batch)
