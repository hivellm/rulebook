import chalk from 'chalk';
import ora from 'ora';
import path from 'path';

export async function analysisCreateCommand(
  topic: string,
  options: { agents?: string; noTasks?: boolean }
): Promise<void> {
  const cwd = process.cwd();
  const spinner = ora(`Creating analysis for "${topic}"...`).start();
  try {
    const { createAnalysis } = await import('../../core/analysis-manager.js');
    const result = await createAnalysis(cwd, {
      topic,
      agents: options.agents?.split(',').map((a) => a.trim()) ?? null,
      noTasks: options.noTasks,
    });
    spinner.succeed(`Analysis scaffolded in ${path.relative(cwd, result.dir)}/`);
    for (const f of result.files) {
      console.log(chalk.gray(`  - ${path.relative(cwd, f)}`));
    }
    console.log(
      chalk.yellow(
        `\nNext: fill findings.md with your investigation, then create tasks from execution-plan.md.`
      )
    );
  } catch (error) {
    spinner.fail(`Failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function analysisListCommand(): Promise<void> {
  const cwd = process.cwd();
  try {
    const { listAnalyses } = await import('../../core/analysis-manager.js');
    const analyses = await listAnalyses(cwd);
    if (analyses.length === 0) {
      console.log(chalk.gray('No analyses found in docs/analysis/.'));
      return;
    }
    console.log(chalk.bold(`\n${analyses.length} analysis(es):\n`));
    for (const a of analyses) {
      console.log(`  ${chalk.cyan(a.slug)} — ${a.topic} (${a.createdAt.split('T')[0]})`);
    }
    console.log('');
  } catch (error) {
    console.error(chalk.red(`Failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

export async function analysisShowCommand(slug: string): Promise<void> {
  const cwd = process.cwd();
  try {
    const { showAnalysis } = await import('../../core/analysis-manager.js');
    const analysis = await showAnalysis(cwd, slug);
    if (!analysis) {
      console.log(chalk.red(`Analysis "${slug}" not found.`));
      return;
    }
    console.log(analysis.readme);
  } catch (error) {
    console.error(chalk.red(`Failed: ${error instanceof Error ? error.message : String(error)}`));
  }
}

export async function doctorCommand(): Promise<void> {
  const cwd = process.cwd();
  const spinner = ora('Running rulebook doctor...').start();
  try {
    const { runDoctor } = await import('../../core/doctor.js');
    const report = await runDoctor(cwd);
    spinner.succeed(
      `Doctor: ${report.passCount} pass, ${report.warnCount} warn, ${report.failCount} fail`
    );
    for (const check of report.checks) {
      const icon =
        check.status === 'pass'
          ? chalk.green('✓')
          : check.status === 'warn'
            ? chalk.yellow('⚠')
            : chalk.red('✗');
      console.log(`  ${icon} ${check.name}: ${check.message}`);
    }
  } catch (error) {
    spinner.fail(`Doctor failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
