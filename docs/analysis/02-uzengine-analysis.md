# UzEngine: Complete Analysis

**Project**: Game engine with DX11, DX12, Vulkan, and Metal backends
**Languages**: C++23 (engine), HLSL (shaders), TypeScript (VSCode extension), Lua (scripting)
**Build System**: Zig CC (primary), CMake + Ninja
**Reference Source**: Unreal Engine 5 source at `W:\UE_5.6_Source`

---

## A. Project Architecture

UzEngine is a multi-backend game engine with a clear layered architecture:

1. **RHI Layer** — Abstract rendering hardware interface with DX11, DX12, Vulkan, and Metal backends
2. **Renderer Layer** — Render graph, deferred/forward pipelines, shadow maps, post-processing
3. **ECS Layer** — Entity-Component-System for game world management
4. **Asset Pipeline** — Asset loading, processing, and caching
5. **Platform Layer** — Window management, input, crash handling, process/DLL management
6. **Scripting** — Lua bindings for all C++ APIs

### Phase-Based Development

The project follows a strict phase progression:
- **Phase 0**: Foundation (math, containers, RHI core, triangle renderer)
- **Phase 1**: Asset pipeline, profiling, embedded shaders
- **Phase 2**: Application lifecycle, job system, resource loaders
- **Phase 3a**: Render graph, forward PBR, deferred pipeline, shadow maps, post-processing
- **Phase 3b**: World/entity, component model, property system, behaviors/tick
- **Phase 4**: Platform abstraction, window state, advanced input, crash handling

---

## B. CLAUDE.md — Top 6 Rules (Highest Precedence)

### Rule 1: UE5 Complete Behavioral Parity
The most detailed and enforced rule. Every component must replicate UE5's exact behavior:
- **ALL parameters** (if UE5 has 47, UzEngine has 47)
- **ALL defaults** (read the actual UE5 constructor)
- **ALL behavior** (same computation, same update triggers)
- **ALL ranges/validation** (same clamps, same meta constraints)
- Mandatory `@source UE5 <file>:<line>` citation for every property

**FORBIDDEN**: Simplifying components, inventing defaults, replacing runtime computation with hardcoded values, adding parameters UE5 doesn't have, guessing what a parameter does.

### Rule 2: Always Read UE5 Source Before Rendering Code
Launch `unreal-architect` agent (haiku) to find the exact UE5 implementation before writing any shader, render pass, or GPU code.

### Rule 3: Shader Source Citation Template
Every shader function requires:
```hlsl
/// @source UE5 <file.usf>:<line> — <function name>
/// @constants <list every numeric constant and its UE5 value>
/// @deviations NONE
```

### Rule 4: No Stubs/TODOs/Placeholders/Approximations
Zero tolerance. "A stub is a lie that compiles."

### Rule 5: Always Delegate to Specialist Agents
Never write C++/shaders/docs in main conversation. Route to appropriate specialist.

### Rule 6: File Locations — Never Create New Directories
Analysis → `docs/analysis/`, guides → `docs/guides/`, specs → `docs/specs/`.

---

## C. Agent System (43 Specialized Agents)

### Domain-Specific Agents (Unique to UzEngine)

| Agent | Model | Domain | Key Responsibility |
|-------|-------|--------|-------------------|
| **shader-engineer** | opus | GPU/HLSL | All shader code. Mandatory UE5 parity pre-flight checklist (9 questions). |
| **cpp-core-expert** | opus | C++23 | All C++ code. UE5 parity checklist (11 questions). Engine API enforcement. |
| **rhi-engineer** | opus | DX11/DX12/Vulkan/Metal | RHI backend code. API-specific expertise. |
| **render-graph-engineer** | opus | Render passes | Render graph integration, pass scheduling. |
| **ecs-systems-engineer** | opus | Entity/Component | ECS component design, system updates. |
| **unreal-architect** | haiku | UE5 analysis | Read-only UE5 source analysis. Component spec extraction. |
| **godot-architect** | haiku | Godot analysis | Alternative reference implementation analysis. |
| **engine-architect** | sonnet | Architecture | Cross-engine synthesis, design decisions. |
| **systems-integration** | opus | Multi-subsystem | Data flow documents, task decomposition. Does NOT write code. |
| **shader-engineer** | opus | GPU/HLSL | Complete shader lifecycle with UE5 parity. |
| **physics-engineer** | sonnet | Jolt physics | Physics integration. |
| **audio-engineer** | sonnet | Audio systems | Audio subsystem. |
| **animation-engineer** | sonnet | Animation | Skeletal/procedural animation. |
| **ui-engineer** | sonnet | UI framework | UI system implementation. |
| **gameplay-systems-engineer** | sonnet | Gameplay | Gameplay mechanics and systems. |
| **lua-scripting-engineer** | sonnet | Lua bindings | C++ → Lua API parity. |
| **build-system-engineer** | sonnet | Zig/CMake | Build pipeline issues. |
| **typescript-vscode-extension** | sonnet | TypeScript | VSCode extension development. |

