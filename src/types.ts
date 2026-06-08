export interface MonorepoDetection {
    detected: boolean;
    tool: 'turborepo' | 'nx' | 'pnpm' | 'lerna' | 'manual' | null;
    packages: string[]; // relative paths to package roots
}

export interface DetectionResult {
    languages: LanguageDetection[];
    libraries: LibraryDetection[];
    modules: ModuleDetection[];
    existingAgents: ExistingAgentsInfo | null;
    projectType?: 'monorepo' | 'library' | 'application' | 'cli';
    monorepo?: MonorepoDetection;
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

export type LibraryId =
    // TypeScript / JavaScript
    | 'react'
    | 'next'
    | 'vue'
    | 'svelte'
    | 'angular'
    | 'tailwind'
    | 'heroui'
    | 'radix'
    | 'shadcn'
    | 'prisma'
    | 'drizzle'
    | 'trpc'
    | 'zod'
    | 'express'
    | 'nestjs'
    | 'vitest'
    | 'jest'
    // Python
    | 'django'
    | 'fastapi'
    | 'flask'
    | 'sqlalchemy'
    | 'pydantic'
    | 'pytest'
    // Rust
    | 'axum'
    | 'actix'
    | 'tokio'
    | 'serde'
    | 'sqlx'
    // Go
    | 'gin'
    | 'echo'
    | 'gorm';

/**
 * A library/framework detected in the project (e.g. React, Prisma). Distinct from
 * {@link ModuleDetection}, which models MCP servers and external integrations.
 */
export interface LibraryDetection {
    library: LibraryId;
    confidence: number;
    indicators: string[];
    source: string;
}

export interface ModuleDetection {
    module:
        | 'vectorizer'
        | 'synap'
        | 'context7'
        | 'github'
        | 'playwright'
        | 'supabase'
        | 'serena'
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
    libraries?: string[];
    modules: string[];
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
        logging: boolean;
        gitHooks: boolean;
        templates: boolean;
        context: boolean;
        health: boolean;
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
