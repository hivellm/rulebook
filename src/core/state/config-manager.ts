import { readFile, writeFile, existsSync, readFileSync } from 'fs';
import { promisify } from 'util';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { fileURLToPath } from 'url';
import { cp, rm, mkdir } from 'fs/promises';
import type { RulebookConfig } from '../../types.js';

const readFileAsync = promisify(readFile);
const writeFileAsync = promisify(writeFile);

const CONFIG_DIR = '.rulebook';
const CONFIG_FILE = 'rulebook.json';

export const RULEBOOK_GITIGNORE_HEADER =
    '# Rulebook - ignore runtime data, keep specs, tasks and project memory';

/**
 * The `.gitignore` block rulebook owns. Everything named as an exception is
 * meant to be committed and shared with collaborators.
 */
export const RULEBOOK_GITIGNORE_BLOCK = [
    RULEBOOK_GITIGNORE_HEADER,
    '/.rulebook/*',
    '!/.rulebook/specs/',
    '!/.rulebook/tasks/',
    '!/.rulebook/archive/',
    '!/.rulebook/decisions/',
    '!/.rulebook/knowledge/',
    '!/.rulebook/learnings/',
    '!/.rulebook/rulebook.json',
];

/**
 * Every line any rulebook release has emitted into that block. They are stripped
 * before the current block is written, which is what makes the rewrite
 * idempotent and lets an old project pick up newly added exceptions.
 */
const RULEBOOK_MANAGED_GITIGNORE_LINES = new Set<string>([
    ...RULEBOOK_GITIGNORE_BLOCK,
    '# Rulebook - ignore runtime data, keep specs and tasks',
    '.rulebook',
    '.rulebook/',
    '.rulebook/*',
    '/.rulebook',
    '/.rulebook/',
    ...[
        'specs/',
        'tasks/',
        'tasks/**/*.md',
        'archive/',
        'decisions/',
        'knowledge/',
        'learnings/',
        'rulebook.json',
    ].flatMap((entry) => [`!.rulebook/${entry}`, `!/.rulebook/${entry}`]),
]);

function getPackageVersion(): string {
    try {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const packagePath = join(__dirname, '..', '..', '..', 'package.json');
        const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
        return packageJson.version;
    } catch {
        return '2.2.0';
    }
}

export class ConfigManager {
    private configPath: string;
    private configDir: string;
    private projectRoot: string;
    private config: RulebookConfig | null = null;

    constructor(projectRoot: string) {
        this.projectRoot = projectRoot;
        this.configDir = join(projectRoot, CONFIG_DIR);
        this.configPath = join(this.configDir, CONFIG_FILE);
    }

    /**
     * Load configuration from .rulebook/rulebook.json file
     */
    async loadConfig(): Promise<RulebookConfig> {
        if (this.config) {
            return this.config;
        }

        // Migrate old .rulebook file to new directory structure if needed
        await this.migrateOldRulebookFile();

        // Migrate old rulebook/ directory into .rulebook/
        await this.migrateRulebookDirectory();

        if (!existsSync(this.configPath)) {
            return await this.initializeConfig();
        }

        try {
            const data = await readFileAsync(this.configPath, 'utf-8');
            const loadedConfig = JSON.parse(data) as RulebookConfig;

            // Migrate config if needed
            const migratedConfig = await this.migrateConfig(loadedConfig);
            this.config = migratedConfig;

            return migratedConfig;
        } catch (error) {
            console.warn('Failed to load config, initializing new one:', error);
            return await this.initializeConfig();
        }
    }

    /**
     * Save configuration to .rulebook/rulebook.json file
     */
    async saveConfig(config: RulebookConfig): Promise<void> {
        try {
            const fsPromises = await import('fs/promises');

            // Check if .rulebook exists as a file (old structure) and remove it
            const oldConfigPath = join(this.projectRoot, '.rulebook');
            if (existsSync(oldConfigPath)) {
                const stats = await fsPromises.stat(oldConfigPath);
                if (stats.isFile()) {
                    // It's a file, remove it
                    await fsPromises.rm(oldConfigPath, { force: true });
                }
            }

            // Ensure .rulebook directory exists
            await mkdir(this.configDir, { recursive: true });

            const configToSave = {
                ...config,
                updatedAt: new Date().toISOString(),
            };

            await writeFileAsync(this.configPath, JSON.stringify(configToSave, null, 2));
            this.config = configToSave;
        } catch (error) {
            throw new Error(`Failed to save config: ${error}`);
        }
    }

