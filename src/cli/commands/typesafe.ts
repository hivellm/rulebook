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
 * Shared CLI plumbing for the TypeSafe integration (v7.3), used by
 * `rulebook init`, `rulebook update` and `rulebook claude`.
 *
 * Decision flow, identical in every command:
 *   --typesafe flag        → enable, no question
 *   answer already stored  → honour it, no question
 *   interactive terminal   → ask once (default no), store the answer
 *   otherwise              → leave as is (never enable silently)
 */

export interface TypesafeDecisionInput {
    /** `--typesafe` given on the command line. */
    flag?: boolean;
    /** Interactive terminal and not `--yes`. */
    interactive: boolean;
}

export async function decideTypesafe(
    configManager: ConfigManager,
    input: TypesafeDecisionInput
): Promise<{ enabled: boolean; asked: boolean }> {
    const config = await configManager.loadConfig();
    const stored = config?.integrations?.typesafe;

    if (input.flag) {
        if (!stored?.enabled) await persistTypesafeAnswer(configManager, true);
        return { enabled: true, asked: false };
    }
    if (stored && typeof stored.enabled === 'boolean') {
        return { enabled: stored.enabled, asked: false };
    }
    if (!input.interactive) {
        return { enabled: false, asked: false };
    }

    const inquirer = (await import('inquirer')).default;
    const { enable } = await inquirer.prompt<{ enable: boolean }>([
        {
            type: 'confirm',
            name: 'enable',
            message:
                'Enable TypeSafe (Jev) for this project? Installs the Claude Code plugin and needs a TYPESAFE_API_KEY',
            default: false,
        },
    ]);
    await persistTypesafeAnswer(configManager, enable);
    return { enabled: enable, asked: true };
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

/** Disabled after having been enabled: drop the rulebook-owned rule file. */
export async function retireTypesafe(projectRoot: string): Promise<void> {
    if (await removeTypesafeRule(projectRoot)) {
        console.log(chalk.gray('  • .claude/rules/typesafe.md removed (TypeSafe disabled)'));
    }
}
