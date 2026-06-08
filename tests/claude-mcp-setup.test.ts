import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

import {
    isClaudeCodeInstalled,
    configureMcpJson,
    installClaudeCodeSkills,
    configureClaudeSettings,
    installAgentDefinitions,
    installWorkflowDefinitions,
    setupClaudeCodeIntegration,
} from '../src/core/claude/claude-mcp';

describe('claude-mcp', () => {
    let testDir: string;

    beforeEach(async () => {
        testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'rulebook-claude-mcp-'));
    });

    afterEach(async () => {
        await fs.rm(testDir, { recursive: true, force: true });
    });

    describe('isClaudeCodeInstalled', () => {
        it('should return true when ~/.claude directory exists', async () => {
            await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

            const result = await isClaudeCodeInstalled(testDir);
            expect(result).toBe(true);
        });

        it('should return false when ~/.claude directory does not exist', async () => {
            const result = await isClaudeCodeInstalled(testDir);
            expect(result).toBe(false);
        });
    });

    describe('configureMcpJson', () => {
        it('should create .mcp.json when it does not exist', async () => {
            await configureMcpJson(testDir);

            const mcpJsonPath = path.join(testDir, '.mcp.json');
            const content = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8'));

            expect(content.mcpServers).toBeDefined();
            expect(content.mcpServers.rulebook).toEqual({
                command: 'npx',
                args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
            });
        });

        it('should merge into existing .mcp.json without replacing other entries', async () => {
            const mcpJsonPath = path.join(testDir, '.mcp.json');
            const existingConfig = {
                mcpServers: {
                    'other-server': {
                        command: 'node',
                        args: ['other-server.js'],
                    },
                },
            };
            await fs.writeFile(mcpJsonPath, JSON.stringify(existingConfig, null, 2));

            await configureMcpJson(testDir);

            const content = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8'));

            // Should keep existing entry
            expect(content.mcpServers['other-server']).toEqual({
                command: 'node',
                args: ['other-server.js'],
            });

            // Should add rulebook entry without --project-root
            expect(content.mcpServers.rulebook).toEqual({
                command: 'npx',
                args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
            });
        });

        it('should upgrade existing rulebook entry with legacy --project-root', async () => {
            const mcpJsonPath = path.join(testDir, '.mcp.json');
            const existingConfig = {
                mcpServers: {
                    rulebook: {
                        command: 'npx',
                        args: [
                            '-y',
                            '@hivehub/rulebook@latest',
                            'mcp-server',
                            '--project-root',
                            testDir,
                        ],
                    },
                },
            };
            await fs.writeFile(mcpJsonPath, JSON.stringify(existingConfig, null, 2));

            const result = await configureMcpJson(testDir);

            expect(result).toBe(false);
            const content = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8'));
            // Args should now be simplified (no --project-root)
            expect(content.mcpServers.rulebook.args).toEqual([
                '-y',
                '@hivehub/rulebook@latest',
                'mcp-server',
            ]);
        });

        it('should not modify existing rulebook entry that already uses simplified args', async () => {
            const mcpJsonPath = path.join(testDir, '.mcp.json');
            const existingConfig = {
                mcpServers: {
                    rulebook: {
                        command: 'npx',
                        args: ['-y', '@hivehub/rulebook@latest', 'mcp-server'],
                    },
                },
            };
            await fs.writeFile(mcpJsonPath, JSON.stringify(existingConfig, null, 2));

            const result = await configureMcpJson(testDir);

            expect(result).toBe(false);
            const content = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8'));
            // Should remain unchanged
            expect(content.mcpServers.rulebook.args).toEqual([
                '-y',
                '@hivehub/rulebook@latest',
                'mcp-server',
            ]);
        });

        it('should handle .mcp.json with no mcpServers key', async () => {
            const mcpJsonPath = path.join(testDir, '.mcp.json');
            await fs.writeFile(mcpJsonPath, JSON.stringify({ version: 1 }, null, 2));

            await configureMcpJson(testDir);

            const content = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8'));
            expect(content.version).toBe(1);
            expect(content.mcpServers.rulebook).toBeDefined();
        });

        it('should handle invalid JSON in existing .mcp.json', async () => {
            const mcpJsonPath = path.join(testDir, '.mcp.json');
            await fs.writeFile(mcpJsonPath, '{ invalid json }');

            await configureMcpJson(testDir);

            const content = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8'));
            expect(content.mcpServers.rulebook).toBeDefined();
        });

        it('should return true on success', async () => {
            const result = await configureMcpJson(testDir);
            expect(result).toBe(true);
        });

        it('should be idempotent when called twice with the same projectRoot', async () => {
            const mcpJsonPath = path.join(testDir, '.mcp.json');

            // First call creates the entry
            const first = await configureMcpJson(testDir);
            expect(first).toBe(true);

            const contentAfterFirst = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8'));

            // Second call should not modify the file
            const second = await configureMcpJson(testDir);
            expect(second).toBe(false);

            const contentAfterSecond = JSON.parse(await fs.readFile(mcpJsonPath, 'utf8'));
            expect(contentAfterSecond).toEqual(contentAfterFirst);
        });
    });

    describe('installClaudeCodeSkills', () => {
        let templatesDir: string;
        let commandsSourceDir: string;

        beforeEach(async () => {
            templatesDir = path.join(testDir, 'templates');
            commandsSourceDir = path.join(templatesDir, 'commands');
            await fs.mkdir(commandsSourceDir, { recursive: true });
        });

        it('should copy skill templates to .claude/commands/', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            // Create sample skill templates
            await fs.writeFile(
                path.join(commandsSourceDir, 'rulebook-task-list.md'),
                '---\nname: /rulebook-task-list\n---\nList tasks'
            );
            await fs.writeFile(
                path.join(commandsSourceDir, 'rulebook-task-create.md'),
                '---\nname: /rulebook-task-create\n---\nCreate task'
            );

            const installed = await installClaudeCodeSkills(projectDir, templatesDir);

            expect(installed).toHaveLength(2);
            expect(installed).toContain('rulebook-task-list.md');
            expect(installed).toContain('rulebook-task-create.md');

            // Verify files were written
            const targetDir = path.join(projectDir, '.claude', 'commands');
            const listContent = await fs.readFile(
                path.join(targetDir, 'rulebook-task-list.md'),
                'utf8'
            );
            expect(listContent).toContain('List tasks');
        });

        it('should overwrite existing skills', async () => {
            const projectDir = path.join(testDir, 'project');
            const targetDir = path.join(projectDir, '.claude', 'commands');
            await fs.mkdir(targetDir, { recursive: true });

            // Write old skill
            await fs.writeFile(path.join(targetDir, 'rulebook-task-list.md'), 'OLD CONTENT');

            // Write new template
            await fs.writeFile(
                path.join(commandsSourceDir, 'rulebook-task-list.md'),
                'NEW CONTENT'
            );

            await installClaudeCodeSkills(projectDir, templatesDir);

            const content = await fs.readFile(
                path.join(targetDir, 'rulebook-task-list.md'),
                'utf8'
            );
            expect(content).toBe('NEW CONTENT');
        });

        it('should skip non-.md files', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            await fs.writeFile(path.join(commandsSourceDir, 'skill.md'), 'content');
            await fs.writeFile(path.join(commandsSourceDir, 'readme.txt'), 'ignore me');

            const installed = await installClaudeCodeSkills(projectDir, templatesDir);

            expect(installed).toHaveLength(1);
            expect(installed).toContain('skill.md');
        });

        it('should return empty array when commands source dir does not exist', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            const emptyTemplates = path.join(testDir, 'empty-templates');
            await fs.mkdir(emptyTemplates, { recursive: true });

            const installed = await installClaudeCodeSkills(projectDir, emptyTemplates);
            expect(installed).toHaveLength(0);
        });
    });

    describe('configureClaudeSettings', () => {
        it('should create settings.json with agent teams flag', async () => {
            const result = await configureClaudeSettings(testDir);

            expect(result).toBe(true);
            const settingsPath = path.join(testDir, '.claude', 'settings.json');
            const content = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
            expect(content.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
        });

        it('should preserve existing env vars in settings.json', async () => {
            const settingsPath = path.join(testDir, '.claude', 'settings.json');
            await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
            await fs.writeFile(
                settingsPath,
                JSON.stringify({ env: { MY_VAR: 'hello' }, otherKey: true }, null, 2)
            );

            await configureClaudeSettings(testDir);

            const content = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
            expect(content.env.MY_VAR).toBe('hello');
            expect(content.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
            expect(content.otherKey).toBe(true);
        });

        it('should be idempotent and return false when already configured', async () => {
            await configureClaudeSettings(testDir);
            const result = await configureClaudeSettings(testDir);

            expect(result).toBe(false);
        });

        it('should handle invalid JSON in existing settings.json', async () => {
            const settingsPath = path.join(testDir, '.claude', 'settings.json');
            await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });
            await fs.writeFile(settingsPath, '{ broken json }');

            const result = await configureClaudeSettings(testDir);

            expect(result).toBe(true);
            const content = JSON.parse(await fs.readFile(settingsPath, 'utf8'));
            expect(content.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');
        });
    });

    describe('installAgentDefinitions', () => {
        let templatesDir: string;
        let agentsSourceDir: string;

        beforeEach(async () => {
            templatesDir = path.join(testDir, 'templates');
            agentsSourceDir = path.join(templatesDir, 'agents');
            await fs.mkdir(agentsSourceDir, { recursive: true });
        });

        it('should copy agent templates to .claude/agents/', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            await fs.writeFile(
                path.join(agentsSourceDir, 'team-lead.md'),
                '---\nname: team-lead\n---\nYou are a team lead.'
            );
            await fs.writeFile(
                path.join(agentsSourceDir, 'implementer.md'),
                '---\nname: implementer\n---\nYou are an implementer.'
            );

            const installed = await installAgentDefinitions(projectDir, templatesDir);

            expect(installed).toHaveLength(2);
            expect(installed).toContain('team-lead.md');
            expect(installed).toContain('implementer.md');

            const targetDir = path.join(projectDir, '.claude', 'agents');
            const content = await fs.readFile(path.join(targetDir, 'team-lead.md'), 'utf8');
            expect(content).toContain('You are a team lead.');
        });

        it('should create .claude/agents/ directory even when no templates exist', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            const emptyTemplates = path.join(testDir, 'empty-templates');
            await fs.mkdir(emptyTemplates, { recursive: true });

            const installed = await installAgentDefinitions(projectDir, emptyTemplates);

            expect(installed).toHaveLength(0);
            // Directory should still be created
            const dirExists = await fs
                .access(path.join(projectDir, '.claude', 'agents'))
                .then(() => true)
                .catch(() => false);
            expect(dirExists).toBe(true);
        });

        it('should skip non-.md files', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            await fs.writeFile(path.join(agentsSourceDir, 'agent.md'), 'content');
            await fs.writeFile(path.join(agentsSourceDir, 'readme.txt'), 'ignore');

            const installed = await installAgentDefinitions(projectDir, templatesDir);

            expect(installed).toHaveLength(1);
            expect(installed).toContain('agent.md');
        });

        it('should substitute {{language}}/{{file_naming}}/{{test_framework}} from the project language', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            await fs.writeFile(
                path.join(agentsSourceDir, 'implementer.md'),
                '---\nname: implementer\ndescription: Writes production-quality {{language}} code.\n---\nFollow {{file_naming}} naming. Run {{test_framework}}.'
            );

            await installAgentDefinitions(projectDir, templatesDir, 'typescript');

            const content = await fs.readFile(
                path.join(projectDir, '.claude', 'agents', 'implementer.md'),
                'utf8'
            );
            expect(content).toContain('production-quality typescript code');
            expect(content).toContain('Follow kebab-case naming');
            expect(content).toContain('Run vitest');
            expect(content).not.toContain('{{language}}');
            expect(content).not.toContain('{{file_naming}}');
            expect(content).not.toContain('{{test_framework}}');
        });

        it('should fall back to TypeScript defaults when no language is given', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            await fs.writeFile(
                path.join(agentsSourceDir, 'implementer.md'),
                '---\nname: implementer\n---\nWrite {{language}} with {{file_naming}} files.'
            );

            await installAgentDefinitions(projectDir, templatesDir);

            const content = await fs.readFile(
                path.join(projectDir, '.claude', 'agents', 'implementer.md'),
                'utf8'
            );
            expect(content).not.toContain('{{language}}');
            expect(content).not.toContain('{{file_naming}}');
            expect(content).toContain('kebab-case files');
        });
    });

    describe('installWorkflowDefinitions', () => {
        let templatesDir: string;
        let workflowsSourceDir: string;

        beforeEach(async () => {
            templatesDir = path.join(testDir, 'templates');
            workflowsSourceDir = path.join(templatesDir, 'claude-workflows');
            await fs.mkdir(workflowsSourceDir, { recursive: true });

            await fs.writeFile(
                path.join(workflowsSourceDir, 'rulebook-driver.js'),
                'export const meta = { name: "rulebook-driver", description: "drive" }\n'
            );
            await fs.writeFile(
                path.join(workflowsSourceDir, 'review-fanout.js'),
                'export const meta = { name: "review-fanout", description: "review" }\n'
            );
        });

        it('should install workflow scripts to .claude/workflows/', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            const installed = await installWorkflowDefinitions(projectDir, templatesDir);

            expect(installed).toContain('rulebook-driver.js');
            expect(installed).toContain('review-fanout.js');

            const targetDir = path.join(projectDir, '.claude', 'workflows');
            const content = await fs.readFile(path.join(targetDir, 'rulebook-driver.js'), 'utf8');
            expect(content).toContain('rulebook-driver');
        });

        it('should return empty when templates/claude-workflows is missing', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            const emptyTemplates = path.join(testDir, 'empty-templates');
            await fs.mkdir(emptyTemplates, { recursive: true });

            const installed = await installWorkflowDefinitions(projectDir, emptyTemplates);

            expect(installed).toHaveLength(0);
        });

        it('should skip non-.js files', async () => {
            const projectDir = path.join(testDir, 'project');
            await fs.mkdir(projectDir, { recursive: true });

            await fs.writeFile(path.join(workflowsSourceDir, 'readme.md'), 'ignore');

            const installed = await installWorkflowDefinitions(projectDir, templatesDir);

            expect(installed).toContain('rulebook-driver.js');
            expect(installed).not.toContain('readme.md');
        });
    });

    describe('setupClaudeCodeIntegration', () => {
        let templatesDir: string;
        let commandsSourceDir: string;
        let projectDir: string;

        beforeEach(async () => {
            templatesDir = path.join(testDir, 'templates');
            commandsSourceDir = path.join(templatesDir, 'commands');
            projectDir = path.join(testDir, 'project');
            await fs.mkdir(commandsSourceDir, { recursive: true });
            await fs.mkdir(projectDir, { recursive: true });

            // Create a sample skill template
            await fs.writeFile(
                path.join(commandsSourceDir, 'rulebook-task-list.md'),
                '---\nname: /rulebook-task-list\n---\nList tasks'
            );
        });

        it('should configure MCP, skills, settings, and agents when Claude Code is detected', async () => {
            // Create .claude dir in testDir to simulate Claude Code installed
            await fs.mkdir(path.join(testDir, '.claude'), { recursive: true });

            // Create agent templates
            const agentsSourceDir = path.join(templatesDir, 'agents');
            await fs.mkdir(agentsSourceDir, { recursive: true });
            await fs.writeFile(
                path.join(agentsSourceDir, 'team-lead.md'),
                '---\nname: team-lead\n---\nLead agent'
            );

            const result = await setupClaudeCodeIntegration(projectDir, templatesDir, testDir);

            expect(result.detected).toBe(true);
            expect(result.mcpConfigured).toBe(true);
            expect(result.skillsInstalled).toContain('rulebook-task-list.md');
            expect(result.agentTeamsEnabled).toBe(true);
            expect(result.agentDefinitionsInstalled).toContain('team-lead.md');

            // Verify .mcp.json was created
            const mcpContent = JSON.parse(
                await fs.readFile(path.join(projectDir, '.mcp.json'), 'utf8')
            );
            expect(mcpContent.mcpServers.rulebook).toBeDefined();

            // Verify skill was installed
            const skillPath = path.join(projectDir, '.claude', 'commands', 'rulebook-task-list.md');
            const skillExists = await fs
                .access(skillPath)
                .then(() => true)
                .catch(() => false);
            expect(skillExists).toBe(true);

            // Verify settings.json was created with agent teams enabled
            const settingsContent = JSON.parse(
                await fs.readFile(path.join(projectDir, '.claude', 'settings.json'), 'utf8')
            );
            expect(settingsContent.env.CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS).toBe('1');

            // Verify agent definition was installed
            const agentPath = path.join(projectDir, '.claude', 'agents', 'team-lead.md');
            const agentExists = await fs
                .access(agentPath)
                .then(() => true)
                .catch(() => false);
            expect(agentExists).toBe(true);
        });

        it('should return not detected when Claude Code is not installed', async () => {
            // Do NOT create .claude dir in testDir

            const result = await setupClaudeCodeIntegration(projectDir, templatesDir, testDir);

            expect(result.detected).toBe(false);
            expect(result.mcpConfigured).toBe(false);
            expect(result.skillsInstalled).toHaveLength(0);
            expect(result.agentTeamsEnabled).toBe(false);
            expect(result.agentDefinitionsInstalled).toHaveLength(0);

            // Verify .mcp.json was NOT created
            const mcpExists = await fs
                .access(path.join(projectDir, '.mcp.json'))
                .then(() => true)
                .catch(() => false);
            expect(mcpExists).toBe(false);
        });

        it('should not fail when Claude Code is not installed', async () => {
            // Should not throw
            await expect(
                setupClaudeCodeIntegration(projectDir, templatesDir, testDir)
            ).resolves.toBeDefined();
        });
    });
});
