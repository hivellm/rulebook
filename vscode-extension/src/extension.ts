import * as vscode from 'vscode';
import { DashboardProvider } from './providers/dashboard-provider';
import { StatusBarManager } from './providers/status-bar';
import { RulebookClient } from './services/rulebook-client';

let statusBar: StatusBarManager;
let refreshInterval: NodeJS.Timeout | undefined;

export function activate(context: vscode.ExtensionContext) {
    const folders = vscode.workspace.workspaceFolders;
    if (!folders || folders.length === 0) {
        vscode.window.showWarningMessage('Rulebook: No workspace folder found');
        return;
    }

    const allRoots = folders.map(f => f.uri.fsPath);
    const client = new RulebookClient(allRoots);
    const dashboardProvider = new DashboardProvider(context.extensionUri, client, allRoots[0]);

    // Register the Webview View Provider
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('rulebook.dashboardView', dashboardProvider, {
            webviewOptions: { retainContextWhenHidden: true },
        })
    );

    // Status Bar
    statusBar = new StatusBarManager();
    context.subscriptions.push(statusBar);

    // Commands
    context.subscriptions.push(
        vscode.commands.registerCommand('rulebook.openDashboard', () => {
            vscode.commands.executeCommand('rulebook.dashboardView.focus');
        }),
        vscode.commands.registerCommand('rulebook.refreshDashboard', () => {
            dashboardProvider.refresh();
            statusBar.refresh(client);
        }),
        vscode.commands.registerCommand('rulebook.reindexCodebase', async () => {
            const result = await client.reindexCodebase();
            vscode.window.showInformationMessage(result ? 'Rulebook: Reindex started' : 'Rulebook: Reindex failed');
            dashboardProvider.refresh();
        }),
        vscode.commands.registerCommand('rulebook.clearMemory', async () => {
            const confirm = await vscode.window.showWarningMessage(
                'Clear all Rulebook memories? This cannot be undone.',
                { modal: true },
                'Clear'
            );
            if (confirm === 'Clear') {
                await client.clearMemory();
                dashboardProvider.refresh();
            }
        }),
        vscode.commands.registerCommand('rulebook.runDoctor', () => {
            dashboardProvider.refresh();
            vscode.window.showInformationMessage('Rulebook: Doctor checks refreshed');
        }),
        vscode.commands.registerCommand('rulebook.createAnalysis', async () => {
            const topic = await vscode.window.showInputBox({
                prompt: 'Analysis topic',
                placeHolder: 'e.g. perf-startup',
            });
            if (!topic) return;
            const { execSync } = await import('child_process');
            try {
                execSync(`npx --no-install rulebook analysis create "${topic.replace(/"/g, '\\"')}"`, {
                    cwd: client.primaryRoot,
                    timeout: 15000,
                    stdio: ['pipe', 'pipe', 'pipe'],
                });
                dashboardProvider.refresh();
                vscode.window.showInformationMessage(`Analysis "${topic}" created`);
            } catch {
                vscode.window.showErrorMessage('Failed to create analysis');
            }
        }),
        vscode.commands.registerCommand('rulebook.triggerHandoff', () => {
            const terminal = vscode.window.terminals.find(
                t => t.name.includes('Claude') || t.name.includes('claude')
            );
            if (terminal) {
                terminal.sendText('/handoff');
                vscode.window.showInformationMessage('Handoff triggered');
            } else {
                vscode.window.showWarningMessage('No Claude Code terminal found');
            }
        })
    );

    // Periodic refresh every 3 seconds
    refreshInterval = setInterval(() => {
        statusBar.refresh(client);
    }, 3000);

    // Initial refresh
    statusBar.refresh(client);

    console.log('[Rulebook Extension] Activated');
}

export function deactivate() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
}
