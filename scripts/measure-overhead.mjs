#!/usr/bin/env node
/**
 * Rulebook overhead benchmark (v7.5 method) — what a generated project costs a
 * frontier-model session: the context Claude Code injects at session start,
 * what Codex loads, MCP schema weight and init time, hooks that spawn on the
 * hot path, and installed files.
 *
 * Tracks every change against the budgets in
 * docs/analysis/v7-performance/05-budget-and-metrics.md (impact ledger) and
 * tests/context-budget.test.ts, which counts the same sources in CI.
 *
 *   node scripts/measure-overhead.mjs [--json] [--rulebook <package root>]
 *
 * The fixture is a TypeScript project set up the way a user's is: `init --yes`
 * then `update --yes`, with Claude Code detected and the TypeSafe plugin present
 * (a temp HOME, so the real one is never touched). `--rulebook` measures another
 * build — a directory with package.json and dist/, e.g. an older release:
 *   npm i --prefix <tmp> --ignore-scripts @hivehub/rulebook@7.1.0
 *   node scripts/measure-overhead.mjs --rulebook <tmp>/node_modules/@hivehub/rulebook
 *
 * Counted as always-on (Claude Code, tiktoken cl100k):
 * - CLAUDE.md with HTML comments stripped and `@imports` expanded (the import
 *   pulls in AGENTS.override.md), and CLAUDE.local.md;
 * - every `.claude/rules/*.md` without `paths:` frontmatter;
 * - the listing lines Claude Code shows for installed skills, commands and
 *   agents (`- name: description`, agents with ` (Tools: …)`);
 * - the deferred MCP tool names (`mcp__rulebook__<tool>`); the schemas load on
 *   first use and are reported separately.
 * Codex: AGENTS.override.md when present (Codex reads it instead of AGENTS.md),
 * else AGENTS.md. Hot-path hooks: rulebook hook handlers that spawn on an
 * ordinary tool call or prompt — PreToolUse without an `if` rule, PostToolUse,
 * UserPromptSubmit, Stop, SubagentStop. Installed files: `.claude/` and
 * `.rulebook/` (minus `.rulebook/backup/` and the `.rulebook/.update-check`
 * cache) plus the root memory files and `.mcp.json`.
 */
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encoding_for_model } from 'tiktoken';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const asJson = process.argv.includes('--json');
const rbArg = process.argv.indexOf('--rulebook');
const rulebookRoot = rbArg > 0 ? path.resolve(process.argv[rbArg + 1]) : repoRoot;

// Budgets: always-on and Codex from tests/context-budget.test.ts, MCP tools and
// schema bytes from tests/v7-budgets.test.ts, hot-path spawns from the 7.5
// plan (08-execution-plan: 0 per ordinary tool call), files and MCP init from
// 05-budget-and-metrics.md (Windows init carries node-spawn + AV overhead).
const BUDGET = {
  alwaysOnTokens: 1600,
  codexTokens: 390,
  mcpTools: 8,
  mcpSchemaBytes: 6260,
  mcpInitMs: process.platform === 'win32' ? 250 : 150,
  hotPathHooks: 0,
  installedFiles: 20,
};

const HOT_PATH_EVENTS = ['PostToolUse', 'UserPromptSubmit', 'Stop', 'SubagentStop'];

function makeFixture() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rulebook-bench-'));
  const home = path.join(tmp, 'home');
  const dir = path.join(tmp, 'project');
  fs.mkdirSync(path.join(home, '.claude', 'plugins'), { recursive: true });
  fs.writeFileSync(
    path.join(home, '.claude', 'plugins', 'installed_plugins.json'),
    JSON.stringify({ plugins: { 'typesafe@typesafe-ai': [{ scope: 'user' }] } })
  );
  fs.mkdirSync(dir);
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({
      name: 'bench-fixture',
      version: '1.0.0',
      description: 'Benchmark fixture for the rulebook overhead measurement',
      devDependencies: { typescript: '^5.0.0', vitest: '^2.0.0' },
    })
  );
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{"compilerOptions":{"strict":true}}');
  const env = { ...process.env, HOME: home, USERPROFILE: home };
  const cli = path.join(rulebookRoot, 'dist', 'index.js');
  for (const args of [['init', '--yes'], ['update', '--yes']]) {
    execFileSync('node', [cli, ...args], { cwd: dir, env, stdio: 'ignore', timeout: 180_000 });
  }
  return { tmp, dir };
}

