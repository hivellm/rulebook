<!-- PHP:START -->
# PHP rules

## Non-negotiables

1. PHP 8.2+ with `declare(strict_types=1);` in every file — no exceptions.
2. PHPStan at `level: max` must pass before commit; never suppress with `@phpstan-ignore` to hide real errors.
3. PSR-12 style via PHP-CS-Fixer (or Laravel Pint); run the *check* variant locally to match CI (`cs-check`, not `cs-fix`).
4. All parameters and return types must be type-hinted; use union/nullable types instead of untyped `mixed` where possible.
5. `composer audit` after dependency changes.
6. Tests 100% pass, coverage ≥95% before commit.

## Conventions

- PSR-4 autoloading: `src/` → package namespace, `tests/` → `Tests\` namespace, declared in `composer.json`.
- Classes `final` by default; open for extension only deliberately.
- PHPDoc generics for arrays: `array<string, mixed>`, `list<string>`, shapes `array{id: int, name: string}` — PHPStan reads these.
- Composer scripts as the command surface: `composer test`, `composer stan`, `composer cs-check`.
- `@throws` tags on public methods that throw; throw specific SPL exceptions, not `\Exception`.
- Root config files: `composer.json`, `phpunit.xml`, `phpstan.neon`, `.php-cs-fixer.php`.

## Testing

- PHPUnit 11+; test classes `final`, in `tests/Unit/` and `tests/Integration/` suites.
- Prefer `assertSame` over `assertEquals` (strict comparison).
- Coverage via Xdebug or PCOV; `phpunit --coverage-text` gates ≥95%.
- Set `failOnRisky` and `failOnWarning` in `phpunit.xml`.

## Build & tooling

- Order per iteration: format check → `phpstan analyse` → `phpunit`. Static analysis before tests.
- Local commands MUST match GitHub Actions workflows exactly — divergence (e.g. `cs-fix` local vs `cs-check` CI) is the top CI-failure cause.
- CI matrix: PHP 8.2 + 8.3, ubuntu + windows.
- Publish via Packagist: git tags `v1.0.0` (SemVer), GitHub webhook auto-sync; no version field needed in `composer.json`.
<!-- PHP:END -->
