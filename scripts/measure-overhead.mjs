#!/usr/bin/env node
/**
 * Rulebook overhead benchmark — measures what a generated project costs a
 * frontier-model session (static context tokens, MCP schema weight and init
 * time, hook wiring, installed-file count).
 *
 * Used to track the impact of every v7 change against the budgets in
 * docs/analysis/v7-performance/05-budget-and-metrics.md. Run after `npm run
 * build`; paste the emitted markdown row into the impact ledger.
 *
 *   node scripts/measure-overhead.mjs [--json]
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encoding_for_model } from 'tiktoken';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json');

// Budgets from docs/analysis/v7-performance/05-budget-and-metrics.md
const BUDGET = {
  staticTokens: 2500,
  mcpTools: 8,
  mcpSchemaBytes: 3600,
  mcpInitMs: 150,
  hotPathHooks: 1, // at most one PreToolUse Edit|Write guard
  installedFiles: 20,
};

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rulebook-bench-'));
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'bench-fixture',
      version: '1.0.0',
      devDependencies: { typescript: '^5.0.0', vitest: '^2.0.0' },
    })
  );
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
  execFileSync('node', [path.join(repoRoot, 'dist', 'index.js'), 'init', '--yes', '--tools', 'claude-code'], {
    cwd: dir,
    stdio: 'ignore',
  });
  return dir;
}

function frontmatter(content) {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  return m ? m[1] : '';
}

function countStaticTokens(dir, enc) {
  const tok = (s) => enc.encode(s).length;
  const rd = (f) => {
    try {
      return fs.readFileSync(path.join(dir, f), 'utf8');
    } catch {
      return '';
    }
  };
  const breakdown = {};
  breakdown['CLAUDE.md'] = tok(rd('CLAUDE.md'));
  breakdown['AGENTS.md'] = tok(rd('AGENTS.md'));
  breakdown['AGENTS.override.md'] = tok(rd('AGENTS.override.md'));
  breakdown['STATE+PLANS'] = tok(rd('.rulebook/STATE.md')) + tok(rd('.rulebook/PLANS.md'));

  let rules = 0;
  const rulesDir = path.join(dir, '.claude', 'rules');
  if (fs.existsSync(rulesDir))
    for (const f of fs.readdirSync(rulesDir)) rules += tok(rd(path.join('.claude/rules', f)));
  breakdown['rules'] = rules;

  let agents = 0;
  const agentsDir = path.join(dir, '.claude', 'agents');
  if (fs.existsSync(agentsDir))
    for (const f of fs.readdirSync(agentsDir)) agents += tok(frontmatter(rd(path.join('.claude/agents', f))));
  breakdown['agents-frontmatter'] = agents;

  let skills = 0;
  const skillsDir = path.join(dir, '.claude', 'skills');
  if (fs.existsSync(skillsDir))
    for (const d of fs.readdirSync(skillsDir))
      skills += tok(frontmatter(rd(path.join('.claude/skills', d, 'SKILL.md'))));
  const cmdDir = path.join(dir, '.claude', 'commands');
  if (fs.existsSync(cmdDir))
    for (const f of fs.readdirSync(cmdDir)) skills += tok(frontmatter(rd(path.join('.claude/commands', f))));
  breakdown['skills+commands-frontmatter'] = skills;

  return breakdown;
}

function measureMcp() {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn('node', [path.join(repoRoot, 'dist', 'index.js'), 'mcp-server'], { cwd: repoRoot });
    let buf = '';
    let initMs = null;
    const done = (result) => {
      p.kill();
      resolve(result);
    };
    p.stdout.on('data', (d) => {
      buf += d.toString();
      for (const line of buf.split('\n')) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.id === 1 && initMs === null) {
            initMs = Date.now() - t0;
            p.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }) + '\n');
          }
          if (msg.id === 2) {
            const payload = JSON.stringify(msg.result.tools);
            done({ initMs, toolCount: msg.result.tools.length, schemaBytes: payload.length });
          }
        } catch {
          /* partial line */
        }
      }
    });
    p.stdin.write(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'bench', version: '1.0' } },
      }) + '\n'
    );
    setTimeout(() => done({ initMs: -1, toolCount: -1, schemaBytes: -1 }), 30000);
  });
}

