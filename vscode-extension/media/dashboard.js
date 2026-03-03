// @ts-nocheck
/**
 * Rulebook Dashboard — Webview JavaScript Controller
 * Handles tab switching, data rendering, and postMessage bridge to extension host
 */

(function () {
  // @ts-ignore
  const vscode = acquireVsCodeApi();

  // ---- Tab Switching ----
  document.querySelectorAll('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach((c) => c.classList.remove('active'));
      tab.classList.add('active');
      const target = tab.getAttribute('data-tab');
      document.getElementById('tab-' + target)?.classList.add('active');
    });
  });

  // ---- Refresh Button ----
  document.getElementById('refreshBtn')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'refresh' });
  });

  // ---- Memory Search ----
  document.getElementById('memory-search-btn')?.addEventListener('click', () => {
    const input = document.getElementById('memory-search-input');
    const query = input?.value?.trim();
    if (query) {
      vscode.postMessage({ command: 'searchMemory', query });
    }
  });

  document.getElementById('memory-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      document.getElementById('memory-search-btn')?.click();
    }
  });

  // ---- Reindex Button ----
  document.getElementById('reindexBtn')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'reindex' });
  });

  // ---- Clear Memory Button ----
  document.getElementById('clearMemoryBtn')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'clearMemory' });
  });

  // ---- Message Handler ----
  window.addEventListener('message', (event) => {
    const message = event.data;

    switch (message.type) {
      case 'fullUpdate':
        renderAgents(message.data.agents);
        renderTasks(message.data.tasks);
        renderRalph(message.data.ralph);
        renderMemoryStats(message.data.memory);
        renderIndexer(message.data.indexer);
        break;
      case 'taskDetails':
        showTaskDetails(message.taskId, message.data);
        break;
      case 'memoryResults':
        renderMemoryResults(message.data);
        break;
    }
  });

  // ---- Render: Agents (Teams) ----
  function renderAgents(teams) {
    const container = document.getElementById('agents-list');
    if (!container) return;

    if (!teams || teams.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">🤖</div>
          <p>No active teams.<br>Start a team with the Agent SDK.</p>
        </div>`;
      return;
    }

    const statusIcon = { in_progress: '⚡', pending: '○', completed: '✓', blocked: '✗' };
    const statusBadge = { in_progress: 'badge-running', pending: 'badge-idle', completed: 'badge-completed', blocked: 'badge-active' };

    container.innerHTML = teams.map(team => {
      const activeMembers = team.members.filter(m => m.taskStatus === 'in_progress').length;

      const rows = team.members.map(m => {
        const isActive = m.taskStatus === 'in_progress';
        const timeAgo = m.lastActivityAt ? formatTimeAgo(new Date(m.lastActivityAt).getTime()) : null;
        const toolInfo = m.toolCallCount > 0 ? `${m.toolCallCount} tool calls` : null;

        return `
          <div class="member-card ${isActive ? 'member-active' : ''}">
            <div class="member-header">
              <div class="member-header-left">
                <span class="member-name">${escapeHtml(m.name)}</span>
                <span class="member-type">${escapeHtml(m.agentType || '')}</span>
              </div>
              <div class="member-header-right">
                ${m.taskStatus
                  ? `<span class="badge ${statusBadge[m.taskStatus] || 'badge-idle'} badge-xs">${statusIcon[m.taskStatus] || '?'} ${m.taskStatus.replace('_', ' ')}</span>`
                  : '<span class="badge badge-idle badge-xs">idle</span>'
                }
                ${isActive ? `<button class="btn-stop" onclick="stopAgent('${escapeHtml(team.teamName)}','${escapeHtml(m.name)}')" title="Send stop request to ${escapeHtml(m.name)}">■ Stop</button>` : ''}
              </div>
            </div>
            ${m.currentTask ? `<div class="member-task">📋 ${escapeHtml(m.currentTask)}</div>` : ''}
            ${m.lastActivity ? `
              <div class="member-activity">
                <div class="activity-text">${escapeHtml(m.lastActivity)}</div>
                <div class="activity-meta">
                  ${timeAgo ? `<span>${timeAgo}</span>` : ''}
                  ${toolInfo ? `<span>· ${toolInfo}</span>` : ''}
                </div>
              </div>` : (isActive ? '<div class="activity-waiting">⏳ Starting up…</div>' : '')
            }
          </div>`;
      }).join('');

      return `
        <div class="card team-card">
          <div class="card-header">
            <span class="card-title">🤝 ${escapeHtml(team.teamName)}</span>
            <span class="badge ${activeMembers > 0 ? 'badge-running' : 'badge-idle'}">
              ${activeMembers > 0 ? '● ' + activeMembers + ' active' : '○ idle'}
            </span>
          </div>
          <div class="member-list">${rows}</div>
        </div>`;
    }).join('');
  }

  window.stopAgent = function(teamName, memberName) {
    vscode.postMessage({ command: 'stopAgent', teamName, memberName });
  };

  // ---- Render: Tasks ----
  function renderTasks(tasks) {
    const container = document.getElementById('tasks-list');
    if (!container) return;

    if (!tasks || tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="icon">📋</div>
          <p>No tasks found.<br>Create one with <code>rulebook task create</code></p>
        </div>`;
      return;
    }

    container.innerHTML = tasks
      .map(
        (task) => `
      <div class="card" data-task-id="${task.id}">
        <div class="card-header" onclick="toggleTaskDetails('${task.id}')">
          <span class="card-title">${escapeHtml(task.id)}</span>
          <span class="badge ${task.status === 'completed' ? 'badge-completed' : 'badge-active'}">
            ${task.status}
          </span>
        </div>
        <div class="card-meta">${task.completedCount}/${task.taskCount} items done</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${task.taskCount > 0 ? (task.completedCount / task.taskCount) * 100 : 0}%"></div>
        </div>
        <div class="task-actions">
          <button class="btn-action btn-update" onclick="event.stopPropagation(); updateTask('${task.id}')">🤖 Update via AI</button>
          <button class="btn-action btn-archive" onclick="event.stopPropagation(); archiveTask('${task.id}')">📦 Archive</button>
        </div>
        <div class="task-details" id="details-${task.id}"></div>
      </div>`
      )
      .join('');
  }

  // ---- Render: Ralph ----
  function renderRalph(ralph) {
    const container = document.getElementById('ralph-status');
    if (!container) return;

    const progress =
      ralph.totalTasks > 0 ? ((ralph.completedTasks / ralph.totalTasks) * 100).toFixed(0) : 0;

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
        <span class="badge ${ralph.running ? 'badge-running' : 'badge-idle'}">
          ${ralph.running ? '● Running' : '○ Idle'}
        </span>
        ${ralph.currentTask ? `<span class="card-meta">Task: ${escapeHtml(ralph.currentTask)}</span>` : ''}
      </div>
      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Iteration</span>
          <span class="status-value ${ralph.running ? 'highlight' : ''}">${ralph.iteration}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Progress</span>
          <span class="status-value">${ralph.completedTasks}/${ralph.totalTasks}</span>
        </div>
      </div>
      ${ralph.totalTasks > 0
        ? `<div class="progress-bar" style="margin-top: 12px;">
               <div class="progress-fill" style="width: ${progress}%"></div>
             </div>`
        : ''
      }
    `;
  }

  // ---- Render: Memory Stats ----
  function renderMemoryStats(memory) {
    const container = document.getElementById('memory-stats');
    if (!container) return;

    const sizeStr = formatBytes(memory.dbSizeBytes);

    container.innerHTML = `
      <div class="stat-box">
        <div class="stat-number">${memory.totalMemories}</div>
        <div class="stat-label">Memories</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${sizeStr}</div>
        <div class="stat-label">DB Size</div>
      </div>
      <div class="stat-box">
        <div class="stat-number">${Object.keys(memory.types).length}</div>
        <div class="stat-label">Types</div>
      </div>
    `;
  }

  // ---- Render: Memory Search Results ----
  function renderMemoryResults(results) {
    const container = document.getElementById('memory-results');
    if (!container) return;

    if (!results || results.length === 0) {
      container.innerHTML = `<div class="empty-state"><p>No results found</p></div>`;
      return;
    }

    container.innerHTML = results
      .map(
        (r) => `
      <div class="memory-item">
        <div class="memory-item-title">${escapeHtml(r.title || r.id)}</div>
        <div class="memory-item-meta">${r.type} · score: ${r.score?.toFixed(3) || 'N/A'}</div>
      </div>`
      )
      .join('');
  }

  // ---- Render: Indexer ----
  function renderIndexer(indexer) {
    const container = document.getElementById('indexer-status');
    if (!container) return;

    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 14px;">
        <span class="badge ${indexer.running ? 'badge-completed' : 'badge-idle'}">
          ${indexer.running ? '● Active' : '○ Inactive'}
        </span>
      </div>
      <div class="status-grid">
        <div class="status-item">
          <span class="status-label">Files Processed</span>
          <span class="status-value">${indexer.processed}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Queue</span>
          <span class="status-value">${indexer.queue}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Errors</span>
          <span class="status-value">${indexer.errors}</span>
        </div>
        <div class="status-item">
          <span class="status-label">Status</span>
          <span class="status-value" style="font-size: 14px">${indexer.running ? 'DB Available' : 'No DB'}</span>
        </div>
      </div>
    `;
  }

  // ---- Toggle Task Details ----
  window.toggleTaskDetails = function (taskId) {
    const details = document.getElementById('details-' + taskId);
    if (!details) return;

    if (details.classList.contains('open')) {
      details.classList.remove('open');
    } else {
      if (!details.innerHTML) {
        details.innerHTML = '<div class="loading">Loading...</div>';
        vscode.postMessage({ command: 'getTaskDetails', taskId });
      }
      details.classList.add('open');
    }
  };

  window.archiveTask = function (taskId) {
    vscode.postMessage({ command: 'archiveTask', taskId });
  };

  window.updateTask = function (taskId) {
    vscode.postMessage({ command: 'updateTask', taskId });
  };

  function showTaskDetails(taskId, content) {
    const details = document.getElementById('details-' + taskId);
    if (!details) return;
    details.innerHTML = content ? escapeHtml(content) : '<em>No details available</em>';
    details.classList.add('open');
  }

  // ---- Helpers ----
  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  function formatTimeAgo(epochMs) {
    const diff = Date.now() - epochMs;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    return days + 'd ago';
  }

  // ---- Initial Load ----
  vscode.postMessage({ command: 'refresh' });
})();
