<!-- GEMINI:START -->
# Gemini CLI Rules

**CRITICAL**: Specific rules and patterns for Google Gemini AI via CLI/API.

## Gemini Overview

Google's Gemini is a powerful multimodal AI model:

```bash
# Install Google AI SDK
pip install google-generativeai

# Or use gcloud CLI
gcloud ai models list
```

## Integration with AGENTS.md

### 1. Configuration

```python
import google.generativeai as genai
import os

# Configure API
genai.configure(api_key=os.environ["GEMINI_API_KEY"])

# Read AGENTS.md for system instructions
with open("AGENTS.md") as f:
    agents_content = f.read()

# Create model with system instruction
model = genai.GenerativeModel(
    model_name='gemini-1.5-pro',
    system_instruction=f"""You are an expert software engineer.

CRITICAL PROJECT STANDARDS:
{agents_content}

Follow ALL standards defined above for EVERY code generation task.
Never violate these standards.
"""
)
```

### 2. Safety Settings

```python
safety_settings = [
    {
        "category": "HARM_CATEGORY_HARASSMENT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_HATE_SPEECH",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "threshold": "BLOCK_NONE"
    },
    {
        "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
        "threshold": "BLOCK_NONE"
    }
]

model = genai.GenerativeModel(
    model_name='gemini-1.5-pro',
    system_instruction=system_instruction,
    safety_settings=safety_settings
)
```

## Usage Patterns

### 1. Feature Implementation

```python
def implement_feature(feature_description: str, files: dict[str, str]):
    """Implement feature following AGENTS.md"""
    
    # Prepare context
    files_context = "\n\n".join([
        f"File: {path}\n```\n{content}\n```"
        for path, content in files.items()
    ])
    
    prompt = f"""
Following AGENTS.md standards, implement: {feature_description}

Current project files:
{files_context}

Requirements from AGENTS.md:
1. Write tests first in /tests/ directory
2. Achieve 95%+ test coverage
3. Follow language-specific patterns from AGENTS.md
4. Add proper error handling
5. Include inline documentation
6. Update specs in /docs/specs/

Provide complete files with clear markers for each file.
"""
    
    response = model.generate_content(prompt)
    return response.text
```

### 2. Test Generation with Code Execution

```python
# Gemini can execute code to verify tests
code_execution_config = {
    "enable_code_execution": True
}

model = genai.GenerativeModel(
    model_name='gemini-1.5-pro',
    system_instruction=system_instruction,
    tools={'code_execution': code_execution_config}
)

def generate_and_verify_tests(module_path: str):
    with open(module_path) as f:
        module_code = f.read()
    
    prompt = f"""
Following AGENTS.md testing standards:

1. Generate comprehensive tests for this module
2. Execute the tests to verify they work
3. Ensure 95%+ coverage as required by AGENTS.md

Module:
```
{module_code}
```

Generate tests and run them to confirm they pass.
"""
    
    response = model.generate_content(prompt)
    return response.text
```

### 3. Multi-Modal Code Review

```python
def review_with_diagrams(code_files: dict[str, str], diagram_paths: list[str]):
    """Review code including architecture diagrams"""
    
    # Upload diagrams
    uploaded_files = []
    for diagram_path in diagram_paths:
        file = genai.upload_file(diagram_path)
        uploaded_files.append(file)
    
    # Prepare code context
    code_context = format_files(code_files)
    
    prompt = f"""
Review this codebase against AGENTS.md standards:

Code:
{code_context}

Also consider the architecture diagrams provided.

Check for:
1. Standards compliance (AGENTS.md)
2. Architecture alignment
3. Error handling patterns
4. Test coverage (should be 95%+)
5. Documentation quality
6. Security issues
7. Performance concerns

Provide detailed feedback.
"""
    
    response = model.generate_content([prompt] + uploaded_files)
    return response.text
```

### 4. Streaming Responses

```python
def implement_with_streaming(prompt: str):
    """Stream implementation for real-time feedback"""
    
    response = model.generate_content(
        prompt,
        stream=True
    )
    
    full_response = ""
    for chunk in response:
        if chunk.text:
            print(chunk.text, end='', flush=True)
            full_response += chunk.text
    
    return full_response
```

## Gemini-Specific Features

### 1. Extended Context (2M tokens)

Gemini 1.5 Pro supports up to 2 million tokens:

