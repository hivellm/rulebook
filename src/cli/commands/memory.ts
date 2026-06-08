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
        const { createConfigManager } = await import('../../core/state/config-manager.js');
        const cwd = process.cwd();
        const configManager = createConfigManager(cwd);
        const config = await configManager.loadConfig();

        if (!config.memory?.enabled) {
            spinner.fail(
                'Memory system is not enabled. Run: rulebook config --set memory.enabled=true'
            );
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
                    r.type === 'bugfix'
                        ? chalk.red
                        : r.type === 'feature'
                          ? chalk.green
                          : chalk.blue;
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
        const { createConfigManager } = await import('../../core/state/config-manager.js');
        const cwd = process.cwd();
        const configManager = createConfigManager(cwd);
        const config = await configManager.loadConfig();

        if (!config.memory?.enabled) {
            spinner.fail(
                'Memory system is not enabled. Run: rulebook config --set memory.enabled=true'
            );
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
        const { createConfigManager } = await import('../../core/state/config-manager.js');
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
        const memories = JSON.parse(exported).slice(
            0,
            options.limit ? parseInt(options.limit) : 20
        );

        spinner.succeed(`${stats.memoryCount} memories total`);

        if (memories.length === 0) {
            console.log(chalk.yellow('\nNo memories stored yet.'));
        } else {
            console.log('');
            for (const m of memories) {
                const date = new Date(m.createdAt).toLocaleDateString();
                const typeColor =
                    m.type === 'bugfix'
                        ? chalk.red
                        : m.type === 'feature'
                          ? chalk.green
                          : chalk.blue;
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
        const { createConfigManager } = await import('../../core/state/config-manager.js');
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
        console.log(`  Files:     ${chalk.cyan(stats.fileCount)}`);
        console.log(`  Size:      ${chalk.cyan(sizeMB + ' MB')} / ${maxMB} MB`);
        console.log(
            `  Usage:     [${stats.usagePercent > 80 ? chalk.red(bar) : chalk.green(bar)}] ${usage}%`
        );

        await manager.close();
    } catch (error) {
        spinner.fail('Failed to load stats');
        const chalk = (await import('chalk')).default;
        console.error(chalk.red(String(error)));
        process.exit(1);
    }
}

// memoryVerifyCommand removed in v5.6 — there is no separate index to
// verify against the file-based store. Use `memory stats` for a summary
// or `memory migrate-from-db` to migrate an existing legacy DB.

export async function memoryCleanupCommand(options: { force?: boolean }): Promise<void> {
    const ora = (await import('ora')).default;
    const spinner = ora('Running cleanup...').start();

    try {
        const { createConfigManager } = await import('../../core/state/config-manager.js');
        const cwd = process.cwd();
        const configManager = createConfigManager(cwd);
        const config = await configManager.loadConfig();

        if (!config.memory?.enabled) {
            spinner.fail('Memory system is not enabled.');
            return;
        }

        const { createMemoryManager } = await import('../../memory/memory-manager.js');
        const manager = createMemoryManager(cwd, config.memory);
        // Age-based cleanup: --force triggers a 1-day cutoff; otherwise no-op.
        // The legacy LRU byte-budget eviction was removed in v5.6 (file store).
        const result = await manager.cleanup(options.force ? { maxAgeDays: 1 } : undefined);

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
        const { createConfigManager } = await import('../../core/state/config-manager.js');
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
        const count =
            format === 'json' ? JSON.parse(exported).length : exported.split('\n').length - 1;

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

/**
 * One-shot migration from a legacy `.rulebook/memory/memory.db` SQLite store
 * into the v5.6 file-based store. Idempotent — re-running rewrites the same
 * markdown files without duplicates. Renames the source DB to
 * `memory.db.legacy` on success so the runtime never reads SQLite again.
 */
export async function memoryMigrateFromDbCommand(): Promise<void> {
    const ora = (await import('ora')).default;
    const chalk = (await import('chalk')).default;
    const spinner = ora('Migrating legacy memory.db to markdown...').start();

    try {
        const { createConfigManager } = await import('../../core/state/config-manager.js');
        const cwd = process.cwd();
        const configManager = createConfigManager(cwd);
        const config = await configManager.loadConfig();

        const dbRel = config.memory?.dbPath ?? '.rulebook/memory/memory.db';
        const dbAbs = path.join(cwd, dbRel);

        if (!existsSync(dbAbs)) {
            spinner.info(`No legacy DB at ${dbRel} — nothing to migrate`);
            return;
        }

        const memoryRoot = path.dirname(dbAbs);
        const { FileStore } = await import('../../memory/file-store.js');
        const { migrateLegacyDb } = await import('../../memory/legacy-migrator.js');

        const store = new FileStore(memoryRoot);
        await store.initialize();
        const stats = await migrateLegacyDb(dbAbs, store);

        const { rename } = await import('fs/promises');
        await rename(dbAbs, dbAbs + '.legacy');

        spinner.succeed(
            `Migrated ${stats.memories} memories and ${stats.sessions} sessions; renamed source to ${path.basename(dbAbs)}.legacy`
        );
    } catch (error) {
        spinner.fail('Migration failed');
        console.error(chalk.red(String(error)));
        process.exit(1);
    }
}
