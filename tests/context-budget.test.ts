import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs, existsSync } from 'fs';
import path from 'path';
import os from 'os';
import { encoding_for_model, type Tiktoken } from 'tiktoken';
import { CLAUDE_LOCAL_MD_STUB, generateClaudeMd } from '../src/core/claude/claude-md-generator.js';
import { generateLeanAgents, getTemplatesDir } from '../src/core/generators/generator.js';
import { generateRules, getRulesDir } from '../src/core/generators/rules-generator.js';
import {
    applyClaudeSettings,
    getClaudeSettingsPath,
} from '../src/core/claude/claude-settings-manager.js';
import { initOverride, syncCodexBlock } from '../src/core/state/override-manager.js';
import { mergeClaudeMd } from '../src/core/merger.js';
import {
    buildRulebookMcpEntry,
    installAgentDefinitions,
    installDevSkills,
} from '../src/core/claude/claude-mcp.js';
import { writeTypesafeRule } from '../src/core/claude/typesafe-integration.js';
import { generateMcpReference } from '../src/core/docs/mcp-reference-generator.js';
import { registerV7Tools } from '../src/mcp/tools/v7-tools.js';
import type { ToolContext } from '../src/mcp/tools/context.js';
import {
    PROMPT_HOOK_CONTEXT_MAX_BYTES,
    promptHookAnswer,
} from '../src/core/typesafe/prompt-hook.js';
import { renderInstruction, type GateResult } from '../src/core/typesafe/gate.js';
import { z } from 'zod/v3';
import type { ProjectConfig } from '../src/types.js';

/**
 * v7.5 context budget (docs/analysis/multi-session-performance/04, F-029; C7).
 *
 * Counts what Claude Code actually injects into a session of a project that
 * `rulebook init` + `update` set up (tiktoken cl100k, as in the ledger):
 * - CLAUDE.md with HTML comments stripped and `@imports` expanded — the import
 *   pulls in AGENTS.override.md with its RULEBOOK-CODEX block;
 * - CLAUDE.local.md (the init stub);
 * - every always-on `.claude/rules/*.md` (no `paths:` frontmatter), from every
 *   generator: typesafe.md, mcp-tool-reference.md, the language rules;
 * - the skill/agent listing lines Claude Code shows for what rulebook installs
 *   (`- name: description`);
 * - the deferred MCP tool names (`mcp__rulebook__<tool>`);
 * - with `gate.promptHook.enabled`, the per-prompt hook context at its cap.
 * AGENTS.md is not loaded by Claude Code; Codex reads it (or AGENTS.override.md
 * instead, when present), so it has its own budget below.
 *
 * Budgets are measured values plus headroom. Moving one needs a new
 * measurement and a line in the comment, never a silent bump.
 */
// Measured 1,448 (judgment) / 1,423 (orchestrator) at v7.5.0: CLAUDE.md with
// the imported override 1,081/1,056 (the RULEBOOK-CODEX block is ~290 of it),
// CLAUDE.local.md 42, always-on rules 196 (typesafe.md + mcp-tool-reference.md),
// skill listing 70, deferred MCP names 59. Ceiling = judgment + ~10 %.
const CLAUDE_ALWAYS_ON_BUDGET = 1600;
// Agents are opt-in, but projects upgraded from v5/v6 keep them (update refreshes
// them): the 11 shipped agents add 463 listing tokens, measured 1,911/1,886 at
// v7.5.0. Ceiling = the 7.5.0 target for an upgraded project (08-execution-plan,
// "Rulebook always-on tokens, upgraded project ≤ 2.1 k"), ~10 % above it.
const CLAUDE_WITH_AGENTS_BUDGET = 2100;
// Per prompt, only with gate.promptHook.enabled: the hook's context is capped at
// PROMPT_HOOK_CONTEXT_MAX_BYTES (1,024 B); its worst case (off-topic lead, all
// three risk warnings, instruction clipped at the cap) measured 239 tokens at
// v7.5.0. Ceiling = measured + ~9 %.
const PROMPT_HOOK_CONTEXT_BUDGET = 260;
// Codex. A default project has AGENTS.override.md, which Codex reads INSTEAD of
// AGENTS.md: RULEBOOK-CODEX block + override stub, measured 351 (judgment) / 340
// (orchestrator) at v7.5.0. Without an override Codex reads the lean AGENTS.md,
// measured 784/796. Ceilings = measured + ~10 %.
const CODEX_OVERRIDE_BUDGET = 390;
const CODEX_AGENTS_MD_BUDGET = 870;

