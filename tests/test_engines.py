import shutil

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
