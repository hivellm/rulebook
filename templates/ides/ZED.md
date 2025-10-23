<!-- ZED:START -->
# Zed Editor AI Rules

**CRITICAL**: Specific rules and patterns for Zed Editor with AI.

## Zed Overview

Zed is a high-performance, collaborative code editor with built-in AI:

- Blazing fast performance
- Native collaborative editing
- Built-in AI assistance
- Rust-powered
- GPU-accelerated rendering

## Installation

```bash
# macOS
brew install zed

# Linux
curl -f https://zed.dev/install.sh | sh

# Or download from https://zed.dev
```

## Integration with AGENTS.md

### Zed Configuration

Edit `~/.config/zed/settings.json`:

```json
{
  "assistant": {
    "enabled": true,
    "provider": "anthropic",
    "model": "claude-3-5-sonnet-20241022",
    "project_context": {
      "include_files": [
        "AGENTS.md",
        "README.md",
        "docs/**/*.md"
      ]
    },
    "inline_assist": {
      "enabled": true,
      "show_on_typing": true
    }
  },
  
  "project": {
    "standards_file": "AGENTS.md",
    "auto_format": true,
    "auto_lint": true
  },
  
  "lsp": {
    "rust-analyzer": {
      "initialization_options": {
        "check": {
          "command": "clippy"
        }
      }
    }
  },
  
  "terminal": {
    "shell": {
      "program": "zsh"
    }
  }
}
```

### Project-Level Settings

Create `.zed/settings.json` in project root:

```json
{
  "assistant": {
    "custom_instructions": "Always follow coding standards from AGENTS.md. Include tests for all code (95%+ coverage). Use strict types. Add comprehensive documentation.",
    "context_files": ["AGENTS.md"]
  },
  
  "code_actions_on_format": {
    "source.organizeImports": true,
    "source.fixAll": true
  },
  
  "format_on_save": "on",
  "ensure_final_newline_on_save": true,
  "remove_trailing_whitespace_on_save": true
}
```

## Zed AI Features

### 1. Inline Assist

```
⌘+. (or Ctrl+.)

Prompt: "Implement user authentication following AGENTS.md"

Zed AI:
- Reads AGENTS.md context
- Generates type-safe code
- Includes error handling
- Adds documentation
- Suggests tests
```

### 2. Assistant Panel

```
⌘+? (or Ctrl+?)

Opens AI Assistant panel for:
- Code explanations
- Feature implementation
- Refactoring suggestions
- Test generation
- Documentation writing
```

### 3. Multi-File Editing

```
Zed AI can edit multiple files simultaneously:

"Implement user authentication across:
- src/auth/login.ts
- src/auth/register.ts
- tests/auth/*.test.ts

Following AGENTS.md standards"
```

### 4. Collaborative AI

```
Share → Invite collaborators

All collaborators see:
- AI suggestions in real-time
- AGENTS.md context
- Code changes
- Test results
```

## Best Practices

### DO's ✅

- **Configure** AGENTS.md as context file
- **Use** inline assist for quick edits
- **Leverage** multi-file capabilities
- **Collaborate** with AI suggestions
- **Review** all AI changes in diff
- **Test** immediately after AI edits
- **Use** GPU acceleration benefits
- **Enable** format on save

### DON'Ts ❌

- **Never** skip AGENTS.md context
- **Never** accept untested AI code
- **Don't** disable linting
- **Don't** ignore type errors
- **Don't** bypass code review
- **Don't** commit without testing

## Zed-Specific Features

### 1. Collaboration

```
Share project → Get link

Collaborators get:
- Real-time AI assistance
- Shared AGENTS.md context
- Synchronized edits
- Shared terminal
```

### 2. Performance

Zed is optimized for AI workflows:

- Fast AI response rendering
- GPU-accelerated UI
- Instant file search
- Quick project-wide refactoring

### 3. Vim Mode

```json
{
  "vim_mode": true,
  "assistant": {
    "vim_bindings": {
      ":ai": "open_assistant",
      ":gen": "inline_assist"
    }
  }
}
```

## Prompt Templates

### Feature Request

```
⌘+. → Type:

"Implement [feature name] following AGENTS.md:

Requirements:
- Language: [from AGENTS.md]
- Testing: TDD with 95%+ coverage
- Types: Strict type safety
- Docs: Complete documentation

Include:
- Type definitions
- Implementation
- Tests
- Documentation"
```

### Code Review

```
⌘+? → Type:

"Review this code against AGENTS.md:

[select code]

Check:
- Standards compliance
- Type safety
- Error handling
- Test coverage
- Documentation
- Performance"
```

### Refactoring

```
Select code → ⌘+. →

"Refactor to match AGENTS.md patterns:

Improve:
- Type safety
- Error handling
- Code organization
- Documentation

Maintain all tests."
```

## Quality Checklist

Before committing Zed AI code:

- [ ] AGENTS.md standards followed
- [ ] All tests passing
- [ ] Coverage ≥ 95%
- [ ] Types correct
- [ ] Linting passes
- [ ] Formatted correctly
- [ ] Documentation complete
- [ ] No warnings
- [ ] Reviewed in diff view

## Advanced Configuration

### Language Servers

```json
{
  "lsp": {
    "typescript-language-server": {
      "initialization_options": {
        "preferences": {
          "strict": true,
          "noImplicitAny": true
        }
      }
    },
    "rust-analyzer": {
      "initialization_options": {
        "cargo": {
          "allFeatures": true
        },
        "checkOnSave": {
          "command": "clippy"
        }
      }
    }
  }
}
```

### Custom Keybindings

```json
{
  "bindings": {
    "ctrl-shift-a": "assistant::ToggleFocus",
    "ctrl-shift-i": "assistant::InlineAssist",
    "ctrl-shift-t": "assistant::GenerateTests",
    "ctrl-shift-d": "assistant::GenerateDocs"
  }
}
```

## Troubleshooting

### AI Not Loading AGENTS.md

```json
// Check settings.json
{
  "assistant": {
    "project_context": {
      "include_files": ["AGENTS.md"],
      "max_file_size": 10000000
    }
  }
}

// Restart Zed
```

### Performance Issues

```json
{
  "assistant": {
    "max_tokens": 4096,
    "temperature": 0.2,
    "stream": true
  },
  "gpu_acceleration": true
}
```

### Collaboration Problems

```
1. Check internet connection
2. Verify Zed account
3. Ensure AGENTS.md in shared project
4. Restart Zed
5. Re-share project
```

<!-- ZED:END -->

