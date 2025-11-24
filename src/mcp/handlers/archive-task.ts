import { TaskManager } from '../../core/task-manager.js';
import { join } from 'path';

export async function archiveTaskHandler(
  taskManager: TaskManager,
  args: { taskId: string; skipValidation?: boolean }
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: {
    success: boolean;
    taskId: string;
    archivePath: string;
    message: string;
  };
}> {
  try {
    await taskManager.archiveTask(args.taskId, args.skipValidation || false);

    const archiveDate = new Date().toISOString().split('T')[0];
    const archiveName = `${archiveDate}-${args.taskId}`;
    const archivePath = join('rulebook', 'tasks', 'archive', archiveName);

    const output = {
      success: true,
      taskId: args.taskId,
      archivePath,
      message: `Task ${args.taskId} archived successfully`,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const archiveDate = new Date().toISOString().split('T')[0];
    const archiveName = `${archiveDate}-${args.taskId}`;
    const archivePath = join('rulebook', 'tasks', 'archive', archiveName);

    const output = {
      success: false,
      taskId: args.taskId,
      archivePath,
      message: `Failed to archive task: ${errorMessage}`,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  }
}
