import { TaskManager } from '../../core/task-manager.js';

export async function showTaskHandler(
  taskManager: TaskManager,
  args: { taskId: string }
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: {
    task: {
      id: string;
      title: string;
      status: 'pending' | 'in-progress' | 'completed' | 'blocked';
      proposal?: string;
      tasks?: string;
      design?: string;
      specs?: Record<string, string>;
      createdAt: string;
      updatedAt: string;
      archivedAt?: string;
    } | null;
    found: boolean;
  };
}> {
  try {
    const task = await taskManager.showTask(args.taskId);

    const output = {
      task: task
        ? {
            id: task.id,
            title: task.title,
            status: task.status,
            proposal: task.proposal,
            tasks: task.tasks,
            design: task.design,
            specs: task.specs,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            archivedAt: task.archivedAt,
          }
        : null,
      found: task !== null,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const output = {
      task: null,
      found: false,
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({ ...output, error: errorMessage }, null, 2),
        },
      ],
      structuredContent: output,
    };
  }
}
