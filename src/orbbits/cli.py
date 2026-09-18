"""OrbBits command line: new, list, check, build, dev, export."""

from __future__ import annotations

import json
import sys
from typing import Annotated

import typer
from rich.console import Console
from rich.prompt import Prompt
from rich.table import Table

from orbbits import __version__
from orbbits.bit import ManifestError
from orbbits.check import check_repo
from orbbits.engines import EngineError, NotSupported, get_engine, is_web_engine
from orbbits.repo import Repo, RepoNotFound
from orbbits.scaffold import ScaffoldError, create_bit
from orbbits.slug import slugify
from orbbits.templates import TemplateNotFound, load_templates

app = typer.Typer(
    help="OrbBits — personal, local-first authoring of reusable educational Bits.",
    no_args_is_help=True,
    rich_markup_mode="rich",
    context_settings={"help_option_names": ["-h", "--help"]},
)
# Non-interactive consumers (agents, pipes) get a wide console instead of 80-column wrapping.
console = Console(width=None if sys.stdout.isatty() else 140)
err_console = Console(stderr=True)


def _repo() -> Repo:
    try:
        return Repo.discover()
    except RepoNotFound as exc:
        err_console.print(f"[red]error:[/] {exc}")
        raise typer.Exit(2) from exc


def _bit(repo: Repo, bit_id: str):
    try:
        return repo.load_bit(bit_id)
    except ManifestError as exc:
        if not repo.bit_dir(bit_id).exists():
            err_console.print(f"[red]error:[/] no Bit named '{bit_id}' (see `orbbits list`)")
        else:
            err_console.print(f"[red]error:[/] {bit_id}: {exc}")
        raise typer.Exit(2) from exc


def _version(value: bool) -> None:
    if value:
        console.print(f"orbbits {__version__}")
        raise typer.Exit()


@app.callback()
def main(
    version: Annotated[
        bool, typer.Option("--version", callback=_version, is_eager=True, help="Show version.")
    ] = False,
) -> None:
    pass


# --- new ------------------------------------------------------------------------------------


@app.command()
def new(
    title: Annotated[
        str | None, typer.Option("--title", "-t", help="Human title of the Bit.")
    ] = None,
    template: Annotated[
        str | None, typer.Option("--template", "-T", help="Template name (see --list).")
    ] = None,
    bit_id: Annotated[
        str | None, typer.Option("--id", help="Slug; defaults to slugified title.")
    ] = None,
    role: Annotated[
        str | None, typer.Option("--role", help="Override the template's default role.")
    ] = None,
    list_templates: Annotated[
        bool, typer.Option("--list", help="List templates and exit.")
    ] = False,
) -> None:
    """Scaffold a new Bit from a template (interactive unless all options are given)."""
    repo = _repo()
    templates = load_templates(repo.templates_dir)
    if not templates:
        err_console.print("[red]error:[/] no templates found under templates/")
        raise typer.Exit(2)

    if list_templates:
        table = Table(box=None, pad_edge=False)
        table.add_column("template", style="bold")
        table.add_column("kind")
        table.add_column("engine")
        table.add_column("role")
        table.add_column("description")
        for t in templates:
            table.add_row(t.name, t.kind, t.engine, t.role, t.description)
        console.print(table)
        return

    interactive = sys.stdin.isatty()
    if title is None:
        if not interactive:
            err_console.print("[red]error:[/] --title is required when not running interactively")
            raise typer.Exit(2)
        title = Prompt.ask("Title", console=console).strip()
    if not title:
        err_console.print("[red]error:[/] title must not be empty")
        raise typer.Exit(2)

    if bit_id is None:
        default_id = slugify(title)
        bit_id = (
            Prompt.ask("Slug", default=default_id, console=console) if interactive else default_id
        )

    if template is None:
        if not interactive:
            err_console.print(
                "[red]error:[/] --template is required when not running interactively"
            )
            raise typer.Exit(2)
        console.print("Template / engine:")
        for i, t in enumerate(templates, 1):
            console.print(
                f"  [bold]{i}[/]. {t.name:<10} [dim]{t.kind} · {t.engine} · {t.description}[/]"
            )
        choice = Prompt.ask(
            "Choose",
            choices=[str(i) for i in range(1, len(templates) + 1)] + [t.name for t in templates],
            default="1",
            console=console,
            show_choices=False,
        )
        template = templates[int(choice) - 1].name if choice.isdigit() else choice

    try:
        result = create_bit(repo, template=template, title=title, bit_id=bit_id, role=role)
    except (ScaffoldError, TemplateNotFound, ManifestError) as exc:
        err_console.print(f"[red]error:[/] {exc}")
        raise typer.Exit(1) from exc

    rel = result.bit.dir.relative_to(repo.root)
    console.print(
        f"[green]created[/] {rel}/  [dim]({result.template.name}: {result.bit.manifest.kind} · "
        f"{result.bit.manifest.engine})[/]"
    )
    for f in result.files:
        console.print(f"  {f.relative_to(repo.root)}")
    if result.next_steps:
        console.print("\nNext steps:")
        for step in result.next_steps:
            console.print(f"  • {step}")


