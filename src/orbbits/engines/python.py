"""Script-generated figures (matplotlib, cartopy, ...): run src/main.py, which writes dist/.

The script sees ORBBITS_LOCALE (once per locale that declares outputs; docs/localization.md)
and ORBBITS_QUICK.
"""

from __future__ import annotations

import sys
from pathlib import Path

from orbbits.bit import Bit
from orbbits.engines.base import LOCALE_ENV, Engine, EngineError, Issue


class PythonEngine(Engine):
    name = "python"

    def _script(self, bit: Bit) -> Path:
        return self.main_source(bit, ".py", ("main.py", "figure.py", "plot.py"))

    def check(self, bit: Bit) -> list[Issue]:
        try:
            self._script(bit)
        except EngineError as exc:
            return [Issue("error", str(exc), bit.id)]
        return []

    def build(self, bit: Bit, *, quick: bool = False) -> list[Path]:
        script = self._script(bit)
        bit.dist.mkdir(exist_ok=True)
        before = {p: p.stat().st_mtime for p in bit.dist.rglob("*") if p.is_file()}
        # The script runs with the Bit directory as cwd and should write into dist/.
        for locale, _outputs in self.locale_runs(bit):
            self.run(
                [sys.executable, str(script)],
                cwd=bit.dir,
                env={"ORBBITS_QUICK": "1" if quick else "", LOCALE_ENV: locale},
            )
        written = [
            p for p in bit.dist.rglob("*") if p.is_file() and before.get(p) != p.stat().st_mtime
        ]
        if not written:
            raise EngineError("script ran but wrote nothing under dist/")
        return sorted(written)
