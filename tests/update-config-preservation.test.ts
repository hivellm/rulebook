import { describe, it, expect } from 'vitest';
import { rebuildConfigOnUpdate, type ConfigRebuildInput } from '../src/cli/commands/update';
import type { RulebookConfig } from '../src/types';

/**
 * `rulebook update` replaces rulebook.json with a rebuilt config. The rebuild
 * must carry forward what the operator (or an earlier install) decided:
 * `installedAt` and `integrations` — a stored TypeSafe "no" included.
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
});
