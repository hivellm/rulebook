import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import { fileExists, readFile } from '../utils/file-system.js';
import path from 'path';

const execAsync = promisify(exec);

/** Maximum diff length sent to the AI tool to avoid token limits. */
const MAX_DIFF_LENGTH = 10_000;

/** Maximum length of AGENTS.md context included in the prompt. */
const MAX_AGENTS_CONTEXT_LENGTH = 2_000;

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReviewIssue {
  severity: 'critical' | 'major' | 'minor' | 'suggestion';
  file?: string;
  line?: number;
  message: string;
  code?: string;
}

export interface ReviewResult {
  summary: string;
  issues: ReviewIssue[];
  suggestions: string[];
  /** True when no critical or major issues are present. */
  approved: boolean;
}

export type ReviewOutputFormat = 'terminal' | 'github-comment' | 'json';

export type ReviewFailOnSeverity = 'critical' | 'major' | 'minor';

export type ReviewTool = 'claude' | 'gemini' | 'amp';

// ─── Diff retrieval ─────────────────────────────────────────────────────────

/**
 * Retrieve the git diff between the current HEAD and a base branch.
 *
 * Returns an empty string when:
 * - The working directory is not a git repo.
 * - There is no diff between the branches.
 * - An error occurs during execution.
 *
 * The returned string is truncated to {@link MAX_DIFF_LENGTH} characters.
 */
export async function getDiffContext(
  projectRoot: string,
  baseBranch: string = 'main'
): Promise<string> {
  try {
    const [statResult, diffResult] = await Promise.all([
      execAsync(`git diff ${baseBranch}...HEAD --stat`, {
        cwd: projectRoot,
        timeout: 15_000,
      }).catch(() => ({ stdout: '' })),
      execAsync(`git diff ${baseBranch}...HEAD`, {
        cwd: projectRoot,
        timeout: 15_000,
      }).catch(() => ({ stdout: '' })),
    ]);

    const stat = (statResult.stdout ?? '').trim();
    const diff = (diffResult.stdout ?? '').trim();

    if (!stat && !diff) {
      return '';
    }

    const combined = `${stat}\n\n${diff}`;
    if (combined.length > MAX_DIFF_LENGTH) {
      return combined.slice(0, MAX_DIFF_LENGTH) + '\n\n[... diff truncated]';
    }
    return combined;
  } catch {
    return '';
  }
}

// ─── Prompt construction ────────────────────────────────────────────────────

/**
 * Build a structured review prompt suitable for an AI code reviewer.
 */
export function buildReviewPrompt(
  diff: string,
  context: { agentsMdContent?: string; projectName?: string }
): string {
  const projectLine = context.projectName
    ? `Project: ${context.projectName}`
    : 'Project: (unknown)';

  const guidelinesBlock = context.agentsMdContent
    ? context.agentsMdContent.slice(0, MAX_AGENTS_CONTEXT_LENGTH)
    : '(no project guidelines available)';

  return [
    'You are a code reviewer. Review the following git diff for issues.',
    '',
    projectLine,
    '',
    'Guidelines:',
    guidelinesBlock,
    '',
    'Git Diff:',
    diff,
    '',
    'Provide your review in this exact format:',
    '',
    '## Summary',
    '<one paragraph summary>',
    '',
    '## Issues',
    'For each issue, use this format:',
    '- [CRITICAL|MAJOR|MINOR|SUGGESTION] <file>:<line> — <message>',
    '',
    '## Suggestions',
    '- <suggestion 1>',
    '- <suggestion 2>',
  ].join('\n');
}

// ─── Output parsing ─────────────────────────────────────────────────────────

const SEVERITY_MAP: Record<string, ReviewIssue['severity']> = {
  CRITICAL: 'critical',
  MAJOR: 'major',
  MINOR: 'minor',
  SUGGESTION: 'suggestion',
};

/**
 * Parse the raw AI output into a structured {@link ReviewResult}.
 *
 * Handles missing sections gracefully — every field has a sensible default.
 */
export function parseReviewOutput(output: string): ReviewResult {
  const summary = extractSection(output, 'Summary');
  const issuesRaw = extractSection(output, 'Issues');
  const suggestionsRaw = extractSection(output, 'Suggestions');

  const issues = parseIssues(issuesRaw);
  const suggestions = parseBulletList(suggestionsRaw);

  const approved = !issues.some((i) => i.severity === 'critical' || i.severity === 'major');

  return { summary, issues, suggestions, approved };
}

/**
 * Extract the text content under a `## <heading>` section.
 *
 * Returns everything between the given heading and either the next `##` heading
 * or the end of the string.
 */
