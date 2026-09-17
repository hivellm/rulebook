/**
 * Decision requests ("questions") attached to a task.
 *
 * Why this exists: an AI driving a task regularly reaches a choice it cannot
 * make from the spec. Left to itself it buries the question in a long reply,
 * flips the task to `blocked` (or leaves it `in-progress`) and moves on. The
 * operator never sees a crisp question, so stuck tasks pile up.
 *
 * A question is the only sanctioned way for a task to be `blocked` without a
 * `blockedBy` dependency: one line, the options considered, the model's own
 * recommendation, and the checklist item it holds up. Answering it unblocks
 * the task. Everything here is pure so both task backends (files, GitHub
 * issues) share identical semantics.
 */

export type TaskQuestionStatus = 'open' | 'answered';

export interface TaskQuestionOption {
    /** Short label the operator can pick, e.g. "Keep zod 3". */
    label: string;
    /** One line on the trade-off. */
    description?: string;
}

export interface TaskQuestion {
    /** Sequential per task: q1, q2, ... */
    id: string;
    /** One line: what has to be decided. */
    question: string;
    /** Why the model could not decide on its own (short). */
    context?: string;
    options?: TaskQuestionOption[];
    /** Option label the model would pick if forced. */
    recommended?: string;
    /** Checklist item (tasks.md text) that waits on this answer. */
    blocks?: string;
    status: TaskQuestionStatus;
    askedAt: string;
    answer?: string;
    answeredAt?: string;
}

export interface AskQuestionInput {
    question: string;
    context?: string;
    options?: Array<string | TaskQuestionOption>;
    recommended?: string;
    blocks?: string;
}

/** Instruction handed to the model together with every `ask` result. */
export const ASK_INSTRUCTION =
    'Present operatorPrompt to the operator NOW as an explicit form (AskUserQuestion in ' +
    'Claude Code; otherwise quote it verbatim as the last thing in your reply). Do not keep ' +
    'working on the blocked item until it is answered; switch to another unblocked item ' +
    'or stop. When the operator answers, call rulebook_task {action:"answer"}.';

/** Normalize free-form option input (strings or objects) into records. */
export function normalizeOptions(
    options: AskQuestionInput['options']
): TaskQuestionOption[] | undefined {
    if (!options || options.length === 0) return undefined;
    const normalized: TaskQuestionOption[] = [];
    for (const raw of options) {
        const option =
            typeof raw === 'string'
                ? { label: raw.trim() }
                : { label: (raw.label ?? '').trim(), description: raw.description?.trim() };
        if (option.label) normalized.push(option);
    }
    return normalized.length > 0 ? normalized : undefined;
}

/** Next sequential id for a task: q1, q2, ... (gaps from deleted entries are never reused). */
export function nextQuestionId(existing: readonly TaskQuestion[]): string {
    let max = 0;
    for (const q of existing) {
        const m = q.id.match(/^q(\d+)$/);
        if (m) max = Math.max(max, parseInt(m[1], 10));
    }
    return `q${max + 1}`;
}

/**
 * Build a new question record. Throws on an empty question — the whole point
 * is a crisp, answerable line, so a blank one is a caller bug.
 */
export function buildQuestion(
    existing: readonly TaskQuestion[],
    input: AskQuestionInput,
    now: string = new Date().toISOString()
): TaskQuestion {
    const question = (input.question ?? '').trim();
    if (!question) {
        throw new Error('ask requires a non-empty question (one line: what has to be decided)');
    }
    const options = normalizeOptions(input.options);
    const recommended = input.recommended?.trim() || undefined;
    if (recommended && options && !options.some((o) => o.label === recommended)) {
        throw new Error(
            `recommended "${recommended}" is not one of the options: ${options.map((o) => o.label).join(', ')}`
        );
    }
    const record: TaskQuestion = {
        id: nextQuestionId(existing),
        question,
        status: 'open',
        askedAt: now,
    };
    if (input.context?.trim()) record.context = input.context.trim();
    if (options) record.options = options;
    if (recommended) record.recommended = recommended;
    if (input.blocks?.trim()) record.blocks = input.blocks.trim();
    return record;
}

/**
 * Apply an answer. Returns a new array (the input is not mutated) plus the
 * answered record. Throws when the id is unknown, already answered, or the
 * answer is blank — an empty answer would silently unblock the task.
 */
