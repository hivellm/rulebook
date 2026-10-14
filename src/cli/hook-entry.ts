import { writeFileSync } from 'fs';
import os from 'os';
import path from 'path';

/**
 * `rulebook-hook <event>` (v7.5): the Claude Code hook entry. It loads only
 * the hook module (`commands/hook.js` and the gate it imports), not the whole
 * CLI with commander and every command, and settings.json runs it as
 * `node <path>/dist/cli/hook-main.js <event>` without a shell (exec form).
 *
 * Fail-open like `rulebook hook`: it always exits 0. One failure is not
 * silent: when the hook module cannot be loaded (a broken or half-removed
 * install), it prints one `systemMessage` per session — a marker file named
 * after the payload's `session_id` under the OS temp directory keeps it from
 * repeating on every prompt. `--check` loads the module and exits 0, or 1 when
 * it cannot: `rulebook init`/`update` use it to validate the path they install.
 */

export const HOOK_CHECK_FLAG = '--check';

type HookModule = Pick<typeof import('./commands/hook.js'), 'hookCommand'>;

export interface HookMainOptions {
    /** Hook payload; defaults to process.stdin. */
    stdin?: string | NodeJS.ReadableStream;
    env?: NodeJS.ProcessEnv;
    /** Receives the single output line; defaults to stdout. */
    log?: (line: string) => void;
    /** Where the once-per-session marker lives; defaults to os.tmpdir(). */
    tmpDir?: string;
    /** Loads the hook module; tests pass one that fails. */
    loadHook?: () => Promise<HookModule>;
}

async function readAll(source: string | NodeJS.ReadableStream): Promise<string> {
    if (typeof source === 'string') return source;
    if ((source as { isTTY?: boolean }).isTTY) return '';
    const chunks: Buffer[] = [];
    for await (const chunk of source) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk);
    }
    return Buffer.concat(chunks).toString('utf8');
}

/** The payload's `session_id`, reduced to a safe file-name part; `nosession` when absent. */
export function sessionKey(raw: string): string {
    try {
        const id = (JSON.parse(raw) as { session_id?: unknown })?.session_id;
        const safe = typeof id === 'string' ? id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 128) : '';
        return safe || 'nosession';
    } catch {
        return 'nosession';
    }
}

/**
 * Print `{"systemMessage": …}` unless this session was already told: the
 * marker is created exclusively, so only the first call per session prints.
 * Returns whether it printed.
 */
export function warnOncePerSession(
    raw: string,
    reason: string,
    log: (line: string) => void,
    tmpDir: string = os.tmpdir()
): boolean {
    const marker = path.join(tmpDir, `rulebook-hook-warned-${sessionKey(raw)}`);
    try {
        writeFileSync(marker, '', { flag: 'wx' });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') return false;
        // An unwritable temp dir: say it anyway rather than fail silently.
    }
    log(
        JSON.stringify({
            systemMessage:
                `rulebook: ${reason}, so the Jev gate hook is off for this session. ` +
                'Install @hivehub/rulebook (npm i -D @hivehub/rulebook, or globally), then run rulebook update.',
        })
    );
    return true;
}

function describe(error: unknown): string {
    const err = error as { code?: string; message?: string };
    return err?.code ?? (err?.message ?? String(error)).split('\n')[0].slice(0, 160);
}

/** Run `rulebook-hook <event>` and return the exit code: always 0, except `--check` on a broken install. */
export async function runHookMain(argv: string[], options: HookMainOptions = {}): Promise<number> {
    const event = argv[0] ?? '';
    const log = options.log ?? ((line: string) => void process.stdout.write(line + '\n'));
    const loadHook = options.loadHook ?? (() => import('./commands/hook.js'));

    if (event === HOOK_CHECK_FLAG) {
        try {
            await loadHook();
            return 0;
        } catch (error) {
            process.stderr.write(
                `rulebook-hook: cannot load the hook module: ${describe(error)}\n`
            );
            return 1;
        }
    }

    let raw = '';
    try {
        raw = await readAll(options.stdin ?? process.stdin);
        const hook = await loadHook().catch((error: unknown) => {
            warnOncePerSession(
                raw,
                `the rulebook hook could not load (${describe(error)})`,
                log,
                options.tmpDir
            );
            return null;
        });
        if (hook) await hook.hookCommand(event, { stdin: raw, env: options.env, log });
    } catch {
        // fail-open: no output
    }
    return 0;
}
