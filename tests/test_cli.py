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
