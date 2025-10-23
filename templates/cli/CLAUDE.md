<!-- CLAUDE:START -->
# Claude Code CLI Rules

**CRITICAL**: Specific rules and patterns for Claude Code (Claude AI via CLI/API).

## Claude Code Overview

Claude is Anthropic's AI assistant with strong coding capabilities:

```bash
# Using Claude API
pip install anthropic

# Or via dedicated CLI tools
# claude-cli, claude-code, etc.
```

## Integration with AGENTS.md

### 1. System Prompt Configuration

Always include AGENTS.md context in system prompt:

```python
import anthropic

client = anthropic.Anthropic(api_key="your-api-key")

# Read AGENTS.md
with open("AGENTS.md", "r") as f:
    agents_content = f.read()

# System prompt
system_prompt = f"""You are an expert software engineer.

CRITICAL RULES FROM PROJECT STANDARDS:
{agents_content}

Follow ALL standards defined above for EVERY code generation task.
"""

message = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    system=system_prompt,
    messages=[
        {"role": "user", "content": "Implement user authentication"}
    ]
)
```

### 2. Project Context

Include project context in each request:

```python
def get_project_context():
    context = []
    
    # Always include AGENTS.md
    with open("AGENTS.md") as f:
        context.append(f"AGENTS.md:\n{f.read()}")
    
    # Include relevant specs
    if os.path.exists("docs/specs"):
        for spec in glob("docs/specs/*.md"):
            with open(spec) as f:
                context.append(f"{spec}:\n{f.read()}")
    
    # Include ROADMAP
    if os.path.exists("docs/ROADMAP.md"):
        with open("docs/ROADMAP.md") as f:
            context.append(f"ROADMAP:\n{f.read()}")
    
    return "\n\n".join(context)
```

## Usage Patterns

### 1. Feature Implementation

```python
def implement_feature(feature_description: str, files: list[str]):
    # Read existing files
    file_contents = {}
    for file in files:
        with open(file) as f:
            file_contents[file] = f.read()
    
    prompt = f"""
Following AGENTS.md standards, implement: {feature_description}

Current files:
{format_files(file_contents)}

Requirements:
1. Write tests first in /tests/ (95%+ coverage)
2. Implement feature following language patterns from AGENTS.md
3. Add proper error handling as defined in AGENTS.md
4. Include inline documentation
5. Update specs in /docs/specs/ if needed

Provide complete file contents for all modified files.
"""
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=8000,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.content[0].text
```

### 2. Test-Driven Development

```python
def generate_tests(module_path: str, description: str):
    with open(module_path) as f:
        module_content = f.read()
    
    prompt = f"""
Following AGENTS.md testing standards, generate comprehensive tests for:

Module: {module_path}
Description: {description}

Current module:
```
{module_content}
```

Requirements from AGENTS.md:
- Test location: /tests/ directory
- Coverage: 95%+ minimum
- Test all edge cases
- Test error conditions
- Include integration tests if needed

Generate complete test file.
"""
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.content[0].text
```

### 3. Code Review

```python
def review_code(files: list[str]):
    file_contents = read_files(files)
    
    prompt = f"""
Review this code against AGENTS.md standards:

{format_files(file_contents)}

Check for:
1. Compliance with language-specific standards from AGENTS.md
2. Error handling patterns
3. Test coverage (should be 95%+)
4. Documentation completeness
5. Code quality issues
6. Performance concerns
7. Security vulnerabilities

Provide detailed feedback and specific improvements.
"""
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.content[0].text
```

### 4. Refactoring

```python
def refactor_code(files: list[str], refactor_goal: str):
    prompt = f"""
Refactor following AGENTS.md patterns:

Goal: {refactor_goal}

Files:
{format_files(read_files(files))}

Requirements:
1. Follow AGENTS.md patterns for target language
2. Maintain or improve test coverage (95%+)
3. Update all affected tests
4. Preserve functionality
5. Improve code quality
6. Add documentation for changes

Provide complete refactored files and updated tests.
"""
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=8000,
        system=system_prompt,
        messages=[{"role": "user", "content": prompt}]
    )
    
    return response.content[0].text
```

## Claude-Specific Features

### 1. Extended Context Window

Claude 3.5 Sonnet supports 200K tokens:

