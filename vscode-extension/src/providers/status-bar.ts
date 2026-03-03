import * as vscode from 'vscode';
import { RulebookClient } from '../services/rulebook-client';

export class StatusBarManager implements vscode.Disposable {
    private mainItem: vscode.StatusBarItem;
    private indexerItem: vscode.StatusBarItem;
    private ralphItem: vscode.StatusBarItem;

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

        // Ralph status (right side)
        this.ralphItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 49);
        this.ralphItem.command = 'rulebook.openDashboard';
        this.ralphItem.show();
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

            // Ralph status
            const ralph = client.getRalphStatus();
            if (ralph.running) {
                this.ralphItem.text = `$(sync~spin) Ralph: ${ralph.iteration}`;
                this.ralphItem.tooltip = `Ralph running — Task: ${ralph.currentTask}, Iteration: ${ralph.iteration}`;
                this.ralphItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
            } else {
                this.ralphItem.text = `$(check) Ralph`;
                this.ralphItem.tooltip = `Ralph idle — ${ralph.completedTasks}/${ralph.totalTasks} tasks done`;
                this.ralphItem.backgroundColor = undefined;
            }
        } catch {
            // Silently ignore errors in status bar updates
        }
    }

    dispose() {
        this.mainItem.dispose();
        this.indexerItem.dispose();
        this.ralphItem.dispose();
    }
}