const read = (file) => {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    return '';
  }
};
const stripComments = (text) => text.replace(/<!--[\s\S]*?-->/g, '');
const isPathScoped = (text) => /^---\r?\n[\s\S]*?^paths:/m.test(text);

function frontmatterField(text, field) {
  const fm = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1] ?? '';
  return new RegExp(`^${field}:\\s*(.+)$`, 'm').exec(fm)?.[1].trim();
}

/** A memory file as Claude Code injects it: comments stripped, `@path` import lines expanded. */
function injectedMemory(dir, rel, depth = 0) {
  const lines = [];
  for (const line of stripComments(read(path.join(dir, rel))).split(/\r?\n/)) {
    const target = /^@(\S+)\s*$/.exec(line.trim())?.[1];
    if (target && depth < 5 && fs.existsSync(path.join(dir, target))) {
      lines.push(injectedMemory(dir, target, depth + 1));
    } else lines.push(line);
  }
  return lines.join('\n');
}

const listDir = (d) => (fs.existsSync(d) ? fs.readdirSync(d).sort() : []);

function listingLines(dir) {
  const lines = [];
  const skillsDir = path.join(dir, '.claude', 'skills');
  for (const d of listDir(skillsDir)) {
    const text = read(path.join(skillsDir, d, 'SKILL.md'));
    if (text) lines.push(`- ${frontmatterField(text, 'name') ?? d}: ${frontmatterField(text, 'description') ?? ''}`);
  }
  const commandsDir = path.join(dir, '.claude', 'commands');
  for (const f of listDir(commandsDir)) {
    const text = read(path.join(commandsDir, f));
    lines.push(`- ${f.replace(/\.md$/, '')}: ${frontmatterField(text, 'description') ?? ''}`);
  }
  const agentsDir = path.join(dir, '.claude', 'agents');
  for (const f of listDir(agentsDir)) {
    const text = read(path.join(agentsDir, f));
    const tools = frontmatterField(text, 'tools');
    lines.push(
      `- ${frontmatterField(text, 'name') ?? f.replace(/\.md$/, '')}: ${frontmatterField(text, 'description') ?? ''}` +
        (tools ? ` (Tools: ${tools})` : '')
    );
  }
  return lines.join('\n');
}

function countContext(dir, enc, toolNames) {
  const tok = (s) => (s ? enc.encode(s).length : 0);

  const alwaysOn = {};
  alwaysOn['CLAUDE.md (+ imports)'] = tok(injectedMemory(dir, 'CLAUDE.md'));
  alwaysOn['CLAUDE.local.md'] = tok(stripComments(read(path.join(dir, 'CLAUDE.local.md'))));

  const onDemand = {};
  let alwaysOnRules = 0;
  let pathScopedRules = 0;
  const rulesDir = path.join(dir, '.claude', 'rules');
  for (const f of listDir(rulesDir)) {
    const text = read(path.join(rulesDir, f));
    if (isPathScoped(text)) pathScopedRules += tok(text);
    else alwaysOnRules += tok(stripComments(text));
  }
  alwaysOn['rules (always-on)'] = alwaysOnRules;
  alwaysOn['skill/command/agent listing'] = tok(listingLines(dir));
  alwaysOn['deferred MCP names'] = tok(toolNames.map((n) => `mcp__rulebook__${n}`).join('\n'));

  onDemand['rules (path-scoped)'] = pathScopedRules;
  let specs = 0;
  for (const f of listDir(path.join(dir, '.rulebook', 'specs')))
    specs += tok(read(path.join(dir, '.rulebook', 'specs', f)));
  onDemand['.rulebook/specs'] = specs;
  onDemand['AGENTS.md'] = tok(read(path.join(dir, 'AGENTS.md')));

  const override = path.join(dir, 'AGENTS.override.md');
  const codexFile = fs.existsSync(override) ? 'AGENTS.override.md' : 'AGENTS.md';
  const codexTokens = tok(read(path.join(dir, codexFile)));
  return { alwaysOn, onDemand, codexFile, codexTokens };
}

