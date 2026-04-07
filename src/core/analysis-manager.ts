import path from 'path';
import { writeFile, fileExists, ensureDir, readFile } from '../utils/file-system.js';

/**
 * v5.3.0 F-NEW-4 — `/analysis <topic>` workflow.
 *
 * Creates a `docs/analysis/<slug>/` directory with skeleton files,
 * generates an execution plan, and materializes tasks via the
 * task manager. Findings can be registered in the knowledge base.
 *
 * MVP scope (v5.3.0): scaffold + findings template + plan template.
 * Agent dispatch and parallel investigation are planned for v5.4.
 */

export interface AnalysisOptions {
  /** Human-readable topic (e.g. "perf-startup", "auth refactor v2"). */
  topic: string;
  /** Explicit agent list override. Null = auto-select (future). */
  agents?: string[] | null;
  /** Skip task materialization (just produce the analysis directory). */
  noTasks?: boolean;
}

export interface AnalysisResult {
  slug: string;
  dir: string;
  files: string[];
  manifestPath: string;
}

/**
 * Slugify a topic into a filesystem-safe directory name.
 * Lowercases, replaces spaces/special chars with hyphens, deduplicates
 * consecutive hyphens, trims leading/trailing hyphens.
 */
export function slugify(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

/**
 * Scaffold the analysis directory and skeleton files.
 * Idempotent: re-running on an existing slug updates the manifest
 * but does not overwrite existing content files.
 */
export async function createAnalysis(
  projectRoot: string,
  options: AnalysisOptions
): Promise<AnalysisResult> {
  const slug = slugify(options.topic);
  const dir = path.join(projectRoot, 'docs', 'analysis', slug);
  await ensureDir(dir);

  const files: string[] = [];

  // README.md skeleton (only if missing)
  const readmePath = path.join(dir, 'README.md');
  if (!(await fileExists(readmePath))) {
    await writeFile(readmePath, renderReadmeTemplate(options.topic, slug));
    files.push(readmePath);
  }

  // findings.md skeleton
  const findingsPath = path.join(dir, 'findings.md');
  if (!(await fileExists(findingsPath))) {
    await writeFile(findingsPath, renderFindingsTemplate(slug));
    files.push(findingsPath);
  }

  // execution-plan.md skeleton
  const planPath = path.join(dir, 'execution-plan.md');
  if (!(await fileExists(planPath))) {
    await writeFile(planPath, renderExecutionPlanTemplate(slug));
    files.push(planPath);
  }

  // manifest.json (always overwritten — it's metadata, not content)
  const manifestPath = path.join(dir, 'manifest.json');
  const manifest = {
    slug,
    topic: options.topic,
    agents: options.agents ?? ['researcher'],
    noTasks: options.noTasks ?? false,
    createdAt: new Date().toISOString(),
    version: '5.3.0',
  };
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  files.push(manifestPath);

  // Auto-capture: save analysis creation as a memory entry so future
  // sessions know this analysis exists and can consult it.
  try {
    const { MemoryStore } = await import('../memory/memory-store.js');
    const dbPath = path.join(projectRoot, '.rulebook', 'memory', 'memory.db');
    if (await fileExists(dbPath)) {
      const store = new MemoryStore(dbPath);
      const now = Date.now();
      store.saveMemory({
        id: `analysis-${slug}-${now}`,
        type: 'observation' as const,
        title: `Analysis created: ${options.topic}`,
        content: `Structured analysis scaffolded at docs/analysis/${slug}/. Contains README.md, findings.md, execution-plan.md. Use rulebook_analysis_show({ slug: "${slug}" }) to review.`,
        project: projectRoot,
        tags: ['analysis', slug],
        createdAt: now,
        updatedAt: now,
        accessedAt: now,
      });
      store.close();
    }
  } catch {
    // Non-fatal — memory capture is best-effort
  }

  return { slug, dir, files, manifestPath };
}

/**
 * List all existing analyses in `docs/analysis/`.
 */
export async function listAnalyses(
  projectRoot: string
): Promise<Array<{ slug: string; topic: string; createdAt: string; dir: string }>> {
  const baseDir = path.join(projectRoot, 'docs', 'analysis');
  if (!(await fileExists(baseDir))) return [];

  const { promises: fs } = await import('fs');
  const entries = await fs.readdir(baseDir, { withFileTypes: true });
  const results: Array<{ slug: string; topic: string; createdAt: string; dir: string }> = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const manifestPath = path.join(baseDir, entry.name, 'manifest.json');
    if (!(await fileExists(manifestPath))) continue;
    try {
      const raw = JSON.parse(await readFile(manifestPath));
      results.push({
        slug: raw.slug ?? entry.name,
        topic: raw.topic ?? entry.name,
        createdAt: raw.createdAt ?? 'unknown',
        dir: path.join(baseDir, entry.name),
      });
    } catch {
      results.push({
        slug: entry.name,
        topic: entry.name,
        createdAt: 'unknown',
        dir: path.join(baseDir, entry.name),
      });
    }
  }

  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/**
 * Read the full content of an analysis for display.
 */
export async function showAnalysis(
  projectRoot: string,
  slug: string
): Promise<{
  slug: string;
  readme: string;
  findings: string;
  plan: string;
  manifest: string;
} | null> {
  const dir = path.join(projectRoot, 'docs', 'analysis', slug);
  if (!(await fileExists(dir))) return null;

  const readSafe = async (p: string) => ((await fileExists(p)) ? await readFile(p) : '(not found)');

  return {
    slug,
    readme: await readSafe(path.join(dir, 'README.md')),
    findings: await readSafe(path.join(dir, 'findings.md')),
    plan: await readSafe(path.join(dir, 'execution-plan.md')),
    manifest: await readSafe(path.join(dir, 'manifest.json')),
  };
}

// ── Template renderers ──────────────────────────────────────────────

function renderReadmeTemplate(topic: string, slug: string): string {
  return `# Analysis: ${topic}

> Created by \`/analysis ${topic}\` on ${new Date().toISOString().split('T')[0]}
> Analysis ID: \`${slug}\`

## Index

| File | Purpose |
|------|---------|
| [findings.md](./findings.md) | Numbered findings (F-001 … F-NNN) |
| [execution-plan.md](./execution-plan.md) | Phased implementation plan |
| [manifest.json](./manifest.json) | Analysis metadata |

## Executive summary

(Fill this after the investigation is complete. Top 3–5 findings with one-line justifications.)

## Methodology

- **Agents used**: (list which agents or manual research was involved)
- **Scope**: (what was investigated)
- **Exclusions**: (what was intentionally out of scope)

## Conclusion

(One-paragraph conclusion synthesizing the findings into an actionable recommendation.)
`;
}

function renderFindingsTemplate(slug: string): string {
  return `# Findings — ${slug}

List numbered findings below. Each finding should have:
- **Title**: one-line description
- **Evidence**: file:line or URL reference
- **Impact**: what changes if we act on this (high/medium/low)
- **Confidence**: how sure we are this is correct (high/medium/low)
- **Discovered by**: which agent or manual research

## F-001 — (title)

- **Evidence**: (file:line or reference)
- **Impact**: (high/medium/low)
- **Confidence**: (high/medium/low)
- **Discovered by**: (agent name or "manual")

(Description of the finding.)

## F-002 — (title)

(Add more findings following the same format.)
`;
}

function renderExecutionPlanTemplate(slug: string): string {
  return `# Execution plan — ${slug}

Based on the findings in [findings.md](./findings.md), this plan breaks the
work into phases. Each phase produces tasks via \`rulebook task create\`.

## Phase 1 — (title)

**Goal**: (what this phase accomplishes)
**Depends on**: (nothing | Phase N)

Tasks:
- [ ] (task description → will become \`phase1_${slug}-<name>\`)
- [ ] (task description)

## Phase 2 — (title)

**Goal**: (what this phase accomplishes)
**Depends on**: Phase 1

Tasks:
- [ ] (task description)
- [ ] (task description)

## Open questions

- (questions that must be resolved before materializing tasks)
`;
}
