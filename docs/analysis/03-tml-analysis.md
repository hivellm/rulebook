# TML: Complete Analysis

**Project**: TML (To Machine Language) — batteries-included programming language for the AI era
**Scale**: ~500K LOC C++ (compiler), ~200K LOC TML (standard library)
**Build System**: Zig CC (primary), MSVC/Clang fallbacks, CMake + Ninja
**Compiler Backend**: Embedded LLVM + LLD (in-process, no external tools)
**Test Suite**: 9,000+ tests across 780+ files (~8s with cache)
**Reference Standard**: Rust compiler (`rustc --emit=llvm-ir`)

---

## A. Project Architecture

### Core Components
1. **Compiler Frontend** — LL(1) parser, AST, name resolution, type checking
2. **THIR** (Typed HIR) — Exhaustiveness checking (Maranget 2007 usefulness algorithm)
3. **MIR** (Mid-level IR) — Demand-driven query system (red-green incremental compilation)
4. **Dual Codegen** — AST-based LLVMIRGen (legacy, ~49K lines) + MIR-based MirCodegen (new, ~3K lines)
5. **Standard Library** — 28+ modules in pure TML (Text, Buffer, HashMap, List, Outcome, Mutex, etc.)
6. **Native MCP Server** — Built into compiler binary, 14 tools (compile, test, check, emit-ir, docs, lint, format)
7. **DLL-based Test Runner** — Subprocess architecture with NDJSON protocol, parallel execution

### Key Binaries
- `tml.exe` — Compiler
- `tml_mcp.exe` — MCP server
- `tml_tests.exe` — C++ unit tests

---

## B. CLAUDE.md — Tiered Directive System (599 Lines)

### Tier 1: Absolute Prohibitions (UNACCEPTABLE if violated)

| # | Prohibition | Consequence |
|---|-------------|-------------|
| 1 | **Consult Language Reference Before Implementing** — 500+ types, 5000+ functions exist. Use `Text`, `Buffer`, `HashMap`, not raw `lowlevel { ptr_read/ptr_write }`. | Non-Compliance = UNACCEPTABLE |
| 2 | **Use MCP Tools First** — NEVER use Bash for `tml.exe` operations. MCP handles caching, paths, validation. | VIOLATION = UNACCEPTABLE |
| 3 | **NO `rm` COMMANDS** — Expressly forbidden from deleting anything without explicit "yes, delete it". Cache backup system exists because deletions kept happening. | VIOLATION = UNACCEPTABLE |
| 4 | **No Git Branch Manipulation** — Forbidden: stash, rebase, reset, checkout --, revert, cherry-pick, merge, branch -D, push --force, clean -f. Allowed: status, diff, log, add, commit, blame. | VIOLATION = UNACCEPTABLE |
| 5 | **Never Run Tests Multiple Times** — Run ONCE, save to `.sandbox/`, read file multiple times. Use `structured: true` for parsed results. | VIOLATION = UNACCEPTABLE |
| 6 | **No Shortcuts, Stubs, or Simplified Logic** — NEVER simplify, add TODO/FIXME/HACK, create stubs, use placeholders, reduce scope, skip edge cases. Quality is everything. Response time is NOT important. | VIOLATION = UNACCEPTABLE |
| 7 | **Minimize C and C++ Code** — Three-tier: Pure TML (preferred) → @extern("c") FFI (acceptable) → New C/C++ (last resort only). Project is migrating to self-hosting. | VIOLATION = UNACCEPTABLE |

### Tier 2: Mandatory Workflow Rules

| Rule | Details |
|------|---------|
| **ANALYZE BEFORE EXECUTING** | Check existing examples → read docs → identify patterns → THEN execute. |
| **Rust-as-Reference IR Methodology** | Write `.sandbox/temp_<feature>.rs` + `.sandbox/temp_<feature>.tml` → compare LLVM IR function-by-function → fix TML to match/exceed Rust quality. |
| **No Test Circumvention** | Never move tests to `pending/`, create placeholders, simplify assertions, comment out, or skip. |
| **Incremental Test Development** | Write 1-3 tests at a time → test → fix → repeat. Never full files at once. |
| **Agent Delegation & Model Optimization** | Main conversation = coordination only. opus = codegen bugs, deep analysis. sonnet = tests, TML code. haiku = exploration, docs. |
| **Use Teams for Multi-Agent Work** | 2+ parallel agents = MUST use Teams. |
| **NEVER USE CMAKE DIRECTLY** | CMakeLists.txt has build token check. Always use `scripts\build.bat`. |
| **Sequential File Editing** | Read file1 → Edit file1 → Read file2 → Edit file2. Never batch parallel reads. |

### Tier 3: Command Rules

