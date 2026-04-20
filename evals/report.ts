#!/usr/bin/env node
/**
 * Rulebook evals — Markdown delta-table generator.
 *
 * Consumes the same snapshot + arms config as `measure.ts` and emits
 * a Markdown table + short summary. Used by the CI workflow to post a
 * PR comment when SKILL.md / rules change.
 */

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { measure, type MeasureReport } from './measure.js';

export function renderMarkdown(report: MeasureReport): string {
  const lines: string[] = [];
  lines.push(`# Rulebook Terse — Eval Report`);
  lines.push('');
  lines.push(`- Token mode: **${report.tokenMode}**`);
  lines.push(`- Lift threshold: **${(report.threshold * 100).toFixed(0)}%**`);
  lines.push(`- Average lift (skill vs terse): **${(report.totals.liftVsTerse * 100).toFixed(1)}%**`);
  lines.push(`- Status: ${report.pass ? '✅ PASS' : '❌ FAIL'}`);
  lines.push('');
  lines.push('## Per-prompt delta');
  lines.push('');
  lines.push('| Prompt | baseline | terse | rulebook-terse | lift vs terse |');
  lines.push('|--------|---------:|------:|---------------:|--------------:|');
  for (const p of report.prompts) {
    const liftCell = `${(p.liftVsTerse * 100).toFixed(0)}%`;
    lines.push(
      `| \`${p.id}\` | ${p.baseline} | ${p.terse} | ${p.rulebookTerse} | ${liftCell} |`
    );
  }
  const totalLiftCell = `${(report.totals.liftVsTerse * 100).toFixed(0)}%`;
  lines.push(
    `| **TOTAL** | ${report.totals.baseline} | ${report.totals.terse} | ${report.totals.rulebookTerse} | **${totalLiftCell}** |`
  );
  lines.push('');
  if (report.tokenMode === 'bytes') {
    lines.push(
      `> Note: tiktoken not installed — numbers are UTF-8 byte counts. Ratios between arms are comparable; absolute numbers are approximate.`
    );
  }
  return lines.join('\n');
}

async function main(): Promise<void> {
  const root = process.cwd();
  const report = await measure(
    resolve(root, 'evals/snapshots/results.json'),
    resolve(root, 'evals/arms.json')
  );
  const markdown = renderMarkdown(report);

  const outFlag = process.argv.indexOf('--out');
  if (outFlag >= 0 && process.argv[outFlag + 1]) {
    writeFileSync(resolve(root, process.argv[outFlag + 1]!), markdown + '\n');
    console.log(`Wrote ${process.argv[outFlag + 1]}`);
  } else {
    process.stdout.write(markdown + '\n');
  }
}

import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  void main();
}