function probeMcp(dir) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const p = spawn('node', [path.join(rulebookRoot, 'dist', 'mcp', 'rulebook-server.js')], { cwd: dir });
    let buf = '';
    let initMs = null;
    let settled = false;
    const done = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      p.kill();
      resolve(result);
    };
    const timer = setTimeout(() => done({ initMs: -1, tools: [] }), 30000);
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
          if (msg.id === 2) done({ initMs, tools: msg.result.tools });
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
  });
}

/** Init time is the median of three cold starts; tools and schema come from the first. */
async function measureMcp(dir, enc) {
  const runs = [];
  for (let i = 0; i < 3; i++) runs.push(await probeMcp(dir));
  const times = runs.map((r) => r.initMs).sort((a, b) => a - b);
  const schema = JSON.stringify(runs[0].tools);
  return {
    toolNames: runs[0].tools.map((t) => t.name),
    toolCount: runs[0].tools.length,
    schemaBytes: schema.length,
    schemaTokens: enc.encode(schema).length,
    initMs: times[1],
  };
}

function auditHooks(dir) {
  const counts = {};
  let hotPath = 0;
  let ifGated = 0;
  for (const file of ['settings.json', 'settings.local.json']) {
    const text = read(path.join(dir, '.claude', file));
    if (!text) continue;
    for (const [event, entries] of Object.entries(JSON.parse(text).hooks ?? {})) {
      for (const entry of entries ?? []) {
        for (const h of entry.hooks ?? []) {
          counts[event] = (counts[event] ?? 0) + 1;
          if (event === 'PreToolUse' && h.if) ifGated++;
          else if (event === 'PreToolUse' || HOT_PATH_EVENTS.includes(event)) hotPath++;
        }
      }
    }
  }
  return { counts, hotPath, ifGated };
}

function countInstalledFiles(dir) {
  // Not part of the install: update's backups of replaced files and the
  // update-check cache (.rulebook/.update-check).
  const skip = [path.join('.rulebook', 'backup'), path.join('.rulebook', '.update-check')];
  let n = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (skip.includes(path.relative(dir, p))) continue;
      if (e.isDirectory()) walk(p);
      else n++;
    }
  };
  for (const top of ['.claude', '.rulebook']) if (fs.existsSync(path.join(dir, top))) walk(path.join(dir, top));
  for (const f of ['CLAUDE.md', 'CLAUDE.local.md', 'AGENTS.md', 'AGENTS.override.md', '.mcp.json'])
    if (fs.existsSync(path.join(dir, f))) n++;
  return n;
}

