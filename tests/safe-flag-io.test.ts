/**
 * Unit tests for `src/hooks/safe-flag-io.ts`.
 *
 * Grounded in the attack model documented in
 * `docs/analysis/caveman/06-hook-deep-dive.md` §Security.
 *
 * Every platform-specific test (symlink creation) degrades gracefully
 * on Windows dev environments where symlink creation requires
 * Developer Mode / Administrator — those tests check availability and
 * skip rather than fail.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  safeWriteFlag,
  readFlag,
  VALID_MODES,
  MAX_FLAG_BYTES,
} from '../src/hooks/safe-flag-io.js';

let testDir: string;
let flagPath: string;

beforeEach(() => {
  testDir = join(tmpdir(), `rulebook-safe-flag-${process.pid}-${Date.now()}`);
  mkdirSync(testDir, { recursive: true });
  flagPath = join(testDir, '.rulebook-terse-mode');
});

afterEach(() => {
  try {
    rmSync(testDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
});

/**
 * Probe whether we can create a symlink on this platform. Evaluated
 * ONCE at module load because `it.skipIf()` decisions run before
 * `beforeEach` (so `testDir` is not yet defined inside each test).
 * On Windows dev boxes without Developer Mode this returns false and
 * the symlink-specific tests are skipped cleanly.
 */
