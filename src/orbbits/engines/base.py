"""Engine contract: how a Bit is built, previewed and sanity-checked.

An engine is a tiny class; there is no plugin system. Register new ones in
orbbits/engines/__init__.py.
"""

from __future__ import annotations

import os
import shutil
import subprocess
from dataclasses import dataclass
from pathlib import Path

from orbbits.bit import Bit
from orbbits.manifest import Output
from orbbits.repo import Repo

# Environment variable telling a build (Manim scene, Python script) which language to render.
LOCALE_ENV = "ORBBITS_LOCALE"


class EngineError(Exception):
    pass


class ToolMissing(EngineError):
    pass


class NotSupported(EngineError):
    pass


@dataclass(frozen=True)
class Issue:
    level: str  # "error" | "warning"
    message: str
    bit_id: str | None = None

    @property
    def is_error(self) -> bool:
        return self.level == "error"


class Engine:
    name = "base"
    #: Which template scaffolds this engine (informational).
    template: str | None = None

    def __init__(self, repo: Repo):
        self.repo = repo

    # -- lifecycle -------------------------------------------------------------------------

    def build(self, bit: Bit, *, quick: bool = False) -> list[Path]:
        """Produce classroom-ready outputs. Returns the files written."""
        raise NotSupported(f"engine '{self.name}' has no build step")

    def dev(self, bit: Bit) -> None:
        """Start a live preview / development loop. Blocks until interrupted."""
        raise NotSupported(f"engine '{self.name}' has no dev mode; use `orbbits build {bit.id}`")

    def check(self, bit: Bit) -> list[Issue]:
        """Engine-specific structural checks (sources present, options sane)."""
        return []

    # -- helpers ---------------------------------------------------------------------------

    @staticmethod
    def require(tool: str, hint: str | None = None) -> str:
        path = shutil.which(tool)
        if not path:
            raise ToolMissing(f"'{tool}' not found on PATH" + (f" — {hint}" if hint else ""))
        return path

    @staticmethod
    def run(cmd: list[str], *, cwd: Path, env: dict[str, str] | None = None) -> None:
        """Run a subprocess streaming its output; raise EngineError on failure."""
        merged = {**os.environ, **(env or {})}
        try:
            subprocess.run(cmd, cwd=cwd, env=merged, check=True)
        except subprocess.CalledProcessError as exc:
            raise EngineError(f"command failed ({exc.returncode}): {' '.join(cmd)}") from exc
        except FileNotFoundError as exc:
            raise ToolMissing(f"'{cmd[0]}' not found on PATH") from exc

    @staticmethod
    def declared_outputs(bit: Bit, *formats: str) -> list[Path]:
        """Absolute paths of declared outputs, optionally filtered by format."""
        return [
            bit.dir / o.file for o in bit.manifest.outputs if not formats or o.format in formats
        ]

    @staticmethod
    def locale_runs(bit: Bit) -> list[tuple[str, list[Output]]]:
        """How many times to build, in which language, for which declared outputs.

        One run per locale that has outputs of its own; locale-independent outputs (posters,
        formula sheets) are produced by the default locale's run. A Bit without localised
        outputs - the common case - builds once, in its default locale.
        """
        m = bit.manifest
        runs: dict[str, list[Output]] = {m.default_locale: []}
        for o in m.outputs:
            runs.setdefault(o.locale or m.default_locale, []).append(o)
        if len(runs) > 1:
            runs = {tag: outs for tag, outs in runs.items() if outs}
        return list(runs.items())

    @staticmethod
    def main_source(bit: Bit, suffix: str, preferred: tuple[str, ...] = ()) -> Path:
        """Resolve the main source file: build.main, a preferred name, or the only candidate."""
        configured = bit.manifest.build.get("main")
        if configured:
            path = bit.dir / configured
            if not path.is_file():
                raise EngineError(f"build.main points to a missing file: {configured}")
            return path
        for name in preferred:
            if (bit.src / name).is_file():
                return bit.src / name
        candidates = sorted(p for p in bit.src.glob(f"*{suffix}") if p.is_file())
        if len(candidates) == 1:
            return candidates[0]
        if not candidates:
            raise EngineError(f"no {suffix} source found in src/")
        raise EngineError(
            f"several {suffix} sources in src/; set build.main in bit.yml "
            f"({', '.join(p.name for p in candidates)})"
        )
