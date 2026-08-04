"""Safe, reversible-in-the-failure-path workflow-folder dissolution.

"Dissolve" removes only one folder. Its direct children are promoted to the
parent folder, while child folders retain all descendants. This is deliberately
server-side: a browser loop of individual move requests can leave a half-moved
tree after a name collision or network failure.
"""

from pathlib import Path

from .folder_meta_service import read_folder_meta, write_folder_meta


def _relative_key(path):
    return str(path).replace("\\", "/").strip("/")


def _inside(root, candidate):
    try:
        candidate.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def _dissolved_folder_meta(meta, source_key, parent_key):
    """Return metadata after removing source_key and promoting descendants."""
    prefix = f"{source_key}/"
    result = {}
    remapped = {}
    for key, value in (meta or {}).items():
        if key == source_key:
            continue
        if key.startswith(prefix):
            suffix = key[len(prefix):]
            next_key = f"{parent_key}/{suffix}".strip("/")
            remapped[next_key] = value
        else:
            result[key] = value
    collisions = set(result).intersection(remapped)
    if collisions:
        raise FileExistsError(f"Folder metadata already exists: {sorted(collisions)[0]}")
    result.update(remapped)
    return result


def dissolve_folder(workflows_root, comfy_path, relative_path):
    """Remove a workflow folder while promoting all of its direct children.

    Filesystem conflicts and metadata conflicts are checked before any move.
    On a later failure, every moved child and the metadata file are restored.
    """
    root = Path(workflows_root).resolve()
    source_key = _relative_key(relative_path)
    if not source_key:
        raise ValueError("Cannot dissolve the workflows root")
    source = (root / source_key).resolve()
    if not _inside(root, source) or not source.is_dir():
        raise ValueError("Source folder not found")

    parent = source.parent
    if not _inside(root, parent):
        raise ValueError("Invalid source folder")
    parent_key = _relative_key(source.relative_to(root).parent)
    children = sorted(source.iterdir(), key=lambda item: item.name.casefold())
    if not children:
        # The UI omits Dissolve for known-empty folders. If another process
        # emptied it after render, never let this fallback bypass the trash.
        raise ValueError("Cannot dissolve an empty folder")
    destinations = [(child, parent / child.name) for child in children]
    for _, target in destinations:
        if target.exists():
            raise FileExistsError(f"Target already exists: {target.name}")

    before_meta = read_folder_meta(comfy_path)
    after_meta = _dissolved_folder_meta(before_meta, source_key, parent_key)
    moved = []
    try:
        for child, target in destinations:
            child.rename(target)
            moved.append((child, target))
        source.rmdir()
        write_folder_meta(comfy_path, after_meta)
    except Exception:
        # The source may already be gone after rmdir(). Recreate it before
        # returning moved children so the original hierarchy is restored.
        source.mkdir(parents=True, exist_ok=True)
        for child, target in reversed(moved):
            if target.exists():
                target.rename(child)
        # write_folder_meta may fail after partially replacing its JSON file.
        # Restore the known pre-operation metadata unconditionally before the
        # original error is surfaced.
        write_folder_meta(comfy_path, before_meta)
        raise

    return {
        "path": source_key,
        "parent_path": parent_key,
        "moved_count": len(moved),
        "folder_meta": after_meta,
    }
