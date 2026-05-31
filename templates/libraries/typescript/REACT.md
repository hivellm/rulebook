<!-- REACT:START -->
# React Rules

## Conventions
- Use function components with hooks exclusively; never write class components in new code
- Co-locate state as close to the consumer as possible; lift only when two or more siblings need it
- Derive computed values inline or with `useMemo` — avoid storing derived state in `useState`
- Stabilize callbacks passed to children with `useCallback` to prevent unnecessary re-renders
- Use the `key` prop on list items with stable, unique IDs — never array indices for dynamic lists
- Prefer `useReducer` over multiple `useState` calls when state transitions have logic dependencies
- Type component props with explicit interfaces; avoid `React.FC` — declare return type as `React.ReactElement` when needed

## Avoid
- Mutating state directly — always return a new reference from `setState` / reducer
- Triggering side effects during render (network calls, subscriptions outside `useEffect`)
- Overusing `useEffect` for data that can be derived synchronously
- Reading stale closure values — include all referenced variables in the `useEffect` dependency array
<!-- REACT:END -->
