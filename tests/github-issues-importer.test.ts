import { describe, it, expect } from 'vitest';
import {
  extractAcceptanceCriteria,
  convertIssueToStory,
  mergeStoriesIntoExistingPrd,
  checkGhCliAvailable,
  type GitHubIssue,
} from '../src/core/github-issues-importer.js';
import type { RalphPRD } from '../src/types.js';

// ─── Helper: build a minimal GitHubIssue ───

function makeIssue(overrides: Partial<GitHubIssue> = {}): GitHubIssue {
  return {
    number: 1,
    title: 'Default issue title',
    body: '',
    labels: [],
    milestone: null,
    state: 'OPEN',
    url: 'https://github.com/owner/repo/issues/1',
    ...overrides,
  };
}

// ─── extractAcceptanceCriteria ───

describe('extractAcceptanceCriteria', () => {
  it('should extract unchecked checkbox items', () => {
    const body = '- [ ] item1\n- [ ] item2';
    const result = extractAcceptanceCriteria(body);
    expect(result).toEqual(['item1', 'item2']);
  });

  it('should extract checked checkbox items', () => {
    const body = '- [x] done item\n- [X] also done';
    const result = extractAcceptanceCriteria(body);
    expect(result).toEqual(['done item', 'also done']);
  });

  it('should return empty array for empty body', () => {
    expect(extractAcceptanceCriteria('')).toEqual([]);
  });

  it('should return empty array for null-ish body', () => {
    expect(extractAcceptanceCriteria(null as unknown as string)).toEqual([]);
  });

  it('should extract checkboxes under an Acceptance Criteria heading', () => {
    const body = [
      '## Description',
      'Some description text.',
      '',
      '## Acceptance Criteria',
      '- [ ] Criterion A',
      '- [ ] Criterion B',
    ].join('\n');

    const result = extractAcceptanceCriteria(body);
    expect(result).toEqual(['Criterion A', 'Criterion B']);
  });

  it('should extract checkboxes under bold Acceptance Criteria label', () => {
    const body = [
      '**Acceptance Criteria:**',
      '- [ ] Must compile without errors',
      '- [x] All tests pass',
    ].join('\n');

    const result = extractAcceptanceCriteria(body);
    expect(result).toEqual(['Must compile without errors', 'All tests pass']);
  });

  it('should deduplicate identical criteria', () => {
    const body = '- [ ] same item\n- [ ] same item\n- [ ] different item';
    const result = extractAcceptanceCriteria(body);
    expect(result).toEqual(['same item', 'different item']);
  });

  it('should handle indented checkboxes', () => {
    const body = '  - [ ] indented item';
    const result = extractAcceptanceCriteria(body);
    expect(result).toEqual(['indented item']);
  });

  it('should ignore non-checkbox list items', () => {
    const body = '- plain item\n- [ ] checkbox item';
    const result = extractAcceptanceCriteria(body);
    expect(result).toEqual(['checkbox item']);
  });
});

// ─── convertIssueToStory ───

describe('convertIssueToStory', () => {
  it('should set story id to GH-<number>', () => {
    const issue = makeIssue({ number: 42 });
    const story = convertIssueToStory(issue);
    expect(story.id).toBe('GH-42');
  });

  it('should set title from issue title', () => {
    const issue = makeIssue({ title: 'Fix login bug' });
    const story = convertIssueToStory(issue);
    expect(story.title).toBe('Fix login bug');
  });

  it('should truncate long body to 500 characters', () => {
    const longBody = 'A'.repeat(1000);
    const issue = makeIssue({ body: longBody });
    const story = convertIssueToStory(issue);
    expect(story.description).toHaveLength(500);
    expect(story.description).toBe('A'.repeat(500));
  });

  it('should use default acceptance criteria when body has no checkboxes', () => {
    const issue = makeIssue({ body: 'Just a plain description' });
    const story = convertIssueToStory(issue);
    expect(story.acceptanceCriteria).toEqual(['Issue resolved and tests passing']);
  });

  it('should extract acceptance criteria from issue body checkboxes', () => {
    const issue = makeIssue({
      body: '## Tasks\n- [ ] Create module\n- [ ] Write tests',
    });
    const story = convertIssueToStory(issue);
    expect(story.acceptanceCriteria).toEqual(['Create module', 'Write tests']);
  });

  it('should set passes to false', () => {
    const story = convertIssueToStory(makeIssue());
    expect(story.passes).toBe(false);
  });

  it('should use existingPriority when provided', () => {
    const story = convertIssueToStory(makeIssue(), 5);
    expect(story.priority).toBe(5);
  });

  it('should default priority to 1 when not provided', () => {
    const story = convertIssueToStory(makeIssue());
    expect(story.priority).toBe(1);
  });

  it('should include issue url in notes', () => {
    const issue = makeIssue({
      number: 99,
      url: 'https://github.com/org/repo/issues/99',
    });
    const story = convertIssueToStory(issue);
    expect(story.notes).toBe(
      'Imported from GitHub Issue #99: https://github.com/org/repo/issues/99'
    );
  });

  it('should handle issue with null body', () => {
    const issue = makeIssue({ body: null as unknown as string });
    const story = convertIssueToStory(issue);
    expect(story.description).toBe('');
    expect(story.acceptanceCriteria).toEqual(['Issue resolved and tests passing']);
  });
});

