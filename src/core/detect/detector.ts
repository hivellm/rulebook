import path from 'path';
import { existsSync } from 'fs';
import { readdir } from 'fs/promises';
import { fileExists, findFiles, readFile, readJsonFile } from '../../utils/file-system.js';
import type {
    DetectionResult,
    LanguageDetection,
    LibraryDetection,
    ModuleDetection,
    ExistingAgentsInfo,
    AgentBlock,
    MonorepoDetection,
} from '../../types.js';
import { LIBRARY_REGISTRY } from './library-registry.js';

export async function detectProject(cwd: string = process.cwd()): Promise<DetectionResult> {
    const languages = await detectLanguages(cwd);
    const libraries = await detectLibraries(cwd);
    const modules = await detectModules(cwd);
    const existingAgents = await detectExistingAgents(cwd);
    const gitHooks = await detectGitHooks(cwd);
    const monorepo = await detectMonorepo(cwd);

    return {
        languages,
        libraries,
        modules,
        existingAgents,
        gitHooks,
        monorepo,
    };
}

/**
 * Detect monorepo structure: Turborepo, Nx, pnpm workspaces, Lerna, or manual.
 */
export async function detectMonorepo(cwd: string): Promise<MonorepoDetection> {
    // Turborepo
    if (existsSync(path.join(cwd, 'turbo.json'))) {
        const packages = await discoverPackages(cwd);
        return { detected: true, tool: 'turborepo', packages };
    }

    // Nx
    if (existsSync(path.join(cwd, 'nx.json'))) {
        const packages = await discoverPackages(cwd);
        return { detected: true, tool: 'nx', packages };
    }

    // pnpm workspaces
    if (existsSync(path.join(cwd, 'pnpm-workspace.yaml'))) {
        const packages = await discoverPackages(cwd);
        return { detected: true, tool: 'pnpm', packages };
    }

    // Lerna
    if (existsSync(path.join(cwd, 'lerna.json'))) {
        const packages = await discoverPackages(cwd);
        return { detected: true, tool: 'lerna', packages };
    }

    // Manual monorepo — packages/ or apps/ directory with multiple package.json files
    const packages = await discoverPackages(cwd);
    if (packages.length >= 2) {
        return { detected: true, tool: 'manual', packages };
    }

    return { detected: false, tool: null, packages: [] };
}

/**
 * Discover package directories by looking for package.json in packages/ and apps/.
 */
async function discoverPackages(cwd: string): Promise<string[]> {
    const packageDirs: string[] = [];
    const searchDirs = ['packages', 'apps', 'libs', 'services'];

    for (const searchDir of searchDirs) {
        const absDir = path.join(cwd, searchDir);
        if (!existsSync(absDir)) continue;

        try {
            const entries = await readdir(absDir, { withFileTypes: true });
            for (const entry of entries) {
                if (!entry.isDirectory()) continue;
                const pkgJson = path.join(absDir, entry.name, 'package.json');
                if (existsSync(pkgJson)) {
                    packageDirs.push(`${searchDir}/${entry.name}`);
                }
            }
        } catch {
            // ignore unreadable dirs
        }
    }

    return packageDirs;
}

