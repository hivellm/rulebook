import { createModernConsole } from './modern-console.js';

/**
 * Create and start modern console watcher
 */
export async function startWatcher(projectRoot: string): Promise<void> {
  const modernConsole = createModernConsole({
    projectRoot,
    refreshInterval: 100,
  });

  await modernConsole.start();
}

/**
 * Create and start modern console watcher (alias)
 */
export async function startModernWatcher(projectRoot: string): Promise<void> {
  await startWatcher(projectRoot);
}
