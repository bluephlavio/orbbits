import json

from orbbits.cli import app
from orbbits.scaffold import create_bit


def test_new_non_interactive_and_list(repo, runner):
    result = runner.invoke(app, ["new", "--title", "Projectile motion", "--template", "web"])
    assert result.exit_code == 0, result.output
    assert "created bits/projectile-motion/" in result.output
    assert repo.bit_dir("projectile-motion").is_dir()

    result = runner.invoke(app, ["list", "--json"])
    assert result.exit_code == 0, result.output
    data = json.loads(result.output)
    assert [b["id"] for b in data] == ["projectile-motion"]
    assert data[0]["kind"] == "interactive" and data[0]["engine"] == "react"


def test_new_requires_title_and_template_when_not_interactive(repo, runner):
    assert runner.invoke(app, ["new"]).exit_code == 2
    assert runner.invoke(app, ["new", "--title", "X"]).exit_code == 2


def test_new_refuses_duplicate(repo, runner):
    create_bit(repo, template="tikz", title="Dup")
    result = runner.invoke(app, ["new", "--title", "Dup", "--template", "tikz"])
    assert result.exit_code == 1
    assert "already exists" in result.output


def test_new_list_templates(repo, runner):
    result = runner.invoke(app, ["new", "--list"])
    assert result.exit_code == 0
    for name in ("manim", "web", "jsxgraph", "tikz", "latex"):
        assert name in result.output


def test_list_filters(repo, runner):
    create_bit(repo, template="tikz", title="A figure")
    create_bit(repo, template="manim", title="A video")
    out = runner.invoke(app, ["list", "--kind", "video", "--json"]).output
    assert [b["id"] for b in json.loads(out)] == ["a-video"]


def test_check_exit_codes(repo, runner):
    create_bit(repo, template="tikz", title="Fine")
    assert runner.invoke(app, ["check"]).exit_code == 0
    assert runner.invoke(app, ["check", "--strict"]).exit_code == 1  # missing outputs warn
    (repo.bit_dir("fine") / "bit.yml").write_text(
        "id: other\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\n"
    )
    result = runner.invoke(app, ["check"])
    assert result.exit_code == 1
    assert "does not match directory name" in result.output


def test_build_unknown_bit(repo, runner):
    result = runner.invoke(app, ["build", "nope"])
    assert result.exit_code == 2
    assert "no Bit named 'nope'" in result.output


def test_export_rejects_non_web_bit(repo, runner):
    create_bit(repo, template="tikz", title="Fig")
    result = runner.invoke(app, ["export", "fig"])
    assert result.exit_code == 1
    assert "not a web Bit" in result.output


def test_outside_repository(tmp_path, runner, monkeypatch):
    monkeypatch.delenv("ORBBITS_ROOT", raising=False)
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["list"])
    assert result.exit_code == 2
    assert "Not inside an OrbBits repository" in result.output


def test_new_with_tags_and_list_by_tag(repo, runner):
    result = runner.invoke(
        app,
        [
            "new",
            "--title",
            "Unit circle animation",
            "--template",
            "manim",
            "--tags",
            "Unit Circle, trigonometry",
        ],
    )
    assert result.exit_code == 0, result.output
    create_bit(repo, template="tikz", title="Unit circle diagram", tags=["unit-circle"])
    create_bit(repo, template="tikz", title="Unrelated")

    out = runner.invoke(app, ["list", "--tag", "unit-circle", "--json"]).output
    assert [b["id"] for b in json.loads(out)] == ["unit-circle-animation", "unit-circle-diagram"]
    out = runner.invoke(
        app, ["list", "--tag", "unit-circle", "--tag", "trigonometry", "--json"]
    ).output
    assert [b["id"] for b in json.loads(out)] == ["unit-circle-animation"]


def test_list_json_reports_publication_and_path(repo, runner):
    create_bit(repo, template="tikz", title="Sketch")
    d = repo.bit_dir("sketch")
    (d / "dist" / "figure.svg").write_text("<svg/>")
    (d / "dist" / "figure.pdf").write_text("%PDF")
    data = json.loads(runner.invoke(app, ["list", "--json"]).output)[0]
    assert data["published"] is False and data["path"] == "/bits/sketch/"
    assert data["brief"] is True and data["narrative"] is True
    assert runner.invoke(app, ["list", "--published", "--json"]).output.strip() == "[]"

    (d / "bit.yml").write_text(
        (d / "bit.yml").read_text().replace("status: draft", "status: usable")
    )
    data = json.loads(runner.invoke(app, ["list", "--published", "--json"]).output)
    assert [b["id"] for b in data] == ["sketch"] and data[0]["published"] is True


def test_new_locale_options(repo, runner):
    result = runner.invoke(app, ["new", "--title", "Alpha", "--template", "web", "--locale", "en"])
    assert result.exit_code == 0, result.output
    result = runner.invoke(
        app, ["new", "--title", "Beta", "--template", "tikz", "--locales", "it, en"]
    )
    assert result.exit_code == 0, result.output
    assert "it, en" in result.output
    data = {b["id"]: b for b in json.loads(runner.invoke(app, ["list", "--json"]).output)}
    assert data["alpha"]["default_locale"] == "en" and data["alpha"]["locales"] == ["en"]
    assert data["beta"]["default_locale"] == "it" and data["beta"]["locales"] == ["it", "en"]
    assert "language" not in data["alpha"]

    result = runner.invoke(
        app,
        ["new", "--title", "Gamma", "--template", "web", "--locale", "it", "--locales", "en"],
    )
    assert result.exit_code == 1
    assert "not among the locales" in result.output
    assert not repo.bit_dir("gamma").exists()


def test_new_without_locale_options_is_italian(repo, runner):
    result = runner.invoke(app, ["new", "--title", "Delta", "--template", "manim"])
    assert result.exit_code == 0, result.output
    data = json.loads(runner.invoke(app, ["list", "--json"]).output)[0]
    assert data["default_locale"] == "it" and data["locales"] == ["it"]
