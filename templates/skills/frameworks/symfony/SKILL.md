---
name: "Symfony"
description: "Language: PHP"
version: "1.0.0"
category: "frameworks"
author: "Rulebook"
tags: ["frameworks", "framework"]
dependencies: []
conflicts: []
---
<!-- SYMFONY:START -->
# Symfony Framework Rules

**Language**: PHP  
**Version**: Symfony 6.0+ or 7.0+

## Setup

```yaml
# config/packages/framework.yaml
framework:
    secret: '%env(APP_SECRET)%'
    csrf_protection: true
```

## Quality Gates

```bash
php bin/console lint:twig templates/
php bin/console lint:yaml config/
vendor/bin/phpstan analyze src tests
vendor/bin/phpunit
```

## Best Practices

✅ Use dependency injection  
✅ Follow PSR standards  
✅ Use Doctrine ORM  
✅ Implement security voters  

❌ Don't bypass security  
❌ Don't hardcode routes  

<!-- SYMFONY:END -->

