# 03 — Evaluation Methodology

Caveman ships two independent measurement systems: a **benchmark suite** that runs prompts through the real Claude API, and an **eval harness** that runs offline with a BPE tokenizer.

## Benchmarks (`benchmarks/`)

- Runs real prompts through the Claude API (not Claude Code CLI).
- Records raw input/output token counts from the API response.
- Commits results as JSON in `benchmarks/results/`.
- README’s benchmark table is generated from these files and must be regenerated when results change.
- Reproduce: `uv run python benchmarks/run.py` (needs `ANTHROPIC_API_KEY` in `.env.local`).

Current published numbers (from README, commit analyzed):

| Task | Normal (tokens) | Caveman (tokens) | Saved |
|---|---:|---:|---:|
| Explain React re-render bug | 1180 | 159 | 87% |
| Fix auth middleware token expiry | 704 | 121 | 83% |
| Set up PostgreSQL connection pool | 2347 | 380 | 84% |
| Explain git rebase vs merge | 702 | 292 | 58% |
| Refactor callback to async/await | 387 | 301 | 22% |
| Architecture: microservices vs monolith | 446 | 310 | 30% |
| Review PR for security issues | 678 | 398 | 41% |
| Docker multi-stage build | 1042 | 290 | 72% |
| Debug PostgreSQL race condition | 1200 | 232 | 81% |
| Implement React error boundary | 3454 | 456 | 87% |
| **Average** | **1214** | **294** | **65%** |

Range: 22%–87%. The variance is itself informative — tasks dominated by required code blocks (refactor, architecture explanations) compress the least because code is pass-through; tasks dominated by explanatory prose compress the most.

Honest caveat, stated in the README:

> Caveman only affects output tokens — thinking/reasoning tokens are untouched.
> Caveman no make brain smaller. Caveman make *mouth* smaller.

This is the right framing. A skill that constrains output has no effect on the model’s internal reasoning budget.

## Eval harness (`evals/`) — the three-arm control

This is the methodological contribution worth copying.

The naive comparison is **caveman vs no-skill**. That number looks great (~65% average) but is dishonest — a generic “be concise” instruction would also produce a big reduction, and the skill would be taking credit for both its specific content *and* the general effect of asking for brevity.

The harness fixes this by running every prompt through **three arms**:

| Arm | System prompt |
|---|---|
| `__baseline__` | None |
| `__terse__` | `Answer concisely.` |
| `<skill>` | `Answer concisely.\n\n{SKILL.md}` |

The honest delta is **`<skill>` vs `__terse__`**, not `<skill>` vs `__baseline__`. That isolates the value added by the specific rules in SKILL.md over and above the generic terseness request that is already baked into the skill arm.

This structure also lets you easily evaluate *any* new skill you drop into `skills/<name>/SKILL.md` — the harness auto-discovers it. Adding a new prompt means appending a line to `evals/prompts/en.txt`.

### Offline measurement

`evals/measure.py` reads the saved snapshot (`evals/snapshots/results.json`) and counts tokens **offline with `tiktoken`** (OpenAI BPE). Two implications:

- No API key needed to re-measure. Ratios are meaningful. Absolute numbers are approximate because `tiktoken` is not the Claude tokenizer.
- CI can re-measure without burning credits. Snapshots are committed; the API call only happens when the skill or prompt set changes.

### Two-step workflow

```bash
# Regenerate snapshots — needs claude CLI and API access
uv run python evals/llm_run.py

# Measure — offline, anyone can run it
uv run --with tiktoken python evals/measure.py
```

Separating the expensive step (LLM calls) from the cheap step (tokenizing) means anyone can reproduce the comparison without credentials, and CI can gate on measurement results without holding API secrets.

## Citations the project leans on

Caveman’s README cites a March 2026 paper:

> *Brevity Constraints Reverse Performance Hierarchies in Language Models*
> https://arxiv.org/abs/2604.00025
>
> Constraining large models to brief responses **improved accuracy by 26 percentage points** on certain benchmarks and completely reversed performance hierarchies. Verbose is not always better. Sometimes less word = more correct.

This is leveraged to support the skill’s strongest claim: brevity isn’t just a token-saving trick, it correlates with correctness on some classes of task. The project doesn’t *depend* on the paper being correct — the benchmarks stand alone — but the citation gives the “technical accuracy preserved” claim a research backing.

## What Rulebook should adopt

1. **Three-arm comparisons for every skill.** `baseline / terse / skill`. If the skill’s lift over `terse` is small, the skill isn’t actually doing work — generic conciseness is.
2. **Separate snapshot generation from measurement.** One expensive step, one cheap step, snapshots in git, CI runs only the cheap step.
3. **Use `tiktoken` for ratio-only analyses.** It’s not Claude’s tokenizer, but for *ratios between arms* it is stable and free.
4. **Publish the range, not just the average.** The 22%–87% spread is more informative than the 65% headline. Tells users when to expect big wins vs small wins.
5. **State what the measurement does not measure.** Output tokens, not reasoning tokens. Compression, not quality. Caveman is careful about this boundary.
6. **Do not fabricate numbers.** The project’s `CLAUDE.md` makes this explicit: *Benchmark and eval numbers must be real. Never fabricate or estimate.* Any Rulebook doc citing token savings should follow the same rule.