```python
def analyze_entire_codebase():
    """Include entire codebase in context"""
    
    # Read all source files
    all_files = {}
    for path in glob("src/**/*.rs", recursive=True):
        with open(path) as f:
            all_files[path] = f.read()
    
    # Read all documentation
    all_docs = {}
    for path in glob("docs/**/*.md", recursive=True):
        with open(path) as f:
            all_docs[path] = f.read()
    
    context = f"""
AGENTS.md Standards:
{read_file('AGENTS.md')}

All Source Files:
{format_files(all_files)}

All Documentation:
{format_files(all_docs)}

Analyze the entire codebase for:
1. AGENTS.md compliance
2. Architectural issues
3. Code quality
4. Test coverage
5. Documentation gaps
"""
    
    response = model.generate_content(context)
    return response.text
```

### 2. Function Calling

```python
# Define functions for Gemini to call
tools = [
    genai.protos.Tool(
        function_declarations=[
            genai.protos.FunctionDeclaration(
                name='run_tests',
                description='Run project tests and return results',
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        'test_path': genai.protos.Schema(type=genai.protos.Type.STRING)
                    },
                    required=['test_path']
                )
            ),
            genai.protos.FunctionDeclaration(
                name='run_linter',
                description='Run linter and return issues',
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={
                        'path': genai.protos.Schema(type=genai.protos.Type.STRING)
                    },
                    required=['path']
                )
            ),
            genai.protos.FunctionDeclaration(
                name='check_coverage',
                description='Check test coverage',
                parameters=genai.protos.Schema(
                    type=genai.protos.Type.OBJECT,
                    properties={}
                )
            )
        ]
    )
]

model_with_tools = genai.GenerativeModel(
    model_name='gemini-1.5-pro',
    system_instruction=system_instruction,
    tools=tools
)

response = model_with_tools.generate_content(
    "Implement user authentication and verify it meets AGENTS.md standards"
)
```

### 3. Caching for Large Contexts

```python
from google.generativeai import caching
import datetime

# Cache AGENTS.md and project context
cache = caching.CachedContent.create(
    model='gemini-1.5-pro',
    system_instruction=system_instruction,
    contents=[
        {
            'role': 'user',
            'parts': [{'text': get_full_project_context()}]
        }
    ],
    ttl=datetime.timedelta(hours=1)
)

# Use cached context
model_with_cache = genai.GenerativeModel.from_cached_content(cache)

# Much faster subsequent calls
response = model_with_cache.generate_content(
    "Implement new feature following project standards"
)
```

## Chat Sessions

```python
class GeminiDevSession:
    def __init__(self):
        self.chat = model.start_chat(history=[])
    
    def send(self, message: str) -> str:
        """Send message and get response"""
        response = self.chat.send_message(message)
        return response.text
    
    def implement_feature(self, spec: str) -> str:
        """Multi-turn feature implementation"""
        
        # 1. Create tests
        tests = self.send(f"""
        Following AGENTS.md, create comprehensive tests for: {spec}
        Requirements:
        - Location: /tests/
        - Coverage: 95%+
        - All edge cases
        """)
        
        # 2. Implement
        impl = self.send("""
        Now implement the feature to pass all tests.
        Follow AGENTS.md patterns for error handling and docs.
        """)
        
        # 3. Review
        review = self.send("""
        Review the implementation against AGENTS.md.
        Does it meet all standards?
        """)
        
        return {
            "tests": tests,
            "implementation": impl,
            "review": review
        }

# Usage
session = GeminiDevSession()
result = session.implement_feature("User authentication with JWT")
```

## Quality Assurance Workflow

```python
def full_qa_pipeline(feature_spec: str):
    """Complete implementation with quality checks"""
    
    session = GeminiDevSession()
    
    # 1. Generate tests
    print("Generating tests...")
    tests = session.send(f"""
    Following AGENTS.md, create comprehensive tests for: {feature_spec}
    - Tests in /tests/ directory
    - 95%+ coverage requirement
    - All edge cases and error conditions
    """)
    
    write_generated_files(tests)
    
    # 2. Implement feature
    print("Implementing feature...")
    impl = session.send("""
    Implement the feature to pass all tests.
    Follow AGENTS.md language-specific patterns.
    """)
    
    write_generated_files(impl)
    
    # 3. Run tests
    print("Running tests...")
    test_result = run_command("cargo test")  # or npm test, pytest
    
    if not test_result.success:
        print("Tests failed, fixing...")
        fixes = session.send(f"""
        Tests failed with:
        {test_result.output}
        
        Fix the implementation following AGENTS.md standards.
        """)
        write_generated_files(fixes)
        test_result = run_command("cargo test")
    
    # 4. Run linter
    print("Running linter...")
    lint_result = run_command("cargo clippy -- -D warnings")
    
    if not lint_result.success:
        print("Linter found issues, fixing...")
        lint_fixes = session.send(f"""
        Linter found:
        {lint_result.output}
        
        Fix following AGENTS.md standards.
        """)
        write_generated_files(lint_fixes)
    
    # 5. Check coverage
    print("Checking coverage...")
    coverage = run_command("cargo llvm-cov")
    coverage_pct = parse_coverage(coverage.output)
    
    if coverage_pct < 95:
        print(f"Coverage {coverage_pct}% < 95%, adding tests...")
        more_tests = session.send(f"""
        Coverage is {coverage_pct}%, need 95%+ per AGENTS.md.
        Add more tests to increase coverage.
        """)
        write_generated_files(more_tests)
    
    # 6. Update documentation
    print("Updating documentation...")
    docs = session.send("""
    Feature complete. Update documentation:
    1. Create/update spec in /docs/specs/
    2. Update /docs/ROADMAP.md progress
    3. Add CHANGELOG.md entry
    """)
    
    write_generated_files(docs)
    
    return {
        "success": True,
        "tests_passing": test_result.success,
        "linter_clean": lint_result.success,
        "coverage": coverage_pct
    }
```

