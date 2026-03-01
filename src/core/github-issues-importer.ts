import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import type { PRDUserStory, RalphPRD } from '../types.js';

const execAsync = promisify(exec);

/**
 * Represents a GitHub issue fetched via the `gh` CLI.
 */
export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  labels: Array<{ name: string }>;
  milestone: { title: string } | null;
  state: 'OPEN' | 'CLOSED';
  url: string;
}

/**
 * Filters for narrowing down which GitHub issues to import.
 */
export interface ImportFilters {
  label?: string;
  milestone?: string;
  limit?: number;
  state?: 'OPEN' | 'CLOSED' | 'all';
}

/**
 * Result summary from an import operation.
 */
export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  stories: PRDUserStory[];
}

/**
 * Check whether the GitHub CLI (`gh`) is installed and available on PATH.
 * Returns true if `gh --version` exits successfully, false otherwise.
 */
export async function checkGhCliAvailable(): Promise<boolean> {
  try {
    await execAsync('gh --version');
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch GitHub issues from the current repository using the `gh` CLI.
 *
 * Builds a `gh issue list --json ...` command with optional label, milestone,
 * limit, and state filters.  Returns an empty array on any error.
 */
export async function fetchGithubIssues(filters: ImportFilters): Promise<GitHubIssue[]> {
  const args: string[] = [
    'gh',
    'issue',
    'list',
    '--json',
    'number,title,body,labels,milestone,state,url',
  ];

  if (filters.label) {
    args.push('--label', filters.label);
  }

  if (filters.milestone) {
    args.push('--milestone', filters.milestone);
  }

  const limit = filters.limit ?? 20;
  args.push('--limit', String(limit));

  const state = filters.state ?? 'open';
  if (state !== 'all') {
    args.push('--state', state.toLowerCase());
  } else {
    args.push('--state', 'all');
  }

  try {
    const { stdout } = await execAsync(args.join(' '));
    const parsed: unknown = JSON.parse(stdout);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed as GitHubIssue[];
  } catch {
    return [];
  }
}

/**
 * Extract acceptance criteria from a GitHub issue body.
 *
 * Recognises two formats:
 * 1. Markdown checkboxes anywhere in the body: `- [ ] text` or `- [x] text`
 * 2. A dedicated "Acceptance Criteria" section (header or bold label) followed
 *    by checkbox lines.
 *
 * Returns the text content of each criterion without the checkbox prefix.
 */
export function extractAcceptanceCriteria(body: string): string[] {
  if (!body) {
    return [];
  }

  const criteria: string[] = [];
  const seen = new Set<string>();

  // Match markdown checkboxes: - [ ] text  or  - [x] text
  const checkboxRegex = /^[ \t]*-\s+\[[ xX]\]\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = checkboxRegex.exec(body)) !== null) {
    const text = match[1].trim();
    if (text && !seen.has(text)) {
      seen.add(text);
      criteria.push(text);
    }
  }

  return criteria;
}

/**
 * Convert a single GitHub issue into a Ralph PRD user story.
 *
 * The story id follows the format `GH-<issue number>`.
 * If the issue body has no extractable acceptance criteria a sensible
 * default is used.
 */
export function convertIssueToStory(
  issue: GitHubIssue,
  existingPriority?: number,
): PRDUserStory {
  const body = issue.body ?? '';
  const acceptanceCriteria = extractAcceptanceCriteria(body);

  if (acceptanceCriteria.length === 0) {
    acceptanceCriteria.push('Issue resolved and tests passing');
  }

  return {
    id: `GH-${issue.number}`,
    title: issue.title,
    description: body.slice(0, 500),
    acceptanceCriteria,
    priority: existingPriority ?? 1,
    passes: false,
    notes: `Imported from GitHub Issue #${issue.number}: ${issue.url}`,
  };
}

/**
 * Merge a list of newly-converted stories into an existing PRD (or create a
 * new one when `prd` is `null`).
 *
 * Matching is based on story `id` (e.g. `GH-42`).
 * - Existing stories are updated (title / description) but their `passes`
 *   state and `priority` are preserved.
 * - New stories are appended.
 *
 * Returns the merged PRD and a summary of what changed.
 */
export function mergeStoriesIntoExistingPrd(
  prd: RalphPRD | null,
  newStories: PRDUserStory[],
): { prd: RalphPRD; result: ImportResult } {
  const projectName = path.basename(process.cwd());

  const mergedPrd: RalphPRD = prd
    ? { ...prd, userStories: [...prd.userStories] }
    : {
        project: projectName,
        branchName: `ralph/${projectName}`,
        description: `PRD generated from GitHub issues for ${projectName}`,
        userStories: [],
      };

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const story of newStories) {
    const existingIndex = mergedPrd.userStories.findIndex((s) => s.id === story.id);

    if (existingIndex >= 0) {
      // Update title and description, preserve passes and priority
      const existing = mergedPrd.userStories[existingIndex];
      mergedPrd.userStories[existingIndex] = {
        ...story,
        passes: existing.passes,
        priority: existing.priority,
      };
      updated++;
    } else {
      mergedPrd.userStories.push(story);
      imported++;
    }
  }

  return {
    prd: mergedPrd,
    result: {
      imported,
      updated,
      skipped,
      stories: mergedPrd.userStories,
    },
  };
}
