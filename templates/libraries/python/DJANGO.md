<!-- DJANGO:START -->
# Django Rules

## Conventions
- Use class-based views (`View`, `ListView`, `DetailView`) for CRUD; function-based views only for simple one-off endpoints.
- Define URL patterns in each app's `urls.py` and include them in the root `urls.py` via `include()`.
- Use Django ORM querysets lazily; chain `.filter()`, `.exclude()`, `.select_related()`, `.prefetch_related()` before evaluation.
- Keep business logic in model methods or service modules (`services.py`), not in views or templates.
- Use `django.contrib.auth` for authentication; extend `AbstractBaseUser` or `AbstractUser` rather than a separate profile model when you need custom fields.
- Run migrations with `makemigrations` + `migrate`; never edit migration files by hand except to squash.
- Use `settings.py` split (`base.py` / `production.py` / `local.py`) and `django-environ` or `python-decouple` for secrets.

## Avoid
- Putting raw SQL in views — use the ORM or `Manager` custom querysets.
- Importing settings directly in models; use `django.conf.settings` at call time, not module level.
- Mutating `request.session` outside of view/middleware layers.
- Using `null=True` on string-based fields (`CharField`, `TextField`) — use `blank=True` with an empty string default instead.
<!-- DJANGO:END -->