async function detectLanguages(cwd: string): Promise<LanguageDetection[]> {
    const detections: LanguageDetection[] = [];

    // Detect Rust
    const cargoToml = path.join(cwd, 'Cargo.toml');
    if (await fileExists(cargoToml)) {
        const rsFiles = await findFiles('**/*.rs', cwd);
        detections.push({
            language: 'rust',
            confidence: rsFiles.length > 0 ? 1.0 : 0.8,
            indicators: ['Cargo.toml', `${rsFiles.length} .rs files`],
        });
    }

    // Detect TypeScript
    const packageJson = path.join(cwd, 'package.json');
    const tsConfig = path.join(cwd, 'tsconfig.json');
    if ((await fileExists(packageJson)) || (await fileExists(tsConfig))) {
        const tsFiles = await findFiles('**/*.ts', cwd);
        detections.push({
            language: 'typescript',
            confidence: tsFiles.length > 0 ? 1.0 : 0.7,
            indicators: [
                (await fileExists(packageJson)) ? 'package.json' : '',
                (await fileExists(tsConfig)) ? 'tsconfig.json' : '',
                `${tsFiles.length} .ts files`,
            ].filter(Boolean),
        });
    }

    // Detect Python
    const pyprojectToml = path.join(cwd, 'pyproject.toml');
    const requirementsTxt = path.join(cwd, 'requirements.txt');
    const setupPy = path.join(cwd, 'setup.py');
    if (
        (await fileExists(pyprojectToml)) ||
        (await fileExists(requirementsTxt)) ||
        (await fileExists(setupPy))
    ) {
        const pyFiles = await findFiles('**/*.py', cwd);
        detections.push({
            language: 'python',
            confidence: pyFiles.length > 0 ? 1.0 : 0.7,
            indicators: [
                (await fileExists(pyprojectToml)) ? 'pyproject.toml' : '',
                (await fileExists(requirementsTxt)) ? 'requirements.txt' : '',
                (await fileExists(setupPy)) ? 'setup.py' : '',
                `${pyFiles.length} .py files`,
            ].filter(Boolean),
        });
    }

    // Detect Go
    const goMod = path.join(cwd, 'go.mod');
    if (await fileExists(goMod)) {
        const goFiles = await findFiles('**/*.go', cwd);
        detections.push({
            language: 'go',
            confidence: goFiles.length > 0 ? 1.0 : 0.8,
            indicators: ['go.mod', `${goFiles.length} .go files`],
        });
    }

    // Detect Java
    const pomXml = path.join(cwd, 'pom.xml');
    const buildGradle = path.join(cwd, 'build.gradle');
    const buildGradleKts = path.join(cwd, 'build.gradle.kts');
    if (
        (await fileExists(pomXml)) ||
        (await fileExists(buildGradle)) ||
        (await fileExists(buildGradleKts))
    ) {
        const javaFiles = await findFiles('**/*.java', cwd);
        detections.push({
            language: 'java',
            confidence: javaFiles.length > 0 ? 1.0 : 0.7,
            indicators: [
                (await fileExists(pomXml)) ? 'pom.xml' : '',
                (await fileExists(buildGradle)) ? 'build.gradle' : '',
                (await fileExists(buildGradleKts)) ? 'build.gradle.kts' : '',
                `${javaFiles.length} .java files`,
            ].filter(Boolean),
        });
    }

    // Detect C/C++
    const cmakeLists = path.join(cwd, 'CMakeLists.txt');
    const makeFile = path.join(cwd, 'Makefile');
    if ((await fileExists(cmakeLists)) || (await fileExists(makeFile))) {
        const cppFiles = await findFiles('**/*.{cpp,hpp,cc,h,c}', cwd);
        detections.push({
            language: 'cpp',
            confidence: cppFiles.length > 0 ? 1.0 : 0.8,
            indicators: [
                (await fileExists(cmakeLists)) ? 'CMakeLists.txt' : '',
                (await fileExists(makeFile)) ? 'Makefile' : '',
                `${cppFiles.length} C/C++ files`,
            ].filter(Boolean),
        });
    }

    // Detect Solidity
    const hardhatConfig = path.join(cwd, 'hardhat.config.js');
    const foundryToml = path.join(cwd, 'foundry.toml');
    if ((await fileExists(hardhatConfig)) || (await fileExists(foundryToml))) {
        const solFiles = await findFiles('**/*.sol', cwd);
        detections.push({
            language: 'solidity',
            confidence: solFiles.length > 0 ? 1.0 : 0.8,
            indicators: [
                (await fileExists(hardhatConfig)) ? 'hardhat.config.js' : '',
                (await fileExists(foundryToml)) ? 'foundry.toml' : '',
                `${solFiles.length} .sol files`,
            ].filter(Boolean),
        });
    }

    // Detect Zig
    const buildZig = path.join(cwd, 'build.zig');
    if (await fileExists(buildZig)) {
        const zigFiles = await findFiles('**/*.zig', cwd);
        detections.push({
            language: 'zig',
            confidence: zigFiles.length > 0 ? 1.0 : 0.9,
            indicators: ['build.zig', `${zigFiles.length} .zig files`],
        });
    }

    // Detect Erlang
    const rebarConfig = path.join(cwd, 'rebar.config');
    if (await fileExists(rebarConfig)) {
        const erlFiles = await findFiles('**/*.erl', cwd);
        detections.push({
            language: 'erlang',
            confidence: erlFiles.length > 0 ? 1.0 : 0.8,
            indicators: ['rebar.config', `${erlFiles.length} .erl files`],
        });
    }

    // Detect JavaScript (pure, not TypeScript)
    if (await fileExists(packageJson)) {
        const jsFiles = await findFiles('**/*.js', cwd);
        const hasTS = detections.some((d) => d.language === 'typescript');
        if (!hasTS && jsFiles.length > 0) {
            const pkg = await readJsonFile<{ type?: string }>(packageJson);
            detections.push({
                language: 'javascript',
                confidence: 0.9,
                indicators: [
                    'package.json',
                    `${jsFiles.length} .js files`,
                    pkg?.type === 'module' ? 'ESM' : '',
                ].filter(Boolean),
            });
        }
    }

    // Detect Dart
    const pubspecYaml = path.join(cwd, 'pubspec.yaml');
    if (await fileExists(pubspecYaml)) {
        const dartFiles = await findFiles('**/*.dart', cwd);
        detections.push({
            language: 'dart',
            confidence: dartFiles.length > 0 ? 1.0 : 0.8,
            indicators: ['pubspec.yaml', `${dartFiles.length} .dart files`],
        });
    }

    // Detect Ruby
    const gemfile = path.join(cwd, 'Gemfile');
    const gemspec = await findFiles('**/*.gemspec', cwd);
    if ((await fileExists(gemfile)) || gemspec.length > 0) {
        const rbFiles = await findFiles('**/*.rb', cwd);
        detections.push({
            language: 'ruby',
            confidence: rbFiles.length > 0 ? 1.0 : 0.7,
            indicators: [
                (await fileExists(gemfile)) ? 'Gemfile' : '',
                gemspec.length > 0 ? `${gemspec.length} .gemspec` : '',
                `${rbFiles.length} .rb files`,
            ].filter(Boolean),
        });
    }

    // Detect Scala
    const buildSbt = path.join(cwd, 'build.sbt');
    if (await fileExists(buildSbt)) {
        const scalaFiles = await findFiles('**/*.scala', cwd);
        detections.push({
            language: 'scala',
            confidence: scalaFiles.length > 0 ? 1.0 : 0.8,
            indicators: ['build.sbt', `${scalaFiles.length} .scala files`],
        });
    }

    // Detect R
    const descriptionFile = path.join(cwd, 'DESCRIPTION');
    if (await fileExists(descriptionFile)) {
        const rFiles = await findFiles('**/*.R', cwd);
        detections.push({
            language: 'r',
            confidence: rFiles.length > 0 ? 1.0 : 0.8,
            indicators: ['DESCRIPTION', `${rFiles.length} .R files`],
        });
    }

    // Detect Haskell
    const stackYaml = path.join(cwd, 'stack.yaml');
    const cabalFiles = await findFiles('**/*.cabal', cwd);
    if ((await fileExists(stackYaml)) || cabalFiles.length > 0) {
        const hsFiles = await findFiles('**/*.hs', cwd);
        detections.push({
            language: 'haskell',
            confidence: hsFiles.length > 0 ? 1.0 : 0.8,
            indicators: [
                (await fileExists(stackYaml)) ? 'stack.yaml' : '',
                cabalFiles.length > 0 ? `${cabalFiles.length} .cabal` : '',
                `${hsFiles.length} .hs files`,
            ].filter(Boolean),
        });
    }

    // Detect Julia
    const projectToml = path.join(cwd, 'Project.toml');
    if (await fileExists(projectToml)) {
        const jlFiles = await findFiles('**/*.jl', cwd);
        detections.push({
            language: 'julia',
            confidence: jlFiles.length > 0 ? 1.0 : 0.8,
            indicators: ['Project.toml', `${jlFiles.length} .jl files`],
        });
    }

    // Detect Lua
    const luaFiles = await findFiles('**/*.lua', cwd);
    if (luaFiles.length > 5) {
        detections.push({
            language: 'lua',
            confidence: 0.9,
            indicators: [`${luaFiles.length} .lua files`],
        });
    }

    // Sort by confidence
    return detections.sort((a, b) => b.confidence - a.confidence);
}

