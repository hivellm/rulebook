import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';
import type { PRDUserStory, PlanCheckpointConfig } from '../types.js';

const defaultExecAsync = promisify(exec);

/** Signature for the async exec function used by plan generation. */
export type ExecAsyncFn = (
  command: string,
  options: { timeout: number },
) => Promise<{ stdout: string }>;

/** AI tool type accepted by the plan generation step. */
type PlanTool = 'claude' | 'amp' | 'gemini';

// ─── Plan generation ─────────────────────────────────────────────────────────

/**
 * Build the planning-only prompt sent to the AI CLI tool.
 *
 * The prompt asks for an implementation plan without generating any code.
 */
export function buildPlanPrompt(story: PRDUserStory): string {
  const criteria = story.acceptanceCriteria.map((c) => `- ${c}`).join('\n');

  return [
    'You are planning (NOT implementing) a solution for this story:',
    '',
    `Story: ${story.title}`,
    `Description: ${story.description}`,
    `Acceptance Criteria:`,
    criteria,
    '',
    'Provide a detailed implementation plan covering:',
    '1. Files to create/modify',
    '2. Key design decisions',
    '3. Potential risks or blockers',
    '4. Estimated implementation steps',
    '',
    'IMPORTANT: Output ONLY the plan. Do NOT implement or generate code.',
  ].join('\n');
}

/**
 * Generate an implementation plan for a user story by invoking an AI CLI tool.
 *
 * Uses the same execution pattern as {@link review-manager#runAIReview} — runs
 * the tool binary with the prompt piped via stdin (for Claude) or as an
 * argument (for Gemini / Amp).
 *
 * @returns The plan text, or an empty string if the tool fails or times out.
 */
export async function generateIterationPlan(
  story: PRDUserStory,
  tool: PlanTool,
  _projectRoot: string,
  execFn: ExecAsyncFn = defaultExecAsync,
): Promise<string> {
  const prompt = buildPlanPrompt(story);

  const commands: Record<PlanTool, string> = {
    claude: 'claude',
    gemini: 'gemini',
    amp: 'amp',
  };

  const binary = commands[tool];
  const flag = tool === 'gemini' ? '' : '-p';

  // Pipe prompt via stdin to avoid shell escaping and arg-length issues
  const escapedPrompt = prompt.replace(/'/g, "'\\''");
  const command = flag
    ? `echo '${escapedPrompt}' | ${binary} ${flag} -`
    : `${binary} '${escapedPrompt}'`;

  try {
    const { stdout } = await execFn(command, { timeout: 120_000 });
    return stdout.trim();
  } catch {
    return '';
  }
}

// ─── Plan display ────────────────────────────────────────────────────────────

/**
 * Display the generated plan in the terminal with a chalk-styled border.
 *
 * Uses simple `console.log` output — no blessed/ncurses dependencies.
 */
export function displayPlan(plan: string, storyTitle: string): void {
  const maxWidth = 60;
  const titleLine = `  Story: ${storyTitle}`;
  const headerLine = '  Implementation Plan';
  const width = Math.max(maxWidth, headerLine.length + 4, titleLine.length + 4);

  const top = chalk.cyan(`${'='.repeat(width + 4)}`);
  const bottom = chalk.cyan(`${'='.repeat(width + 4)}`);

  console.log('');
  console.log(top);
  console.log(chalk.cyan.bold(headerLine));
  console.log(chalk.cyan(titleLine));
  console.log(bottom);
  console.log('');
  console.log(plan);
  console.log('');
}

// ─── Plan approval ───────────────────────────────────────────────────────────

/** Result returned by the plan approval step. */
export interface PlanApprovalResult {
  approved: boolean;
  feedback?: string;
}

/**
 * Display the plan and interactively request approval from the user.
 *
 * When `autoApproveAfterSeconds` is greater than zero the plan is automatically
 * approved after the specified delay. Otherwise an interactive inquirer prompt
 * is presented with three choices: approve, reject, or edit.
 *
 * @returns Approval result indicating whether to proceed and optional feedback.
 */
export async function requestPlanApproval(
  plan: string,
  story: PRDUserStory,
  autoApproveAfterSeconds: number,
): Promise<PlanApprovalResult> {
  displayPlan(plan, story.title);

  // Auto-approve path
  if (autoApproveAfterSeconds > 0) {
    console.log(
      chalk.yellow(
        `  Auto-approving in ${autoApproveAfterSeconds} seconds... (Ctrl+C to abort)`,
      ),
    );

    await new Promise<void>((resolve) => setTimeout(resolve, autoApproveAfterSeconds * 1000));
    console.log(chalk.green('  Plan auto-approved.'));
    return { approved: true };
  }

  // Interactive prompt path
  const inquirer = (await import('inquirer')).default;

  const { action } = await inquirer.prompt<{ action: string }>([
    {
      type: 'list',
      name: 'action',
      message: 'Review plan:',
      choices: [
        { name: 'approve', value: 'approve' },
        { name: 'reject', value: 'reject' },
        { name: 'edit', value: 'edit' },
      ],
    },
  ]);

  if (action === 'approve') {
    return { approved: true };
  }

  const feedbackMessage =
    action === 'reject' ? 'Reason for rejection?' : 'What needs to change?';

  const { feedback } = await inquirer.prompt<{ feedback: string }>([
    {
      type: 'input',
      name: 'feedback',
      message: feedbackMessage,
    },
  ]);

  return { approved: false, feedback };
}

// ─── Checkpoint gate ─────────────────────────────────────────────────────────

/**
 * Determine whether a plan checkpoint should be executed for the given story.
 *
 * Returns `false` when:
 * - The checkpoint feature is disabled.
 * - The session is non-interactive (CI, --yes flag, piped stdin).
 * - `requireApprovalForStories` is `'none'`.
 * - `requireApprovalForStories` is `'failed'` but the story already passes.
 */
export function shouldRunCheckpoint(
  config: PlanCheckpointConfig,
  story: PRDUserStory,
  isNonInteractive: boolean,
): boolean {
  if (!config.enabled) {
    return false;
  }

  if (isNonInteractive) {
    return false;
  }

  if (config.requireApprovalForStories === 'none') {
    return false;
  }

  if (config.requireApprovalForStories === 'all') {
    return true;
  }

  // 'failed' — only checkpoint stories that haven't passed yet
  return !story.passes;
}
