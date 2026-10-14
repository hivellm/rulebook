import path from 'path';
import { existsSync, promises as fs, statSync } from 'fs';
import { normPath } from './hooks.js';
import { getTable, parseToml, type TomlTable } from './toml.js';
import type {
    CodexSection,
    HookEntryInfo,
    LeftoverFile,
    LeftoversSection,
    PerfCheck,
} from './types.js';

/**
 * Leftover assets and Codex checks for `rulebook doctor --perf`. Read-only.
 */

/**
 * Names rulebook shipped into `.claude/` in v5/v6 (from the git history of
 * `templates/`) and no longer ships. A name check only: a user file that
 * happens to share a name is reported too, so the action says to verify.
 */
export const RETIRED_ASSET_NAMES: Record<LeftoverFile['kind'], readonly string[]> = {
    rules: [
        'consult-analysis-before-implementing.md',
        'diagnostic-first.md',
        'fail-twice-escalate.md',
        'follow-task-sequence.md',
        'full-task-no-questions.md',
        'git-safety.md',
        'incremental-implementation.md',
        'incremental-tests.md',
        'knowledge-base-usage.md',
        'multi-agent-teams.md',
        'no-deferred.md',
        'no-shortcuts.md',
        'research-first.md',
        'respect-handoff-trigger.md',
        'sequential-editing.md',
        'session-workflow.md',
        'task-decomposition.md',
    ],
    agents: [
        'accessibility-reviewer.md',
        'api-designer.md',
        'backend-engineer.md',
        'codegen-debugger.md',
        'context-intelligence.md',
        'cpp-core-expert.md',
        'database-architect.md',
        'database-engineer.md',
        'devops-engineer.md',
        'frontend-engineer.md',
        'i18n-engineer.md',
        'migration-engineer.md',
        'platform-specialist.md',
        'project-manager.md',
        'refactoring-agent.md',
        'render-engineer.md',
        'shader-engineer.md',
        'stdlib-engineer.md',
        'systems-integration.md',
        'test-coverage-guardian.md',
        'test-engineer.md',
        'ui-engineer.md',
        'ux-reviewer.md',
    ],
    skills: [
        'agent-automation',
        'dag',
        'documentation-rules',
        'handoff',
        'quality-enforcement',
        'ralph',
        'rulebook-mcp',
        'rulebook-terse',
        'rulebook-terse-commit',
        'rulebook-terse-review',
    ],
    hooks: [
        'check-context-and-handoff.ps1',
        'check-context-and-handoff.sh',
        'enforce-mcp-for-tasks.sh',
        'enforce-no-deferred.sh',
        'enforce-no-shortcuts.sh',
        'enforce-pre-tool.sh',
        'enforce-team-for-background-agents.ps1',
        'enforce-team-for-background-agents.sh',
        'on-compact-reinject.sh',
        'resume-from-handoff.ps1',
        'resume-from-handoff.sh',
        'terse-activate.ps1',
        'terse-activate.sh',
        'terse-mode-tracker.ps1',
        'terse-mode-tracker.sh',
        'update-check.ps1',
        'update-check.sh',
    ],
    commands: [
        'rulebook-decision-create.md',
        'rulebook-decision-list.md',
        'rulebook-knowledge-add.md',
        'rulebook-knowledge-list.md',
        'rulebook-learn-capture.md',
        'rulebook-learn-list.md',
        'rulebook-memory-save.md',
        'rulebook-memory-search.md',
        'rulebook-task-apply.md',
        'rulebook-task-archive.md',
        'rulebook-task-create.md',
        'rulebook-task-list.md',
        'rulebook-task-show.md',
        'rulebook-task-validate.md',
    ],
};

/** Names the current package ships, so a name that came back is never reported. */
async function shippedNames(templatesDir: string): Promise<Set<string>> {
    const names = new Set<string>();
    const walk = async (dir: string, depth: number): Promise<void> => {
        let entries: import('fs').Dirent[];
        try {
            entries = await fs.readdir(dir, { withFileTypes: true });
        } catch {
            return;
        }
        for (const e of entries) {
            names.add(e.name);
            if (e.isDirectory() && depth < 3) await walk(path.join(dir, e.name), depth + 1);
        }
    };
    for (const kind of ['agents', 'skills', 'rules', 'hooks', 'commands']) {
        await walk(path.join(templatesDir, kind), 0);
    }
    return names;
}

