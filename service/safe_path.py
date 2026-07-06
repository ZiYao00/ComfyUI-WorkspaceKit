from pathlib import Path


def safe_join(base_dir, relative_path):
    base = Path(base_dir).resolve()
    rel = Path(relative_path or "")

    if rel.is_absolute():
        raise ValueError("Absolute paths are not allowed")

    if any(part == ".." for part in rel.parts):
        raise ValueError("Path traversal is not allowed")

    target = (base / rel).resolve()

    if not target.is_relative_to(base):
        raise ValueError("Resolved path escapes the base directory")

    return target


def safe_relative_path(base_dir, target_path):
    base = Path(base_dir).resolve()
    target = Path(target_path).resolve()

    if not target.is_relative_to(base):
        raise ValueError("Target path escapes the base directory")

    return target.relative_to(base).as_posix()
