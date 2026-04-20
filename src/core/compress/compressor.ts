/**
 * Deterministic prose compressor for `rulebook compress`.
 *
 * Applies only SAFE transformations — filler-word removal, pleasantry
 * stripping, and redundant-phrase replacement. Never restructures
 * sentences, never touches code, URLs, paths, commands, dates, or
 * version numbers. That conservative scope is what makes the
 * validator in `validator.ts` a sufficient safety net.
 *
 * When richer compression is wanted (useMemo → stabilize, "implement
 * a solution for" → "fix"), the user can layer Claude-powered
 * rewriting on top of this module. The validator contract is
 * orthogonal to the rewriter — any future LLM-backed compressor gets
 * graded against the same invariants.
 *
 * Grounded in `.rulebook/specs/RULEBOOK_TERSE.md` §Compression
 * companion.
 */

import { extractors, validate, type ValidationResult } from './validator.js';

export interface CompressResult {
  output: string;
  retries: number;
  validation: ValidationResult;
}

export interface CompressOptions {
  /** Max retry count after validation failure. Defaults to 2. */
  maxRetries?: number;
}

// ── Transformation rules — order matters (phrase replacements first) ──

/** Redundant phrases → shorter synonym. Applied to prose only. */
const PHRASE_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/\bin order to\b/gi, 'to'],
  [/\bmake sure to\b/gi, 'ensure'],
  [/\bmake sure that\b/gi, 'ensure'],
  [/\bthe reason is because\b/gi, 'because'],
  [/\bthe reason why\b/gi, 'why'],
  [/\bat this point in time\b/gi, 'now'],
  [/\bwith regard to\b/gi, 'on'],
  [/\bwith respect to\b/gi, 'on'],
  [/\bdue to the fact that\b/gi, 'because'],
  [/\ba number of\b/gi, 'several'],
  [/\bfor the purpose of\b/gi, 'to'],
  [/\bit is important to note that\b/gi, ''],
  [/\bit should be noted that\b/gi, ''],
];

