/**
 * Unit tests for `src/hooks/terse-config.ts`.
 *
 * Verifies the 5-tier mode-resolution chain and the tier-aware
 * defaults. Each tier is tested in isolation by feeding only that
 * tier's input.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  getDefaultMode,
  getFlagPath,
  getProjectConfigPath,
  getUserGlobalConfigPath,
  resolveTierDefault,
} from '../src/hooks/terse-config.js';

let projectRoot: string;

beforeEach(() => {
  projectRoot = join(tmpdir(), `rulebook-terse-config-${Date.now()}-${process.pid}`);
  mkdirSync(projectRoot, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(projectRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('terse-config — resolveTierDefault', () => {
  it('research / haiku → terse', () => {
    expect(resolveTierDefault('research')).toBe('terse');
    expect(resolveTierDefault('haiku')).toBe('terse');
    expect(resolveTierDefault('HAIKU')).toBe('terse');
  });

  it('standard / sonnet / team-lead → brief', () => {
    expect(resolveTierDefault('standard')).toBe('brief');
    expect(resolveTierDefault('sonnet')).toBe('brief');
    expect(resolveTierDefault('team-lead')).toBe('brief');
  });

  it('core / opus → off', () => {
    expect(resolveTierDefault('core')).toBe('off');
    expect(resolveTierDefault('opus')).toBe('off');
  });

  it('unknown tier → null', () => {
    expect(resolveTierDefault('no-such-tier')).toBeNull();
    expect(resolveTierDefault('')).toBeNull();
    expect(resolveTierDefault(undefined)).toBeNull();
  });
});

describe('terse-config — path helpers', () => {
  it('getFlagPath points to <project>/.rulebook/.terse-mode', () => {
    const path = getFlagPath(projectRoot);
    expect(path).toBe(join(projectRoot, '.rulebook', '.terse-mode'));
  });

  it('getProjectConfigPath points to <project>/.rulebook/rulebook.json', () => {
    expect(getProjectConfigPath(projectRoot)).toBe(
      join(projectRoot, '.rulebook', 'rulebook.json')
    );
  });

  it('getUserGlobalConfigPath honors XDG_CONFIG_HOME', () => {
    const xdg = '/tmp/xdg-fake';
    const path = getUserGlobalConfigPath({ XDG_CONFIG_HOME: xdg } as NodeJS.ProcessEnv);
    expect(path).toBe(join(xdg, 'rulebook', 'config.json'));
  });
});

describe('terse-config — getDefaultMode resolution chain', () => {
  it('env var wins over every other source', () => {
    mkdirSync(join(projectRoot, '.rulebook'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.rulebook', 'rulebook.json'),
      JSON.stringify({ terse: { defaultMode: 'brief' } })
    );

    const mode = getDefaultMode({
      env: { RULEBOOK_TERSE_MODE: 'ultra' } as NodeJS.ProcessEnv,
      projectRoot,
      tier: 'research', // would normally imply 'terse'
    });
    expect(mode).toBe('ultra');
  });

  it('env var with invalid value falls through', () => {
    const mode = getDefaultMode({
      env: { RULEBOOK_TERSE_MODE: 'not-a-mode' } as NodeJS.ProcessEnv,
      projectRoot,
    });
    expect(mode).toBe('brief'); // fallback
  });

  it('project-local config beats user-global', () => {
    mkdirSync(join(projectRoot, '.rulebook'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.rulebook', 'rulebook.json'),
      JSON.stringify({ terse: { defaultMode: 'terse' } })
    );

    const mode = getDefaultMode({
      env: {} as NodeJS.ProcessEnv,
      projectRoot,
    });
    expect(mode).toBe('terse');
  });

  it('tier default applies when no config or env is set', () => {
    const mode = getDefaultMode({
      env: {} as NodeJS.ProcessEnv,
      projectRoot,
      tier: 'haiku',
    });
    expect(mode).toBe('terse');
  });

  it('falls back to brief when nothing else resolves', () => {
    const mode = getDefaultMode({
      env: {} as NodeJS.ProcessEnv,
      projectRoot,
    });
    expect(mode).toBe('brief');
  });

  it('malformed project config is silently ignored', () => {
    mkdirSync(join(projectRoot, '.rulebook'), { recursive: true });
    writeFileSync(
      join(projectRoot, '.rulebook', 'rulebook.json'),
      '{"terse": {not valid json'
    );
    const mode = getDefaultMode({ env: {} as NodeJS.ProcessEnv, projectRoot });
    expect(mode).toBe('brief');
  });

  it('accepts all six VALID_MODES from env', () => {
    for (const v of ['off', 'brief', 'terse', 'ultra', 'commit', 'review']) {
      const mode = getDefaultMode({
        env: { RULEBOOK_TERSE_MODE: v } as NodeJS.ProcessEnv,
        projectRoot,
      });
      expect(mode).toBe(v);
    }
  });
});