## Best Practices

### 1. Leverage Long Context

```python
# Include entire codebase for better understanding
def get_full_context():
    return f"""
Project Standards:
{read_file('AGENTS.md')}

Source Code:
{read_all_files('src/**/*')}

Tests:
{read_all_files('tests/**/*')}

Documentation:
{read_all_files('docs/**/*.md')}
"""
```

### 2. Use Structured Output

```python
prompt = """
Provide response in this JSON format:

```json
{
  "files": [
    {
      "path": "src/feature.rs",
      "content": "...",
      "action": "create" | "modify"
    }
  ],
  "tests": [
    {
      "path": "tests/feature.test.rs",
      "content": "..."
    }
  ],
  "docs": [
    {
      "path": "docs/specs/FEATURE.md",
      "content": "..."
    }
  ]
}
```
"""
```

### 3. Multi-Modal Analysis

```python
def analyze_with_screenshots(code: str, screenshot_paths: list[str]):
    """Analyze code with UI screenshots"""
    
    files = [genai.upload_file(p) for p in screenshot_paths]
    
    prompt = f"""
    Review this UI code against AGENTS.md and the screenshots:
    
    Code:
    ```
    {code}
    ```
    
    Check if implementation matches design in screenshots.
    Verify AGENTS.md standards compliance.
    """
    
    response = model.generate_content([prompt] + files)
    return response.text
```

## Error Handling

```python
def safe_generate(prompt: str, max_retries: int = 3):
    """Generate with retry logic"""
    
    for attempt in range(max_retries):
        try:
            response = model.generate_content(prompt)
            
            # Check for blocked content
            if response.prompt_feedback.block_reason:
                raise Exception(f"Blocked: {response.prompt_feedback.block_reason}")
            
            return response.text
            
        except Exception as e:
            if attempt == max_retries - 1:
                raise
            
            print(f"Attempt {attempt + 1} failed: {e}")
            time.sleep(2 ** attempt)  # Exponential backoff
```

## Advanced Patterns

### 1. Automated PR Review

```python
def review_pr(pr_diff: str, changed_files: dict[str, str]):
    """Review pull request"""
    
    prompt = f"""
    Review this PR against AGENTS.md standards:
    
    Diff:
    ```diff
    {pr_diff}
    ```
    
    Changed files:
    {format_files(changed_files)}
    
    Provide:
    1. Standards compliance check
    2. Code quality review
    3. Security analysis
    4. Test coverage assessment
    5. Specific improvement suggestions
    """
    
    response = model.generate_content(prompt)
    return response.text
```

### 2. Documentation Generator

```python
def generate_api_docs(source_files: dict[str, str]):
    """Generate API documentation"""
    
    prompt = f"""
    Generate comprehensive API documentation following AGENTS.md:
    
    Source:
    {format_files(source_files)}
    
    Include:
    1. API overview
    2. Endpoint documentation
    3. Request/response examples
    4. Error codes
    5. Authentication guide
    6. Rate limiting info
    
    Output in Markdown format.
    """
    
    response = model.generate_content(prompt)
    return response.text
```

## Model Selection

```python
# For complex code generation
model_name = 'gemini-1.5-pro'  # 2M context, best quality

# For quick tasks
model_name = 'gemini-1.5-flash'  # Fast and efficient

# For latest features
model_name = 'gemini-1.5-pro-latest'
```

## Tips for Better Results

1. **Use Long Context**: Include full codebase for better understanding
2. **Enable Caching**: For repeated operations on same context
3. **Structured Output**: Request JSON or specific format
4. **Multi-Modal**: Use diagrams/screenshots when relevant
5. **Function Calling**: Let Gemini run tests and checks
6. **Streaming**: For long generations, use streaming
7. **Safety Settings**: Adjust for code generation (BLOCK_NONE)

<!-- GEMINI:END -->