interface MCPConfig {
    mcpServers?: Record<string, unknown>;
    servers?: Record<string, unknown>;
}

async function detectModules(cwd: string): Promise<ModuleDetection[]> {
    const modules: ModuleDetection[] = [];

    // Check for MCP configuration files
    const mcpConfigPaths = [
        path.join(cwd, 'mcp.json'),
        path.join(cwd, 'mcp-config.json'),
        path.join(cwd, '.cursor', 'mcp.json'),
    ];

    for (const mcpPath of mcpConfigPaths) {
        if (await fileExists(mcpPath)) {
            try {
                const config = await readJsonFile<MCPConfig>(mcpPath);
                if (config) {
                    // Check for Vectorizer
                    if (config.mcpServers?.vectorizer || config.servers?.vectorizer) {
                        modules.push({
                            module: 'vectorizer',
                            detected: true,
                            source: mcpPath,
                        });
                    }

                    // Check for Synap
                    if (config.mcpServers?.synap || config.servers?.synap) {
                        modules.push({
                            module: 'synap',
                            detected: true,
                            source: mcpPath,
                        });
                    }

                    // Check for Context7
                    if (config.mcpServers?.context7 || config.servers?.context7) {
                        modules.push({
                            module: 'context7',
                            detected: true,
                            source: mcpPath,
                        });
                    }

                    // Check for GitHub MCP Server
                    if (config.mcpServers?.github || config.servers?.github) {
                        modules.push({
                            module: 'github',
                            detected: true,
                            source: mcpPath,
                        });
                    }

                    // Check for Playwright MCP Server
                    if (config.mcpServers?.playwright || config.servers?.playwright) {
                        modules.push({
                            module: 'playwright',
                            detected: true,
                            source: mcpPath,
                        });
                    }

                    // Check for Rulebook MCP Server
                    if (config.mcpServers?.rulebook || config.servers?.rulebook) {
                        modules.push({
                            module: 'rulebook_mcp',
                            detected: true,
                            source: mcpPath,
                        });
                    }

                    // Check for Sequential Thinking MCP Server (various key names)
                    const seqKeys = [
                        'sequential-thinking',
                        'sequential_thinking',
                        'sequentialThinking',
                    ];
                    const hasSeqThinking =
                        seqKeys.some((k) => config.mcpServers?.[k] || config.servers?.[k]) ||
                        Object.entries(config.mcpServers ?? {}).some(
                            ([, v]) =>
                                typeof v === 'object' &&
                                v !== null &&
                                'args' in v &&
                                Array.isArray((v as { args?: unknown }).args) &&
                                (v as { args: string[] }).args.some(
                                    (a) =>
                                        typeof a === 'string' && a.includes('sequential-thinking')
                                )
                        );
                    if (hasSeqThinking) {
                        modules.push({
                            module: 'sequential_thinking',
                            detected: true,
                            source: mcpPath,
                        });
                    }
                }
            } catch {
                // Ignore JSON parse errors
            }
        }
    }

    // Add undetected modules
    const detectedModules = new Set(modules.map((m) => m.module));
    const allModules: Array<
        | 'vectorizer'
        | 'synap'
        | 'context7'
        | 'github'
        | 'playwright'
        | 'rulebook_mcp'
        | 'sequential_thinking'
    > = [
        'vectorizer',
        'synap',
        'context7',
        'github',
        'playwright',
        'rulebook_mcp',
        'sequential_thinking',
    ];

    for (const module of allModules) {
        if (!detectedModules.has(module)) {
            modules.push({
                module,
                detected: false,
            });
        }
    }

    return modules;
}

