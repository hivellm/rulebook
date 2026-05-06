export interface MonorepoDetection {
  detected: boolean;
  tool: 'turborepo' | 'nx' | 'pnpm' | 'lerna' | 'manual' | null;
  packages: string[]; // relative paths to package roots
}

export interface DetectionResult {
  languages: LanguageDetection[];
  modules: ModuleDetection[];
  existingAgents: ExistingAgentsInfo | null;
  projectType?: 'monorepo' | 'library' | 'application' | 'cli';
  monorepo?: MonorepoDetection;
  gitHooks?: {
    preCommitExists: boolean;
    prePushExists: boolean;
  };
  cursor?: {
    detected: boolean; // .cursor/ dir or .cursorrules exists
    hasCursorrules: boolean; // deprecated .cursorrules file present
    hasMdcRules: boolean; // .cursor/rules/*.mdc files exist
  };
  geminiCli?: {
    detected: boolean; // GEMINI.md exists or gemini-cli in cliTools
  };
  continueDev?: {
    detected: boolean; // .continue/ directory exists
    rulesDir: string; // path to .continue/rules/
  };
  windsurf?: {
    detected: boolean; // .windsurfrules file exists
  };
  githubCopilot?: {
    detected: boolean; // .github/copilot-instructions.md exists
  };
  opencode?: {
    detected: boolean; // opencode.json/.jsonc, .opencode/, or opencode binary on PATH
    hasConfigJson: boolean; // opencode.json or opencode.jsonc exists
    hasOpencodeDir: boolean; // .opencode/ directory exists
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
    | 'rulebook_mcp'
    | 'sequential_thinking';
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
  installGitHooks?: boolean;
  minimal?: boolean;
  lightMode?: boolean;
  modular?: boolean; // Enable modular /.rulebook directory structure
  rulebookDir?: string; // Custom rulebook directory (default: '.rulebook')
  agentsMode?: 'full' | 'lean'; // AGENTS.md generation mode: full (default) or lean (index-only)
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
  modules?: ModuleDetection['module'][];
  modular?: boolean; // Enable modular /.rulebook directory structure
  rulebookDir?: string; // Custom rulebook directory (default: '.rulebook')
  agentsMode?: 'full' | 'lean'; // AGENTS.md generation mode: full (default) or lean (index-only)
  // Monorepo configuration (v4.0)
  monorepo?: {
    detected?: boolean;
    tool?: 'turborepo' | 'nx' | 'pnpm' | 'lerna' | 'manual' | null;
    packages?: string[]; // relative paths to package roots
  };
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
  // Background indexer configuration (file watcher)
  indexer?: {
    watchPaths?: string[]; // default: ['.'] — directories to watch relative to project root
    ignorePatterns?: string[]; // default: ['node_modules', '.git', 'dist', 'build', '.rulebook', 'coverage']
    depth?: number; // default: 4 — max directory depth for file watching
    usePolling?: boolean; // default: false — use polling instead of native watchers (lower FD usage)
    debounceMs?: number; // default: 3000 — debounce interval for file change events
  };
  // Multi-agent / Teams enforcement (v5.3.0)
  multiAgent?: {
    enabled?: boolean; // default: false — auto-detected when `.claude/agents/` has ≥3 files
    enforceTeamForBackgroundAgents?: boolean; // default: true when enabled
  };
  // Session handoff & freshness (v5.3.0)
  handoff?: {
    enabled?: boolean; // default: true
    warnThresholdPct?: number; // default: 75
    forceThresholdPct?: number; // default: 90
    tokenizer?: 'auto' | 'chars' | 'tiktoken'; // default: 'auto'
    maxHistoryFiles?: number; // default: 50
  };
  // Terse mode — output-verbosity compression (v5.4.0)
  terse?: {
    enabled?: boolean; // default: true — installs skills + hooks on init/update
    defaultMode?: 'off' | 'brief' | 'terse' | 'ultra' | 'commit' | 'review'; // default: 'terse'
  };
  // Skills configuration (v2.0)
  skills?: {
    enabled: string[]; // List of enabled skill IDs
    disabled?: string[]; // List of explicitly disabled skill IDs
    order?: string[]; // Order for merging skills into AGENTS.md
    customSkillsPath?: string; // Path to custom skills directory
    autoDetect?: boolean; // Auto-enable skills based on detection
  };
  // Agent framework configuration (v5.0)
  agentFramework?: {
    projectType?: 'game-engine' | 'compiler' | 'web-app' | 'mobile' | 'generic';
    enableAgents?: boolean; // default: true when complexity is large/complex
    enableMemory?: boolean; // default: true — create agent-memory/ dirs
    modelAssignment?: {
      core?: string; // default: 'opus'
      standard?: string; // default: 'sonnet'
      research?: string; // default: 'haiku'
    };
  };
  // Reference implementation configuration (v5.0)
  referenceSource?: {
    enabled?: boolean;
    path?: string; // Path to reference source tree
    type?: 'source-tree' | 'compiler' | 'api-spec';
    citationFormat?: string; // e.g., "@source UE5 <file>:<line>"
    mandatoryFor?: string[]; // Domains requiring reference (e.g., ["rendering", "physics"])
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
  | 'modules'
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

// Context Intelligence Layer Types (v4.4)

export type DecisionStatus = 'proposed' | 'accepted' | 'superseded' | 'deprecated';

export interface Decision {
  id: number;
  slug: string;
  title: string;
  status: DecisionStatus;
  date: string;
  context: string;
  decision: string;
  alternatives: string[];
  consequences: string;
  supersededBy?: number;
  relatedTasks?: string[];
}

export type KnowledgeType = 'pattern' | 'anti-pattern';
export type KnowledgeCategory =
  | 'architecture'
  | 'code'
  | 'testing'
  | 'security'
  | 'performance'
  | 'devops';

export interface KnowledgeEntry {
  id: string;
  type: KnowledgeType;
  title: string;
  category: KnowledgeCategory;
  description: string;
  example?: string;
  whenToUse?: string;
  whenNotToUse?: string;
  createdAt: string;
  tags: string[];
  source: 'manual' | 'learn';
}

export interface Learning {
  id: string;
  title: string;
  content: string;
  source: 'manual' | 'task-archive';
  relatedTask?: string;
  relatedDecision?: number;
  tags: string[];
  createdAt: string;
  promotedTo?: {
    type: 'knowledge' | 'decision';
    id: string;
  };
}

export type {
  WorkspaceConfig,
  WorkspaceProject,
  WorkspaceStatus,
  WorkspaceProjectStatus,
} from './core/workspace/workspace-types.js';