const SYMLINK_SUPPORTED: boolean = (() => {
  const probeDir = join(tmpdir(), `rulebook-safe-flag-probe-${process.pid}`);
  const probeTarget = join(probeDir, 'target');
  const probeLink = join(probeDir, 'link');
  try {
    mkdirSync(probeDir, { recursive: true });
    writeFileSync(probeTarget, 'x');
    symlinkSync(probeTarget, probeLink);
    return true;
  } catch {
    return false;
  } finally {
    try {
      rmSync(probeDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
})();

describe('safe-flag-io — VALID_MODES + MAX_FLAG_BYTES contract', () => {
  it('VALID_MODES is the authoritative whitelist', () => {
    expect([...VALID_MODES].sort()).toEqual([
      'brief',
      'commit',
      'off',
      'review',
      'terse',
      'ultra',
    ]);
  });

  it('every VALID_MODES entry fits well under MAX_FLAG_BYTES', () => {
    for (const mode of VALID_MODES) {
      expect(Buffer.byteLength(mode, 'utf8')).toBeLessThanOrEqual(MAX_FLAG_BYTES);
    }
  });

  it('MAX_FLAG_BYTES is ≥ 16 (room for future modes) and ≤ 64 (exfil cap)', () => {
    expect(MAX_FLAG_BYTES).toBeGreaterThanOrEqual(16);
    expect(MAX_FLAG_BYTES).toBeLessThanOrEqual(64);
  });
});

describe('safe-flag-io — safeWriteFlag happy path', () => {
  it('writes the content exactly', () => {
    safeWriteFlag(flagPath, 'brief');
    expect(readFileSync(flagPath, 'utf8')).toBe('brief');
  });

  it('overwrites existing content via atomic rename', () => {
    safeWriteFlag(flagPath, 'brief');
    safeWriteFlag(flagPath, 'ultra');
    expect(readFileSync(flagPath, 'utf8')).toBe('ultra');
  });

  it('creates the parent directory when missing', () => {
    const deep = join(testDir, 'nested', 'deeper', '.rulebook-terse-mode');
    safeWriteFlag(deep, 'terse');
    expect(existsSync(deep)).toBe(true);
  });

  it.skipIf(process.platform === 'win32')(
    'writes file with 0600 permissions',
    () => {
      safeWriteFlag(flagPath, 'brief');
      const mode = statSync(flagPath).mode & 0o777;
      expect(mode).toBe(0o600);
    }
  );

  it('leaves no leftover temp files on success', () => {
    safeWriteFlag(flagPath, 'brief');
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const entries = readdirSync(testDir);
    const temps = entries.filter((e: string) => e.includes('.tmp.'));
    expect(temps).toHaveLength(0);
  });
});

describe('safe-flag-io — safeWriteFlag refuses symlinks', () => {
  it.skipIf(!SYMLINK_SUPPORTED)('refuses to write through a symlink at the target', () => {
    const secret = join(testDir, 'secret.txt');
    writeFileSync(secret, 'SECRET_CONTENT');
    symlinkSync(secret, flagPath);

    safeWriteFlag(flagPath, 'brief');

    // The secret must still contain its original content — no clobber.
    expect(readFileSync(secret, 'utf8')).toBe('SECRET_CONTENT');
  });

  it.skipIf(!SYMLINK_SUPPORTED)('refuses to write when the parent directory is a symlink', () => {
    const realDir = join(testDir, 'real-config');
    mkdirSync(realDir, { recursive: true });
    const linkedDir = join(testDir, 'linked-config');
    symlinkSync(realDir, linkedDir);

    const flagViaLink = join(linkedDir, '.rulebook-terse-mode');
    safeWriteFlag(flagViaLink, 'brief');

    // No file should have been created via the symlinked parent.
    expect(existsSync(join(realDir, '.rulebook-terse-mode'))).toBe(false);
  });
});

describe('safe-flag-io — safeWriteFlag silent-fails on error', () => {
  it('does not throw when the target path is totally invalid', () => {
    const bogus = '\0\0\0';
    expect(() => safeWriteFlag(bogus, 'brief')).not.toThrow();
  });

  it('does not throw on unwritable parent (best-effort contract)', () => {
    // Simulate unwritable by pointing at a null-byte path.
    const unwritable = join('\0', 'flag');
    expect(() => safeWriteFlag(unwritable, 'brief')).not.toThrow();
  });
});

describe('safe-flag-io — readFlag happy path', () => {
  it('round-trips every valid mode', () => {
    for (const mode of VALID_MODES) {
      safeWriteFlag(flagPath, mode);
      expect(readFlag(flagPath)).toBe(mode);
    }
  });

  it('trims whitespace and normalizes case before validating', () => {
    writeFileSync(flagPath, '  BRIEF  \n', { mode: 0o600 });
    expect(readFlag(flagPath)).toBe('brief');
  });

  it('returns null when the file does not exist', () => {
    expect(readFlag(join(testDir, 'absent'))).toBeNull();
  });
});

describe('safe-flag-io — readFlag rejects anomalies', () => {
  it('returns null for non-whitelist content', () => {
    writeFileSync(flagPath, 'banana', { mode: 0o600 });
    expect(readFlag(flagPath)).toBeNull();
  });

  it('returns null when file exceeds MAX_FLAG_BYTES (exfil defense)', () => {
    // Simulate a symlink-to-secret where the "secret" is larger than
    // the cap. readFlag should refuse before reading the payload.
    writeFileSync(flagPath, 'brief' + 'A'.repeat(MAX_FLAG_BYTES + 1), {
      mode: 0o600,
    });
    expect(readFlag(flagPath)).toBeNull();
  });

  it.skipIf(!SYMLINK_SUPPORTED)('returns null when the target is a symlink', () => {
    const real = join(testDir, 'real-content');
    writeFileSync(real, 'brief');
    symlinkSync(real, flagPath);

    expect(readFlag(flagPath)).toBeNull();
  });

  it('returns null for empty file', () => {
    writeFileSync(flagPath, '', { mode: 0o600 });
    expect(readFlag(flagPath)).toBeNull();
  });

  it('returns null for binary garbage', () => {
    writeFileSync(flagPath, Buffer.from([0x00, 0xff, 0xca, 0xfe, 0xba, 0xbe]), {
      mode: 0o600,
    });
    expect(readFlag(flagPath)).toBeNull();
  });
});

describe('safe-flag-io — concurrent writes do not corrupt', () => {
  it('two writes in sequence leave exactly one valid file', () => {
    safeWriteFlag(flagPath, 'brief');
    safeWriteFlag(flagPath, 'ultra');
    expect(readFlag(flagPath)).toBe('ultra');

    // No leftover tmp files.
    const { readdirSync } = require('node:fs') as typeof import('node:fs');
    const entries = readdirSync(testDir);
    expect(entries.filter((e: string) => e.includes('.tmp.')).length).toBe(0);
  });

  it('parallel writes using Promise.all produce one valid final state', async () => {
    await Promise.all([
      Promise.resolve().then(() => safeWriteFlag(flagPath, 'brief')),
      Promise.resolve().then(() => safeWriteFlag(flagPath, 'terse')),
      Promise.resolve().then(() => safeWriteFlag(flagPath, 'ultra')),
    ]);
    const result = readFlag(flagPath);
    expect(result).not.toBeNull();
    expect(VALID_MODES).toContain(result!);
  });
});
