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
      }
    });

    // Initial data load
    this.sendDataToWebview();

    // Auto-refresh every 5 seconds
    const interval = setInterval(() => {
      if (this.view?.visible) {
        this.sendDataToWebview();
      }
    }, 5000);

    webviewView.onDidDispose(() => clearInterval(interval));
  }

  public refresh() {
    this.sendDataToWebview();
  }

  private sendDataToWebview() {
    if (!this.view) return;

    const tasks = this.client.listTasks();
    const agents = this.client.listAgents();
    const ralph = this.client.getRalphStatus();
    const memory = this.client.getMemoryStats();
    const indexer = this.client.getIndexerStatus();

    this.view.webview.postMessage({
      type: 'fullUpdate',
      data: { tasks, agents, ralph, memory, indexer },
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
      <button class="tab" data-tab="ralph">🔄 Ralph</button>
      <button class="tab" data-tab="memory">🧠 Memory</button>
      <button class="tab" data-tab="indexer">🔍 Indexer</button>
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

    <!-- Ralph Tab -->
    <div class="tab-content" id="tab-ralph">
      <div class="section-header">
        <h2>Ralph Autonomous Loop</h2>
      </div>
      <div id="ralph-status" class="status-card">
        <div class="loading">Loading Ralph status...</div>
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
