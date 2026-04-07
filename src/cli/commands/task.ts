import chalk from 'chalk';
import { WorkspaceManager } from '../../core/workspace/workspace-manager.js';

interface WorkspaceTaskOptions {
  project?: string;
  allProjects?: boolean;
}

/**
 * Resolve a TaskManager for a specific project.
 *
 * Resolution order:
 * 1. Explicit --project flag → find workspace config from cwd, route to named project
 * 2. Auto-detect → walk up from cwd to find workspace, match cwd to a project
 * 3. Fallback → single-project from cwd (no workspace)
 */
async function resolveTaskManager(
  cwd: string,
  options?: WorkspaceTaskOptions
): Promise<{ taskManager: any; projectLabel?: string }> {
  const { createTaskManager } = await import('../../core/task-manager.js');
  const { createConfigManager } = await import('../../core/config-manager.js');
  const { isAbsolute, resolve } = await import('path');

  const buildFromProjectRoot = async (projectRoot: string, label: string) => {
    const configManager = createConfigManager(projectRoot);
    const config = await configManager.loadConfig();
    const rulebookDir = config.rulebookDir || '.rulebook';
    return { taskManager: createTaskManager(projectRoot, rulebookDir), projectLabel: label };
  };

  if (options?.project) {
    const ws = WorkspaceManager.findWorkspaceFromCwd(cwd);
    if (!ws) {
      console.error(chalk.red('No workspace found. Run `rulebook workspace init` first.'));
      process.exit(1);
    }
    const project = ws.config.projects.find((p) => p.name === options.project);
    if (!project) {
      console.error(chalk.red(`Project "${options.project}" not found in workspace.`));
      console.error(chalk.gray(`Available: ${ws.config.projects.map((p) => p.name).join(', ')}`));
      process.exit(1);
    }
    const projectRoot = isAbsolute(project.path) ? project.path : resolve(ws.root, project.path);
    return buildFromProjectRoot(projectRoot, project.name);
  }

  const resolved = WorkspaceManager.resolveProjectFromCwd(cwd);
  if (resolved) {
    const project = resolved.config.projects.find((p) => p.name === resolved.projectName);
    if (project) {
      const projectRoot = isAbsolute(project.path)
        ? project.path
        : resolve(resolved.root, project.path);
      return buildFromProjectRoot(projectRoot, project.name);
    }
  }

  const configManager = createConfigManager(cwd);
  const config = await configManager.loadConfig();
  const rulebookDir = config.rulebookDir || '.rulebook';
  return { taskManager: createTaskManager(cwd, rulebookDir) };
}

export async function taskCreateCommand(
  taskId: string,
  wsOptions?: WorkspaceTaskOptions
): Promise<void> {
  try {
    const cwd = process.cwd();
    const { taskManager, projectLabel } = await resolveTaskManager(cwd, wsOptions);
    await taskManager.createTask(taskId);

    const prefix = projectLabel ? `[${projectLabel}] ` : '';
    console.log(chalk.green(`✅ ${prefix}Task ${taskId} created successfully`));
    console.log(chalk.yellow('\n⚠️  Remember to:'));
    console.log(chalk.gray('  1. Fill in proposal.md (minimum 20 characters in "Why" section)'));
    console.log(chalk.gray('  3. Add tasks to tasks.md'));
    console.log(chalk.gray('  4. Create spec deltas in specs/*/spec.md'));
    console.log(chalk.gray('  5. Validate with: rulebook task validate ' + taskId));
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to create task: ${error.message}`));
    process.exit(1);
  }
}

export async function taskListCommand(
  includeArchived: boolean = false,
  wsOptions?: WorkspaceTaskOptions
): Promise<void> {
  try {
    const cwd = process.cwd();

    if (wsOptions?.allProjects) {
      const ws = WorkspaceManager.findWorkspaceFromCwd(cwd);
      if (!ws) {
        console.error(chalk.red('No workspace found. Run `rulebook workspace init` first.'));
        process.exit(1);
        return;
      }

      console.log(chalk.bold.blue(`\n📋 Workspace Tasks (${ws.config.name})\n`));

      const { createTaskManager } = await import('../../core/task-manager.js');
      const { createConfigManager } = await import('../../core/config-manager.js');
      const { isAbsolute, resolve } = await import('path');

      let totalTasks = 0;
      for (const project of ws.config.projects) {
        const projectRoot = isAbsolute(project.path)
          ? project.path
          : resolve(ws.root, project.path);
        try {
          const configManager = createConfigManager(projectRoot);
          const config = await configManager.loadConfig();
          const rulebookDir = config.rulebookDir || '.rulebook';
          const taskManager = createTaskManager(projectRoot, rulebookDir);
          const tasks = await taskManager.listTasks(includeArchived);

          if (tasks.length > 0) {
            console.log(chalk.bold.cyan(`  [${project.name}]`));
            for (const task of tasks) {
              const statusColor =
                task.status === 'completed'
                  ? chalk.green
                  : task.status === 'in-progress'
                    ? chalk.yellow
                    : task.status === 'blocked'
                      ? chalk.red
                      : chalk.gray;
              console.log(
                `    ${statusColor(task.status.padEnd(12))} ${chalk.white(task.id)} - ${chalk.gray(task.title)}`
              );
            }
            console.log('');
            totalTasks += tasks.length;
          }
        } catch {
          console.log(chalk.bold.cyan(`  [${project.name}]`));
          console.log(chalk.gray('    No tasks or no .rulebook config'));
          console.log('');
        }
      }

      console.log(
        chalk.gray(`${totalTasks} task(s) across ${ws.config.projects.length} project(s)`)
      );
      return;
    }

    const { taskManager, projectLabel } = await resolveTaskManager(cwd, wsOptions);
    const tasks = await taskManager.listTasks(includeArchived);

    if (tasks.length === 0) {
      console.log(chalk.gray('No tasks found'));
      return;
    }

    const header = projectLabel
      ? `\n📋 Rulebook Tasks [${projectLabel}]\n`
      : '\n📋 Rulebook Tasks\n';
    console.log(chalk.bold.blue(header));

    const activeTasks = tasks.filter((t: any) => !t.archivedAt);
    const archivedTasks = tasks.filter((t: any) => t.archivedAt);

    if (activeTasks.length > 0) {
      console.log(chalk.bold('Active Tasks:'));
      for (const task of activeTasks) {
        const statusColor =
          task.status === 'completed'
            ? chalk.green
            : task.status === 'in-progress'
              ? chalk.yellow
              : task.status === 'blocked'
                ? chalk.red
                : chalk.gray;
        console.log(
          `  ${statusColor(task.status.padEnd(12))} ${chalk.white(task.id)} - ${chalk.gray(task.title)}`
        );
      }
      console.log('');
    }

    if (includeArchived && archivedTasks.length > 0) {
      console.log(chalk.bold('Archived Tasks:'));
      for (const task of archivedTasks) {
        console.log(
          `  ${chalk.gray('archived'.padEnd(12))} ${chalk.white(task.id)} - ${chalk.gray(task.title)} ${chalk.dim(`(${task.archivedAt})`)}`
        );
      }
      console.log('');
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to list tasks: ${error.message}`));
    process.exit(1);
  }
}

