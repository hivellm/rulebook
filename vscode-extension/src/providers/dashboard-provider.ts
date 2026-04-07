import * as vscode from 'vscode';
import { RulebookClient } from '../services/rulebook-client';

export class DashboardProvider implements vscode.WebviewViewProvider {
  private view?: vscode.WebviewView;

  constructor(
    private readonly extensionUri: vscode.Uri,
    private readonly client: RulebookClient,
    private readonly workspaceRoot: string
  ) { }

  resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this.view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this.extensionUri],
    };

    webviewView.webview.html = this.getHtmlContent(webviewView.webview);

    // Handle messages from the webview
    webviewView.webview.onDidReceiveMessage(async (message) => {
      switch (message.command) {
        case 'refresh':
          this.sendDataToWebview();
          break;
        case 'getTasks':
          this.sendDataToWebview();
          break;
        case 'getTaskDetails': {
          const details = this.client.getTaskDetails(message.taskId);
          webviewView.webview.postMessage({ type: 'taskDetails', data: details, taskId: message.taskId });
          break;
        }
        case 'searchMemory': {
          const results = this.client.searchMemory(message.query);
          webviewView.webview.postMessage({ type: 'memoryResults', data: results });
          break;
        }
        case 'reindex':
          await this.client.reindexCodebase();
          vscode.window.showInformationMessage('Rulebook: Reindex triggered');
          this.sendDataToWebview();
          break;
        case 'clearMemory':
          await this.client.clearMemory();
          vscode.window.showInformationMessage('Rulebook: Memory cleared');
          this.sendDataToWebview();
          break;
        case 'archiveTask': {
          const confirm = await vscode.window.showWarningMessage(
            `Archive task "${message.taskId}"?`, { modal: true }, 'Archive'
          );
          if (confirm === 'Archive') {
            const ok = this.client.archiveTask(message.taskId);
            vscode.window.showInformationMessage(
              ok ? `Task "${message.taskId}" archived` : `Failed to archive task`
            );
            this.sendDataToWebview();
          }
          break;
        }
        case 'updateTask': {
          const taskId = message.taskId;
          const terminal = vscode.window.createTerminal({
            name: `Rulebook: Update ${taskId}`,
            cwd: this.workspaceRoot,
          });
          terminal.show();
          terminal.sendText(
            `claude "Read the task at .rulebook/tasks/${taskId}/tasks.md. Review the current codebase state and update the tasks.md checklist to reflect what has actually been completed, what is in progress, and what remains. Mark completed items with [x], in-progress with [/], and pending with [ ]. Be thorough."`
          );
          break;
        }
        case 'stopAgent': {
          const { teamName, memberName } = message;
          const confirm = await vscode.window.showWarningMessage(
            `Stop agent "${memberName}" in team "${teamName}"?`,
            { modal: true },
            'Stop'
          );
          if (confirm === 'Stop') {
            // Write a stop-request sentinel file that the team task system checks
            const { writeFileSync, mkdirSync } = await import('fs');
            const { homedir } = await import('os');
            const { join } = await import('path');
            try {
              const stopDir = join(homedir(), '.claude', 'teams', teamName, 'stop-requests');
              mkdirSync(stopDir, { recursive: true });
              writeFileSync(
                join(stopDir, `${memberName}.json`),
                JSON.stringify({ requestedAt: Date.now(), member: memberName }),
                'utf-8'
              );
              vscode.window.showInformationMessage(`Stop request sent to "${memberName}"`);
            } catch (e) {
              vscode.window.showErrorMessage(`Failed to send stop request: ${e}`);
            }
            this.sendDataToWebview();
          }
          break;
        }
        case 'runDoctor':
          this.sendDataToWebview();
          vscode.window.showInformationMessage('Rulebook: Doctor checks refreshed');
          break;
        case 'createAnalysis': {
          const topic = await vscode.window.showInputBox({ prompt: 'Analysis topic', placeHolder: 'e.g. perf-startup' });
          if (!topic) break;
          const { execSync } = await import('child_process');
          try {
            execSync(`npx --no-install rulebook analysis create "${topic.replace(/"/g, '\\"')}"`, {
              cwd: this.workspaceRoot,
              timeout: 15000,
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            this.sendDataToWebview();
            vscode.window.showInformationMessage(`Analysis "${topic}" created`);
          } catch {
            vscode.window.showErrorMessage('Failed to create analysis');
          }
          break;
        }
        case 'triggerHandoff': {
          const terminal = vscode.window.terminals.find(
            t => t.name.includes('Claude') || t.name.includes('claude')
          );
          if (terminal) {
            terminal.sendText('/handoff');
            vscode.window.showInformationMessage('Handoff triggered');
          } else {
            vscode.window.showWarningMessage('No Claude Code terminal found');
          }
          break;
        }
      }
    });

    // Initial data load
    this.sendDataToWebview();

    // Auto-refresh every 3 seconds
    const interval = setInterval(() => {
      if (this.view?.visible) {
        this.sendDataToWebview();
      }
    }, 3000);

    webviewView.onDidDispose(() => clearInterval(interval));
  }

  public refresh() {
    this.sendDataToWebview();
  }

  private sendDataToWebview() {
    if (!this.view) return;

    const tasks = this.client.listTasks();
    const agents = this.client.listAgents();
    const memory = this.client.getMemoryStats();
    const indexer = this.client.getIndexerStatus();
    const analyses = this.client.listAnalyses();
    const doctor = this.client.runDoctor();
    const contextUsage = this.client.getContextUsage();
    const telemetry = this.client.getTelemetryStats();

    this.view.webview.postMessage({
      type: 'fullUpdate',
      data: { tasks, agents, memory, indexer, analyses, doctor, contextUsage, telemetry },
    });
  }

  private getHtmlContent(webview: vscode.Webview): string {
    const stylesUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'dashboard.css')
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this.extensionUri, 'media', 'dashboard.js')
    );
    const nonce = getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
  <link href="${stylesUri}" rel="stylesheet">
  <title>Rulebook Dashboard</title>
