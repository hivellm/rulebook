<!-- LUA:START -->
# Lua rules

## Non-negotiables

- Target Lua 5.4 or LuaJIT 2.1+ and pick one — 5.4 features (integer division `//`, `goto` differences, `<close>`) do not exist on LuaJIT (5.1 semantics).
- Format gate is `stylua --check src/ tests/` — plain `stylua` (writes) locally vs `--check` in CI is the classic mismatch.
- Lint with `luacheck src/ tests/` and pass the correct std (`--std luajit` or `--std lua54`) matching the runtime.
- No accidental globals — luacheck flags them; declare everything `local`.
- Local commands MUST match `.github/workflows/*.yml` exactly.

## Conventions

- Modules return a table; constructors via `M.new()` and methods with `:` (implicit `self`).
- `local` by default, including cached stdlib functions in hot loops.
- Error handling: `nil, err` returns for expected failures; `error()`/`pcall` for exceptional ones — don't mix styles within a module.
- Keep luacheck config in `.luacheckrc` (std, globals, per-path overrides) rather than long CLI flags.
- StyLua config in `stylua.toml`; do not hand-format.

## Testing

- busted (preferred) or luaunit; specs in `tests/`, run with `busted tests/`.
- busted style: `describe`/`it`/`before_each`, assertions via `assert.are.same` (deep equality) and `assert.has_no.errors`.
- Test both runtimes in CI if the code claims 5.4 + LuaJIT support.

## Build & tooling

- Dependencies via LuaRocks; declare them in a `.rockspec`.
- No standard security-audit tool exists for Lua — review dependencies manually and pin rock versions.
- Never commit `lua_modules/` or compiled `.so`/`.dll` artifacts.
<!-- LUA:END -->
