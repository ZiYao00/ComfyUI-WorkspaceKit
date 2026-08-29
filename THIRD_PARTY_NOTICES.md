# Third-Party Notices

ComfyUI-WorkspaceKit is an integrated ComfyUI extension. It includes ideas, adapted implementations, or migrated behavior from the following open-source projects.

Some runtime identifiers, storage keys, and compatibility paths still contain
`workspace2` because they preserve data created by earlier Workspace2 versions.
That compatibility name does not change the public project name.

This project is not affiliated with, endorsed by, or maintained by the original authors of these projects.

## License policy after WorkspaceKit unification

ComfyUI-WorkspaceKit is licensed as a whole under **GNU GPL version 3 only (GPL-3.0-only)**. Third-party components below retain their original copyright, license notices, and attribution requirements. Permissively licensed MIT components remain usable inside the GPL-covered combined work; their original notices are preserved here and, where bundled verbatim, beside the corresponding vendor files.

The 2026-08-29 unification program also migrates functionality from the maintainer-owned `ComfyUI-WorkspaceKit-Theme` (MIT before merge) and `ComfyUI-WorkspaceKit-Layout` (GPL-3.0-only). Those repositories remain provenance/history sources during migration.

## ComfyUI-NodeAligner

Repository: https://github.com/Tenney95/ComfyUI-NodeAligner

Fixed upstream commit: `321ec9dcb859404f4b89cbd359ebc2c25ac59146`

License: GNU General Public License v3.0

WorkspaceKit migration scope:

- `node_info.js` was the approved GPL baseline copied into the former `ComfyUI-WorkspaceKit-Layout` repository on 2026-07-22.
- The former Layout path `web/legacy/nodealigner/node_info.js` is a modified GPL-derived compatibility implementation covering the legacy toolbar/selection shell, six alignment actions, horizontal/vertical distribution, and equal-size behavior.
- On 2026-07-24, Layout delegated the six alignment and two distribution geometry calculations to its own `web/core/geometry-service.js` while the legacy compatibility layer continued applying mutations.
- During single-plugin migration, any retained derivative moves under `entry/layout/legacy/nodealigner/`; it remains GPL-derived and must keep this fixed commit/source record until that responsibility is independently replaced and verified.

Required preservation: upstream copyright notice, GPL-3.0 terms, fixed commit, copied/adapted source scope, local destination, and dated modification record.

## Color Thief 3.3.0

Repository: https://github.com/lokesh/color-thief

License: MIT License

Copyright: Copyright (c) 2015 Lokesh Dhakar

Historical Theme scope:

- The former `ComfyUI-WorkspaceKit-Theme` repository used Color Thief only for local browser-side extraction of suggested colors from a user-loaded reference image.
- That repository bundled `js/vendor/color-thief/color-thief-3.3.0.browser.js` with its complete MIT `LICENSE` beside the vendor file.
- The unified plugin **does not migrate or bundle Color Thief at runtime**. B05 replaced it with the WorkspaceKit-owned bounded-canvas RGB-bucket extractor in `entry/appearance/reference-palette.js`, while this notice remains as provenance for the former Theme implementation.

## ComfyUI-N-Sidebar

Repository: https://github.com/Nuked88/ComfyUI-N-Sidebar

License: MIT License

Original license notice found in the local reference copy:

```text
MIT License
Copyright (c) 2023 pythongosssss
```

Usage in WorkspaceKit:

- Node sidebar ideas.
- Node search and favorite-management behavior.
- Node/favorite grouping ideas.
- Drag-and-drop node management references.

## comfyui-workspace-manager

Repository: https://github.com/11cafe/comfyui-workspace-manager

License: MIT License

Original license notice from the fork base:

```text
MIT License
Copyright (c) 2024 11cafe
```

Usage in WorkspaceKit:

- Workflow-management foundation.
- Workspace organization concepts.
- Workflow folder management ideas.
- Some backend service structure inherited from the original plugin.

## ComfyUI-xiaozhuguang

Repository: https://github.com/xiaozhuguang/ComfyUI-xiaozhuguang

License: MIT License

Original license notice found in the local reference copy:

```text
MIT License
Copyright (c) 2025 xiaozhuguang
```

Usage in WorkspaceKit:

- Canvas group enhancement references.
- Title-node references.
- Pinyin search, usage-frequency, and recent-use ideas for future Nodes2 work.

## pinyin-pro

Repository: https://github.com/zh-lx/pinyin-pro

Website: https://pinyin-pro.cn/

License: MIT License

Original license notice:

```text
MIT License
Copyright (c) 2022-present zh-lx
```

Usage in WorkspaceKit:

- WorkspaceKit bundles an ESM build as `entry/pinyin-pro.esm.js`.
- Nodes2 uses it to support pinyin-based search for Chinese node names and categories.

## Notes

Third-party code and adapted implementations remain subject to their original license terms.

Where source files are directly copied or substantially adapted, original copyright and license notices should be preserved where practical. This notice file records the main upstream sources used to build ComfyUI-WorkspaceKit.
