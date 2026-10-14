#!/usr/bin/env node
/**
 * Build src/core/migration/legacy-catalogue.json — the content hashes of
 * every file a rulebook release since v5.0.0 installed into a project under
 * .claude/{rules,agents,skills,commands,hooks}/, .rulebook/specs/ and
 * .rulebook/rules/, in the INSTALLED (projected) form.
 *
 * `rulebook update` uses it to tell an unedited rulebook file (hash in the
 * catalogue → safe to move to .rulebook/backup/ or refresh) from one the
 * user edited (unknown hash → kept and reported).
 *
 * Usage: npm run build:catalogue  (node scripts/build-legacy-catalogue.mjs [--out <file>])
 * Needs the git tags (v5.0.0 and later); untagged releases are listed in
 * UNTAGGED_RELEASES, and HEAD (the templates being shipped) is included too.
 * Run it whenever a shipped template changes or a release is cut, and commit
 * the JSON — the build only copies it into dist/.
 *
 * How each release projected templates (read from the tags' generators):
 * - rules: templates/rules/<f>.md copied verbatim to .rulebook/rules/<f>.md
 *   (v5–v6 canonical store) and to .claude/rules/<f>.md (v5.3+ path-scoped
 *   language rules); the canonical store projected into
 *   .claude/rules/<name>.md as `# ${description || name}\n\n${body}\n` with
 *   the frontmatter stripped (rule-engine.ts projectToClaudeCode, v5.0–v7).
 * - agents: templates/agents/<f>.md (top level) with {{language}},
 *   {{framework}}, {{test_framework}}, {{file_naming}} substituted from the
 *   project's primary language (or left raw: v5's second installer copied
 *   without substitution).
 * - skills: templates/skills/<category>/<name>/SKILL.md → .claude/skills/<name>/SKILL.md.
 * - commands: templates/commands/<f>.md → .claude/commands/<f>.md.
 * - hooks: templates/hooks/<f>.{sh,ps1} (Claude Code hooks, not the git
 *   *-pre-commit/*-pre-push scripts) → .claude/hooks/<f>.
 * - specs: templates/core/<NAME>.md → .rulebook/specs/<NAME>.md wrapped in
 *   `<!-- NAME:START -->` / `<!-- NAME:END -->` (writeModularFile); keys are
 *   lowercase because v7 renamed specs to lowercase.
 */
import { execFileSync, spawnSync } from 'child_process';
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const HASH_LENGTH = 12;
const MIN_VERSION = [5, 0, 0];
/** Releases published without a git tag → the commit they were cut from. */
const UNTAGGED_RELEASES = {
    'v7.4.0': '1035321', // Merge pull request #30 from hivellm/release/v7.4.0
};

const outArg = process.argv.indexOf('--out');
const OUT =
    outArg > 0
        ? path.resolve(process.argv[outArg + 1])
        : path.join(ROOT, 'src', 'core', 'migration', 'legacy-catalogue.json');

// ── Normalization (must match src/core/migration/legacy-catalogue.ts) ────────
function normalizeContent(content) {
    const noBom = content.charCodeAt(0) === 0xfeff ? content.slice(1) : content;
    return noBom
        .replace(/\r\n?/g, '\n')
        .split('\n')
        .map((line) => line.replace(/\s+$/, ''))
        .join('\n')
        .replace(/\n+$/, '');
}

function hash(content) {
    return createHash('sha256')
        .update(normalizeContent(content), 'utf8')
        .digest('hex')
        .slice(0, HASH_LENGTH);
}