export async function taskShowCommand(
  taskId: string,
  wsOptions?: WorkspaceTaskOptions
): Promise<void> {
  try {
    const cwd = process.cwd();
    const { taskManager } = await resolveTaskManager(cwd, wsOptions);
    const task = await taskManager.showTask(taskId);

    if (!task) {
      console.error(chalk.red(`❌ Task ${taskId} not found`));
      process.exit(1);
      return;
    }

    console.log(chalk.bold.blue(`\n📋 Task: ${task.id}\n`));
    console.log(chalk.white(`Title: ${task.title}`));
    console.log(chalk.gray(`Status: ${task.status}`));
    console.log(chalk.gray(`Created: ${task.createdAt}`));
    console.log(chalk.gray(`Updated: ${task.updatedAt}`));
    if (task.archivedAt) {
      console.log(chalk.gray(`Archived: ${task.archivedAt}`));
    }
    console.log('');

    if (task.proposal) {
      console.log(chalk.bold('Proposal:'));
      console.log(
        chalk.gray(task.proposal.substring(0, 500) + (task.proposal.length > 500 ? '...' : ''))
      );
      console.log('');
    }

    if (task.specs && Object.keys(task.specs).length > 0) {
      console.log(chalk.bold('Specs:'));
      for (const [module, spec] of Object.entries(task.specs)) {
        console.log(chalk.gray(`  ${module}/spec.md (${(spec as string).length} chars)`));
      }
      console.log('');
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to show task: ${error.message}`));
    process.exit(1);
  }
}

export async function taskValidateCommand(
  taskId: string,
  wsOptions?: WorkspaceTaskOptions
): Promise<void> {
  try {
    const cwd = process.cwd();
    const { taskManager } = await resolveTaskManager(cwd, wsOptions);
    const validation = await taskManager.validateTask(taskId);

    if (validation.valid) {
      console.log(chalk.green(`✅ Task ${taskId} is valid`));
      if (validation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`  - ${warning}`));
        }
      }
    } else {
      console.log(chalk.red(`❌ Task ${taskId} validation failed\n`));
      console.log(chalk.red('Errors:'));
      for (const error of validation.errors) {
        console.log(chalk.red(`  - ${error}`));
      }
      if (validation.warnings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Warnings:'));
        for (const warning of validation.warnings) {
          console.log(chalk.yellow(`  - ${warning}`));
        }
      }
      process.exit(1);
    }
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to validate task: ${error.message}`));
    process.exit(1);
  }
}

export async function taskArchiveCommand(
  taskId: string,
  skipValidation: boolean = false,
  wsOptions?: WorkspaceTaskOptions
): Promise<void> {
  try {
    const cwd = process.cwd();
    const { taskManager, projectLabel } = await resolveTaskManager(cwd, wsOptions);
    await taskManager.archiveTask(taskId, skipValidation);

    const prefix = projectLabel ? `[${projectLabel}] ` : '';
    console.log(chalk.green(`✅ ${prefix}Task ${taskId} archived successfully`));
  } catch (error: any) {
    console.error(chalk.red(`❌ Failed to archive task: ${error.message}`));
    process.exit(1);
  }
}

export async function tasksCommand(options: {
  tree?: boolean;
  current?: boolean;
  status?: string;
}): Promise<void> {
  console.log(
    chalk.yellow('⚠️  The `tasks` command is deprecated. Use `rulebook task` commands instead.')
  );
  console.log(chalk.gray('  - rulebook task list'));
  console.log(chalk.gray('  - rulebook task show <task-id>'));
  console.log(chalk.gray('  - rulebook task create <task-id>'));
  console.log(chalk.gray('  - rulebook task validate <task-id>'));
  console.log(chalk.gray('  - rulebook task archive <task-id>'));

  if (options.tree || options.current || options.status) {
    console.log(chalk.red('\n❌ Legacy commands are no longer supported.'));
    console.log(chalk.yellow('Please use the Rulebook task system.'));
    process.exit(1);
  }

  await taskListCommand(false);
}
