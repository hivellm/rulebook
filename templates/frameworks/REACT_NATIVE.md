<!-- REACT_NATIVE:START -->
# React Native Framework Rules

**Language**: JavaScript, TypeScript  
**Version**: React Native 0.72+

## Setup

```bash
npx react-native init MyApp --template react-native-template-typescript
```

## Quality Gates

```bash
npm run lint
npm run type-check
npm test
npm run android  # Test build
npm run ios      # Test build
```

## Best Practices

✅ Use TypeScript  
✅ Implement proper navigation (React Navigation)  
✅ Use platform-specific code when needed  
✅ Optimize images and assets  
✅ Test on both iOS and Android  

❌ Don't hardcode dimensions  
❌ Don't skip accessibility  
❌ Don't ignore memory leaks  

## Project Structure

```
src/
├── components/
├── screens/
├── navigation/
├── services/
└── utils/
```

<!-- REACT_NATIVE:END -->