    /**
     * Migrate old .rulebook file to new .rulebook/rulebook.json structure
     */
    private async migrateOldRulebookFile(): Promise<void> {
        const oldConfigPath = join(this.projectRoot, '.rulebook');
        const fsPromises = await import('fs/promises');

        // Check if old .rulebook file exists and is a file (not directory)
        if (!existsSync(oldConfigPath)) {
            return;
        }

        try {
            const stats = await fsPromises.stat(oldConfigPath);
            if (stats.isDirectory()) {
                // Already migrated
                return;
            }

            // Old file exists as a file, migrate it
            const data = await readFileAsync(oldConfigPath, 'utf-8');
            const config = JSON.parse(data) as RulebookConfig;

            // Remove old file first (before creating directory with same name)
            await fsPromises.rm(oldConfigPath, { force: true });

            // Create .rulebook directory
            await mkdir(this.configDir, { recursive: true });

            // Save config to new location
            await this.saveConfig(config);
        } catch {
            // Silently skip migration errors - they'll be handled by loadConfig
        }
    }

    /**
     * Initialize new configuration with defaults
     */
    async initializeConfig(): Promise<RulebookConfig> {
        const now = new Date().toISOString();
        const projectId = randomUUID();

        const defaultConfig: RulebookConfig = {
            version: getPackageVersion(),
            installedAt: now,
            updatedAt: now,
            projectId,
            mode: 'full',
            features: {
                logging: true,
                gitHooks: false,
                templates: false,
                context: false,
                health: false,
                parallel: false,
                smartContinue: false,
            },
            coverageThreshold: 95,
            language: 'en',
            outputLanguage: 'en',
            cliTools: [],
            maxParallelTasks: 1,
            timeouts: {
                taskExecution: 300000, // 5 minutes
                cliResponse: 60000, // 1 minute
                testRun: 120000, // 2 minutes
            },
            agentsMode: 'lean',
            monorepo: {
                detected: false,
                tool: null,
                packages: [],
            },
        };

        await this.saveConfig(defaultConfig);
        return defaultConfig;
    }

    /**
     * Migrate configuration from older versions
     */
    async migrateConfig(config: RulebookConfig): Promise<RulebookConfig> {
        const migrated = { ...config };

        // Migrate directory structure from old to new layout
        await this.migrateDirectoryStructure(this.projectRoot);

        // Add missing features with defaults
        const defaultFeatures = {
            logging: true,
            gitHooks: false,
            templates: false,
            context: false,
            health: false,
            parallel: false,
            smartContinue: false,
        };

        migrated.features = { ...defaultFeatures, ...migrated.features };

        // Normalize: drop feature flags removed in v6.0.0 (watcher, agent,
        // notifications, dryRun, repl, plugins) if present in legacy configs.
        for (const removed of ['watcher', 'agent', 'notifications', 'dryRun', 'repl', 'plugins']) {
            delete (migrated.features as Record<string, unknown>)[removed];
        }

        if (!migrated.mode) {
            migrated.mode = 'full';
        }

        // Add missing top-level properties
        if (!migrated.outputLanguage) {
            migrated.outputLanguage = migrated.language || 'en';
        }
        if (!migrated.maxParallelTasks) {
            migrated.maxParallelTasks = 1;
        }
        if (!migrated.timeouts) {
            migrated.timeouts = {
                taskExecution: 300000,
                cliResponse: 60000,
                testRun: 120000,
            };
        }

        // v4 migration: ensure .rulebook/scripts/ dir is noted in config
        // Scripts dir will be populated on next init/update
        // No config changes needed — scripts are filesystem-only

        // Update version
        migrated.version = getPackageVersion();

        return migrated;
    }

    /**
     * Update specific configuration values
     */
    async updateConfig(updates: Partial<RulebookConfig>): Promise<RulebookConfig> {
        const currentConfig = await this.loadConfig();
        const updatedConfig = { ...currentConfig, ...updates };

        await this.saveConfig(updatedConfig);
        return updatedConfig;
    }

    /**
     * Enable or disable a feature
     */
    async toggleFeature(
        feature: keyof RulebookConfig['features'],
        enabled: boolean
    ): Promise<RulebookConfig> {
        const currentConfig = await this.loadConfig();
        const updatedConfig = {
            ...currentConfig,
            features: {
                ...currentConfig.features,
                [feature]: enabled,
            },
        };

        await this.saveConfig(updatedConfig);
        return updatedConfig;
    }

    /**
     * Detect available CLI tools
     */
    async detectCLITools(): Promise<string[]> {
        const { execa } = await import('execa');
        const cliTools: string[] = [];

        const tools = ['claude-code'];

        for (const tool of tools) {
            try {
                await execa(tool, ['--version'], { timeout: 5000 });
                cliTools.push(tool);
            } catch {
                // Tool not available
            }
        }

        return cliTools;
    }

