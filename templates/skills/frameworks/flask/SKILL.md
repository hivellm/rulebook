---
name: "Flask"
description: "Language: Python"
version: "1.0.0"
category: "frameworks"
author: "Rulebook"
tags: ["frameworks", "framework"]
dependencies: []
conflicts: []
---
<!-- FLASK:START -->
# Flask Framework Rules

**Language**: Python  
**Version**: Flask 3.0+

## Setup

```python
from flask import Flask
app = Flask(__name__)
app.config.from_object('config.ProductionConfig')

# Use Flask-SQLAlchemy for ORM
# Use Flask-Migrate for migrations
# Use Flask-Login for auth
```

## Quality Gates

```bash
black .
ruff check .
pytest --cov=app
```

## Best Practices

✅ Use application factory pattern  
✅ Enable CORS properly  
✅ Use blueprints for organization  
✅ Implement error handlers  

❌ Don't use `debug=True` in production  
❌ Don't store secrets in code  

<!-- FLASK:END -->

