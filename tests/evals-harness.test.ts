/**
 * Unit tests for the three-arm evaluation harness.
 *
 * Covers the measure() core and the Markdown renderer without
 * invoking the Anthropic API (the snapshot file is hand-authored
 * fixture — regeneration is covered by phase 4 CI).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { measure } from '../evals/measure.js';
import { renderMarkdown } from '../evals/report.js';

const ROOT = resolve(__dirname, '..');

describe('evals harness — measure() against committed snapshot', () => {
  it('runs end-to-end on the committed snapshot + arms config', async () => {
    const report = await measure(
      resolve(ROOT, 'evals/snapshots/results.json'),
      resolve(ROOT, 'evals/arms.json')
    );
    expect(report.prompts.length).toBeGreaterThanOrEqual(3);
    expect(report.tokenMode).toMatch(/^(tiktoken|bytes)$/);
  });

  it('reports pass=true when skill-vs-terse lift ≥ threshold', async () => {
    const report = await measure(
      resolve(ROOT, 'evals/snapshots/results.json'),
      resolve(ROOT, 'evals/arms.json')
    );
    // The committed fixture is tuned for >= 30% lift which comfortably
    // clears the 15% gate.
    expect(report.pass).toBe(true);
    expect(report.totals.liftVsTerse).toBeGreaterThanOrEqual(report.threshold);
  });

  it('per-prompt numbers reconcile to the total', async () => {
    const report = await measure(
      resolve(ROOT, 'evals/snapshots/results.json'),
      resolve(ROOT, 'evals/arms.json')
    );
    const sumBaseline = report.prompts.reduce((s, p) => s + p.baseline, 0);
    const sumTerse = report.prompts.reduce((s, p) => s + p.terse, 0);
    const sumRbTerse = report.prompts.reduce((s, p) => s + p.rulebookTerse, 0);
    expect(sumBaseline).toBe(report.totals.baseline);
    expect(sumTerse).toBe(report.totals.terse);
    expect(sumRbTerse).toBe(report.totals.rulebookTerse);
  });
});

describe('evals harness — custom fixture', () => {
  let dir: string;
  let snapshotPath: string;
  let armsPath: string;

  beforeEach(() => {
    dir = join(tmpdir(), `rulebook-evals-fixture-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    snapshotPath = join(dir, 'results.json');
    armsPath = join(dir, 'arms.json');
  });

  afterEach(() => {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('reports pass=false when skill does not beat terse by threshold', async () => {
    writeFileSync(
      armsPath,
      JSON.stringify({
        arms: [],
        liftThreshold: 0.5,
        honestDelta: { numerator: 'rulebook-terse', denominator: 'terse' },
      })
    );
    writeFileSync(
      snapshotPath,
      JSON.stringify({
        generatedAt: '2026-04-20T00:00:00Z',
        prompts: [
          {
            id: 'p',
            prompt: 'test',
            responses: {
              baseline: 'AAAAAAAAAA', // 10 chars
              terse: 'BBBBBB', // 6 chars
              'rulebook-terse': 'CCCCC', // 5 chars — only 17% lift
            },
          },
        ],
      })
    );
    const report = await measure(snapshotPath, armsPath);
    expect(report.pass).toBe(false);
  });

  it('pass=true when skill beats terse by threshold', async () => {
    writeFileSync(
      armsPath,
      JSON.stringify({
        arms: [],
        liftThreshold: 0.3,
        honestDelta: { numerator: 'rulebook-terse', denominator: 'terse' },
      })
    );
    writeFileSync(
      snapshotPath,
      JSON.stringify({
        generatedAt: '2026-04-20T00:00:00Z',
        prompts: [
          {
            id: 'p',
            prompt: 'test',
            responses: {
              baseline: 'AAAAAAAAAAAAAAAAAAAA', // 20
              terse: 'BBBBBBBBBB', // 10
              'rulebook-terse': 'CCC', // 3 — 70% lift vs terse
            },
          },
        ],
      })
    );
    const report = await measure(snapshotPath, armsPath);
    expect(report.pass).toBe(true);
    expect(report.totals.liftVsTerse).toBeGreaterThanOrEqual(0.5);
  });

  it('handles empty prompts array', async () => {
    writeFileSync(
      armsPath,
      JSON.stringify({
        arms: [],
        liftThreshold: 0.15,
        honestDelta: { numerator: 'rulebook-terse', denominator: 'terse' },
      })
    );
    writeFileSync(
      snapshotPath,
      JSON.stringify({
        generatedAt: '2026-04-20T00:00:00Z',
        prompts: [],
      })
    );
    const report = await measure(snapshotPath, armsPath);
    expect(report.prompts).toHaveLength(0);
    expect(report.totals.liftVsTerse).toBe(0);
    expect(report.pass).toBe(false); // 0 < 15% threshold
  });
});

describe('evals harness — Markdown rendering', () => {
  it('renderMarkdown produces expected headers and rows', async () => {
    const report = await measure(
      resolve(ROOT, 'evals/snapshots/results.json'),
      resolve(ROOT, 'evals/arms.json')
    );
    const md = renderMarkdown(report);
    expect(md).toContain('# Rulebook Terse — Eval Report');
    expect(md).toContain('| Prompt | baseline | terse | rulebook-terse | lift vs terse |');
    expect(md).toContain(report.pass ? 'PASS' : 'FAIL');
    // Each prompt should produce a table row.
    for (const p of report.prompts) {
      expect(md).toContain(`\`${p.id}\``);
    }
  });

  it('includes the byte-count note when tiktoken is not available', async () => {
    const report = await measure(
      resolve(ROOT, 'evals/snapshots/results.json'),
      resolve(ROOT, 'evals/arms.json')
    );
    const md = renderMarkdown(report);
    if (report.tokenMode === 'bytes') {
      expect(md.toLowerCase()).toContain('tiktoken not installed');
    }
  });
});