# --- list -----------------------------------------------------------------------------------


@app.command("list")
def list_bits(
    kind: Annotated[str | None, typer.Option(help="Filter by kind.")] = None,
    role: Annotated[str | None, typer.Option(help="Filter by role.")] = None,
    engine: Annotated[str | None, typer.Option(help="Filter by engine.")] = None,
    status: Annotated[str | None, typer.Option(help="Filter by status.")] = None,
    as_json: Annotated[bool, typer.Option("--json", help="Machine-readable output.")] = False,
) -> None:
    """List the Bits in the repository."""
    repo = _repo()
    bits, errors = repo.scan()
    rows = [
        b
        for b in bits
        if (kind is None or b.manifest.kind == kind)
        and (role is None or b.manifest.role == role)
        and (engine is None or b.manifest.engine == engine)
        and (status is None or b.manifest.status == status)
    ]
    if as_json:
        payload = [
            b.manifest.model_dump(mode="json", exclude_none=True)
            | {"dir": str(b.dir.relative_to(repo.root))}
            for b in rows
        ]
        console.print_json(json.dumps(payload))
    else:
        table = Table(box=None, pad_edge=False)
        for col in ("id", "kind", "role", "engine", "status"):
            table.add_column(col, style="bold" if col == "id" else None, no_wrap=True)
        table.add_column("title", overflow="fold")
        for b in rows:
            m = b.manifest
            table.add_row(m.id, m.kind, m.role, m.engine, m.status, m.title)
        console.print(table)
        console.print(f"[dim]{len(rows)} Bit(s)[/]")
    for e in errors:
        err_console.print(f"[yellow]warning:[/] {e.bit_id}: {e}")


# --- check ----------------------------------------------------------------------------------


@app.command()
def check(
    bit_ids: Annotated[list[str] | None, typer.Argument(help="Bit ids (default: all).")] = None,
    strict: Annotated[bool, typer.Option("--strict", help="Treat warnings as errors.")] = False,
) -> None:
    """Validate manifests and Bit structure. Exits 1 on errors."""
    repo = _repo()
    issues = check_repo(repo, bit_ids)
    for issue in issues:
        color = "red" if issue.is_error else "yellow"
        where = f"[bold]{issue.bit_id}[/]: " if issue.bit_id else ""
        console.print(f"[{color}]{issue.level}[/] {where}{issue.message}")
    n_err = sum(1 for i in issues if i.is_error)
    n_warn = len(issues) - n_err
    scope = f"{len(bit_ids)} Bit(s)" if bit_ids else f"{len(repo.bit_ids())} Bit(s)"
    console.print(f"[dim]checked {scope}: {n_err} error(s), {n_warn} warning(s)[/]")
    if n_err or (strict and n_warn):
        raise typer.Exit(1)


# --- build / dev / export -------------------------------------------------------------------


@app.command()
def build(
    bit_id: Annotated[str, typer.Argument(help="Bit id.")],
    quick: Annotated[
        bool, typer.Option("--quick", "-q", help="Fast/low-quality build for iteration.")
    ] = False,
) -> None:
    """Build a Bit through its engine, writing classroom-ready outputs to dist/."""
    repo = _repo()
    bit = _bit(repo, bit_id)
    try:
        engine = get_engine(repo, bit.manifest.engine)
        written = engine.build(bit, quick=quick)
    except EngineError as exc:
        err_console.print(f"[red]error:[/] {exc}")
        raise typer.Exit(1) from exc
    for path in written:
        console.print(f"[green]wrote[/] {path.relative_to(repo.root)}")


@app.command()
def dev(bit_id: Annotated[str, typer.Argument(help="Bit id.")]) -> None:
    """Live development: the web runtime for interactive Bits, quick renders otherwise."""
    repo = _repo()
    bit = _bit(repo, bit_id)
    try:
        get_engine(repo, bit.manifest.engine).dev(bit)
    except KeyboardInterrupt:
        pass
    except EngineError as exc:
        err_console.print(f"[red]error:[/] {exc}")
        raise typer.Exit(1) from exc


@app.command()
def export(bit_id: Annotated[str, typer.Argument(help="Interactive Bit id.")]) -> None:
    """Export an interactive Bit as a standalone static site in dist/web/."""
    repo = _repo()
    bit = _bit(repo, bit_id)
    if not is_web_engine(bit.manifest.engine):
        err_console.print(
            f"[red]error:[/] '{bit_id}' is not a web Bit (engine {bit.manifest.engine}); "
            "export applies to interactive Bits"
        )
        raise typer.Exit(1)
    try:
        written = get_engine(repo, bit.manifest.engine).export(bit)  # type: ignore[attr-defined]
    except NotSupported as exc:
        err_console.print(f"[red]error:[/] {exc}")
        raise typer.Exit(1) from exc
    except EngineError as exc:
        err_console.print(f"[red]error:[/] {exc}")
        raise typer.Exit(1) from exc
    out = written[0].parent.relative_to(repo.root)
    console.print(f"[green]exported[/] {out}/  [dim](serve it with any static file server)[/]")


if __name__ == "__main__":
    app()
