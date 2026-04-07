# Post-compaction cheat sheet (C/C++ project)

Re-injected after every compaction. Keep ≤50 lines. Edit freely.

## Critical reminders

- Read `AGENTS.md` and `AGENTS.override.md` before changes.
- `cmake --build <build>` before running tests.
- Warnings are errors (`-Wall -Wextra -Werror`).
- Smart pointers only — no raw `new`/`delete` without justification.
- Edit files sequentially, not in parallel.
- If a fix fails twice, stop and escalate.

## Build & test quick reference

- **Configure**: `cmake -S . -B build -DCMAKE_EXPORT_COMPILE_COMMANDS=ON`
- **Build**: `cmake --build build -j`
- **Test**: `ctest --test-dir build --output-on-failure`
- **Format**: `clang-format -i <files>`
- **Sanitize (CI)**: `-fsanitize=address,undefined`

## Forbidden

- No `using namespace std;` in headers.
- No undefined behavior shortcuts (strict aliasing, signed overflow).
- No out-of-source build pollution in `build/` committed.
