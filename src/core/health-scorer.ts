import { fileExists, readFile } from '../utils/file-system.js';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fsPromises } from 'fs';

const execAsync = promisify(exec);

/** Sub-score breakdown for AGENTS.md quality assessment */
export interface AgentsMdQualityBreakdown {
  wordCount: number;
  specReferences: number;
  requiredSections: number;
  score: number;
}

/** Sub-score breakdown for README.md quality assessment */
export interface ReadmeQualityBreakdown {
  sectionCount: number;
  hasRequiredSections: boolean;
  hasPlaceholders: boolean;
  score: number;
}

/** Sub-score breakdown for Ralph autonomous loop progress */
export interface RalphProgressBreakdown {
  totalStories: number;
  completedStories: number;
  passRate: number;
  score: number;
}

/** Sub-score breakdown for persistent memory activity */
export interface MemoryActivityBreakdown {
  dbExists: boolean;
  recordCount: number;
  score: number;
}

/** Per-category sub-score details for health score transparency */
export interface HealthScoreBreakdown {
  agentsMdQuality: AgentsMdQualityBreakdown;
  readmeQuality: ReadmeQualityBreakdown;
  ralphProgress: RalphProgressBreakdown;
  memoryActivity: MemoryActivityBreakdown;
}

export interface HealthScore {
  overall: number;
  grade: string;
  categories: {
    documentation: number;
    testing: number;
    quality: number;
    security: number;
    dependencies: number;
    cicd: number;
    agentsMd: number;
    ralph: number;
    memory: number;
  };
  details: string[];
  recommendations: string[];
  breakdown: HealthScoreBreakdown;
}

/**
 * Score documentation health (0-100)
 */
async function scoreDocumentation(projectDir: string): Promise<{
  score: number;
  details: string[];
}> {
  let score = 0;
  const details: string[] = [];
  const maxScore = 100;

  // README.md (20 points)
  if (await fileExists(path.join(projectDir, 'README.md'))) {
    score += 20;
    details.push('✅ README.md exists (+20)');
  } else {
    details.push('❌ Missing README.md (-20)');
  }

  // CHANGELOG.md (15 points)
  if (await fileExists(path.join(projectDir, 'CHANGELOG.md'))) {
    score += 15;
    details.push('✅ CHANGELOG.md exists (+15)');
  } else {
    details.push('⚠️  Missing CHANGELOG.md (-15)');
  }

  // LICENSE (15 points)
  if (await fileExists(path.join(projectDir, 'LICENSE'))) {
    score += 15;
    details.push('✅ LICENSE exists (+15)');
  } else {
    details.push('❌ Missing LICENSE (-15)');
  }

  // CONTRIBUTING.md (10 points)
  if (await fileExists(path.join(projectDir, 'CONTRIBUTING.md'))) {
    score += 10;
    details.push('✅ CONTRIBUTING.md exists (+10)');
  }

  // docs/ directory (20 points)
  if (await fileExists(path.join(projectDir, 'docs'))) {
    score += 20;
    details.push('✅ /docs directory exists (+20)');
  } else {
    details.push('⚠️  Missing /docs directory (-20)');
  }

  // AGENTS.md (20 points)
  if (await fileExists(path.join(projectDir, 'AGENTS.md'))) {
    score += 20;
    details.push('✅ AGENTS.md exists (+20)');
  } else {
    details.push('❌ Missing AGENTS.md (-20)');
  }

  return {
    score: Math.min(score, maxScore),
    details,
  };
}

/**
 * Score testing health (0-100)
 */
async function scoreTesting(projectDir: string): Promise<{
  score: number;
  details: string[];
}> {
  let score = 0;
  const details: string[] = [];

  // Tests directory (30 points)
  if (await fileExists(path.join(projectDir, 'tests'))) {
    score += 30;
    details.push('✅ /tests directory exists (+30)');
  } else if (await fileExists(path.join(projectDir, 'test'))) {
    score += 30;
    details.push('✅ /test directory exists (+30)');
  } else {
    details.push('❌ Missing tests directory (-30)');
  }

  // Try to detect test framework (20 points)
  const packageJson = path.join(projectDir, 'package.json');
  const cargoToml = path.join(projectDir, 'Cargo.toml');

  if (await fileExists(packageJson)) {
    // Check for test framework
    score += 20;
    details.push('✅ Test framework configured (+20)');
  } else if (await fileExists(cargoToml)) {
    score += 20;
    details.push('✅ Test framework configured (+20)');
  }

  // Coverage tool (30 points)
  if (await fileExists(path.join(projectDir, 'coverage'))) {
    score += 30;
    details.push('✅ Coverage reports found (+30)');
  }

  // Test configuration (20 points)
  const testConfigs = ['vitest.config.ts', 'jest.config.js', 'pytest.ini', '.coveragerc'];

  for (const config of testConfigs) {
    if (await fileExists(path.join(projectDir, config))) {
      score += 20;
      details.push(`✅ Test configuration found: ${config} (+20)`);
      break;
    }
  }

  return {
    score: Math.min(score, 100),
    details,
  };
}

