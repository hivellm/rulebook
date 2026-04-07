import chalk from 'chalk';
import { existsSync } from 'fs';
import path from 'path';

export async function overrideShowCommand(): Promise<void> {
  const cwd = process.cwd();
  const { overrideExists, getOverridePath, readOverrideContent } = await import(
    '../../core/override-manager.js'
  );
  if (!overrideExists(cwd)) {
    console.log(
      chalk.yellow(
        'AGENTS.override.md does not exist. Run `rulebook override edit` or `rulebook init` to create it.'
      )
    );
    return;
  }
  const content = await readOverrideContent(cwd);
  if (!content) {
    console.log(chalk.gray('AGENTS.override.md exists but has no custom content yet.'));
    console.log(chalk.gray(`  Path: ${getOverridePath(cwd)}`));
    return;
  }
  console.log(chalk.bold('\n📄 AGENTS.override.md\n'));
  console.log(content);
  console.log();
}

export async function overrideEditCommand(): Promise<void> {
  const cwd = process.cwd();
  const { initOverride, getOverridePath } = await import('../../core/override-manager.js');
  await initOverride(cwd);
  const overridePath = getOverridePath(cwd);
  const editor = process.env.EDITOR || process.env.VISUAL;
  if (editor) {
    const { spawn } = await import('child_process');
    const proc = spawn(editor, [overridePath], { stdio: 'inherit', shell: true });
    await new Promise<void>((resolve) => proc.on('close', () => resolve()));
  } else {
    console.log(chalk.gray(`No $EDITOR set. Edit the file directly:`));
    console.log(chalk.cyan(`  ${overridePath}`));
  }
}

export async function overrideClearCommand(): Promise<void> {
  const cwd = process.cwd();
  const { clearOverride } = await import('../../core/override-manager.js');
  await clearOverride(cwd);
  console.log(chalk.green('✓ AGENTS.override.md reset to empty template'));
}

export async function modeSetCommand(mode: 'lean' | 'full'): Promise<void> {
  const cwd = process.cwd();
  const { createConfigManager } = await import('../../core/config-manager.js');
  const configManager = createConfigManager(cwd);
  const config = await configManager.loadConfig();
  config.agentsMode = mode;
  await configManager.saveConfig(config);
  console.log(chalk.green(`✓ AGENTS.md mode set to: ${chalk.bold(mode)}`));
  if (mode === 'lean') {
    console.log(
      chalk.gray(
        '  Lean mode: AGENTS.md will be a lightweight index (<3KB).\n' +
          '  Run `rulebook update` to regenerate AGENTS.md.'
      )
    );
  } else {
    console.log(
      chalk.gray(
        '  Full mode: AGENTS.md will include all rules inline.\n' +
          '  Run `rulebook update` to regenerate AGENTS.md.'
      )
    );
  }
}

export async function plansShowCommand(): Promise<void> {
  const { readPlans, getPlansPath } = await import('../../core/plans-manager.js');
  const cwd = process.cwd();

  const plans = await readPlans(cwd);
  if (!plans) {
    console.log(chalk.yellow(`No PLANS.md found at ${getPlansPath(cwd)}`));
    console.log(chalk.gray('Run `rulebook plans init` to create one.'));
    return;
  }

  console.log(chalk.bold.blue('\n📋 PLANS.md — Session Scratchpad\n'));

  if (
    plans.context &&
    plans.context !== '_No active context. Start a session to populate this section._'
  ) {
    console.log(chalk.bold('Active Context:'));
    console.log(chalk.white(plans.context));
  }

  if (plans.currentTask && plans.currentTask !== '_No task in progress._') {
    console.log(chalk.bold('\nCurrent Task:'));
    console.log(chalk.cyan(plans.currentTask));
  }

  if (plans.history) {
    console.log(chalk.bold('\nSession History:'));
    console.log(chalk.gray(plans.history));
  }

  console.log('');
}

export async function plansInitCommand(): Promise<void> {
  const { initPlans, getPlansPath } = await import('../../core/plans-manager.js');
  const cwd = process.cwd();

  const created = await initPlans(cwd);
  if (created) {
    console.log(chalk.green(`✓ Created ${getPlansPath(cwd)}`));
    console.log(chalk.gray('  AI agents will use this file for session continuity.'));
  } else {
    console.log(chalk.yellow(`PLANS.md already exists at ${getPlansPath(cwd)}`));
  }
}

export async function plansClearCommand(): Promise<void> {
  const { clearPlans, getPlansPath } = await import('../../core/plans-manager.js');
  const cwd = process.cwd();
  await clearPlans(cwd);
  console.log(chalk.green(`✓ Cleared ${getPlansPath(cwd)}`));
  console.log(chalk.gray('  Session history and context have been reset.'));
}

