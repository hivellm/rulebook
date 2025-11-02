<!-- DART:START -->
# Dart Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
dart format --set-exit-if-changed .  # Format check
dart analyze --fatal-infos  # Linting + analysis
dart test                   # All tests (100% pass)
dart test --coverage=coverage  # Coverage check

# Security audit:
dart pub outdated           # Check outdated deps
```

## Dart Configuration

**CRITICAL**: Use Dart 3.0+ with sound null safety and strict analysis.

- **Version**: Dart 3.0+
- **Recommended**: Dart 3.3+
- **Null Safety**: Sound null safety required
- **Analysis**: dart analyze with strict mode
- **Testing**: package:test

### pubspec.yaml Requirements

```yaml
name: your_package
description: A comprehensive package description
version: 0.1.0
homepage: https://github.com/you/your_package

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  http: ^1.1.0
  
dev_dependencies:
  test: ^1.24.0
  lints: ^3.0.0
  coverage: ^1.7.0
  dart_code_metrics: ^5.7.0
```

### analysis_options.yaml Requirements

```yaml
include: package:lints/recommended.yaml

analyzer:
  language:
    strict-casts: true
    strict-inference: true
    strict-raw-types: true
  
  errors:
    invalid_annotation_target: error
    missing_required_param: error
    missing_return: error
  
  exclude:
    - build/**
    - .dart_tool/**

linter:
  rules:
    - always_declare_return_types
    - always_require_non_null_named_parameters
    - avoid_print
    - avoid_relative_lib_imports
    - avoid_returning_null_for_void
    - avoid_slow_async_io
    - avoid_types_as_parameter_names
    - cancel_subscriptions
    - close_sinks
    - prefer_const_constructors
    - prefer_final_fields
    - prefer_final_locals
    - sort_constructors_first
    - unawaited_futures
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use --set-exit-if-changed!)
dart format --set-exit-if-changed --line-length 100 .

# 2. Analyze (MUST pass with no issues - matches workflow)
dart analyze --fatal-infos --fatal-warnings

# 3. Run all tests (MUST pass 100% - matches workflow)
dart test

# 4. Check coverage (MUST meet threshold - matches workflow)
dart test --coverage=coverage
dart pub global activate coverage
dart pub global run coverage:format_coverage \
  --lcov --in=coverage --out=coverage/lcov.info --report-on=lib

# 5. Metrics check (matches workflow)
dart pub global activate dart_code_metrics
dart pub global run dart_code_metrics:metrics analyze lib

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- Running different commands locally than in CI causes "works on my machine" failures  
- CI/CD workflows will fail if commands don't match
- Example: Using `dart format .` locally but `dart format --set-exit-if-changed` in CI = failure
- Example: Missing `--fatal-infos` flag = warnings pass locally but fail in CI

### Testing

- **Framework**: package:test
- **Location**: `/test` directory
- **Coverage**: package:coverage (80%+ threshold)
- **Naming**: test files must end with `_test.dart`

Example test structure:
```dart
import 'package:test/test.dart';
import 'package:your_package/your_package.dart';

void main() {
  group('DataProcessor', () {
    late DataProcessor processor;
    
    setUp(() {
      processor = DataProcessor(threshold: 0.5);
    });
    
    tearDown(() {
      // Cleanup
    });
    
    test('processes valid input correctly', () {
      final input = [1, 2, 3, 4, 5];
      final result = processor.process(input);
      
      expect(result, isNotEmpty);
      expect(result.length, greaterThan(0));
    });
    
    test('handles empty input', () {
      final result = processor.process([]);
      expect(result, isEmpty);
    });
    
    test('throws on null input', () {
      expect(
        () => processor.process(null as List<int>),
        throwsA(isA<ArgumentError>()),
      );
    });
  });
  
  group('Validator', () {
    test('validates correct data', () {
      expect(Validator.isValid('test'), isTrue);
    });
    
    test('rejects invalid data', () {
      expect(Validator.isValid(''), isFalse);
    });
  });
}
```

## Null Safety

- **REQUIRED**: Sound null safety for all code
- Use `?` for nullable types
- Use `!` operator sparingly
- Prefer null-aware operators

Example:
```dart
// ✅ GOOD: Proper null safety
class User {
  final String id;
  final String name;
  final String? email;  // Nullable
  final int? age;       // Nullable
  
  User({
    required this.id,
    required this.name,
    this.email,
    this.age,
  });
  
  String getDisplayName() {
    return email != null ? '$name <$email>' : name;
  }
  
  int getAgeOrDefault() => age ?? 0;
}

// ❌ BAD: Unsafe null handling
class User {
  String id;
  String name;
  String email;  // Should be nullable but isn't
  
  User(this.id, this.name, this.email);
  
  String getDisplayName() {
    return '$name <$email>';  // Crash if email is null!
  }
}
```

## Async Programming

- Always use `async`/`await`
- Handle Future errors with try/catch
- Use `unawaited()` to mark intentionally unawaited futures

Example:
```dart
// ✅ GOOD: Proper async handling
Future<List<User>> fetchUsers() async {
  try {
    final response = await http.get(Uri.parse('https://api.example.com/users'));
    
    if (response.statusCode != 200) {
      throw HttpException('Failed to load users: ${response.statusCode}');
    }
    
    final List<dynamic> data = jsonDecode(response.body);
    return data.map((json) => User.fromJson(json)).toList();
  } catch (e) {
    print('Error fetching users: $e');
    rethrow;
  }
}

// ❌ BAD: No error handling
Future<List<User>> fetchUsers() async {
  final response = await http.get(Uri.parse('https://api.example.com/users'));
  final List<dynamic> data = jsonDecode(response.body);  // Could crash!
  return data.map((json) => User.fromJson(json)).toList();
}
```

## Best Practices

### DO's ✅

- **USE** sound null safety
- **USE** const constructors when possible
- **PREFER** final for variables
- **DOCUMENT** public APIs
- **HANDLE** errors explicitly
- **TEST** all code paths
- **USE** meaningful names
- **FOLLOW** dart_style guidelines

### DON'Ts ❌

- **NEVER** use `dynamic` unless absolutely necessary
- **NEVER** suppress analyzer warnings without justification
- **NEVER** use `print()` in production code (use logging)
- **NEVER** ignore lint warnings
- **NEVER** use deprecated APIs
- **NEVER** commit with failing tests
- **NEVER** use `!` operator without null check

## CI/CD Requirements

Must include GitHub Actions workflows:

1. **Testing** (`dart-test.yml`):
   - Test on ubuntu-latest, windows-latest, macos-latest
   - Dart versions: stable, beta
   - Upload coverage

2. **Linting** (`dart-lint.yml`):
   - dart format --set-exit-if-changed
   - dart analyze --fatal-infos --fatal-warnings

3. **Build** (`dart-build.yml`):
   - dart compile exe (for CLI apps)
   - Verify output artifacts

## Publishing to pub.dev

### Prerequisites

1. Create account at https://pub.dev
2. Run `dart pub login`
3. Verify package name available

### Publishing Workflow

```bash
# 1. Update version in pubspec.yaml
# 2. Update CHANGELOG.md
# 3. Run all quality checks
dart format --set-exit-if-changed .
dart analyze --fatal-infos --fatal-warnings
dart test

# 4. Dry run
dart pub publish --dry-run

# 5. Publish
dart pub publish

# 6. Create git tag
git tag -a v1.0.0 -m "Release 1.0.0"
```

<!-- DART:END -->