async function detectExistingAgents(cwd: string): Promise<ExistingAgentsInfo | null> {
    const agentsPath = path.join(cwd, 'AGENTS.md');

    if (!(await fileExists(agentsPath))) {
        return null;
    }

    const content = await readFile(agentsPath);
    const blocks = parseAgentBlocks(content);

    return {
        exists: true,
        path: agentsPath,
        content,
        blocks,
    };
}

function parseAgentBlocks(content: string): AgentBlock[] {
    const blocks: AgentBlock[] = [];
    const lines = content.split('\n');

    let currentBlock: { name: string; startLine: number; content: string[] } | null = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const startMatch = line.match(/<!--\s*([A-Z_]+):START\s*-->/);
        const endMatch = line.match(/<!--\s*([A-Z_]+):END\s*-->/);

        if (startMatch) {
            currentBlock = {
                name: startMatch[1],
                startLine: i,
                content: [line],
            };
        } else if (endMatch && currentBlock) {
            currentBlock.content.push(line);
            blocks.push({
                name: currentBlock.name,
                startLine: currentBlock.startLine,
                endLine: i,
                content: currentBlock.content.join('\n'),
            });
            currentBlock = null;
        } else if (currentBlock) {
            currentBlock.content.push(line);
        }
    }

    return blocks;
}

