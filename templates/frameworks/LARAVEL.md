<!-- LARAVEL:START -->
# Laravel Framework Rules

**CRITICAL**: Laravel services must respect these conventions and quality checks.

## Quality Commands
- Static analysis: `./vendor/bin/pint --test`
- Lint style: `./vendor/bin/phpcs --standard=PSR12 app/`
- Unit tests: `php artisan test`
- Feature tests: `php artisan test --testsuite=Feature`
- Coverage: ensure `php artisan test --coverage` ≥ 80%

## Project Structure
- Keep HTTP controllers in `app/Http/Controllers`
- Use form requests for validation in `app/Http/Requests`
- Organize business logic in `app/Services`
- Leverage repositories for data persistence where appropriate
- Store queued jobs in `app/Jobs`

## Implementation Guidelines
- Use migrations for every schema change (`php artisan make:migration`)
- Keep Eloquent models lean; move heavy logic into services
- Cache configuration after deployment (`php artisan config:cache`)
- Register scheduled tasks in `app/Console/Kernel.php`
- Ensure `app/Providers` registers new bindings/events

## Composer Hygiene
```bash
composer install --no-dev --prefer-dist
composer dump-autoload
```

## Additional Checks
- Sync `.env.example` whenever new variables are introduced
- Document API changes in `/docs/laravel-api.md`
- Generate API resources via `php artisan make:resource`

<!-- LARAVEL:END -->
