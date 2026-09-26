import chalk from 'chalk';
import type { ConfigManager } from '../../core/state/config-manager.js';
import {
    setupTypesafeIntegration,
    removeTypesafeRule,
    typesafeTokenInstructions,
    TYPESAFE_PLUGIN_ID,
    type TypesafeSetupResult,
} from '../../core/claude/typesafe-integration.js';

/**
 * Shared CLI plumbing for the TypeSafe integration, used by `rulebook init`,
 * `rulebook update` and `rulebook claude`. On by default since v7.4; never
 * prompts.
 *
 * Decision flow, identical in every command:
 *   --typesafe             → enable (persisted)
 *   --no-typesafe          → disable (persisted)
 *   answer already stored  → honour it (a stored "no" stays "no")
 *   otherwise              → enable and persist
 */

export interface TypesafeDecisionInput {
    /** `--typesafe` → true, `--no-typesafe` → false, neither → undefined. */
    flag?: boolean;
}

export async function decideTypesafe(
    configManager: ConfigManager,
    input: TypesafeDecisionInput
): Promise<{ enabled: boolean; asked: boolean }> {
    const config = await configManager.loadConfig();
    const stored = config?.integrations?.typesafe;

    if (input.flag === true) {
        if (stored?.enabled !== true) await persistTypesafeAnswer(configManager, true);
        return { enabled: true, asked: false };
    }
    if (input.flag === false) {
        if (stored?.enabled !== false) await persistTypesafeAnswer(configManager, false);
        return { enabled: false, asked: false };
    }
    if (stored && typeof stored.enabled === 'boolean') {
        return { enabled: stored.enabled, asked: false };
    }
    await persistTypesafeAnswer(configManager, true);
    return { enabled: true, asked: false };
}

export async function persistTypesafeAnswer(
    configManager: ConfigManager,
    enabled: boolean
): Promise<void> {
    const config = await configManager.loadConfig();
    await configManager.updateConfig({
        integrations: {
            ...(config?.integrations ?? {}),
            typesafe: { enabled, askedAt: new Date().toISOString() },
        },
    });
}

/**
 * Apply the integration for an enabled project and print what happened.
 * Never throws: a failed plugin install is reported with the manual command.
 */
export async function applyTypesafe(projectRoot: string): Promise<TypesafeSetupResult> {
    const result = await setupTypesafeIntegration(projectRoot);
    reportTypesafe(result);
    return result;
}

export function reportTypesafe(result: TypesafeSetupResult): void {
    // Common case: plugin already there, key found — one line.
    if (result.installed && !result.installedNow && result.tokenPresent) {
        console.log(
            chalk.gray(`  • TypeSafe ready (${TYPESAFE_PLUGIN_ID}, rule refreshed, key found)`)
        );
        return;
    }
    if (result.installedNow) {
        console.log(chalk.green(`  • TypeSafe plugin installed (${TYPESAFE_PLUGIN_ID})`));
    } else if (result.installed) {
        console.log(chalk.gray(`  • TypeSafe plugin already installed (${TYPESAFE_PLUGIN_ID})`));
    }
    if (result.installError) {
        console.log(chalk.yellow(`  ! ${result.installError}`));
    }
    console.log(chalk.gray('  • .claude/rules/typesafe.md written (agent knows Jev is available)'));
    if (!result.tokenPresent) {
        console.log('');
        for (const line of typesafeTokenInstructions()) console.log(chalk.yellow(line));
    }
}

/**
 * The init/update step. TypeSafe ships as a Claude Code plugin, so without
 * Claude Code nothing is decided, persisted, or installed.
 */
export async function runTypesafeStep(
    configManager: ConfigManager,
    projectRoot: string,
    opts: { flag?: boolean; claudeDetected: boolean; retireWhenDisabled?: boolean }
): Promise<'skipped' | 'enabled' | 'disabled'> {
    if (!opts.claudeDetected) {
        console.log(chalk.gray('  · TypeSafe skipped: Claude Code not detected'));
        return 'skipped';
    }
    const decision = await decideTypesafe(configManager, { flag: opts.flag });
    if (decision.enabled) {
        console.log(chalk.bold('\nTypeSafe (Jev) integration'));
        await applyTypesafe(projectRoot);
        return 'enabled';
    }
    // Opted out: the Jev prompt hook and tool gate have nothing to call any more.
    const { removeJevPromptGate } = await import('../../core/claude/claude-settings-manager.js');
    if (await removeJevPromptGate(projectRoot)) {
        console.log(chalk.gray('  • Jev gate hooks removed from .claude/settings.json'));
    }
    if (opts.retireWhenDisabled) await retireTypesafe(projectRoot);
    return 'disabled';
}

/** Disabled after having been enabled: drop the rulebook-owned rule file. */
export async function retireTypesafe(projectRoot: string): Promise<void> {
    if (await removeTypesafeRule(projectRoot)) {
        console.log(chalk.gray('  • .claude/rules/typesafe.md removed (TypeSafe disabled)'));
    }
}
