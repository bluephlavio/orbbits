"""Interactive Bits (react, jsxgraph, p5, mafs, three, ...): one engine family.

The content is bits/<id>/src/index.tsx; the Astro runtime under web/ mounts it.
- dev:    starts the runtime and opens the Bit's standalone page;
- export: builds a standalone static site into bits/<id>/dist/web/ (rebuildable, not versioned);
- build:  same as export.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from orbbits.bit import Bit
from orbbits.engines.base import Engine, EngineError, Issue

ENTRY = "src/index.tsx"
DEV_PORT = 4321


class WebEngine(Engine):
    name = "web"
    template = "web"

    def __init__(self, repo, engine_name: str = "react"):
        super().__init__(repo)
        self.name = engine_name

    def _ensure_runtime(self) -> None:
        if not (self.repo.root / "node_modules" / ".bin" / "astro").exists():
            raise EngineError(
                "web runtime not installed: run `pnpm install` in the repository root"
            )
        self.require("pnpm", "install pnpm (https://pnpm.io)")

    def check(self, bit: Bit) -> list[Issue]:
        issues: list[Issue] = []
        if not (bit.dir / ENTRY).is_file():
            issues.append(
                Issue(
                    "error",
                    f"interactive Bit needs {ENTRY} with a default-exported component",
                    bit.id,
                )
            )
        for o in bit.manifest.outputs:
            if o.file.startswith("dist/web/"):
                issues.append(
                    Issue(
                        "warning",
                        "dist/web/ is a rebuildable export; no need to declare it",
                        bit.id,
                    )
                )
        return issues

    def dev(self, bit: Bit) -> None:
        self._ensure_runtime()
        # Absolute --root: Astro's background mode (used when it detects an AI agent) re-resolves
        # a relative root against web/ itself.
        self.run(
            [
                "pnpm",
                "exec",
                "astro",
                "dev",
                "--root",
                str(self.repo.web_dir),
                "--open",
                bit.manifest.path,
            ],
            cwd=self.repo.root,
        )

    def build(self, bit: Bit, *, quick: bool = False) -> list[Path]:
        return self.export(bit)

    def export(self, bit: Bit) -> list[Path]:
        """Standalone static site for one Bit: dist/web/index.html + relative assets."""
        self._ensure_runtime()
        if not (bit.dir / ENTRY).is_file():
            raise EngineError(f"missing {ENTRY}")
        out = bit.dist / "web"
        if out.exists():
            shutil.rmtree(out)
        self.run(
            ["pnpm", "exec", "astro", "build", "--root", str(self.repo.web_dir)],
            cwd=self.repo.root,
            env={"ORBBITS_EXPORT_BIT": bit.id, "ORBBITS_OUT_DIR": str(out)},
        )
        index = out / "index.html"
        if not index.is_file():
            raise EngineError(f"export finished but {index} is missing")
        return [index]