export function applyAnswer(
    questions: readonly TaskQuestion[],
    questionId: string,
    answer: string,
    now: string = new Date().toISOString()
): { questions: TaskQuestion[]; answered: TaskQuestion } {
    const trimmed = (answer ?? '').trim();
    if (!trimmed) {
        throw new Error(`answer for ${questionId} must not be empty`);
    }
    const index = questions.findIndex((q) => q.id === questionId);
    if (index === -1) {
        const open = questions.filter((q) => q.status === 'open').map((q) => q.id);
        throw new Error(
            `Question ${questionId} not found` +
                (open.length ? ` (open: ${open.join(', ')})` : ' (no open questions)')
        );
    }
    if (questions[index].status === 'answered') {
        throw new Error(`Question ${questionId} was already answered: ${questions[index].answer}`);
    }
    const answered: TaskQuestion = {
        ...questions[index],
        status: 'answered',
        answer: trimmed,
        answeredAt: now,
    };
    const next = questions.slice();
    next[index] = answered;
    return { questions: next, answered };
}

export function openQuestions(questions: readonly TaskQuestion[] | undefined): TaskQuestion[] {
    return (questions ?? []).filter((q) => q.status === 'open');
}

/**
 * The operator-facing block. Deliberately short and fixed-shape so it reads
 * the same whether it lands in a chat reply, a form, STATE.md or a terminal.
 */
export function renderOperatorPrompt(taskId: string, q: TaskQuestion): string {
    const lines = [`[${taskId} · ${q.id}] Decision needed: ${q.question}`];
    if (q.context) lines.push(`Why I can't decide: ${q.context}`);
    if (q.blocks) lines.push(`Blocks: ${q.blocks}`);
    if (q.options && q.options.length > 0) {
        lines.push('Options:');
        q.options.forEach((o, i) => {
            const mark = q.recommended === o.label ? ' (recommended)' : '';
            lines.push(
                `  ${i + 1}. ${o.label}${mark}${o.description ? ` — ${o.description}` : ''}`
            );
        });
    } else if (q.recommended) {
        lines.push(`Recommended: ${q.recommended}`);
    }
    lines.push(
        `Answer with: rulebook_task {action:"answer", taskId:"${taskId}", questionId:"${q.id}", answer:"..."}`
    );
    return lines.join('\n');
}

/** One-line summary used by list views (README index, STATE.md, session start). */
export function summarizeQuestion(taskId: string, q: TaskQuestion): string {
    const rec = q.recommended ? ` (recommended: ${q.recommended})` : '';
    return `${taskId} ${q.id}: ${q.question}${rec}`;
}

/** Parse the `questions` field of a metadata record, dropping malformed entries. */
export function parseQuestions(raw: unknown): TaskQuestion[] {
    if (!Array.isArray(raw)) return [];
    const out: TaskQuestion[] = [];
    for (const entry of raw) {
        if (
            entry &&
            typeof entry === 'object' &&
            typeof (entry as TaskQuestion).id === 'string' &&
            typeof (entry as TaskQuestion).question === 'string'
        ) {
            const q = entry as TaskQuestion;
            out.push({ ...q, status: q.status === 'answered' ? 'answered' : 'open' });
        }
    }
    return out;
}

/** Task status a task should return to once its last open question is answered. */
export function statusAfterAnswer(
    remainingOpen: number,
    metadata: { blockedBy?: unknown }
): 'blocked' | 'in-progress' {
    if (remainingOpen > 0) return 'blocked';
    if (Array.isArray(metadata.blockedBy) && metadata.blockedBy.length > 0) return 'blocked';
    return 'in-progress';
}

/**
 * Guard for `update status=blocked`: a task may only be blocked for a reason
 * the operator can see — an open question or a dependency.
 */
export function assertBlockable(
    taskId: string,
    questions: readonly TaskQuestion[],
    metadata: { blockedBy?: unknown }
): void {
    const hasOpen = openQuestions(questions).length > 0;
    const hasDependency = Array.isArray(metadata.blockedBy) && metadata.blockedBy.length > 0;
    if (!hasOpen && !hasDependency) {
        throw new Error(
            `Task ${taskId} cannot be marked blocked without a reason the operator can act on. ` +
                'Either decide yourself (record it with rulebook_memory decision) or file the ' +
                'decision request with rulebook_task {action:"ask", question, options, recommended, blocks} ' +
                '— that marks the task blocked and hands the operator a form.'
        );
    }
}
