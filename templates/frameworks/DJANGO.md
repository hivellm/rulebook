<!-- DJANGO:START -->
# Django Framework Rules

**Language**: Python  
**Version**: Django 4.2+ (LTS) or 5.0+

## Setup & Configuration

```python
# settings.py
SECRET_KEY = env('SECRET_KEY')  # Never hardcode
DEBUG = env.bool('DEBUG', default=False)
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS')

INSTALLED_APPS = [
    # Django apps
    'django.contrib.admin',
    'django.contrib.auth',
    # Third-party
    'rest_framework',
    'corsheaders',
    # Local apps
    'apps.users',
]

DATABASES = {
    'default': env.db('DATABASE_URL')  # Use django-environ
}
```

## Quality Gates

```bash
# Code quality
black .                          # Format
ruff check .                     # Lint
mypy .                          # Type check

# Tests
python manage.py test            # Run tests
pytest --cov=apps --cov-report=html  # With coverage

# Security
python manage.py check --deploy  # Production checks
bandit -r apps/                  # Security scan
```

## Best Practices

✅ **DO:**
- Use Class-Based Views (CBVs) or Django REST Framework ViewSets
- Implement custom User model from start
- Use Django ORM properly (select_related, prefetch_related)
- Enable CSRF protection
- Use environment variables for secrets
- Write tests for views, models, and forms

❌ **DON'T:**
- Use `DEBUG=True` in production
- Store secrets in settings.py
- Use raw SQL without parameterization
- Skip migrations
- Ignore security middleware

## Project Structure

```
project/
├── manage.py
├── requirements.txt
├── apps/
│   ├── users/
│   ├── api/
│   └── core/
├── config/
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
└── tests/
```

<!-- DJANGO:END -->

