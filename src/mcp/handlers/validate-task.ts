import { TaskManager } from '../../core/task-manager.js';

export async function validateTaskHandler(
  taskManager: TaskManager,
  args: { taskId: string }
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: { valid: boolean; errors: string[]; warnings: string[] };
}> {
  try {
    const validation = await taskManager.validateTask(args.taskId);

    const output = {
      valid: validation.valid,
      errors: validation.errors,
      warnings: validation.warnings,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const output = {
      valid: false,
      errors: [errorMessage],
      warnings: [],
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
}
