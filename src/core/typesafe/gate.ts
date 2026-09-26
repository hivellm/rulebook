import { createHash } from 'crypto';
import { existsSync } from 'fs';
import { appendFile, mkdir, readdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import type { RulebookConfig } from '../../types.js';
import { typesafeTokenInstructions } from '../claude/typesafe-integration.js';
import {
    resolveTypesafeKey,
    redact,
    systemOne,
    TypesafeError,
    type Answer,
    type Question,
    type SystemOneResponse,
} from './client.js';

/**
 * Jev entry gate (v7.4). The main session sends every operator prompt here
 * before planning; rulebook describes the project to Jev (TypeSafe System
 * One), asks one question per decision the session would otherwise guess,
 * and returns a `routing` to act on. Advisory: it never throws and never
 * blocks — without a key, a network, or when disabled it says so and the
 * CLAUDE.md Orchestration rules apply. The only blocking paths are the prompt
 * hook's high-confidence OS-scheduling rule and its opt-in off-topic rule
 * (`gate.scope.onOffTopic: "block"`, prompt-hook.ts).
 */

export const AGENT_TYPES = [
    'implementer',
    'tester',
    'docs-writer',
    'researcher',
    'architect',
    'code-reviewer',
    'security-reviewer',
    'build-engineer',
] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

/** The v7.4 model routing table, sent to Jev verbatim. */
export const ROUTING_TABLE = {
    fable: 'architecture, complex bugs, code review',
    opus: 'edits, tests, docs, refactors — default for simple work',
    haiku: 'research, summaries',
} as const;
export type GateModel = keyof typeof ROUTING_TABLE;

export const GATE_THRESHOLDS = {
    /** Choice `confidence` at or above → decided (n-aware by construction). */
    choiceConfidence: 0.6,
    /** Noul at or above → true. */
    noulTrue: 0.7,
    /** Noul at or below → false; between the two → undecided. */
    noulFalse: 0.3,
    /** Risk flags: at or above → true; never undecided. */
    risk: 0.5,
} as const;

/** Whole gate budget, kept under the MCP server's 10 s handler guard. */
export const GATE_DEADLINE_MS = 8_500;
/** Bound on reading the task list (a GitHub backend shells out to `gh`). */
const SOURCE_TIMEOUT_MS = 2_500;

export const STATE_CAPS = {
    prompt: 4096,
    promptTrimmed: 2048,
    notes: 1024,
    tasks: 15,
    tasksTrimmed: 8,
    taskTitle: 60,
    openQuestions: 5,
    openQuestionsTrimmed: 2,
    question: 160,
    skillCandidates: 5,
    candidateTitle: 80,
    skills: 20,
    skillsTrimmed: 10,
    description: 400,
    descriptionTrimmed: 200,
    softBytes: 6656,
    hardBytes: 8192,
} as const;

export const TRUNCATION_MARKER = '\n[…truncated by rulebook]';

export type GateKind =
    | 'small-fix'
    | 'task-work'
    | 'question-or-analysis'
    | 'answer-to-open-question'
    | 'setup-or-config'
    | 'unclear';

export type GateReason = 'no-key' | 'disabled' | 'timeout' | 'http' | 'network' | 'bad-response';

export interface GateDecision {
    id: string;
    primitive: 'choice' | 'noul';
    answer: string | boolean | null;
    probability: number;
    confidence?: number;
    decided: boolean;
}

export interface GateRouting {
    kind: GateKind | null;
    needsTask: boolean | null;
    existingTaskId: string | null;
    model: GateModel | null;
    agentType: AgentType | null;
    skill: string | null;
    parallel: boolean | null;
    needsOperatorDecision: boolean | null;
    /** `in_project_scope`; null when undecided or not asked (no project description). */
    inProjectScope: boolean | null;
    risk: { destructiveGit: boolean; osScheduling: boolean; secrets: boolean };
}

export interface GateResult {
    available: boolean;
    reason?: GateReason;
    /** Redacted error detail when the call failed. */
    detail?: string;
    /** How to provide the key — once per process (MCP), always on the CLI. */
    instructions?: string[];
    model?: string;
    decisions: GateDecision[];
    routing: GateRouting;
    undecided: string[];
    instruction: string;
    elapsedMs: number;
    stateBytes: number;
    usage?: { input_tokens: number; output_tokens: number };
}

// ── State ────────────────────────────────────────────────────────────────

interface TaskLike {
    id: string;
    title: string;
    status: string;
    questions?: ReadonlyArray<{ id: string; question: string; status: string }>;
}

export interface GateSources {
    config: Partial<RulebookConfig> | null;
    tasks: TaskLike[];
    skillCandidates: Array<{ id: string; title: string; occurrences?: number }>;
    /** Directory names under `.claude/skills/` (promoted skills). */
    promotedSkills: string[];
    /** One-line project description for the scope question (resolveProjectDescription). */
    projectDescription?: string | null;
}

export interface GateState {
    project: {
        id?: string;
        description?: string;
        version?: string;
        languages?: string[];
        agentsMode?: string;
        tasksBackend: string;
    };
    tasks: {
        active: { id: string; status: string } | null;
        list: Array<{ id: string; title: string; status: string }>;
    };
    openQuestions: Array<{ taskId: string; id: string; question: string }>;
    skillCandidates: Array<{ id: string; title: string; occurrences: number }>;
    skills: string[];
    agents: string[];
    routing: typeof ROUTING_TABLE;
    prompt: string;
    notes?: string;
}

function clip(text: string, max: number): string {
    return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

function truncatePrompt(prompt: string, max: number): string {
    return prompt.length > max ? prompt.slice(0, max) + TRUNCATION_MARKER : prompt;
}

/** Cut `text` to at most `maxBytes` UTF-8 bytes without splitting a code point. */
export function sliceUtf8(text: string, maxBytes: number): string {
    const buf = Buffer.from(text, 'utf8');
    if (buf.length <= maxBytes) return text;
    let end = Math.max(0, maxBytes);
    while (end > 0 && (buf[end] & 0xc0) === 0x80) end--;
    return buf.subarray(0, end).toString('utf8');
}

export function stateBytes(state: GateState): number {
    return Buffer.byteLength(JSON.stringify(state));
}

const STATUS_ORDER: Record<string, number> = { 'in-progress': 0, blocked: 1, pending: 2 };

/**
 * The JSON state Jev sees. Capped per field, then trimmed in a fixed order
 * (notes → skills → task list → skill candidates → open questions →
 * description → prompt) while it is over the soft budget.
 */
export function buildGateState(sources: GateSources, prompt: string, notes?: string): GateState {
    const cfg = sources.config ?? {};
    const tasks = [...sources.tasks].sort(
        (a, b) => (STATUS_ORDER[a.status] ?? 3) - (STATUS_ORDER[b.status] ?? 3)
    );
    const active = tasks.find((t) => t.status === 'in-progress');
    const skills = [...new Set([...(cfg.skills?.enabled ?? []), ...sources.promotedSkills])];

    const state: GateState = {
        project: {
            id: cfg.projectId,
            ...(sources.projectDescription
                ? { description: clip(sources.projectDescription, STATE_CAPS.description) }
                : {}),
            version: cfg.version,
            languages: cfg.languages,
            agentsMode: cfg.agentsMode,
            tasksBackend: cfg.tasks?.backend ?? 'files',
        },
        tasks: {
            active: active ? { id: active.id, status: active.status } : null,
            list: tasks.slice(0, STATE_CAPS.tasks).map((t) => ({
                id: t.id,
                title: clip(t.title, STATE_CAPS.taskTitle),
                status: t.status,
            })),
        },
        openQuestions: tasks
            .flatMap((t) =>
                (t.questions ?? [])
                    .filter((q) => q.status === 'open')
                    .map((q) => ({
                        taskId: t.id,
                        id: q.id,
                        question: clip(q.question, STATE_CAPS.question),
                    }))
            )
            .slice(0, STATE_CAPS.openQuestions),
        skillCandidates: sources.skillCandidates.slice(0, STATE_CAPS.skillCandidates).map((c) => ({
            id: c.id,
            title: clip(c.title, STATE_CAPS.candidateTitle),
            occurrences: c.occurrences ?? 1,
        })),
        skills: skills.slice(0, STATE_CAPS.skills),
        agents: [...AGENT_TYPES],
        routing: ROUTING_TABLE,
        prompt: truncatePrompt(prompt, STATE_CAPS.prompt),
        ...(notes ? { notes: clip(notes, STATE_CAPS.notes) } : {}),
    };

    const trims: Array<() => void> = [
        () => delete state.notes,
        () => (state.skills = state.skills.slice(0, STATE_CAPS.skillsTrimmed)),
        () => (state.tasks.list = state.tasks.list.slice(0, STATE_CAPS.tasksTrimmed)),
        () => (state.skillCandidates = []),
        () => (state.openQuestions = state.openQuestions.slice(0, STATE_CAPS.openQuestionsTrimmed)),
        () => {
            if (state.project.description) {
                state.project.description = clip(
                    state.project.description,
                    STATE_CAPS.descriptionTrimmed
                );
            }
        },
        () => (state.prompt = truncatePrompt(prompt, STATE_CAPS.promptTrimmed)),
    ];
    for (const trim of trims) {
        if (stateBytes(state) <= STATE_CAPS.softBytes) break;
        trim();
    }
    // Hard cap: the trims count characters, and a character can take up to
    // 4 bytes. Cut the prompt by bytes, on a code-point boundary, until the
    // state fits (or the prompt is empty).
    if (stateBytes(state) > STATE_CAPS.hardBytes) {
        let body = state.prompt.endsWith(TRUNCATION_MARKER)
            ? state.prompt.slice(0, -TRUNCATION_MARKER.length)
            : state.prompt;
        state.prompt = body + TRUNCATION_MARKER;
        while (stateBytes(state) > STATE_CAPS.hardBytes && body.length > 0) {
            const over = stateBytes(state) - STATE_CAPS.hardBytes;
            body = sliceUtf8(body, Buffer.byteLength(body) - over);
            state.prompt = body + TRUNCATION_MARKER;
        }
    }
    return state;
}

// ── Questions ────────────────────────────────────────────────────────────

const KIND_CRITERIA: Record<string, string> = {
    small_fix: 'One bounded change (typo, one bug, one file) that needs no multi-step plan',
    task_work:
        'Feature or multi-step change spanning files or sessions; needs a plan and checklist',
    question_or_analysis: 'Wants an explanation, review, or analysis; no code change requested',
    answer_to_open_question: 'Answers or decides one of the items in `openQuestions`',
    setup_or_config: 'Tooling, dependencies, config files, rulebook or CI setup',
    unclear: 'Cannot tell what is being asked',
};

const RISK_IDS = ['risk_destructive_git', 'risk_os_scheduling', 'risk_secrets'] as const;

function humanise(skillId: string): string {
    return skillId.replace(/[/_-]+/g, ' ').trim();
}

/**
 * The 12-question set; `existing_task` and `skill` are omitted for empty
 * lists, `in_project_scope` when the state has no project description.
 */
export function buildGateQuestions(state: GateState): Record<string, Question> {
    const q: Record<string, Question> = {};
    q.kind = {
        type: 'choice',
        instructions: 'What kind of request is `prompt`, given `tasks` and `openQuestions`?',
        criteria: KIND_CRITERIA,
    };
    q.needs_task = {
        type: 'noul',
        instructions:
            'Should `prompt` be tracked as a rulebook task (multi-session or multi-phase work)?',
        criteria: {
            true: 'Work spans several files, sessions, or phases and needs a checklist',
            false: 'A small fix, a question, or a decision — no task ceremony',
        },
    };
    if (state.tasks.list.length > 0) {
        const criteria: Record<string, string> = {};
        for (const t of state.tasks.list) criteria[t.id] = `${t.title} (${t.status})`;
        criteria.none = 'A new piece of work, or not task work';
        q.existing_task = {
            type: 'choice',
            instructions: 'Which item in `tasks.list` does `prompt` continue or belong to?',
            criteria,
        };
    }
    q.model = {
        type: 'choice',
        instructions: 'Which model should the primary subagent for `prompt` run on, per `routing`?',
        criteria: {
            fable: 'Architecture, hard or intermittent bugs, code review, security judgment',
            opus: 'Edits, tests, docs, refactors, config — any simple or medium work',
            haiku: 'Research, reading, summaries — no code changes',
        },
    };
    q.agent = {
        type: 'choice',
        instructions: 'Which subagent type in `agents` should do the main work for `prompt`?',
        criteria: {
            implementer: 'Writes or changes code',
            tester: 'Writes or fixes tests',
            'docs-writer': 'Documentation, changelog, comments',
            researcher: 'Reads and reports; no changes',
            architect: 'Design, boundaries, trade-offs, ADRs',
            'code-reviewer': 'Reviews a diff or PR',
            'security-reviewer': 'Secrets, auth, injection, permissions',
            'build-engineer': 'Build, CI, packaging, tooling',
            none: 'No subagent needed (a question the main session answers, or unclear)',
        },
    };
    if (state.skills.length > 0) {
        const criteria: Record<string, string> = {};
        for (const s of state.skills) criteria[s] = humanise(s);
        criteria.none = 'No installed skill applies';
        q.skill = {
            type: 'choice',
            instructions: 'Which entry in `skills` applies to `prompt`?',
            criteria,
        };
    }
    q.parallel = {
        type: 'noul',
        instructions:
            'Can `prompt` be split into independent parts that different subagents can do at the same time without touching the same files?',
        criteria: {
            true: 'Two or more independent parts with separate files',
            false: 'One part, or parts that depend on each other',
        },
    };
    q.needs_operator_decision = {
        type: 'noul',
        instructions:
            'Does `prompt` leave a choice open that would change the outcome and that only the operator can make?',
        criteria: {
            true: 'Two readings lead to different results, or a destructive step needs consent',
            false: 'The request is unambiguous enough to start',
        },
    };
    if (state.project.description) {
        q.in_project_scope = {
            type: 'noul',
            instructions:
                'Is `prompt` about the project in `project.description` (its code, docs, tooling, tasks, or workflow)?',
            criteria: {
                true: 'Concerns this project: its code, docs, tests, tooling, tasks, or how work on it is run',
                false: 'Unrelated to this project: personal errands, general writing, or work for another repository',
            },
        };
    }
    q.risk_destructive_git = {
        type: 'noul',
        instructions:
            'Does `prompt` imply a destructive git operation (reset --hard, force push, rebase, stash, branch delete, discarding changes)?',
    };
    q.risk_os_scheduling = {
        type: 'noul',
        instructions:
            'Does `prompt` imply OS-level scheduling (cron, systemd timers, launchd, schtasks)?',
    };
    q.risk_secrets = {
        type: 'noul',
        instructions: 'Does `prompt` involve API keys, tokens, passwords, or .env files?',
    };
    return q;
}

// ── Interpretation ───────────────────────────────────────────────────────

function emptyRouting(): GateRouting {
    return {
        kind: null,
        needsTask: null,
        existingTaskId: null,
        model: null,
        agentType: null,
        skill: null,
        parallel: null,
        needsOperatorDecision: null,
        inProjectScope: null,
        risk: { destructiveGit: false, osScheduling: false, secrets: false },
    };
}

/** v7.4 table: which model an agent type runs on when Jev left `model` open. */
export function modelForAgent(agent: AgentType): GateModel {
    if (agent === 'architect' || agent === 'code-reviewer' || agent === 'security-reviewer') {
        return 'fable';
    }
    return agent === 'researcher' ? 'haiku' : 'opus';
}

export interface InterpretedAnswers {
    decisions: GateDecision[];
    routing: GateRouting;
    undecided: string[];
    /** Fields filled by a post-rule rather than by Jev directly. */
    derived: string[];
}

function decide(id: string, q: Question, a: Answer | undefined): GateDecision {
    if (q.type === 'choice') {
        // A choice outside the question's criteria (an unknown model, agent
        // type, task or skill) is no decision at all.
        if (
            !a ||
            a.type !== 'choice' ||
            !Object.prototype.hasOwnProperty.call(q.criteria, a.choice)
        ) {
            return { id, primitive: 'choice', answer: null, probability: 0, decided: false };
        }
        return {
            id,
            primitive: 'choice',
            answer: a.choice,
            probability: a.probabilities?.[a.choice] ?? 0,
            confidence: a.confidence,
            decided: a.confidence >= GATE_THRESHOLDS.choiceConfidence,
        };
    }
    const p = a && a.type === 'noul' ? a.noul : NaN;
    if (Number.isNaN(p)) {
        return { id, primitive: 'noul', answer: null, probability: 0, decided: false };
    }
    if ((RISK_IDS as readonly string[]).includes(id)) {
        return {
            id,
            primitive: 'noul',
            answer: p >= GATE_THRESHOLDS.risk,
            probability: p,
            decided: true,
        };
    }
    const answer =
        p >= GATE_THRESHOLDS.noulTrue ? true : p <= GATE_THRESHOLDS.noulFalse ? false : null;
    return { id, primitive: 'noul', answer, probability: p, decided: answer !== null };
}

export function interpretAnswers(
    questions: Record<string, Question>,
    response: Pick<SystemOneResponse, 'answers'>,
    state: GateState
): InterpretedAnswers {
    const decisions = Object.entries(questions).map(([id, q]) =>
        decide(id, q, response.answers[id])
    );
    const byId = new Map(decisions.map((d) => [d.id, d]));
    const val = (id: string) => {
        const d = byId.get(id);
        return d?.decided ? d.answer : null;
    };
    const choice = (id: string) => {
        const v = val(id);
        return typeof v === 'string' && v !== 'none' ? v : null;
    };
    const flag = (id: string) => {
        const v = val(id);
        return typeof v === 'boolean' ? v : null;
    };

    const routing = emptyRouting();
    const kind = choice('kind');
    routing.kind = kind ? (kind.replace(/_/g, '-') as GateKind) : null;
    routing.needsTask = flag('needs_task');
    routing.existingTaskId = choice('existing_task');
    routing.model = choice('model') as GateModel | null;
    routing.agentType = choice('agent') as AgentType | null;
    routing.skill = choice('skill');
    routing.parallel = flag('parallel');
    routing.needsOperatorDecision = flag('needs_operator_decision');
    routing.inProjectScope = flag('in_project_scope');
    routing.risk = {
        destructiveGit: flag('risk_destructive_git') === true,
        osScheduling: flag('risk_os_scheduling') === true,
        secrets: flag('risk_secrets') === true,
    };

    const undecided = new Set(decisions.filter((d) => !d.decided).map((d) => d.id));
    const derived: string[] = [];

    // Post-rules: questions cannot see each other's answers.
    if (routing.kind === 'small-fix') routing.needsTask = false;
    if (
        routing.kind === 'answer-to-open-question' &&
        undecided.has('existing_task') &&
        state.openQuestions.length > 0
    ) {
        routing.existingTaskId = state.openQuestions[0].taskId;
        undecided.delete('existing_task');
        derived.push('existingTaskId');
    }
    if (routing.existingTaskId) routing.needsTask = true;
    if (routing.needsTask !== null && undecided.delete('needs_task')) derived.push('needsTask');
    if (routing.model === null && undecided.has('model') && routing.agentType) {
        routing.model = modelForAgent(routing.agentType);
        undecided.delete('model');
        derived.push('model');
    }

    return { decisions, routing, undecided: [...undecided], derived };
}

// ── Instruction ──────────────────────────────────────────────────────────

const FALLBACK = 'proceed under CLAUDE.md Orchestration rules.';

/** Instruction sentence for `inProjectScope === false`; the prompt hook swaps it for its own scope action. */
export const OFF_TOPIC_SENTENCE =
    'Off-topic for this project — confirm with the operator before acting.';

export function renderInstruction(
    result: Pick<GateResult, 'available' | 'reason' | 'routing' | 'undecided'>,
    derived: string[] = []
): string {
    if (!result.available) {
        return `Gate unavailable (${result.reason ?? 'unknown'}); ${FALLBACK}`;
    }
    const r = result.routing;
    const yn = (v: boolean | null) => (v === null ? 'undecided' : v ? 'yes' : 'no');
    const parts = [
        `kind=${r.kind ?? 'undecided'}`,
        `needsTask=${yn(r.needsTask)}${r.existingTaskId ? ` (reuse ${r.existingTaskId})` : ''}`,
        `model=${r.model ?? 'undecided'}`,
        `agent=${r.agentType ?? (result.undecided.includes('agent') ? 'undecided' : 'none')}`,
        `skill=${r.skill ?? (result.undecided.includes('skill') ? 'undecided' : 'none')}`,
        `parallel=${yn(r.parallel)}`,
    ];
    const sentences = [`Jev routing: ${parts.join(', ')}.`];
    if (derived.length > 0)
        sentences.push(`Derived by rulebook post-rules: ${derived.join(', ')}.`);
    if (r.inProjectScope === false) sentences.push(OFF_TOPIC_SENTENCE);
    if (r.needsOperatorDecision === true || r.kind === null || r.kind === 'unclear') {
        sentences.push(
            'Ask the operator before acting (rulebook_task {action:"ask"} when a task exists, otherwise one direct question).'
        );
    }
    const risks = [
        r.risk.destructiveGit && 'destructive git',
        r.risk.osScheduling && 'OS scheduling',
        r.risk.secrets && 'secrets',
    ].filter(Boolean);
    if (risks.length > 0) {
        sentences.push(
            `Risk: ${risks.join(', ')} — get explicit authorization before any such step.`
        );
    }
    if (result.undecided.length > 0) {
        sentences.push(
            `Undecided: ${result.undecided.join(', ')} — use the CLAUDE.md Orchestration rules for those.`
        );
    }
    return sentences.join(' ');
}

// ── Sources ──────────────────────────────────────────────────────────────

export interface GateSourceLoaders {
    loadConfig?: () => Promise<Partial<RulebookConfig> | null>;
    listTasks?: () => Promise<TaskLike[]>;
    /** Defaults to resolveProjectDescription(projectRoot, config). */
    loadDescription?: () => Promise<string | null>;
}

/** `<root>/.rulebook/rulebook.json` as-is, or null when missing or unreadable. Never creates it. */
export async function readConfigFile(projectRoot: string): Promise<Partial<RulebookConfig> | null> {
    try {
        const raw = await readFile(path.join(projectRoot, '.rulebook', 'rulebook.json'), 'utf-8');
        return JSON.parse(raw) as Partial<RulebookConfig>;
    } catch {
        return null;
    }
}

function bounded<T>(work: Promise<T>, ms: number, fallback: T): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms);
    });
    return Promise.race([work.catch(() => fallback), timeout]).finally(() => clearTimeout(timer));
}

