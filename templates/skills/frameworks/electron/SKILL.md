---
name: "Electron"
description: "Language: TypeScript, JavaScript"
version: "1.0.0"
category: "frameworks"
author: "Rulebook"
tags: ["frameworks", "framework"]
dependencies: []
conflicts: []
---
<!-- ELECTRON:START -->
# Electron Framework Rules

**Language**: TypeScript, JavaScript  
**Version**: Electron 28+

## Setup & Configuration

```typescript
// main.ts (Main Process)
import { app, BrowserWindow } from 'electron'
import path from 'path'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)
```

## Quality Gates

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Tests
npm test

# Build
npm run build              # Compile TypeScript
npm run package            # Package app
npm run make               # Create distributables
```

## Best Practices

✅ **DO:**
- Use contextIsolation: true
- Disable nodeIntegration
- Use preload scripts for IPC
- Implement auto-updates (electron-updater)
- Sign and notarize apps (production)
- Use Content Security Policy
- Implement proper error handling
- Separate main and renderer processes

❌ **DON'T:**
- Enable nodeIntegration in renderer
- Skip contextIsolation
- Use remote module (deprecated)
- Ignore security warnings
- Skip code signing
- Load remote content without CSP
- Use synchronous IPC
- Hardcode credentials

## Project Structure

```
src/
├── main/
│   ├── main.ts           # Main process
│   ├── preload.ts        # Preload script
│   └── ipc/              # IPC handlers
├── renderer/
│   ├── index.html
│   ├── renderer.ts
│   └── components/
└── shared/
    └── types.ts
```

## IPC Communication

```typescript
// preload.ts
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  sendMessage: (message: string) => ipcRenderer.send('message', message),
  onReply: (callback: (reply: string) => void) => 
    ipcRenderer.on('reply', (_event, reply) => callback(reply)),
})

// main.ts
import { ipcMain } from 'electron'

ipcMain.on('message', (event, message) => {
  console.log(message)
  event.reply('reply', 'Message received')
})

// renderer.ts
declare global {
  interface Window {
    electronAPI: {
      sendMessage: (message: string) => void
      onReply: (callback: (reply: string) => void) => void
    }
  }
}

window.electronAPI.sendMessage('Hello from renderer')
window.electronAPI.onReply((reply) => console.log(reply))
```

## Security Checklist

```typescript
// ✅ Good security configuration
const win = new BrowserWindow({
  webPreferences: {
    contextIsolation: true,        // ✅ MUST enable
    nodeIntegration: false,        // ✅ MUST disable
    sandbox: true,                 // ✅ Enable sandbox
    webSecurity: true,            // ✅ Enable web security
    allowRunningInsecureContent: false,  // ✅ Block insecure content
  },
})

// Content Security Policy
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
  callback({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': ["default-src 'self'"]
    }
  })
})
```

<!-- ELECTRON:END -->

