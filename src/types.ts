export interface DetectionResult {
  languages: LanguageDetection[];
  modules: ModuleDetection[];
  existingAgents: ExistingAgentsInfo | null;
  projectType?: 'monorepo' | 'library' | 'application' | 'cli';
}

export interface LanguageDetection {
  language: 'rust' | 'typescript' | 'python' | 'go' | 'java' | 'elixir' | 'csharp' | 'php' | 'swift' | 'kotlin';
  confidence: number;
  indicators: string[];
}

export interface ModuleDetection {
  module: 'vectorizer' | 'synap' | 'openspec' | 'context7';
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