// ── Agent placeholder substitution (every value any release could write) ─────
const TEST_FRAMEWORK = {
    typescript: 'vitest',
    javascript: 'jest',
    python: 'pytest',
    rust: 'cargo test',
    go: 'go test',
    java: 'JUnit',
    csharp: 'xUnit',
    ruby: 'RSpec',
    php: 'PHPUnit',
    swift: 'XCTest',
    kotlin: 'JUnit',
    dart: 'flutter test',
    elixir: 'ExUnit',
    scala: 'ScalaTest',
};
const FILE_NAMING = {
    typescript: 'kebab-case',
    javascript: 'kebab-case',
    python: 'snake_case',
    rust: 'snake_case',
    go: 'snake_case',
    java: 'PascalCase',
    csharp: 'PascalCase',
    ruby: 'snake_case',
    php: 'PascalCase',
    swift: 'PascalCase',
    kotlin: 'PascalCase',
    dart: 'snake_case',
    elixir: 'snake_case',
    scala: 'PascalCase',
};
/** Display names (v7.5+ writes these; older releases wrote the lowercase id). */
const DISPLAY = {
    typescript: 'TypeScript',
    javascript: 'JavaScript',
    python: 'Python',
    rust: 'Rust',
    go: 'Go',
    java: 'Java',
    csharp: 'C#',
    cpp: 'C++',
    c: 'C',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    dart: 'Dart',
    elixir: 'Elixir',
    scala: 'Scala',
    erlang: 'Erlang',
    haskell: 'Haskell',
    julia: 'Julia',
    lua: 'Lua',
    r: 'R',
    solidity: 'Solidity',
    zig: 'Zig',
};

function agentVariants(template) {
    const out = new Set([template]);
    if (!template.includes('{{')) return out;
    for (const id of Object.keys(DISPLAY)) {
        for (const language of [id, DISPLAY[id]]) {
            const values = {
                '{{language}}': language,
                '{{framework}}': 'none',
                '{{test_framework}}': TEST_FRAMEWORK[id] || 'the project test framework',
                '{{file_naming}}': FILE_NAMING[id] || 'kebab-case',
            };
            let result = template;
            for (const [key, value] of Object.entries(values))
                result = result.replaceAll(key, value);
            out.add(result);
        }
    }
    return out;
}

// ── Rule projection (rule-engine.ts, v5.0–v7) ────────────────────────────────
function projectRule(fileBase, content) {
    const fm = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    const meta = {};
    let body = content;
    if (fm) {
        body = fm[2];
        for (const line of fm[1].split(/\r?\n/)) {
            const kv = line.match(/^(\w+)\s*:\s*(.+)$/);
            if (!kv) continue;
            meta[kv[1]] = kv[2].trim().replace(/^["']|["']$/g, '');
        }
    }
    const name = meta.name || fileBase;
    return { name, content: `# ${meta.description || name}\n\n${body.trim()}\n` };
}

// ── Spec wrapper (generator.ts writeModularFile) ─────────────────────────────
function wrapSpec(name, content) {
    const header = `<!-- ${name}:START -->\n`;
    const footer = `\n<!-- ${name}:END -->`;
    let out = content.trim();
    if (!out.startsWith(header.trim())) out = header + out;
    if (!out.endsWith(footer.trim())) out = out + footer;
    return out;
}

/** Installed files for one template file: Array<[installedPath, content]>. */
function project(templatePath, content) {
    const parts = templatePath.split('/'); // templates/<dir>/...
    const dir = parts[1];
    const file = parts[parts.length - 1];
    const base = file.replace(/\.md$/, '');
    const out = [];
    if (dir === 'rules' && parts.length === 3 && file.endsWith('.md')) {
        out.push([`.rulebook/rules/${file}`, content]);
        out.push([`.claude/rules/${file}`, content]);
        const projected = projectRule(base, content);
        out.push([`.claude/rules/${projected.name}.md`, projected.content]);
    } else if (dir === 'agents' && parts.length === 3 && file.endsWith('.md')) {
        for (const variant of agentVariants(content)) out.push([`.claude/agents/${file}`, variant]);
    } else if (dir === 'skills' && parts.length === 5 && file === 'SKILL.md') {
        out.push([`.claude/skills/${parts[3]}/SKILL.md`, content]);
    } else if (dir === 'commands' && parts.length === 3 && file.endsWith('.md')) {
        out.push([`.claude/commands/${file}`, content]);
    } else if (
        dir === 'hooks' &&
        parts.length === 3 &&
        /\.(sh|ps1)$/.test(file) &&
        !/-pre-(commit|push)\.sh$/.test(file)
    ) {
        out.push([`.claude/hooks/${file}`, content]);
    } else if (dir === 'core' && parts.length === 3 && file.endsWith('.md')) {
        out.push([`.rulebook/specs/${file}`, wrapSpec(base.toUpperCase(), content)]);
    }
    return out;
}

// ── Git access ───────────────────────────────────────────────────────────────
const git = (...args) =>
    execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 28 });

