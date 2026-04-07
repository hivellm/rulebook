/**
 * Barrel re-export — preserves the exact same export surface as the
 * original monolithic `commands.ts` so that `src/index.ts` does not
 * need to change its import path.
 */

export { initCommand } from './init.js';
export { updateCommand } from './update.js';
export {
  tasksCommand,
  taskCreateCommand,
  taskListCommand,
  taskShowCommand,
  taskValidateCommand,
  taskArchiveCommand,
} from './task.js';
export { mcpInitCommand, mcpServerCommand } from './mcp.js';
export {
  skillListCommand,
  skillAddCommand,
  skillRemoveCommand,
  skillShowCommand,
  skillSearchCommand,
} from './skills.js';
export {
  memorySearchCommand,
  memorySaveCommand,
  memoryListCommand,
  memoryStatsCommand,
  memoryVerifyCommand,
  memoryCleanupCommand,
  memoryExportCommand,
} from './memory.js';
export {
  ralphInitCommand,
  ralphRunCommand,
  ralphStatusCommand,
  ralphHistoryCommand,
  ralphPauseCommand,
  ralphResumeCommand,
  ralphImportIssuesCommand,
} from './ralph.js';
export {
  validateCommand,
  workflowsCommand,
  checkDepsCommand,
  checkCoverageCommand,
  generateDocsCommand,
  versionCommand,
  changelogCommand,
  healthCommand,
  fixCommand,
  watcherCommand,
  agentCommand,
  configCommand,
} from './misc.js';
export {
  plansShowCommand,
  plansInitCommand,
  plansClearCommand,
  continueCommand,
  modeSetCommand,
  overrideShowCommand,
  overrideEditCommand,
  overrideClearCommand,
  reviewCommand,
} from './plans.js';
export { setupClaudeCodePlugin, migrateMemoryDirectory } from './misc.js';
export {
  workspaceInitCommand,
  workspaceAddCommand,
  workspaceRemoveCommand,
  workspaceListCommand,
  workspaceStatusCommand,
} from './workspace.js';
export {
  decisionCreateCommand,
  decisionListCommand,
  decisionShowCommand,
  decisionSupersedeCommand,
  knowledgeAddCommand,
  knowledgeListCommand,
  knowledgeShowCommand,
  knowledgeRemoveCommand,
  learnCaptureCommand,
  learnFromRalphCommand,
  learnListCommand,
  learnPromoteCommand,
} from './context-intelligence.js';
export {
  analysisCreateCommand,
  analysisListCommand,
  analysisShowCommand,
  doctorCommand,
} from './analysis.js';
