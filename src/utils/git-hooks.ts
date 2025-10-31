import { access, mkdir, writeFile, unlink } from 'fs/promises';
import path from 'path';
import { LanguageDetection } from '../types.js';

export interface HookGenerationOptions {
  languages: LanguageDetection[];
  cwd: string;
}

export async function installGitHooks(options: HookGenerationOptions): Promise<void> {
  const { languages, cwd } = options;

  const gitDir = path.join(cwd, '.git');
  try {
    await access(gitDir);
  } catch {
    throw new Error('Git repository not initialized. Run "git init" before installing hooks.');
  }

  const hooksDir = path.join(gitDir, 'hooks');

  // Ensure hooks directory exists
  await mkdir(hooksDir, { recursive: true });

  // Generate and install pre-commit hook
  const preCommitContent = generatePreCommitHook(languages);
  const preCommitPath = path.join(hooksDir, 'pre-commit');
  await writeFile(preCommitPath, preCommitContent, { mode: 0o755 });

  // Generate and install pre-push hook
  const prePushContent = generatePrePushHook(languages);
  const prePushPath = path.join(hooksDir, 'pre-push');
  await writeFile(prePushPath, prePushContent, { mode: 0o755 });
}

function generatePreCommitHook(languages: LanguageDetection[]): string {
  const checks: string[] = [];
  
  for (const lang of languages) {
    switch (lang.language) {
      case 'typescript':
      case 'javascript':
        checks.push(`
# TypeScript/JavaScript checks
if [ -f "package.json" ]; then
  echo "🔍 Running TypeScript/JavaScript checks..."
  
  # Type check
  if grep -q '"type-check"' package.json; then
    npm run type-check || exit 1
  fi
  
  # Lint
  if grep -q '"lint"' package.json; then
    npm run lint || exit 1
  fi
  
  # Tests
  if grep -q '"test"' package.json; then
    npm test || exit 1
  fi
fi`);
        break;
        
      case 'rust':
        checks.push(`
# Rust checks
if [ -f "Cargo.toml" ]; then
  echo "🔍 Running Rust checks..."
  
  # Format check
  cargo fmt --all -- --check || exit 1
  
  # Clippy
  cargo clippy --all-targets --all-features -- -D warnings || exit 1
  
  # Tests
  cargo test --all-features || exit 1
fi`);
        break;
        
      case 'python':
        checks.push(`
# Python checks
if [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
  echo "🔍 Running Python checks..."
  
  # Format check
  if command -v black &> /dev/null; then
    black --check . || exit 1
  fi
  
  # Lint
  if command -v ruff &> /dev/null; then
    ruff check . || exit 1
  elif command -v flake8 &> /dev/null; then
    flake8 . || exit 1
  fi
  
  # Type check
  if command -v mypy &> /dev/null; then
    mypy . || exit 1
  fi
  
  # Tests
  if command -v pytest &> /dev/null; then
    pytest || exit 1
  fi
fi`);
        break;
        
      case 'go':
        checks.push(`
# Go checks
if [ -f "go.mod" ]; then
  echo "🔍 Running Go checks..."
  
  # Format check
  if [ "$(gofmt -l . | wc -l)" -gt 0 ]; then
    echo "❌ Go files not formatted. Run: gofmt -w ."
    exit 1
  fi
  
  # Vet
  go vet ./... || exit 1
  
  # Tests
  go test ./... || exit 1
fi`);
        break;
        
      case 'java':
        checks.push(`
# Java checks
if [ -f "pom.xml" ]; then
  echo "🔍 Running Maven checks..."
  mvn verify || exit 1
elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
  echo "🔍 Running Gradle checks..."
  ./gradlew check || exit 1
fi`);
        break;
        
      case 'csharp':
        checks.push(`
# C# checks
if [ -f "*.csproj" ] || [ -f "*.sln" ]; then
  echo "🔍 Running .NET checks..."
  dotnet format --verify-no-changes || exit 1
  dotnet test || exit 1
fi`);
        break;
        
      case 'php':
        checks.push(`
# PHP checks
if [ -f "composer.json" ]; then
  echo "🔍 Running PHP checks..."
  
  # Format & Lint
  if command -v php-cs-fixer &> /dev/null; then
    php-cs-fixer fix --dry-run --diff || exit 1
  fi
  
  if command -v phpstan &> /dev/null; then
    phpstan analyze || exit 1
  fi
  
  # Tests
  if command -v phpunit &> /dev/null; then
    phpunit || exit 1
  fi
fi`);
        break;
        
      case 'ruby':
        checks.push(`
# Ruby checks
if [ -f "Gemfile" ]; then
  echo "🔍 Running Ruby checks..."
  
  # Lint
  if command -v rubocop &> /dev/null; then
    rubocop || exit 1
  fi
  
  # Tests
  if command -v rspec &> /dev/null; then
    bundle exec rspec || exit 1
  fi
fi`);
        break;
        
      case 'elixir':
        checks.push(`
# Elixir checks
if [ -f "mix.exs" ]; then
  echo "🔍 Running Elixir checks..."
  
  # Format check
  mix format --check-formatted || exit 1
  
  # Lint
  mix credo --strict || exit 1
  
  # Tests
  mix test || exit 1
fi`);
        break;
        
      case 'swift':
        checks.push(`
# Swift checks
if [ -f "Package.swift" ]; then
  echo "🔍 Running Swift checks..."
  
  # Format & Lint
  if command -v swiftlint &> /dev/null; then
    swiftlint || exit 1
  fi
  
  # Tests
  swift test || exit 1
fi`);
        break;
        
      case 'kotlin':
        checks.push(`
# Kotlin checks
if [ -f "build.gradle.kts" ]; then
  echo "🔍 Running Kotlin checks..."
  
  # Lint
  ./gradlew ktlintCheck || exit 1
  ./gradlew detekt || exit 1
  
  # Tests
  ./gradlew test || exit 1
fi`);
        break;
        
      case 'scala':
        checks.push(`
# Scala checks
if [ -f "build.sbt" ]; then
  echo "🔍 Running Scala checks..."
  
  # Format check
  sbt scalafmtCheckAll || exit 1
  
  # Tests
  sbt test || exit 1
fi`);
        break;
        
      case 'dart':
        checks.push(`
# Dart checks
if [ -f "pubspec.yaml" ]; then
  echo "🔍 Running Dart checks..."
  
  # Format check
  dart format --set-exit-if-changed . || exit 1
  
  # Analyze
  dart analyze --fatal-infos || exit 1
  
  # Tests
  dart test || exit 1
fi`);
        break;
        
      case 'erlang':
        checks.push(`
# Erlang checks
if [ -f "rebar.config" ]; then
  echo "🔍 Running Erlang checks..."
  
  # Format check
  rebar3 format --verify || exit 1
  
  # Dialyzer
  rebar3 dialyzer || exit 1
  
  # Tests
  rebar3 eunit || exit 1
fi`);
        break;
        
      case 'haskell':
        checks.push(`
# Haskell checks
if [ -f "stack.yaml" ] || [ -f "*.cabal" ]; then
  echo "🔍 Running Haskell checks..."
  
  # Lint
  if command -v hlint &> /dev/null; then
    hlint . || exit 1
  fi
  
  # Tests
  if [ -f "stack.yaml" ]; then
    stack test || exit 1
  else
    cabal test || exit 1
  fi
fi`);
        break;
    }
  }
  
  // Default fallback if no specific language detected
  if (checks.length === 0) {
    checks.push(`
# Generic checks
echo "🔍 Running generic checks..."

# Try common test commands
if [ -f "package.json" ] && grep -q '"test"' package.json; then
  npm test || exit 1
elif [ -f "Makefile" ]; then
  make test || exit 1
fi`);
  }
  
  return `#!/bin/sh
# Generated by Rulebook - Pre-commit hook
# Runs quality checks before allowing commits

echo "🚀 Running pre-commit checks..."
${checks.join('\n')}

echo "✅ All pre-commit checks passed!"
exit 0
`;
}

