import shutil
from pathlib import Path

import pytest

from orbbits.engines import EngineError, NotSupported, get_engine, is_web_engine
from orbbits.engines.manim import ManimEngine
from orbbits.engines.tex import TexEngine, TikzEngine
from orbbits.engines.web import WebEngine
from orbbits.scaffold import create_bit


def test_registry(repo):
    assert isinstance(get_engine(repo, "manim"), ManimEngine)
    assert isinstance(get_engine(repo, "tikz"), TikzEngine)
    assert isinstance(get_engine(repo, "latex"), TexEngine)
    for name in ("react", "jsxgraph", "p5", "mafs", "three"):
        assert is_web_engine(name)
        assert isinstance(get_engine(repo, name), WebEngine)
    with pytest.raises(NotSupported):
        get_engine(repo, "external")
    with pytest.raises(EngineError, match="unknown engine"):
        get_engine(repo, "crayon")


def test_manim_scene_discovery(repo):
    bit = create_bit(repo, template="manim", title="Angle as rotation").bit
    engine = get_engine(repo, "manim")
    assert engine._scene_name(bit, engine._scene_file(bit)) == "AngleAsRotation"


def test_tex_main_source_resolution(repo):
    bit = create_bit(repo, template="tikz", title="Fig").bit
    engine = get_engine(repo, "tikz")
    assert engine.main_source(bit, ".tex", ("figure.tex",)).name == "figure.tex"
    (bit.src / "other.tex").write_text("")
    # Two candidates and no preferred name match -> must be configured explicitly.
    (bit.src / "figure.tex").rename(bit.src / "first.tex")
    with pytest.raises(EngineError, match="build.main"):
        engine.main_source(bit, ".tex", ("figure.tex",))


@pytest.mark.skipif(
    not (shutil.which("pdflatex") and (shutil.which("pdf2svg") or shutil.which("dvisvgm"))),
    reason="needs a TeX distribution",
)
def test_tikz_build_end_to_end(repo):
    bit = create_bit(repo, template="tikz", title="Fig").bit
    written = get_engine(repo, "tikz").build(bit)
    assert {p.name for p in written} == {"figure.svg", "figure.pdf"}
    assert all(p.is_file() and p.stat().st_size > 0 for p in written)
    assert (bit.dir / ".build").is_dir()


# --- localised builds (docs/localization.md) ----------------------------------------------

LOCALIZED_MANIM = """
id: rotating
title: R
kind: video
role: animation
engine: manim
default_locale: it
locales: [it, en]
outputs:
  - {format: mp4, file: dist/it/rotating.mp4, locale: it}
  - {format: mp4, file: dist/en/rotating.mp4, locale: en}
  - {format: webp, file: dist/poster.webp}
"""


def test_locale_runs_groups_outputs_by_language(repo):
    from orbbits.engines.base import Engine
    from tests.conftest import write_bit

    # The common case: nothing localised -> one run in the default language with everything.
    bit = create_bit(repo, template="manim", title="Plain").bit
    runs = Engine.locale_runs(bit)
    assert [(tag, [o.file for o in outs]) for tag, outs in runs] == [
        ("it", ["dist/plain.mp4", "dist/poster.webp"])
    ]
    # No outputs declared at all -> still one run (engines then use their defaults).
    write_bit(repo, "bare", "id: bare\ntitle: B\nkind: video\nrole: animation\nengine: manim\n")
    assert Engine.locale_runs(repo.load_bit("bare")) == [("it", [])]
    # Localised outputs: one run per language; locale-independent ones go with the default.
    write_bit(repo, "rotating", LOCALIZED_MANIM)
    runs = Engine.locale_runs(repo.load_bit("rotating"))
    assert [(tag, [o.file for o in outs]) for tag, outs in runs] == [
        ("it", ["dist/it/rotating.mp4", "dist/poster.webp"]),
        ("en", ["dist/en/rotating.mp4"]),
    ]
    # Only the other language declares outputs -> the default gets no pointless run.
    write_bit(
        repo,
        "only-en",
        "id: only-en\ntitle: O\nkind: video\nrole: animation\nengine: manim\nlocales: [it, en]\n"
        "outputs:\n  - {format: mp4, file: dist/en/o.mp4, locale: en}\n",
    )
    assert [tag for tag, _ in Engine.locale_runs(repo.load_bit("only-en"))] == ["en"]


