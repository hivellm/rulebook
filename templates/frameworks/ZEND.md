<!-- ZEND:START -->
# Zend/Laminas Framework Rules

**Language**: PHP  
**Version**: Laminas MVC 3.x+

## Setup

```php
// config/modules.config.php
return [
    'Laminas\Router',
    'Application',
];
```

## Quality Gates

```bash
vendor/bin/phpcs --standard=PSR12 src/
vendor/bin/phpstan analyze
vendor/bin/phpunit
```

## Best Practices

✅ Use service manager  
✅ Implement middleware  
✅ Use form validation  

❌ Don't skip CSRF tokens  
❌ Don't expose errors in production  

<!-- ZEND:END -->

