# Third-party notices

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
