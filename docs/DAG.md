# rulebook - Component Dependencies (DAG)

## Overview

This document describes the dependency graph (DAG) between components in rulebook.

## Component Graph

```
Core
  ├── Utils
  ├── Types
  └── Config

Features
  ├── Feature A
  │   └── Core
  └── Feature B
      ├── Core
      └── Feature A
```

## Dependency Rules

1. **No Circular Dependencies**: Components must form a DAG
2. **Layer Separation**: Higher layers depend on lower layers only
3. **Interface Boundaries**: Use interfaces for cross-component communication

## Layer Architecture

### Layer 1: Foundation
- Utils
- Types
- Config

### Layer 2: Core
- Core logic
- Data models
- Base services

### Layer 3: Features
- Feature implementations
- Business logic
- API endpoints

### Layer 4: Presentation
- UI components
- CLI interface
- API controllers

## Verification

Run dependency check:
```bash
# Add your dependency check command here
```

---
*Last Updated: 2025-11-18*
