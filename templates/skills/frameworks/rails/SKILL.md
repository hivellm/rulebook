---
name: "Rails"
description: "Language: Ruby"
version: "1.0.0"
category: "frameworks"
author: "Rulebook"
tags: ["frameworks", "framework"]
dependencies: []
conflicts: []
---
<!-- RAILS:START -->
# Ruby on Rails Framework Rules

**Language**: Ruby  
**Version**: Rails 7.0+

## Setup & Configuration

```ruby
# config/database.yml
production:
  url: <%= ENV['DATABASE_URL'] %>

# config/environments/production.rb
config.force_ssl = true
config.log_level = :info
```

## Quality Gates

```bash
# Code quality
bundle exec rubocop             # Lint
bundle exec brakeman           # Security scan

# Tests
bundle exec rspec              # Run tests
bundle exec rspec --format documentation  # Verbose

# Type check (optional)
bundle exec steep check        # Static typing
```

## Best Practices

✅ **DO:**
- Use strong parameters
- Implement authentication (Devise/custom)
- Use ActiveRecord callbacks sparingly
- Write RSpec/Minitest tests
- Use database migrations
- Enable CSRF protection

❌ **DON'T:**
- Skip validations in models
- Use `params` without permit
- Store secrets in code
- Skip database indexes
- Ignore N+1 queries

## Project Structure

```
app/
├── controllers/
├── models/
├── views/
├── jobs/
└── mailers/
config/
db/
spec/
```

<!-- RAILS:END -->