function parseVersion(v) {
    const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(v);
    return m ? m.slice(1, 4).map(Number) : null;
}
function atLeast(v, min) {
    for (let i = 0; i < 3; i++) if (v[i] !== min[i]) return v[i] > min[i];
    return true;
}

function releaseRefs() {
    const tags = git('tag', '--list', 'v*')
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => {
            const v = parseVersion(t);
            return v && atLeast(v, MIN_VERSION);
        })
        .sort((a, b) => {
            const va = parseVersion(a);
            const vb = parseVersion(b);
            for (let i = 0; i < 3; i++) if (va[i] !== vb[i]) return va[i] - vb[i];
            return 0;
        });
    const refs = tags.map((t) => ({ ref: t, label: t }));
    for (const [label, commit] of Object.entries(UNTAGGED_RELEASES)) {
        if (!tags.includes(label)) refs.push({ ref: commit, label });
    }
    // The templates this build ships, so a current install counts as unedited.
    refs.push({ ref: 'HEAD', label: 'HEAD' });
    return refs;
}

function readBlobs(shas) {
    const input = shas.join('\n') + '\n';
    const res = spawnSync('git', ['cat-file', '--batch'], {
        cwd: ROOT,
        input,
        maxBuffer: 1 << 30,
    });
    if (res.status !== 0) throw new Error(`git cat-file failed: ${res.stderr}`);
    const buf = res.stdout;
    const blobs = new Map();
    let pos = 0;
    for (const sha of shas) {
        const nl = buf.indexOf(0x0a, pos);
        const header = buf.subarray(pos, nl).toString('utf8').split(' ');
        const size = Number(header[2]);
        blobs.set(sha, buf.subarray(nl + 1, nl + 1 + size).toString('utf8'));
        pos = nl + 1 + size + 1;
    }
    return blobs;
}

// ── Build ────────────────────────────────────────────────────────────────────
const refs = releaseRefs();
const entriesByRef = [];
const allShas = new Set();
for (const { ref } of refs) {
    const lines = git('ls-tree', '-r', ref, 'templates/').split('\n').filter(Boolean);
    const entries = [];
    for (const line of lines) {
        const [meta, filePath] = line.split('\t');
        const sha = meta.split(' ')[2];
        if (!/^templates\/(rules|agents|skills|commands|hooks|core)\//.test(filePath)) continue;
        entries.push({ filePath, sha });
        allShas.add(sha);
    }
    entriesByRef.push(entries);
}

const blobs = readBlobs([...allShas]);
const files = new Map();
const seen = new Set();
for (const entries of entriesByRef) {
    for (const { filePath, sha } of entries) {
        const key = `${filePath}\0${sha}`;
        if (seen.has(key)) continue;
        seen.add(key);
        for (const [installed, content] of project(filePath, blobs.get(sha))) {
            const k = installed.toLowerCase();
            if (!files.has(k)) files.set(k, new Set());
            files.get(k).add(hash(content));
        }
    }
}

// One entry per line keeps diffs readable; hashes are concatenated
// fixed-width hex to keep the file small.
const keys = [...files.keys()].sort();
const body = keys.map((k) => `    ${JSON.stringify(k)}: "${[...files.get(k)].sort().join('')}"`);
const json =
    '{\n' +
    `  "hashLength": ${HASH_LENGTH},\n` +
    `  "releases": ${JSON.stringify(refs.map((r) => r.label))},\n` +
    '  "files": {\n' +
    body.join(',\n') +
    '\n  }\n}\n';
writeFileSync(OUT, json);
const total = keys.reduce((n, k) => n + files.get(k).size, 0);
console.log(
    `legacy catalogue: ${keys.length} paths, ${total} hashes from ${refs.length} releases → ${path.relative(ROOT, OUT)} (${json.length} bytes)`
);