### Agent Configuration Highlights

**Per-Agent Memory**: Every agent has:
```
.claude/agent-memory/<agent-name>/MEMORY.md  (index, ≤200 lines)
.claude/agent-memory/<agent-name>/*.md        (topic files)
```

**Mandatory Sections Injected Into Every Agent**:
1. UE5 parity checklist (domain-specific questions)
2. "No Shortcuts — Quality Over Speed" prohibition
3. "Update tasks.md" after every completion
4. "NEVER Mark Tasks as Deferred"
5. "ALWAYS Research Before Implementing"
6. "MANDATORY: Use Teams for Multiple Agents"
7. Data flow first rule (for multi-subsystem tasks)

**Agent Output Controls** (from AGENT_AUTOMATION.md):
- Token optimization rules for haiku agents
- "Output code, not explanation"
- Minimal reports: "Done" instead of detailed status
- No markdown abuse, no unnecessary tables
- ~850 tokens saved per task

---

## D. Rule System (17 Rule Files in .claude/rules/)

### Tier 1: Core Development Rules

| Rule File | Key Directive |
|-----------|--------------|
| `ue5-component-parity.md` | Zero simplification. All 47 properties, all defaults, all behavior. IP protection via rewrite. |
| `research-first.md` | Never guess. "UE5 does X at file:line, we do Y, the difference causes Z" is the only acceptable format. |
| `no-deferred.md` | Never mark tasks as "Deferred". Implement dependencies first, then the task. |
| `quality.md` | Response time is irrelevant. Quality is everything. No shortcuts, stubs, or partial implementations. |

### Tier 2: Workflow Rules

| Rule File | Key Directive |
|-----------|--------------|
| `data-flow-first.md` | 3+ files across subsystems → mandatory data flow document BEFORE implementation. |
| `task-decomposition.md` | Max 1-2 files per sub-task. Each sub-task independently compilable. Build after each. |
| `visual-verification.md` | Unit tests insufficient for rendering. Prefer `--screenshot-stdout` (base64, no disk I/O). Multi-position testing. |
| `gpu-debugging.md` | Buffer visualization grid (9 buffers in 3x3), RenderDoc integration, CPU readback via render graph. |
| `build-order.md` | Static library dependency: clean → rebuild runtime → rebuild demo. |
| `agent-teams.md` | 2+ agents = MUST use TeamCreate. Each agent owns different files. |
| `agent-tasks-update.md` | After EVERY task: update `tasks.md` checklist immediately. Before reporting completion. |

### Tier 3: Standards Rules

| Rule File | Key Directive |
|-----------|--------------|
| `architecture.md` | Z-up, cm units, engine APIs (UZ_LOG/UZ_CHECK), SOLID, ~40 line functions. |
| `documentation.md` | Triple-slash `///`, WHY not WHAT, section headers with `// ───`. |
| `lua-parity.md` | Every C++ feature gets a Lua binding. |
| `editing.md` | Edit files sequentially, one at a time. |
| `git-safety.md` | No stash, no rebase, no reset, no force push. Only status/diff/log/add/commit/blame. |
| `thirdparty.md` | Never manually clone/download. Use `scripts/setup.ps1`. |

---

## E. Multi-Agent Coordination

### Team Structure

```
Main Conversation (opus) — Orchestrator only
    ├── unreal-architect (haiku) — Research UE5 source
    ├── systems-integration (opus) — Data flow docs + decomposition
    ├── cpp-core-expert (opus) — C++ implementation
    ├── shader-engineer (opus) — HLSL implementation
    ├── rhi-engineer (opus) — Backend-specific code
    ├── test-engineer (sonnet) — Tests
    ├── docs-operator (haiku) — Documentation
    └── project-manager (haiku) — Task tracking
```

### File Ownership Protocol
1. Team lead identifies all files needing modification
2. Assigns exclusive ownership of each file to one agent
3. If multiple agents need the same file → serialize access
4. Agents report completion via SendMessage, not file-based communication

### The systems-integration Agent (Unique Innovation)
This agent is a **planner, not an implementer**. Its workflow:
1. Launch `unreal-architect` to research UE5 data flow
2. Create `docs/analysis/dataflow-<feature>.md`
3. Decompose into 1-2 file sub-tasks for specialist agents
4. After specialists complete → verify end-to-end integration
5. Check CB offsets match between C++ and HLSL

---

## F. Quality Gates

### Pre-Commit (Fast, ~30s)
- Format check
- Lint (zero warnings)
- Type-check / compiler check

### Pre-Push (Comprehensive)
- Full build
- Full test suite
- Coverage ≥ 95%

### Agent Automation Workflow (After Every Implementation)
1. Quality checks (type, lint, format, test, coverage)
2. Capture to persistent memory
3. Security & dependency audit
4. Update rulebook tasks
5. Update documentation
6. Git commit (conventional format, English only)
7. Minimal report to user

---

