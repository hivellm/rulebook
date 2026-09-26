import { typesafeTokenInstructions } from '../../core/claude/typesafe-integration.js';
import {
    redact,
    resolveTypesafeKey,
    systemOne,
    TypesafeError,
} from '../../core/typesafe/client.js';
import {
    GATE_DEADLINE_MS,
    isGateDisabled,
    runGate,
    type GateReason,
    type GateResult,
} from '../../core/typesafe/gate.js';

/**
 * `rulebook gate "<prompt>"` — the Jev entry gate from the terminal (v7.4),
 * and `rulebook gate --check` — is the key there and does one live call work.
 * Advisory like the MCP tool: exit 0 even when the gate is unavailable,
 * except `--check --strict`, which exits 2 so scripts can gate on it.
 */

export interface GateCommandOptions {
    notes?: string;
    json?: boolean;
    check?: boolean;
    strict?: boolean;
    /** Injection points (tests). */
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    fetch?: typeof fetch;
    log?: (line: string) => void;
}

export interface GateCheckResult {
    available: boolean;
    reason?: GateReason;
    detail?: string;
    keySource: 'env' | '.env' | null;
    model?: string;
    latencyMs?: number;
    usage?: { input_tokens: number; output_tokens: number };
}

/** One cheap live call: a one-word state and a single Noul question. */
export async function runGateCheck(
    cwd: string,
    env: NodeJS.ProcessEnv,
    fetchImpl?: typeof fetch
): Promise<GateCheckResult> {
    if (isGateDisabled(env)) return { available: false, reason: 'disabled', keySource: null };
    const { key, source } = await resolveTypesafeKey(cwd, env);
    if (!key) return { available: false, reason: 'no-key', keySource: null };
    const t0 = Date.now();
    try {
        const res = await systemOne(
            {
                state: 'ping',
                model: 'jev-latest',
                questions: { ping: { type: 'noul', instructions: 'Is `state` the word ping?' } },
            },
            { apiKey: key, fetch: fetchImpl, deadlineMs: GATE_DEADLINE_MS }
        );
        return {
            available: true,
            keySource: source,
            model: res.model,
            latencyMs: Date.now() - t0,
            usage: res.usage,
        };
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
            available: false,
            reason: error instanceof TypesafeError ? error.kind : 'bad-response',
            detail: redact(msg.split(key).join('***')),
            keySource: source,
            latencyMs: Date.now() - t0,
        };
    }
}

function yn(v: boolean | null): string {
    return v === null ? 'undecided' : v ? 'yes' : 'no';
}

function renderResult(r: GateResult, log: (line: string) => void): void {
    const head = r.available
        ? `Jev gate — available (${r.model ?? 'jev'}, ${r.elapsedMs} ms, state ${r.stateBytes} B)`
        : `Jev gate — unavailable (${r.reason}${r.detail ? `: ${r.detail}` : ''})`;
    log(head);
    if (r.available) {
        const rt = r.routing;
        const risks = [
            rt.risk.destructiveGit && 'destructive git',
            rt.risk.osScheduling && 'OS scheduling',
            rt.risk.secrets && 'secrets',
        ].filter(Boolean);
        const rows: Array<[string, string]> = [
            ['kind', rt.kind ?? 'undecided'],
            [
                'needs task',
                yn(rt.needsTask) + (rt.existingTaskId ? ` (existing: ${rt.existingTaskId})` : ''),
            ],
            ['model', rt.model ?? 'undecided'],
            ['agent', rt.agentType ?? '—'],
            ['skill', rt.skill ?? '—'],
            ['parallel', yn(rt.parallel)],
            ['operator decision', yn(rt.needsOperatorDecision)],
            ['risk', risks.length > 0 ? risks.join(', ') : 'none'],
            ['undecided', r.undecided.length > 0 ? r.undecided.join(', ') : '—'],
        ];
        for (const [label, value] of rows) log(`  ${label.padEnd(18)} ${value}`);
        if (r.usage)
            log(
                `  ${'usage'.padEnd(18)} ${r.usage.input_tokens} in / ${r.usage.output_tokens} out`
            );
    }
    for (const line of r.instructions ?? []) log(line);
    log(`→ ${r.instruction}`);
}

/** Returns the process exit code. */
export async function gateCommand(
    prompt: string | undefined,
    options: GateCommandOptions = {}
): Promise<number> {
    const cwd = options.cwd ?? process.cwd();
    const env = options.env ?? process.env;
    const log = options.log ?? ((line: string) => console.log(line));

    if (options.check) {
        const c = await runGateCheck(cwd, env, options.fetch);
        if (options.json) {
            log(JSON.stringify(c, null, 2));
        } else {
            log(`TYPESAFE_API_KEY  ${c.keySource ? `found (${c.keySource})` : 'not found'}`);
            if (c.available) {
                log(
                    `Jev               available (${c.model}, ${c.latencyMs} ms, ` +
                        `${c.usage?.input_tokens ?? 0} in / ${c.usage?.output_tokens ?? 0} out)`
                );
            } else {
                log(
                    `Jev               unavailable (${c.reason}${c.detail ? `: ${c.detail}` : ''})`
                );
                if (c.reason === 'no-key')
                    for (const line of typesafeTokenInstructions()) log(line);
            }
        }
        return !c.available && options.strict ? 2 : 0;
    }

    if (!prompt?.trim()) {
        log('Usage: rulebook gate "<prompt>" [--notes <text>] [--json] | rulebook gate --check');
        return 1;
    }

    const result = await runGate({
        projectRoot: cwd,
        prompt,
        notes: options.notes,
        env,
        fetch: options.fetch,
        alwaysShowInstructions: true,
        source: 'cli',
    });
    if (options.json) log(JSON.stringify(result, null, 2));
    else renderResult(result, log);
    return 0;
}
