import path from 'path';
import { readFile } from '../../utils/file-system.js';

/**
 * Orchestration mode (v7.5, docs/analysis/multi-session-performance 07 C1).
 *
 * - `judgment` (default): the main session does small, local work itself and
 *   delegates when it pays (independent parts, broad exploration, long work,
 *   a large main context).
 * - `orchestrator` (opt-in): the v7.4 protocol — the main session delegates
 *   every task to a model-routed subagent.
 *
 * Templates carry both variants between line markers:
 *
 *     <!-- orchestration:judgment -->
 *     …judgment text…
 *     <!-- orchestration:orchestrator -->
 *     …orchestrator text…
 *     <!-- /orchestration -->
 *
 * {@link applyOrchestrationMode} keeps the active variant and drops the markers.
 */
export type OrchestrationMode = 'judgment' | 'orchestrator';

export const ORCHESTRATION_MODES: readonly OrchestrationMode[] = ['judgment', 'orchestrator'];
export const DEFAULT_ORCHESTRATION_MODE: OrchestrationMode = 'judgment';

const MODE_MARKER = /^\s*<!--\s*orchestration:(\w+)\s*-->\s*$/;
const MODE_END = /^\s*<!--\s*\/orchestration\s*-->\s*$/;

/** Any value other than a known mode (absent, typo, wrong type) → the default. */
export function normalizeOrchestrationMode(value: unknown): OrchestrationMode {
    return ORCHESTRATION_MODES.includes(value as OrchestrationMode)
        ? (value as OrchestrationMode)
        : DEFAULT_ORCHESTRATION_MODE;
}

/**
 * Read `orchestration` from `<rulebookDir>/rulebook.json` without going through
 * ConfigManager.loadConfig(), which writes a default config as a side effect.
 */
export async function readOrchestrationMode(
    projectRoot: string,
    rulebookDir = '.rulebook'
): Promise<OrchestrationMode> {
    try {
        const raw = await readFile(path.join(projectRoot, rulebookDir, 'rulebook.json'));
        return normalizeOrchestrationMode(JSON.parse(raw).orchestration);
    } catch {
        return DEFAULT_ORCHESTRATION_MODE;
    }
}

/** Keep the lines of the active mode's variants; drop the other mode and all markers. */
export function applyOrchestrationMode(template: string, mode: OrchestrationMode): string {
    const out: string[] = [];
    let active: string | null = null;
    for (const line of template.split('\n')) {
        const start = line.match(MODE_MARKER);
        if (start) {
            active = start[1];
            continue;
        }
        if (MODE_END.test(line)) {
            active = null;
            continue;
        }
        if (active === null || active === mode) out.push(line);
    }
    return out.join('\n');
}
