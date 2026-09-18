"""Locate the OrbBits repository and enumerate its Bits."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from orbbits.bit import Bit, ManifestError

# A directory is the repository root when all of these exist in it.
ROOT_MARKERS = ("bits", "templates", "pyproject.toml")


class RepoNotFound(Exception):
    pass


def find_root(start: Path | None = None) -> Path:
    """Walk upwards from `start` (or $ORBBITS_ROOT / cwd) until the repo root is found."""
    env = os.environ.get("ORBBITS_ROOT")
    if env:
        root = Path(env).expanduser().resolve()
        if not all((root / m).exists() for m in ROOT_MARKERS):
            raise RepoNotFound(f"ORBBITS_ROOT={root} is not an OrbBits repository")
        return root
    here = (start or Path.cwd()).resolve()
    for candidate in (here, *here.parents):
        if all((candidate / m).exists() for m in ROOT_MARKERS):
            return candidate
    raise RepoNotFound(
        "Not inside an OrbBits repository (no directory with bits/, templates/ and pyproject.toml "
        "above the current one). Run from the repository or set ORBBITS_ROOT."
    )


@dataclass(frozen=True)
class Repo:
    root: Path

    @classmethod
    def discover(cls, start: Path | None = None) -> Repo:
        return cls(find_root(start))

    @property
    def bits_dir(self) -> Path:
        return self.root / "bits"

    @property
    def templates_dir(self) -> Path:
        return self.root / "templates"

    @property
    def web_dir(self) -> Path:
        return self.root / "web"

    def bit_dir(self, bit_id: str) -> Path:
        return self.bits_dir / bit_id

    def bit_ids(self) -> list[str]:
        """Every directory under bits/, whether or not it has a valid manifest."""
        if not self.bits_dir.is_dir():
            return []
        return sorted(
            p.name for p in self.bits_dir.iterdir() if p.is_dir() and not p.name.startswith(".")
        )

    def load_bit(self, bit_id: str) -> Bit:
        return Bit.load(self.bit_dir(bit_id))

    def scan(self) -> tuple[list[Bit], list[ManifestError]]:
        """Load every Bit; broken ones are returned separately instead of aborting the scan."""
        bits: list[Bit] = []
        errors: list[ManifestError] = []
        for bit_id in self.bit_ids():
            try:
                bits.append(self.load_bit(bit_id))
            except ManifestError as exc:
                errors.append(exc)
        return bits, errors
