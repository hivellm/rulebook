import { TaskManager } from '../../core/task-manager.js';

export async function listTasksHandler(
  taskManager: TaskManager,
  args: { includeArchived?: boolean; status?: 'pending' | 'in-progress' | 'completed' | 'blocked' }
): Promise<{
  content: Array<{ type: 'text'; text: string }>;
  structuredContent: {
    tasks: Array<{
      id: string;
      title: string;
      status: 'pending' | 'in-progress' | 'completed' | 'blocked';
      createdAt: string;
      updatedAt: string;
      archivedAt?: string;
    }>;
    count: number;
  };
}> {
  try {
    const tasks = await taskManager.listTasks(args.includeArchived || false);

    // Filter by status if provided
    let filteredTasks = tasks;
    if (args.status) {
      filteredTasks = tasks.filter((task) => task.status === args.status);
    }

    const output = {
      tasks: filteredTasks.map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt,
        archivedAt: task.archivedAt,
      })),
      count: filteredTasks.length,
    };

    return {
      content: [{ type: 'text', text: JSON.stringify(output, null, 2) }],
      structuredContent: output,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const output = {
      tasks: [],
      count: 0,
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
