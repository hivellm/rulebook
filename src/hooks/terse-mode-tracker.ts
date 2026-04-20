/**
 * Claude Code UserPromptSubmit hook for rulebook-terse.
 *
 * Runs on every user message. Three responsibilities:
 *
 *   1. **Mode switching.** Parses slash commands (`/rulebook-terse`,
 *      `/rulebook-terse brief|terse|ultra|off`, `/rulebook-terse-commit`,
 *      `/rulebook-terse-review`) and natural-language activation
 *      phrases ("be terse", "less tokens please", "terse mode",
 *      "activate rulebook-terse"). Writes the resolved mode to the
 *      flag file via `safeWriteFlag`.
 *
 *   2. **Mode deactivation.** Recognizes "normal mode", "stop terse",
 *      "disable terse", etc. Deletes the flag file.
 *
 *   3. **Per-turn reinforcement.** When the flag is set to a persistent
 *      mode (brief / terse / ultra), emits a short ~45 token attention
 *      anchor as `hookSpecificOutput.additionalContext` JSON. The
 *      SessionStart hook supplied the full rules once; this reminder
 *      keeps the register in the model's attention when other plugins
 *      inject competing instructions mid-conversation.
 *
 *      Independent modes (commit / review) do not get the anchor —
 *      they have their own skill files that fully own the behavior
 *      during the single turn they're invoked.
 *
 * Silent-fails on every filesystem error. A broken hook must NEVER
 * prevent a user message from reaching the model.
 */

import { unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { readFlag, safeWriteFlag, type TerseMode } from './safe-flag-io.js';
import { getDefaultMode, getFlagPath } from './terse-config.js';

/**
 * Modes whose behavior is fully handled by their own sub-skill file
 * and do NOT get a per-turn attention anchor.
 */
const INDEPENDENT_MODES: ReadonlySet<TerseMode> = new Set(['commit', 'review']);

/**
 * Natural-language activation patterns. Matched case-insensitively.
 * Both orderings are accepted ("activate caveman" and "caveman mode").
 */
const ACTIVATION_PATTERNS: readonly RegExp[] = [
  /\b(activate|enable|turn\s+on|start)\b.*\brulebook[-\s]?terse\b/i,
  /\brulebook[-\s]?terse\b.*\b(mode|activate|enable|turn\s+on|start)\b/i,
  /\bbe\s+terse\b/i,
  /\bterse\s+mode\b/i,
  /\bless\s+tokens?\s*(please)?\b/i,
];

/**
 * Natural-language deactivation patterns.
 */
const DEACTIVATION_PATTERNS: readonly RegExp[] = [
  /\b(stop|disable|turn\s+off|deactivate)\b.*\brulebook[-\s]?terse\b/i,
  /\brulebook[-\s]?terse\b.*\b(stop|disable|turn\s+off|deactivate)\b/i,
  /\b(stop|disable)\s+terse\b/i,
  /\bnormal\s+mode\b/i,
];

/**
 * Result of parsing a user prompt. `null` means no mode change is
 * implied by the prompt.
 */
export type ParsedIntent =
  | { kind: 'set'; mode: TerseMode }
  | { kind: 'off' }
  | null;

/**
 * Parse a user prompt for an intent to activate, switch, or disable
 * rulebook-terse. Slash commands take priority over natural language;
 * natural-language deactivation takes priority over activation when
 * both appear in the same prompt.
 *
 * `defaultMode` is used for plain `/rulebook-terse` (no argument).
 */
export function parseIntent(prompt: string, defaultMode: TerseMode): ParsedIntent {
  const trimmed = prompt.trim();
  const lower = trimmed.toLowerCase();

  // Slash commands — highest priority, exact surface.
  if (lower.startsWith('/rulebook-terse')) {
    const parts = lower.split(/\s+/);
    const cmd = parts[0];
    const arg = parts[1] ?? '';

    if (cmd === '/rulebook-terse-commit') {
      return { kind: 'set', mode: 'commit' };
    }
    if (cmd === '/rulebook-terse-review') {
      return { kind: 'set', mode: 'review' };
    }
    if (cmd === '/rulebook-terse') {
      switch (arg) {
        case 'off':
          return { kind: 'off' };
        case 'brief':
        case 'terse':
        case 'ultra':
        case 'commit':
        case 'review':
          return { kind: 'set', mode: arg };
        case '':
          return { kind: 'set', mode: defaultMode };
        default:
          return null; // Unknown subcommand — leave mode unchanged.
      }
    }
  }

  // Natural-language deactivation first — "stop terse" should win over
  // a stray "terse" that happens to also match activation.
  if (DEACTIVATION_PATTERNS.some((re) => re.test(trimmed))) {
    return { kind: 'off' };
  }

  if (ACTIVATION_PATTERNS.some((re) => re.test(trimmed))) {
    return { kind: 'set', mode: defaultMode };
  }

  return null;
}

/**
 * Build the per-turn attention-anchor JSON emitted when a persistent
 * mode is active. Format matches Claude Code's `hookSpecificOutput`
 * contract for UserPromptSubmit hooks.
 */
export function buildAttentionAnchor(mode: TerseMode): string {
  const text =
    `RULEBOOK-TERSE ACTIVE (${mode}). ` +
    `Drop filler/hedging/pleasantries. ` +
    (mode === 'brief' ? 'Keep articles and full sentences.' : 'Fragments OK.') +
    ` Code/tests/commits/security: write full. Quality-gate failures + destructive ops: write full.`;

  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: text,
    },
  });
}

