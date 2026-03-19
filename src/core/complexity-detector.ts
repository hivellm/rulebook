/**
 * Project Complexity Detector — v5.0
 *
 * Assesses project complexity to calibrate rule generation.
 * Complexity tiers determine which features are activated:
 *
 * - Small:   < 10K LOC, 1 language  → Tier 1 rules only
 * - Medium:  10-50K LOC, 1-2 langs  → + Tier 2 (decomposition, incremental tests)
 * - Large:   50K+ LOC, 2+ langs     → + Specialized agents, team coordination
 * - Complex: 100K+ LOC, 3+ langs    → + Reference workflow, blocker tracking, data-flow
 */

import { existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { join, extname } from 'path';

// ── Types ───────────────────────────────────────────────────────────────

export type ComplexityTier = 'small' | 'medium' | 'large' | 'complex';

export interface ComplexityAssessment {
  tier: ComplexityTier;
  score: number; // 0-100
  metrics: {
    estimatedLoc: number;
    languageCount: number;
    sourceDirectories: number;
    hasMultipleBuildTargets: boolean;
    hasCustomMcpServer: boolean;
    hasReferenceSource: boolean;
  };
  recommendations: {
    tier1Rules: boolean; // always true
    tier2Rules: boolean;
    specializedAgents: boolean;
    teamCoordination: boolean;
    referenceWorkflow: boolean;
    blockerTracking: boolean;
    dataFlowPlanning: boolean;
  };
  detectedTools: string[];
}

// ── LOC Estimation ──────────────────────────────────────────────────────

const CODE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.pyx',
  '.rs',
  '.go',
  '.java', '.kt', '.scala',
  '.cs',
  '.cpp', '.cc', '.cxx', '.c', '.h', '.hpp',
  '.swift', '.m', '.mm',
  '.rb',
  '.php',
  '.ex', '.exs',
  '.erl', '.hrl',
  '.zig',
  '.sol',
  '.dart',
  '.r', '.R',
  '.hs',
  '.lua',
  '.hlsl', '.glsl', '.msl', '.wgsl',
  '.sql',
  '.sh', '.bash', '.zsh',
]);

const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'out', '.next', '.nuxt',
  'target', 'vendor', '__pycache__', '.venv', 'venv', 'env',
  '.rulebook', '.claude', '.cursor', 'coverage', '.cache',
  'zig-cache', 'zig-out', '.zig-cache',
]);

/**
 * Estimate lines of code by sampling files. Scans up to maxFiles to avoid
 * blocking on huge repos.
 */
function estimateLoc(projectRoot: string, maxFiles: number = 500): { loc: number; languages: Set<string> } {
  let totalLoc = 0;
  let filesScanned = 0;
  const languages = new Set<string>();

  function walk(dir: string, depth: number): void {
    if (depth > 8 || filesScanned >= maxFiles) return;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (filesScanned >= maxFiles) return;
      if (IGNORE_DIRS.has(entry) || entry.startsWith('.')) continue;

      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (CODE_EXTENSIONS.has(ext) && stat.size < 500000) {
          try {
            const content = readFileSync(fullPath, 'utf-8');
            const lines = content.split('\n').length;
            totalLoc += lines;
            languages.add(ext);
            filesScanned++;
          } catch {
            // Skip unreadable files
          }
        }
      }
    }
  }

  walk(projectRoot, 0);

  // If we hit the sample limit, extrapolate
  if (filesScanned >= maxFiles) {
    // Rough extrapolation: count remaining code files
    const totalCodeFiles = countCodeFiles(projectRoot, maxFiles * 3);
    if (totalCodeFiles > filesScanned) {
      const avgLocPerFile = totalLoc / filesScanned;
      totalLoc = Math.round(avgLocPerFile * totalCodeFiles);
    }
  }

  return { loc: totalLoc, languages };
}

function countCodeFiles(projectRoot: string, max: number): number {
  let count = 0;

  function walk(dir: string, depth: number): void {
    if (depth > 8 || count >= max) return;

    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }

    for (const entry of entries) {
      if (count >= max) return;
      if (IGNORE_DIRS.has(entry) || entry.startsWith('.')) continue;

      const fullPath = join(dir, entry);
      let stat;
      try {
        stat = statSync(fullPath);
      } catch {
        continue;
      }

      if (stat.isDirectory()) {
        walk(fullPath, depth + 1);
      } else if (stat.isFile()) {
        const ext = extname(entry).toLowerCase();
        if (CODE_EXTENSIONS.has(ext)) count++;
      }
    }
  }

  walk(projectRoot, 0);
  return count;
}

// ── Source Directory Count ───────────────────────────────────────────────