| Area | Commands |
|------|----------|
| **Build** | `scripts\build.bat` (debug/release/--clean/--tests/--modular) |
| **Test via MCP** | `mcp__tml__test`, `mcp__tml__test with suite="core/str"`, `mcp__tml__test with path="file.test.tml"` |
| **Test via Bash** (fallback) | Run ONCE → save to `.sandbox/` → grep the file |
| **Format/Lint/Check** | `tml fmt`, `tml lint`, `tml check` |
| **Emit IR** | `tml build file.tml --emit-ir` (MIR) or `--emit-ir --legacy` (AST) |
| **Cache rule** | NEVER delete `.new-test-cache.json` or `.incr-cache/` — auto-invalidate on source changes |

---

## C. Agent System (20+ Specialized Agents)

### Core Agents with Dedicated Memory

| Agent | Model | Domain | Memory Files |
|-------|-------|--------|-------------|
| **codegen-debugger** | opus | LLVM IR bugs, type mismatches, AST vs MIR comparison | 12 files (fn-ptr-local-var-fix, async-stale-cache, FuncType-pattern-matching, etc.) |
| **deep-analysis-reviewer** | opus | Root cause analysis, architectural issues | 3 files |
| **tml-library-engineer** | opus | TML stdlib, pure TML code, memory intrinsics, C→TML migration | 9 files (module coverage status, codegen bug dependencies) |
| **test-coverage-guardian** | sonnet | Test diagnosis, coverage gaps | Per-module coverage tracking |
| **project-manager** | sonnet | Task management, priority analysis, agent delegation | 3 files (baselines, blockers, workflow) |
| **compiler-optimizer** | opus | LLVM IR optimization, performance | — |
| **qa-code-analyst** | sonnet | Code quality, pattern validation | — |
| **build-engineer** | haiku | Build scripts, mechanical tasks | — |
| **researcher** | haiku | Read-only codebase exploration (20x cheaper than opus) | — |

### Agent Memory System

Each agent has a dedicated memory directory:
```
.claude/agent-memory/<agent-name>/
├── MEMORY.md           — Index file (≤200 lines, loaded into system prompt)
├── <topic-1>.md        — Detailed notes per topic
├── <topic-2>.md
└── .metadata.json      — Metadata for each entry
```

**codegen-debugger MEMORY.md** example content:
- 12 recent fixes indexed (nested generic enum monomorphization, async stale cache + MIR AwaitInst, FuncType pattern matching, runtime library dual naming)
- Key findings section (code generation ordering, MIR value naming conventions, generic inference patterns)
- Active bugs tracked across sessions
- Name mangling patterns for primitives

**tml-library-engineer MEMORY.md** example content:
- Module coverage status per stdlib module
- Codegen bug dependencies (which coverage gaps are blocked by which codegen bugs)
- Pattern: coverage blockers form a dependency DAG

---

## D. The Rust-as-Reference IR Methodology (Unique Innovation)

This is the TML equivalent of UzEngine's UE5 parity requirement. When fixing codegen bugs:

1. **Write equivalent code** in `.sandbox/temp_<feature>.rs` (Rust) + `.sandbox/temp_<feature>.tml` (TML)
2. **Generate IR** from both: `rustc --emit=llvm-ir` vs `tml build --emit-ir`
3. **Compare function-by-function**: instruction count, type layouts, alloca count, safety features
4. **Fix TML codegen** to match or exceed Rust quality

**Why this works**:
- Rust's LLVM IR is the gold standard for safe, optimized compilation
- Side-by-side comparison eliminates guesswork about what "correct" IR looks like
- Reveals subtle issues: extra allocas, wrong type layouts, missing optimizations
- Reproducible: the `.sandbox/` files serve as regression test inputs

---

## E. Native MCP Server (14 Tools)

Unlike UzEngine which uses the Rulebook MCP server, TML has a **compiler-integrated MCP server** that links against the same compiler internals:

| Tool | Purpose |
|------|---------|
| `compile` | Compile TML source |
| `run` | Compile and run |
| `build` | Full build |
| `check` | Type-check only (fast) |
| `emit-ir` | Emit LLVM IR (MIR or legacy) |
| `emit-mir` | Emit MIR |
| `test` | Run test suite (with caching, profiling, structured output) |
| `format` | Format source code |
| `lint` | Lint source code |
| `docs/search` | Search documentation (BM25 + HNSW semantic) |
| `docs/get` | Get documentation for a symbol |
| `docs/list` | List available documentation |
| `docs/resolve` | Resolve a symbol path |
| `cache/invalidate` | Invalidate build caches |

**Key insight**: The MCP server is not a wrapper — it's the compiler itself exposed as tools. This means AI agents get the exact same results as the CLI, with added benefits:
- Structured JSON output (no stdout parsing)
- Automatic caching and invalidation
- Path normalization
- Validation before execution

---

## F. Blocker Chain Tracking

TML maintains an explicit blocker chain showing cascade impact:

```
B1: async runtime foundation → blocks ALL async/HTTP/WebSocket (M3/M4 milestones)
B2: lambda→func pointer conversion → blocks Phase 2 stdlib
B3: generic trait dispatch returning () → blocks ~30 coverage functions
B4: doc comment preservation → blocks M2 documentation
B5-B6: Various minor blockers
```

