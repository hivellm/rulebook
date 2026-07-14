<!-- ADA:START -->
# Ada rules

## Non-negotiables

- Target Ada 2012 or Ada 2022 with GNAT 12+; declare the standard via `-gnat2022` (or `-gnat2012`) in the GPR file, not ad hoc flags.
- Build with warnings as errors: `gprbuild -P project.gpr -cargs -gnatwa -gnatwe`. Missing `-gnatwe` locally = CI failure later.
- Run `gnatcheck -P project.gpr -rules -from=gnat_style.rules` before committing; style rules live in the repo, not in your head.
- SPARK code MUST pass `gnatprove -P project.gpr --level=2` — a failed proof is a failed build.
- Local quality commands MUST match `.github/workflows/*.yml` exactly; drift between the two is a defect.
- Diagnostic-first: `gprbuild` (compile) before running the AUnit test binary.

## Conventions

- One GPR project file per deliverable; test harness gets its own `test_project.gpr`.
- Package spec (`.ads`) / body (`.adb`) split is mandatory; no logic in specs beyond expressions permitted by the standard.
- Prefer `pre`/`post` aspects (Ada 2012 contracts) over comment-documented invariants.
- Use GNAT default file naming (`unit_name.ads`/`.adb`, dots as hyphens) — do not fight `gnatname`.
- Exceptions for exceptional cases only; return status/`Result` records for expected failure paths in SPARK-bound code (SPARK forbids exception propagation).
- Keep `with`/`use` clauses minimal; prefer `use type` over full `use` for operators.

## Testing

- AUnit is the test framework; build the harness with `gprbuild -P test_project.gpr` and run the produced `./bin/test_runner`.
- A clean-build cycle (`gprclean -P project.gpr && gprbuild -P project.gpr`) must pass before archiving a task — incremental builds hide stale-ALI issues.
- For SPARK units, `gnatprove` counts as a test gate in addition to AUnit.

## Build & tooling

- GPRbuild only — no hand-written Makefiles wrapping gnatmake.
- Use Alire (`alr`) for dependency management when the project has external crates; pin versions in `alire.toml`.
- Never commit `obj/`, `lib/`, or `*.ali` artifacts.
<!-- ADA:END -->