```python
# Include extensive project context
def get_full_context():
    context = []
    
    # All documentation
    for doc in glob("docs/**/*.md", recursive=True):
        with open(doc) as f:
            context.append(f"{doc}:\n{f.read()}")
    
    # All source files (if reasonable)
    for src in glob("src/**/*.rs", recursive=True):
        with open(src) as f:
            context.append(f"{src}:\n{f.read()}")
    
    return "\n\n".join(context)
```

### 2. Tool Use (Function Calling)

Define tools for Claude to use:

```python
tools = [
    {
        "name": "run_tests",
        "description": "Run project tests and return results",
        "input_schema": {
            "type": "object",
            "properties": {
                "test_path": {
                    "type": "string",
                    "description": "Path to test file or directory"
                }
            },
            "required": ["test_path"]
        }
    },
    {
        "name": "run_linter",
        "description": "Run linter and return results",
        "input_schema": {
            "type": "object",
            "properties": {
                "path": {
                    "type": "string",
                    "description": "Path to lint"
                }
            },
            "required": ["path"]
        }
    }
]

response = client.messages.create(
    model="claude-3-5-sonnet-20241022",
    max_tokens=4096,
    tools=tools,
    system=system_prompt,
    messages=[{"role": "user", "content": "Implement feature and verify quality"}]
)
```

### 3. Multi-Turn Conversations

Maintain conversation state:

```python
conversation = []

def chat(user_message: str):
    conversation.append({"role": "user", "content": user_message})
    
    response = client.messages.create(
        model="claude-3-5-sonnet-20241022",
        max_tokens=4096,
        system=system_prompt,
        messages=conversation
    )
    
    assistant_message = response.content[0].text
    conversation.append({"role": "assistant", "content": assistant_message})
    
    return assistant_message

# Usage
chat("Implement user authentication following AGENTS.md")
chat("Add rate limiting to the auth endpoints")
chat("Generate comprehensive tests with 95%+ coverage")
```

## Quality Assurance Workflow

### Complete Implementation Pipeline

```python
def implement_feature_with_qa(feature_spec: str):
    """Complete implementation with quality checks"""
    
    # 1. Generate tests
    tests = chat(f"""
    Following AGENTS.md, create comprehensive tests for: {feature_spec}
    - Location: /tests/
    - Coverage: 95%+
    - All edge cases
    """)
    
    # Write tests
    write_generated_files(tests)
    
    # 2. Implement feature
    implementation = chat(f"""
    Now implement the feature to pass all tests.
    Follow AGENTS.md patterns for error handling and documentation.
    """)
    
    # Write implementation
    write_generated_files(implementation)
    
    # 3. Run tests
    test_result = run_command("cargo test")  # or npm test, pytest, etc.
    
    if not test_result.success:
        # 4. Fix issues
        fixes = chat(f"""
        Tests failed:
        {test_result.output}
        
        Fix the implementation following AGENTS.md standards.
        """)
        write_generated_files(fixes)
    
    # 5. Run linter
    lint_result = run_command("cargo clippy -- -D warnings")
    
    if not lint_result.success:
        # 6. Fix lint issues
        lint_fixes = chat(f"""
        Linter found issues:
        {lint_result.output}
        
        Fix following AGENTS.md standards.
        """)
        write_generated_files(lint_fixes)
    
    # 7. Check coverage
    coverage = run_command("cargo llvm-cov")
    
    # 8. Update documentation
    docs = chat(f"""
    Feature implemented successfully.
    Update documentation:
    1. /docs/specs/ with feature spec
    2. /docs/ROADMAP.md progress
    3. CHANGELOG.md entry
    """)
    
    write_generated_files(docs)
    
    return {
        "success": True,
        "tests_passing": True,
        "linter_clean": True,
        "coverage": parse_coverage(coverage.output)
    }
```

## Best Practices

### 1. Always Include Full Context

```python
# Good
prompt = f"""
{get_project_context()}

Implement feature X following all standards above.
"""

# Bad
prompt = "Implement feature X"
```

### 2. Use Structured Output

```python
prompt = """
Provide response in this exact format:

## Files to Create/Modify

### path/to/file1.rs
```rust
// complete file content
```

### tests/file1.test.rs
```rust
// complete test file
```

## Documentation Updates

### docs/specs/FEATURE.md
```markdown
// spec content
```
"""
```