/** Retired rulebook files under `.claude/`, retired hook entries, and hooks whose script is missing. */
export async function inspectLeftovers(ctx: {
    projectRoot: string;
    templatesDir: string;
    hooks: HookEntryInfo[];
}): Promise<LeftoversSection> {
    const shipped = await shippedNames(ctx.templatesDir);
    const files: LeftoverFile[] = [];
    for (const kind of Object.keys(RETIRED_ASSET_NAMES) as LeftoverFile['kind'][]) {
        const dir = path.join(ctx.projectRoot, '.claude', kind);
        if (!existsSync(dir)) continue;
        for (const name of RETIRED_ASSET_NAMES[kind]) {
            if (shipped.has(name)) continue;
            const p = path.join(dir, name);
            if (existsSync(p))
                files.push({ kind, path: path.relative(ctx.projectRoot, p).replace(/\\/g, '/') });
        }
    }

    const retiredHooks = ctx.hooks
        .filter((h) => h.retired)
        .map((h) => ({ sourcePath: h.sourcePath, event: h.event, command: h.command }));
    const missingScripts = ctx.hooks
        .filter((h) => h.script && !h.script.exists)
        .map((h) => ({
            sourcePath: h.sourcePath,
            event: h.event,
            command: h.command,
            script: h.script!.path,
        }));

    const checks: PerfCheck[] = [];
    if (files.length > 0) {
        const byKind = new Map<string, number>();
        for (const f of files) byKind.set(f.kind, (byKind.get(f.kind) ?? 0) + 1);
        checks.push({
            id: 'leftover-files',
            status: 'warn',
            message:
                `${files.length} file(s) named like retired rulebook assets ` +
                `(${[...byKind].map(([k, n]) => `${n} ${k}`).join(', ')}): ` +
                files
                    .slice(0, 8)
                    .map((f) => f.path)
                    .join(', ') +
                (files.length > 8 ? ', …' : ''),
            action: 'run `rulebook update` (removes rulebook-owned copies); delete the rest by hand unless you wrote them',
        });
    } else {
        checks.push({
            id: 'leftover-files',
            status: 'ok',
            message: 'no retired rulebook rules, agents, skills, hooks or commands in .claude/',
        });
    }
    for (const h of retiredHooks) {
        checks.push({
            id: 'leftover-hook',
            status: 'warn',
            message: `retired rulebook hook still wired: ${h.event} ${h.command} (${h.sourcePath})`,
            action: `run \`rulebook update\`, or delete the entry from ${h.sourcePath}`,
        });
    }
    for (const m of missingScripts) {
        checks.push({
            id: 'missing-script',
            status: 'warn',
            message: `${m.event} hook runs a missing script ${m.script} — it fails on every run (${m.sourcePath})`,
            action: `remove the entry from ${m.sourcePath} or restore the script`,
        });
    }
    if (retiredHooks.length === 0 && missingScripts.length === 0) {
        checks.push({
            id: 'leftover-hook',
            status: 'ok',
            message: 'every hook entry points to an existing script; no retired rulebook hooks',
        });
    }
    return { files, retiredHooks, missingScripts, checks };
}

// ─── Codex ─────────────────────────────────────────────────────────────────

/** Codex `project_doc_max_bytes` default: project docs past this are cut. */
export const CODEX_DOC_MAX_BYTES = 32 * 1024;

function size(file: string): { exists: boolean; bytes: number } {
    try {
        return { exists: true, bytes: statSync(file).size };
    } catch {
        return { exists: false, bytes: 0 };
    }
}

