/**
 * Symlink-safe, size-capped, whitelist-validated flag file I/O.
 *
 * Rulebook hooks coordinate via small flag files at predictable user-
 * owned paths (`.rulebook/.terse-mode`, `~/.rulebook/.state`, etc.).
 * Without hardening, these are vulnerable to two classes of local
 * attack by any process with write access to the flag directory:
 *
 *   1. **Clobber** — attacker replaces the flag with a symlink to
 *      another file (e.g. `~/.ssh/authorized_keys`). The next hook
 *      write destroys that file.
 *
 *   2. **Exfil** — attacker replaces the flag with a symlink to a
 *      user-readable secret (e.g. `~/.ssh/id_rsa`). The next hook
 *      read slurps the private key and the reinforcement hook
 *      injects its contents into model context, where subsequent
 *      turns can leak it via output or tool calls.
 *
 * This module closes both attack classes with defense-in-depth:
 *
 *   - `lstat` pre-check refuses symlinks at the target AND at the
 *     immediate parent directory.
 *   - `O_NOFOLLOW` on open where the platform supports it — symlink
 *     races during the window after lstat cause the open to fail.
 *   - Atomic write via temp + rename with `0600` permissions.
 *   - Reads are capped at `MAX_FLAG_BYTES` (32) — the longest valid
 *     value is "rulebook-terse-review-full" which is well under that.
 *   - Reads validate against `VALID_MODES`; anything else returns null.
 *   - Silent-fail on every filesystem error. A broken flag file must
 *     never block session start or poison a reinforcement hook.
 *
 * Grounded in `docs/analysis/caveman/06-hook-deep-dive.md`.
 */

import {
  closeSync,
  constants,
  fchmodSync,
  lstatSync,
  openSync,
  readSync,
  renameSync,
  writeSync,
  mkdirSync,
} from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Whitelist of acceptable mode strings.
 *
 * Keep in sync with `.rulebook/specs/RULEBOOK_TERSE.md` §Intensity Levels
 * and §Sub-skills. Every string here is a possible contents of the flag
 * file; anything else read from disk is rejected.
 */
export const VALID_MODES = ['off', 'brief', 'terse', 'ultra', 'commit', 'review'] as const;

export type TerseMode = (typeof VALID_MODES)[number];

/**
 * Hard cap on how many bytes `readFlag` will ever read. The longest
 * legitimate value is `review` at 6 bytes; 32 leaves ample slack
 * without enabling a useful exfiltration primitive.
 */
export const MAX_FLAG_BYTES = 32;

/**
 * True if `O_NOFOLLOW` is a real flag on this platform (Linux/macOS).
 * On Windows it is typically undefined; we fall back to the lstat
 * pre-check alone. That still protects against the pre-open symlink
 * case; Windows symlinks are also far less common on user profiles.
 */
const O_NOFOLLOW = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;

function isValidMode(s: string): s is TerseMode {
  return (VALID_MODES as readonly string[]).includes(s);
}

/**
 * Write `content` to `flagPath` safely.
 *
 * Contract:
 *   - Refuses if `flagPath` already exists as a symlink.
 *   - Refuses if the parent directory is a symlink.
 *   - Creates with `0600` mode.
 *   - Atomic: writes to `<flagPath>.tmp-<pid>-<ts>`, then renames.
 *   - Silent-fails on any other filesystem error.
 *
 * `content` is coerced to a string. Callers should pass one of the
 * `VALID_MODES` entries — the function does NOT validate input, since
 * this is useful for test fixtures that want to simulate corruption.
 */
export function safeWriteFlag(flagPath: string, content: string): void {
  try {
    const flagDir = dirname(flagPath);

    // Ensure the parent exists. If a parent along the chain is a
    // symlink, that is NOT caught here — we only guard the immediate
    // parent because macOS legitimately routes home directories
    // through symlinks (`/tmp → /private/tmp`) and a full walk would
    // produce false positives. The attack surface requires write
    // access to the immediate parent, which is what we check.
    mkdirSync(flagDir, { recursive: true });

    try {
      if (lstatSync(flagDir).isSymbolicLink()) return;
    } catch {
      return;
    }

    try {
      if (lstatSync(flagPath).isSymbolicLink()) return;
    } catch (e) {
      const code = (e as NodeJS.ErrnoException).code;
      if (code !== 'ENOENT') return;
    }

    const tempPath = join(flagDir, `.terse-mode.tmp.${process.pid}.${Date.now()}`);
    const flags = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | O_NOFOLLOW;

    let fd: number | undefined;
    try {
      fd = openSync(tempPath, flags, 0o600);
      writeSync(fd, String(content));
      // Best-effort chmod — Windows ignores but doesn't throw.
      try {
        fchmodSync(fd, 0o600);
      } catch {
        /* ignored on platforms where fchmod is a no-op */
      }
    } finally {
      if (fd !== undefined) closeSync(fd);
    }

    renameSync(tempPath, flagPath);
  } catch {
    // Silent fail — flag is best-effort.
  }
}

/**
 * Read `flagPath` and return a validated mode, or null on any anomaly.
 *
 * Contract:
 *   - Returns null if target is missing, not a regular file, or a
 *     symlink.
 *   - Returns null if file size exceeds `MAX_FLAG_BYTES` (defense
 *     against symlink-to-secret exfil).
 *   - Returns null if the content (trimmed, lowercased) is not in
 *     `VALID_MODES`.
 *   - Silent-fails on any other filesystem error.
 */
export function readFlag(flagPath: string): TerseMode | null {
  try {
    let st;
    try {
      st = lstatSync(flagPath);
    } catch {
      return null;
    }

    if (st.isSymbolicLink() || !st.isFile()) return null;
    if (st.size > MAX_FLAG_BYTES) return null;

    const flags = constants.O_RDONLY | O_NOFOLLOW;
    let fd: number | undefined;
    let raw: string;
    try {
      fd = openSync(flagPath, flags);
      const buf = Buffer.alloc(MAX_FLAG_BYTES);
      const n = readSync(fd, buf, 0, MAX_FLAG_BYTES, 0);
      raw = buf.subarray(0, n).toString('utf8');
    } finally {
      if (fd !== undefined) closeSync(fd);
    }

    const normalized = raw.trim().toLowerCase();
    return isValidMode(normalized) ? normalized : null;
  } catch {
    return null;
  }
}