### 3. Iterate Until Standards Met

```python
max_attempts = 3
attempt = 0

while attempt < max_attempts:
    code = generate_code(prompt)
    
    # Verify against AGENTS.md
    review = chat(f"""
    Review this code against AGENTS.md:
    {code}
    
    Does it meet all standards? If not, what's missing?
    """)
    
    if "meets all standards" in review.lower():
        break
    
    prompt = f"{prompt}\n\nPrevious attempt had issues:\n{review}\n\nFix these issues."
    attempt += 1
```

### 4. Leverage Long Context

```python
# Include entire codebase for refactoring
def refactor_with_full_context():
    all_files = read_all_source_files()
    
    prompt = f"""
    Full codebase:
    {all_files}
    
    AGENTS.md standards:
    {read_agents_md()}
    
    Refactor to improve error handling across the entire codebase
    following AGENTS.md patterns.
    """
```

## Error Handling

### Retry with Clarification

```python
def safe_generate(prompt: str, max_retries: int = 3):
    for attempt in range(max_retries):
        try:
            response = client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=4096,
                system=system_prompt,
                messages=[{"role": "user", "content": prompt}]
            )
            return response.content[0].text
        except anthropic.APIError as e:
            if attempt == max_retries - 1:
                raise
            prompt = f"{prompt}\n\nPrevious attempt failed: {e}\nPlease try again."
```

## Advanced Patterns

### 1. Automated Code Review Bot

```python
def review_pr(pr_files: list[str]):
    """Review pull request against AGENTS.md"""
    
    reviews = []
    for file in pr_files:
        with open(file) as f:
            content = f.read()
        
        review = chat(f"""
        Review this file against AGENTS.md standards:
        
        File: {file}
        ```
        {content}
        ```
        
        Provide:
        1. Standards compliance check
        2. Specific issues found
        3. Suggested improvements
        4. Security concerns
        """)
        
        reviews.append({"file": file, "review": review})
    
    return reviews
```

### 2. Documentation Generator

```python
def generate_docs(module_path: str):
    """Generate documentation from code"""
    
    with open(module_path) as f:
        code = f.read()
    
    docs = chat(f"""
    Generate comprehensive documentation for this module
    following AGENTS.md documentation standards:
    
    ```
    {code}
    ```
    
    Include:
    1. Module overview
    2. API documentation
    3. Usage examples
    4. Error handling guide
    5. Performance considerations
    """)
    
    return docs
```

### 3. Test Coverage Analyzer

```python
def analyze_test_coverage(module: str, tests: str):
    """Analyze if tests meet AGENTS.md coverage requirements"""
    
    analysis = chat(f"""
    Analyze test coverage for AGENTS.md compliance:
    
    Module:
    ```
    {module}
    ```
    
    Tests:
    ```
    {tests}
    ```
    
    Check:
    1. Are all functions tested?
    2. Are edge cases covered?
    3. Are error paths tested?
    4. Estimated coverage percentage
    5. Missing test cases
    
    AGENTS.md requires 95%+ coverage.
    """)
    
    return analysis
```

## Tips for Better Results

1. **Be Explicit**: Always reference AGENTS.md in prompts
2. **Provide Context**: Include relevant files and specs
3. **Use Examples**: Show desired patterns from codebase
4. **Iterate**: Refine until standards met
5. **Verify**: Run quality checks after generation
6. **Structured Output**: Request specific format for easier parsing
7. **Long Context**: Leverage 200K context for full codebase understanding

## Model Selection

```python
# For code generation
model = "claude-3-5-sonnet-20241022"  # Best for coding

# For code review/analysis
model = "claude-3-5-sonnet-20241022"  # High quality reasoning

# For quick tasks
model = "claude-3-haiku-20240307"  # Fast and cost-effective
```

## Security Considerations

```python
# Never include secrets in prompts
# Sanitize sensitive data
def sanitize_code(code: str) -> str:
    # Remove API keys, passwords, etc.
    patterns = [
        r'api_key\s*=\s*["\'].*?["\']',
        r'password\s*=\s*["\'].*?["\']',
        r'secret\s*=\s*["\'].*?["\']'
    ]
    for pattern in patterns:
        code = re.sub(pattern, 'REDACTED', code)
    return code
```

<!-- CLAUDE:END -->

