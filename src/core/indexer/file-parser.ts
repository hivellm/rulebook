import { createHash, randomUUID } from 'crypto';
import { readFileSync, statSync } from 'fs';
import { extname } from 'path';
import type { CodeEdge, CodeNode, CodeNodeType } from './indexer-types.js';

export class CodeParser {
    private readonly CHUNK_SIZE = 1500; // Character limit for basic chunking if AST not used

    /**
     * Main entry point to parse a file and generate Nodes and Edges
     */
    public parseFile(filePath: string): { nodes: CodeNode[]; edges: CodeEdge[] } {
        try {
            const stats = statSync(filePath);
            if (stats.size > 1024 * 1024) {
                // Skip files > 1MB automatically to prevent OOM
                return { nodes: [], edges: [] };
            }

            const content = readFileSync(filePath, 'utf-8');
            const ext = extname(filePath).toLowerCase();

            // Dispatch to specific language parsers or fallback to naive
            if (['.ts', '.js', '.tsx', '.jsx'].includes(ext)) {
                return this.parseTypeScript(filePath, content);
            } else if (ext === '.md') {
                return this.parseMarkdown(filePath, content);
            } else {
                return this.parseNaive(filePath, content);
            }
        } catch (e) {
            console.error(`[Indexer] Failed to parse file ${filePath}:`, e);
            return { nodes: [], edges: [] };
        }
    }

    /**
     * Generates a stable hash for a node's content
     */
    public generateHash(content: string): string {
        return createHash('sha256').update(content).digest('hex');
    }

    /**
     * Generates a deterministic ID based on the file path and element name
     */
    private generateNodeId(filePath: string, elementPath: string): string {
        return createHash('md5').update(`${filePath}::${elementPath}`).digest('hex');
    }

    /**
     * Regex-based parser for TypeScript/JavaScript (V1 Strategy)
     * Future: Can be upgraded to use full AST (e.g. ts-morph / typescript compiler API)
     */
    private parseTypeScript(filePath: string, content: string): { nodes: CodeNode[]; edges: CodeEdge[] } {
        const nodes: CodeNode[] = [];
        const edges: CodeEdge[] = [];
        const lines = content.split('\n');
        let currentChunk = '';
        let startLine = 1;
        const now = Date.now();

        // 1. Create the base File Node
        const fileNodeId = this.generateNodeId(filePath, 'file');
        nodes.push({
            id: fileNodeId,
            type: 'file',
            name: filePath.split(/[/\\]/).pop() || 'unknown',
            filePath,
            startLine: 1,
            endLine: lines.length,
            content,
            hash: this.generateHash(content),
            updatedAt: now,
        });

        // 2. Extract Imports to create Edges
        // Simplistic regex for: import { X } from './Y' or import X from 'Y'
        const importRegex = /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const targetModule = match[1];
            edges.push({
                id: randomUUID(),
                sourceId: fileNodeId,
                targetId: `__module__${targetModule}`, // We resolve this later in the manager to actual Node IDs if internal
                type: 'imports',
                weight: 1.0,
            });
        }

        // 3. Naive Chunking for internal classes/functions (Regex based for v1)
        // Looking for 'class X' or 'function Y' or 'const Z = ('
        const classRegex = /export\s+class\s+([^ \n{]+)/;
        const functionRegex = /export\s+(?:async\s+)?function\s+([^ \n(]+)/;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            let matchName = classRegex.exec(line)?.[1] || functionRegex.exec(line)?.[1];
            if (matchName && currentChunk.length > 0) {
                // Save previous chunk if exists before starting new semantic block
                // (Simplified block separation)
            }

            currentChunk += line + '\n';

            if (currentChunk.length >= this.CHUNK_SIZE) {
                nodes.push(this.createNode(filePath, 'chunk', matchName || `chunk-${i}`, currentChunk, startLine, i + 1, now));
                currentChunk = '';
                startLine = i + 2;
            }
        }

        // Flush remaining
        if (currentChunk.trim().length > 0) {
            nodes.push(this.createNode(filePath, 'chunk', `chunk-end`, currentChunk, startLine, lines.length, now));
        }

        return { nodes, edges };
    }

    private parseMarkdown(filePath: string, content: string): { nodes: CodeNode[]; edges: CodeEdge[] } {
        const nodes: CodeNode[] = [];
        const lines = content.split('\n');
        const now = Date.now();
        let currentChunk = '';
        let startLine = 1;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('# ') || line.startsWith('## ')) {
                if (currentChunk.trim().length > 0) {
                    nodes.push(this.createNode(filePath, 'unknown', `md-section-${startLine}`, currentChunk, startLine, i, now));
                }
                currentChunk = line + '\n';
                startLine = i + 1;
            } else {
                currentChunk += line + '\n';
            }

            if (currentChunk.length > this.CHUNK_SIZE * 2) {
                nodes.push(this.createNode(filePath, 'unknown', `md-chunk-${startLine}`, currentChunk, startLine, i + 1, now));
                currentChunk = '';
                startLine = i + 2;
            }
        }

        if (currentChunk.trim().length > 0) {
            nodes.push(this.createNode(filePath, 'unknown', `md-end`, currentChunk, startLine, lines.length, now));
        }

        return { nodes, edges: [] };
    }

    private parseNaive(filePath: string, content: string): { nodes: CodeNode[]; edges: CodeEdge[] } {
        const nodes: CodeNode[] = [];
        const lines = content.split('\n');
        const now = Date.now();

        // Just chunk it linearly
        let currentChunk = '';
        let startLine = 1;

        for (let i = 0; i < lines.length; i++) {
            currentChunk += lines[i] + '\n';
            if (currentChunk.length >= this.CHUNK_SIZE) {
                nodes.push(this.createNode(filePath, 'unknown', `chunk-${startLine}`, currentChunk, startLine, i + 1, now));
                currentChunk = '';
                startLine = i + 2;
            }
        }

        if (currentChunk.trim().length > 0) {
            nodes.push(this.createNode(filePath, 'unknown', `chunk-end`, currentChunk, startLine, lines.length, now));
        }

        return { nodes, edges: [] };
    }

    private createNode(filePath: string, type: string, name: string, content: string, startLine: number, endLine: number, now: number): CodeNode {
        return {
            id: this.generateNodeId(filePath, `${startLine}-${endLine}`),
            type: type as CodeNodeType,
            name,
            filePath,
            startLine,
            endLine,
            content,
            hash: this.generateHash(content),
            updatedAt: now
        };
    }
}
