# Rulebook Dashboard — VSCode Extension

Visual dashboard for [Rulebook](https://github.com/hivellm/rulebook) inside VSCode. Monitor tasks, agents, Ralph autonomous loop, persistent memory, and the background indexer — all from a sidebar panel.

## Features

| Tab | What it shows |
|-----|---------------|
| 📋 **Tasks** | All project tasks with progress bars, status badges, expandable details |
| 🔄 **Ralph** | Autonomous loop status, current iteration, progress, pause/resume |
| 🧠 **Memory** | Memory stats (count, DB size, types), full-text search, clear/reprocess |
| 🔍 **Indexer** | Background indexer status, files processed, queue size, reindex button |

### Status Bar
- **Left**: `📖 Rulebook` button → opens dashboard
- **Right**: Indexer status indicator + Ralph running state

### Activity Bar
Custom Rulebook icon in the Activity Bar opens the dashboard panel.

## Getting Started

### Development

```bash
cd vscode-extension
npm install
npm run compile
```

Press **F5** to launch the Extension Development Host.

### Packaging

```bash
npx vsce package
```

This creates a `.vsix` file you can install locally:

```bash
code --install-extension rulebook-dashboard-0.1.0.vsix
```

## Requirements

- VSCode 1.85+
- A project with `.rulebook/` directory (auto-activates the extension)

## Architecture

```
vscode-extension/
├── src/
│   ├── extension.ts              # Entry point, activates providers & commands
│   ├── providers/
│   │   ├── dashboard-provider.ts # WebviewViewProvider for the sidebar panel
│   │   └── status-bar.ts         # Status bar indicators
│   └── services/
│       └── rulebook-client.ts    # Reads tasks, Ralph, memory, indexer from filesystem
├── media/
│   ├── dashboard.css             # VSCode-native themed styles
│   ├── dashboard.js              # Webview JavaScript controller
│   └── rulebook-icon.svg         # Activity Bar icon
└── dist/
    └── extension.js              # Bundled output (esbuild)
```

## Commands

| Command | Description |
|---------|-------------|
| `Rulebook: Open Dashboard` | Focus the dashboard sidebar |
| `Rulebook: Refresh Dashboard` | Force refresh all data |
| `Rulebook: Reindex Codebase` | Delete memory DB and trigger full reindex |
| `Rulebook: Clear Memory` | Clear all stored memories |

## License

Apache 2.0 — See [LICENSE](https://github.com/hivellm/rulebook/blob/main/LICENSE)
