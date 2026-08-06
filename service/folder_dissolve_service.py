"""Safe, reversible-in-the-failure-path workflow-folder dissolution.

"Dissolve" removes only one folder. Its direct children are promoted to the
parent folder, while child folders retain all descendants. This is deliberately
server-side: a browser loop of individual move requests can leave a half-moved
tree after a name collision or network failure.

"Flatten" removes a whole subtree instead, promoting every file at any depth
into the folder's parent. Both share one rule: every destination name is
resolved and reserved before the first move, so a collision discovered halfway
through can never leave the tree partly rearranged.
"""

from pathlib import Path

from .folder_meta_service import read_folder_meta, write_folder_meta
from .name_sequence_service import resolve_names


def _relative_key(path):
    # `Path("A").parent` is `Path(".")`, not an empty path. Without collapsing
    # that to "" a top-level dissolve produced metadata keys like "./child",
    # which the panel — looking up plain "child" — could never match, silently
    # dropping every promoted folder's icon and colour.
    key = str(path).replace("\\", "/").strip("/")
    return "" if key == "." else key.removeprefix("./")


def _inside(root, candidate):
    try:
        candidate.resolve().relative_to(root.resolve())
        return True
    except ValueError:
        return False


def _dissolved_folder_meta(meta, source_key, parent_key, renames=None):
    """Return metadata after removing source_key and promoting descendants.

    `renames` maps a direct child's original name to its final name. A renamed
    child folder carries its whole styled subtree with it, so the rename must
    also be applied to the first path segment of every descendant key, not only
    to the child's own key.
    """
    prefix = f"{source_key}/"
    rename_map = {str(key): str(value) for key, value in (renames or {}).items()}
    result = {}
    remapped = {}
    for key, value in (meta or {}).items():
        if key == source_key:
            continue
        if key.startswith(prefix):
            suffix = key[len(prefix):]
            head, separator, tail = suffix.partition("/")
            suffix = f"{rename_map.get(head, head)}{separator}{tail}"
            next_key = f"{parent_key}/{suffix}".strip("/")
            remapped[next_key] = value
        else:
            result[key] = value
    collisions = set(result).intersection(remapped)
    if collisions:
        raise FileExistsError(f"Folder metadata already exists: {sorted(collisions)[0]}")
    result.update(remapped)
    return result


def dissolve_folder(workflows_root, comfy_path, relative_path, locale="en-US"):
    """Remove a workflow folder while promoting all of its direct children.

    A child whose name is already taken in the parent receives a sequence
    number instead of blocking the whole operation. Every final name is
    resolved before the first move, so a collision can never leave the tree
    partly rearranged. On a later failure, every moved child and the metadata
    file are restored.
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

    # Every existing name in the parent is unavailable, including the source
    # folder's own name: it is still on disk while its children are moved, so a
    # child that happens to share it (A/B/B) must be numbered rather than
    # colliding with the directory it is being promoted out of.
    taken = {item.name for item in parent.iterdir()}
    resolved = resolve_names([(child.name, child.is_dir()) for child in children], taken, locale)
    destinations = [(child, parent / final) for child, (_, final, _) in zip(children, resolved)]
    renames = {original: final for original, final, renamed in resolved if renamed}
    for _, target in destinations:
        if target.exists():
            raise FileExistsError(f"Target already exists: {target.name}")

    before_meta = read_folder_meta(comfy_path)
    after_meta = _dissolved_folder_meta(before_meta, source_key, parent_key, renames)
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
        "renamed_count": len(renames),
        "folder_meta": after_meta,
    }


def _flattened_folder_meta(meta, source_key):
    """Return metadata with the whole source subtree removed.

    Flatten deletes every folder under the source, so their icons and colours
    have nothing left to describe. Dropping the keys is required, not tidy-up:
    a later folder created at the same path would silently inherit the styling
    of a folder the user deliberately flattened away.
    """
    prefix = f"{source_key}/"
    return {
        key: value for key, value in (meta or {}).items()
        if key != source_key and not key.startswith(prefix)
    }


def flatten_folder(workflows_root, comfy_path, relative_path, locale="en-US"):
    """Remove a folder and its whole subtree, promoting every file inside.

    Unlike dissolve, this keeps no inner structure: files found at any depth
    land directly in the source folder's parent. Collisions are far more likely
    than in a one-level dissolve, so numbering is what makes the operation
    usable at all rather than a convenience.
    """
    root = Path(workflows_root).resolve()
    source_key = _relative_key(relative_path)
    if not source_key:
        raise ValueError("Cannot flatten the workflows root")
    source = (root / source_key).resolve()
    if not _inside(root, source) or not source.is_dir():
        raise ValueError("Source folder not found")

    parent = source.parent
    if not _inside(root, parent):
        raise ValueError("Invalid source folder")
    parent_key = _relative_key(source.relative_to(root).parent)

    files = sorted(
        (item for item in source.rglob("*") if item.is_file()),
        key=lambda item: str(item).casefold(),
    )
    if not files:
        # Same guard as dissolve: an empty subtree has nothing to promote, and
        # removing it here would be a deletion disguised as a reorganization.
        raise ValueError("Cannot flatten an empty folder")

    # As in dissolve, the source folder's own name counts as taken: it is still
    # on disk while its files are moved out, so a file inside it that shares the
    # folder's name must be numbered instead of colliding with it.
    taken = {item.name for item in parent.iterdir()}
    resolved = resolve_names([(item.name, False) for item in files], taken, locale)
    destinations = [(item, parent / final) for item, (_, final, _) in zip(files, resolved)]
    renamed_count = sum(1 for _, _, renamed in resolved if renamed)
    for _, target in destinations:
        if target.exists():
            raise FileExistsError(f"Target already exists: {target.name}")

    before_meta = read_folder_meta(comfy_path)
    after_meta = _flattened_folder_meta(before_meta, source_key)
    moved = []
    try:
        for item, target in destinations:
            item.rename(target)
            moved.append((item, target))
        # Only now is the subtree provably empty of files. Remove the deepest
        # directories first so each parent is empty by the time it is reached.
        for directory in sorted(
            (item for item in source.rglob("*") if item.is_dir()),
            key=lambda item: len(item.parts),
            reverse=True,
        ):
            directory.rmdir()
        source.rmdir()
        write_folder_meta(comfy_path, after_meta)
    except Exception:
        # Recreate each original parent directory before moving its file back:
        # the rollback may be running after some of them were already removed.
        for item, target in reversed(moved):
            if target.exists():
                item.parent.mkdir(parents=True, exist_ok=True)
                target.rename(item)
        source.mkdir(parents=True, exist_ok=True)
        write_folder_meta(comfy_path, before_meta)
        raise

    return {
        "path": source_key,
        "parent_path": parent_key,
        "moved_count": len(moved),
        "renamed_count": renamed_count,
        "folder_meta": after_meta,
    }
