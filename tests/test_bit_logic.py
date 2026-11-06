"""Runs the logic tests that a Bit carries in bits/<id>/tests/*.test.ts.

An interactive Bit whose rules must be right (a game, a simulation) keeps them in plain
TypeScript modules and tests them with Node's own runner, with no extra dependency
(docs/style/interactive.md, "Logic and tests"). Going through pytest puts them in `just test`
and in CI without another step.
"""

from __future__ import annotations

import shutil
import subprocess
from pathlib import Path

import pytest

REAL_ROOT = Path(__file__).resolve().parents[1]
NODE = shutil.which("node")
BITS_WITH_TESTS = sorted(
    {path.parents[1].name for path in REAL_ROOT.glob("bits/*/tests/*.test.ts")}
)


@pytest.mark.skipif(not NODE, reason="node not installed")
@pytest.mark.parametrize("bit", BITS_WITH_TESTS)
def test_bit_logic(bit: str) -> None:
    files = sorted(str(p) for p in (REAL_ROOT / "bits" / bit / "tests").glob("*.test.ts"))
    result = subprocess.run(
        [NODE, "--experimental-strip-types", "--no-warnings", "--test", *files],
        cwd=REAL_ROOT,
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, result.stdout + result.stderr
