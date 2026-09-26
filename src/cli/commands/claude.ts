/**
 * `rulebook claude` — apply the recommended Claude Code setup for this project.
 *
 * Idempotent and non-interactive: installs MCP + skills + agents + workflows
 * via setupClaudeCodeIntegration, then layers the opinionated, quality- and
 * cost-aware settings (full-autonomy permissions, statusLine,
 * default model) onto .claude/settings.json. Prints a summary of what changed.
 */

import chalk from 'chalk';
import { setupClaudeCodeIntegration } from '../../core/claude/claude-mcp.js';
import { applyClaudeSettings } from '../../core/claude/claude-settings-manager.js';

/**
 * Model written to .claude/settings.json (`model`) when none is set.
 * v7.4 routing: Opus handles day-to-day edits, tests, and docs; Fable is
 * reserved for architecture / complex bugs / review and Haiku for research,
 * both chosen per agent rather than as the session default.
 */
export const DEFAULT_CLAUDE_MODEL = 'opus';

export interface ClaudeSetupOptions {
    /** Cost-aware default model written to settings.json when none is set. */
    model?: string;
    /** `--typesafe` → true, `--no-typesafe` → false (opt out), neither → undefined. */
    typesafe?: boolean;
}

/**
 * `rulebook claude` / `rulebook claude setup`.
 */
export async function claudeSetupCommand(options: ClaudeSetupOptions = {}): Promise<void> {
    const cwd = process.cwd();
    const defaultModel = options.model ?? DEFAULT_CLAUDE_MODEL;

    try {
        const result = await setupClaudeCodeIntegration(cwd);

        if (!result.detected) {
            console.log(
                chalk.yellow('⚠ Claude Code not detected (no ~/.claude). Nothing applied.')
            );
            console.log(chalk.gray('  Install Claude Code, then re-run "rulebook claude".'));
            return;
        }

        // v7: exactly one optional path-only guard + the full-autonomy
        // permission profile. No hooks on Stop/UserPromptSubmit/SessionStart,
        // no orchestration enforcement (P0). Stale v5/v6 entries self-heal on
        // sync via LEGACY_SIGNATURES.
        await applyClaudeSettings(cwd, {
            taskScaffoldingGuard: true,
            osSchedulingGuard: true,
            fullAutonomyPermissions: true,
            statusLine: true,
            defaultModel,
        });

        // TypeSafe (Jev) — offered by default since v7.4; --no-typesafe opts out;
        // a stored answer is honoured.
        try {
            const { createConfigManager } = await import('../../core/state/config-manager.js');
            const { decideTypesafe, applyTypesafe } = await import('./typesafe.js');
            const decision = await decideTypesafe(createConfigManager(cwd), {
                flag: options.typesafe,
            });
            if (decision.enabled) {
                console.log(chalk.bold('\nTypeSafe (Jev) integration'));
                await applyTypesafe(cwd);
            }
        } catch (err) {
            console.log(
                chalk.gray(
                    `  · TypeSafe setup skipped: ${err instanceof Error ? err.message : String(err)}`
                )
            );
        }

        console.log(chalk.green('\n✅ Claude Code setup applied'));
        if (result.mcpConfigured) console.log(chalk.gray('  • MCP server configured in .mcp.json'));
        if (result.skillsInstalled.length)
            console.log(
                chalk.gray(`  • ${result.skillsInstalled.length} skills → .claude/commands/`)
            );
        if (result.devSkillsInstalled.length)
            console.log(
                chalk.gray(`  • ${result.devSkillsInstalled.length} dev skills → .claude/skills/`)
            );
        if (result.agentDefinitionsInstalled.length)
            console.log(
                chalk.gray(
                    `  • ${result.agentDefinitionsInstalled.length} agents → .claude/agents/`
                )
            );
        if (result.workflowDefinitionsInstalled.length)
            console.log(
                chalk.gray(
                    `  • ${result.workflowDefinitionsInstalled.length} workflows → .claude/workflows/`
                )
            );
        console.log(chalk.gray('  • settings.json: hooks, safe permissions allowlist, statusLine'));
        console.log(
            chalk.gray(
                `  • settings.json: default model "${defaultModel}", full-autonomy permissions`
            )
        );
        console.log(chalk.gray('\nRestart Claude Code to load the updated configuration.'));
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(chalk.red(`\n❌ Failed to apply Claude Code setup: ${message}`));
        process.exit(1);
    }
}