    /**
     * Update detected CLI tools in config
     */
    async updateCLITools(): Promise<RulebookConfig> {
        const detectedTools = await this.detectCLITools();
        return await this.updateConfig({ cliTools: detectedTools });
    }

    /**
     * Get configuration value
     */
    async getConfigValue<K extends keyof RulebookConfig>(key: K): Promise<RulebookConfig[K]> {
        const config = await this.loadConfig();
        return config[key];
    }

    /**
     * Check if feature is enabled
     */
    async isFeatureEnabled(feature: keyof RulebookConfig['features']): Promise<boolean> {
        const config = await this.loadConfig();
        return config.features[feature];
    }

    /**
     * Get configuration summary
     */
    async getConfigSummary(): Promise<{
        version: string;
        projectId: string;
        enabledFeatures: string[];
        coverageThreshold: number;
        cliTools: string[];
    }> {
        const config = await this.loadConfig();

        const enabledFeatures = Object.entries(config.features)
            .filter(([, enabled]) => enabled)
            .map(([feature]) => feature);

        return {
            version: config.version,
            projectId: config.projectId,
            enabledFeatures,
            coverageThreshold: config.coverageThreshold,
            cliTools: config.cliTools,
        };
    }

    /**
     * Migrate old rulebook/ directory into .rulebook/
     * Moves rulebook/specs/ → .rulebook/specs/ and rulebook/tasks/ → .rulebook/tasks/
     * Then removes the now-empty rulebook/ directory
     */
    async migrateRulebookDirectory(): Promise<void> {
        const fsPromises = await import('fs/promises');
        const oldRulebookDir = join(this.projectRoot, 'rulebook');
        const newRulebookDir = join(this.projectRoot, '.rulebook');

        // Only migrate if old rulebook/ directory exists
        if (!existsSync(oldRulebookDir)) {
            return;
        }

        try {
            const stats = await fsPromises.stat(oldRulebookDir);
            if (!stats.isDirectory()) {
                return;
            }
        } catch {
            return;
        }

        try {
            // Ensure .rulebook directory exists
            await mkdir(newRulebookDir, { recursive: true });

            // Migrate specs/
            const oldSpecsDir = join(oldRulebookDir, 'specs');
            const newSpecsDir = join(newRulebookDir, 'specs');
            if (existsSync(oldSpecsDir)) {
                if (!existsSync(newSpecsDir)) {
                    await cp(oldSpecsDir, newSpecsDir, { recursive: true });
                }
                await rm(oldSpecsDir, { recursive: true, force: true });
            }

            // Migrate tasks/
            const oldTasksDir = join(oldRulebookDir, 'tasks');
            const newTasksDir = join(newRulebookDir, 'tasks');
            if (existsSync(oldTasksDir)) {
                if (!existsSync(newTasksDir)) {
                    await cp(oldTasksDir, newTasksDir, { recursive: true });
                }
                await rm(oldTasksDir, { recursive: true, force: true });
            }

            // Remove empty rulebook/ directory if it's now empty
            try {
                const remaining = await fsPromises.readdir(oldRulebookDir);
                if (remaining.length === 0) {
                    await rm(oldRulebookDir, { recursive: true, force: true });
                }
            } catch {
                // Ignore errors reading the directory
            }
        } catch (error) {
            console.warn(`Rulebook directory migration warning: ${error}`);
        }
    }

