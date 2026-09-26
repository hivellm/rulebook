import type { RulebookConfig } from '../../types.js';
import { GATE_DEADLINE_MS, GATE_THRESHOLDS, sliceUtf8, type GateResult } from './gate.js';

/**
 * Jev prompt hook (v7.4): turns a gate result into the answer of a Claude
 * Code `UserPromptSubmit` hook (`rulebook hook prompt-gate`). The routing
 * reaches the model as `additionalContext`, so it no longer has to remember
 * to call `rulebook_gate`. Only one case blocks the prompt: a high-confidence
 * request for OS-level scheduling, which rulebook never allows (Tier 1).
 * Destructive git and secrets never block here — the operator's own prompt
 * is the authorization — they become warning lines. An unavailable gate
 * produces no answer at all (fail-open).
 */

export interface PromptHookConfig {
    enabled: boolean;
    /** Deadline for the whole gate call inside the hook. */
    deadlineMs: number;
    /** `risk_os_scheduling` probability at or above this blocks the prompt. */
    blockThreshold: number;
}

export const PROMPT_HOOK_DEFAULTS = {
    deadlineMs: 5_000,
    blockThreshold: 0.9,
} as const;

export const PROMPT_HOOK_LIMITS = {
    deadlineMs: { min: 1_000, max: GATE_DEADLINE_MS },
    blockThreshold: { min: 0.5, max: 1 },
} as const;

/** Upper bound on the injected context, in UTF-8 bytes. */
export const PROMPT_HOOK_CONTEXT_MAX_BYTES = 1024;

export const PROMPT_HOOK_HEADER =
    'Jev routing (rulebook prompt hook) — do not call rulebook_gate again for this prompt';

/** Extra seconds between the hook's own deadline and Claude Code's `timeout` (CLI start-up). */
const TIMEOUT_MARGIN_SEC = 3;

function clamp(value: unknown, fallback: number, range: { min: number; max: number }): number {
    const n = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return Math.min(range.max, Math.max(range.min, n));
}

/**
 * `gate.promptHook` with defaults applied and values clamped. The hook is on
 * unless it is turned off explicitly, and always off when the operator opted
 * out of TypeSafe (`integrations.typesafe.enabled: false`).
 */
export function resolvePromptHookConfig(
    config: Partial<RulebookConfig> | null | undefined
): PromptHookConfig {
    const raw = config?.gate?.promptHook ?? {};
    return {
        enabled: config?.integrations?.typesafe?.enabled !== false && raw.enabled !== false,
        deadlineMs: Math.round(
            clamp(raw.deadlineMs, PROMPT_HOOK_DEFAULTS.deadlineMs, PROMPT_HOOK_LIMITS.deadlineMs)
        ),
        blockThreshold: clamp(
            raw.blockThreshold,
            PROMPT_HOOK_DEFAULTS.blockThreshold,
            PROMPT_HOOK_LIMITS.blockThreshold
        ),
    };
}

/** The settings.json `timeout` (seconds) for a hook deadline: always longer than the deadline. */
export function promptHookTimeoutSec(deadlineMs: number): number {
    return Math.ceil(deadlineMs / 1000) + TIMEOUT_MARGIN_SEC;
}

export type PromptHookAnswer =
    | { kind: 'context'; additionalContext: string }
    | { kind: 'block'; reason: string }
    | { kind: 'none' };

/** Noul probability for `id`, or 0 when Jev did not answer it. */
function riskProbability(result: GateResult, id: string): number {
    const d = result.decisions.find((x) => x.id === id && x.primitive === 'noul');
    return d && d.answer !== null ? d.probability : 0;
}

function pct(p: number): string {
    return p.toFixed(2);
}

/** One warning line per risk at or above the risk threshold (0.5) that does not block. */
function warningLines(result: GateResult): string[] {
    const lines: string[] = [];
    const git = riskProbability(result, 'risk_destructive_git');
    if (git >= GATE_THRESHOLDS.risk) {
        lines.push(
            `Warning: destructive git (p=${pct(git)}) — CLAUDE.md "Git safety" applies: run only the exact operation the operator asked for, nothing broader.`
        );
    }
    const sched = riskProbability(result, 'risk_os_scheduling');
    if (sched >= GATE_THRESHOLDS.risk) {
        lines.push(
            `Warning: OS-level scheduling (p=${pct(sched)}) — never cron, systemd timers, launchd or schtasks; scheduling lives in the application.`
        );
    }
    const secrets = riskProbability(result, 'risk_secrets');
    if (secrets >= GATE_THRESHOLDS.risk) {
        lines.push(
            `Warning: secrets (p=${pct(secrets)}) — never read, print, log or commit key values; keep them in the environment or an untracked .env.`
        );
    }
    return lines;
}

/** Header + instruction + warnings, with the instruction clipped so the whole fits the byte cap. */
function buildContext(instruction: string, warnings: string[]): string {
    const max = PROMPT_HOOK_CONTEXT_MAX_BYTES;
    const fixed = [PROMPT_HOOK_HEADER, ...warnings].join('\n');
    // Inserting the instruction adds one newline to `fixed`.
    const room = max - Buffer.byteLength(fixed) - 1;
    let body = instruction;
    if (Buffer.byteLength(body) > room) {
        body = room > 3 ? sliceUtf8(body, room - 3) + '…' : '';
    }
    const text = [PROMPT_HOOK_HEADER, body, ...warnings].filter(Boolean).join('\n');
    return sliceUtf8(text, max);
}

/**
 * Map a gate result to the hook's answer: `block` only for an available gate
 * whose `risk_os_scheduling` is at or above `blockThreshold`; otherwise the
 * routing as `context`; `none` when the gate was unavailable.
 */
export function promptHookAnswer(
    result: GateResult,
    cfg: Pick<PromptHookConfig, 'blockThreshold'>
): PromptHookAnswer {
    if (!result.available) return { kind: 'none' };

    const sched = riskProbability(result, 'risk_os_scheduling');
    if (sched >= cfg.blockThreshold) {
        return {
            kind: 'block',
            reason:
                `Blocked by the rulebook prompt hook: this prompt asks for OS-level scheduling ` +
                `(cron, systemd timers, launchd, schtasks; Jev p=${pct(sched)}), which rulebook ` +
                `never allows (Tier 1). Scheduling lives in the application — a job runner or ` +
                `scheduler library inside the app. If Jev misread the prompt, rephrase it, or turn ` +
                `the hook off with "gate": {"promptHook": {"enabled": false}} in ` +
                `.rulebook/rulebook.json (gate.promptHook.enabled).`,
        };
    }

    return {
        kind: 'context',
        additionalContext: buildContext(result.instruction, warningLines(result)),
    };
}
