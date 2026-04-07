# Post-compaction cheat sheet (Python project)

Re-injected after every compaction. Keep ≤50 lines. Edit freely.

## Critical reminders

- Read `AGENTS.md` and `AGENTS.override.md` before changes.
- Type-check (`mypy` / `pyright`) before `pytest`.
- `ruff check` before committing.
- Edit files sequentially, not in parallel.
- Never revert uncommitted work; fix forward.
- If a fix fails twice, stop and escalate.

## Build & test quick reference

- **Install**: `pip install -e .` or `poetry install` or `uv sync`
- **Type-check**: `mypy .` or `pyright`
- **Lint**: `ruff check .`
- **Format**: `ruff format .` or `black .`
- **Test**: `pytest`

## Forbidden

- No bare `except:` — catch specific exceptions.
- No new dependencies without authorization.
- No `rm -rf` in this repo.