</head>
<body>
  <div class="dashboard">
    <!-- Header -->
    <div class="header">
      <h1>📘 Rulebook</h1>
      <button class="icon-btn" id="refreshBtn" title="Refresh">⟳</button>
    </div>

    <!-- Tab Bar -->
    <div class="tab-bar">
      <button class="tab active" data-tab="agents">🤖 Agents</button>
      <button class="tab" data-tab="tasks">📋 Tasks</button>
      <button class="tab" data-tab="memory">🧠 Memory</button>
      <button class="tab" data-tab="indexer">🔍 Indexer</button>
      <button class="tab" data-tab="analysis">📊 Analysis</button>
      <button class="tab" data-tab="doctor">🩺 Doctor</button>
      <button class="tab" data-tab="telemetry">📈 Telemetry</button>
    </div>

    <!-- Agents Tab -->
    <div class="tab-content active" id="tab-agents">
      <div class="section-header">
        <h2>Agent Teams</h2>
      </div>
      <div id="agents-list" class="card-list">
        <div class="loading">Loading agents...</div>
      </div>
    </div>

    <!-- Tasks Tab -->
    <div class="tab-content" id="tab-tasks">
      <div class="section-header">
        <h2>Project Tasks</h2>
      </div>
      <div id="tasks-list" class="card-list">
        <div class="loading">Loading tasks...</div>
      </div>
    </div>

    <!-- Memory Tab -->
    <div class="tab-content" id="tab-memory">
      <div class="section-header">
        <h2>Memory Store</h2>
      </div>
      <div class="search-bar">
        <input type="text" id="memory-search-input" placeholder="Search memories..." />
        <button id="memory-search-btn" class="btn-sm">Search</button>
      </div>
      <div id="memory-stats" class="stats-grid"></div>
      <div id="memory-results" class="card-list"></div>
      <div class="action-bar">
        <button id="clearMemoryBtn" class="btn-danger">🗑 Clear Memory</button>
      </div>
    </div>

    <!-- Indexer Tab -->
    <div class="tab-content" id="tab-indexer">
      <div class="section-header">
        <h2>Background Indexer</h2>
      </div>
      <div id="indexer-status" class="status-card">
        <div class="loading">Loading indexer status...</div>
      </div>
      <div class="action-bar">
        <button id="reindexBtn" class="btn-primary">🔄 Reindex Codebase</button>
      </div>
    </div>

    <!-- Analysis Tab -->
    <div class="tab-content" id="tab-analysis">
      <div class="section-header">
        <h2>Analysis</h2>
      </div>
      <div id="analysis-list" class="card-list">
        <div class="loading">Loading analyses...</div>
      </div>
      <div class="action-bar">
        <button id="createAnalysisBtn" class="btn-primary">+ Create Analysis</button>
      </div>
    </div>

    <!-- Doctor Tab -->
    <div class="tab-content" id="tab-doctor">
      <div class="section-header">
        <h2>Doctor</h2>
      </div>
      <div id="doctor-checks">
        <div class="loading">Run doctor to see results</div>
      </div>
      <div class="action-bar">
        <button id="runDoctorBtn" class="btn-primary">Run Doctor</button>
      </div>
    </div>

    <!-- Telemetry Tab -->
    <div class="tab-content" id="tab-telemetry">
      <div class="section-header">
        <h2>Telemetry</h2>
      </div>
      <div id="telemetry-stats">
        <div class="loading">Loading telemetry...</div>
      </div>
    </div>
  </div>

  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
