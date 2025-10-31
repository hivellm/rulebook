# CLI Agents Documentation

**Note**: This document covers CLI Agent integration (autonomous agent feature from v0.10.0).  
For current v0.14.0 features (frameworks, Git hooks, MCP modules), see main documentation.

This document describes the supported CLI agents, their flags, output formats, and usage patterns.

## Supported Agents

### 1. cursor-agent

**Command**: `cursor-agent`
**Detection**: `cursor-agent --version`
**Primary Tool**: Cursor IDE integration

#### CLI Flags
- `-p` - Print mode (non-interactive)
- `--force` - Allow commands unless explicitly denied
- `--approve-mcps` - Allow all MCP servers without asking
- `--output-format stream-json` - Stream output in JSON format
- `--stream-partial-output` - Stream partial output as individual text deltas

#### Usage Pattern
```bash
cursor-agent -p --force --approve-mcps --output-format stream-json --stream-partial-output "PROMPT"
```

#### Output Format
- **Format**: JSON stream (one JSON object per line)
- **Event Types**:
  - `system.init` - System initialization
  - `user` - User message
  - `assistant` - Assistant response
  - `tool_call.started` - Tool call initiation
  - `tool_call.completed` - Tool call completion
  - `tool_call.failed` - Tool call failure
  - `thinking` - AI thinking process
  - `done` - Completion signal

#### Example Output
```json
{"type":"system","subtype":"init","apiKeySource":"env","cwd":"/project","session_id":"abc123","model":"claude-3.5-sonnet","permissionMode":"auto"}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Implement a function"}]},"session_id":"abc123"}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I'll help you implement that function."}]},"session_id":"abc123"}
{"type":"tool_call","subtype":"started","tool_call":{"writeToolCall":{"args":{"path":"src/function.ts","contents":"export function example() {}"}}}}}
{"type":"tool_call","subtype":"completed","tool_call":{"writeToolCall":{"args":{"path":"src/function.ts","contents":"export function example() {}"}}}}
{"type":"done","session_id":"abc123"}
```

### 2. claude-code

**Command**: `claude`
**Detection**: `claude --version`
**Primary Tool**: Claude Code integration

#### CLI Flags
- `--headless` - Run in headless mode
- `--model` - Specify Claude model (optional)
- `--max-tokens` - Maximum tokens to generate (optional)
- `--temperature` - Response temperature (optional)

#### Usage Pattern
```bash
claude --headless "PROMPT"
```

#### Output Format
- **Format**: Plain text stream with progress indicators
- **Progress Indicators**:
  - `...` - Processing indicator
  - `thinking...` - AI thinking
  - `processing...` - Task processing
- **Tool Calls**:
  - `🔧 Tool: read file` - File read operation
  - `🔧 Tool: write file` - File write operation
  - `🔧 Tool: execute bash` - Bash command execution
- **Completion Indicators**:
  - `✅ Complete` - Task completed
  - `Done` - Process finished
- **Error Indicators**:
  - `❌ Error: message` - Error occurred
  - `Failed: reason` - Operation failed

#### Example Output
```
thinking...
🔧 Tool: read file src/example.ts
processing...
🔧 Tool: write file src/example.ts
✅ Complete
```

### 3. gemini-cli

**Command**: `gemini`
**Detection**: `gemini --version`
**Primary Tool**: Google Gemini integration

#### CLI Flags
- `--model` - Specify Gemini model (optional)
- `--max-tokens` - Maximum tokens to generate (optional)
- `--temperature` - Response temperature (optional)
- `--stream` - Enable streaming output (optional)

#### Usage Pattern
```bash
gemini "PROMPT"
```

#### Output Format
- **Format**: Plain text stream with progress indicators
- **Progress Indicators**:
  - `...` - Processing indicator
  - `thinking...` - AI thinking
  - `processing...` - Task processing
- **Tool Calls**:
  - `🔧 Tool: read file` - File read operation
  - `🔧 Tool: write file` - File write operation
  - `🔧 Tool: execute bash` - Bash command execution
- **Completion Indicators**:
  - `✅ Complete` - Task completed
  - `Done` - Process finished
- **Error Indicators**:
  - `❌ Error: message` - Error occurred
  - `Failed: reason` - Operation failed

#### Example Output
```
thinking...
🔧 Tool: read file src/example.ts
processing...
🔧 Tool: write file src/example.ts
✅ Complete
```

## Agent Selection

The system automatically detects available CLI tools and selects the best one:

1. **Preferred Tool**: If specified, uses the preferred tool if available
2. **First Available**: Uses the first detected tool
3. **Interactive Selection**: Prompts user to choose from available tools

## Error Handling

All agents handle common error scenarios:

- **Tool Not Found**: Graceful fallback to next available tool
- **Timeout**: Automatic retry with continue command
- **Parse Errors**: Silent error handling with fallback
- **Connection Issues**: Retry logic with exponential backoff

## Performance Characteristics

### cursor-agent
- **Connection Time**: 30-60 seconds (remote server)
- **Timeout**: 30 minutes for complex tasks
- **Memory Usage**: High (full IDE integration)
- **Best For**: Complex development tasks

### claude-code
- **Connection Time**: 5-10 seconds
- **Timeout**: 30 seconds default
- **Memory Usage**: Medium
- **Best For**: Code generation and analysis

### gemini-cli
- **Connection Time**: 5-10 seconds
- **Timeout**: 30 seconds default
- **Memory Usage**: Medium
- **Best For**: General AI assistance

## Installation

### cursor-agent
```bash
npm install -g @cursor/cli
```

### claude-code
```bash
npm install -g claude-code
```

### gemini-cli
```bash
npm install -g gemini-cli
```

## Troubleshooting

### Common Issues

1. **Tool Not Detected**
   - Ensure tool is installed globally
   - Check PATH environment variable
   - Verify tool responds to `--version`

2. **Connection Timeouts**
   - Check internet connection
   - Verify API keys are set
   - Try different tool if available

3. **Parse Errors**
   - Check tool output format
   - Verify tool version compatibility
   - Review error logs for details

### Debug Mode

Enable debug logging by setting environment variables:
```bash
export DEBUG=rulebook:cli-bridge
export RULEBOOK_DEBUG=true
```

This will create detailed logs in the `logs/` directory with full command execution details.