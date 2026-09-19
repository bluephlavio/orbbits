# OrbBits task façade. Logic lives in the Python CLI (src/orbbits) and the web runtime (web/).
# Run `just` to see this list.

set shell := ["bash", "-euo", "pipefail", "-c"]

# Where the public site is served from (docs/publishing.md). GitHub project Pages today;
# a custom domain later would be `site_origin := "https://orbbits.example"`, `site_base := "/"`.
# CI overrides both from actions/configure-pages, so nothing else needs to change.
site_origin := env("ORBBITS_SITE", "https://bluephlavio.github.io")
site_base := env("ORBBITS_BASE", "/orbbits/")
# Where the sources live, for the site's footer: ORBBITS_REPO, else the `origin` remote
# (https or ssh form, without .git), else nothing (CI takes it from GitHub instead).
site_repo := env("ORBBITS_REPO", `git remote get-url origin 2>/dev/null | sed -E 's#^git@github\.com:#https://github.com/#; s#\.git$##' || true`)

default:
    @just --list --unsorted

# Install/refresh Python and JavaScript environments
setup:
    uv sync
    pnpm install

# Scaffold a new Bit (interactive; pass --title/--template/--id/--tags for non-interactive use)
new *args:
    uv run orbbits new {{args}}

# List Bits (filters: --kind --role --engine --status --tag --published, --json)
list *args:
    uv run orbbits list {{args}}

# Validate manifests, structure and publication readiness (all Bits, or the given ids)
check *args:
    uv run orbbits check {{args}}

# Build a Bit through its engine (add --quick for a fast low-quality build)
build bit *args:
    uv run orbbits build {{bit}} {{args}}

# Live development of a Bit (web runtime for interactive Bits)
dev bit:
    uv run orbbits dev {{bit}}

# Export an interactive Bit as a standalone static site (bits/<id>/dist/web/)
export bit:
    uv run orbbits export {{bit}}

# Start the web runtime with the full local catalog (drafts included)
web:
    pnpm exec astro dev --root {{justfile_directory()}}/web

# Type-check the web runtime and all interactive Bits
web-check:
    pnpm exec astro check --root {{justfile_directory()}}/web

# Build the public site (published Bits only) into web/dist/, as CI does
site:
    ORBBITS_SITE={{site_origin}} ORBBITS_BASE={{site_base}} ORBBITS_REPO={{site_repo}} pnpm exec astro build --root {{justfile_directory()}}/web
    @echo "site built for {{site_origin}}{{site_base}} -> web/dist/  (just site-preview)"

# Serve the last `just site` build locally at the same base path as production
site-preview:
    ORBBITS_SITE={{site_origin}} ORBBITS_BASE={{site_base}} ORBBITS_REPO={{site_repo}} pnpm exec astro preview --root {{justfile_directory()}}/web

# Run the Python test-suite and linter
test:
    uv run pytest
    uv run ruff check src tests

# Everything CI runs before deploying: tests, check, web-check, site build
ci: test check web-check site

# Format Python sources
fmt:
    uv run ruff format src tests
    uv run ruff check --fix src tests
