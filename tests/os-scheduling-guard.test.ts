import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execFileSync } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import {
    applyClaudeSettings,
    GUARD_SCRIPT,
    OS_SCHEDULING_GUARD_SCRIPT,
    OS_SCHEDULING_GUARD_MATCHER,
} from '../src/core/claude/claude-settings-manager';

/**
 * v7.3 — Tier 1 #7: no OS-level scheduling.
 *
 * The guard script is exercised for real through bash (skipped where bash is
 * absent); the settings wiring is exercised through applyClaudeSettings.
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

function runGuard(payload: object): { decision: string; reason: string } {
    const raw = execFileSync('bash', [SCRIPT], {
        input: JSON.stringify(payload),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
    });
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
        it(`allows: ${command}`, () => {
            expect(runGuard(bash(command)).decision).toBe('allow');
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

    it('allows writes to application code and docs', () => {
        expect(runGuard(write('src/jobs/scheduler.ts')).decision).toBe('allow');
        expect(runGuard(write('docs/cron.md')).decision).toBe('allow');
        expect(runGuard(write('/tmp/backup.timer.md')).decision).toBe('allow');
    });

    it('allows a payload with no command and no path', () => {
        expect(runGuard({ tool_name: 'Read', tool_input: {} }).decision).toBe('allow');
    });
});

describe('no-os-scheduling guard wiring (applyClaudeSettings)', () => {
    let projectRoot: string;
    const BOTH = { taskScaffoldingGuard: true, osSchedulingGuard: true };

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-os-sched-'));
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    it('adds a Bash|Edit|Write PreToolUse entry next to the task guard', async () => {
        const result = await applyClaudeSettings(projectRoot, BOTH);
        const content = JSON.parse(await fs.readFile(result.path, 'utf-8'));
        const entries = content.hooks.PreToolUse as Array<{
            matcher: string;
            hooks: Array<{ command: string }>;
        }>;
        expect(entries).toHaveLength(2);
        const guard = entries.find((e) => e.matcher === OS_SCHEDULING_GUARD_MATCHER)!;
        expect(guard.hooks[0].command).toContain(OS_SCHEDULING_GUARD_SCRIPT);
        expect(entries.find((e) => e.matcher === 'Edit|Write')!.hooks[0].command).toContain(
            GUARD_SCRIPT
        );
    });

    it('installs the script with LF endings', async () => {
        await applyClaudeSettings(projectRoot, BOTH);
        const buf = await fs.readFile(
            path.join(projectRoot, '.claude/hooks', OS_SCHEDULING_GUARD_SCRIPT)
        );
        expect(buf.length).toBeGreaterThan(0);
        expect(buf.includes(0x0d)).toBe(false);
    });

    it('is idempotent and removable', async () => {
        await applyClaudeSettings(projectRoot, BOTH);
        const again = await applyClaudeSettings(projectRoot, BOTH);
        expect(again.changed).toBe(false);

        await applyClaudeSettings(projectRoot, { taskScaffoldingGuard: true });
        const after = JSON.parse(await fs.readFile(again.path, 'utf-8'));
        expect(after.hooks.PreToolUse).toHaveLength(1);
        expect(after.hooks.PreToolUse[0].matcher).toBe('Edit|Write');
    });
});
