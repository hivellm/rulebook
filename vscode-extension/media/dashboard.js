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
        renderMemoryStats(message.data.memory);
        renderIndexer(message.data.indexer);
        renderAnalyses(message.data.analyses);
        renderDoctor(message.data.doctor);
        renderTelemetry(message.data.telemetry);
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

  // ---- Render: Analyses ----
  function renderAnalyses(analyses) {
    const container = document.getElementById('analysis-list');
    if (!container) return;
    if (!analyses || analyses.length === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📊</div><p>No analyses yet.<br>Run <code>/analysis &lt;topic&gt;</code></p></div>`;
      return;
    }
    container.innerHTML = analyses.map(a => `
      <div class="card">
        <div class="card-header">
          <span class="card-title">${escapeHtml(a.slug)}</span>
          <span class="card-meta">${a.createdAt ? a.createdAt.split('T')[0] : ''}</span>
        </div>
        <div class="card-meta">${escapeHtml(a.topic)}</div>
      </div>
    `).join('');
  }

  // ---- Render: Doctor ----
  function renderDoctor(doctor) {
    const container = document.getElementById('doctor-checks');
    if (!container) return;
    if (!doctor || !doctor.checks) {
      container.innerHTML = '<div class="loading">Run doctor to see results</div>';
      return;
    }
    container.innerHTML = `
      <div class="stat-box"><div class="stat-number">${doctor.passCount}</div><div class="stat-label">Pass</div></div>
      <div class="stat-box"><div class="stat-number">${doctor.warnCount}</div><div class="stat-label">Warn</div></div>
      <div class="stat-box"><div class="stat-number">${doctor.failCount}</div><div class="stat-label">Fail</div></div>
    ` + '<div class="card-list" style="margin-top:12px">' + doctor.checks.map(c => {
      const icon = c.status === 'pass' ? '✅' : c.status === 'warn' ? '⚠️' : '❌';
      return `<div class="memory-item"><div class="memory-item-title">${icon} ${escapeHtml(c.name)}</div><div class="memory-item-meta">${escapeHtml(c.message)}</div></div>`;
    }).join('') + '</div>';
  }

  // ---- Render: Telemetry ----
  function renderTelemetry(telemetry) {
    const container = document.getElementById('telemetry-stats');
    if (!container) return;
    if (!telemetry || telemetry.totalCalls === 0) {
      container.innerHTML = `<div class="empty-state"><div class="icon">📈</div><p>No telemetry data.<br>Enable with <code>rulebook mcp init --telemetry</code></p></div>`;
      return;
    }
    const tools = Object.entries(telemetry.tools).sort((a, b) => b[1].calls - a[1].calls);
    container.innerHTML = `
      <div class="stat-box"><div class="stat-number">${telemetry.totalCalls}</div><div class="stat-label">Total Calls</div></div>
    ` + '<div class="card-list" style="margin-top:12px">' + tools.map(([name, t]) =>
      `<div class="memory-item"><div class="memory-item-title">${escapeHtml(name)}</div><div class="memory-item-meta">${t.calls} calls · avg ${t.avgLatencyMs}ms · ${(t.errorRate * 100).toFixed(1)}% errors</div></div>`
    ).join('') + '</div>';
  }

  // ---- Create Analysis Button ----
  document.getElementById('createAnalysisBtn')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'createAnalysis' });
  });

  // ---- Run Doctor Button ----
  document.getElementById('runDoctorBtn')?.addEventListener('click', () => {
    vscode.postMessage({ command: 'runDoctor' });
  });

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
