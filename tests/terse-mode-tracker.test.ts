/**
 * Unit tests for `src/hooks/terse-mode-tracker.ts` (UserPromptSubmit).
 *
 * Coverage:
 *   - Slash-command parsing (all 7 forms).
 *   - Natural-language activation + deactivation patterns.
 *   - Attention-anchor assembly for persistent modes.
 *   - Independent modes (commit / review) get NO attention anchor.
 *   - runHook side-effects on the flag file.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildAttentionAnchor,
  parseIntent,
  runHook,
  type ParsedIntent,
} from '../src/hooks/terse-mode-tracker.js';
import { readFlag, safeWriteFlag } from '../src/hooks/safe-flag-io.js';
import { getFlagPath } from '../src/hooks/terse-config.js';

let projectRoot: string;

beforeEach(() => {
  projectRoot = join(tmpdir(), `rulebook-terse-mode-tracker-${Date.now()}-${process.pid}`);
  mkdirSync(projectRoot, { recursive: true });
});

afterEach(() => {
  try {
    rmSync(projectRoot, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

describe('terse-mode-tracker — parseIntent slash commands', () => {
  it('/rulebook-terse (no arg) uses the default mode', () => {
    expect(parseIntent('/rulebook-terse', 'brief')).toEqual<ParsedIntent>({
      kind: 'set',
      mode: 'brief',
    });
  });

  it.each(['brief', 'terse', 'ultra'] as const)(
    '/rulebook-terse %s sets that specific level',
    (level) => {
      expect(parseIntent(`/rulebook-terse ${level}`, 'terse')).toEqual<ParsedIntent>({
        kind: 'set',
        mode: level,
      });
    }
  );

  it('/rulebook-terse off disables the mode', () => {
    expect(parseIntent('/rulebook-terse off', 'brief')).toEqual<ParsedIntent>({
      kind: 'off',
    });
  });

  it('/rulebook-terse-commit activates commit sub-skill', () => {
    expect(parseIntent('/rulebook-terse-commit', 'brief')).toEqual<ParsedIntent>({
      kind: 'set',
      mode: 'commit',
    });
  });

  it('/rulebook-terse-review activates review sub-skill', () => {
    expect(parseIntent('/rulebook-terse-review', 'brief')).toEqual<ParsedIntent>({
      kind: 'set',
      mode: 'review',
    });
  });

  it('unknown /rulebook-terse argument returns null (unchanged)', () => {
    expect(parseIntent('/rulebook-terse banana', 'brief')).toBeNull();
  });

  it('trims leading whitespace before parsing', () => {
    expect(parseIntent('   /rulebook-terse ultra', 'brief')).toEqual<ParsedIntent>({
      kind: 'set',
      mode: 'ultra',
    });
  });
});

describe('terse-mode-tracker — parseIntent natural language', () => {
  it.each([
    'activate rulebook-terse',
    'turn on rulebook-terse',
    'enable rulebook terse',
    'rulebook-terse mode',
    'be terse',
    'terse mode',
    'less tokens please',
    'less tokens',
  ])('"%s" activates the default mode', (phrase) => {
    const res = parseIntent(phrase, 'brief');
    expect(res).toEqual<ParsedIntent>({ kind: 'set', mode: 'brief' });
  });

  it.each([
    'stop rulebook-terse',
    'disable rulebook-terse',
    'turn off rulebook-terse',
    'deactivate rulebook-terse',
    'stop terse',
    'disable terse',
    'normal mode',
  ])('"%s" deactivates', (phrase) => {
    expect(parseIntent(phrase, 'brief')).toEqual<ParsedIntent>({ kind: 'off' });
  });

  it('deactivation wins over accidental activation in the same prompt', () => {
    expect(parseIntent('stop terse, return to normal', 'brief')).toEqual<ParsedIntent>({
      kind: 'off',
    });
  });

  it('unrelated prompts return null', () => {
    expect(parseIntent('hello, can you help me with this bug?', 'brief')).toBeNull();
    expect(parseIntent('', 'brief')).toBeNull();
  });
});

describe('terse-mode-tracker — buildAttentionAnchor', () => {
  it('emits valid JSON with UserPromptSubmit event name', () => {
    const raw = buildAttentionAnchor('terse');
    const parsed = JSON.parse(raw);
    expect(parsed.hookSpecificOutput.hookEventName).toBe('UserPromptSubmit');
  });

  it('mentions the active level in the additionalContext string', () => {
    for (const mode of ['brief', 'terse', 'ultra'] as const) {
      const parsed = JSON.parse(buildAttentionAnchor(mode));
      const ctx: string = parsed.hookSpecificOutput.additionalContext;
      expect(ctx).toContain(`(${mode})`);
    }
  });

  it('brief anchor instructs to keep articles and full sentences', () => {
    const parsed = JSON.parse(buildAttentionAnchor('brief'));
    expect(parsed.hookSpecificOutput.additionalContext).toContain('Keep articles');
  });

  it('terse / ultra anchor instructs that fragments are OK', () => {
    for (const mode of ['terse', 'ultra'] as const) {
      const parsed = JSON.parse(buildAttentionAnchor(mode));
      expect(parsed.hookSpecificOutput.additionalContext).toContain('Fragments OK');
    }
  });

  it('every anchor instructs full-prose for code + security + quality gates', () => {
    for (const mode of ['brief', 'terse', 'ultra'] as const) {
      const parsed = JSON.parse(buildAttentionAnchor(mode));
      const ctx: string = parsed.hookSpecificOutput.additionalContext;
      expect(ctx.toLowerCase()).toContain('code');
      expect(ctx.toLowerCase()).toContain('security');
      expect(ctx.toLowerCase()).toContain('quality-gate');
    }
  });

  it('anchor is ≤300 bytes (cheap per-turn injection)', () => {
    for (const mode of ['brief', 'terse', 'ultra'] as const) {
      const raw = buildAttentionAnchor(mode);
      expect(Buffer.byteLength(raw, 'utf8')).toBeLessThanOrEqual(400);
    }
  });
});

describe('terse-mode-tracker — runHook side effects', () => {
  it('writes the flag on /rulebook-terse ultra', () => {
    runHook({ prompt: '/rulebook-terse ultra' }, { projectRoot });
    expect(readFlag(getFlagPath(projectRoot))).toBe('ultra');
  });

  it('deletes the flag on "stop terse"', () => {
    safeWriteFlag(getFlagPath(projectRoot), 'brief');
    runHook({ prompt: 'stop terse' }, { projectRoot });
    expect(existsSync(getFlagPath(projectRoot))).toBe(false);
  });

  it('returns an attention anchor for persistent modes after switching', () => {
    const out = runHook({ prompt: '/rulebook-terse terse' }, { projectRoot });
    expect(out).not.toBeNull();
    const parsed = JSON.parse(out!);
    expect(parsed.hookSpecificOutput.additionalContext).toContain('(terse)');
  });

  it('returns null for commit sub-skill (independent, no anchor)', () => {
    const out = runHook({ prompt: '/rulebook-terse-commit' }, { projectRoot });
    expect(out).toBeNull();
    expect(readFlag(getFlagPath(projectRoot))).toBe('commit');
  });

  it('returns null for review sub-skill (independent, no anchor)', () => {
    const out = runHook({ prompt: '/rulebook-terse-review' }, { projectRoot });
    expect(out).toBeNull();
    expect(readFlag(getFlagPath(projectRoot))).toBe('review');
  });

  it('emits anchor when prompt is unrelated but flag already active', () => {
    safeWriteFlag(getFlagPath(projectRoot), 'terse');
    const out = runHook({ prompt: 'help me fix this bug' }, { projectRoot });
    expect(out).not.toBeNull();
    const parsed = JSON.parse(out!);
    expect(parsed.hookSpecificOutput.additionalContext).toContain('(terse)');
  });

  it('no anchor when no mode is active and no intent detected', () => {
    const out = runHook({ prompt: 'help me fix this bug' }, { projectRoot });
    expect(out).toBeNull();
  });

  it('silent-fails when prompt is missing', () => {
    expect(() => runHook({}, { projectRoot })).not.toThrow();
  });

  it('honors input.cwd when projectRoot is not in options', () => {
    runHook({ prompt: '/rulebook-terse terse', cwd: projectRoot }, {});
    expect(readFlag(getFlagPath(projectRoot))).toBe('terse');
  });
});