**Prioritization rule**: Unblocking B1-B6 is elevated by one priority level above its raw priority, because cascade impact multiplies the value.

---

## G. Quality Gates

### Pre-Commit (Fast, ~30s)
- Format check (`tml fmt`)
- Lint (errors only, quiet mode)
- Type-check (`tml check`)
- Tests REMOVED for speed (too expensive)

### Pre-Push (Comprehensive)
- Build check (`scripts\build.bat`)
- Full test suite

### Coverage Tracking
- 95.02% (5213/5486 functions)
- Gap categorization: codegen bugs (19%), runtime crashes (26%), infrastructure (19%), tests not written (29%), genuinely untestable (7%)

---

## H. Decisions, Knowledge, and Learnings System

### Architecture Decision Records (8 ADRs)
Stored in `.rulebook/decisions/`:

| Decision | Status | Rationale |
|----------|--------|-----------|
| In-process LLVM | Accepted | Speed (single-file compilation), no external tools needed |
| Query-based demand-driven compilation | Accepted | Red-green incremental compilation (rustc-style) |
| Pure C ABI for plugins | Accepted | Cross-compiler compatibility |
| NDJSON test protocol | Accepted | Modeled on Go's test2json, streaming events |
| TML-first runtime migration | Accepted | Self-hosting roadmap |
| Zig CC preference | Accepted | Cross-compilation, hermetic builds |
| LL(1) grammar | Accepted | Predictable parsing, good error messages |
| Subprocess test architecture | Accepted | Avoids LLVM global state deadlock |

### Knowledge Base
Categories:
- **Anti-patterns**: "State leakage is the #1 codegen bug category"
- **Patterns**: Incremental compilation fingerprinting, MIR value naming conventions

### Learnings (20+ entries, dated and tagged)
Recent discoveries:
- "legacy-codegen-is-not-dead" — AST-based LLVMIRGen generates ALL stdlib function implementations
- "state-leakage-is-the-1-codegen-bug-category" — codegen object state persists between different code generation tasks
- "critical-path-to-m3-m4-async-network-stack-blocks-everything" — B1 blocker analysis

---

## I. NDJSON Subprocess Test Protocol (Unique Innovation)

TML's test runner uses a Go-inspired subprocess architecture:

1. Each test suite compiles to a standalone `.exe`
2. Coordinator launches suite executables as subprocesses
3. Each subprocess streams NDJSON events:
   ```json
   {"type": "suite_start", "name": "core/str", "test_count": 42}
   {"type": "test_start", "name": "test_basic_concat"}
   {"type": "test_output", "text": "assertion at line 15"}
   {"type": "test_pass", "name": "test_basic_concat", "duration_ms": 3}
   {"type": "suite_end", "name": "core/str", "passed": 40, "failed": 2}
   ```
4. Coordinator aggregates without maintaining state across lines
5. Coverage via `TML_COVERAGE_FILE` env var (no LLVM profiling, avoids hangs)

**Why this works**:
- Subprocess isolation prevents LLVM global state deadlock
- NDJSON is trivially parseable (one JSON object per line)
- Parallel execution without shared memory
- Each suite can crash without killing the coordinator

---

## J. Lessons Learned

1. **State leakage is the #1 codegen bug category** — Codegen objects retain state between different code generation tasks, causing type mismatches and invalid IR.

2. **Monomorphization complexity grows non-linearly** — Generic type specialization bugs (Maybe[I32] vs Outcome[I64, MyError], nested generics, const generics) account for ~19% of coverage gaps.

3. **Legacy codegen is never truly dead** — Despite being "legacy", the AST-based path generates ALL stdlib function implementations in every build. True elimination requires years of work.

4. **Incremental test development is mandatory** — Writing full test files at once leads to cascading failures and debug fatigue. 1-3 tests at a time provides faster feedback.

5. **MCP server integrated into the compiler is transformative** — AI agents get structured, cached access to every compilation stage without stdout parsing.

6. **Agent-specific memory prevents context loss** — Each agent (codegen-debugger, tml-library-engineer) tracks its own fixes and findings. The codegen-debugger's memory of 12+ recent fixes lets it recognize patterns across sessions.

7. **Blocker chain tracking focuses effort** — B1 (async runtime) blocks entire milestones. Without explicit tracking, agents waste time on low-cascade-impact tasks.

8. **Pure TML migration reduces context burden** — C++ code is harder for AI agents to reason about than TML's simpler syntax. The self-hosting roadmap also improves AI development velocity.

9. **Test caches are sacred** — Auto-invalidation on source changes is sufficient. Manual cache deletion caused hours of unnecessary recompilation.

10. **Dual codegen paths are a long-term maintenance burden** — Two codegen paths (AST ~49K lines, MIR ~3K lines) mean every feature must work in both. Future projects should converge early.