/** Lines that are not prose: headings, badges, HTML, tables, thematic breaks. */
const NON_PROSE = /^(#|\[?!\[|<|\||(\*{3,}|-{3,}|_{3,})$)/;

/**
 * The first prose paragraph of a Markdown file — headings, badge lines, HTML,
 * tables, code fences and blank lines are skipped. Null when there is none.
 */
function firstProseParagraph(markdown: string): string | null {
    let inFence = false;
    let para: string[] = [];
    for (const raw of markdown.split(/\r?\n/)) {
        const line = raw.trim();
        if (/^(```|~~~)/.test(line)) {
            if (para.length > 0) break;
            inFence = !inFence;
            continue;
        }
        if (inFence) continue;
        if (/^(=+|-+)$/.test(line) && para.length > 0) {
            // Setext underline: the lines above were a heading.
            para = [];
            continue;
        }
        if (!line || NON_PROSE.test(line)) {
            if (para.length > 0) break;
            continue;
        }
        para.push(line);
    }
    return para.length > 0 ? para.join(' ') : null;
}

/**
 * The project description the scope question uses, first hit wins:
 * `gate.scope.description`, then `package.json` `description`, then the
 * first prose paragraph of `README.md`. Whitespace collapsed, clipped to 400
 * characters. Null when nothing is found, on read errors, after
 * SOURCE_TIMEOUT_MS, or when `gate.scope.enabled` is false.
 */
export async function resolveProjectDescription(
    projectRoot: string,
    config: Partial<RulebookConfig> | null
): Promise<string | null> {
    const scope = config?.gate?.scope;
    if (scope?.enabled === false) return null;
    const normalise = (text: unknown): string | null => {
        if (typeof text !== 'string') return null;
        const flat = text.replace(/\s+/g, ' ').trim();
        return flat ? clip(flat, STATE_CAPS.description) : null;
    };
    const work = async (): Promise<string | null> => {
        const configured = normalise(scope?.description);
        if (configured) return configured;
        try {
            const pkg = JSON.parse(await readFile(path.join(projectRoot, 'package.json'), 'utf-8'));
            const fromPkg = normalise(pkg?.description);
            if (fromPkg) return fromPkg;
        } catch {
            // no package.json, or not JSON
        }
        try {
            return normalise(
                firstProseParagraph(await readFile(path.join(projectRoot, 'README.md'), 'utf-8'))
            );
        } catch {
            return null;
        }
    };
    return bounded(work(), SOURCE_TIMEOUT_MS, null);
}

/**
 * Gather the gate's inputs. Every subtree degrades to empty, like session
 * start; nothing is created in a project that has no rulebook directory.
 */
export async function loadGateSources(
    projectRoot: string,
    config: Partial<RulebookConfig> | null,
    loaders: GateSourceLoaders = {}
): Promise<GateSources> {
    const rulebookDir = config?.rulebookDir ?? '.rulebook';
    const hasRulebook = existsSync(path.join(projectRoot, rulebookDir));

    const listTasks =
        loaders.listTasks ??
        (async (): Promise<TaskLike[]> => {
            if (!hasRulebook) return [];
            const { resolveTaskBackend } = await import('../tasks/task-manager.js');
            const backend = await resolveTaskBackend(projectRoot, rulebookDir);
            return backend.listTasks(false);
        });
    const tasks = await bounded(listTasks(), SOURCE_TIMEOUT_MS, []);

    let skillCandidates: GateSources['skillCandidates'] = [];
    if (hasRulebook) {
        try {
            const { LearnManager } = await import('../tasks/learn-manager.js');
            skillCandidates = await new LearnManager(projectRoot, rulebookDir).skillCandidates();
        } catch {
            // no learnings yet
        }
    }

    let promotedSkills: string[] = [];
    try {
        const entries = await readdir(path.join(projectRoot, '.claude', 'skills'), {
            withFileTypes: true,
        });
        promotedSkills = entries.filter((e) => e.isDirectory()).map((e) => e.name);
    } catch {
        // no promoted skills
    }

    const loadDescription =
        loaders.loadDescription ?? (() => resolveProjectDescription(projectRoot, config));
    const projectDescription = await loadDescription().catch(() => null);

    return { config, tasks, skillCandidates, promotedSkills, projectDescription };
}

// ── Decision log ─────────────────────────────────────────────────────────

const GATE_LOG_MAX_LINES = 500;

/** Which entry point ran the gate: the MCP tool, `rulebook gate`, or the prompt hook. */
export type GateLogSource = 'mcp' | 'cli' | 'hook';

/**
 * One JSON line per gate call in `<rulebookDir>/logs/gate.jsonl` — source,
 * prompt hash, routing, usage, timing. Never the prompt text, never the key.
 * Kept to the newest 500 lines. Failures are swallowed: logging is best effort.
 */
export async function appendGateLog(
    projectRoot: string,
    rulebookDir: string,
    prompt: string,
    result: GateResult,
    source?: GateLogSource
): Promise<void> {
    try {
        const file = path.join(projectRoot, rulebookDir, 'logs', 'gate.jsonl');
        const line = JSON.stringify({
            ts: new Date().toISOString(),
            ...(source ? { source } : {}),
            promptHash: createHash('sha256').update(prompt).digest('hex').slice(0, 16),
            available: result.available,
            ...(result.reason ? { reason: result.reason } : {}),
            ...(result.model ? { model: result.model } : {}),
            routing: result.routing,
            undecided: result.undecided,
            ...(result.usage ? { usage: result.usage } : {}),
            elapsedMs: result.elapsedMs,
            stateBytes: result.stateBytes,
        });
        await appendCappedLine(file, line);
    } catch {
        // best effort
    }
}

/**
 * Append one line to a JSONL log, keeping the newest `maxLines` (default
 * 500). Creates the directory. Throws on I/O errors; callers swallow them.
 */
export async function appendCappedLine(
    file: string,
    line: string,
    maxLines: number = GATE_LOG_MAX_LINES
): Promise<void> {
    await mkdir(path.dirname(file), { recursive: true });
    if (existsSync(file)) {
        const lines = (await readFile(file, 'utf-8')).split('\n').filter(Boolean);
        if (lines.length >= maxLines) {
            const keep = lines.slice(lines.length - maxLines + 1);
            await writeFile(file, [...keep, line].join('\n') + '\n', 'utf-8');
            return;
        }
    }
    await appendFile(file, line + '\n', 'utf-8');
}

// ── Run ──────────────────────────────────────────────────────────────────

/**
 * The MCP server process lives for the whole Claude Code session; the key
 * instructions are shown to the operator once, not on every prompt.
 */
let tokenInstructionsShown = false;

export interface RunGateOptions extends GateSourceLoaders {
    projectRoot: string;
    prompt: string;
    notes?: string;
    env?: NodeJS.ProcessEnv;
    fetch?: typeof fetch;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
    deadlineMs?: number;
    /** The CLI prints the key instructions every time it has no key. */
    alwaysShowInstructions?: boolean;
    /** Recorded in the decision log line. */
    source?: GateLogSource;
}

function unavailable(reason: GateReason, t0: number, extra: Partial<GateResult> = {}): GateResult {
    const base: GateResult = {
        available: false,
        reason,
        decisions: [],
        routing: emptyRouting(),
        undecided: [],
        instruction: '',
        elapsedMs: Date.now() - t0,
        stateBytes: 0,
        ...extra,
    };
    base.instruction = renderInstruction(base);
    return base;
}

export function isGateDisabled(env: NodeJS.ProcessEnv = process.env): boolean {
    return env.RULEBOOK_GATE?.trim().toLowerCase() === 'off';
}

/** Run the gate end to end. Never throws. */
export async function runGate(opts: RunGateOptions): Promise<GateResult> {
    const t0 = Date.now();
    const env = opts.env ?? process.env;
    const deadlineMs = opts.deadlineMs ?? GATE_DEADLINE_MS;

    if (isGateDisabled(env)) return unavailable('disabled', t0);

    let config: Partial<RulebookConfig> | null = null;
    try {
        config = opts.loadConfig ? await opts.loadConfig() : await readConfigFile(opts.projectRoot);
    } catch {
        config = null;
    }
    // The operator's explicit opt-out of the TypeSafe integration covers the gate too.
    if (config?.integrations?.typesafe?.enabled === false) return unavailable('disabled', t0);

    const { key } = await resolveTypesafeKey(opts.projectRoot, env);
    if (!key) {
        const show = opts.alwaysShowInstructions || !tokenInstructionsShown;
        tokenInstructionsShown = true;
        return unavailable('no-key', t0, show ? { instructions: typesafeTokenInstructions() } : {});
    }

    const sources = await loadGateSources(opts.projectRoot, config, opts);
    const state = buildGateState(sources, opts.prompt, opts.notes);
    const bytes = stateBytes(state);
    const questions = buildGateQuestions(state);

    let result: GateResult;
    try {
        const response = await systemOne(
            { state, model: 'jev-latest', questions },
            {
                apiKey: key,
                fetch: opts.fetch,
                sleep: opts.sleep,
                random: opts.random,
                deadlineMs: Math.max(0, deadlineMs - (Date.now() - t0)),
            }
        );
        const interpreted = interpretAnswers(questions, response, state);
        result = {
            available: true,
            model: response.model,
            decisions: interpreted.decisions,
            routing: interpreted.routing,
            undecided: interpreted.undecided,
            instruction: '',
            elapsedMs: 0,
            stateBytes: bytes,
            usage: response.usage,
        };
        result.instruction = renderInstruction(result, interpreted.derived);
        result.elapsedMs = Date.now() - t0;
    } catch (error) {
        const reason: GateReason = error instanceof TypesafeError ? error.kind : 'bad-response';
        const detail = redact(
            (error instanceof Error ? error.message : String(error)).split(key).join('***')
        );
        result = unavailable(reason, t0, { detail, stateBytes: bytes });
    }

    if (config?.features?.logging === true) {
        await appendGateLog(
            opts.projectRoot,
            config.rulebookDir ?? '.rulebook',
            opts.prompt,
            result,
            opts.source
        );
    }
    return result;
}
