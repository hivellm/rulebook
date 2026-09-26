import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

/**
 * v7.4 — model routing for rulebook's agent definitions, workflow scripts and
 * skill templates.
 *
 *   fable = architecture, complex bugs, code review / verification
 *   opus  = edits, tests, documentation, refactoring
 *   haiku = research, summaries
 *
 * `sonnet` is not part of the routing. Filesystem-only: no workflow is executed.
 */

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const AGENT_TEMPLATES = path.join(ROOT, 'templates', 'agents');
const WORKFLOW_TEMPLATES = path.join(ROOT, 'templates', 'claude-workflows');
const AGENT_COPIES = path.join(ROOT, '.claude', 'agents');
const WORKFLOW_COPIES = path.join(ROOT, '.claude', 'workflows');
const SKILL_TEMPLATES = path.join(ROOT, 'templates', 'skills');

const ALLOWED_MODELS = new Set(['fable', 'opus', 'haiku']);

const AGENT_ROUTING: Record<string, string> = {
    architect: 'fable',
    'code-reviewer': 'fable',
    'quality-gatekeeper': 'fable',
    'security-reviewer': 'fable',
    'build-engineer': 'opus',
    implementer: 'opus',
    'performance-engineer': 'opus',
    tester: 'opus',
    'docs-writer': 'opus',
    'team-lead': 'opus',
    researcher: 'haiku',
};

function listFiles(dir: string, ext: string): string[] {
    return readdirSync(dir)
        .filter((f) => f.endsWith(ext))
        .sort();
}

/** Every SKILL.md under `dir`, recursively, as absolute paths. */
function listSkillFiles(dir: string): string[] {
    return readdirSync(dir, { recursive: true, encoding: 'utf8' })
        .filter((f) => path.basename(f) === 'SKILL.md')
        .map((f) => path.join(dir, f))
        .sort();
}

function frontmatterModel(file: string): unknown {
    const text = readFileSync(file, 'utf8');
    const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) throw new Error(`no frontmatter in ${file}`);
    const data = yaml.load(match[1]) as Record<string, unknown>;
    return data.model;
}

/** The `export const meta = {...}` literal at the top of a workflow script. */
function metaBlock(text: string): string {
    const end = text.search(/\r?\n\}\r?\n/);
    if (!text.startsWith('export const meta') || end < 0) throw new Error('meta block not found');
    return text.slice(0, end);
}

function modelValues(text: string): string[] {
    return [...text.matchAll(/model: '(\w+)'/g)].map((m) => m[1]);
}

describe('agent model routing (v7.4)', () => {
    const agentFiles = listFiles(AGENT_TEMPLATES, '.md');
    const workflowFiles = listFiles(WORKFLOW_TEMPLATES, '.js');
    const skillFiles = listSkillFiles(SKILL_TEMPLATES);

    it('should cover exactly the routed agents when templates are listed', () => {
        expect(agentFiles.map((f) => f.replace(/\.md$/, ''))).toEqual(
            Object.keys(AGENT_ROUTING).sort()
        );
    });

    it.each(Object.entries(AGENT_ROUTING))(
        'should route agent %s to %s when its frontmatter is parsed',
        (name, model) => {
            expect(frontmatterModel(path.join(AGENT_TEMPLATES, `${name}.md`))).toBe(model);
        }
    );

    it('should not name sonnet as a model in any agent, workflow or skill template', () => {
        for (const file of agentFiles) {
            const text = readFileSync(path.join(AGENT_TEMPLATES, file), 'utf8');
            expect(text, file).not.toMatch(/^model:\s*['"]?sonnet/m);
        }
        for (const file of workflowFiles) {
            const text = readFileSync(path.join(WORKFLOW_TEMPLATES, file), 'utf8');
            expect(text, file).not.toMatch(/model:\s*['"]sonnet['"]/);
        }
        expect(skillFiles.length).toBeGreaterThan(0);
        for (const file of skillFiles) {
            const text = readFileSync(file, 'utf8');
            expect(text, file).not.toMatch(/^model:\s*['"]?sonnet/m);
        }
    });

    it('should only use fable/opus/haiku in skill templates when a SKILL.md names a model', () => {
        const routed = skillFiles.filter((file) => frontmatterModel(file) !== undefined);
        expect(routed.length).toBeGreaterThan(0);
        for (const file of routed) {
            const model = frontmatterModel(file);
            expect(ALLOWED_MODELS.has(model as string), `${file}: ${String(model)}`).toBe(true);
        }
    });

    it.each(listFiles(WORKFLOW_TEMPLATES, '.js'))(
        'should only use fable/opus/haiku in %s when phases and agent calls name a model',
        (file) => {
            const text = readFileSync(path.join(WORKFLOW_TEMPLATES, file), 'utf8');
            for (const model of modelValues(metaBlock(text))) {
                expect(ALLOWED_MODELS.has(model), `${file} meta.phases: ${model}`).toBe(true);
            }
            const all = modelValues(text);
            expect(all.length, `${file} names no model`).toBeGreaterThan(0);
            for (const model of all) {
                expect(ALLOWED_MODELS.has(model), `${file}: ${model}`).toBe(true);
            }
        }
    );

    it('should keep this repo’s .claude/agents copies on the template models', () => {
        for (const file of agentFiles) {
            expect(frontmatterModel(path.join(AGENT_COPIES, file)), file).toBe(
                frontmatterModel(path.join(AGENT_TEMPLATES, file))
            );
        }
    });

    it('should keep this repo’s .claude/workflows copies on the template models', () => {
        for (const file of workflowFiles) {
            const template = modelValues(readFileSync(path.join(WORKFLOW_TEMPLATES, file), 'utf8'));
            const copy = modelValues(readFileSync(path.join(WORKFLOW_COPIES, file), 'utf8'));
            expect(copy, file).toEqual(template);
        }
    });
});
