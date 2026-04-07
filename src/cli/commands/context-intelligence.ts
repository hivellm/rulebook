import chalk from 'chalk';
import ora from 'ora';

// Context Intelligence Layer commands (v4.4)

export async function decisionCreateCommand(
  title: string,
  options: { context?: string; relatedTask?: string }
): Promise<void> {
  const { DecisionManager } = await import('../../core/decision-manager.js');
  const mgr = new DecisionManager(process.cwd());
  const spinner = ora('Creating decision...').start();
  try {
    const d = await mgr.create(title, {
      context: options.context,
      relatedTasks: options.relatedTask ? [options.relatedTask] : undefined,
    });
    spinner.succeed(`Decision ADR-${String(d.id).padStart(3, '0')}: ${d.title} (${d.status})`);
  } catch (error) {
    spinner.fail(`Failed: ${String(error)}`);
  }
}

export async function decisionListCommand(options: { status?: string }): Promise<void> {
  const { DecisionManager } = await import('../../core/decision-manager.js');
  const mgr = new DecisionManager(process.cwd());
  const decisions = await mgr.list(options.status as any);
  if (decisions.length === 0) {
    console.log(chalk.dim('No decisions found.'));
    return;
  }
  for (const d of decisions) {
    const badge =
      d.status === 'accepted'
        ? chalk.green(d.status)
        : d.status === 'superseded'
          ? chalk.dim(d.status)
          : chalk.yellow(d.status);
    console.log(`  ADR-${String(d.id).padStart(3, '0')}  ${d.title}  ${badge}`);
  }
}

export async function decisionShowCommand(id: string): Promise<void> {
  const { DecisionManager } = await import('../../core/decision-manager.js');
  const mgr = new DecisionManager(process.cwd());
  const result = await mgr.show(parseInt(id));
  if (!result) {
    console.log(chalk.red(`Decision ${id} not found.`));
    return;
  }
  console.log(result.content);
}

export async function decisionSupersedeCommand(oldId: string, newId: string): Promise<void> {
  const { DecisionManager } = await import('../../core/decision-manager.js');
  const mgr = new DecisionManager(process.cwd());
  const ok = await mgr.supersede(parseInt(oldId), parseInt(newId));
  if (ok) {
    console.log(chalk.green(`Decision ${oldId} superseded by ${newId}.`));
  } else {
    console.log(chalk.red(`Decision ${oldId} not found.`));
  }
}

export async function knowledgeAddCommand(
  type: string,
  title: string,
  options: { category?: string; description?: string }
): Promise<void> {
  const { KnowledgeManager } = await import('../../core/knowledge-manager.js');
  const mgr = new KnowledgeManager(process.cwd());
  const spinner = ora('Adding knowledge entry...').start();
  try {
    const entry = await mgr.add(type as any, title, {
      category: (options.category ?? 'code') as any,
      description: options.description ?? '',
    });
    spinner.succeed(`${entry.type}: ${entry.title} (${entry.category})`);
  } catch (error) {
    spinner.fail(`Failed: ${String(error)}`);
  }
}

export async function knowledgeListCommand(options: {
  type?: string;
  category?: string;
}): Promise<void> {
  const { KnowledgeManager } = await import('../../core/knowledge-manager.js');
  const mgr = new KnowledgeManager(process.cwd());
  const entries = await mgr.list(options.type as any, options.category as any);
  if (entries.length === 0) {
    console.log(chalk.dim('No knowledge entries found.'));
    return;
  }
  for (const e of entries) {
    const badge = e.type === 'pattern' ? chalk.green('pattern') : chalk.red('anti-pattern');
    console.log(`  ${badge}  ${e.title}  ${chalk.dim(e.category)}`);
  }
}

export async function knowledgeShowCommand(id: string): Promise<void> {
  const { KnowledgeManager } = await import('../../core/knowledge-manager.js');
  const mgr = new KnowledgeManager(process.cwd());
  const result = await mgr.show(id);
  if (!result) {
    console.log(chalk.red(`Knowledge entry "${id}" not found.`));
    return;
  }
  console.log(result.content);
}

export async function knowledgeRemoveCommand(id: string): Promise<void> {
  const { KnowledgeManager } = await import('../../core/knowledge-manager.js');
  const mgr = new KnowledgeManager(process.cwd());
  const ok = await mgr.remove(id);
  if (ok) {
    console.log(chalk.green(`Knowledge entry "${id}" removed.`));
  } else {
    console.log(chalk.red(`Knowledge entry "${id}" not found.`));
  }
}

export async function learnCaptureCommand(options: {
  title?: string;
  content?: string;
  relatedTask?: string;
  tags?: string;
}): Promise<void> {
  const { LearnManager } = await import('../../core/learn-manager.js');
  const mgr = new LearnManager(process.cwd());
  const title = options.title ?? 'Untitled learning';
  const content = options.content ?? '';
  const tags = options.tags ? options.tags.split(',').map((t) => t.trim()) : [];

  const spinner = ora('Capturing learning...').start();
  try {
    const learning = await mgr.capture(title, content, {
      source: 'manual',
      relatedTask: options.relatedTask,
      tags,
    });
    spinner.succeed(`Learning captured: ${learning.title}`);
  } catch (error) {
    spinner.fail(`Failed: ${String(error)}`);
  }
}

export async function learnFromRalphCommand(): Promise<void> {
  const { LearnManager } = await import('../../core/learn-manager.js');
  const mgr = new LearnManager(process.cwd());
  const spinner = ora('Extracting learnings from Ralph history...').start();
  try {
    const learnings = await mgr.fromRalph();
    if (learnings.length === 0) {
      spinner.info('No new learnings found in Ralph history.');
    } else {
      spinner.succeed(`Extracted ${learnings.length} learning(s) from Ralph history.`);
    }
  } catch (error) {
    spinner.fail(`Failed: ${String(error)}`);
  }
}

export async function learnListCommand(options: { limit?: string }): Promise<void> {
  const { LearnManager } = await import('../../core/learn-manager.js');
  const mgr = new LearnManager(process.cwd());
  const limit = options.limit ? parseInt(options.limit) : undefined;
  const learnings = await mgr.list(limit);
  if (learnings.length === 0) {
    console.log(chalk.dim('No learnings found.'));
    return;
  }
  for (const l of learnings) {
    const badge =
      l.source === 'ralph'
        ? chalk.blue('ralph')
        : l.source === 'task-archive'
          ? chalk.yellow('archive')
          : chalk.dim('manual');
    const promoted = l.promotedTo ? chalk.green(` → ${l.promotedTo.type}`) : '';
    console.log(`  ${badge}  ${l.title}${promoted}`);
  }
}

export async function learnPromoteCommand(
  id: string,
  target: string,
  options: { title?: string }
): Promise<void> {
  const { LearnManager } = await import('../../core/learn-manager.js');
  const mgr = new LearnManager(process.cwd());

  if (target !== 'knowledge' && target !== 'decision') {
    console.log(chalk.red('Target must be "knowledge" or "decision".'));
    return;
  }

  const spinner = ora(`Promoting learning to ${target}...`).start();
  try {
    const result = await mgr.promote(id, target as any, { title: options.title });
    if (!result) {
      spinner.fail(`Learning "${id}" not found.`);
      return;
    }
    spinner.succeed(`Learning promoted to ${result.type} (id: ${result.id}).`);
  } catch (error) {
    spinner.fail(`Failed: ${String(error)}`);
  }
}
