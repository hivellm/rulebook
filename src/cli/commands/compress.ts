/**
 * CLI for `rulebook compress`.
 *
 * Four subcommands share one entry (selected by flags):
 *   rulebook compress <file>              rewrite in place + backup
 *   rulebook compress --dry-run <file>    print diff, no write
 *   rulebook compress --restore <file>    restore from <file>.original.md
 *   rulebook compress --check <file>      report ratio only
 *
 * Grounded in `.rulebook/specs/RULEBOOK_TERSE.md` §Compression companion.
 */

import chalk from 'chalk';
import { readFile, writeFile, fileExists } from '../../utils/file-system.js';

export interface CompressCommandOptions {
  dryRun?: boolean;
  restore?: boolean;
  check?: boolean;
}

function backupPathFor(target: string): string {
  return target.replace(/\.md$/i, '.original.md');
}

function pct(ratio: number): string {
  return `${Math.round((1 - ratio) * 100)}%`;
}

export async function compressCommand(
  target: string,
  options: CompressCommandOptions = {}
): Promise<void> {
  if (!target) {
    console.error(chalk.red('rulebook compress: <file> argument is required.'));
    process.exitCode = 1;
    return;
  }

  if (!(await fileExists(target))) {
    console.error(chalk.red(`rulebook compress: file not found: ${target}`));
    process.exitCode = 1;
    return;
  }

  // Restore path: recover original content from backup.
  if (options.restore) {
    const backup = backupPathFor(target);
    if (!(await fileExists(backup))) {
      console.error(chalk.red(`rulebook compress --restore: no backup at ${backup}`));
      process.exitCode = 1;
      return;
    }
    const content = await readFile(backup);
    await writeFile(target, content);
    console.log(chalk.green(`Restored ${target} from ${backup}`));
    return;
  }

  const original = await readFile(target);

  // Lazy-load the compressor so `--help` and restore paths don't pay
  // for its module initialization cost.
  const { compress } = await import('../../core/compress/compressor.js');
  const result = compress(original);

  // Check path: just report the ratio and validator outcome.
  if (options.check) {
    console.log(chalk.bold('Compression check:'));
    console.log(`  File:            ${target}`);
    console.log(`  Original bytes:  ${result.validation.stats.originalBytes}`);
    console.log(`  Compressed bytes: ${result.validation.stats.compressedBytes}`);
    console.log(`  Savings:         ${pct(result.validation.stats.ratio)}`);
    console.log(
      `  Validator:       ${result.validation.ok ? chalk.green('OK') : chalk.red('FAILED')}`
    );
    if (!result.validation.ok) {
      for (const v of result.validation.violations.slice(0, 5)) {
        console.log(chalk.red(`    - [${v.kind}] ${v.detail}`));
      }
      process.exitCode = 1;
    }
    return;
  }

  if (!result.validation.ok) {
    console.error(chalk.red('Compression produced a validator violation — aborting.'));
    for (const v of result.validation.violations.slice(0, 10)) {
      console.error(chalk.red(`  - [${v.kind}] ${v.detail}`));
    }
    console.error(chalk.yellow('No files modified.'));
    process.exitCode = 1;
    return;
  }

  // Dry-run path: print a minimal diff indicator, no write.
  if (options.dryRun) {
    console.log(chalk.bold('Compression dry-run:'));
    console.log(`  File:             ${target}`);
    console.log(`  Original bytes:   ${result.validation.stats.originalBytes}`);
    console.log(`  Compressed bytes: ${result.validation.stats.compressedBytes}`);
    console.log(`  Savings:          ${pct(result.validation.stats.ratio)}`);
    console.log(`  Retries used:     ${result.retries}`);
    console.log(chalk.gray('\n(run without --dry-run to apply)'));
    return;
  }

  // Real run: write compressed + backup original.
  const backup = backupPathFor(target);
  if (!(await fileExists(backup))) {
    await writeFile(backup, original);
  }
  await writeFile(target, result.output);

  console.log(chalk.green(`Compressed ${target}`));
  console.log(`  Original:   ${result.validation.stats.originalBytes} bytes`);
  console.log(`  Compressed: ${result.validation.stats.compressedBytes} bytes`);
  console.log(`  Savings:    ${pct(result.validation.stats.ratio)}`);
  console.log(chalk.gray(`  Backup:     ${backup}`));
  if (result.retries > 0) {
    console.log(
      chalk.yellow(
        `  Note: ${result.retries} retry(ies) used — some transforms disabled to preserve invariants.`
      )
    );
  }
}