function extractSection(text: string, heading: string): string {
  const pattern = new RegExp(`##\\s+${heading}\\s*\\n([\\s\\S]*?)(?=\\n##\\s|$)`, 'i');
  const match = pattern.exec(text);
  return match ? match[1].trim() : '';
}

/**
 * Parse issue lines from the Issues section.
 *
 * Expected line format:
 *   `- [SEVERITY] file.ts:42 — Some message`
 * or
 *   `- [SEVERITY] Some message without file reference`
 */
function parseIssues(raw: string): ReviewIssue[] {
  if (!raw) return [];

  const issues: ReviewIssue[] = [];
  const lines = raw.split('\n');

  const issuePattern = /^[-*]\s*\[(CRITICAL|MAJOR|MINOR|SUGGESTION)]\s*(.*)/i;

  for (const line of lines) {
    const match = issuePattern.exec(line.trim());
    if (!match) continue;

    const severity = SEVERITY_MAP[match[1].toUpperCase()];
    if (!severity) continue;

    const rest = match[2].trim();
    const issue: ReviewIssue = { severity, message: rest };

    // Try to extract file:line — pattern:  filename.ext:123 — message
    const fileLinePattern = /^(\S+?):(\d+)\s*[—-]\s*(.*)/;
    const fileLineMatch = fileLinePattern.exec(rest);
    if (fileLineMatch) {
      issue.file = fileLineMatch[1];
      issue.line = parseInt(fileLineMatch[2], 10);
      issue.message = fileLineMatch[3].trim();
    } else {
      // Try file without line number — filename.ext — message
      const fileOnlyPattern = /^(\S+?\.\w+)\s*[—-]\s*(.*)/;
      const fileOnlyMatch = fileOnlyPattern.exec(rest);
      if (fileOnlyMatch) {
        issue.file = fileOnlyMatch[1];
        issue.message = fileOnlyMatch[2].trim();
      }
    }

    issues.push(issue);
  }

  return issues;
}

/**
 * Parse a markdown bullet list into an array of strings.
 */
function parseBulletList(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split('\n')
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length > 0);
}

// ─── AI tool execution ──────────────────────────────────────────────────────

/**
 * Run the specified AI CLI tool with the given prompt.
 *
 * Returns the tool's stdout. On any error (timeout, missing tool, etc.)
 * returns an empty string.
 */
export async function runAIReview(prompt: string, tool: ReviewTool = 'claude'): Promise<string> {
  const commands: Record<ReviewTool, string> = {
    claude: 'claude',
    gemini: 'gemini',
    amp: 'amp',
  };

  const binary = commands[tool];
  const flag = tool === 'gemini' ? '' : '-p';

  // Build the command — pipe prompt via stdin for safety (avoids shell escaping)
  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const command = flag
    ? `echo '${escapedPrompt}' | ${binary} ${flag} -`
    : `${binary} '${escapedPrompt}'`;

  try {
    const { stdout } = await execAsync(command, { timeout: 60_000 });
    return stdout.trim();
  } catch {
    return '';
  }
}

// ─── Terminal formatting ────────────────────────────────────────────────────

const SEVERITY_COLORS: Record<ReviewIssue['severity'], (text: string) => string> = {
  critical: chalk.red,
  major: chalk.yellow,
  minor: chalk.blue,
  suggestion: chalk.gray,
};

const SEVERITY_LABELS: Record<ReviewIssue['severity'], string> = {
  critical: 'CRITICAL',
  major: 'MAJOR',
  minor: 'MINOR',
  suggestion: 'SUGGESTION',
};

/**
 * Format a {@link ReviewResult} as a chalk-colored terminal string.
 */