## G. Visual Verification System (Unique to Rendering Projects)

### Screenshot Methods (Fastest to Slowest)
1. **`--screenshot-stdout`** (PREFERRED) — Base64 PNG to stdout, no disk I/O
2. **`--headless` + file** — Hidden window, writes PNG to disk
3. **Visible window + file** — Interactive debugging

### Buffer Visualization Grid
9 simultaneous debug buffers in 3x3 grid:
```
Albedo  | Normal    | Raw Atlas
Shadow  | LIT       | Depth
Cascade | AO        | Roughness
```
Activated via `--shadow-debug 1`. Built into deferred lighting shader.

### Multi-Position Testing (MANDATORY Before Reporting Fix)
```bash
demo.exe --screenshot-stdout --screenshot-frame 5 --frames 8             # Default position
demo.exe --screenshot-stdout --screenshot-frame 5 --frames 8 --camera-z 700   # Higher altitude
demo.exe --screenshot-stdout --screenshot-frame 5 --frames 8 --camera-z 1500  # Far away
```
View EVERY screenshot. If ANY shows the bug persists → investigate further.

### RenderDoc Integration
- Auto-capture: `demo.exe --renderdoc-capture 10 --frames 15`
- Headless Python analysis: `qrenderdoc --python analyze.py capture.rdc`
- NEVER open GUI manually — use automated scripts
- NEVER use `--opt-api-validation` (breaks replay with D3D12 Debug Layer)

---

## H. Task Management Patterns

### Phase-Based Task IDs
```
phase0-0.1.0-dx11-backend/
phase1-asset-browser/
phase2_2.0.0_application-lifecycle/
phase3a-3.1.0-render-graph/
phase3b-3.0b-world-entity/
phase4_4.1.0_window-state-machine/
```

### Task File Structure
```
.rulebook/tasks/<task-id>/
├── .metadata.json    — Status, dates, priority
├── proposal.md       — Why + what + context (detailed prose)
├── tasks.md          — ONLY simple checklists (- [ ] / - [x])
├── design.md         — Technical design (optional)
└── specs/
    └── <module>/
        └── spec.md   — SHALL/MUST requirements
```

### Archive Pattern
Completed tasks → `.rulebook/tasks/archive/YYYY-MM-DD-<task-id>/`

---

## I. Unique Techniques

### 1. The `unreal-architect` Agent
A haiku-model, read-only agent dedicated to analyzing UE5 source code. It:
- Reads actual UE5 files at `W:\UE_5.6_Source`
- Extracts EVERY UPROPERTY with type, default, category, meta constraints
- Maps complete data flows (component → renderer → CB → shader)
- Never writes code — only produces analysis documents

This is a **domain-specific research agent** pattern: use cheap models for read-only analysis of reference implementations.

### 2. The `systems-integration` Agent
A pure planning agent that:
- Creates data flow documents mapping cross-subsystem changes
- Decomposes multi-file tasks into 1-2 file sub-tasks
- Verifies integration after specialist agents complete work
- Never writes production code

This is a **coordinator agent** pattern: separates planning from implementation.

### 3. UE5 Parity Pre-Flight Checklists
Every agent that touches rendering code must answer domain-specific questions before returning code:
- shader-engineer: 9 questions (source file, constants, clamps, scale factors, approximations, etc.)
- cpp-core-expert: 11 questions (source file, parameters, defaults, update logic, engine APIs, etc.)

If question 1 (source file) cannot be answered → STOP and launch `unreal-architect` first.

### 4. Anti-Deferred Directive
"Deferred is a codeword for 'I'm too lazy to do it.'" If a task has a dependency → implement the dependency first, then the task. Never skip with excuses.

### 5. Intellectual Property Protection
While maintaining behavioral parity with UE5:
- DO NOT copy code verbatim — rewrite in own style
- DO use different variable names, different code structure
- DO keep same mathematical formulas (math is not copyrightable)
- DO cite UE5 source file and line as reference

---

## J. Lessons Learned

1. **AI agents will always take shortcuts unless explicitly forbidden** — The no-stubs/no-TODOs/no-approximations rules exist because agents consistently tried to simplify.

2. **Reference implementation access is transformative** — Having UE5 source available eliminates hallucination for domain-specific code (rendering math, physics, etc.).

3. **43 agents is not excessive for a game engine** — Each subsystem (RHI, shaders, ECS, physics, audio, animation, UI, Lua, etc.) needs its own expert.

4. **Token optimization for cheap agents is critical** — Haiku agents waste context on verbose status reports unless explicitly told to be concise.

5. **The systems-integration pattern prevents context overload** — Having a dedicated planner that creates data flow documents before dispatching sub-tasks to implementers dramatically reduces errors.

6. **Visual verification catches what unit tests miss** — A rendering test can pass while the screen is completely black. Screenshots are the only reliable validation.

7. **Phase-based task organization works for engines** — Clear progression (foundation → rendering → world → platform) prevents out-of-order implementation.
