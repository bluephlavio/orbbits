"""Test fixtures: a throwaway OrbBits repository built from the real templates."""

from __future__ import annotations

import shutil
from pathlib import Path

import pytest
from typer.testing import CliRunner

from orbbits.repo import Repo

REAL_ROOT = Path(__file__).resolve().parents[1]


@pytest.fixture
def repo(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Repo:
    root = tmp_path / "orbbits"
    (root / "bits").mkdir(parents=True)
    (root / "web").mkdir()
    shutil.copytree(REAL_ROOT / "templates", root / "templates")
    (root / "pyproject.toml").write_text('[project]\nname = "orbbits-test"\n')
    monkeypatch.setenv("ORBBITS_ROOT", str(root))
    monkeypatch.chdir(root)
    return Repo(root)


@pytest.fixture
def runner() -> CliRunner:
    return CliRunner()


def write_bit(repo: Repo, bit_id: str, manifest: str, files: dict[str, str] | None = None) -> Path:
    d = repo.bit_dir(bit_id)
    d.mkdir(parents=True)
    (d / "bit.yml").write_text(manifest)
    for rel, content in (files or {}).items():
        path = d / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content)
    return d