/**
 * Score code quality (0-100)
 */
async function scoreQuality(projectDir: string): Promise<{
  score: number;
  details: string[];
}> {
  let score = 0;
  const details: string[] = [];

  // Linter configuration (25 points)
  const linterConfigs = [
    '.eslintrc.json',
    'eslint.config.js',
    '.ruff.toml',
    'pyproject.toml',
    'clippy.toml',
    '.clang-tidy',
  ];

  for (const config of linterConfigs) {
    if (await fileExists(path.join(projectDir, config))) {
      score += 25;
      details.push(`✅ Linter configured: ${config} (+25)`);
      break;
    }
  }

  // Formatter configuration (25 points)
  const formatterConfigs = [
    '.prettierrc',
    '.prettierrc.json',
    'rustfmt.toml',
    '.clang-format',
    '.editorconfig',
  ];

  for (const config of formatterConfigs) {
    if (await fileExists(path.join(projectDir, config))) {
      score += 25;
      details.push(`✅ Formatter configured: ${config} (+25)`);
      break;
    }
  }

  // TypeScript strict mode (25 points)
  const tsconfigPath = path.join(projectDir, 'tsconfig.json');
  if (await fileExists(tsconfigPath)) {
    const content = await readFile(tsconfigPath);
    if (content.includes('"strict": true')) {
      score += 25;
      details.push('✅ TypeScript strict mode enabled (+25)');
    }
  }

  // gitignore (25 points)
  if (await fileExists(path.join(projectDir, '.gitignore'))) {
    score += 25;
    details.push('✅ .gitignore exists (+25)');
  }

  return {
    score: Math.min(score, 100),
    details,
  };
}

/**
 * Score security (0-100)
 */
async function scoreSecurity(projectDir: string): Promise<{
  score: number;
  details: string[];
}> {
  let score = 0;
  const details: string[] = [];

  // SECURITY.md (30 points)
  if (await fileExists(path.join(projectDir, 'SECURITY.md'))) {
    score += 30;
    details.push('✅ SECURITY.md exists (+30)');
  }

  // .gitignore includes sensitive files (20 points)
  const gitignorePath = path.join(projectDir, '.gitignore');
  if (await fileExists(gitignorePath)) {
    const content = await readFile(gitignorePath);
    if (content.includes('.env') || content.includes('*.key')) {
      score += 20;
      details.push('✅ .gitignore protects sensitive files (+20)');
    }
  }

  // No committed secrets (30 points)
  // Only check if it's a git repository
  const gitDir = path.join(projectDir, '.git');
  if (await fileExists(gitDir)) {
    try {
      const { stdout } = (await Promise.race([
        execAsync(
          'git ls-files | xargs grep -l "api[_-]key\\|password\\|secret" 2>/dev/null || true',
          { cwd: projectDir, timeout: 3000 }
        ),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 3000)),
      ])) as { stdout: string };

      if (!stdout.trim()) {
        score += 30;
        details.push('✅ No obvious secrets in code (+30)');
      } else {
        details.push('⚠️  Possible secrets found in code (-30)');
      }
    } catch {
      score += 30; // Assume safe if can't check
    }
  } else {
    score += 30; // Not a git repo, can't check
  }

  // Dependabot or similar (20 points)
  if (await fileExists(path.join(projectDir, '.github', 'dependabot.yml'))) {
    score += 20;
    details.push('✅ Dependabot configured (+20)');
  }

  return {
    score: Math.min(score, 100),
    details,
  };
}

/**
 * Score CI/CD (0-100)
 */