/** `PreToolUse` → `pre_tool_use` (the event name in Codex hook trust keys). */
export function snakeEvent(event: string): string {
    return event.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

/**
 * Codex checks: AGENTS.override.md shadowing AGENTS.md (Codex reads only the
 * override, 05 F-034), project trust and project-hook trust in
 * `~/.codex/config.toml`, and the 9router style prompt (05 F-038).
 */
export async function inspectCodex(ctx: {
    projectRoot: string;
    codexHome: string;
    platform: NodeJS.Platform;
    hooks: HookEntryInfo[];
}): Promise<CodexSection> {
    const agentsMd = size(path.join(ctx.projectRoot, 'AGENTS.md'));
    const agentsOverride = size(path.join(ctx.projectRoot, 'AGENTS.override.md'));
    const configFile = path.join(ctx.codexHome, 'config.toml');
    const installed = existsSync(ctx.codexHome) || existsSync(path.join(ctx.projectRoot, '.codex'));
    let config: TomlTable | null = null;
    try {
        config = parseToml(await fs.readFile(configFile, 'utf-8'));
    } catch {
        config = null;
    }
    const checks: PerfCheck[] = [];
    const section: CodexSection = {
        installed,
        agentsMd,
        agentsOverride,
        projectTrusted: null,
        projectHooks: { total: 0, trusted: 0 },
        provider: null,
        checks,
    };
    if (!installed) {
        checks.push({
            id: 'codex',
            status: 'info',
            message: 'Codex not found (no ~/.codex or .codex/) — skipped',
        });
        return section;
    }

    // 7.5: rulebook keeps a RULEBOOK-CODEX rules block at the top of the override
    // for Codex, so the shadowing is handled; only an override without it loses the rules.
    let hasCodexBlock = false;
    if (agentsOverride.exists) {
        try {
            hasCodexBlock = (
                await fs.readFile(path.join(ctx.projectRoot, 'AGENTS.override.md'), 'utf-8')
            ).includes('RULEBOOK-CODEX:START');
        } catch {
            hasCodexBlock = false;
        }
    }
    if (agentsOverride.exists && agentsMd.exists && hasCodexBlock) {
        checks.push({
            id: 'codex-agents-override',
            status: 'ok',
            message:
                'Codex reads AGENTS.override.md instead of AGENTS.md; it carries the RULEBOOK-CODEX rules block, so Codex gets the rulebook rules',
        });
    } else if (agentsOverride.exists && agentsMd.exists) {
        checks.push({
            id: 'codex-agents-override',
            status: 'warn',
            message: `AGENTS.override.md shadows AGENTS.md for Codex: it reads only the override (${agentsOverride.bytes} B); AGENTS.md (${agentsMd.bytes} B) never reaches it`,
            action: 'run `rulebook update` to add the RULEBOOK-CODEX rules block to AGENTS.override.md, or remove the override',
        });
    } else {
        checks.push({
            id: 'codex-agents-override',
            status: 'ok',
            message: agentsOverride.exists
                ? 'AGENTS.override.md is the only project doc Codex reads'
                : 'no AGENTS.override.md shadowing AGENTS.md',
        });
    }
    const doc = agentsOverride.exists ? agentsOverride : agentsMd;
    if (doc.bytes > CODEX_DOC_MAX_BYTES) {
        checks.push({
            id: 'codex-doc-size',
            status: 'warn',
            message: `${agentsOverride.exists ? 'AGENTS.override.md' : 'AGENTS.md'} is ${doc.bytes} B; Codex cuts project docs at ${CODEX_DOC_MAX_BYTES} B on every request`,
            action: 'move detail out of it into files the agent reads on demand',
        });
    }

    if (!config) {
        checks.push({
            id: 'codex-trust',
            status: 'info',
            message: `no ${configFile} — trust not checked`,
        });
        return section;
    }

    const root = normPath(ctx.projectRoot, ctx.platform);
    const projects = getTable(config, 'projects') ?? {};
    const entry = Object.entries(projects).find(([p]) => normPath(p, ctx.platform) === root)?.[1];
    section.projectTrusted =
        !!entry &&
        typeof entry === 'object' &&
        !Array.isArray(entry) &&
        (entry as TomlTable).trust_level === 'trusted';
    checks.push(
        section.projectTrusted
            ? { id: 'codex-trust', status: 'ok', message: 'project is trusted in Codex' }
            : {
                  id: 'codex-trust',
                  status: 'warn',
                  message:
                      'project is not trusted in Codex — it skips the project .codex/ config and hooks',
                  action: 'open the project in Codex once and trust it',
              }
    );

    const projectHooks = ctx.hooks.filter((h) => h.source === 'codex-project');
    if (projectHooks.length > 0) {
        const hooksFile = normPath(projectHooks[0].sourcePath, ctx.platform);
        const trustedKeys = new Set<string>();
        for (const key of Object.keys(getTable(config, 'hooks', 'state') ?? {})) {
            const m = key.match(/^(.*):([a-z_]+):(\d+):(\d+)$/);
            if (m && normPath(m[1], ctx.platform) === hooksFile)
                trustedKeys.add(`${m[2]}:${m[3]}:${m[4]}`);
        }
        const trusted = projectHooks.filter((h) =>
            trustedKeys.has(`${snakeEvent(h.event)}:${h.groupIndex}:${h.hookIndex}`)
        ).length;
        section.projectHooks = { total: projectHooks.length, trusted };
        checks.push(
            trusted === projectHooks.length
                ? {
                      id: 'codex-hooks-trust',
                      status: 'ok',
                      message: `all ${trusted} project Codex hook(s) have a trust record`,
                  }
                : {
                      id: 'codex-hooks-trust',
                      status: 'warn',
                      message: `${projectHooks.length - trusted} of ${projectHooks.length} project hook(s) in .codex/hooks.json are not trusted — Codex never runs them (rulebook's guards do not apply there)`,
                      action: "review and trust them when Codex asks (its hook review), or delete .codex/hooks.json if you don't want them",
                  }
        );
    }

    const providerId = typeof config.model_provider === 'string' ? config.model_provider : null;
    if (providerId) {
        const p = getTable(config, 'model_providers', providerId) ?? {};
        const text = [providerId, p.name, p.base_url]
            .filter((v) => typeof v === 'string')
            .join(' ');
        const isNineRouter = /9router/i.test(text) || /:20128\b/.test(text);
        const headers = getTable(config, 'model_providers', providerId, 'http_headers') ?? {};
        const saver = Object.entries(headers).find(
            ([k]) => k.toLowerCase() === 'x-9router-token-saver'
        )?.[1];
        const tokenSaverOff = typeof saver === 'string' && saver.toLowerCase() === 'off';
        section.provider = { id: providerId, isNineRouter, tokenSaverOff };
        if (isNineRouter && !tokenSaverOff) {
            checks.push({
                id: 'codex-9router',
                status: 'warn',
                message: `Codex goes through 9router (provider "${providerId}"): its style prompt adds ~413 tokens to every request and changes answer style (not rulebook)`,
                action: `add x-9router-token-saver = "off" under [model_providers.${providerId}.http_headers], or turn caveman mode off in 9router`,
            });
        }
    }
    return section;
}
