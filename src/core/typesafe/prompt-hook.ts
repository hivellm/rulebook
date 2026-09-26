import type { RulebookConfig } from '../../types.js';
import {
    GATE_DEADLINE_MS,
    GATE_THRESHOLDS,
    OFF_TOPIC_SENTENCE,
    sliceUtf8,
    type GateResult,
} from './gate.js';

/**
 * Jev prompt hook (v7.4): turns a gate result into the answer of a Claude
 * Code `UserPromptSubmit` hook (`rulebook hook prompt-gate`). The routing
 * reaches the model as `additionalContext`, so it no longer has to remember
 * to call `rulebook_gate`. One case always blocks the prompt: a
 * high-confidence request for OS-level scheduling, which rulebook never
 * allows (Tier 1). An off-topic prompt (`in_project_scope` at or below
 * `gate.scope.offTopicBelow`) asks the model to confirm with the operator,
 * or blocks when the project sets `gate.scope.onOffTopic: "block"`.
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

export type OffTopicAction = 'ask' | 'block';

/** `gate.scope` as the hook applies it. */
export interface ScopeConfig {
    /** `in_project_scope` probability at or below this → `onOffTopic`. */
    offTopicBelow: number;
    onOffTopic: OffTopicAction;
}

export const PROMPT_HOOK_DEFAULTS = {
    deadlineMs: 5_000,
    blockThreshold: 0.9,
    offTopicBelow: 0.15,
    onOffTopic: 'ask',
} as const;

export const PROMPT_HOOK_LIMITS = {
    deadlineMs: { min: 1_000, max: GATE_DEADLINE_MS },
    blockThreshold: { min: 0.5, max: 1 },
    offTopicBelow: { min: 0, max: GATE_THRESHOLDS.noulFalse },
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

/** `gate.scope` with defaults applied: `offTopicBelow` clamped to 0–0.3, `onOffTopic` ask unless "block". */
export function resolveScopeConfig(
    config: Partial<RulebookConfig> | null | undefined
): ScopeConfig {
    const raw = config?.gate?.scope ?? {};
    return {
        offTopicBelow: clamp(
            raw.offTopicBelow,
            PROMPT_HOOK_DEFAULTS.offTopicBelow,
            PROMPT_HOOK_LIMITS.offTopicBelow
        ),
        onOffTopic: raw.onOffTopic === 'block' ? 'block' : PROMPT_HOOK_DEFAULTS.onOffTopic,
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

/**
 * [lead] + header + instruction + warnings, with the instruction clipped so
 * the whole fits the byte cap. `lead` (the off-topic confirm line) comes first.
 */
function buildContext(instruction: string, warnings: string[], lead?: string): string {
    const max = PROMPT_HOOK_CONTEXT_MAX_BYTES;
    const head = lead ? [lead, PROMPT_HOOK_HEADER] : [PROMPT_HOOK_HEADER];
    const fixed = [...head, ...warnings].join('\n');
    // Inserting the instruction adds one newline to `fixed`.
    const room = max - Buffer.byteLength(fixed) - 1;
    let body = instruction;
    if (Buffer.byteLength(body) > room) {
        body = room > 3 ? sliceUtf8(body, room - 3) + '…' : '';
    }
    const text = [...head, body, ...warnings].filter(Boolean).join('\n');
    return sliceUtf8(text, max);
}

/** `in_project_scope` probability when Jev found the prompt off-topic (≤ 0.3), else null. */
function offTopicProbability(result: GateResult): number | null {
    if (result.routing.inProjectScope !== false) return null;
    const d = result.decisions.find((x) => x.id === 'in_project_scope' && x.primitive === 'noul');
    return d ? d.probability : null;
}

/** The description as quoted in the scope lines: its first 80 characters. */
function quoteProject(description: string): string {
    return `"${description.length > 80 ? description.slice(0, 80) + '…' : description}"`;
}

/**
 * Map a gate result to the hook's answer: `block` for an available gate whose
 * `risk_os_scheduling` is at or above `blockThreshold`; then, when `scope` is
 * given (the project has a description), an off-topic prompt
 * (`in_project_scope` ≤ `offTopicBelow`) blocks under `onOffTopic: "block"`
 * or gets a leading confirm line under `ask`, and a borderline one (up to
 * 0.3) a warning line; otherwise the routing as `context`; `none` when the
 * gate was unavailable.
 */
export function promptHookAnswer(
    result: GateResult,
    cfg: Pick<PromptHookConfig, 'blockThreshold'>,
    scope?: ScopeConfig & { description: string }
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

    const warnings = warningLines(result);
    const offTopic = scope ? offTopicProbability(result) : null;
    if (!scope || offTopic === null) {
        return { kind: 'context', additionalContext: buildContext(result.instruction, warnings) };
    }

    // The hook applies its own scope action instead of the gate's generic sentence.
    const instruction = result.instruction.replace(' ' + OFF_TOPIC_SENTENCE, '');
    const project = quoteProject(scope.description);
    if (offTopic > scope.offTopicBelow) {
        warnings.push(
            `Warning: possibly off-topic for this project ${project} (in_project_scope p=${pct(offTopic)}) — make sure the prompt concerns this project before acting.`
        );
        return { kind: 'context', additionalContext: buildContext(instruction, warnings) };
    }
    if (scope.onOffTopic === 'block') {
        return {
            kind: 'block',
            reason:
                `Blocked by the rulebook prompt hook: this prompt looks unrelated to this project ` +
                `${project} (Jev in_project_scope p=${pct(offTopic)}). If it is about this ` +
                `project, rephrase it to say how; to confirm instead of block, set "gate": ` +
                `{"scope": {"onOffTopic": "ask"}} in .rulebook/rulebook.json (gate.scope.onOffTopic).`,
        };
    }
    return {
        kind: 'context',
        additionalContext: buildContext(
            instruction,
            warnings,
            `Confirm with the operator before acting: this prompt looks unrelated to this project ${project} (Jev in_project_scope p=${pct(offTopic)}).`
        ),
    };
}
