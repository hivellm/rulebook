#!/usr/bin/env node

/**
 * Setup MCP configuration file based on detected IDE
 * Creates appropriate MCP config file for Cursor, Claude Desktop, or generic MCP clients
 */

import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROJECT_ROOT = process.cwd();

/**
 * Detect IDE based on environment variables or CI context
 */
function detectIDE() {
    // Check CI environment
    if (process.env.CI) {
        // GitHub Actions
        if (process.env.GITHUB_ACTIONS) {
            // Default to Cursor for GitHub Actions (most common)
            return process.env.MCP_IDE || 'cursor';
        }
        // Other CI systems
        return process.env.MCP_IDE || 'cursor';
    }

    // Check for IDE-specific environment variables
    if (process.env.CURSOR) return 'cursor';
    if (process.env.CLAUDE_DESKTOP) return 'claude';
    if (process.env.VSCODE) return 'vscode';

    // Default to Cursor
    return process.env.MCP_IDE || 'cursor';
}

/**
 * Generate MCP config for Cursor (stdio transport)
 * Server automatically finds .rulebook by walking up directories
 */
function generateCursorConfig() {
    return {
        mcpServers: {
            rulebook: {
                command: 'npx',
                args: ['-y', '@hivellm/rulebook@latest', 'mcp-server'],
            },
        },
    };
}

/**
 * Generate MCP config for Claude Desktop (stdio transport)
 * Server automatically finds .rulebook by walking up directories
 */
function generateClaudeConfig() {
    return {
        mcpServers: {
            rulebook: {
                command: 'npx',
                args: ['-y', '@hivellm/rulebook@latest', 'mcp-server'],
            },
        },
    };
}

/**
 * Generate MCP config for generic MCP client (stdio transport)
 * Server automatically finds .rulebook by walking up directories
 */
function generateGenericConfig() {
    return {
        mcpServers: {
            rulebook: {
                command: 'npx',
                args: ['-y', '@hivellm/rulebook@latest', 'mcp-server'],
            },
        },
    };
}

/**
 * Generate MCP config based on IDE
 */
function generateMCPConfig(ide) {
    switch (ide) {
        case 'cursor':
            return generateCursorConfig();
        case 'claude':
        case 'claude-desktop':
            return generateClaudeConfig();
        default:
            return generateGenericConfig();
    }
}

/**
 * Get config file path based on IDE
 */
function getConfigPath(ide) {
    switch (ide) {
        case 'cursor':
            return join(PROJECT_ROOT, '.cursor', 'mcp.json');
        case 'claude':
        case 'claude-desktop':
            // Claude Desktop uses different paths on different OS
            // For CI, we'll create a generic config file
            return join(PROJECT_ROOT, 'claude_desktop_mcp.json');
        default:
            return join(PROJECT_ROOT, 'mcp.json');
    }
}

/**
 * Main function
 */
async function main() {
    const ide = detectIDE();
    const config = generateMCPConfig(ide);
    const configPath = getConfigPath(ide);

    console.log(`🔧 Detected IDE: ${ide}`);
    console.log(`📝 Creating MCP config at: ${configPath}`);

    // Ensure directory exists
    const configDir = dirname(configPath);
    if (!existsSync(configDir)) {
        await mkdir(configDir, { recursive: true });
    }

    // Write config file
    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');

    console.log(`✅ MCP configuration created successfully!`);
    console.log(`   IDE: ${ide}`);
    console.log(`   Path: ${configPath}`);
    console.log(`   Server: rulebook`);
    console.log(`   Transport: stdio (automatic)`);
    console.log(`   Command: npx -y @hivellm/rulebook@latest mcp-server`);
    console.log(`   Note: Server will find .rulebook automatically by walking up directories`);

    // Output config path for CI/CD
    if (process.env.CI) {
        console.log(`::set-output name=mcp_config_path::${configPath}`);
        console.log(`::set-output name=mcp_ide::${ide}`);
    }
}

main().catch((error) => {
    console.error('❌ Failed to setup MCP config:', error);
    process.exit(1);
});

