import { TaskManager } from '../../core/task-manager.js';

export async function createTaskHandler(
  taskManager: TaskManager,
  args: { taskId: string; proposal?: { why?: string; whatChanges?: string; impact?: any } }
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: { success: boolean; taskId: string; message: string; path?: string };
}> {
  try {
    await taskManager.createTask(args.taskId);

    // If proposal content is provided, update the proposal.md file
    if (args.proposal) {
      const { writeFile } = await import('fs/promises');
      const { join } = await import('path');
      const taskPath = join(process.cwd(), 'rulebook', 'tasks', args.taskId);
      const proposalPath = join(taskPath, 'proposal.md');

      let proposalContent = `# Proposal: ${args.taskId}\n\n## Why\n\n${args.proposal.why || '[Explain why this change is needed - minimum 20 characters]'}\n\n## What Changes\n\n${args.proposal.whatChanges || '[Describe what will change]'}\n\n## Impact\n`;

      if (args.proposal.impact) {
        proposalContent += `- Affected specs: ${args.proposal.impact.affectedSpecs?.join(', ') || '[list]'}\n`;
        proposalContent += `- Affected code: ${args.proposal.impact.affectedCode?.join(', ') || '[list]'}\n`;
        proposalContent += `- Breaking change: ${args.proposal.impact.breakingChange ? 'YES' : 'NO'}\n`;
        proposalContent += `- User benefit: ${args.proposal.impact.userBenefit || '[describe]'}\n`;
      } else {
        proposalContent += `- Affected specs: [list]\n- Affected code: [list]\n- Breaking change: YES/NO\n- User benefit: [describe]\n`;
      }

      await writeFile(proposalPath, proposalContent);
    }

    const output = {
      success: true,
      taskId: args.taskId,
      message: `Task ${args.taskId} created successfully`,
      path: `rulebook/tasks/${args.taskId}`,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const output = {
      success: false,
      taskId: args.taskId,
      message: `Failed to create task: ${errorMessage}`,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
}