export function formatReviewTerminal(result: ReviewResult): string {
  const lines: string[] = [];

  // Header
  if (result.approved) {
    lines.push(chalk.green.bold('\n  Review Result: APPROVED'));
  } else {
    lines.push(chalk.red.bold('\n  Review Result: REJECTED'));
  }

  // Issue counts
  const counts = countBySeverity(result.issues);
  const countLine = [
    counts.critical > 0 ? chalk.red(`${counts.critical} critical`) : null,
    counts.major > 0 ? chalk.yellow(`${counts.major} major`) : null,
    counts.minor > 0 ? chalk.blue(`${counts.minor} minor`) : null,
    counts.suggestion > 0 ? chalk.gray(`${counts.suggestion} suggestion`) : null,
  ]
    .filter(Boolean)
    .join(', ');

  if (countLine) {
    lines.push(`  Issues: ${countLine}`);
  } else {
    lines.push(chalk.green('  No issues found'));
  }

  lines.push('');

  // Summary
  if (result.summary) {
    lines.push(chalk.bold('  Summary'));
    lines.push(`  ${result.summary}`);
    lines.push('');
  }

  // Issues
  if (result.issues.length > 0) {
    lines.push(chalk.bold('  Issues'));
    for (const issue of result.issues) {
      const colorFn = SEVERITY_COLORS[issue.severity];
      const label = SEVERITY_LABELS[issue.severity];
      const location = issue.file ? (issue.line ? `${issue.file}:${issue.line}` : issue.file) : '';
      const locationStr = location ? ` ${chalk.gray(location)}` : '';
      lines.push(`  ${colorFn(`[${label}]`)}${locationStr} ${issue.message}`);
    }
    lines.push('');
  }

  // Suggestions
  if (result.suggestions.length > 0) {
    lines.push(chalk.bold('  Suggestions'));
    for (const suggestion of result.suggestions) {
      lines.push(`  ${chalk.gray('-')} ${suggestion}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Count issues grouped by severity.
 */
function countBySeverity(issues: readonly ReviewIssue[]): Record<ReviewIssue['severity'], number> {
  const counts: Record<ReviewIssue['severity'], number> = {
    critical: 0,
    major: 0,
    minor: 0,
    suggestion: 0,
  };
  for (const issue of issues) {
    counts[issue.severity]++;
  }
  return counts;
}

// ─── GitHub comment posting ─────────────────────────────────────────────────

/**
 * Format a {@link ReviewResult} as a GitHub-flavored markdown comment.
 */
export function formatReviewMarkdown(result: ReviewResult): string {
  const lines: string[] = [];

  const statusIcon = result.approved ? ':white_check_mark:' : ':x:';
  lines.push(`## ${statusIcon} Rulebook AI Review`);
  lines.push('');

  if (result.summary) {
    lines.push(`**Summary:** ${result.summary}`);
    lines.push('');
  }

  if (result.issues.length > 0) {
    lines.push('### Issues');
    lines.push('');
    for (const issue of result.issues) {
      const label = issue.severity.toUpperCase();
      const location = issue.file
        ? issue.line
          ? `\`${issue.file}:${issue.line}\``
          : `\`${issue.file}\``
        : '';
      const locationStr = location ? ` ${location}` : '';
      lines.push(`- **[${label}]**${locationStr} ${issue.message}`);
    }
    lines.push('');
  }

  if (result.suggestions.length > 0) {
    lines.push('### Suggestions');
    lines.push('');
    for (const suggestion of result.suggestions) {
      lines.push(`- ${suggestion}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('*Generated by [@hivehub/rulebook](https://github.com/hivellm/rulebook) AI Review*');

  return lines.join('\n');
}

/**
 * Post a review result as a PR comment using the `gh` CLI.
 *
 * When `prNumber` is omitted the `gh` CLI auto-detects the current PR
 * from the branch.
 */
export async function postGitHubComment(result: ReviewResult, prNumber?: string): Promise<void> {
  const markdown = formatReviewMarkdown(result);
  const prArg = prNumber ? ` ${prNumber}` : '';
  const escapedBody = markdown.replace(/'/g, "'\\''");
  const command = `gh pr comment${prArg} --body '${escapedBody}'`;

  try {
    await execAsync(command, { timeout: 15_000 });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to post GitHub comment: ${message}`);
  }
}

// ─── Severity threshold check ───────────────────────────────────────────────

const SEVERITY_RANK: Record<ReviewIssue['severity'], number> = {
  critical: 3,
  major: 2,
  minor: 1,
  suggestion: 0,
};

/**
 * Check whether any issue meets or exceeds the given severity threshold.
 *
 * Returns `true` when at least one issue is at the threshold level or higher.
 */
export function hasFailingIssues(
  issues: readonly ReviewIssue[],
  failOn: ReviewFailOnSeverity
): boolean {
  const threshold = SEVERITY_RANK[failOn];
  return issues.some((i) => SEVERITY_RANK[i.severity] >= threshold);
}

// ─── Convenience: read project AGENTS.md ────────────────────────────────────

/**
 * Read AGENTS.md from the given project root, if it exists.
 */
export async function readAgentsMd(projectRoot: string): Promise<string | undefined> {
  const agentsPath = path.join(projectRoot, 'AGENTS.md');
  if (await fileExists(agentsPath)) {
    return readFile(agentsPath);
  }
  return undefined;
}