function generatePrePushHook(languages: LanguageDetection[]): string {
  const checks: string[] = [];
  
  for (const lang of languages) {
    switch (lang.language) {
      case 'typescript':
      case 'javascript':
        checks.push(`
# TypeScript/JavaScript checks
if [ -f "package.json" ]; then
  echo "🔍 Running TypeScript/JavaScript checks..."
  
  # Full test suite
  if grep -q '"test"' package.json; then
    npm test || exit 1
  fi
  
  # Build
  if grep -q '"build"' package.json; then
    npm run build || exit 1
  fi
fi`);
        break;
        
      case 'rust':
        checks.push(`
# Rust checks
if [ -f "Cargo.toml" ]; then
  echo "🔍 Running Rust checks..."
  
  # Full test suite
  cargo test --all-features || exit 1
  
  # Build release
  cargo build --release || exit 1
fi`);
        break;
        
      case 'python':
        checks.push(`
# Python checks
if [ -f "pyproject.toml" ] || [ -f "setup.py" ] || [ -f "requirements.txt" ]; then
  echo "🔍 Running Python checks..."
  
  # Full test suite
  if command -v pytest &> /dev/null; then
    pytest || exit 1
  fi
  
  # Build/package check
  if [ -f "setup.py" ]; then
    python setup.py check || exit 1
  fi
fi`);
        break;
        
      case 'go':
        checks.push(`
# Go checks
if [ -f "go.mod" ]; then
  echo "🔍 Running Go checks..."
  
  # Full test suite
  go test ./... || exit 1
  
  # Build
  go build ./... || exit 1
fi`);
        break;
        
      case 'java':
        checks.push(`
# Java checks
if [ -f "pom.xml" ]; then
  echo "🔍 Running Maven checks..."
  mvn clean package || exit 1
elif [ -f "build.gradle" ] || [ -f "build.gradle.kts" ]; then
  echo "🔍 Running Gradle checks..."
  ./gradlew clean build || exit 1
fi`);
        break;
        
      case 'csharp':
        checks.push(`
# C# checks
if [ -f "*.csproj" ] || [ -f "*.sln" ]; then
  echo "🔍 Running .NET checks..."
  dotnet build -c Release || exit 1
fi`);
        break;
        
      case 'php':
        checks.push(`
# PHP checks
if [ -f "composer.json" ]; then
  echo "🔍 Running PHP checks..."
  if command -v phpunit &> /dev/null; then
    phpunit || exit 1
  fi
fi`);
        break;
        
      case 'ruby':
        checks.push(`
# Ruby checks
if [ -f "Gemfile" ]; then
  echo "🔍 Running Ruby checks..."
  if command -v rspec &> /dev/null; then
    bundle exec rspec || exit 1
  fi
fi`);
        break;
        
      case 'elixir':
        checks.push(`
# Elixir checks
if [ -f "mix.exs" ]; then
  echo "🔍 Running Elixir checks..."
  mix test || exit 1
  mix release || exit 1
fi`);
        break;
        
      case 'swift':
        checks.push(`
# Swift checks
if [ -f "Package.swift" ]; then
  echo "🔍 Running Swift checks..."
  swift test || exit 1
  swift build -c release || exit 1
fi`);
        break;
        
      case 'kotlin':
        checks.push(`
# Kotlin checks
if [ -f "build.gradle.kts" ]; then
  echo "🔍 Running Kotlin checks..."
  ./gradlew clean build || exit 1
fi`);
        break;
        
      case 'scala':
        checks.push(`
# Scala checks
if [ -f "build.sbt" ]; then
  echo "🔍 Running Scala checks..."
  sbt clean compile test || exit 1
fi`);
        break;
        
      case 'dart':
        checks.push(`
# Dart checks
if [ -f "pubspec.yaml" ]; then
  echo "🔍 Running Dart checks..."
  dart test || exit 1
fi`);
        break;
        
      case 'erlang':
        checks.push(`
# Erlang checks
if [ -f "rebar.config" ]; then
  echo "🔍 Running Erlang checks..."
  rebar3 compile || exit 1
  rebar3 eunit || exit 1
  rebar3 ct || exit 1
fi`);
        break;
        
      case 'haskell':
        checks.push(`
# Haskell checks
if [ -f "stack.yaml" ] || [ -f "*.cabal" ]; then
  echo "🔍 Running Haskell checks..."
  if [ -f "stack.yaml" ]; then
    stack test || exit 1
    stack build || exit 1
  else
    cabal test || exit 1
    cabal build || exit 1
  fi
fi`);
        break;
    }
  }
  
  // Default fallback
  if (checks.length === 0) {
    checks.push(`
# Generic checks
echo "🔍 Running generic checks..."

# Try common build commands
if [ -f "package.json" ] && grep -q '"build"' package.json; then
  npm run build || exit 1
elif [ -f "Makefile" ]; then
  make build || exit 1
fi`);
  }
  
  return `#!/bin/sh
# Generated by Rulebook - Pre-push hook
# Runs comprehensive checks before allowing push

echo "🚀 Running pre-push checks..."
${checks.join('\n')}

echo "✅ All pre-push checks passed!"
exit 0
`;
}

export async function uninstallGitHooks(cwd: string): Promise<void> {
  const hooksDir = path.join(cwd, '.git', 'hooks');
  
  try {
    await unlink(path.join(hooksDir, 'pre-commit'));
  } catch (error) {
    // Ignore if file doesn't exist
  }
  
  try {
    await unlink(path.join(hooksDir, 'pre-push'));
  } catch (error) {
    // Ignore if file doesn't exist
  }
}

