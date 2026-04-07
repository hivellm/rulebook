import { existsSync } from 'fs';
import path from 'path';

export async function memorySearchCommand(
  query: string,
  options: { type?: string; limit?: string; mode?: string }
): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Searching memories...').start();

  try {
    const { createConfigManager } = await import('../../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled. Run: rulebook config --set memory.enabled=true');
      return;
    }

    const { createMemoryManager } = await import('../../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);

    const results = await manager.searchMemories({
      query,
      mode: (options.mode as 'bm25' | 'vector' | 'hybrid') || 'hybrid',
      type: options.type as any,
      limit: options.limit ? parseInt(options.limit) : 20,
    });

    spinner.succeed(`Found ${results.length} memories`);

    if (results.length === 0) {
      console.log(chalk.yellow('\nNo memories found for that query.'));
    } else {
      console.log('');
      for (const r of results) {
        const typeColor =
          r.type === 'bugfix' ? chalk.red : r.type === 'feature' ? chalk.green : chalk.blue;
        console.log(
          `  ${typeColor(r.type.padEnd(12))} ${chalk.white(r.title)} ${chalk.gray(`[${r.matchType}] ${r.score.toFixed(3)}`)}`
        );
      }
    }

    await manager.close();
  } catch (error) {
    spinner.fail('Search failed');
    const chalk = (await import('chalk')).default;
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memorySaveCommand(
  text: string,
  options: { type?: string; title?: string; tags?: string }
): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Saving memory...').start();

  try {
    const { createConfigManager } = await import('../../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled. Run: rulebook config --set memory.enabled=true');
      return;
    }

    const { createMemoryManager } = await import('../../memory/memory-manager.js');
    const { classifyMemory } = await import('../../memory/memory-hooks.js');
    const manager = createMemoryManager(cwd, config.memory);

    const type = (options.type || classifyMemory(text)) as any;
    const title = options.title || text.slice(0, 80);
    const tags = options.tags ? options.tags.split(',').map((t) => t.trim()) : [];

    const memory = await manager.saveMemory({ type, title, content: text, tags });
    spinner.succeed(`Memory saved: ${chalk.cyan(memory.id)}`);
    console.log(chalk.gray(`  Type: ${memory.type} | Title: ${memory.title}`));

    await manager.close();
  } catch (error) {
    spinner.fail('Save failed');
    const chalk = (await import('chalk')).default;
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryListCommand(options: { limit?: string; type?: string }): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Loading memories...').start();

  try {
    const { createConfigManager } = await import('../../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled.');
      return;
    }

    const { createMemoryManager } = await import('../../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);

    const stats = await manager.getStats();
    const exported = await manager.exportMemories('json');
    const memories = JSON.parse(exported).slice(0, options.limit ? parseInt(options.limit) : 20);

    spinner.succeed(`${stats.memoryCount} memories total`);

    if (memories.length === 0) {
      console.log(chalk.yellow('\nNo memories stored yet.'));
    } else {
      console.log('');
      for (const m of memories) {
        const date = new Date(m.createdAt).toLocaleDateString();
        const typeColor =
          m.type === 'bugfix' ? chalk.red : m.type === 'feature' ? chalk.green : chalk.blue;
        console.log(
          `  ${chalk.gray(date)} ${typeColor(m.type.padEnd(12))} ${chalk.white(m.title)}`
        );
      }
    }

    await manager.close();
  } catch (error) {
    spinner.fail('Failed to list memories');
    const chalk = (await import('chalk')).default;
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryStatsCommand(): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Loading stats...').start();

  try {
    const { createConfigManager } = await import('../../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled.');
      return;
    }

    const { createMemoryManager } = await import('../../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);
    const stats = await manager.getStats();

    spinner.succeed('Memory statistics');

    const sizeMB = (stats.dbSizeBytes / 1024 / 1024).toFixed(2);
    const maxMB = (stats.maxSizeBytes / 1024 / 1024).toFixed(0);
    const usage = stats.usagePercent.toFixed(1);
    const bar =
      '█'.repeat(Math.floor(stats.usagePercent / 5)) +
      '░'.repeat(20 - Math.floor(stats.usagePercent / 5));

    console.log(`\n  Memories:  ${chalk.cyan(stats.memoryCount)}`);
    console.log(`  Sessions:  ${chalk.cyan(stats.sessionCount)}`);
    console.log(`  DB Size:   ${chalk.cyan(sizeMB + ' MB')} / ${maxMB} MB`);
    console.log(
      `  Usage:     [${stats.usagePercent > 80 ? chalk.red(bar) : chalk.green(bar)}] ${usage}%`
    );
    console.log(
      `  Health:    ${stats.indexHealth === 'good' ? chalk.green(stats.indexHealth) : chalk.yellow(stats.indexHealth)}`
    );

    await manager.close();
  } catch (error) {
    spinner.fail('Failed to load stats');
    const chalk = (await import('chalk')).default;
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryVerifyCommand(): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Verifying memory system...').start();

  try {
    const { createConfigManager } = await import('../../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    const memoryEnabled = config.memory?.enabled ?? false;
    const dbPathRelative = config.memory?.dbPath ?? '.rulebook/memory/memory.db';
    const dbPathAbsolute = path.join(cwd, dbPathRelative);

    spinner.succeed('Memory verification');

    console.log(
      `\n  ${memoryEnabled ? chalk.green('✓') : chalk.red('✗')} Memory enabled: ${memoryEnabled}`
    );

    console.log(`  ${chalk.green('✓')} DB path: ${dbPathRelative}`);

    const fileExists = existsSync(dbPathAbsolute);
    if (fileExists) {
      const { statSync } = await import('fs');
      const fileStat = statSync(dbPathAbsolute);
      const sizeKB = (fileStat.size / 1024).toFixed(1);
      console.log(`  ${chalk.green('✓')} File exists: YES (${sizeKB} KB)`);
    } else {
      console.log(`  ${chalk.red('✗')} File exists: NO`);
    }

    if (memoryEnabled && fileExists) {
      try {
        const { createMemoryManager } = await import('../../memory/memory-manager.js');
        const manager = createMemoryManager(cwd, config.memory!);
        const stats = await manager.getStats();
        console.log(`  ${chalk.green('✓')} Record count: ${stats.memoryCount} memories`);
        await manager.close();
      } catch (error) {
        console.log(`  ${chalk.yellow('!')} Record count: unable to read (${String(error)})`);
      }
    } else if (!memoryEnabled) {
      console.log(
        `  ${chalk.yellow('!')} Enable memory with: ${chalk.bold('rulebook config --feature memory --enable')}`
      );
    }

    console.log('');
  } catch (error) {
    spinner.fail('Memory verification failed');
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryCleanupCommand(options: { force?: boolean }): Promise<void> {
  const ora = (await import('ora')).default;
  const spinner = ora('Running cleanup...').start();

  try {
    const { createConfigManager } = await import('../../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled.');
      return;
    }

    const { createMemoryManager } = await import('../../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);
    const result = await manager.cleanup(options.force || false);

    if (result.evictedCount > 0) {
      const freedMB = (result.freedBytes / 1024 / 1024).toFixed(2);
      spinner.succeed(`Cleaned up ${result.evictedCount} memories (freed ${freedMB} MB)`);
    } else {
      spinner.succeed('No cleanup needed');
    }

    await manager.close();
  } catch (error) {
    spinner.fail('Cleanup failed');
    const chalk = (await import('chalk')).default;
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}

export async function memoryExportCommand(options: {
  format?: string;
  output?: string;
}): Promise<void> {
  const ora = (await import('ora')).default;
  const chalk = (await import('chalk')).default;
  const spinner = ora('Exporting memories...').start();

  try {
    const { createConfigManager } = await import('../../core/config-manager.js');
    const cwd = process.cwd();
    const configManager = createConfigManager(cwd);
    const config = await configManager.loadConfig();

    if (!config.memory?.enabled) {
      spinner.fail('Memory system is not enabled.');
      return;
    }

    const { createMemoryManager } = await import('../../memory/memory-manager.js');
    const manager = createMemoryManager(cwd, config.memory);

    const format = (options.format || 'json') as 'json' | 'csv';
    const exported = await manager.exportMemories(format);
    const count = format === 'json' ? JSON.parse(exported).length : exported.split('\n').length - 1;

    if (options.output) {
      const { writeFile } = await import('fs/promises');
      await writeFile(options.output, exported);
      spinner.succeed(`Exported ${count} memories to ${chalk.cyan(options.output)}`);
    } else {
      spinner.succeed(`Exported ${count} memories`);
      console.log(exported);
    }

    await manager.close();
  } catch (error) {
    spinner.fail('Export failed');
    const chalk = (await import('chalk')).default;
    console.error(chalk.red(String(error)));
    process.exit(1);
  }
}