const { tmp, dir: fixture } = makeFixture();
try {
  // Files and hooks first: the MCP server may write runtime state into the project.
  const installedFiles = countInstalledFiles(fixture);
  const hooks = auditHooks(fixture);
  const enc = encoding_for_model('gpt-4');
  const mcp = await measureMcp(fixture, enc);
  const { alwaysOn, onDemand, codexFile, codexTokens } = countContext(fixture, enc, mcp.toolNames);
  enc.free();
  onDemand['MCP schemas (first use)'] = mcp.schemaTokens;
  const alwaysOnTokens = Object.values(alwaysOn).reduce((a, b) => a + b, 0);
  const onDemandTokens = Object.values(onDemand).reduce((a, b) => a + b, 0);
  const mcpEntry = JSON.parse(read(path.join(fixture, '.mcp.json')) || '{}').mcpServers?.rulebook ?? null;

  const version = JSON.parse(read(path.join(rulebookRoot, 'package.json'))).version;
  const commit = (() => {
    try {
      return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: rulebookRoot, stdio: ['ignore', 'pipe', 'ignore'] })
        .toString()
        .trim();
    } catch {
      return 'npm';
    }
  })();

  const result = {
    version,
    commit,
    alwaysOnTokens,
    onDemandTokens,
    alwaysOn,
    onDemand,
    codex: { file: codexFile, tokens: codexTokens },
    mcp: { toolCount: mcp.toolCount, schemaBytes: mcp.schemaBytes, schemaTokens: mcp.schemaTokens, initMs: mcp.initMs, entry: mcpEntry },
    hooks,
    installedFiles,
    budgets: {
      alwaysOnTokens: alwaysOnTokens <= BUDGET.alwaysOnTokens,
      codexTokens: codexTokens <= BUDGET.codexTokens,
      mcpTools: mcp.toolCount <= BUDGET.mcpTools,
      mcpSchemaBytes: mcp.schemaBytes <= BUDGET.mcpSchemaBytes,
      mcpInitMs: mcp.initMs > 0 && mcp.initMs <= BUDGET.mcpInitMs,
      hotPathHooks: hooks.hotPath <= BUDGET.hotPathHooks,
      installedFiles: installedFiles <= BUDGET.installedFiles,
    },
  };

  const hookSummary =
    Object.entries(hooks.counts)
      .map(([e, n]) => `${e}=${n}`)
      .join(' ') || 'none';
  if (asJson) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    console.log(`Rulebook overhead @ v${version} (${commit})`);
    console.log('─── ALWAYS-ON (Claude Code, every session) ' + '─'.repeat(13));
    for (const [k, v] of Object.entries(alwaysOn)) console.log(String(v).padStart(7) + '  ' + k);
    console.log(String(alwaysOnTokens).padStart(7) + `  ALWAYS-ON TOTAL (budget ${BUDGET.alwaysOnTokens})`);
    console.log(String(codexTokens).padStart(7) + `  Codex: ${codexFile} (budget ${BUDGET.codexTokens})`);
    console.log('─── ON-DEMAND (loaded when touched) ' + '─'.repeat(20));
    for (const [k, v] of Object.entries(onDemand)) console.log(String(v).padStart(7) + '  ' + k);
    console.log('-'.repeat(56));
    console.log(
      `MCP: ${mcp.toolCount} tools, ${mcp.schemaBytes} B, init ${mcp.initMs} ms median of 3 (budget ${BUDGET.mcpInitMs} on ${process.platform})`
    );
    console.log(`MCP entry: ${mcpEntry ? [mcpEntry.command, ...(mcpEntry.args ?? [])].join(' ') : 'none'}`);
    console.log(`Hooks: ${hookSummary}; hot path ${hooks.hotPath}, if-gated ${hooks.ifGated}`);
    console.log(`Installed files: ${installedFiles}`);
    const fails = Object.entries(result.budgets)
      .filter(([, ok]) => !ok)
      .map(([k]) => k);
    console.log(fails.length ? `BUDGETS FAILING: ${fails.join(', ')}` : 'ALL BUDGETS PASS');
    console.log('-'.repeat(56));
    console.log('Ledger row (paste into 05-budget-and-metrics.md):');
    console.log(
      `| v${version} | ${alwaysOnTokens} | ${codexTokens} | ${mcp.toolCount}/${mcp.schemaBytes}B/${mcp.initMs}ms | ${hooks.hotPath} (${hookSummary}) | ${installedFiles} |`
    );
  }
} finally {
  fs.rmSync(tmp, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
