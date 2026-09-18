"""TikZ figures and LaTeX documents: latexmk -> PDF, then optional SVG/PNG conversions.

Which outputs are produced is driven by the manifest's `outputs` list (formats pdf, svg, png).
"""

from __future__ import annotations

import shutil
from pathlib import Path

from orbbits.bit import Bit
from orbbits.engines.base import Engine, EngineError, Issue

COMPILERS = {"pdflatex": "-pdf", "lualatex": "-lualatex", "xelatex": "-xelatex"}


class TexEngine(Engine):
    name = "latex"
    template = "latex"
    default_formats: tuple[str, ...] = ("pdf",)

    def check(self, bit: Bit) -> list[Issue]:
        issues: list[Issue] = []
        try:
            self.main_source(bit, ".tex", ("main.tex", "figure.tex"))
        except EngineError as exc:
            issues.append(Issue("error", str(exc), bit.id))
        compiler = bit.manifest.build.get("compiler", "pdflatex")
        if compiler not in COMPILERS:
            issues.append(
                Issue(
                    "error", f"build.compiler '{compiler}' unknown ({', '.join(COMPILERS)})", bit.id
                )
            )
        for o in bit.manifest.outputs:
            if o.format not in ("pdf", "svg", "png"):
                issues.append(
                    Issue(
                        "warning",
                        f"output format '{o.format}' is not produced by {self.name}",
                        bit.id,
                    )
                )
        return issues

    def build(self, bit: Bit, *, quick: bool = False) -> list[Path]:
        main = self.main_source(bit, ".tex", ("main.tex", "figure.tex"))
        compiler = bit.manifest.build.get("compiler", "pdflatex")
        if compiler not in COMPILERS:
            raise EngineError(f"unknown build.compiler '{compiler}'")
        self.require(compiler, "install a TeX distribution")

        work = bit.build_dir / "tex"
        work.mkdir(parents=True, exist_ok=True)
        pdf = work / (main.stem + ".pdf")

        if shutil.which("latexmk"):
            cmd = [
                "latexmk",
                COMPILERS[compiler],
                "-interaction=nonstopmode",
                "-halt-on-error",
                f"-output-directory={work}",
                main.name,
            ]
            self.run(cmd, cwd=main.parent)
        else:
            cmd = [
                compiler,
                "-interaction=nonstopmode",
                "-halt-on-error",
                f"-output-directory={work}",
                main.name,
            ]
            for _ in range(1 if quick else 2):
                self.run(cmd, cwd=main.parent)
        if not pdf.is_file():
            raise EngineError(f"expected {pdf} after compilation")

        written: list[Path] = []
        targets = self._targets(bit, main.stem)
        for fmt, dest in targets:
            dest.parent.mkdir(parents=True, exist_ok=True)
            if fmt == "pdf":
                shutil.copy2(pdf, dest)
            elif fmt == "svg":
                self._to_svg(pdf, dest)
            elif fmt == "png":
                self._to_png(pdf, dest)
            written.append(dest)
        return written

    def _targets(self, bit: Bit, stem: str) -> list[tuple[str, Path]]:
        declared = [
            (o.format, bit.dir / o.file)
            for o in bit.manifest.outputs
            if o.format in ("pdf", "svg", "png")
        ]
        if declared:
            return declared
        return [(fmt, bit.dist / f"{stem}.{fmt}") for fmt in self.default_formats]

    def _to_svg(self, pdf: Path, dest: Path) -> None:
        if shutil.which("pdf2svg"):
            self.run(["pdf2svg", str(pdf), str(dest)], cwd=pdf.parent)
        elif shutil.which("dvisvgm"):
            self.run(["dvisvgm", "--pdf", "--no-fonts", "-o", str(dest), str(pdf)], cwd=pdf.parent)
        else:
            raise EngineError("need pdf2svg or dvisvgm to produce SVG")

    def _to_png(self, pdf: Path, dest: Path) -> None:
        gs = self.require("gs", "install ghostscript for PNG output")
        self.run(
            [
                gs,
                "-q",
                "-dSAFER",
                "-dBATCH",
                "-dNOPAUSE",
                "-sDEVICE=png16m",
                "-r300",
                "-dTextAlphaBits=4",
                "-dGraphicsAlphaBits=4",
                f"-sOutputFile={dest}",
                str(pdf),
            ],
            cwd=pdf.parent,
        )


class TikzEngine(TexEngine):
    name = "tikz"
    template = "tikz"
    default_formats = ("svg", "pdf")