// ─── mergeStoriesIntoExistingPrd ───

describe('mergeStoriesIntoExistingPrd', () => {
  it('should create a new PRD when prd is null', () => {
    const stories = [
      convertIssueToStory(makeIssue({ number: 1, title: 'Story one' })),
      convertIssueToStory(makeIssue({ number: 2, title: 'Story two' })),
    ];

    const { prd, result } = mergeStoriesIntoExistingPrd(null, stories);

    expect(prd.userStories).toHaveLength(2);
    expect(prd.project).toBeTruthy();
    expect(prd.branchName).toContain('ralph/');
    expect(result.imported).toBe(2);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('should update existing story by id without duplicating', () => {
    const existingPrd: RalphPRD = {
      project: 'test-project',
      branchName: 'ralph/test-project',
      description: 'Test PRD',
      userStories: [
        {
          id: 'GH-10',
          title: 'Old title',
          description: 'Old description',
          acceptanceCriteria: ['Old criterion'],
          priority: 3,
          passes: true,
          notes: 'Old notes',
        },
      ],
    };

    const newStories = [
      convertIssueToStory(
        makeIssue({
          number: 10,
          title: 'Updated title',
          body: '- [ ] New criterion',
        })
      ),
    ];

    const { prd, result } = mergeStoriesIntoExistingPrd(existingPrd, newStories);

    // No duplicates
    expect(prd.userStories).toHaveLength(1);
    // Title updated
    expect(prd.userStories[0].title).toBe('Updated title');
    // passes preserved from existing
    expect(prd.userStories[0].passes).toBe(true);
    // priority preserved from existing
    expect(prd.userStories[0].priority).toBe(3);
    // Counts
    expect(result.updated).toBe(1);
    expect(result.imported).toBe(0);
  });

  it('should import new stories alongside existing ones', () => {
    const existingPrd: RalphPRD = {
      project: 'test-project',
      branchName: 'ralph/test-project',
      description: 'Test PRD',
      userStories: [
        {
          id: 'GH-1',
          title: 'Existing story',
          description: 'Exists',
          acceptanceCriteria: [],
          priority: 1,
          passes: false,
          notes: '',
        },
      ],
    };

    const newStories = [convertIssueToStory(makeIssue({ number: 2, title: 'Brand new story' }))];

    const { prd, result } = mergeStoriesIntoExistingPrd(existingPrd, newStories);

    expect(prd.userStories).toHaveLength(2);
    expect(result.imported).toBe(1);
    expect(result.updated).toBe(0);
  });

  it('should not mutate the original PRD object', () => {
    const existingPrd: RalphPRD = {
      project: 'test-project',
      branchName: 'ralph/test-project',
      description: 'Test PRD',
      userStories: [
        {
          id: 'GH-1',
          title: 'Original',
          description: '',
          acceptanceCriteria: [],
          priority: 1,
          passes: false,
          notes: '',
        },
      ],
    };

    const newStories = [convertIssueToStory(makeIssue({ number: 5, title: 'New' }))];

    mergeStoriesIntoExistingPrd(existingPrd, newStories);

    // Original PRD should be unchanged
    expect(existingPrd.userStories).toHaveLength(1);
  });

  it('should handle empty new stories array', () => {
    const existingPrd: RalphPRD = {
      project: 'test-project',
      branchName: 'ralph/test-project',
      description: 'Test PRD',
      userStories: [
        {
          id: 'GH-1',
          title: 'Existing',
          description: '',
          acceptanceCriteria: [],
          priority: 1,
          passes: false,
          notes: '',
        },
      ],
    };

    const { prd, result } = mergeStoriesIntoExistingPrd(existingPrd, []);

    expect(prd.userStories).toHaveLength(1);
    expect(result.imported).toBe(0);
    expect(result.updated).toBe(0);
    expect(result.skipped).toBe(0);
  });

  it('should return all stories in result.stories', () => {
    const newStories = [
      convertIssueToStory(makeIssue({ number: 1 })),
      convertIssueToStory(makeIssue({ number: 2 })),
    ];

    const { result } = mergeStoriesIntoExistingPrd(null, newStories);
    expect(result.stories).toHaveLength(2);
    expect(result.stories[0].id).toBe('GH-1');
    expect(result.stories[1].id).toBe('GH-2');
  });
});

// ─── checkGhCliAvailable ───

describe('checkGhCliAvailable', () => {
  it('should be a function that returns a promise', () => {
    // We only verify the export exists and has the right shape.
    // Actual execution depends on the local environment.
    expect(typeof checkGhCliAvailable).toBe('function');
  });
});
