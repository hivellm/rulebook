<!-- PLAYWRIGHT:START -->
# Playwright MCP Instructions

**CRITICAL**: Use MCP Playwright for automated browser testing and web automation.

## Playwright MCP Overview

Playwright MCP Server provides programmatic browser automation for:
- Web page interaction and testing
- Screenshots and visual testing
- Form filling and submission
- Navigation and DOM manipulation
- Network request monitoring
- Console logging and error detection

## Installation & Configuration

```json
// Add to mcp.json or mcp-config.json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-playwright"]
    }
  }
}
```

## Core Operations

### Navigation

```typescript
// Navigate to URL
await playwright.navigate({ url: "https://example.com" });

// Navigate back
await playwright.navigateBack();

// Resize browser window
await playwright.resize({ width: 1920, height: 1080 });
```

### Screenshots

```typescript
// Capture full page screenshot
const screenshot = await playwright.takeScreenshot({ 
  fullPage: true,
  filename: "screenshot.png"
});

// Screenshot specific element
const elementScreenshot = await playwright.takeScreenshot({
  element: "header",
  filename: "header.png"
});
```

### Interaction

```typescript
// Click element
await playwright.click({
  element: "Submit Button",
  ref: "button[type='submit']"
});

// Type text
await playwright.type({
  element: "Search Input",
  ref: "input[type='search']",
  text: "query",
  submit: false
});

// Fill form
await playwright.fillForm({
  fields: [
    { name: "Email", type: "textbox", ref: "#email", value: "user@example.com" },
    { name: "Password", type: "textbox", ref: "#password", value: "secret" }
  ]
});

// Select dropdown option
await playwright.selectOption({
  element: "Country Select",
  ref: "#country",
  values: ["US"]
});

// Upload files
await playwright.uploadFile({
  paths: ["/path/to/file.pdf"]
});
```

### Keyboard Input

```typescript
// Press keys
await playwright.pressKey({ key: "Enter" });
await playwright.pressKey({ key: "Escape" });

// Hover over element
await playwright.hover({
  element: "Menu Item",
  ref: "#menu-item"
});

// Drag and drop
await playwright.drag({
  startElement: "Source",
  startRef: "#source",
  endElement: "Target",
  endRef: "#target"
});
```

### DOM Access

```typescript
// Get accessibility snapshot
const snapshot = await playwright.snapshot();
// Returns hierarchical tree of interactive elements

// Evaluate JavaScript
const result = await playwright.evaluate({
  function: "(element) => element.innerText",
  element: "Heading",
  ref: "h1"
});

// Handle dialogs (alerts, confirms, prompts)
await playwright.handleDialog({
  accept: true,
  promptText: "response"
});
```

### Monitoring

```typescript
// Get console messages
const messages = await playwright.getConsoleMessages({ onlyErrors: true });

// Get network requests
const requests = await playwright.getNetworkRequests();

// Wait for conditions
await playwright.waitFor({ text: "Loading complete" });
await playwright.waitFor({ time: 5 }); // Wait 5 seconds
```

## Browser Automation Patterns

### Pattern 1: Login Flow

```typescript
// 1. Navigate to login page
await playwright.navigate({ url: "https://app.example.com/login" });

// 2. Fill credentials
await playwright.fillForm({
  fields: [
    { name: "Email", type: "textbox", ref: "#email", value: "user@example.com" },
    { name: "Password", type: "textbox", ref: "#password", value: "password123" }
  ]
});

// 3. Submit form
await playwright.click({
  element: "Login Button",
  ref: "button[type='submit']"
});

// 4. Wait for redirect
await playwright.waitFor({ text: "Dashboard" });

// 5. Verify successful login
const snapshot = await playwright.snapshot();
// Check for dashboard elements
```

### Pattern 2: Form Submission

```typescript
// 1. Fill multi-field form
await playwright.fillForm({
  fields: [
    { name: "First Name", type: "textbox", ref: "#firstName", value: "John" },
    { name: "Last Name", type: "textbox", ref: "#lastName", value: "Doe" },
    { name: "Country", type: "combobox", ref: "#country", value: "United States" },
    { name: "Newsletter", type: "checkbox", ref: "#newsletter", value: "true" }
  ]
});

// 2. Upload attachment
await playwright.uploadFile({
  paths: ["/path/to/resume.pdf"]
});

// 3. Submit
await playwright.click({
  element: "Submit",
  ref: "button[type='submit']"
});

// 4. Verify success
await playwright.waitFor({ text: "Thank you" });
```

### Pattern 3: Visual Testing

```typescript
// 1. Navigate to page
await playwright.navigate({ url: "https://example.com/product" });

// 2. Take screenshot
await playwright.takeScreenshot({
  filename: "product-page.png",
  fullPage: true
});

// 3. Interact
await playwright.click({ element: "Add to Cart", ref: "button.add-cart" });

// 4. Verify visual change
await playwright.waitFor({ textGone: "Add to Cart" });
```

