export type FrameworkId =
  | 'nestjs'
  | 'spring'
  | 'laravel'
  | 'angular'
  | 'react'
  | 'vue'
  | 'nuxt'
  | 'nextjs'
  | 'django'
  | 'rails'
  | 'flask'
  | 'symfony'
  | 'zend'
  | 'jquery'
  | 'reactnative'
  | 'flutter'
  | 'electron';

export interface DetectionResult {
  languages: LanguageDetection[];
  modules: ModuleDetection[];
  frameworks: FrameworkDetection[];
  services: ServiceDetection[];
  existingAgents: ExistingAgentsInfo | null;
  projectType?: 'monorepo' | 'library' | 'application' | 'cli';
  gitHooks?: {
    preCommitExists: boolean;
    prePushExists: boolean;
  };
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
  module:
    | 'vectorizer'
    | 'synap'
    | 'context7'
    | 'github'
    | 'playwright'
    | 'supabase'
    | 'notion'
    | 'atlassian'
    | 'serena'
    | 'figma'
    | 'grafana'
    | 'rulebook_mcp';
  detected: boolean;
  source?: string;
}

export interface FrameworkDetection {
  framework: FrameworkId;
  detected: boolean;
  languages: LanguageDetection['language'][];
  confidence: number;
  indicators: string[];
}

export type ServiceId =
  | 'postgresql'
  | 'mysql'
  | 'mariadb'
  | 'sqlserver'
  | 'oracle'
  | 'sqlite'
  | 'mongodb'
  | 'cassandra'
  | 'dynamodb'
  | 'redis'
  | 'memcached'
  | 'elasticsearch'
  | 'neo4j'
  | 'influxdb'
  | 'rabbitmq'
  | 'kafka'
  | 's3'
  | 'azure_blob'
  | 'gcs'
  | 'minio';

export interface ServiceDetection {
  service: ServiceId;
  detected: boolean;
  confidence: number;
  indicators: string[];
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
  frameworks?: FrameworkId[];
  services?: ServiceId[];
  ides: string[];
  projectType: 'monorepo' | 'library' | 'application' | 'cli';
  coverageThreshold: number;
  strictDocs: boolean;
  generateWorkflows: boolean;
  includeGitWorkflow?: boolean;
  gitPushMode?: 'manual' | 'prompt' | 'auto';
  installGitHooks?: boolean;
  minimal?: boolean;
  lightMode?: boolean;
  modular?: boolean; // Enable modular /rulebook directory structure
  rulebookDir?: string; // Custom rulebook directory (default: 'rulebook')
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
  mode: 'full' | 'minimal';
  features: {
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
  // Project configuration detected/set during init/update
  languages?: LanguageDetection['language'][];
  frameworks?: FrameworkId[];
  modules?: ModuleDetection['module'][];
  services?: ServiceId[];
  modular?: boolean; // Enable modular /rulebook directory structure
  rulebookDir?: string; // Custom rulebook directory (default: 'rulebook')
  // MCP server configuration
  mcp?: {
    enabled?: boolean;
    tasksDir?: string; // Relative to project root
    archiveDir?: string; // Relative to project root
  };
  // Memory system configuration (v3.0)
  memory?: {
    enabled?: boolean;
    dbPath?: string; // default: '.rulebook/memory/memory.db'
    maxSizeBytes?: number; // default: 524288000 (500MB)
    autoCapture?: boolean; // default: true
    vectorDimensions?: number; // default: 256
  };
  // Ralph autonomous loop configuration (v3.0)
  ralph?: {
    enabled?: boolean; // default: true
    maxIterations?: number; // default: 10
    tool?: 'claude' | 'amp' | 'gemini'; // default: 'claude'
    maxContextLoss?: number; // default: 3
  };
  // Skills configuration (v2.0)
  skills?: {
    enabled: string[]; // List of enabled skill IDs
    disabled?: string[]; // List of explicitly disabled skill IDs
    order?: string[]; // Order for merging skills into AGENTS.md
    customSkillsPath?: string; // Path to custom skills directory
    autoDetect?: boolean; // Auto-enable skills based on detection
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

// Skills System Types (v2.0)

export type SkillCategory =
  | 'languages'
  | 'frameworks'
  | 'modules'
  | 'services'
  | 'workflows'
  | 'ides'
  | 'core'
  | 'cli'
  | 'git'
  | 'hooks';

export interface SkillMetadata {
  name: string;
  description: string;
  version?: string;
  category?: SkillCategory;
  author?: string;
  tags?: string[];
  dependencies?: string[];
  conflicts?: string[];
}

export interface Skill {
  id: string;
  path: string;
  metadata: SkillMetadata;
  content: string;
  category: SkillCategory;
  enabled: boolean;
}

export interface SkillsIndex {
  skills: Skill[];
  categories: Record<SkillCategory, Skill[]>;
  lastUpdated: string;
}

export interface SkillsConfig {
  enabled: string[];
  disabled?: string[];
  order?: string[];
  customSkillsPath?: string;
  autoDetect?: boolean;
}

export interface SkillConflict {
  skillA: string;
  skillB: string;
  reason: string;
  resolution?: 'choose_a' | 'choose_b' | 'manual';
}

export interface SkillValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  conflicts: SkillConflict[];
}

// Ralph Autonomous Loop Types (v3.0)

export interface PRDTask {
  id: string;
  title: string;
  description: string;
  status: 'pending' | 'in_iteration' | 'completed' | 'blocked';
  priority: number;
  acceptance_criteria: string[];
  estimated_iterations: number;
  dependencies: string[];
  tags: string[];
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface RalphPRD {
  version: string;
  generated_at: string;
  project_name: string;
  total_tasks: number;
  tasks: PRDTask[];
  metadata: {
    coverage_threshold: number;
    languages: string[];
    frameworks: string[];
    git_origin?: string;
  };
}

export interface IterationResult {
  iteration: number;
  timestamp: string;
  task_id: string;
  task_title: string;
  status: 'success' | 'partial' | 'failed';
  ai_tool: 'claude' | 'amp' | 'gemini';
  execution_time_ms: number;
  quality_checks: {
    type_check: boolean;
    lint: boolean;
    tests: boolean;
    coverage_met: boolean;
  };
  output_summary: string;
  git_commit?: string;
  errors?: string[];
  learnings?: string[];
  metadata: {
    context_loss_count: number;
    token_count?: number;
    parsed_completion?: boolean;
  };
}

export interface RalphLoopState {
  enabled: boolean;
  current_iteration: number;
  max_iterations: number;
  total_iterations: number;
  completed_tasks: number;
  total_tasks: number;
  paused: boolean;
  paused_at?: string;
  started_at: string;
  last_updated: string;
  current_task_id?: string;
  tool: 'claude' | 'amp' | 'gemini';
}

export interface RalphIterationMetadata {
  iteration: number;
  started_at: string;
  completed_at?: string;
  task_id: string;
  task_title: string;
  duration_ms?: number;
  status: IterationResult['status'];
  git_commit?: string;
  quality_checks: IterationResult['quality_checks'];
}
