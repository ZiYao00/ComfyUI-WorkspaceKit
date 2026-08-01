"""Run standalone Python service contracts without requiring a ComfyUI server."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
TESTS = sorted(SCRIPTS.glob("test-*.py"))

if not TESTS:
    raise SystemExit("No Python contract tests were found.")

for test in TESTS:
    print(f"\n[python-contracts] {test.name}", flush=True)
    completed = subprocess.run([sys.executable, str(test)], cwd=ROOT)
    if completed.returncode:
        raise SystemExit(completed.returncode)

print(f"\nPython contract tests passed: {len(TESTS)}")
