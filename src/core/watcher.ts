import { createModernConsole } from './modern-console.js';
import { AgentManager } from './agent-manager.js';

/**
 * Create and start modern console watcher
 */
export async function startWatcher(projectRoot: string): Promise<void> {
  // Create agent manager for watcher integration
  const agentManager = new AgentManager(projectRoot);
  
  const modernConsole = createModernConsole({
    projectRoot,
    refreshInterval: 100,
    agentManager,
  });

  await modernConsole.start();
}

/**
 * Create and start modern console watcher (alias)
 */
export async function startModernWatcher(projectRoot: string): Promise<void> {
  await startWatcher(projectRoot);
}