async function detectGitHooks(
    cwd: string
): Promise<{ preCommitExists: boolean; prePushExists: boolean }> {
    const preCommitPath = path.join(cwd, '.git', 'hooks', 'pre-commit');
    const prePushPath = path.join(cwd, '.git', 'hooks', 'pre-push');

    return {
        preCommitExists: await fileExists(preCommitPath),
        prePushExists: await fileExists(prePushPath),
    };
}

/** Read direct npm dependency names (dependencies + devDependencies) from package.json. */
async function readNpmDeps(cwd: string): Promise<Set<string>> {
    const pkg = await readJsonFile<{
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
    }>(path.join(cwd, 'package.json'));
    if (!pkg) return new Set();
    return new Set([
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}),
    ]);
}

/**
 * Read direct crate names from the [dependencies], [dev-dependencies], and
 * [build-dependencies] tables of Cargo.toml. Only top-level keys are considered.
 */
async function readCargoDeps(cwd: string): Promise<Set<string>> {
    const file = path.join(cwd, 'Cargo.toml');
    if (!(await fileExists(file))) return new Set();
    let content = '';
    try {
        content = await readFile(file);
    } catch {
        return new Set();
    }
    const deps = new Set<string>();
    let inDeps = false;
    for (const raw of content.split('\n')) {
        const line = raw.trim();
        if (line.startsWith('[')) {
            inDeps = /^\[(dependencies|dev-dependencies|build-dependencies)\]$/.test(line);
            continue;
        }
        if (!inDeps || line === '' || line.startsWith('#')) continue;
        const match = line.match(/^([A-Za-z0-9_-]+)\s*(=|\.)/);
        if (match) deps.add(match[1]);
    }
    return deps;
}

/** Normalize a Python distribution name for case- and separator-insensitive matching. */
function normalizePyName(name: string): string {
    return name.toLowerCase().replace(/_/g, '-');
}

/**
 * Read direct Python dependency names from pyproject.toml ([project].dependencies and
 * [tool.poetry.dependencies]) and requirements.txt.
 */
