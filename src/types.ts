export interface DetectionResult {
  languages: LanguageDetection[];
  modules: ModuleDetection[];
  existingAgents: ExistingAgentsInfo | null;
  projectType?: 'monorepo' | 'library' | 'application' | 'cli';
}

export interface LanguageDetection {
  language:
    | 'rust'
    | 'typescript'
    | 'javascript'
    | 'python'
    | 'go'
    | 'java'
    | 'elixir'
    | 'csharp'
    | 'php'
    | 'swift'
    | 'kotlin'
    | 'cpp'
    | 'c'
    | 'solidity'
    | 'zig'
    | 'erlang'
    | 'dart'
    | 'ruby'
    | 'scala'
    | 'r'
    | 'haskell'
    | 'julia'
    | 'lua'
    | 'ada'
    | 'sas'
    | 'lisp'
    | 'objectivec'
    | 'sql';
  confidence: number;
  indicators: string[];
}

export interface ModuleDetection {
  module: 'vectorizer' | 'synap' | 'openspec' | 'context7' | 'github' | 'playwright';
  detected: boolean;
  source?: string;
}

export interface ExistingAgentsInfo {
  exists: boolean;
  path: string;
  content?: string;
  blocks: AgentBlock[];
}

export interface AgentBlock {
  name: string;
  startLine: number;
  endLine: number;
  content: string;
}

export interface ProjectConfig {
  languages: string[];
  modules: string[];
  ides: string[];
  projectType: 'monorepo' | 'library' | 'application' | 'cli';
  coverageThreshold: number;
  strictDocs: boolean;
  generateWorkflows: boolean;
  includeGitWorkflow?: boolean;
  gitPushMode?: 'manual' | 'prompt' | 'auto';
}

export interface RuleConfig {
  name: string;
  enabled: boolean;
  content: string;
}

export interface TemplateData {
  projectName: string;
  languages: string[];
  modules: string[];
  ides: string[];
  coverageThreshold: number;
  strictDocs: boolean;
  timestamp: string;
}

export interface RulebookConfig {
  version: string;
  installedAt: string;
  updatedAt: string;
  projectId: string;
  features: {
    openspec: boolean;
    watcher: boolean;
    agent: boolean;
    logging: boolean;
    telemetry: boolean;
    notifications: boolean;
    dryRun: boolean;
    gitHooks: boolean;
    repl: boolean;
    templates: boolean;
    context: boolean;
    health: boolean;
    plugins: boolean;
    parallel: boolean;
    smartContinue: boolean;
  };
  coverageThreshold: number;
  language: 'en' | 'pt-BR';
  outputLanguage: 'en' | 'pt-BR';
  cliTools: string[];
  maxParallelTasks: number;
  timeouts: {
    taskExecution: number;
    cliResponse: number;
    testRun: number;
  };
}

export interface OpenSpecTask {
  id: string;
  title: string;
  description: string;
  priority: number;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  dependencies: string[];
  estimatedTime: number;
  actualTime?: number;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  assignedTo?: string;
  tags: string[];
  metadata?: {
    startedAt?: string;
    [key: string]: any;
  };
}

export interface OpenSpecData {
  tasks: OpenSpecTask[];
  currentTask?: string;
  history: OpenSpecTask[];
  metadata: {
    version: string;
    createdAt: string;
    updatedAt: string;
    totalTasks: number;
    completedTasks: number;
  };
}

export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: Record<string, unknown>;
  taskId?: string;
  duration?: number;
}

export interface TelemetryData {
  taskMetrics: {
    [taskId: string]: {
      executionTime: number[];
      attempts: number[];
      successRate: number;
      coverageTrend: number[];
    };
  };
  systemMetrics: {
    cpuUsage: number[];
    memoryUsage: number[];
    diskUsage: number[];
  };
  cliMetrics: {
    [cliTool: string]: {
      responseTime: number[];
      timeoutCount: number;
      successRate: number;
    };
  };
  lastUpdated: string;
}