const config: ProjectConfig = {
    languages: ['typescript'],
    modules: [],
    projectType: 'application',
    coverageThreshold: 75,
    strictDocs: true,
    generateWorkflows: false,
    agentsMode: 'lean',
};

describe('v7 context budget (F-001)', () => {
    let projectRoot: string;

    beforeEach(async () => {
        projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-budget-'));
        await fs.writeFile(
            path.join(projectRoot, 'AGENTS.override.md'),
            '# Project-Specific Overrides\n\nAdd your custom rules here.\n'
        );
    });

    afterEach(async () => {
        await fs.rm(projectRoot, { recursive: true, force: true });
    });

    describe.each(['judgment', 'orchestrator'] as const)('injected context (%s mode)', (mode) => {
        let enc: Tiktoken;
        beforeEach(async () => {
            enc = encoding_for_model('gpt-4');
            // A fresh project without the test's placeholder override: init creates it.
            await fs.rm(path.join(projectRoot, 'AGENTS.override.md'));
            await setUpProject(projectRoot, mode);
        });
        afterEach(() => enc.free());

        async function measure(): Promise<{
            parts: Record<string, string>;
            total: number;
            why: string;
        }> {
            const parts = await claudeAlwaysOn(projectRoot);
            const counts = Object.fromEntries(
                Object.entries(parts).map(([k, v]) => [k, enc.encode(v).length])
            );
            const total = Object.values(counts).reduce((a, b) => a + b, 0);
            return { parts, total, why: JSON.stringify(counts) };
        }

        it('Claude Code session start stays within the always-on budget', async () => {
            const { parts, total, why } = await measure();
            // Every source the budget is meant to cover is present and counted.
            expect(parts.claudeMd).toContain('Rulebook rules (Codex)');
            expect(parts.rules).toContain('# TypeSafe (Jev)');
            expect(parts.rules).toContain('# MCP tool reference');
            expect(parts.listing).toMatch(/^- analysis: /m);
            expect(parts.deferredMcp).toContain('mcp__rulebook__rulebook_gate');
            expect(parts.claudeMd).not.toContain('<!--');
            expect(total, why).toBeLessThanOrEqual(CLAUDE_ALWAYS_ON_BUDGET);
        });

        it('with the opt-in agents installed (upgraded projects) it stays within the 7.5 target', async () => {
            await installAgentDefinitions(projectRoot, getTemplatesDir(), 'typescript');
            const { parts, total, why } = await measure();
            expect(parts.listing).toMatch(/^- implementer: .* \(Tools: /m);
            expect(total, why).toBeLessThanOrEqual(CLAUDE_WITH_AGENTS_BUDGET);
        });

        it('the per-prompt hook context stays within its budget at the byte cap', () => {
            const context = worstCasePromptHookContext();
            expect(Buffer.byteLength(context)).toBeLessThanOrEqual(PROMPT_HOOK_CONTEXT_MAX_BYTES);
            expect(enc.encode(context).length).toBeLessThanOrEqual(PROMPT_HOOK_CONTEXT_BUDGET);
        });

        it('what Codex loads stays within the Codex budgets', async () => {
            const override = await fs.readFile(
                path.join(projectRoot, 'AGENTS.override.md'),
                'utf-8'
            );
            const agentsMd = await generateLeanAgents(
                { ...config, orchestration: mode },
                projectRoot
            );
            expect(override).toContain('Rulebook rules (Codex)');
            expect(enc.encode(override).length).toBeLessThanOrEqual(CODEX_OVERRIDE_BUDGET);
            expect(enc.encode(agentsMd).length).toBeLessThanOrEqual(CODEX_AGENTS_MD_BUDGET);
        });
    });

    it('every generated .claude/rules file is path-scoped (zero always-on rules)', async () => {
        await generateRules(projectRoot, {
            languages: [{ language: 'typescript', confidence: 1.0, indicators: [] }],
        });

        const rulesDir = getRulesDir(projectRoot);
        const files = await fs.readdir(rulesDir);
        expect(files.length).toBeGreaterThan(0);
        for (const f of files) {
            const content = await fs.readFile(path.join(rulesDir, f), 'utf-8');
            expect(content, `${f} must carry paths: frontmatter`).toMatch(
                /^---\r?\n[\s\S]*?^paths:/m
            );
        }
    });

    it('generated context carries no v6 team/hook orchestration mandates (P0)', async () => {
        const claudeMd = await generateClaudeMd(projectRoot);
        const agentsMd = await generateLeanAgents(config, projectRoot);
        const all = claudeMd + '\n' + agentsMd;

        // Forbidden v6 directives: no hook enforcement, no Team mandate. v7.4's
        // orchestrator directive (the main session never implements directly; it
        // delegates every task to a subagent) is prose, never a hook, and never
        // forces a Team.
        expect(all).not.toMatch(/must (use|go through) a Team/i);
        expect(all).not.toMatch(/blocked by the enforcement hook/i);
        expect(all).not.toMatch(/Delegate by default/i);
        // No total-order execution mandate (issue #18): order = dependencies.
        expect(all).not.toMatch(/execute in (the )?(exact )?listed order/i);
        expect(all).not.toMatch(/order, not a menu/i);
        expect(all).not.toMatch(/sequentially/i);
        // No blanket branch-switching ban (issue #20).
        expect(all).not.toMatch(/never switch branches on your own/i);
        expect(claudeMd).not.toMatch(/never blocks or\s+mandates orchestration/);

        // v7.5 (C1, F-020..F-031): in the default judgment mode no generated text
        // mandates or forbids delegation — it gives reasons and visible criteria.
        // Covers everything a session can load: CLAUDE.md, AGENTS.md, the spec,
        // and the Codex block in AGENTS.override.md.
        await syncCodexBlock(projectRoot);
        const judgmentText = [
            all,
            await fs.readFile(
                path.join(projectRoot, '.rulebook', 'specs', 'orchestration.md'),
                'utf-8'
            ),
            await fs.readFile(path.join(projectRoot, 'AGENTS.override.md'), 'utf-8'),
        ].join('\n');
        expect(judgmentText).toContain('Rulebook rules (Codex)');
        for (const mandate of [
            /never does the work itself/i,
            /never executes the work itself/i,
            /including small ones/i,
            /Delegate every task/i,
            /delegate each task/i,
            /Gate first/i,
            /else from\s+`rulebook_gate/i,
            // ...nor forbids it (C7: P0 is "neither mandates nor forbids").
            /never\s+delegate/i,
            /(do not|don't|must not)\s+delegate/i,
            /never\s+(spawn|use)\s+(a\s+)?subagents?/i,
            /always\s+do\s+the\s+work\s+yourself/i,
        ]) {
            expect(judgmentText).not.toMatch(mandate);
        }
        for (const doc of [claudeMd, agentsMd]) {
            expect(doc).toMatch(/small, local work/i);
            expect(doc).toMatch(/context and parallelism, not speed/i);
            expect(doc).toMatch(/model per call/i);
        }

        // Enforcement stays directive-only: no rulebook hook may deny or reroute
        // agent/subagent calls, even with every optional guard enabled.
        await applyClaudeSettings(projectRoot, {
            taskScaffoldingGuard: true,
            osSchedulingGuard: true,
        });
        const settings = JSON.parse(
            await fs.readFile(getClaudeSettingsPath(projectRoot), 'utf-8')
        ) as { hooks?: Record<string, Array<{ matcher?: string }>> };
        for (const entries of Object.values(settings.hooks ?? {})) {
            for (const entry of entries) {
                expect(entry.matcher ?? '').not.toMatch(/\b(Agent|Task|SendMessage)\b/);
            }
        }
    });

    it('orchestrator mode is an explicit opt-in that carries the delegation directive', async () => {
        await fs.mkdir(path.join(projectRoot, '.rulebook'), { recursive: true });
        await fs.writeFile(
            path.join(projectRoot, '.rulebook', 'rulebook.json'),
            JSON.stringify({ orchestration: 'orchestrator' })
        );
        const claudeMd = await generateClaudeMd(projectRoot);
        const agentsMd = await generateLeanAgents(config, projectRoot);
        for (const doc of [claudeMd, agentsMd]) {
            expect(doc).toMatch(/main session never does the work itself/i);
            expect(doc).toMatch(/one subagent/i);
            expect(doc).toMatch(/model set\s+per\s+call/i);
            expect(doc).not.toMatch(/small, local work/i);
        }
        // Still no gate-first rule and no "small ones too" contradiction (F-023).
        expect(claudeMd + agentsMd).not.toMatch(/Gate first|including small ones/i);
    });

    it('generated CLAUDE.md does not import AGENTS.md or rule essays', async () => {
        const claudeMd = await generateClaudeMd(projectRoot);
        expect(claudeMd).not.toMatch(/^@AGENTS\.md$/m);
        expect(claudeMd).not.toMatch(/^@\.rulebook\/STATE\.md$/m);
        expect(claudeMd).not.toMatch(/^@\.rulebook\/PLANS\.md$/m);
        // The single allowed import: user-owned overrides.
        expect(claudeMd).toContain('@AGENTS.override.md');
    });
});

/**
 * The files `rulebook init` + `update` leave in a TypeScript project where
 * Claude Code is detected and TypeSafe is on (the defaults): the override with
 * its Codex block exists before CLAUDE.md is regenerated, so the import is live.
 */
async function setUpProject(root: string, orchestration: 'judgment' | 'orchestrator') {
    await fs.mkdir(path.join(root, '.rulebook'), { recursive: true });
    await fs.writeFile(
        path.join(root, '.rulebook', 'rulebook.json'),
        JSON.stringify({ orchestration })
    );
    await initOverride(root);
    await syncCodexBlock(root);
    await mergeClaudeMd(root);
    await fs.writeFile(path.join(root, 'CLAUDE.local.md'), CLAUDE_LOCAL_MD_STUB);
    await fs.writeFile(
        path.join(root, '.mcp.json'),
        JSON.stringify({ mcpServers: { rulebook: buildRulebookMcpEntry(root) } })
    );
    await generateMcpReference(root);
    await writeTypesafeRule(root);
    await generateRules(root, {
        languages: [{ language: 'typescript', confidence: 1.0, indicators: [] }],
    });
    await installDevSkills(root, getTemplatesDir());
}

/** Block-level HTML comments, which Claude Code strips from memory files before injecting them. */
function stripHtmlComments(text: string): string {
    return text.replace(/<!--[\s\S]*?-->/g, '');
}

/** A memory file as Claude Code injects it: comments stripped, `@path` import lines expanded. */
async function injectedMemory(root: string, rel: string, depth = 0): Promise<string> {
    const text = stripHtmlComments(await fs.readFile(path.join(root, rel), 'utf-8'));
    const lines: string[] = [];
    for (const line of text.split(/\r?\n/)) {
        const target = /^@(\S+)\s*$/.exec(line.trim())?.[1];
        // Claude Code follows imports up to five levels deep.
        if (target && depth < 5 && existsSync(path.join(root, target))) {
            lines.push(await injectedMemory(root, target, depth + 1));
        } else {
            lines.push(line);
        }
    }
    return lines.join('\n');
}

function frontmatterField(content: string, field: string): string | undefined {
    const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(content)?.[1] ?? '';
    return new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(fm)?.[1].trim();
}

/** The names Claude Code lists for deferred MCP tools: one `mcp__rulebook__<tool>` per line. */
function deferredRulebookToolNames(): string {
    const names: string[] = [];
    const server = { registerTool: (name: string) => void names.push(name) };
    const ctx = {
        projectRoot: '',
        workspaceManager: null,
        projectIdSchema: z.string().optional(),
    } as unknown as ToolContext;
    registerV7Tools(server as unknown as Parameters<typeof registerV7Tools>[0], ctx);
    return names.map((n) => `mcp__rulebook__${n}`).join('\n');
}

/** Everything rulebook adds to a Claude Code session at start, by source. */
async function claudeAlwaysOn(root: string): Promise<Record<string, string>> {
    const rulesDir = getRulesDir(root);
    const rules: string[] = [];
    for (const f of (await fs.readdir(rulesDir)).sort()) {
        const content = await fs.readFile(path.join(rulesDir, f), 'utf-8');
        if (!/^---\r?\n[\s\S]*?^paths:/m.test(content)) rules.push(stripHtmlComments(content));
    }

    // Listing lines: `- name: description` per installed skill, plus
    // ` (Tools: …)` per installed agent (agents are opt-in; none by default).
    const listing: string[] = [];
    const skillsDir = path.join(root, '.claude', 'skills');
    for (const d of existsSync(skillsDir) ? (await fs.readdir(skillsDir)).sort() : []) {
        const skill = await fs.readFile(path.join(skillsDir, d, 'SKILL.md'), 'utf-8');
        listing.push(
            `- ${frontmatterField(skill, 'name') ?? d}: ${frontmatterField(skill, 'description')}`
        );
    }
    const agentsDir = path.join(root, '.claude', 'agents');
    for (const f of existsSync(agentsDir) ? (await fs.readdir(agentsDir)).sort() : []) {
        const agent = await fs.readFile(path.join(agentsDir, f), 'utf-8');
        const tools = frontmatterField(agent, 'tools');
        listing.push(
            `- ${frontmatterField(agent, 'name')}: ${frontmatterField(agent, 'description')}` +
                (tools ? ` (Tools: ${tools})` : '')
        );
    }

    return {
        claudeMd: await injectedMemory(root, 'CLAUDE.md'),
        claudeLocal: stripHtmlComments(
            await fs.readFile(path.join(root, 'CLAUDE.local.md'), 'utf-8')
        ),
        rules: rules.join('\n'),
        listing: listing.join('\n'),
        deferredMcp: deferredRulebookToolNames(),
    };
}

/**
 * The largest context the prompt hook injects: the off-topic confirm line, the
 * header, an instruction long enough to be clipped at the byte cap, and all
 * three risk warnings — each rendered by the hook's own code.
 */
function worstCasePromptHookContext(): string {
    const routing: GateResult['routing'] = {
        kind: 'task-work',
        needsTask: true,
        existingTaskId: 'phase3_budget-tests-and-ledger',
        model: null,
        agentType: null,
        skill: null,
        parallel: null,
        needsOperatorDecision: true,
        inProjectScope: false,
        risk: { destructiveGit: true, osScheduling: true, secrets: true },
    };
    const instruction = renderInstruction(
        { available: true, routing, undecided: [] },
        ['needsTask from existing_task'],
        'hook'
    );
    const noul = (id: string, probability: number) => ({
        id,
        primitive: 'noul' as const,
        answer: probability >= 0.5,
        probability,
        decided: true,
    });
    const answer = promptHookAnswer(
        {
            available: true,
            decisions: [
                noul('risk_destructive_git', 0.89),
                noul('risk_os_scheduling', 0.89),
                noul('risk_secrets', 0.89),
                noul('in_project_scope', 0.01),
            ],
            routing,
            undecided: [],
            instruction: `${instruction} ${instruction} ${instruction}`,
            elapsedMs: 1,
            stateBytes: 1,
        },
        { blockThreshold: 0.9 },
        {
            offTopicBelow: 0.15,
            onOffTopic: 'ask',
            description:
                'A TypeScript CLI and MCP server that generates AI agent rules, quality gates and task tracking',
        }
    );
    if (answer.kind !== 'context') throw new Error(`expected context, got ${answer.kind}`);
    return answer.additionalContext;
}
