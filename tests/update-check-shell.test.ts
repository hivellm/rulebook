import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

const HOOK = join(process.cwd(), 'templates/hooks/update-check.sh');

function runHook(cwd: string): { status: number; stdout: string } {
    let status = 0;
    let stdout = '';
    try {
        stdout = execFileSync('bash', [HOOK], {
            input: JSON.stringify({ cwd }),
            encoding: 'utf-8',
            cwd,
        });
    } catch (err: unknown) {
        const e = err as { status?: number; stdout?: string };
        status = e.status ?? 1;
        stdout = e.stdout ?? '';
    }
    return { status, stdout };
}

function writeConfig(root: string, obj: Record<string, unknown>): void {
    writeFileSync(join(root, '.rulebook', 'rulebook.json'), JSON.stringify(obj));
}

/** Seed a FRESH cache so the hook never reaches the network during tests. */
function seedCache(root: string, latest: string): void {
    const now = Math.floor(Date.now() / 1000);
    writeFileSync(
        join(root, '.rulebook', '.update-check'),
        JSON.stringify({ latest, checkedAt: now })
    );
}

describe('update-check.sh', () => {
    let projectRoot: string;

    beforeEach(() => {
        projectRoot = mkdtempSync(join(tmpdir(), 'rb-update-'));
        mkdirSync(join(projectRoot, '.rulebook'), { recursive: true });
    });

    afterEach(() => {
        rmSync(projectRoot, { recursive: true, force: true });
    });

    it('emits an advisory when a newer version is available', () => {
        writeConfig(projectRoot, { version: '1.0.0' });
        seedCache(projectRoot, '9.9.9');
        const { status, stdout } = runHook(projectRoot);
        expect(status).toBe(0);
        const parsed = JSON.parse(stdout);
        expect(parsed.hookSpecificOutput.hookEventName).toBe('SessionStart');
        expect(parsed.hookSpecificOutput.additionalContext).toContain('1.0.0');
        expect(parsed.hookSpecificOutput.additionalContext).toContain('9.9.9');
        expect(parsed.hookSpecificOutput.additionalContext).toMatch(/rulebook update/);
    });

    it('emits {} when already on the latest version', () => {
        writeConfig(projectRoot, { version: '9.9.9' });
        seedCache(projectRoot, '9.9.9');
        const { stdout } = runHook(projectRoot);
        expect(JSON.parse(stdout)).toEqual({});
    });

    it('emits {} when the installed version is newer than npm', () => {
        writeConfig(projectRoot, { version: '10.0.0' });
        seedCache(projectRoot, '9.9.9');
        expect(JSON.parse(runHook(projectRoot).stdout)).toEqual({});
    });

    it('respects opt-out via updateCheck.enabled=false', () => {
        writeConfig(projectRoot, { version: '1.0.0', updateCheck: { enabled: false } });
        seedCache(projectRoot, '9.9.9');
        expect(JSON.parse(runHook(projectRoot).stdout)).toEqual({});
    });

    it('emits {} when there is no rulebook config', () => {
        // no config written
        expect(JSON.parse(runHook(projectRoot).stdout)).toEqual({});
    });

    it('compares semver numerically, not lexically (9 < 10)', () => {
        writeConfig(projectRoot, { version: '9.0.0' });
        seedCache(projectRoot, '10.0.0');
        const parsed = JSON.parse(runHook(projectRoot).stdout);
        expect(parsed.hookSpecificOutput).toBeDefined();
    });
});
