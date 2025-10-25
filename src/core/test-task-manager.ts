import { OpenSpecManager } from './openspec-manager.js';
import type { OpenSpecTask } from '../types.js';

/**
 * Test Task Manager
 * Handles creation and execution of test tasks
 */
export class TestTaskManager {
  private openspecManager: OpenSpecManager;

  constructor(openspecManager: OpenSpecManager) {
    this.openspecManager = openspecManager;
  }

  /**
   * Create a test task with the given title and description
   */
  async createTestTask(title: string, description: string): Promise<string> {
    const task: Omit<OpenSpecTask, 'id' | 'createdAt' | 'updatedAt' | 'attempts'> = {
      title,
      description,
      priority: 1,
      status: 'pending',
      dependencies: [],
      estimatedTime: 30, // 30 minutes estimated
      tags: ['test', 'automated'],
      metadata: {
        type: 'test-task',
        createdBy: 'test-task-manager'
      }
    };

    return await this.openspecManager.addTask(task);
  }

  /**
   * Execute a test task
   */
  async executeTestTask(taskId: string): Promise<boolean> {
    try {
      const task = await this.openspecManager.getTask(taskId);
      if (!task) {
        throw new Error(`Task ${taskId} not found`);
      }

      // Update task status to in-progress
      await this.openspecManager.updateTaskStatus(taskId, 'in-progress');

      // Simulate test execution
      console.log(`🧪 Executing test task: ${task.title}`);
      console.log(`📝 Description: ${task.description}`);
      
      // Simulate some work
      await this.delay(1000);
      
      // Simulate test results (randomly pass/fail for demo)
      const testPassed = Math.random() > 0.3; // 70% success rate
      
      if (testPassed) {
        console.log('✅ Test task completed successfully');
        await this.openspecManager.markTaskComplete(taskId);
        return true;
      } else {
        console.log('❌ Test task failed');
        await this.openspecManager.updateTaskStatus(taskId, 'failed');
        return false;
      }
    } catch (error) {
      console.error('Error executing test task:', error);
      await this.openspecManager.updateTaskStatus(taskId, 'failed');
      return false;
    }
  }

  /**
   * Get all test tasks
   */
  async getTestTasks(): Promise<OpenSpecTask[]> {
    const data = await this.openspecManager.loadOpenSpec();
    return data.tasks.filter(task => 
      task.tags.includes('test') || 
      task.metadata?.type === 'test-task'
    );
  }

  /**
   * Get test task statistics
   */
  async getTestTaskStats(): Promise<{
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    failed: number;
  }> {
    const testTasks = await this.getTestTasks();
    
    return {
      total: testTasks.length,
      pending: testTasks.filter(t => t.status === 'pending').length,
      inProgress: testTasks.filter(t => t.status === 'in-progress').length,
      completed: testTasks.filter(t => t.status === 'completed').length,
      failed: testTasks.filter(t => t.status === 'failed').length
    };
  }

  /**
   * Run all pending test tasks
   */
  async runAllTestTasks(): Promise<{ passed: number; failed: number; total: number }> {
    const testTasks = await this.getTestTasks();
    const pendingTasks = testTasks.filter(t => t.status === 'pending');
    
    let passed = 0;
    let failed = 0;
    
    console.log(`🚀 Running ${pendingTasks.length} test tasks...`);
    
    for (const task of pendingTasks) {
      const success = await this.executeTestTask(task.id);
      if (success) {
        passed++;
      } else {
        failed++;
      }
    }
    
    return {
      passed,
      failed,
      total: pendingTasks.length
    };
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Factory function to create TestTaskManager
 */
export function createTestTaskManager(openspecManager: OpenSpecManager): TestTaskManager {
  return new TestTaskManager(openspecManager);
}