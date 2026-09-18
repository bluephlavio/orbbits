from orbbits.check import check_repo
from orbbits.scaffold import create_bit
from tests.conftest import write_bit


def levels(issues, level):
    return [i for i in issues if i.level == level]


def test_fresh_scaffolds_have_no_errors(repo):
    for t in ("manim", "web", "jsxgraph", "tikz", "latex"):
        create_bit(repo, template=t, title=f"Demo {t}")
    issues = check_repo(repo)
    assert levels(issues, "error") == []
    # Drafts with missing outputs only warn.
    assert any("declared output missing" in i.message for i in levels(issues, "warning"))


def test_missing_manifest_and_id_mismatch(repo):
    (repo.bits_dir / "orphan").mkdir()
    write_bit(
        repo,
        "wrong-dir",
        "id: right-id\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\n",
        {"src/figure.tex": ""},
    )
    issues = check_repo(repo)
    msgs = {(i.bit_id, i.level): i.message for i in issues}
    assert "missing bit.yml" in msgs[("orphan", "error")]
    assert "does not match directory name" in msgs[("wrong-dir", "error")]


def test_usable_requires_built_outputs(repo):
    write_bit(
        repo,
        "fig",
        "id: fig\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\nstatus: usable\n"
        "outputs:\n  - format: svg\n    file: dist/figure.svg\n",
        {"src/figure.tex": "", "README.md": ""},
    )
    errors = levels(check_repo(repo), "error")
    assert len(errors) == 1 and "needs built outputs" in errors[0].message

    (repo.bit_dir("fig") / "dist").mkdir()
    (repo.bit_dir("fig") / "dist" / "figure.svg").write_text("<svg/>")
    assert levels(check_repo(repo), "error") == []


def test_outputs_must_live_under_dist(repo):
    write_bit(
        repo,
        "x",
        "id: x\ntitle: T\nkind: figure\nrole: diagram\nengine: tikz\n"
        "outputs:\n  - format: svg\n    file: src/figure.svg\n",
        {"src/figure.tex": ""},
    )
    assert any("must live under dist/" in i.message for i in levels(check_repo(repo), "error"))


def test_interactive_bit_needs_entry_component(repo):
    write_bit(
        repo,
        "widget",
        "id: widget\ntitle: W\nkind: interactive\nrole: explorable\nengine: react\n",
        {"src/notes.md": ""},
    )
    assert any("src/index.tsx" in i.message for i in levels(check_repo(repo), "error"))


def test_unknown_engine_and_role_only_warn(repo):
    write_bit(
        repo,
        "y",
        "id: y\ntitle: Y\nkind: figure\nrole: mosaic\nengine: inkscape\n",
        {"src/a.svg": ""},
    )
    issues = check_repo(repo)
    assert levels(issues, "error") == []
    assert {i.message.split("'")[0].strip() for i in levels(issues, "warning")} >= {
        "engine",
        "role",
    }


def test_check_selected_ids_and_unknown_id(repo):
    create_bit(repo, template="tikz", title="Known")
    issues = check_repo(repo, ["known", "nope"])
    assert any(i.bit_id == "nope" and i.level == "error" for i in issues)


def test_broken_yaml_is_reported_not_raised(repo):
    write_bit(repo, "bad", "id: [unclosed\n")
    issues = check_repo(repo)
    assert any(i.bit_id == "bad" and i.level == "error" for i in issues)