async function scoreCICD(projectDir: string): Promise<{
  score: number;
  details: string[];
}> {
  let score = 0;
  const details: string[] = [];

  // GitHub Actions (40 points)
  const workflowsDir = path.join(projectDir, '.github', 'workflows');
  if (await fileExists(workflowsDir)) {
    score += 40;
    details.push('✅ GitHub Actions workflows exist (+40)');
  } else {
    details.push('❌ No CI/CD workflows found (-40)');
  }

  // Test workflow (30 points)
  const testWorkflows = ['test.yml', 'ci.yml'];
  for (const workflow of testWorkflows) {
    if (await fileExists(path.join(workflowsDir, workflow))) {
      score += 30;
      details.push(`✅ Test workflow found: ${workflow} (+30)`);
      break;
    }
  }

  // Lint workflow (30 points)
  const lintWorkflows = ['lint.yml', 'quality.yml'];
  for (const workflow of lintWorkflows) {
    if (await fileExists(path.join(workflowsDir, workflow))) {
      score += 30;
      details.push(`✅ Lint workflow found: ${workflow} (+30)`);
      break;
    }
  }

  return {
    score: Math.min(score, 100),
    details,
  };
}

/**
 * Score dependencies health (0-100)
 */
async function scoreDependencies(projectDir: string): Promise<{
  score: number;
  details: string[];
}> {
  let score = 100; // Start at 100, deduct for issues
  const details: string[] = [];

  // Check for lock file (50 points if missing)
  const lockFiles = [
    'package-lock.json',
    'pnpm-lock.yaml',
    'yarn.lock',
    'Cargo.lock',
    'go.sum',
    'Gemfile.lock',
  ];

  let hasLockFile = false;
  for (const lockFile of lockFiles) {
    if (await fileExists(path.join(projectDir, lockFile))) {
      hasLockFile = true;
      details.push(`✅ Lock file exists: ${lockFile} (+50)`);
      break;
    }
  }

  if (!hasLockFile) {
    score -= 50;
    details.push('❌ No lock file found (-50)');
  }

  // Try to run audit only if package.json exists
  const packageJsonPath = path.join(projectDir, 'package.json');
  if (await fileExists(packageJsonPath)) {
    try {
      // Add timeout to prevent hanging
      const { stdout } = (await Promise.race([
        execAsync('npm audit --json', {
          cwd: projectDir,
          timeout: 5000, // 5 second timeout
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000)),
      ])) as { stdout: string };

      const audit = JSON.parse(stdout);
      const vulns = audit.metadata?.vulnerabilities;

      if (vulns) {
        const total = vulns.total || 0;
        if (total === 0) {
          details.push('✅ No vulnerabilities found');
        } else {
          score -= Math.min(total * 5, 50);
          details.push(`⚠️  ${total} vulnerabilities found (-${Math.min(total * 5, 50)})`);
        }
      }
    } catch {
      // Can't check, assume OK (no points deducted)
      details.push('⚠️  Could not check for vulnerabilities (skipped)');
    }
  }

  return {
    score: Math.max(score, 0),
    details,
  };
}

/**
 * Measure AGENTS.md quality based on word count, spec references, and required sections.
 * Returns a score (0-100) plus the detailed breakdown.
 */
