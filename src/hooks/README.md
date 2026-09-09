# Hooks — Data-Fetching Patterns

This directory contains reusable hooks for data fetching, eliminating boilerplate state management from screens.

## The Pattern

### ❌ Before (Old Pattern - 30+ lines of boilerplate)

```jsx
const TasksScreen = ({ userId }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ProjectService.getMyTasks(userId);
      setTasks(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  if (loading) return <ActivityIndicator />;
  if (error) return <ErrorScreen message={error} onRetry={load} />;

  return (
    <FlatList
      data={tasks}
      onRefresh={onRefresh}
      refreshing={refreshing}
      renderItem={...}
    />
  );
};
```

### ✅ After (New Pattern - 8 lines!)

```jsx
const TasksScreen = ({ userId }) => {
  const { tasks, loading, error, refreshing, refresh } = useTasks(userId);

  if (loading) return <ActivityIndicator />;
  if (error) return <ErrorScreen message={error} onRetry={refresh} />;

  return (
    <FlatList data={tasks} onRefresh={refresh} refreshing={refreshing} renderItem={...} />
  );
};
```

**That's a 75% reduction in boilerplate!**

---

## Available Hooks

### useQuery (Foundation)
Universal data-fetching hook for any async operation.

```js
const { data, loading, error, refreshing, refresh, reload } = useQuery(
  'cache-key',
  async () => { /* fetch function */ },
  [dependencies]
);
```

**Returns:**
- `data` — The fetched data
- `loading` — Initial load in progress (blocks UI)
- `error` — Error message string (null if no error)
- `refreshing` — Pull-to-refresh in progress (shows spinner but doesn't block)
- `refresh()` — Trigger pull-to-refresh
- `reload()` — Hard reset and reload (clears data first)

---

### useTasks
Fetch tasks assigned to a user.

```js
const { tasks, loading, error, refreshing, refresh } = useTasks(userId);
const { tasks, loading } = useTasks(userId, { limit: 50 });
```

---

### useDashboard
Fetch aggregated dashboard data (stats, tasks, projects, contacts).

```js
const { stats, tasks, projects, contacts, loading, error, refreshing, refresh } = useDashboard(userId);
```

**Returns individual properties:**
- `stats` — `{ total, open, overdue, projects }`
- `tasks` — Task[]
- `projects` — Project[]
- `contacts` — Contact[]
- `loading`, `error`, `refreshing`, `refresh` — Standard

---

### useContacts
Fetch contacts with optional search/filtering.

```js
const { contacts, loading, error, refreshing, refresh } = useContacts();
const { contacts, loading } = useContacts({ search: 'john', type: 'person', limit: 50 });
```

---

### useTeamMembers
Fetch team members (with task counts and avatars).

```js
const { members, loading, error, refreshing, refresh } = useTeamMembers();
```

---

### useProjects
Fetch projects.

```js
const { projects, loading, error, refreshing, refresh } = useProjects();
const { projects, loading } = useProjects({ limit: 50 });
```

---

## Pattern: Error Handling

All hooks support error handling:

```jsx
const { data, loading, error, refresh } = useQuery(...);

if (error) {
  return (
    <ErrorContainer>
      <Text>Failed to load data: {error}</Text>
      <Button onPress={refresh}>Try Again</Button>
    </ErrorContainer>
  );
}
```

---

## Pattern: Pull-to-Refresh

All hooks support pull-to-refresh (FlatList/ScrollView):

```jsx
const { data, refreshing, refresh } = useQuery(...);

return (
  <FlatList
    data={data}
    refreshControl={
      <RefreshControl refreshing={refreshing} onRefresh={refresh} />
    }
    renderItem={...}
  />
);
```

---

## Pattern: Hard Reload

Use `reload()` when you need to completely reset state:

```jsx
const { data, reload } = useQuery(...);

return (
  <Button 
    onPress={reload}
    title="Reset and reload"
  />
);
```

---

## Creating a New Hook

To create a hook for a new resource:

```js
// src/hooks/useFoo.js
import { useCallback } from 'react';
import useQuery from './useQuery';
import FooService from '../services/foo/fooService';

export const useFoo = (opts = {}) => {
  const fetchFn = useCallback(async () => {
    return FooService.getAll(opts.limit || 100);
  }, [opts.limit]);

  const { data, ...rest } = useQuery(
    'foo-list',
    fetchFn,
    [opts.limit],
    { initialData: [] }
  );

  return {
    foos: data,
    ...rest,  // loading, error, refreshing, refresh, reload
  };
};

export default useFoo;
```

Then use it:

```jsx
const MyScreen = () => {
  const { foos, loading, error, refreshing, refresh } = useFoo();
  
  if (loading) return <Loading />;
  if (error) return <Error onRetry={refresh} />;
  
  return <FlatList data={foos} onRefresh={refresh} refreshing={refreshing} />;
};
```

---

## Key Benefits

✅ **DRY** — No more copy-paste state management  
✅ **Consistent** — All data fetches follow the same pattern  
✅ **Maintainable** — Logic centralized in hooks, not scattered across screens  
✅ **Testable** — Hooks are easier to test than screens  
✅ **Backend-agnostic** — Hooks use services which use BackendService  

---

## Performance Notes

- Hooks automatically prevent state updates after unmount (memory leak protection)
- Dependencies array controls when refetch happens
- Async errors are caught and displayed (never crash the app)
- Loading/refreshing flags prevent double-submission

---

## Migration Checklist

Updating an existing screen to use hooks:

- [ ] Identify what data the screen fetches
- [ ] Find or create the corresponding hook
- [ ] Replace all useState/useCallback/useEffect with single hook call
- [ ] Replace loading/error/refreshing conditionals
- [ ] Replace refresh handler with hook's `refresh()` function
- [ ] Remove 20+ lines of boilerplate ✨