def test_manim_builds_once_per_locale(repo, monkeypatch):
    """The render loop, with manim itself replaced by a stub that records ORBBITS_LOCALE."""
    from tests.conftest import write_bit

    write_bit(repo, "rotating", LOCALIZED_MANIM, {"src/scene.py": "class Rotating(Scene): pass\n"})
    bit = repo.load_bit("rotating")
    engine = get_engine(repo, "manim")
    seen: list[tuple[str, str]] = []

    def fake_run(cmd, *, cwd, env=None):
        media = Path(cmd[cmd.index("--media_dir") + 1])
        out = media / "videos" / "scene" / "1080p60" / "rotating.mp4"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(f"video {env['ORBBITS_LOCALE']}")
        seen.append((env["ORBBITS_LOCALE"], media.name))

    monkeypatch.setattr(engine, "run", fake_run)
    monkeypatch.setattr(engine, "_poster", lambda video, dest, which: dest.write_text("poster"))
    monkeypatch.setattr("importlib.util.find_spec", lambda name: object())
    written = engine.build(bit)

    assert seen == [("it", "it"), ("en", "en")]
    assert [p.relative_to(bit.dir).as_posix() for p in written] == [
        "dist/it/rotating.mp4",
        "dist/poster.webp",
        "dist/en/rotating.mp4",
    ]
    assert (bit.dir / "dist/it/rotating.mp4").read_text() == "video it"
    assert (bit.dir / "dist/en/rotating.mp4").read_text() == "video en"
    # --quick previews the default language only.
    seen.clear()
    assert engine.build(bit, quick=True)[0] == bit.build_dir / "preview" / "rotating.mp4"
    assert seen == [("it", "it")]


LOCALIZED_TIKZ = r"""
% \orbLocale is defined by `orbbits build` for each localised output; the default lets the
% file compile on its own.
\providecommand{\orbLocale}{it}
\documentclass[tikz,border=6pt]{standalone}
\usepackage{ifthen}
\newcommand{\orbT}[2]{\ifthenelse{\equal{\orbLocale}{en}}{#2}{#1}}
\begin{document}
\begin{tikzpicture}
  \node {\orbT{ciao mondo}{hello world}};
\end{tikzpicture}
\end{document}
"""


@pytest.mark.skipif(
    not (shutil.which("pdflatex") and (shutil.which("pdf2svg") or shutil.which("dvisvgm"))),
    reason="needs a TeX distribution",
)
def test_tikz_builds_localized_outputs(repo):
    from tests.conftest import write_bit

    write_bit(
        repo,
        "greeting",
        "id: greeting\ntitle: G\nkind: figure\nrole: diagram\nengine: tikz\nlocales: [it, en]\n"
        "outputs:\n"
        "  - {format: svg, file: dist/it/figure.svg, locale: it}\n"
        "  - {format: svg, file: dist/en/figure.svg, locale: en}\n"
        "  - {format: pdf, file: dist/figure.pdf}\n",
        {"src/figure.tex": LOCALIZED_TIKZ},
    )
    bit = repo.load_bit("greeting")
    written = get_engine(repo, "tikz").build(bit)
    assert [p.relative_to(bit.dir).as_posix() for p in written] == [
        "dist/it/figure.svg",
        "dist/figure.pdf",
        "dist/en/figure.svg",
    ]
    it_svg = (bit.dir / "dist/it/figure.svg").read_bytes()
    en_svg = (bit.dir / "dist/en/figure.svg").read_bytes()
    assert it_svg and en_svg and it_svg != en_svg  # different words, different glyphs
    assert (bit.build_dir / "tex" / "it" / "figure.log").is_file()
    assert (bit.build_dir / "tex" / "en" / "figure.log").is_file()
