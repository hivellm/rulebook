/**
 * Pure functions for Ralph parallel story execution.
 *
 * Provides dependency analysis, batch partitioning, file-conflict detection,
 * and orchestration logic for running multiple user stories concurrently.
 *
 * All functions are side-effect-free and fully testable without mocks.
 */

import type { PRDUserStory } from '../types.js';

/**
 * Regex pattern that matches story IDs like "US-001", "GH-42", etc.
 */
const STORY_ID_PATTERN = /(US|GH)-\d+/g;

/**
 * Regex pattern that matches file-like paths in text.
 * Captures patterns such as `src/core/auth.ts`, `lib/utils.js`, `index.ts`, etc.
 */
const FILE_PATH_PATTERN =
  /(?:^|\s|`|"|')([a-zA-Z0-9._/-]+\.(?:ts|js|tsx|jsx|json|css|scss|html|vue|svelte|py|go|rs|java|rb|php))\b/g;

/**
 * Extract all story ID references from a text string.
 * Returns unique IDs found in the text.
 */
function extractStoryIds(text: string): string[] {
  const matches = text.match(STORY_ID_PATTERN);
  return matches ? [...new Set(matches)] : [];
}

/**
 * Extract all file-path-like references from a text string.
 * Returns unique file paths found in the text.
 */
function extractFilePaths(text: string): string[] {
  const paths: string[] = [];
  let match: RegExpExecArray | null;
  const regex = new RegExp(FILE_PATH_PATTERN.source, FILE_PATH_PATTERN.flags);

  while ((match = regex.exec(text)) !== null) {
    paths.push(match[1]);
  }

  return [...new Set(paths)];
}

/**
 * Gather all searchable text from a user story for dependency/conflict analysis.
 */
function getStoryText(story: PRDUserStory): string {
  const parts: string[] = [
    story.description ?? '',
    story.notes ?? '',
    ...(story.acceptanceCriteria ?? []),
  ];
  return parts.join('\n');
}

/**
 * Analyze inter-story dependencies by scanning each story's text for references
 * to other stories' IDs.
 *
 * @param stories - The list of user stories to analyze
 * @returns A map from story ID to the list of story IDs it depends on
 */
export function analyzeDependencies(stories: PRDUserStory[]): Map<string, string[]> {
  const storyIds = new Set(stories.map((s) => s.id));
  const deps = new Map<string, string[]>();

  for (const story of stories) {
    const text = getStoryText(story);
    const referencedIds = extractStoryIds(text);

    // Filter to only IDs that exist in the story set, excluding self-references
    const dependencies = referencedIds.filter((id) => id !== story.id && storyIds.has(id));

    deps.set(story.id, dependencies);
  }

  return deps;
}

/**
 * Partition stories into batches that can run concurrently, respecting
 * dependency ordering and a maximum worker count per batch.
 *
 * Algorithm:
 * 1. Stories with no unresolved dependencies go into the current batch (up to maxWorkers).
 * 2. Once a batch is full or no more ready stories remain, finalize the batch.
 * 3. Stories whose dependencies are all in previous batches become eligible.
 * 4. Circular or unresolvable dependencies are placed in the final batch.
 *
 * @param stories - The stories to partition
 * @param maxWorkers - Maximum number of stories per batch
 * @param deps - Dependency map from analyzeDependencies()
 * @returns Array of batches, each batch is an array of stories to run concurrently
 */
export function partitionForParallel(
  stories: PRDUserStory[],
  maxWorkers: number,
  deps: Map<string, string[]>
): PRDUserStory[][] {
  if (stories.length === 0) {
    return [];
  }

  const effectiveMaxWorkers = Math.max(1, maxWorkers);
  const batches: PRDUserStory[][] = [];
  const placed = new Set<string>(); // IDs already placed in a batch
  const remaining = new Map<string, PRDUserStory>(stories.map((s) => [s.id, s]));

  // Iteratively build batches until all stories are placed or we detect a deadlock
  while (remaining.size > 0) {
    const batch: PRDUserStory[] = [];

    // Find stories whose dependencies are all satisfied (already placed)
    for (const [id, story] of remaining) {
      if (batch.length >= effectiveMaxWorkers) {
        break;
      }

      const storyDeps = deps.get(id) ?? [];
      const allDepsResolved = storyDeps.every((depId) => placed.has(depId));

      if (allDepsResolved) {
        batch.push(story);
      }
    }

    if (batch.length === 0) {
      // Deadlock: remaining stories have circular or unresolvable deps.
      // Place them all in a final batch, respecting maxWorkers per sub-batch.
      const unresolved = [...remaining.values()];
      for (let i = 0; i < unresolved.length; i += effectiveMaxWorkers) {
        batches.push(unresolved.slice(i, i + effectiveMaxWorkers));
      }
      break;
    }

    // Remove placed stories from remaining
    for (const story of batch) {
      remaining.delete(story.id);
      placed.add(story.id);
    }

    batches.push(batch);
  }

  return batches;
}

/**
 * Detect whether two stories likely touch the same files, using a simple
 * heuristic: extract file-path-like patterns from each story's text and
 * check for meaningful overlap (more than 1 file in common).
 *
 * @param story1 - First user story
 * @param story2 - Second user story
 * @returns true if there is meaningful file overlap between the two stories
 */
export function detectFileConflicts(story1: PRDUserStory, story2: PRDUserStory): boolean {
  const files1 = extractFilePaths(getStoryText(story1));
  const files2 = extractFilePaths(getStoryText(story2));

  if (files1.length === 0 || files2.length === 0) {
    return false;
  }

  const set1 = new Set(files1);
  const commonFiles = files2.filter((f) => set1.has(f));

  return commonFiles.length > 1;
}

/**
 * Build the final parallel execution batches by:
 * 1. Analyzing inter-story dependencies
 * 2. Partitioning into dependency-ordered batches
 * 3. Splitting batches that contain file-conflicting stories
 *
 * @param stories - All pending user stories to execute
 * @param maxWorkers - Maximum concurrent workers
 * @returns Array of batches, each batch safe to run concurrently
 */
export function buildParallelBatches(
  stories: PRDUserStory[],
  maxWorkers: number
): PRDUserStory[][] {
  if (stories.length === 0) {
    return [];
  }

  const deps = analyzeDependencies(stories);
  const rawBatches = partitionForParallel(stories, maxWorkers, deps);

  // Post-process: split batches that have file conflicts
  const finalBatches: PRDUserStory[][] = [];

  for (const batch of rawBatches) {
    if (batch.length <= 1) {
      finalBatches.push(batch);
      continue;
    }

    // Check all pairs in the batch for file conflicts
    const conflictingIndices = new Set<number>();
    for (let i = 0; i < batch.length; i++) {
      for (let j = i + 1; j < batch.length; j++) {
        if (detectFileConflicts(batch[i], batch[j])) {
          conflictingIndices.add(j); // Move the later story out
        }
      }
    }

    if (conflictingIndices.size === 0) {
      finalBatches.push(batch);
    } else {
      // Keep non-conflicting stories in the original batch
      const safe: PRDUserStory[] = [];
      const deferred: PRDUserStory[] = [];

      for (let i = 0; i < batch.length; i++) {
        if (conflictingIndices.has(i)) {
          deferred.push(batch[i]);
        } else {
          safe.push(batch[i]);
        }
      }

      if (safe.length > 0) {
        finalBatches.push(safe);
      }

      // Place each deferred story in its own batch (they conflict with something)
      for (const story of deferred) {
        finalBatches.push([story]);
      }
    }
  }

  return finalBatches;
}