export async function continueCommand(): Promise<void> {
  const cwd = process.cwd();
  const { readPlans } = await import('../../core/plans-manager.js');
  const { exec } = await import('child_process');
  const { promisify } = await import('util');
  const execAsync = promisify(exec);
  const fs = await import('fs/promises');

  console.log(chalk.bold.blue('\n🔄 Generating session continuity context...\n'));

  const sections: string[] = [];

  const plans = await readPlans(cwd);
  if (plans && (plans.context || plans.currentTask)) {
    const plansParts: string[] = ['## Active Plans'];
    if (plans.context && !plans.context.includes('_No active context')) {
      plansParts.push(plans.context);
    }
    if (plans.currentTask && !plans.currentTask.includes('_No task')) {
      plansParts.push(`**Current Task:** ${plans.currentTask}`);
    }
    sections.push(plansParts.join('\n'));
  }

  const tasksDir = path.join(cwd, '.rulebook', 'tasks');
  if (existsSync(tasksDir)) {
    const taskSummaries: string[] = [];
    try {
      const entries = await fs.readdir(tasksDir, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name === 'archive') continue;
        const tasksPath = path.join(tasksDir, entry.name, 'tasks.md');
        if (!existsSync(tasksPath)) continue;
        const content = await fs.readFile(tasksPath, 'utf-8');
        const pending = content
          .split('\n')
          .filter((l) => l.match(/^- \[ \]/))
          .map((l) => l.replace(/^- \[ \]\s*/, '').trim())
          .slice(0, 3);
        if (pending.length > 0) {
          taskSummaries.push(`**${entry.name}** (${pending.length}+ pending):`);
          pending.forEach((p) => taskSummaries.push(`  - ${p}`));
        }
      }
    } catch {
      // ignore
    }
    if (taskSummaries.length > 0) {
      sections.push('## Pending Tasks\n' + taskSummaries.join('\n'));
    }
  }

  try {
    const { stdout } = await execAsync('git log --oneline -8', { cwd });
    if (stdout.trim()) {
      sections.push('## Recent Commits\n```\n' + stdout.trim() + '\n```');
    }
  } catch {
    // not a git repo or git not available
  }

  const ralphStatePath = path.join(cwd, '.rulebook', 'ralph', 'state.json');
  if (existsSync(ralphStatePath)) {
    try {
      const state = JSON.parse(await fs.readFile(ralphStatePath, 'utf-8'));
      if (state.enabled) {
        const prdPath = path.join(cwd, '.rulebook', 'ralph', 'prd.json');
        let prdInfo = '';
        if (existsSync(prdPath)) {
          const prd = JSON.parse(await fs.readFile(prdPath, 'utf-8'));
          const pending = (prd.userStories ?? []).filter((s: any) => !s.passes).length;
          const total = (prd.userStories ?? []).length;
          prdInfo = ` | ${total - pending}/${total} stories complete`;
        }
        sections.push(
          `## Ralph Status\n` +
            `Iteration ${state.current_iteration}/${state.max_iterations}${prdInfo} | Tool: ${state.tool} | Paused: ${state.paused}`
        );
      }
    } catch {
      // ignore
    }
  }

  try {
    const { stdout } = await execAsync('git rev-parse --abbrev-ref HEAD', { cwd });
    const branch = stdout.trim();
    if (branch) {
      sections.unshift(`## Branch\n\`${branch}\``);
    }
  } catch {
    // ignore
  }

  if (sections.length === 0) {
    console.log(
      chalk.yellow('No session context found. Create tasks, a PLANS.md, or make some commits.')
    );
    return;
  }

  const output = [
    '─'.repeat(60),
    chalk.bold('📋 SESSION CONTINUITY CONTEXT'),
    chalk.gray('Paste this at the start of a new AI session:'),
    '─'.repeat(60),
    '',
    sections.join('\n\n'),
    '',
    '─'.repeat(60),
  ].join('\n');

  console.log(output);

  if (plans !== null) {
    const { appendPlansHistory } = await import('../../core/plans-manager.js');
    try {
      await appendPlansHistory(
        cwd,
        `Session context generated. Branch: current. Pending tasks summarized.`
      );
    } catch {
      // non-critical
    }
  }
}

export async function reviewCommand(options: {
  output?: 'terminal' | 'github-comment' | 'json';
  failOn?: 'critical' | 'major' | 'minor';
  baseBranch?: string;
  tool?: string;
}): Promise<void> {
  const { default: ora } = await import('ora');
  const { default: chalkModule } = await import('chalk');
  const cwd = process.cwd();
  const baseBranch = options.baseBranch ?? 'main';
  const outputFormat = options.output ?? 'terminal';
  const tool = (options.tool ?? 'claude') as import('../../core/review-manager.js').ReviewTool;

  const {
    getDiffContext,
    buildReviewPrompt,
    runAIReview,
    parseReviewOutput,
    formatReviewTerminal,
    postGitHubComment,
    readAgentsMd,
    hasFailingIssues,
  } = await import('../../core/review-manager.js');

  const diff = await getDiffContext(cwd, baseBranch);
  if (!diff) {
    console.log(chalkModule.yellow(`No changes detected vs ${baseBranch}`));
    return;
  }

  const agentsMdContent = await readAgentsMd(cwd);

  const projectName = path.basename(cwd);
  const prompt = buildReviewPrompt(diff, { agentsMdContent, projectName });

  const spinner = ora('Running AI review...').start();
  const rawOutput = await runAIReview(prompt, tool);
  if (!rawOutput) {
    spinner.fail('AI review returned no output. Is the AI tool installed and configured?');
    process.exit(1);
  }
  spinner.succeed('AI review complete');

  const result = parseReviewOutput(rawOutput);

  switch (outputFormat) {
    case 'terminal':
      console.log(formatReviewTerminal(result));
      break;
    case 'json':
      console.log(JSON.stringify(result, null, 2));
      break;
    case 'github-comment':
      try {
        await postGitHubComment(result);
        console.log(chalkModule.green('Review posted as PR comment'));
      } catch (error) {
        console.error(chalkModule.red(`Failed to post comment: ${error}`));
        process.exit(1);
      }
      break;
  }

  if (options.failOn && hasFailingIssues(result.issues, options.failOn)) {
    console.log(chalkModule.red(`\nFailing: found issues at or above "${options.failOn}" severity`));
    process.exit(1);
  }
}
