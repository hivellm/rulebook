#!/usr/bin/env node
/**
 * Rulebook evals — offline measurement (phase 0 smoke test).
 *
 * Reads `evals/snapshots/results.json` and produces a per-prompt delta table
 * across the three arms (baseline / terse / rulebook-terse).
 *
 * Phase 0 uses UTF-8 byte counts as a stand-in for token counts — enough to
 * validate the harness shape. Phase 4 replaces this with `tiktoken` for
 * real per-arm token counts. The ratios surface the same way regardless,
 * so the delta table shape is already correct.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

interface ArmResponses {
  baseline: string;
  terse: string;
  'rulebook-terse': string;
}

interface PromptRecord {
  id: string;
  prompt: string;
  responses: ArmResponses;
}

interface SnapshotFile {
  generatedAt: string;
  note?: string;
  prompts: PromptRecord[];
}

interface ArmsFile {
  liftThreshold: number;
  honestDelta: { numerator: string; denominator: string };
}

function byteCount(s: string): number {
  return Buffer.byteLength(s, 'utf8');
}

function pct(n: number, d: number): string {
  if (d === 0) return '—';
  return ((1 - n / d) * 100).toFixed(0) + '%';
}

function main(): number {
  const root = process.cwd();
  const snapshotsPath = resolve(root, 'evals/snapshots/results.json');
  const armsPath = resolve(root, 'evals/arms.json');

  const snap = JSON.parse(readFileSync(snapshotsPath, 'utf8')) as SnapshotFile;
  const arms = JSON.parse(readFileSync(armsPath, 'utf8')) as ArmsFile;

  console.log('Rulebook Evals — phase 0 smoke test');
  console.log('Snapshot generated:', snap.generatedAt);
  if (snap.note) console.log('Note:', snap.note);
  console.log('Honest delta:', `${arms.honestDelta.numerator} vs ${arms.honestDelta.denominator}`);
  console.log('Lift threshold:', `${(arms.liftThreshold * 100).toFixed(0)}%`);
  console.log('');

  const header = [
    'id',
    'baseline',
    'terse',
    'rulebook-terse',
    'lift vs terse',
  ];
  const rows: string[][] = [header];

  const totals = { baseline: 0, terse: 0, rulebookTerse: 0 };

  for (const p of snap.prompts) {
    const bBase = byteCount(p.responses.baseline);
    const bTerse = byteCount(p.responses.terse);
    const bRb = byteCount(p.responses['rulebook-terse']);
    totals.baseline += bBase;
    totals.terse += bTerse;
    totals.rulebookTerse += bRb;
    rows.push([p.id, String(bBase), String(bTerse), String(bRb), pct(bRb, bTerse)]);
  }
  rows.push([
    'TOTAL',
    String(totals.baseline),
    String(totals.terse),
    String(totals.rulebookTerse),
    pct(totals.rulebookTerse, totals.terse),
  ]);

  const colWidths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
  for (const row of rows) {
    console.log(row.map((cell, c) => cell.padEnd(colWidths[c])).join('  '));
  }

  const liftPct = 1 - totals.rulebookTerse / totals.terse;
  const passThreshold = liftPct >= arms.liftThreshold;

  console.log('');
  console.log(`Average lift over terse: ${(liftPct * 100).toFixed(1)}%`);
  console.log(`Threshold (${(arms.liftThreshold * 100).toFixed(0)}%): ${passThreshold ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log('NOTE: Phase 0 uses byte counts as a stand-in for tokens.');
  console.log('      Phase 4 replaces this with tiktoken. Ratios remain comparable; absolute numbers do not.');

  return passThreshold ? 0 : 1;
}

process.exit(main());
