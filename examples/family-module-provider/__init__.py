"""Example WorkspaceKit family-module provider (C-tier scaffold).

Copy this folder out to a new ComfyUI custom_nodes plugin to start a new panel
that merges into WorkspaceKit and also works standalone. See README.md.
"""

WEB_DIRECTORY = "./web"

# Frontend-only extension. Node mappings stay explicit so ComfyUI imports the
# package without treating it as incomplete.
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

__all__ = [
    "WEB_DIRECTORY",
    "NODE_CLASS_MAPPINGS",
    "NODE_DISPLAY_NAME_MAPPINGS",
]
