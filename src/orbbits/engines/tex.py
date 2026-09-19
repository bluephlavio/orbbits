"""TikZ figures and LaTeX documents: latexmk -> PDF, then optional SVG/PNG conversions.

Which outputs are produced is driven by the manifest's `outputs` list (formats pdf, svg, png).
Localised Bits compile once per locale that declares outputs, with `\orbLocale` defined to
the language tag before the source is read (docs/localization.md); each run has its own work
directory because latexmk does not notice a changed -pretex.
"""

from __future__ import annotations

import shutil
from pathlib import Path

from orbbits.bit import Bit
from orbbits.engines.base import LOCALE_ENV, Engine, EngineError, Issue

COMPILERS = {"pdflatex": "-pdf", "lualatex": "-lualatex", "xelatex": "-xelatex"}

# TeX macro holding the language of the current run; sources read it with
# \providecommand{\orbLocale}{it} (a default for compiling outside orbbits) + \ifthenelse.
LOCALE_MACRO = "orbLocale"


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

        written: list[Path] = []
        for locale, outputs in self.locale_runs(bit):
            pdf = self._compile(main, compiler, bit.build_dir / "tex" / locale, locale, quick)
            targets = [
                (o.format, bit.dir / o.file) for o in outputs if o.format in ("pdf", "svg", "png")
            ]
            if not bit.manifest.outputs:
                targets = [(fmt, bit.dist / f"{main.stem}.{fmt}") for fmt in self.default_formats]
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

    def _compile(self, main: Path, compiler: str, work: Path, locale: str, quick: bool) -> Path:
        """Compile `main` for one language into `work`; returns the PDF."""
        work.mkdir(parents=True, exist_ok=True)
        pretex = f"\\def\\{LOCALE_MACRO}{{{locale}}}"
        env = {LOCALE_ENV: locale}
        if shutil.which("latexmk"):
            cmd = [
                "latexmk",
                COMPILERS[compiler],
                "-interaction=nonstopmode",
                "-halt-on-error",
                f"-output-directory={work}",
                "-usepretex",
                f"-pretex={pretex}",
                main.name,
            ]
            self.run(cmd, cwd=main.parent, env=env)
        else:
            cmd = [
                compiler,
                "-interaction=nonstopmode",
                "-halt-on-error",
                f"-output-directory={work}",
                f"-jobname={main.stem}",
                f"{pretex}\\input{{{main.name}}}",
            ]
            for _ in range(1 if quick else 2):
                self.run(cmd, cwd=main.parent, env=env)
        pdf = work / (main.stem + ".pdf")
        if not pdf.is_file():
            raise EngineError(f"expected {pdf} after compilation")
        return pdf

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
