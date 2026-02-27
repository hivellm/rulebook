<!-- PHP:START -->
# PHP Project Rules

## Agent Automation Commands

**CRITICAL**: Execute these commands after EVERY implementation (see AGENT_AUTOMATION module for full workflow).

```bash
# Complete quality check sequence:
./vendor/bin/pint --test  # Format check (Laravel Pint)
# OR: ./vendor/bin/php-cs-fixer fix --dry-run
./vendor/bin/phpstan analyze  # Static analysis
./vendor/bin/phpunit      # All tests (100% pass)
./vendor/bin/phpunit --coverage-text  # Coverage (95%+ required)

# Security audit:
composer audit            # Vulnerability scan
composer outdated         # Check outdated deps
```

## PHP Configuration

**CRITICAL**: Use PHP 8.2+ with strict types enabled.

- **Version**: PHP 8.2+
- **Strict Types**: Enabled
- **Type Hints**: Required for all functions
- **Error Reporting**: E_ALL | E_STRICT

### composer.json Requirements

```json
{
  "name": "your-vendor/your-package",
  "description": "A short description of your package",
  "type": "library",
  "license": "MIT",
  "authors": [
    {
      "name": "Your Name",
      "email": "your.email@example.com"
    }
  ],
  "require": {
    "php": "^8.2"
  },
  "require-dev": {
    "phpunit/phpunit": "^11.0",
    "phpstan/phpstan": "^1.10",
    "squizlabs/php_codesniffer": "^3.8",
    "friendsofphp/php-cs-fixer": "^3.48"
  },
  "autoload": {
    "psr-4": {
      "YourVendor\\YourPackage\\": "src/"
    }
  },
  "autoload-dev": {
    "psr-4": {
      "YourVendor\\YourPackage\\Tests\\": "tests/"
    }
  },
  "scripts": {
    "test": "phpunit",
    "cs-fix": "php-cs-fixer fix",
    "cs-check": "php-cs-fixer fix --dry-run --diff",
    "stan": "phpstan analyse",
    "phpcs": "phpcs src tests"
  },
  "minimum-stability": "stable",
  "prefer-stable": true
}
```

## Code Quality Standards

### Mandatory Quality Checks

**CRITICAL**: After implementing ANY feature, you MUST run these commands in order.

**IMPORTANT**: These commands MUST match your GitHub Actions workflows to prevent CI/CD failures!

```bash
# Pre-Commit Checklist (MUST match .github/workflows/*.yml)

# 1. Format check (matches workflow - use check, not fix!)
composer cs-check

# 2. Static analysis (MUST pass with no errors - matches workflow)
composer stan

# 3. Code style check (matches workflow)
composer phpcs

# 4. Run all tests (MUST pass 100% - matches workflow)
composer test

# 5. Check coverage (MUST meet threshold)
./vendor/bin/phpunit --coverage-text

# If ANY fails: ❌ DO NOT COMMIT - Fix first!
```

**If ANY of these fail, you MUST fix the issues before committing.**

**Why This Matters:**
- CI/CD failures happen when local commands differ from workflows
- Example: Using `cs-fix` locally but `cs-check` in CI = failure
- Example: Missing static analysis locally = CI PHPStan failures

### Code Style

Use PHP-CS-Fixer with PSR-12 standard. Configuration in `.php-cs-fixer.php`:

```php
<?php

declare(strict_types=1);

$finder = PhpCsFixer\Finder::create()
    ->in(__DIR__ . '/src')
    ->in(__DIR__ . '/tests');

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
        '@PHP82Migration' => true,
        'strict_param' => true,
        'array_syntax' => ['syntax' => 'short'],
        'declare_strict_types' => true,
        'native_function_invocation' => ['include' => ['@all']],
        'no_unused_imports' => true,
        'ordered_imports' => ['sort_algorithm' => 'alpha'],
        'phpdoc_align' => true,
        'phpdoc_order' => true,
        'trailing_comma_in_multiline' => ['elements' => ['arrays']],
    ])
    ->setFinder($finder);
```

### Static Analysis

Use PHPStan at maximum level. Configuration in `phpstan.neon`:

```neon
parameters:
    level: max
    paths:
        - src
        - tests
    excludePaths:
        - tests/Fixtures/*
    checkMissingIterableValueType: true
    checkGenericClassInNonGenericObjectType: true
    reportUnmatchedIgnoredErrors: true
```

### Testing

- **Framework**: PHPUnit 11+
- **Location**: `tests/` directory
- **Coverage**: XDebug or PCOV
- **Coverage Threshold**: 95%+

Configuration in `phpunit.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true"
         failOnRisky="true"
         failOnWarning="true"
         cacheDirectory=".phpunit.cache">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>
    <source>
        <include>
            <directory>src</directory>
        </include>
    </source>
    <coverage>
        <report>
            <html outputDirectory="coverage"/>
            <text outputFile="php://stdout"/>
        </report>
    </coverage>
</phpunit>
```

