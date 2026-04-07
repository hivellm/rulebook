import * as vscode from 'vscode';
import { RulebookClient } from '../services/rulebook-client';

export class StatusBarManager implements vscode.Disposable {
    private mainItem: vscode.StatusBarItem;
    private indexerItem: vscode.StatusBarItem;
    private contextItem: vscode.StatusBarItem;

    constructor() {
        // Main Rulebook button (left side)
        this.mainItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
        this.mainItem.command = 'rulebook.openDashboard';
        this.mainItem.text = '$(book) Rulebook';
        this.mainItem.tooltip = 'Open Rulebook Dashboard';
        this.mainItem.show();

        // Indexer status (right side)
        this.indexerItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 50);
        this.indexerItem.command = 'rulebook.openDashboard';
        this.indexerItem.show();

        // Context usage (right side)
        this.contextItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 48);
        this.contextItem.command = 'rulebook.openDashboard';
        this.contextItem.show();
    }

    refresh(client: RulebookClient) {
        try {
            // Indexer status
            const indexer = client.getIndexerStatus();
            if (indexer.running) {
                this.indexerItem.text = `$(database) Indexed`;
                this.indexerItem.tooltip = `Indexer: ${indexer.processed} files processed, ${indexer.queue} queued`;
                this.indexerItem.backgroundColor = undefined;
            } else {
                this.indexerItem.text = `$(circle-slash) No Index`;
                this.indexerItem.tooltip = 'Background Indexer: Not active';
                this.indexerItem.backgroundColor = undefined;
            }

            // Context usage
            const ctx = client.getContextUsage();
            const filled = Math.floor(ctx.pct / 10);
            const bar = '\u2588'.repeat(filled) + '\u2591'.repeat(10 - filled);
            const colorName = ctx.pct >= 90 ? 'Red' : ctx.pct >= 75 ? 'Yellow' : 'Green';
            this.contextItem.text = `ctx ${ctx.pct}% ${bar}`;
            this.contextItem.tooltip = `Claude context usage: ${ctx.pct}% (${ctx.transcriptBytes} bytes)`;
            this.contextItem.color = new vscode.ThemeColor(`terminal.ansi${colorName}`);
        } catch {
            // Silently ignore errors in status bar updates
        }
    }

    dispose() {
        this.mainItem.dispose();
        this.indexerItem.dispose();
        this.contextItem.dispose();
    }
}