/**
 * Read an entire JSON object from a readable stream. Claude Code
 * passes hook input as `{ prompt, cwd, ... }` on stdin.
 */
async function readAllStdin(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : (chunk as Buffer));
  }
  return Buffer.concat(chunks).toString('utf8');
}

/**
 * Core hook logic, pure and testable. Given an input object and
 * options, returns the string (if any) that should be emitted to
 * stdout, and performs the flag-file side effects.
 */
export function runHook(
  input: { prompt?: string; cwd?: string },
  options: {
    projectRoot?: string;
    env?: NodeJS.ProcessEnv;
  } = {}
): string | null {
  try {
    const prompt = input.prompt ?? '';
    const projectRoot = options.projectRoot ?? input.cwd ?? process.cwd();
    const env = options.env ?? process.env;
    const flagPath = getFlagPath(projectRoot);

    // Resolve default-mode fresh each turn so env changes take effect.
    const defaultMode = getDefaultMode({ env, projectRoot, tier: env.RULEBOOK_AGENT_TIER });

    const intent = parseIntent(prompt, defaultMode);

    if (intent?.kind === 'off') {
      try {
        unlinkSync(flagPath);
      } catch {
        /* flag already absent — fine */
      }
      return null;
    }

    if (intent?.kind === 'set') {
      if (intent.mode === 'off') {
        try {
          unlinkSync(flagPath);
        } catch {
          /* fine */
        }
        return null;
      }
      safeWriteFlag(flagPath, intent.mode);
    }

    // Read whatever mode is now persisted (may be set by this turn or
    // a previous one) and emit the attention anchor for persistent
    // modes only.
    const currentMode = readFlag(flagPath);
    if (currentMode && currentMode !== 'off' && !INDEPENDENT_MODES.has(currentMode)) {
      return buildAttentionAnchor(currentMode);
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * CLI entry. Reads JSON from stdin, invokes `runHook`, emits any
 * returned string to stdout. Always exits 0.
 */
export async function main(
  options: {
    stdin?: NodeJS.ReadableStream;
    stdout?: NodeJS.WriteStream;
    projectRoot?: string;
    env?: NodeJS.ProcessEnv;
  } = {}
): Promise<void> {
  try {
    const stdin = options.stdin ?? process.stdin;
    const stdout = options.stdout ?? process.stdout;

    const raw = await readAllStdin(stdin);
    let input: { prompt?: string; cwd?: string } = {};
    try {
      input = JSON.parse(raw);
    } catch {
      /* Non-JSON input — treat as empty. Hook still no-ops gracefully. */
    }

    const out = runHook(input, { projectRoot: options.projectRoot, env: options.env });
    if (out !== null) stdout.write(out);
  } catch {
    /* silent fail */
  }
}

// CLI guard — only auto-run when invoked as the entry script.
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
  void main();
}
