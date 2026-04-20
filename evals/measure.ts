#!/usr/bin/env node
/**
 * Rulebook evals — offline measurement.
 *
 * Reads `evals/snapshots/results.json` and produces a per-prompt delta
 * table across the three arms (`baseline` / `terse` / `rulebook-terse`).
 *
 * Token counting uses `tiktoken` when it is installed in the project
 * (dynamic import — we don't ship tiktoken as a base dependency because
 * measurement is opt-in and Rulebook's install footprint stays lean).
 * When tiktoken is unavailable, falls back to UTF-8 byte counts; the
 * RATIOS across arms remain meaningful in both modes but absolute
 * numbers are approximate in byte-count mode.
 *
 * Exit code: 0 if `rulebook-terse` vs `terse` lift meets the
 * `liftThreshold` from `arms.json`, otherwise 1 — lets CI gate on it.
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

interface Counter {
  mode: 'tiktoken' | 'bytes';
  count(s: string): number;
}

async function buildCounter(): Promise<Counter> {
  try {
    // Dynamic import so tiktoken is optional. Users can add it with:
    //   npm install --save-dev tiktoken
    // to get real token counts. The CI workflow adds it ephemerally.
    // @ts-expect-error — optional peer dep; absence handled by the catch below.
    const tiktoken = (await import('tiktoken')) as unknown as {
      get_encoding?: (name: string) => { encode: (s: string) => Uint8Array };
      encoding_for_model?: (m: string) => { encode: (s: string) => Uint8Array };
    };
    const enc = tiktoken.get_encoding
      ? tiktoken.get_encoding('cl100k_base')
      : tiktoken.encoding_for_model?.('gpt-4');
    if (!enc) throw new Error('no encoding');
    return {
      mode: 'tiktoken',
      count: (s: string) => enc.encode(s).length,
    };
  } catch {
    return {
      mode: 'bytes',
      count: (s: string) => Buffer.byteLength(s, 'utf8'),
    };
  }
}

function pct(n: number, d: number): string {
  if (d === 0) return '—';
  return ((1 - n / d) * 100).toFixed(0) + '%';
}

export interface MeasureReport {
  tokenMode: 'tiktoken' | 'bytes';
  threshold: number;
  prompts: Array<{
    id: string;
    baseline: number;
    terse: number;
    rulebookTerse: number;
    liftVsTerse: number;
  }>;
  totals: {
    baseline: number;
    terse: number;
    rulebookTerse: number;
    liftVsTerse: number;
  };
  pass: boolean;
}

export async function measure(
  snapshotsPath: string,
  armsPath: string
): Promise<MeasureReport> {
  const snap = JSON.parse(readFileSync(snapshotsPath, 'utf8')) as SnapshotFile;
  const arms = JSON.parse(readFileSync(armsPath, 'utf8')) as ArmsFile;
  const counter = await buildCounter();

  const prompts: MeasureReport['prompts'] = [];
  const totals = { baseline: 0, terse: 0, rulebookTerse: 0 };

  for (const p of snap.prompts) {
    const baseline = counter.count(p.responses.baseline);
    const terse = counter.count(p.responses.terse);
    const rulebookTerse = counter.count(p.responses['rulebook-terse']);
    totals.baseline += baseline;
    totals.terse += terse;
    totals.rulebookTerse += rulebookTerse;
    prompts.push({
      id: p.id,
      baseline,
      terse,
      rulebookTerse,
      liftVsTerse: terse > 0 ? 1 - rulebookTerse / terse : 0,
    });
  }

  const totalLift = totals.terse > 0 ? 1 - totals.rulebookTerse / totals.terse : 0;

  return {
    tokenMode: counter.mode,
    threshold: arms.liftThreshold,
    prompts,
    totals: { ...totals, liftVsTerse: totalLift },
    pass: totalLift >= arms.liftThreshold,
  };
}

async function main(): Promise<number> {
  const root = process.cwd();
  const report = await measure(
    resolve(root, 'evals/snapshots/results.json'),
    resolve(root, 'evals/arms.json')
  );

  console.log(`Rulebook Evals — measurement (${report.tokenMode} mode)`);
  console.log(`Honest delta: rulebook-terse vs terse`);
  console.log(`Lift threshold: ${(report.threshold * 100).toFixed(0)}%`);
  console.log('');

  const rows: string[][] = [['id', 'baseline', 'terse', 'rulebook-terse', 'lift vs terse']];
  for (const p of report.prompts) {
    rows.push([
      p.id,
      String(p.baseline),
      String(p.terse),
      String(p.rulebookTerse),
      pct(p.rulebookTerse, p.terse),
    ]);
  }
  rows.push([
    'TOTAL',
    String(report.totals.baseline),
    String(report.totals.terse),
    String(report.totals.rulebookTerse),
    pct(report.totals.rulebookTerse, report.totals.terse),
  ]);

  const colWidths = rows[0].map((_, c) => Math.max(...rows.map((r) => r[c].length)));
  for (const row of rows) {
    console.log(row.map((cell, c) => cell.padEnd(colWidths[c])).join('  '));
  }

  console.log('');
  console.log(`Average lift over terse: ${(report.totals.liftVsTerse * 100).toFixed(1)}%`);
  console.log(`Threshold (${(report.threshold * 100).toFixed(0)}%): ${report.pass ? 'PASS' : 'FAIL'}`);
  if (report.tokenMode === 'bytes') {
    console.log('');
    console.log('NOTE: tiktoken not installed — using UTF-8 byte counts as an approximation.');
    console.log('      Install with `npm install --save-dev tiktoken` for real token counts.');
  }

  return report.pass ? 0 : 1;
}

// CLI guard — compare resolved filesystem paths for Windows compat.
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().then((code) => process.exit(code));
}
