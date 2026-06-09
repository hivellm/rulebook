import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import {
    loadCanonicalRules,
    projectRules,
    listRules,
    installRule,
} from '../src/core/rule-engine.js';

describe('Rule Engine', () => {
    let testDir: string;

    beforeEach(() => {
        testDir = join(tmpdir(), `rulebook-rule-engine-test-${Date.now()}`);
        mkdirSync(join(testDir, '.rulebook', 'rules'), { recursive: true });
    });

    afterEach(() => {
        rmSync(testDir, { recursive: true, force: true });
    });

    // ── loadCanonicalRules ──────────────────────────────────────────

    describe('loadCanonicalRules', () => {
        it('should return empty array when no rules exist', async () => {
            const rules = await loadCanonicalRules(testDir);
            expect(rules).toEqual([]);
        });

        it('should return empty when rules dir does not exist', async () => {
            const emptyDir = join(tmpdir(), `empty-${Date.now()}`);
            mkdirSync(emptyDir, { recursive: true });
            const rules = await loadCanonicalRules(emptyDir);
            expect(rules).toEqual([]);
            rmSync(emptyDir, { recursive: true, force: true });
        });

        it('should parse rule with full frontmatter', async () => {
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'test-rule.md'),
                `---
name: test-rule
tier: 1
description: "A test rule"
alwaysApply: true
filePatterns: ["*.ts", "*.js"]
tools: ["claude-code", "cursor"]
---

# Test Rule

This is the rule body.
`
            );

            const rules = await loadCanonicalRules(testDir);
            expect(rules).toHaveLength(1);
            expect(rules[0].name).toBe('test-rule');
            expect(rules[0].tier).toBe(1);
            expect(rules[0].description).toBe('A test rule');
            expect(rules[0].alwaysApply).toBe(true);
            expect(rules[0].filePatterns).toEqual(['*.ts', '*.js']);
            expect(rules[0].tools).toEqual(['claude-code', 'cursor']);
            expect(rules[0].body).toContain('# Test Rule');
        });

        it('should use defaults for missing frontmatter fields', async () => {
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'minimal.md'),
                `---
name: minimal
---

Just a body.
`
            );

            const rules = await loadCanonicalRules(testDir);
            expect(rules[0].tier).toBe(2);
            expect(rules[0].alwaysApply).toBe(false);
            expect(rules[0].filePatterns).toEqual(['*']);
            expect(rules[0].tools).toEqual(['all']);
        });

        it('should derive name from filename when not in frontmatter', async () => {
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'my-cool-rule.md'),
                `---
tier: 1
---

Body content.
`
            );

            const rules = await loadCanonicalRules(testDir);
            expect(rules[0].name).toBe('my-cool-rule');
        });

        it('should sort rules by tier then name', async () => {
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'beta.md'),
                '---\nname: beta\ntier: 2\n---\nB'
            );
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'alpha.md'),
                '---\nname: alpha\ntier: 1\n---\nA'
            );
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'gamma.md'),
                '---\nname: gamma\ntier: 1\n---\nG'
            );

            const rules = await loadCanonicalRules(testDir);
            expect(rules.map((r) => r.name)).toEqual(['alpha', 'gamma', 'beta']);
        });

        it('should skip non-md files', async () => {
            writeFileSync(join(testDir, '.rulebook', 'rules', 'readme.txt'), 'not a rule');
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'real.md'),
                '---\nname: real\n---\nBody'
            );

            const rules = await loadCanonicalRules(testDir);
            expect(rules).toHaveLength(1);
            expect(rules[0].name).toBe('real');
        });

        it('should handle rule without frontmatter', async () => {
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'bare.md'),
                '# A Rule\n\nJust markdown.'
            );

            const rules = await loadCanonicalRules(testDir);
            expect(rules).toHaveLength(1);
            expect(rules[0].name).toBe('bare');
            expect(rules[0].body).toContain('# A Rule');
        });
    });

    // ── projectRules ────────────────────────────────────────────────

    describe('projectRules', () => {
        beforeEach(() => {
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'no-shortcuts.md'),
                `---
name: no-shortcuts
tier: 1
description: "No shortcuts"
alwaysApply: true
filePatterns: ["*"]
tools: ["all"]
---

Never use stubs or TODOs.
`
            );

            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'ts-only.md'),
                `---
name: ts-only
tier: 2
description: "TypeScript rules"
alwaysApply: false
filePatterns: ["*.ts", "*.tsx"]
tools: ["claude-code", "cursor"]
---

Use strict types.
`
            );
        });

        it('should project to Claude Code as plain markdown', async () => {
            const result = await projectRules(testDir, { claudeCode: true });
            expect(result.claudeCode).toHaveLength(2);

            const content = readFileSync(
                join(testDir, '.claude', 'rules', 'no-shortcuts.md'),
                'utf-8'
            );
            expect(content).toContain('Never use stubs or TODOs');
        });

        it('should respect tool targeting in rules', async () => {
            // no-shortcuts targets "all", ts-only targets "claude-code" → both project
            const result = await projectRules(testDir, { claudeCode: true });
            expect(result.claudeCode).toHaveLength(2);
        });

        it('should return empty when no rules exist', async () => {
            const emptyDir = join(tmpdir(), `empty-proj-${Date.now()}`);
            mkdirSync(emptyDir, { recursive: true });
            const result = await projectRules(emptyDir, { claudeCode: true });
            expect(result.claudeCode).toEqual([]);
            rmSync(emptyDir, { recursive: true, force: true });
        });
    });

    // ── listRules ───────────────────────────────────────────────────

    describe('listRules', () => {
        it('should list all rules with metadata', async () => {
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'r1.md'),
                '---\nname: rule-one\ntier: 1\ndescription: "First"\ntools: ["all"]\n---\nBody'
            );
            writeFileSync(
                join(testDir, '.rulebook', 'rules', 'r2.md'),
                '---\nname: rule-two\ntier: 2\ndescription: "Second"\ntools: ["cursor"]\n---\nBody'
            );

            const list = await listRules(testDir);
            expect(list).toHaveLength(2);
            expect(list[0].name).toBe('rule-one');
            expect(list[0].tier).toBe(1);
            expect(list[1].name).toBe('rule-two');
            expect(list[1].tools).toEqual(['cursor']);
        });
    });

    // ── installRule ─────────────────────────────────────────────────

    describe('installRule', () => {
        let templatesDir: string;

        beforeEach(() => {
            templatesDir = join(testDir, 'templates');
            mkdirSync(join(templatesDir, 'rules'), { recursive: true });
            writeFileSync(
                join(templatesDir, 'rules', 'no-shortcuts.md'),
                '---\nname: no-shortcuts\ntier: 1\n---\nDo not shortcut.'
            );
        });

        it('should install rule from template library', async () => {
            const result = await installRule(testDir, 'no-shortcuts', templatesDir);
            expect(result).not.toBeNull();
            expect(existsSync(join(testDir, '.rulebook', 'rules', 'no-shortcuts.md'))).toBe(true);
        });

        it('should return null for non-existent template', async () => {
            const result = await installRule(testDir, 'non-existent', templatesDir);
            expect(result).toBeNull();
        });
    });
});