/** Leading pleasantries to strip from prose segments. */
const PLEASANTRY_PREFIXES: ReadonlyArray<RegExp> = [
  /^\s*(sure|certainly|of course)[,!.]?\s+/i,
  /^\s*(happy to help|great question|good point)[,!.]?\s+/i,
  /^\s*(i'd|i would) be happy to[^.]*\.\s+/i,
  /^\s*(let me)[^.]*\.\s+/i,
];

/** Filler words removed when they appear between word-boundaries. */
const FILLER_WORDS: ReadonlyArray<string> = [
  'just',
  'really',
  'basically',
  'actually',
  'simply',
  'essentially',
  'generally',
  'frankly',
  'honestly',
  'literally',
  'very',
  'quite',
  'perhaps',
  'maybe',
];

/** Hedging phrases to remove. */
const HEDGING_PATTERNS: ReadonlyArray<RegExp> = [
  /\bit might be worth\b/gi,
  /\byou could consider\b/gi,
  /\byou (?:may|might) want to\b/gi,
  /\bi (?:think|believe|feel) that\b/gi,
  // Lookahead uses `\s*\w` to tolerate whitespace collapsed by earlier
  // substitutions (e.g. "I think  consider" after a "you might want to"
  // strip leaves a double space before the next word).
  /\bi (?:think|believe|feel)\s+(?=\w)/gi,
  /\bin my opinion,?\s*/gi,
];

// ── Prose / protected-region splitter ─────────────────────────────────

interface Segment {
  protected: boolean;
  text: string;
}

/**
 * Split input into protected and prose segments.
 * Protected: fenced code blocks, inline code, URLs.
 * Everything else is prose.
 */
function segment(input: string): Segment[] {
  const segments: Segment[] = [];

  // Layered matches: fenced code, inline code, URLs. First we build a
  // mask of protected character ranges; prose is the complement.
  const mask = new Array<boolean>(input.length).fill(false);

  const markRanges = (re: RegExp): void => {
    const matches = input.matchAll(re);
    for (const m of matches) {
      if (m.index === undefined) continue;
      for (let i = m.index; i < m.index + m[0].length; i++) mask[i] = true;
    }
  };

  // Capture fenced code FIRST so inline-code inside ``` blocks doesn't
  // get double-marked (it's already inside a fenced region).
  markRanges(extractors.FENCED_CODE_RE);
  // Inline code — recomputed on a version where fenced blocks are
  // masked out so we don't match inside them.
  const stripped = input
    .split('')
    .map((c, i) => (mask[i] ? ' ' : c))
    .join('');
  const inlineMatches = stripped.matchAll(extractors.INLINE_CODE_RE);
  for (const m of inlineMatches) {
    if (m.index === undefined) continue;
    for (let i = m.index; i < m.index + m[0].length; i++) mask[i] = true;
  }
  markRanges(extractors.URL_RE);
  markRanges(extractors.PATH_RE);
  markRanges(extractors.DATE_RE);
  markRanges(extractors.VERSION_RE);

  // Now scan the mask to build contiguous segments.
  let i = 0;
  while (i < input.length) {
    const isProtected = mask[i];
    let j = i;
    while (j < input.length && mask[j] === isProtected) j++;
    segments.push({ protected: isProtected, text: input.slice(i, j) });
    i = j;
  }

  return segments;
}

// ── Prose rewriter ────────────────────────────────────────────────────

function stripFillerWord(text: string, word: string): string {
  // Remove ", just," / " just " / " just." patterns but preserve
  // sentence boundaries. Matches word only when surrounded by word
  // boundaries and whitespace, not at the start of a capitalized
  // sentence (where removal changes meaning more aggressively).
  const pattern = new RegExp(`(?<=\\s|^)${word}\\s+(?=[a-zA-Z])`, 'gi');
  return text.replace(pattern, '');
}

function compressProse(prose: string): string {
  let out = prose;

  // 1. Strip leading pleasantries.
  for (const re of PLEASANTRY_PREFIXES) {
    out = out.replace(re, '');
  }

  // 2. Remove hedging phrases.
  for (const re of HEDGING_PATTERNS) {
    out = out.replace(re, '');
  }

  // 3. Apply phrase replacements.
  for (const [re, repl] of PHRASE_REPLACEMENTS) {
    out = out.replace(re, repl);
  }

  // 4. Remove filler words (as standalone mid-sentence tokens).
  for (const word of FILLER_WORDS) {
    out = stripFillerWord(out, word);
  }

  // 5. Normalize whitespace artifacts introduced by deletions.
  out = out
    .replace(/\s+([,.;:!?])/g, '$1') // collapse space-before-punct
    .replace(/[ \t]{2,}/g, ' ') // collapse multiple spaces
    .replace(/\n[ \t]+\n/g, '\n\n'); // trim trailing whitespace on blank lines

  return out;
}

/**
 * Compress `input` using the deterministic rewriter. Returns the
 * compressed output along with the validation result and retry count.
 *
 * The retry loop is defensive: on this conservative algorithm we
 * should never produce a validation failure (we only touch prose
 * segments), so a failure means either (a) a prose segment
 * contained a protected pattern we missed, or (b) an unusual edge
 * case in the splitter. Retries progressively disable classes of
 * transformations to preserve as much safety as possible.
 */
export function compress(input: string, options: CompressOptions = {}): CompressResult {
  const maxRetries = options.maxRetries ?? 2;
  let retries = 0;
  let output = applyCompression(input, {
    pleasantries: true,
    hedging: true,
    phraseReplacements: true,
    fillerWords: true,
  });
  let validation = validate(input, output);

  while (!validation.ok && retries < maxRetries) {
    retries++;
    // On retry 1 → disable filler words (most aggressive class).
    // On retry 2 → also disable hedging.
    // If still failing, fall through and return the failure state.
    output = applyCompression(input, {
      pleasantries: true,
      hedging: retries < 2,
      phraseReplacements: true,
      fillerWords: false,
    });
    validation = validate(input, output);
  }

  return { output, retries, validation };
}

function applyCompression(
  input: string,
  enabled: {
    pleasantries: boolean;
    hedging: boolean;
    phraseReplacements: boolean;
    fillerWords: boolean;
  }
): string {
  const segs = segment(input);
  const pieces: string[] = [];
  for (const s of segs) {
    if (s.protected) {
      // Protected segments MUST pass through byte-identically.
      // No whitespace normalization, no substitutions.
      pieces.push(s.text);
      continue;
    }
    let rewritten = s.text;
    if (enabled.pleasantries) {
      for (const re of PLEASANTRY_PREFIXES) rewritten = rewritten.replace(re, '');
    }
    if (enabled.hedging) {
      for (const re of HEDGING_PATTERNS) rewritten = rewritten.replace(re, '');
    }
    if (enabled.phraseReplacements) {
      for (const [re, repl] of PHRASE_REPLACEMENTS) rewritten = rewritten.replace(re, repl);
    }
    if (enabled.fillerWords) {
      for (const word of FILLER_WORDS) rewritten = stripFillerWord(rewritten, word);
    }
    // Whitespace normalization INSIDE prose segments only. Keep
    // inter-paragraph blank lines (don't collapse \n\n → \n).
    rewritten = rewritten.replace(/ +([,.;:!?])/g, '$1').replace(/[ \t]{2,}/g, ' ');
    pieces.push(rewritten);
  }
  return pieces.join('');
}

/**
 * Exported for tests.
 */
export const __test__ = { compressProse, segment };