function countSourceDirs(projectRoot: string): number {
  const srcDirs = ['src', 'lib', 'app', 'pages', 'components', 'modules',
    'packages', 'crates', 'cmd', 'pkg', 'internal', 'runtime',
    'compiler', 'engine', 'core', 'server', 'client', 'api'];

  let count = 0;
  for (const dir of srcDirs) {
    if (existsSync(join(projectRoot, dir))) count++;
  }
  return count;
}

// ── Tool Detection ──────────────────────────────────────────────────────

function detectTools(projectRoot: string): string[] {
  const tools: string[] = [];
  if (existsSync(join(projectRoot, '.claude')) || existsSync(join(projectRoot, 'CLAUDE.md')))
    tools.push('claude-code');
  if (existsSync(join(projectRoot, '.cursor')))
    tools.push('cursor');
  if (existsSync(join(projectRoot, 'GEMINI.md')))
    tools.push('gemini');
  if (existsSync(join(projectRoot, '.windsurf')) || existsSync(join(projectRoot, '.windsurfrules')))
    tools.push('windsurf');
  if (existsSync(join(projectRoot, '.github', 'copilot-instructions.md')))
    tools.push('copilot');
  if (existsSync(join(projectRoot, '.continue')))
    tools.push('continue');
  return tools;
}

// ── Main Assessment ─────────────────────────────────────────────────────

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'TypeScript', '.js': 'JavaScript', '.jsx': 'JavaScript',
  '.py': 'Python', '.rs': 'Rust', '.go': 'Go', '.java': 'Java', '.kt': 'Kotlin',
  '.cs': 'C#', '.cpp': 'C++', '.c': 'C', '.h': 'C/C++', '.hpp': 'C++',
  '.swift': 'Swift', '.rb': 'Ruby', '.php': 'PHP', '.dart': 'Dart',
  '.hlsl': 'HLSL', '.glsl': 'GLSL', '.lua': 'Lua', '.zig': 'Zig',
  '.ex': 'Elixir', '.erl': 'Erlang', '.sol': 'Solidity', '.hs': 'Haskell',
  '.scala': 'Scala', '.r': 'R', '.R': 'R',
};

export function assessComplexity(projectRoot: string): ComplexityAssessment {
  const { loc, languages: langExts } = estimateLoc(projectRoot);
  const uniqueLanguages = new Set<string>();
  for (const ext of langExts) {
    const lang = EXT_TO_LANGUAGE[ext];
    if (lang) uniqueLanguages.add(lang);
  }
  const languageCount = uniqueLanguages.size;

  const sourceDirectories = countSourceDirs(projectRoot);
  const hasMultipleBuildTargets =
    existsSync(join(projectRoot, 'Cargo.toml')) && existsSync(join(projectRoot, 'package.json')) ||
    existsSync(join(projectRoot, 'CMakeLists.txt')) && existsSync(join(projectRoot, 'package.json')) ||
    existsSync(join(projectRoot, 'build.zig')) && existsSync(join(projectRoot, 'package.json'));
  const hasCustomMcpServer =
    existsSync(join(projectRoot, '.mcp.json')) ||
    existsSync(join(projectRoot, 'mcp.json'));
  const hasReferenceSource = false; // Detected from config, not file system

  const detectedTools = detectTools(projectRoot);

  // Score calculation
  let score = 0;
  if (loc >= 100000) score += 40;
  else if (loc >= 50000) score += 30;
  else if (loc >= 10000) score += 20;
  else score += 10;

  score += Math.min(languageCount * 10, 30);
  score += Math.min(sourceDirectories * 3, 15);
  if (hasMultipleBuildTargets) score += 10;
  if (hasCustomMcpServer) score += 5;

  // Tier determination
  let tier: ComplexityTier;
  if (score >= 60 || (loc >= 100000 && languageCount >= 3)) {
    tier = 'complex';
  } else if (score >= 40 || (loc >= 50000 && languageCount >= 2)) {
    tier = 'large';
  } else if (score >= 25 || (loc >= 10000 && languageCount >= 2)) {
    tier = 'medium';
  } else {
    tier = 'small';
  }

  return {
    tier,
    score,
    metrics: {
      estimatedLoc: loc,
      languageCount,
      sourceDirectories,
      hasMultipleBuildTargets,
      hasCustomMcpServer,
      hasReferenceSource,
    },
    recommendations: {
      tier1Rules: true, // Always
      tier2Rules: tier !== 'small',
      specializedAgents: tier === 'large' || tier === 'complex',
      teamCoordination: tier === 'large' || tier === 'complex',
      referenceWorkflow: tier === 'complex',
      blockerTracking: tier === 'large' || tier === 'complex',
      dataFlowPlanning: tier === 'complex',
    },
    detectedTools,
  };
}
