# Third-party notices

## WK Video Frame Picker references (2026-10-08)

`WK Video Frame Picker` is an independent WorkspaceKit implementation. No
third-party node source, preview code, thumbnail code, Marker code, batch-output
code, or frame-decoding code was copied.

The product behaviour was compared with the MIT-licensed
[Slartibart23/ComfyUI-VideoFramePicker](https://github.com/Slartibart23/ComfyUI-VideoFramePicker),
notably its in-node scrubbing, 1-based frame numbering, and current-frame IMAGE
output. WorkspaceKit keeps its own narrower interaction model: MP4/WebM
input-folder preview, sparse browser Filmstrip, one draggable Playhead, exact
one-frame stepping, lightweight Marker toggles, and the stable `frame_image` plus
Marker-derived `batch_frame_image` outputs. Marker persistence, video-switch
clearing/Undo, adjacent-Marker lane layout, and batch decoding are WorkspaceKit
implementations.

Implementation conventions were checked against current public ComfyUI /
ComfyUI_frontend behaviour: PyAV is used by the current video stack, DOM widgets
are attached through the extension API, hidden Marker state remains a normal
serialized backend widget, widget writes use the official value setter, and
DOM-originated mutations are bracketed with the normal graph/canvas change
transaction so undo/dirty tracking follows the same path as human widget edits.
The empty-Marker batch branch uses ComfyUI's public per-output
`ExecutionBlocker` mechanism, verified by real `/prompt` execution. WorkspaceKit
does not import private Vue stores or patch LiteGraph prototypes.

## WK utility-node behaviour references (2026-10-07)

`WK Resolution Preset` and `WK Video Duration` are independent WorkspaceKit
implementations. No third-party source code was copied.

Resolution-preset product behaviour was reviewed from
[zscxjpk/ComfyUI-QZ_plugins](https://github.com/zscxjpk/ComfyUI-QZ_plugins),
notably `QZ_ResolutionPreset.py`. WorkspaceKit keeps only the convenience concept
while using an independent ratio-first design: portrait / square / landscape
Unicode markers, 1K/2K/3K/4K/6K/8K long-edge levels, nearest-x8 short-edge alignment, and
optional exact custom dimensions. The QZ project is retained only as a
behavioural/product reference.

Video timing profiles are based on current public ComfyUI / Comfy-Org behaviour:
WAN 2.x uses a `4n+1` frame grid with the workflow baseline
`floor(seconds * fps + 1)`; LTX 2.5 uses an `8n+1` grid with
`seconds * fps + 1`; MiniMax H3 uses a fixed 24 FPS timing rule with a `17n+5`
grid and the official workflow's `round(seconds * 24)` baseline before alignment.
Frame-grid alignment is an internal helper used by `WK Video Duration`, not a
separate public node. These rules are represented as profile data and pure
calculations; no ComfyUI or workflow-template implementation code is copied.

## WK Latent Size references (2026-08-17)

`WK Latent Size` independently implements a compact backend-only node after
studying the public behaviour of two MIT-licensed nodes: the megapixel/aspect
ratio calculation from [ControlAltAI-Nodes](https://github.com/gseth/ControlAltAI-Nodes)
(`721492b66c9cede8ae23ae10615462ad80cfd061`) and the batched `LATENT` output
shape from [ComfyUI_essentials](https://github.com/cubiq/ComfyUI_essentials)
(`9d9f4bedfc9f0321c19faf71855e228c93bd0dc9`).

No source file, preview-image implementation, font asset, or frontend code is
copied into WK. The two source snapshots and their original MIT licenses are
retained locally in the Nodes 2.0 P0 backup archive for audit only.

## Lucide Static v1.28.0

The local SVG definitions in `entry/ui-kit/icons.js` are derived from the
selected icons in [Lucide Static](https://github.com/lucide-icons/lucide),
version 1.28.0. They are bundled locally so WK family plugins do not request
icons from a CDN at runtime.

License: ISC

Copyright (c) 2020, Lucide Contributors

### Creation-icon refresh (2026-08-15)

`folderPlusModern`, `layersPlus`, and `libraryPlus` in
`entry/ui-kit/icons.js` use the following SVG paths from the Lucide repository
at commit `a7c781bd43dbf295a4c2ab07d25d544dd7879bf9`:

- `icons/folder-plus.svg`
- `icons/layers.svg`
- `icons/library-big.svg`

Scope: local inline SVG path data only. WorkspaceKit combines the latter two
with a small local plus mark so folders, canvas groups, and template groups
have distinct action silhouettes. No Lucide package, font, CDN, or runtime
network request is included.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
