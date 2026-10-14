import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    applyClaudeSettings,
    GUARD_SCRIPT,
    OS_SCHEDULING_DENY_RULES,
    OS_SCHEDULING_GUARD_SCRIPT,
} from '../src/core/claude/claude-settings-manager';

/**
 * v7.3 — Tier 1 #7: no OS-level scheduling.
 *
 * The guard script is exercised for real through bash (skipped where bash is
 * absent); the settings wiring (v7.5: permissions.deny rules, the script
 * installed only with the tool gate) is exercised through applyClaudeSettings.
 */

const SCRIPT = path.join(process.cwd(), 'templates', 'hooks', OS_SCHEDULING_GUARD_SCRIPT);

function hasBash(): boolean {
    try {
        execFileSync('bash', ['-c', 'echo ok'], { stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

/** `none` = the guard printed nothing: no decision, the normal permission flow applies. */
function runGuard(payload: object): { decision: string; reason: string } {
    const raw = execFileSync('bash', [SCRIPT], {
        input: JSON.stringify(payload),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
    });
    if (raw.trim() === '') return { decision: 'none', reason: '' };
    const parsed = JSON.parse(raw.trim()) as {
        hookSpecificOutput: { permissionDecision: string; permissionDecisionReason?: string };
    };
    return {
        decision: parsed.hookSpecificOutput.permissionDecision,
        reason: parsed.hookSpecificOutput.permissionDecisionReason ?? '',
    };
}

const bash = (command: string) => ({ tool_name: 'Bash', tool_input: { command } });
const write = (file_path: string) => ({
    tool_name: 'Write',
    tool_input: { file_path, content: '* * * * * echo hi' },
});

describe.skipIf(!hasBash())('no-os-scheduling guard script', () => {
    const denied: Array<[string, string]> = [
        ['crontab -e', 'crontab'],
        ['(crontab -l; echo "* * * * * /opt/job.sh") | crontab -', 'crontab'],
        ['sudo crontab -u deploy /tmp/jobs', 'crontab'],
        ['echo "0 3 * * * root /opt/backup" | sudo tee /etc/cron.d/backup', '/etc/cron'],
        ['at now + 1 hour -f job.sh', 'at/batch'],
        ['systemctl enable --now backup.timer', 'systemd timer'],
        [
            'sudo cp backup.timer /etc/systemd/system/backup.timer && systemctl daemon-reload',
            'systemd timer',
        ],
        ['launchctl load ~/Library/LaunchAgents/com.acme.sync.plist', 'launchd'],
        ['cp com.acme.sync.plist ~/Library/LaunchAgents/', 'launchd'],
        ['schtasks /Create /TN "Sync" /TR "node sync.js" /SC DAILY', 'schtasks'],
        [
            'powershell -c "Register-ScheduledTask -TaskName Sync -Action $a -Trigger $t"',
            'ScheduledTask',
        ],
    ];

    for (const [command, keyword] of denied) {
        it(`denies: ${command}`, () => {
            const r = runGuard(bash(command));
            expect(r.decision).toBe('deny');
            expect(r.reason).toContain('Tier 1 #7');
            expect(r.reason).toContain(keyword);
        });
    }

    const allowed = [
        'npm test',
        'grep -rn cron README.md',
        'crontab -l',
        'cat /etc/crontab',
        'git commit -m "meet at 5 to discuss the in-app scheduler"',
        'systemctl status nginx',
        'node src/jobs/scheduler.js --every 5m',
        'echo "look at this"',
        'schtasks /Query /TN Sync',
    ];

    for (const command of allowed) {
        it(`passes without a decision: ${command}`, () => {
            expect(runGuard(bash(command)).decision).toBe('none');
        });
    }

    it('denies writes under OS scheduler directories', () => {
        expect(runGuard(write('/etc/cron.d/backup')).decision).toBe('deny');
        expect(
            runGuard(write('/Users/dev/Library/LaunchAgents/com.acme.sync.plist')).decision
        ).toBe('deny');
        expect(runGuard(write('/etc/systemd/system/backup.timer')).decision).toBe('deny');
        expect(runGuard(write('/home/dev/.config/systemd/user/sync.timer')).decision).toBe('deny');
    });

    it('passes writes to application code and docs', () => {
        expect(runGuard(write('src/jobs/scheduler.ts')).decision).toBe('none');
        expect(runGuard(write('docs/cron.md')).decision).toBe('none');
        expect(runGuard(write('/tmp/backup.timer.md')).decision).toBe('none');
    });

    it('passes a payload with no command and no path', () => {
        expect(runGuard({ tool_name: 'Read', tool_input: {} }).decision).toBe('none');
    });
});

describe('no-os-scheduling wiring (applyClaudeSettings, v7.5)', () => {
    let projectRoot: string;
    const BOTH = { taskScaffoldingGuard: true, osSchedulingGuard: true };

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-os-sched-'));
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    async function read(p: string) {
        return JSON.parse(await fs.readFile(p, 'utf-8'));
    }

    it('writes the deny rules and wires no PreToolUse scheduling hook', async () => {
        const result = await applyClaudeSettings(projectRoot, BOTH);
        const content = await read(result.path);
        expect(content.permissions.deny).toEqual([...OS_SCHEDULING_DENY_RULES]);
        const entries = content.hooks.PreToolUse as Array<{ hooks: Array<{ command: string }> }>;
        expect(entries).toHaveLength(1);
        expect(entries[0].hooks.every((h) => h.command.includes(GUARD_SCRIPT))).toBe(true);
        expect(JSON.stringify(content.hooks)).not.toContain(OS_SCHEDULING_GUARD_SCRIPT);
    });

    it('installs the script only with the opt-in tool gate (which runs it), with LF endings', async () => {
        const script = path.join(projectRoot, '.claude/hooks', OS_SCHEDULING_GUARD_SCRIPT);
        await applyClaudeSettings(projectRoot, BOTH);
        await expect(fs.access(script)).rejects.toThrow();

        await applyClaudeSettings(projectRoot, {
            ...BOTH,
            jevToolGate: { matcher: 'Bash|Edit|Write', timeoutSec: 4 },
        });
        const buf = await fs.readFile(script);
        expect(buf.length).toBeGreaterThan(0);
        expect(buf.includes(0x0d)).toBe(false);
    });

    it('is idempotent and removable', async () => {
        await applyClaudeSettings(projectRoot, BOTH);
        const again = await applyClaudeSettings(projectRoot, BOTH);
        expect(again.changed).toBe(false);

        await applyClaudeSettings(projectRoot, { taskScaffoldingGuard: true });
        const after = await read(again.path);
        expect(after.permissions).toBeUndefined();
        expect(after.hooks.PreToolUse).toHaveLength(1);
        expect(after.hooks.PreToolUse[0].matcher).toBe('Edit|Write');
    });
});