Example test:

```php
<?php

declare(strict_types=1);

namespace YourVendor\YourPackage\Tests;

use PHPUnit\Framework\TestCase;
use YourVendor\YourPackage\MyClass;

final class MyClassTest extends TestCase
{
    public function testProcessValidInput(): void
    {
        $myClass = new MyClass();
        $result = $myClass->process('hello');
        
        $this->assertSame('HELLO', $result);
    }

    public function testProcessEmptyInputThrowsException(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Input cannot be empty');
        
        $myClass = new MyClass();
        $myClass->process('');
    }
}
```

### Type Declarations

- Use strict types in all files
- Type hint all parameters and return types
- Use union types and nullable types appropriately

Example:

```php
<?php

declare(strict_types=1);

namespace YourVendor\YourPackage;

use InvalidArgumentException;

final class DataProcessor
{
    /**
     * Process the input data and return the result.
     *
     * @param string $input The input to process
     * @return string The processed output
     * @throws InvalidArgumentException If input is empty
     */
    public function process(string $input): string
    {
        if ($input === '') {
            throw new InvalidArgumentException('Input cannot be empty');
        }

        return strtoupper($input);
    }

    /**
     * Find a value in the data.
     *
     * @param array<string, mixed> $data
     * @param string $key
     * @return mixed|null
     */
    public function findValue(array $data, string $key): mixed
    {
        return $data[$key] ?? null;
    }

    /**
     * Process multiple items.
     *
     * @param list<string> $items
     * @return list<string>
     */
    public function processMany(array $items): array
    {
        return array_map(
            fn (string $item): string => $this->process($item),
            $items
        );
    }
}
```

## Documentation

- Use PHPDoc blocks for all public methods
- Include `@param`, `@return`, `@throws` tags
- Use generics annotations for arrays

Example:

```php
<?php

declare(strict_types=1);

namespace YourVendor\YourPackage;

/**
 * Service for managing user data.
 *
 * This class provides methods for creating, updating, and retrieving user information.
 */
final class UserService
{
    /**
     * Find a user by ID.
     *
     * @param positive-int $userId The user ID
     * @return array{id: int, name: string, email: string}|null User data or null if not found
     */
    public function findById(int $userId): ?array
    {
        // Implementation
    }

    /**
     * Get all users.
     *
     * @return list<array{id: int, name: string, email: string}>
     */
    public function getAll(): array
    {
        // Implementation
    }
}
```

## Project Structure

```
project/
├── composer.json           # Composer configuration
├── phpunit.xml             # PHPUnit configuration
├── phpstan.neon            # PHPStan configuration
├── .php-cs-fixer.php       # PHP-CS-Fixer configuration
├── README.md               # Project overview (allowed in root)
├── CHANGELOG.md            # Version history (allowed in root)
├── LICENSE                 # Project license (allowed in root)
├── src/
│   └── YourClass.php
├── tests/
│   ├── Unit/
│   └── Integration/
└── docs/                   # Project documentation
```

## CI/CD Requirements

Must include GitHub Actions workflows for:

1. **Testing** (`php-test.yml`):
   - Test on ubuntu-latest, windows-latest
   - Test on PHP 8.2, 8.3
   - Upload coverage reports

2. **Linting** (`php-lint.yml`):
   - PHPStan: `composer stan`
   - PHP-CS-Fixer: `composer cs-check`
   - PHPCS: `composer phpcs`

## Package Publication

### Publishing to Packagist

**Prerequisites:**
1. Create account at https://packagist.org
2. Submit your package (automatic sync with GitHub)
3. Configure webhook in GitHub for auto-updates

**Publishing Workflow:**

1. Update version in composer.json (optional, uses git tags)
2. Update CHANGELOG.md
3. Run quality checks:
   ```bash
   composer cs-fix
   composer stan
   composer test
   ```

4. Create git tag: `git tag v1.0.0 && git push --tags`
5. Packagist automatically updates from GitHub
6. Package available at: `https://packagist.org/packages/your-vendor/your-package`

**Publishing Checklist:**

- ✅ All tests passing
- ✅ PHPStan at max level passes
- ✅ Code style conforms to PSR-12
- ✅ CHANGELOG.md updated
- ✅ README.md up to date
- ✅ LICENSE file present
- ✅ composer.json metadata complete
- ✅ GitHub repository public
- ✅ Webhook configured on Packagist

**Semantic Versioning:**

Packagist uses git tags for versions:
- Tag format: `v1.0.0`
- Follows [SemVer](https://semver.org/)
- Composer constraints: `^1.0`, `~1.0`, `1.0.*`

<!-- PHP:END -->

