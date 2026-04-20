/**
 * Validator for `rulebook compress`.
 *
 * The compressor may only rewrite prose. Everything that carries
 * technical substance MUST round-trip byte-identically between the
 * original file and the compressed output. This module defines the
 * protected-region extractors and the diff-checker that compares
 * them.
 *
 * Grounded in `.rulebook/specs/RULEBOOK_TERSE.md` §Compression
 * companion and `docs/analysis/caveman/02-skill-design.md`.
 */

export type ViolationKind =
  | 'heading-missing'
  | 'heading-text-changed'
  | 'fenced-code-changed'
  | 'inline-code-changed'
  | 'url-changed'
  | 'path-changed'
  | 'command-changed'
  | 'date-changed'
  | 'version-changed';

export interface Violation {
  kind: ViolationKind;
  detail: string;
}

export interface ValidationResult {
  ok: boolean;
  violations: Violation[];
  stats: {
    originalBytes: number;
    compressedBytes: number;
    ratio: number;
  };
}

// ── Regex patterns — all non-greedy, multiline where needed ───────────

const FENCED_CODE_RE = /```[\s\S]*?```/g;
const INLINE_CODE_RE = /(?<!`)`([^`\n]+)`(?!`)/g;
// URL must not consume trailing sentence-ending punctuation (. , ; : ! ?).
const URL_RE = /\bhttps?:\/\/[^\s)>\]"'`]*[^\s)>\]"'`.,;:!?]/g;
const DATE_RE = /\b\d{4}-\d{2}-\d{2}\b/g;
// Version numbers: optional `v`, then X.Y or X.Y.Z(-suffix).
const VERSION_RE = /\bv?\d+\.\d+(?:\.\d+)?(?:-[\w.]+)?\b/g;
// ATX-style markdown headings.
const HEADING_RE = /^(#{1,6})\s+(.+?)\s*$/gm;
// File paths. Three alternatives:
//   relative: `./foo/bar` or `../baz`
//   Windows : `C:\Users\...`
//   absolute Unix: `/usr/local/bin/node` — requires start-of-line or whitespace/paren prefix.
const PATH_RE = /(?:\.{1,2}\/[\w./\\-]+|[A-Za-z]:\\[\w./\\-]+|(?<=^|[\s(])\/[a-zA-Z][\w./\\-]+)/gm;

function normalize(arr: string[]): string[] {
  return arr.slice().sort();
}

function extract(source: string, re: RegExp): string[] {
  const out: string[] = [];
  const matches = source.matchAll(re);
  for (const m of matches) out.push(m[0]);
  return out;
}

/** Extract atomic markdown heading entries as "level\ttext" strings. */
function extractHeadings(source: string): string[] {
  const out: string[] = [];
  const matches = source.matchAll(HEADING_RE);
  for (const m of matches) out.push(`${m[1].length}\t${m[2]}`);
  return out;
}

/** Extract inline-code bodies (the text inside backticks). */
function extractInlineCode(source: string): string[] {
  const out: string[] = [];
  // Strip fenced blocks first so we don't double-count code inside ```.
  const scrubbed = source.replace(FENCED_CODE_RE, '');
  const matches = scrubbed.matchAll(INLINE_CODE_RE);
  for (const m of matches) out.push(m[1]);
  return out;
}

function diff(label: string, original: string[], compressed: string[]): Violation[] {
  const violations: Violation[] = [];
  const normalOrig = normalize(original);
  const normalComp = normalize(compressed);

  // Everything in original must appear in compressed, same count.
  const compCount = new Map<string, number>();
  for (const v of normalComp) compCount.set(v, (compCount.get(v) ?? 0) + 1);

  for (const v of normalOrig) {
    const n = compCount.get(v) ?? 0;
    if (n === 0) {
      violations.push({
        kind: label as ViolationKind,
        detail: `missing from compressed output: ${JSON.stringify(v).slice(0, 120)}`,
      });
    } else {
      compCount.set(v, n - 1);
    }
  }

  // Anything LEFT in compCount that came from compressed but wasn't in
  // original means the compressor introduced a new protected item (for
  // example by mistranscribing a URL). That is also a violation.
  for (const [v, n] of compCount) {
    if (n > 0) {
      violations.push({
        kind: label as ViolationKind,
        detail: `introduced in compressed output: ${JSON.stringify(v).slice(0, 120)}`,
      });
    }
  }

  return violations;
}

export function validate(original: string, compressed: string): ValidationResult {
  const violations: Violation[] = [];

  // Heading structure (level + text) must match exactly.
  violations.push(
    ...diff('heading-missing', extractHeadings(original), extractHeadings(compressed))
  );

  // Fenced code blocks — byte-for-byte, ordered.
  violations.push(
    ...diff('fenced-code-changed', extract(original, FENCED_CODE_RE), extract(compressed, FENCED_CODE_RE))
  );

  // Inline code bodies.
  violations.push(
    ...diff('inline-code-changed', extractInlineCode(original), extractInlineCode(compressed))
  );

  // URLs.
  violations.push(...diff('url-changed', extract(original, URL_RE), extract(compressed, URL_RE)));

  // File paths.
  violations.push(...diff('path-changed', extract(original, PATH_RE), extract(compressed, PATH_RE)));

  // Dates.
  violations.push(...diff('date-changed', extract(original, DATE_RE), extract(compressed, DATE_RE)));

  // Version numbers.
  violations.push(
    ...diff('version-changed', extract(original, VERSION_RE), extract(compressed, VERSION_RE))
  );

  const originalBytes = Buffer.byteLength(original, 'utf8');
  const compressedBytes = Buffer.byteLength(compressed, 'utf8');

  return {
    ok: violations.length === 0,
    violations,
    stats: {
      originalBytes,
      compressedBytes,
      ratio: originalBytes > 0 ? compressedBytes / originalBytes : 1,
    },
  };
}

/**
 * Exposed for tests and the compressor's retry logic.
 */
export const extractors = {
  FENCED_CODE_RE,
  INLINE_CODE_RE,
  URL_RE,
  DATE_RE,
  VERSION_RE,
  HEADING_RE,
  PATH_RE,
  extractHeadings,
  extractInlineCode,
};
