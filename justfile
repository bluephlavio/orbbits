# OrbBits task façade. Logic lives in the Python CLI (src/orbbits) and the web runtime (web/).
# Run `just` to see this list.

set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list --unsorted

# Install/refresh Python and JavaScript environments
setup:
    uv sync
    pnpm install

# Scaffold a new Bit (interactive; pass --title/--template/--id for non-interactive use)
new *args:
    uv run orbbits new {{args}}

# List Bits (filters: --kind --role --engine --status, --json)
list *args:
    uv run orbbits list {{args}}

# Validate manifests and structure (all Bits, or the given ids)
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

# Start the web runtime with the full local catalog
web:
    pnpm exec astro dev --root {{justfile_directory()}}/web

# Type-check the web runtime and all interactive Bits
web-check:
    pnpm exec astro check --root {{justfile_directory()}}/web

# Run the Python test-suite and linter
test:
    uv run pytest
    uv run ruff check src tests

# Format Python sources
fmt:
    uv run ruff format src tests
    uv run ruff check --fix src tests
