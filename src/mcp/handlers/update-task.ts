import { TaskManager } from '../../core/task-manager.js';

export async function updateTaskHandler(
  taskManager: TaskManager,
  args: {
    taskId: string;
    status?: 'pending' | 'in-progress' | 'completed' | 'blocked';
    progress?: number;
  }
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: { success: boolean; taskId: string; message: string };
}> {
  try {
    if (args.status) {
      await taskManager.updateTaskStatus(args.taskId, args.status);
    }

    // Progress tracking would require additional implementation
    // For now, we just update status
    if (args.progress !== undefined) {
      // TODO: Implement progress tracking in task-manager.ts
      // This could update tasks.md or a separate progress file
    }

    const output = {
      success: true,
      taskId: args.taskId,
      message: `Task ${args.taskId} updated successfully`,
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
      message: `Failed to update task: ${errorMessage}`,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
}