async function measureAgentsMdQuality(projectRoot: string): Promise<{
  score: number;
  details: string[];
  breakdown: AgentsMdQualityBreakdown;
}> {
  const details: string[] = [];
  const agentsPath = path.join(projectRoot, 'AGENTS.md');

  if (!(await fileExists(agentsPath))) {
    details.push('AGENTS.md not found (agentsMd score: 0)');
    return {
      score: 0,
      details,
      breakdown: { wordCount: 0, specReferences: 0, requiredSections: 0, score: 0 },
    };
  }

  const content = await readFile(agentsPath);
  let score = 0;

  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const specReferences = (content.match(/\.rulebook\/specs\//g) || []).length;

  const requiredHeadings = ['ralph', 'quality', 'git'];
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  const headings: string[] = [];
  let headingMatch: RegExpExecArray | null;
  while ((headingMatch = headingRegex.exec(content)) !== null) {
    headings.push(headingMatch[1].toLowerCase());
  }

  let requiredSections = 0;
  for (const keyword of requiredHeadings) {
    if (headings.some((h) => h.includes(keyword))) {
      requiredSections++;
    }
  }

  // Word count scoring
  if (wordCount > 500) {
    score += 30;
    details.push(`AGENTS.md has ${wordCount} words (+30)`);
  } else if (wordCount > 200) {
    score += 15;
    details.push(`AGENTS.md has ${wordCount} words (+15)`);
  } else if (wordCount > 50) {
    score += 5;
    details.push(`AGENTS.md has ${wordCount} words (+5)`);
  }

  // Spec references scoring
  if (specReferences >= 3) {
    score += 30;
    details.push(`AGENTS.md has ${specReferences} spec references (+30)`);
  } else if (specReferences >= 1) {
    score += 15;
    details.push(`AGENTS.md has ${specReferences} spec reference(s) (+15)`);
  }

  // Required sections scoring
  if (requiredSections === 3) {
    score += 40;
    details.push(`AGENTS.md has all 3 required sections (+40)`);
  } else if (requiredSections === 2) {
    score += 25;
    details.push(`AGENTS.md has ${requiredSections}/3 required sections (+25)`);
  } else if (requiredSections === 1) {
    score += 10;
    details.push(`AGENTS.md has ${requiredSections}/3 required sections (+10)`);
  }

  score = Math.min(score, 100);

  return {
    score,
    details,
    breakdown: { wordCount, specReferences, requiredSections, score },
  };
}

/**
 * Measure README.md quality based on section count, required sections, and placeholder presence.
 * Returns a score (0-100) plus the detailed breakdown.
 */
async function measureReadmeQuality(projectRoot: string): Promise<{
  score: number;
  details: string[];
  breakdown: ReadmeQualityBreakdown;
}> {
  const details: string[] = [];
  const readmePath = path.join(projectRoot, 'README.md');

  if (!(await fileExists(readmePath))) {
    details.push('README.md not found (readme quality score: 0)');
    return {
      score: 0,
      details,
      breakdown: { sectionCount: 0, hasRequiredSections: false, hasPlaceholders: false, score: 0 },
    };
  }

  const content = await readFile(readmePath);
  let score = 0;

  const sectionCount = (content.match(/^##+ /gm) || []).length;
  const lowerContent = content.toLowerCase();
  const hasRequiredSections = ['install', 'usage', 'contribut'].every((k) =>
    lowerContent.includes(k)
  );
  const hasPlaceholders = lowerContent.includes('todo') || lowerContent.includes('coming soon');

  // Section count scoring
  if (sectionCount >= 5) {
    score += 30;
    details.push(`README.md has ${sectionCount} sections (+30)`);
  } else if (sectionCount >= 3) {
    score += 20;
    details.push(`README.md has ${sectionCount} sections (+20)`);
  } else if (sectionCount >= 1) {
    score += 10;
    details.push(`README.md has ${sectionCount} section(s) (+10)`);
  }

  // Required sections scoring
  if (hasRequiredSections) {
    score += 40;
    details.push('README.md has install/usage/contributing sections (+40)');
  }

  // Placeholder penalty
  if (hasPlaceholders) {
    score -= 10;
    details.push('README.md contains placeholder text (TODO/coming soon) (-10)');
  }

  score = Math.max(score, 0);

  return {
    score,
    details,
    breakdown: { sectionCount, hasRequiredSections, hasPlaceholders, score },
  };
}

/**
 * Measure Ralph autonomous loop progress based on PRD user story pass rate.
 * Returns a score (0-100) plus the detailed breakdown.
 */
async function measureRalphQuality(projectRoot: string): Promise<{
  score: number;
  details: string[];
  breakdown: RalphProgressBreakdown;
}> {
  const details: string[] = [];
  const prdPath = path.join(projectRoot, '.rulebook', 'ralph', 'prd.json');

  if (!(await fileExists(prdPath))) {
    details.push('Ralph PRD not found (ralph score: 0)');
    return {
      score: 0,
      details,
      breakdown: { totalStories: 0, completedStories: 0, passRate: 0, score: 0 },
    };
  }

  try {
    const content = await readFile(prdPath);
    const prd = JSON.parse(content) as {
      userStories?: Array<{ passes?: boolean }>;
    };

    const stories = prd.userStories || [];
    const totalStories = stories.length;
    const completedStories = stories.filter((s) => s.passes === true).length;
    const passRate = totalStories > 0 ? completedStories / totalStories : 0;
    const score = Math.round(passRate * 100);

    details.push(`Ralph: ${completedStories}/${totalStories} stories passing (${score}%)`);

    return {
      score,
      details,
      breakdown: { totalStories, completedStories, passRate, score },
    };
  } catch {
    details.push('Ralph PRD could not be parsed (ralph score: 0)');
    return {
      score: 0,
      details,
      breakdown: { totalStories: 0, completedStories: 0, passRate: 0, score: 0 },
    };
  }
}

/**
 * Measure persistent memory activity based on database existence and estimated record count.
 * Returns a score (0-100) plus the detailed breakdown.
 */
async function measureMemoryActivity(projectRoot: string): Promise<{
  score: number;
  details: string[];
  breakdown: MemoryActivityBreakdown;
}> {
  const details: string[] = [];
  const dbPath = path.join(projectRoot, '.rulebook', 'memory', 'memory.db');

  const dbExists = await fileExists(dbPath);

  if (!dbExists) {
    details.push('Memory database not found (memory score: 0)');
    return {
      score: 0,
      details,
      breakdown: { dbExists: false, recordCount: 0, score: 0 },
    };
  }

  let recordCount = 0;
  try {
    const stats = await fsPromises.stat(dbPath);
    recordCount = Math.floor(stats.size / 500);
  } catch {
    // If stat fails, keep recordCount at 0
  }

  let score = 50; // dbExists -> +50
  if (recordCount >= 10) {
    score += 50;
    details.push(`Memory database active with ~${recordCount} records (+100)`);
  } else if (recordCount >= 5) {
    score += 30;
    details.push(`Memory database active with ~${recordCount} records (+80)`);
  } else if (recordCount >= 1) {
    score += 15;
    details.push(`Memory database active with ~${recordCount} records (+65)`);
  } else {
    details.push('Memory database exists but appears empty (+50)');
  }

  score = Math.min(score, 100);

  return {
    score,
    details,
    breakdown: { dbExists, recordCount, score },
  };
}

/**
 * Calculate overall project health score
 */
export async function calculateHealthScore(projectDir: string): Promise<HealthScore> {
  const documentation = await scoreDocumentation(projectDir);
  const testing = await scoreTesting(projectDir);
  const quality = await scoreQuality(projectDir);
  const security = await scoreSecurity(projectDir);
  const cicd = await scoreCICD(projectDir);
  const dependencies = await scoreDependencies(projectDir);
  const agentsMd = await measureAgentsMdQuality(projectDir);
  const readme = await measureReadmeQuality(projectDir);
  const ralph = await measureRalphQuality(projectDir);
  const memory = await measureMemoryActivity(projectDir);

  // Weighted average (total = 1.0)
  const overall = Math.round(
    documentation.score * 0.15 +
      testing.score * 0.2 +
      quality.score * 0.1 +
      security.score * 0.1 +
      cicd.score * 0.1 +
      dependencies.score * 0.1 +
      agentsMd.score * 0.1 +
      ralph.score * 0.1 +
      memory.score * 0.05
  );

  const grade = getHealthGrade(overall);

  const recommendations: string[] = [];

  if (documentation.score < 70) {
    recommendations.push('Improve documentation (add README, CHANGELOG, docs/)');
  }
  if (testing.score < 70) {
    recommendations.push('Add comprehensive tests and coverage tools');
  }
  if (quality.score < 70) {
    recommendations.push('Configure linter and formatter');
  }
  if (security.score < 70) {
    recommendations.push('Improve security (add SECURITY.md, check for secrets)');
  }
  if (cicd.score < 70) {
    recommendations.push('Set up CI/CD workflows');
  }
  if (dependencies.score < 70) {
    recommendations.push('Fix dependency vulnerabilities');
  }
  if (agentsMd.score < 70) {
    recommendations.push(
      'Improve AGENTS.md quality (add spec references, required sections for ralph/quality/git)'
    );
  }
  if (ralph.score < 70) {
    recommendations.push('Improve Ralph progress (initialize PRD and complete user stories)');
  }
  if (memory.score < 70) {
    recommendations.push('Enable persistent memory (initialize memory database via MCP server)');
  }

  return {
    overall,
    grade,
    categories: {
      documentation: documentation.score,
      testing: testing.score,
      quality: quality.score,
      security: security.score,
      cicd: cicd.score,
      dependencies: dependencies.score,
      agentsMd: agentsMd.score,
      ralph: ralph.score,
      memory: memory.score,
    },
    details: [
      ...documentation.details,
      ...testing.details,
      ...quality.details,
      ...security.details,
      ...cicd.details,
      ...dependencies.details,
      ...agentsMd.details,
      ...readme.details,
      ...ralph.details,
      ...memory.details,
    ],
    recommendations,
    breakdown: {
      agentsMdQuality: agentsMd.breakdown,
      readmeQuality: readme.breakdown,
      ralphProgress: ralph.breakdown,
      memoryActivity: memory.breakdown,
    },
  };
}

/**
 * Get health grade from score
 */
export function getHealthGrade(score: number): string {
  if (score >= 90) return 'A+';
  if (score >= 80) return 'A';
  if (score >= 70) return 'B';
  if (score >= 60) return 'C';
  if (score >= 50) return 'D';
  return 'F';
}