    /**
     * Migrate old directory structure to new consolidated structure
     * Moves .rulebook-memory/ to .rulebook/memory/ and .rulebook-ralph/ to .rulebook/ralph/
     */
    async migrateDirectoryStructure(projectRoot: string): Promise<void> {
        const fsPromises = await import('fs/promises');
        const { mkdir } = fsPromises;
        const oldMemoryDir = join(projectRoot, '.rulebook-memory');
        const oldRalphDir = join(projectRoot, '.rulebook-ralph');
        const newRulebookDir = join(projectRoot, '.rulebook');
        const newMemoryDir = join(newRulebookDir, 'memory');
        const newRalphDir = join(newRulebookDir, 'ralph');

        try {
            // Check if .rulebook exists
            if (existsSync(newRulebookDir)) {
                const stats = await fsPromises.stat(newRulebookDir);
                if (stats.isFile()) {
                    // Old .rulebook file exists, remove it
                    await fsPromises.rm(newRulebookDir, { force: true });
                } else if (stats.isDirectory()) {
                    // Already migrated to directory structure, skip migration
                    // Clean up accidental subdirectories and exit
                    const accidentalDir = join(newRulebookDir, '.rulebook');
                    if (existsSync(accidentalDir)) {
                        await fsPromises.rm(accidentalDir, { recursive: true, force: true });
                    }
                    return;
                }
            }

            // Create parent .rulebook directory if needed
            if (!existsSync(newRulebookDir)) {
                await mkdir(newRulebookDir, { recursive: true });
            }

            // Migrate memory directory if it exists (but not if it's already in new location)
            // Also prevent copying .rulebook into itself
            if (
                existsSync(oldMemoryDir) &&
                oldMemoryDir !== newMemoryDir &&
                !oldMemoryDir.includes(newRulebookDir)
            ) {
                if (!existsSync(newMemoryDir)) {
                    await cp(oldMemoryDir, newMemoryDir, { recursive: true });
                }
                // Remove old directory after successful copy
                await rm(oldMemoryDir, { recursive: true, force: true });
            }

            // Migrate ralph directory if it exists (but not if it's already in new location)
            // Also prevent copying .rulebook into itself
            if (
                existsSync(oldRalphDir) &&
                oldRalphDir !== newRalphDir &&
                !oldRalphDir.includes(newRulebookDir)
            ) {
                if (!existsSync(newRalphDir)) {
                    await cp(oldRalphDir, newRalphDir, { recursive: true });
                }
                // Remove old directory after successful copy
                await rm(oldRalphDir, { recursive: true, force: true });
            }

            // Clean up any accidental .rulebook/.rulebook directory
            const accidentalDir = join(newRulebookDir, '.rulebook');
            if (existsSync(accidentalDir)) {
                await rm(accidentalDir, { recursive: true, force: true });
            }
        } catch (error) {
            // Log error but don't fail - migration is non-critical
            // Still clean up accidental directories even if there's an error
            try {
                const accidentalDir = join(newRulebookDir, '.rulebook');
                if (existsSync(accidentalDir)) {
                    const fsP = await import('fs/promises');
                    await fsP.rm(accidentalDir, { recursive: true, force: true });
                }
            } catch {
                // Ignore cleanup errors
            }
            console.warn(`Directory migration warning: ${error}`);
        }
    }

    /**
     * Ensure .gitignore keeps rulebook's runtime data out of git while committing
     * everything a collaborator needs.
     *
     * `/.rulebook/*` ignores the directory wholesale, so every directory worth
     * sharing must be named as an exception. Project memory — decisions,
     * knowledge, learnings — and the task archive are shared knowledge, not
     * runtime state: without their exceptions they are written locally and never
     * reach anyone else. Negating a directory is enough; git then evaluates the
     * files inside it, so no `**` patterns are needed.
     *
     * Still ignored by the catch-all: backup/, logs/, telemetry/, handoff/, PID
     * files, STATE.md and PLANS.md.
     *
     * The block is rewritten from scratch on every call — lines from any past
     * release are stripped first — so an existing project picks up newly added
     * exceptions instead of being skipped by an "already correct" check.
     */
    async ensureGitignore(): Promise<void> {
        const gitignorePath = join(this.projectRoot, '.gitignore');

        try {
            const existing = existsSync(gitignorePath)
                ? await readFileAsync(gitignorePath, 'utf-8')
                : '';

            const kept = existing
                .split('\n')
                .filter((line) => !RULEBOOK_MANAGED_GITIGNORE_LINES.has(line.trim()));

            // Drop the blank lines the removal may have left dangling at the end.
            while (kept.length > 0 && kept[kept.length - 1].trim() === '') kept.pop();

            const rebuilt =
                (kept.length > 0 ? kept.join('\n') + '\n\n' : '') +
                RULEBOOK_GITIGNORE_BLOCK.join('\n') +
                '\n';

            if (rebuilt !== existing) {
                await writeFileAsync(gitignorePath, rebuilt);
            }
        } catch {
            // Non-critical, don't fail init
        }
    }
}

/**
 * Create a new ConfigManager instance
 */
export function createConfigManager(projectRoot: string): ConfigManager {
    return new ConfigManager(projectRoot);
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): RulebookConfig {
    const now = new Date().toISOString();
    const projectId = randomUUID();

    return {
        version: getPackageVersion(),
        installedAt: now,
        updatedAt: now,
        projectId,
        mode: 'full',
        features: {
            logging: true,
            gitHooks: false,
            templates: false,
            context: false,
            health: false,
            parallel: false,
            smartContinue: false,
        },
        coverageThreshold: 95,
        language: 'en',
        outputLanguage: 'en',
        cliTools: [],
        maxParallelTasks: 1,
        timeouts: {
            taskExecution: 300000,
            cliResponse: 60000,
            testRun: 120000,
        },
    };
}