async function readPipDeps(cwd: string): Promise<Set<string>> {
    const deps = new Set<string>();

    const pyproject = path.join(cwd, 'pyproject.toml');
    if (await fileExists(pyproject)) {
        let content = '';
        try {
            content = await readFile(pyproject);
        } catch {
            content = '';
        }
        const arrayMatch = content.match(/dependencies\s*=\s*\[([^\]]*)\]/s);
        if (arrayMatch) {
            for (const item of arrayMatch[1].split(',')) {
                const name = item
                    .replace(/['"]/g, '')
                    .trim()
                    .split(/[<>=!~ ;[]/)[0];
                if (name) deps.add(normalizePyName(name));
            }
        }
        let inPoetry = false;
        for (const raw of content.split('\n')) {
            const line = raw.trim();
            if (line.startsWith('[')) {
                inPoetry = line === '[tool.poetry.dependencies]';
                continue;
            }
            if (!inPoetry || line === '' || line.startsWith('#')) continue;
            const match = line.match(/^([A-Za-z0-9_.-]+)\s*=/);
            if (match && match[1].toLowerCase() !== 'python') deps.add(normalizePyName(match[1]));
        }
    }

    const requirements = path.join(cwd, 'requirements.txt');
    if (await fileExists(requirements)) {
        let content = '';
        try {
            content = await readFile(requirements);
        } catch {
            content = '';
        }
        for (const raw of content.split('\n')) {
            const line = raw.trim();
            if (line === '' || line.startsWith('#') || line.startsWith('-')) continue;
            const name = line.split(/[<>=!~ ;[]/)[0];
            if (name) deps.add(normalizePyName(name));
        }
    }
    return deps;
}

/** Read required module paths from go.mod (both single-line and require-block forms). */
async function readGoDeps(cwd: string): Promise<Set<string>> {
    const file = path.join(cwd, 'go.mod');
    if (!(await fileExists(file))) return new Set();
    let content = '';
    try {
        content = await readFile(file);
    } catch {
        return new Set();
    }
    const mods = new Set<string>();
    let inBlock = false;
    for (const raw of content.split('\n')) {
        const line = raw.trim();
        if (line.startsWith('require (')) {
            inBlock = true;
            continue;
        }
        if (inBlock && line === ')') {
            inBlock = false;
            continue;
        }
        if (inBlock) {
            const match = line.match(/^(\S+)\s+v/);
            if (match) mods.add(match[1]);
            continue;
        }
        const single = line.match(/^require\s+(\S+)\s+v/);
        if (single) mods.add(single[1]);
    }
    return mods;
}

/** Map a library's language to the manifest filename used as its detection source. */
function manifestForLanguage(language: LanguageDetection['language']): string {
    switch (language) {
        case 'rust':
            return 'Cargo.toml';
        case 'python':
            return 'pyproject.toml';
        case 'go':
            return 'go.mod';
        default:
            return 'package.json';
    }
}

/**
 * Detect libraries/frameworks by matching project manifests against the library
 * registry. Only direct dependencies are considered; transitive dependencies are
 * ignored. Marker files raise detection even without a manifest dependency. Results
 * are sorted by descending confidence.
 */
export async function detectLibraries(cwd: string): Promise<LibraryDetection[]> {
    const [npm, cargo, pip, gomod] = await Promise.all([
        readNpmDeps(cwd),
        readCargoDeps(cwd),
        readPipDeps(cwd),
        readGoDeps(cwd),
    ]);

    const detections: LibraryDetection[] = [];

    for (const def of LIBRARY_REGISTRY) {
        const indicators: string[] = [];
        let depMatch = false;

        for (const p of def.detect.npm ?? []) {
            if (p.endsWith('*')) {
                const prefix = p.slice(0, -1);
                for (const dep of npm) {
                    if (dep.startsWith(prefix)) {
                        indicators.push(`npm:${dep}`);
                        depMatch = true;
                    }
                }
            } else if (npm.has(p)) {
                indicators.push(`npm:${p}`);
                depMatch = true;
            }
        }
        for (const p of def.detect.cargo ?? []) {
            if (cargo.has(p)) {
                indicators.push(`cargo:${p}`);
                depMatch = true;
            }
        }
        for (const p of def.detect.pip ?? []) {
            if (pip.has(normalizePyName(p))) {
                indicators.push(`pip:${p}`);
                depMatch = true;
            }
        }
        for (const p of def.detect.gomod ?? []) {
            for (const mod of gomod) {
                if (mod === p || mod.startsWith(`${p}/`)) {
                    indicators.push(`gomod:${p}`);
                    depMatch = true;
                    break;
                }
            }
        }
        for (const f of def.detect.files ?? []) {
            if (await fileExists(path.join(cwd, f))) indicators.push(`file:${f}`);
        }

        if (indicators.length === 0) continue;

        detections.push({
            library: def.id,
            confidence: depMatch ? 1.0 : 0.8,
            indicators,
            source: manifestForLanguage(def.language),
        });
    }

    return detections.sort((a, b) => b.confidence - a.confidence);
}