function auditHooks(dir) {
  const file = path.join(dir, '.claude', 'settings.json');
  const counts = { PreToolUse: 0, SessionStart: 0, Stop: 0, UserPromptSubmit: 0, other: 0 };
  if (!fs.existsSync(file)) return counts;
  const hooks = JSON.parse(fs.readFileSync(file, 'utf8')).hooks ?? {};
  for (const [event, entries] of Object.entries(hooks)) {
    const n = (entries ?? []).reduce((acc, e) => acc + (e.hooks?.length ?? 0), 0);
    if (event in counts) counts[event] += n;
    else counts.other += n;
  }
  return counts;
}

function countInstalledFiles(dir) {
  let n = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(d, e.name));
      else n++;
    }
  };
  for (const top of ['.claude', '.rulebook']) {
    const p = path.join(dir, top);
    if (fs.existsSync(p)) walk(p);
  }
  for (const f of ['CLAUDE.md', 'AGENTS.md', 'AGENTS.override.md', '.mcp.json'])
    if (fs.existsSync(path.join(dir, f))) n++;
  return n;
}

const fixture = makeFixture();
try {
  const enc = encoding_for_model('gpt-4');
  const breakdown = countStaticTokens(fixture, enc);
  enc.free();
  const mcp = await measureMcp();
  const mcpTokens = Math.round(mcp.schemaBytes / 4);
  const staticTokens = Object.values(breakdown).reduce((a, b) => a + b, 0) + mcpTokens;
  const hooks = auditHooks(fixture);
  const hotPathHooks = hooks.PreToolUse + hooks.Stop + hooks.UserPromptSubmit;
  const installedFiles = countInstalledFiles(fixture);

  const version = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).version;
  const commit = (() => {
    try {
      return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: repoRoot }).toString().trim();
    } catch {
      return 'n/a';
    }
  })();

  const result = {
    version,
    commit,
    staticTokens,
    breakdown: { ...breakdown, 'mcp-schemas(est)': mcpTokens },
    mcp,
    hooks,
    installedFiles,
    budgets: {
      staticTokens: staticTokens <= BUDGET.staticTokens,
      mcpTools: mcp.toolCount <= BUDGET.mcpTools,
      mcpSchemaBytes: mcp.schemaBytes <= BUDGET.mcpSchemaBytes,
      mcpInitMs: mcp.initMs > 0 && mcp.initMs <= BUDGET.mcpInitMs,
      hotPathHooks: hotPathHooks <= BUDGET.hotPathHooks,
      installedFiles: installedFiles <= BUDGET.installedFiles,
    },
  };

  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Rulebook overhead @ v${version} (${commit})`);
    console.log('-'.repeat(56));
    for (const [k, v] of Object.entries(result.breakdown)) console.log(String(v).padStart(7) + '  ' + k);
    console.log(String(staticTokens).padStart(7) + '  TOTAL static tokens/session');
    console.log('-'.repeat(56));
    console.log(`MCP: ${mcp.toolCount} tools, ${mcp.schemaBytes} bytes, init ${mcp.initMs} ms`);
    console.log(
      `Hooks: PreToolUse=${hooks.PreToolUse} SessionStart=${hooks.SessionStart} Stop=${hooks.Stop} UserPromptSubmit=${hooks.UserPromptSubmit}`
    );
    console.log(`Installed files: ${installedFiles}`);
    const fails = Object.entries(result.budgets).filter(([, ok]) => !ok).map(([k]) => k);
    console.log(fails.length ? `BUDGETS FAILING (v7 targets): ${fails.join(', ')}` : 'ALL v7 BUDGETS PASS');
    console.log('-'.repeat(56));
    console.log('Ledger row (paste into 05-budget-and-metrics.md):');
    console.log(
      `| ${new Date().toISOString().slice(0, 10)} | ${commit} | <change> | ${staticTokens} | ${mcp.toolCount}/${mcp.schemaBytes}B/${mcp.initMs}ms | P:${hooks.PreToolUse} S:${hooks.SessionStart} St:${hooks.Stop} U:${hooks.UserPromptSubmit} | ${installedFiles} |`
    );
  }
} finally {
  fs.rmSync(fixture, { recursive: true, force: true });
}
