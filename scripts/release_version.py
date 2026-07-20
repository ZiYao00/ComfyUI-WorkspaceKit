"""Synchronize and verify the WorkspaceKit release-version surfaces.

The Comfy Registry requires a literal semantic version in pyproject.toml, so
the release process uses that file as the authority rather than duplicating a
runtime constant throughout the project.
"""

from __future__ import annotations

import argparse
import datetime as dt
import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
PYPROJECT = ROOT / "pyproject.toml"
README_EN = ROOT / "README.md"
README_ZH = ROOT / "README.zh-CN.md"
CHANGELOG = ROOT / "CHANGELOG.md"
INIT = ROOT / "__init__.py"
SEMVER = re.compile(r"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$")
PYPROJECT_VERSION = re.compile(r'(?m)^version\s*=\s*["\']([^"\']+)["\']\s*$')
README_EN_STATUS = re.compile(r"(Current status: \*\*public beta, )[^*]+(\*\*\.)")
README_ZH_STATUS = re.compile(r"(当前状态：\*\*公开测试版，)[^*]+(\*\*。)")


def read_release_version() -> str:
    match = PYPROJECT_VERSION.search(PYPROJECT.read_text(encoding="utf-8"))
    if not match:
        raise ValueError("pyproject.toml has no [project] version")
    return match.group(1)


def replace_once(path: Path, pattern: re.Pattern[str], replacement: str) -> None:
    content = path.read_text(encoding="utf-8")
    updated, count = pattern.subn(replacement, content, count=1)
    if count != 1:
        raise ValueError(f"Expected one replaceable version marker in {path.name}")
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(updated)


def add_changelog_heading(version: str, release_date: str) -> None:
    content = CHANGELOG.read_text(encoding="utf-8")
    heading = f"## {version} - {release_date}"
    if heading in content:
        return
    prefix = "# Changelog\n\n"
    if not content.startswith(prefix):
        raise ValueError("CHANGELOG.md does not start with its expected title")
    placeholder = f"{heading}\n\nRelease notes pending.\n\n"
    with CHANGELOG.open("w", encoding="utf-8", newline="\n") as handle:
        handle.write(prefix + placeholder + content[len(prefix):])


def check(version: str) -> list[str]:
    problems: list[str] = []
    if not SEMVER.fullmatch(version):
        problems.append(f"pyproject version is not semantic X.Y.Z: {version}")
    if f"public beta, {version}" not in README_EN.read_text(encoding="utf-8"):
        problems.append("README.md status does not match pyproject")
    if f"公开测试版，{version}" not in README_ZH.read_text(encoding="utf-8"):
        problems.append("README.zh-CN.md status does not match pyproject")
    if "VERSION = _read_package_version()" not in INIT.read_text(encoding="utf-8"):
        problems.append("__init__.py is not reading the authoritative package version")
    if not re.search(rf"(?m)^## {re.escape(version)} - \d{{4}}-\d{{2}}-\d{{2}}$", CHANGELOG.read_text(encoding="utf-8")):
        problems.append("CHANGELOG.md has no heading for the current release version")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description="Synchronize WorkspaceKit release-version surfaces.")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--check", action="store_true", help="verify current release-version consistency")
    action.add_argument("--set", metavar="VERSION", help="set the next semantic release version")
    parser.add_argument("--date", help="release date for a new Changelog heading (YYYY-MM-DD)")
    args = parser.parse_args()

    if args.set:
        if not SEMVER.fullmatch(args.set):
            parser.error("VERSION must use semantic X.Y.Z form, for example 0.2.2")
        release_date = args.date or dt.date.today().isoformat()
        try:
            dt.date.fromisoformat(release_date)
        except ValueError:
            parser.error("--date must use YYYY-MM-DD form")
        replace_once(PYPROJECT, PYPROJECT_VERSION, f'version = "{args.set}"')
        replace_once(README_EN, README_EN_STATUS, rf"\g<1>{args.set}\g<2>")
        replace_once(README_ZH, README_ZH_STATUS, rf"\g<1>{args.set}\g<2>")
        add_changelog_heading(args.set, release_date)
        print(f"Updated release version to {args.set}. Add final Changelog notes before publishing.")

    version = read_release_version()
    problems = check(version)
    if problems:
        for problem in problems:
            print(f"ERROR: {problem}")
        return 1
    print(f"Release-version check passed: {version}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
