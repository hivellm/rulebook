import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { renderInstruction, SILENT_UNDECIDED, type GateRouting } from '../src/core/typesafe/gate';

/**
 * Replays the routing shapes of every Jev decision logged before v7.5 (rulebook
 * repo + UzPainter, tests/fixtures/gate-replay.json: routing and undecided
 * only, no prompts, no network) through the prompt hook's renderInstruction.
 * v7.4 told the model to ask the operator on 64 % of them (F-011/F-040).
 */

/** The questions the hook still asks; model/agent/skill/parallel were dropped. */
const HOOK_QUESTIONS = new Set([
    'kind',
    'needs_task',
    'existing_task',
    'needs_operator_decision',
    'in_project_scope',
]);
const ASK = /Ask the operator/;

interface Logged {
    project: string;
    routing: Pick<
        GateRouting,
        | 'kind'
        | 'needsTask'
        | 'existingTaskId'
        | 'needsOperatorDecision'
        | 'inProjectScope'
        | 'risk'
    >;
    undecided: string[];
}

const { decisions } = JSON.parse(
    readFileSync(path.join(process.cwd(), 'tests', 'fixtures', 'gate-replay.json'), 'utf-8')
) as { decisions: Logged[] };

function render(d: Logged): string {
    return renderInstruction(
        {
            available: true,
            routing: { ...d.routing, model: null, agentType: null, skill: null, parallel: null },
            undecided: d.undecided.filter((id) => HOOK_QUESTIONS.has(id)),
        },
        [],
        'hook'
    );
}

describe('prompt hook replay of the logged gate decisions', () => {
    it('covers the 50 decisions of the analysis and the ones logged since', () => {
        expect(decisions.length).toBeGreaterThanOrEqual(50);
        expect(new Set(decisions.map((d) => d.project))).toEqual(
            new Set(['rulebook', 'uzpainter'])
        );
    });

    it('asks the operator on at most 15 % of them (v7.4: more than half)', () => {
        const v74 = decisions.filter(
            (d) =>
                d.routing.needsOperatorDecision === true ||
                d.routing.kind === null ||
                d.routing.kind === 'unclear'
        ).length;
        expect(v74 / decisions.length).toBeGreaterThan(0.5);

        const asked = decisions.filter((d) => ASK.test(render(d))).length;
        expect(asked / decisions.length).toBeLessThanOrEqual(0.15);
    });

    it('asks only where Jev decided an operator decision is needed', () => {
        for (const d of decisions) {
            if (ASK.test(render(d))) expect(d.routing.needsOperatorDecision).toBe(true);
        }
    });

    it(`injects nothing when ${SILENT_UNDECIDED} or more hook fields are undecided`, () => {
        for (const d of decisions) {
            const open = d.undecided.filter((id) => HOOK_QUESTIONS.has(id)).length;
            expect(render(d) === '').toBe(open >= SILENT_UNDECIDED);
        }
    });
});
