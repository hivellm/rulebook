import { describe, it, expect } from 'vitest';
import { rebuildConfigOnUpdate, type ConfigRebuildInput } from '../src/cli/commands/update';
import type { RulebookConfig } from '../src/types';

/**
 * `rulebook update` replaces rulebook.json with a rebuilt config. The rebuild
 * must carry forward what the operator (or an earlier install) decided:
 * `installedAt`, `integrations` — a stored TypeSafe "no" included — and
 * `permissions` (the v7.5 auto-approve answer).
 */

const FEATURES: RulebookConfig['features'] = {
    logging: true,
    gitHooks: false,
    templates: true,
    context: true,
    health: true,
    parallel: true,
    smartContinue: true,
};

function input(over: Partial<ConfigRebuildInput> = {}): ConfigRebuildInput {
    return {
        version: '7.4.0',
        projectId: 'demo',
        minimalMode: false,
        leanMode: true,
        features: FEATURES,
        gitPushMode: 'manual',
        now: '2026-09-26T12:00:00.000Z',
        ...over,
    };
}

const EXISTING: Partial<RulebookConfig> = {
    version: '7.3.0',
    installedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z',
    coverageThreshold: 80,
    integrations: { typesafe: { enabled: false, askedAt: '2026-02-01T00:00:00.000Z' } },
};

describe('rebuildConfigOnUpdate', () => {
    it('preserves installedAt and updates version and updatedAt', () => {
        const c = rebuildConfigOnUpdate(EXISTING, input());
        expect(c.installedAt).toBe('2026-01-01T00:00:00.000Z');
        expect(c.version).toBe('7.4.0');
        expect(c.updatedAt).toBe('2026-09-26T12:00:00.000Z');
        expect(c.coverageThreshold).toBe(80);
    });

    it('falls back to now only when installedAt is absent', () => {
        const c = rebuildConfigOnUpdate({ ...EXISTING, installedAt: undefined }, input());
        expect(c.installedAt).toBe('2026-09-26T12:00:00.000Z');
    });

    it('keeps a stored TypeSafe "no" when nothing new was persisted', () => {
        const c = rebuildConfigOnUpdate(EXISTING, input());
        expect(c.integrations).toEqual(EXISTING.integrations);
    });

    it('takes integrations from the fresh read after the TypeSafe decision', () => {
        const fresh = { typesafe: { enabled: true, askedAt: '2026-09-26T11:59:00.000Z' } };
        const c = rebuildConfigOnUpdate(
            { ...EXISTING, integrations: undefined },
            input({
                integrations: fresh,
            })
        );
        expect(c.integrations).toEqual(fresh);
    });

    it('adds no integrations key when there are none', () => {
        const c = rebuildConfigOnUpdate({ installedAt: EXISTING.installedAt }, input());
        expect('integrations' in c).toBe(false);
    });

    it('keeps a stored permissions.autoApprove answer (v7.5)', () => {
        const c = rebuildConfigOnUpdate(
            { ...EXISTING, permissions: { autoApprove: false } },
            input()
        );
        expect(c.permissions).toEqual({ autoApprove: false });
    });

    it('takes permissions from the fresh read after the auto-approve decision', () => {
        const c = rebuildConfigOnUpdate(EXISTING, input({ permissions: { autoApprove: true } }));
        expect(c.permissions).toEqual({ autoApprove: true });
        expect('permissions' in rebuildConfigOnUpdate(EXISTING, input())).toBe(false);
    });

    // Regression (v7.5): the rebuild listed its keys by hand and dropped gate,
    // multiAgent, tasks, mcp and orchestration — an update silently turned the
    // opt-in Jev prompt hook (gate.promptHook.enabled) off again.
    it('carries forward every key the project set', () => {
        const userSet: Partial<RulebookConfig> = {
            ...EXISTING,
            orchestration: 'orchestrator',
            gate: {
                promptHook: { enabled: true, deadlineMs: 2000, blockThreshold: 0.8 },
                scope: { enabled: false, onOffTopic: 'block' },
                toolHook: { enabled: true, matcher: 'Bash' },
            },
            multiAgent: { enabled: true },
            tasks: { backend: 'github', repo: 'acme/demo', label: 'rb' },
            mcp: { enabled: true, tasksDir: 'work/tasks', archiveDir: 'work/archive' },
            permissions: { autoApprove: false },
            integrations: { typesafe: { enabled: true, askedAt: '2026-02-01T00:00:00.000Z' } },
            rulebookDir: '.rb',
            languages: ['typescript'],
            modular: false,
            skills: { enabled: ['languages/typescript'], disabled: ['core/rulebook'] },
            monorepo: { detected: true, tool: 'pnpm', packages: ['packages/a'] },
            agentFramework: { projectType: 'web-app', modelAssignment: { core: 'fable' } },
            referenceSource: { enabled: true, path: '../ref' },
        };
        const c = rebuildConfigOnUpdate(userSet, input());
        for (const key of [
            'orchestration',
            'gate',
            'multiAgent',
            'tasks',
            'mcp',
            'permissions',
            'integrations',
            'rulebookDir',
            'languages',
            'modular',
            'skills',
            'monorepo',
            'agentFramework',
            'referenceSource',
        ] as const) {
            expect(c[key], key).toEqual(userSet[key]);
        }
        expect(c.gate?.promptHook?.enabled).toBe(true);
    });

    it('still recomputes the fields update owns', () => {
        const c = rebuildConfigOnUpdate(
            { ...EXISTING, mode: 'minimal', gitPushMode: 'auto', agentsMode: 'full' },
            input({ gitPushMode: 'prompt' })
        );
        expect(c.mode).toBe('full');
        expect(c.gitPushMode).toBe('prompt');
        expect(c.agentsMode).toBe('lean');
        expect(c.features).toEqual(FEATURES);
        expect(
            rebuildConfigOnUpdate({ agentsMode: 'full' }, input({ leanMode: false })).agentsMode
        ).toBe('full');
    });

    it('drops keys that are not part of RulebookConfig', () => {
        const legacy = { ...EXISTING, lightMode: true, ralph: { enabled: true } };
        const c = rebuildConfigOnUpdate(legacy as Partial<RulebookConfig>, input());
        expect('lightMode' in c).toBe(false);
        expect('ralph' in c).toBe(false);
    });
});
