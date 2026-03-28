/**
 * Indexer System Type Definitions
 *
 * Core types for the background indexer, representing files,
 * code symbols (classes, functions), and their relationships (Graph).
 */

export type CodeNodeType = 'file' | 'class' | 'function' | 'interface' | 'variable' | 'unknown';

export interface CodeNode {
  id: string; // Hash of the path + name, e.g., fnv1a("src/parser.ts:class:Parser")
  type: CodeNodeType;
  name: string;
  filePath: string;
  startLine: number;
  endLine: number;
  content: string; // The raw or slightly cleaned text of this block
  summary?: string; // Optional AI-generated or docstring summary
  hash: string; // Hash of the content to detect if it changed
  updatedAt: number; // epoch ms
}

export type CodeEdgeType =
  | 'imports'
  | 'exports'
  | 'implements'
  | 'calls'
  | 'extends'
  | 'instantiates'
  | 'unknown';

export interface CodeEdge {
  id: string; // Hash of sourceId + targetId + type
  sourceId: string; // The CodeNode making the reference (e.g., file A)
  targetId: string; // The CodeNode being referenced (e.g., file B)
  type: CodeEdgeType;
  weight: number; // 1.0 for direct imports, could be lower for fuzzy correlations
}

export interface IndexerConfig {
  enabled: boolean;
  watchPaths: string[]; // e.g., ['src', 'lib'] or just ['.']
  ignorePatterns: string[]; // e.g., ['node_modules', 'dist']
  chunkSize: number; // Default rough characters per chunk if AST fails
  debounceMs: number; // Default 3000ms
  depth: number; // Max directory depth for file watching (default: 4)
  usePolling: boolean; // Fallback to polling for FD-constrained envs (default: false)
}
