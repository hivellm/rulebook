import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, fileExists } from '../utils/file-system.js';
import { getCurrentVersion as getVersionFromBumper } from './version-bumper.js';
import path from 'path';

const execAsync = promisify(exec);

export interface Commit {
  hash: string;
  type: string;
  scope?: string;
  subject: string;
  body?: string;
  breaking: boolean;
}

export interface ChangelogSection {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  fixed: string[];
  removed: string[];
  deprecated: string[];
  security: string[];
  breaking: string[];
}

/**
 * Parse conventional commit message
 */
function parseCommit(message: string, hash: string): Commit | null {
  // Conventional commit format: type(scope): subject
  const match = message.match(/^(\w+)(?:\(([^)]+)\))?: (.+)$/);

  if (!match) {
    return null;
  }

  const [, type, scope, subject] = match;
  const breaking = message.includes('BREAKING CHANGE') || subject.startsWith('!');

  return {
    hash,
    type,
    scope,
    subject: subject.replace(/^!/, '').trim(),
    breaking,
  };
}

/**
 * Get commits since last tag
 */
export async function getCommitsSinceLastTag(projectDir: string): Promise<Commit[]> {
  try {
    // Get last tag
    const { stdout: lastTag } = await execAsync('git describe --tags --abbrev=0', {
      cwd: projectDir,
    });

    // Get commits since last tag
    const { stdout } = await execAsync(
      `git log ${lastTag.trim()}..HEAD --pretty=format:"%H|||%s"`,
      { cwd: projectDir }
    );

    if (!stdout.trim()) {
      return [];
    }

    return stdout
      .trim()
      .split('\n')
      .map((line) => {
        const [hash, message] = line.split('|||');
        return parseCommit(message, hash);
      })
      .filter((commit): commit is Commit => commit !== null);
  } catch {
    // No tags yet, get all commits
    try {
      const { stdout } = await execAsync('git log --pretty=format:"%H|||%s"', { cwd: projectDir });

      return stdout
        .trim()
        .split('\n')
        .map((line) => {
          const [hash, message] = line.split('|||');
          return parseCommit(message, hash);
        })
        .filter((commit): commit is Commit => commit !== null);
    } catch {
      return [];
    }
  }
}

/**
 * Generate changelog section from commits
 */
export function generateChangelogSection(commits: Commit[], version: string): ChangelogSection {
  const section: ChangelogSection = {
    version,
    date: new Date().toISOString().split('T')[0],
    added: [],
    changed: [],
    fixed: [],
    removed: [],
    deprecated: [],
    security: [],
    breaking: [],
  };

  for (const commit of commits) {
    const entry = commit.scope ? `**${commit.scope}**: ${commit.subject}` : commit.subject;

    if (commit.breaking) {
      section.breaking.push(entry);
    }

    switch (commit.type) {
      case 'feat':
        section.added.push(entry);
        break;
      case 'fix':
        section.fixed.push(entry);
        break;
      case 'refactor':
      case 'perf':
        section.changed.push(entry);
        break;
      case 'docs':
        // Skip docs commits in changelog
        break;
      case 'style':
        // Skip style commits
        break;
      case 'test':
        // Skip test commits
        break;
      case 'build':
      case 'ci':
      case 'chore':
        // Skip chore commits unless breaking
        if (commit.breaking) {
          section.changed.push(entry);
        }
        break;
      default:
        section.changed.push(entry);
    }
  }

  return section;
}

/**
 * Format changelog section as markdown
 */
export function formatChangelogSection(section: ChangelogSection): string {
  const lines: string[] = [];

  lines.push(`## [${section.version}] - ${section.date}`);
  lines.push('');

  if (section.breaking.length > 0) {
    lines.push('### ⚠️ BREAKING CHANGES');
    lines.push('');
    section.breaking.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (section.added.length > 0) {
    lines.push('### Added');
    lines.push('');
    section.added.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (section.changed.length > 0) {
    lines.push('### Changed');
    lines.push('');
    section.changed.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (section.fixed.length > 0) {
    lines.push('### Fixed');
    lines.push('');
    section.fixed.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (section.deprecated.length > 0) {
    lines.push('### Deprecated');
    lines.push('');
    section.deprecated.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (section.removed.length > 0) {
    lines.push('### Removed');
    lines.push('');
    section.removed.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  if (section.security.length > 0) {
    lines.push('### Security');
    lines.push('');
    section.security.forEach((item) => lines.push(`- ${item}`));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Update CHANGELOG.md with new version
 */
export async function updateChangelog(
  projectDir: string,
  section: ChangelogSection
): Promise<void> {
  const changelogPath = path.join(projectDir, 'CHANGELOG.md');

  let changelog = '';

  if (await fileExists(changelogPath)) {
    changelog = await readFile(changelogPath);
  } else {
    changelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

`;
  }

  // Find where to insert new version
  const newEntry = formatChangelogSection(section);

  // Insert after [Unreleased] section
  const unreleasedMatch = changelog.match(/## \[Unreleased\]\n/);

  if (unreleasedMatch && unreleasedMatch.index !== undefined) {
    const insertPos = unreleasedMatch.index + unreleasedMatch[0].length;
    changelog = changelog.slice(0, insertPos) + '\n' + newEntry + '\n' + changelog.slice(insertPos);
  } else {
    // No [Unreleased] section, prepend
    changelog = newEntry + '\n\n' + changelog;
  }

  await writeFile(changelogPath, changelog);
}

/**
 * Get current version from project
 */
export async function getCurrentVersion(projectDir: string): Promise<string | null> {
  return getVersionFromBumper(projectDir);
}

/**
 * Generate changelog for current version
 */
export async function generateChangelog(
  projectDir: string,
  version: string
): Promise<ChangelogSection> {
  const commits = await getCommitsSinceLastTag(projectDir);
  const section = generateChangelogSection(commits, version);
  await updateChangelog(projectDir, section);

  return section;
}