### Pattern 4: Error Detection

```typescript
// Monitor console errors
const errors = await playwright.getConsoleMessages({ onlyErrors: true });

if (errors.length > 0) {
  console.log("Console errors detected:", errors);
  
  // Take screenshot for debugging
  await playwright.takeScreenshot({
    filename: "error-state.png",
    fullPage: true
  });
}

// Monitor network errors
const requests = await playwright.getNetworkRequests();
const failedRequests = requests.filter(r => r.status >= 400);

if (failedRequests.length > 0) {
  console.log("Network errors detected:", failedRequests);
}
```

## Testing Best Practices

### 1. Waits Over Delays

```typescript
// ✅ Good: Wait for specific condition
await playwright.waitFor({ text: "Load Complete" });

// ❌ Bad: Hard-coded delay
await playwright.waitFor({ time: 5 });
```

### 2. Explicit Element Selection

```typescript
// ✅ Good: Descriptive element names
await playwright.click({
  element: "Submit Payment Button",
  ref: "#payment-submit"
});

// ❌ Bad: Generic descriptions
await playwright.click({
  element: "button",
  ref: "button"
});
```

### 3. Error Handling

```typescript
// Always handle dialogs
await playwright.handleDialog({
  accept: true,  // Accept alerts, confirms
  promptText: "response"  // Only for prompts
});

// Check for console errors after actions
const errors = await playwright.getConsoleMessages({ onlyErrors: true });
if (errors.length > 0) {
  throw new Error(`Page errors: ${errors.map(e => e.text).join(', ')}`);
}
```

### 4. Screenshot Timing

```typescript
// Take screenshots at critical points
await playwright.takeScreenshot({ filename: "before-action.png" });

// Perform action
await playwright.click({ element: "Submit", ref: "#submit" });

// Wait for response
await playwright.waitFor({ text: "Success" });

// Capture result
await playwright.takeScreenshot({ filename: "after-action.png" });
```

## File Operations

### Upload Files

```typescript
// Single file
await playwright.uploadFile({
  paths: ["/absolute/path/to/document.pdf"]
});

// Multiple files
await playwright.uploadFile({
  paths: [
    "/absolute/path/to/file1.pdf",
    "/absolute/path/to/file2.jpg"
  ]
});
```

**Note**: File paths must be absolute paths, not relative.

## Tab Management

```typescript
// List tabs
const tabs = await playwright.getTabs({ action: "list" });

// Create new tab
await playwright.createTab({ action: "new" });

// Switch to tab
await playwright.selectTab({ action: "select", index: 1 });

// Close tab
await playwright.closeTab({ action: "close", index: 1 });
```

## Advanced Usage

### Network Monitoring

```typescript
// Monitor all network requests
const requests = await playwright.getNetworkRequests();

// Filter by status
const successful = requests.filter(r => r.status < 400);
const failed = requests.filter(r => r.status >= 400);

// Filter by type
const apiCalls = requests.filter(r => r.url.includes('/api/'));
```

### Dynamic Content Loading

```typescript
// Wait for dynamic content
await playwright.waitFor({ text: "Load Complete" });

// Or wait for element to appear
await playwright.waitFor({ 
  textGone: "Loading..."  // Wait for loading message to disappear
});
```

### Form Validation Testing

```typescript
// Test validation errors
await playwright.fillForm({
  fields: [
    { name: "Email", type: "textbox", ref: "#email", value: "invalid" }
  ]
});

await playwright.click({ element: "Submit", ref: "button[type='submit']" });

// Check for error message
const snapshot = await playwright.snapshot();
// Look for "Invalid email" in snapshot
```

## Integration with Testing Frameworks

### Vitest Integration

```typescript
import { test } from 'vitest';

test('login flow', async () => {
  // Navigate
  await playwright.navigate({ url: "https://app.example.com" });
  
  // Fill form
  await playwright.fillForm({
    fields: [
      { name: "Email", type: "textbox", ref: "#email", value: "test@example.com" },
      { name: "Password", type: "textbox", ref: "#password", value: "password" }
    ]
  });
  
  // Submit
  await playwright.click({ element: "Login", ref: "button.login" });
  
  // Assert
  await playwright.waitFor({ text: "Dashboard" });
  expect(await playwright.snapshot()).toContain("Welcome");
});
```

## Common Pitfalls

1. **Relative File Paths**: Always use absolute paths for uploads
2. **Dialog Handling**: Always handle alerts/confirms or they'll block execution
3. **Element References**: Use stable selectors (IDs > classes > complex CSS)
4. **Wait Timing**: Prefer explicit waits over time-based waits
5. **Console Errors**: Check console messages after critical actions

## Performance Tips

1. Use `fullPage: false` for faster screenshots
2. Close tabs when done to free memory
3. Resize browser to minimal needed size
4. Avoid unnecessary snapshots
5. Batch actions in `fillForm` instead of multiple `type` calls

<!-- PLAYWRIGHT:END -->
