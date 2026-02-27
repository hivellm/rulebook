---
name: "Playwright"
description: "Use MCP Playwright for automated browser testing and web automation."
version: "1.0.0"
category: "modules"
author: "Rulebook"
tags: ["modules", "mcp"]
dependencies: []
conflicts: []
---
<!-- PLAYWRIGHT:START -->
# Playwright MCP Instructions

**CRITICAL**: Use MCP Playwright for automated browser testing and web automation.

## Core Operations

### Navigation & Screenshots
```typescript
await playwright.navigate({ url: "https://example.com" });
await playwright.takeScreenshot({ fullPage: true, filename: "page.png" });
```

### Interaction
```typescript
// Click
await playwright.click({ element: "Submit Button", ref: "button[type='submit']" });

// Type
await playwright.type({ element: "Search", ref: "#search", text: "query" });

// Fill form
await playwright.fillForm({
  fields: [
    { name: "Email", type: "textbox", ref: "#email", value: "user@example.com" },
    { name: "Password", type: "textbox", ref: "#password", value: "secret" }
  ]
});
```

### DOM & Monitoring
```typescript
// Get accessibility tree
const snapshot = await playwright.snapshot();

// Console errors
const errors = await playwright.getConsoleMessages({ onlyErrors: true });

// Network requests
const requests = await playwright.getNetworkRequests();
```

## Common Patterns

### Login Flow
```typescript
1. navigate to login page
2. fillForm with credentials
3. click submit button
4. waitFor dashboard text
5. verify success via snapshot
```

### Error Detection
```typescript
const errors = await playwright.getConsoleMessages({ onlyErrors: true });
if (errors.length > 0) {
  await playwright.takeScreenshot({ filename: "error-state.png" });
}
```

## Best Practices

✅ **DO:**
- Wait for specific conditions (not time delays)
- Use descriptive element names
- Handle dialogs (`handleDialog`)
- Check console errors after actions
- Take screenshots at critical points

❌ **DON'T:**
- Use hard-coded delays
- Use generic element selectors
- Ignore console errors
- Use relative file paths (uploads)

## Configuration

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

<!-- PLAYWRIGHT:END -->
