import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import path from 'path';

/**
 * Shell-level tests for the v7 path-only guard
 * (templates/hooks/protect-task-scaffolding.sh). The guard must:
 *  - allow everything that does not target task scaffolding paths
 *  - deny creation of proposal.md/.metadata.json under .rulebook/tasks/
 *    when the file does not exist
 *  - never inspect content (no TODO/stub/placeholder denials — F-009)
 */
const SCRIPT = path.join(process.cwd(), 'templates', 'hooks', 'protect-task-scaffolding.sh');

function runGuard(payload: object): { decision: string; raw: string } {
    const raw = execFileSync('bash', [SCRIPT], {
        input: JSON.stringify(payload),
        encoding: 'utf-8',
    });
    const parsed = JSON.parse(raw);
    return { decision: parsed.hookSpecificOutput.permissionDecision, raw };
}

describe('protect-task-scaffolding.sh (v7 path-only guard)', () => {
    it('allows ordinary source writes', () => {
        const { decision } = runGuard({
            tool_name: 'Write',
            tool_input: { file_path: 'src/index.ts', content: 'export const x = 1;' },
        });
        expect(decision).toBe('allow');
    });

    it('allows content containing TODO/stub/placeholder words (no content inspection)', () => {
        const { decision } = runGuard({
            tool_name: 'Write',
            tool_input: {
                file_path: 'src/ui/input.tsx',
                content: '<input placeholder="Search" /> // TODO handled by lint, stub here',
            },
        });
        expect(decision).toBe('allow');
    });

    it('denies creating a proposal.md that does not exist', () => {
        const { decision, raw } = runGuard({
            tool_name: 'Write',
            tool_input: {
                file_path: '/definitely/missing/.rulebook/tasks/phase1_x/proposal.md',
                content: '# Proposal',
            },
        });
        expect(decision).toBe('deny');
        expect(raw).toContain('rulebook_task');
    });

    it('denies creating a .metadata.json that does not exist', () => {
        const { decision } = runGuard({
            tool_name: 'Write',
            tool_input: {
                file_path: '/missing/.rulebook/tasks/phase2_y/.metadata.json',
                content: '{}',
            },
        });
        expect(decision).toBe('deny');
    });

    it('allows tasks.md writes even with deferral-ish words (only scaffolding names are protected)', () => {
        const { decision } = runGuard({
            tool_name: 'Write',
            tool_input: {
                file_path: '/missing/.rulebook/tasks/phase3_z/tasks.md',
                content: '- [ ] one item',
            },
        });
        expect(decision).toBe('allow');
    });

    it('allows editing an existing proposal.md', () => {
        // Create a real scaffolding file inside the repo tmp area for the check.
        const fs = require('fs') as typeof import('fs');
        const os = require('os') as typeof import('os');
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'guard-'));
        const taskDir = path.join(dir, '.rulebook', 'tasks', 'phase1_t');
        fs.mkdirSync(taskDir, { recursive: true });
        const file = path.join(taskDir, 'proposal.md');
        fs.writeFileSync(file, '# Proposal: exists');
        try {
            const { decision } = runGuard({
                tool_name: 'Edit',
                tool_input: {
                    file_path: file.replace(/\\/g, '/'),
                    old_string: 'exists',
                    new_string: 'still exists',
                },
            });
            expect(decision).toBe('allow');
        } finally {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
});
