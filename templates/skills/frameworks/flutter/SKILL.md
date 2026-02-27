---
name: "Flutter"
description: "Language: Dart"
version: "1.0.0"
category: "frameworks"
author: "Rulebook"
tags: ["frameworks", "framework"]
dependencies: []
conflicts: []
---
<!-- FLUTTER:START -->
# Flutter Framework Rules

**Language**: Dart  
**Version**: Flutter 3.10+

## Setup

```yaml
# pubspec.yaml
dependencies:
  flutter:
    sdk: flutter
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^2.0.0
```

## Quality Gates

```bash
dart format --set-exit-if-changed .
dart analyze --fatal-infos
flutter test
flutter build apk --release  # Test build
```

## Best Practices

✅ Use StatelessWidget when possible  
✅ Implement proper state management (Provider, Riverpod, Bloc)  
✅ Use const constructors  
✅ Optimize widget rebuilds  
✅ Test on multiple devices  

❌ Don't use `print()` in production  
❌ Don't skip null safety  
❌ Don't ignore platform differences  

## Project Structure

```
lib/
├── main.dart
├── models/
├── screens/
├── widgets/
└── services/
```

<!-- FLUTTER:END -->

