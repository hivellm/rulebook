import chalk from 'chalk';
import ora from 'ora';
import path from 'path';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { WorkspaceManager } from '../../core/workspace/workspace-manager.js';
import type { WorkspaceConfig, WorkspaceProject } from '../../core/workspace/workspace-types.js';
import { migrateLegacyMcpConfigs } from '../../core/workspace/legacy-migrator.js';

function getWorkspaceConfigPath(cwd: string): string {
  return path.join(cwd, '.rulebook', 'workspace.json');
}

export async function workspaceInitCommand(): Promise<void> {
  const cwd = process.cwd();
  const configPath = getWorkspaceConfigPath(cwd);

  if (existsSync(configPath)) {
    console.log(chalk.yellow('Workspace already initialized at .rulebook/workspace.json'));
    return;
  }

  const spinner = ora('Detecting workspace structure...').start();
  let config = WorkspaceManager.findWorkspaceConfig(cwd);

  if (config) {
    spinner.succeed(`Detected workspace: ${config.name} (${config.projects.length} projects)`);
    console.log('\n  Projects found:');
    for (const p of config.projects) {
      console.log(`    - ${chalk.cyan(p.name)} → ${p.path}`);
    }
  } else {
    spinner.info('No workspace structure detected. Creating empty workspace config.');
    config = { name: path.basename(cwd), version: '1.0.0', projects: [] };
  }

  const rulebookDir = path.join(cwd, '.rulebook');
  if (!existsSync(rulebookDir)) {
    const { mkdirSync } = await import('fs');
    mkdirSync(rulebookDir, { recursive: true });
  }

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(chalk.green(`\n  Created: .rulebook/workspace.json`));

  const migration = await migrateLegacyMcpConfigs(cwd);
  if (migration.migratedFiles.length > 0) {
    console.log(chalk.yellow(`\n  Migrated ${migration.migratedFiles.length} legacy .mcp.json files`));
  }

  console.log(chalk.dim('\n  Use `rulebook workspace add <path>` to add more projects'));
  console.log(chalk.dim('  Use `rulebook mcp init --workspace` to configure MCP for workspace'));
}

export async function workspaceAddCommand(projectPath: string): Promise<void> {
  const cwd = process.cwd();
  const configPath = getWorkspaceConfigPath(cwd);

  if (!existsSync(configPath)) {
    console.error(chalk.red('No workspace found. Run `rulebook workspace init` first.'));
    process.exit(1);
  }

  const config: WorkspaceConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  const resolvedPath = path.resolve(cwd, projectPath);
  const name = path.basename(resolvedPath);

  if (config.projects.some((p) => p.name === name)) {
    console.error(chalk.red(`Project "${name}" already exists in workspace.`));
    process.exit(1);
  }

  const isSubpath = resolvedPath.startsWith(cwd);
  const storedPath = isSubpath ? path.relative(cwd, resolvedPath) : resolvedPath;
  const project: WorkspaceProject = {
    name,
    path: storedPath.startsWith('.') ? storedPath : `./${storedPath}`,
  };

  config.projects.push(project);
  if (!config.defaultProject) config.defaultProject = name;

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(chalk.green(`Added project "${name}" → ${project.path}`));
}

export async function workspaceRemoveCommand(projectName: string): Promise<void> {
  const cwd = process.cwd();
  const configPath = getWorkspaceConfigPath(cwd);

  if (!existsSync(configPath)) {
    console.error(chalk.red('No workspace found. Run `rulebook workspace init` first.'));
    process.exit(1);
  }

  const config: WorkspaceConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
  const idx = config.projects.findIndex((p) => p.name === projectName);

  if (idx === -1) {
    console.error(chalk.red(`Project "${projectName}" not found in workspace.`));
    process.exit(1);
  }

  config.projects.splice(idx, 1);
  if (config.defaultProject === projectName) config.defaultProject = config.projects[0]?.name;

  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(chalk.green(`Removed project "${projectName}" from workspace.`));
}

export async function workspaceListCommand(): Promise<void> {
  const cwd = process.cwd();
  const config = WorkspaceManager.findWorkspaceConfig(cwd);

  if (!config) {
    console.log(chalk.yellow('No workspace found. Run `rulebook workspace init` to create one.'));
    return;
  }

  console.log(chalk.bold(`\nWorkspace: ${config.name}`));
  console.log(chalk.dim(`  Version: ${config.version}`));
  if (config.defaultProject) console.log(chalk.dim(`  Default: ${config.defaultProject}`));
  console.log();

  for (const p of config.projects) {
    const isDefault = p.name === config.defaultProject;
    const marker = isDefault ? chalk.green(' (default)') : '';
    const disabled = p.enabled === false ? chalk.red(' [disabled]') : '';
    console.log(`  ${chalk.cyan(p.name)}${marker}${disabled}`);
    console.log(`    ${chalk.dim(p.path)}`);
  }
  console.log(chalk.dim(`\n  ${config.projects.length} project(s) total`));
}

export async function workspaceStatusCommand(): Promise<void> {
  const cwd = process.cwd();
  const config = WorkspaceManager.findWorkspaceConfig(cwd);

  if (!config) {
    console.log(chalk.yellow('No workspace found. Run `rulebook workspace init` to create one.'));
    return;
  }

  const manager = new WorkspaceManager(config, cwd);
  const spinner = ora('Checking workspace status...').start();
  try {
    const status = await manager.getStatus();
    spinner.stop();
    console.log(chalk.bold(`\nWorkspace: ${status.name}`));
    console.log(`  Projects: ${status.totalProjects}  |  Active workers: ${status.activeWorkers}\n`);

    for (const p of status.projects) {
      const configBadge = p.hasRulebookConfig ? chalk.green('.rulebook') : chalk.dim('no config');
      const memBadge = p.memoryEnabled ? chalk.blue('memory') : '';
      const taskBadge = p.taskCount > 0 ? chalk.yellow(`${p.taskCount} tasks`) : '';
      const badges = [configBadge, memBadge, taskBadge].filter(Boolean).join('  ');
      console.log(`  ${chalk.cyan(p.name)}  ${badges}`);
      console.log(`    ${chalk.dim(p.path)}`);
    }
    console.log();
  } catch (error) {
    spinner.fail(`Failed: ${String(error)}`);
  } finally {
    await manager.shutdownAll();
  }
}
