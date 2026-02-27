---
name: "jQuery"
description: "Language: JavaScript"
version: "1.0.0"
category: "frameworks"
author: "Rulebook"
tags: ["frameworks", "framework"]
dependencies: []
conflicts: []
---
<!-- JQUERY:START -->
# jQuery Framework Rules

**Language**: JavaScript  
**Version**: jQuery 3.x+

## Setup

```html
<script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
```

## Best Practices

✅ Use modern JS alongside jQuery  
✅ Minimize DOM manipulation  
✅ Cache jQuery selectors  
✅ Use event delegation  

❌ Don't use jQuery for everything  
❌ Don't pollute global scope  
❌ Don't skip CSP headers  

## Quality Gates

```bash
eslint src/**/*.js
jest
```

<!-- JQUERY:END -->

