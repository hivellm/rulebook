<!-- SAS:START -->
# SAS rules

## Non-negotiables

1. SAS 9.4+ or Viya 3.5+; all `.sas` files under version control.
2. Log is the quality gate: grep every run log for `ERROR` and `WARNING` — a run with warnings is not a passing run.
3. Validate syntax before committing: `sas -sysin program.sas -nosplash` and inspect the `.log`.
4. Macros validate their parameters (`%if %length(&param) = 0 %then` → `%put ERROR:` + `%return`) — never proceed on empty inputs.
5. No uncommented, unstructured macro spaghetti — one macro per logical operation, keyword parameters with defaults.

## Conventions

- Macro parameters as keyword params with defaults: `%macro process_data(input_ds=, output_ds=, threshold=0.5);`.
- `%*` for macro comments (compiled away), `/* */` for open code comments.
- Emit failures through `%put ERROR:` so log-scanning gates catch them.
- Dataset names passed as macro variables (`&input_ds`), never hardcoded inside macros.
- Filter early with `where` in the `data` step rather than post-hoc `if`.

## Testing

- SASUnit (or a project-specific harness) for macro tests; entry point like `%include "sasunit/run_all_tests.sas";`.
- Every test run followed by log scan: `grep -i "ERROR\|WARNING" *.log` must return nothing.
- Test macro parameter validation paths, not just the happy path.

## Build & tooling

- Batch execution: `sas -sysin file.sas`; the `.log` and `.lst` outputs are the build artifacts to check.
- SAS Code Analyzer for static linting where available.
- CI mirrors local: same `sas -sysin` invocation + log grep step in GitHub Actions.
<!-- SAS:END -->
