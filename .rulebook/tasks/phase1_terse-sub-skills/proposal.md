# Proposal: phase1_terse-sub-skills

Source: docs/analysis/caveman/

## Why

Commit messages and PR reviews need independent sub-skills, not just a terser base mode. Compressed commits follow Conventional Commits with hard caps; compressed reviews use `L<line>: <severity> <problem>. <fix>.`. Each sub-skill has its own frontmatter so Claude Code loads them independently, and each has auto-clarity rules that differ from the base skill (breaking commits always include a body; security reviews use full prose).

## What Changes

- `templates/skills/rulebook-terse-commit/SKILL.md` — Conventional Commits rules, ≤50/72 caps, explicit NEVER list (no "I/we/now", no AI attribution, no emoji unless project convention), body required for breaking changes / security fixes / data migrations / reverts.
- `templates/skills/rulebook-terse-review/SKILL.md` — severity prefixes (🔴 bug / 🟡 risk / 🔵 nit / ❓ q), drop list, keep list, auto-clarity for CVE-class findings + architectural disagreements.
- Each sub-skill activates independently (`/rulebook-terse-commit`, `/rulebook-terse-review`).

## Impact

- Affected specs: `.rulebook/specs/rulebook-terse/spec.md` (ADDED sub-skill independence requirements)
- Affected code: none
- Breaking change: NO
- User benefit: Team commit/review style enforceable per project; aligns with existing Rulebook commit standards.
