# Backend Architecture

This directory implements the **Backend Adapter Pattern**, which allows seamless switching between different backend implementations without changing any app code.

## Files Overview

- **BackendInterface.js** — The contract that all backends must implement (32 methods covering auth, tasks, contacts, teams, profile, timesheets, dashboard)
- **OdooAdapter.js** — Current production adapter wrapping Odoo ERP integration
- **CustomAdapter.js** — REST-based stub ready for your custom backend
- **BackendService.js** — Selects the active adapter based on `BACKEND_TYPE` config

## How It Works

### 1. In App Code (Screens, Services, Hooks)

```js
import backend from '../backend/BackendService';

// Use the backend exactly the same way regardless of implementation
const tasks = await backend.getTasks([]);
const dashboard = await backend.getDashboardData(userId);
const newTaskId = await backend.createTask({ name: 'New task' });
```

The app **never imports OdooAdapter or CustomAdapter directly**. Everything goes through BackendService.

### 2. Data Shapes Are Normalised

All adapters return the same data shapes, so the UI doesn't need to know which backend is active:

```js
// Both OdooAdapter and CustomAdapter return Task like this:
{
  id: 123,
  name: "Fix bug",
  projectId: 5,
  projectName: "Project Alpha",
  stageId: 3,
  stageName: "In Progress",
  priority: "2",
  deadline: "2026-04-15",
  assigneeIds: [7, 8],
  description: "...",
  createdAt: "2026-04-01T10:00:00",
  _raw: { /* the original backend-specific object */ }
}
```

### 3. Switching Backends (The Magic)

To switch from Odoo to your custom backend:

1. **Implement CustomAdapter methods** — Replace each `throw new Error(...)` with your REST API calls
2. **Change one line in src/config/index.js:**

```js
// Before
export const BACKEND_TYPE = 'odoo';

// After
export const BACKEND_TYPE = 'custom';
```

That's it. The entire app now uses your custom backend, and users see no difference.

---

## Implementing CustomAdapter

### Step 1: Identify Your REST Endpoints

Map your custom backend endpoints to the interface:

```
Auth:
  POST /api/auth/login              → { uid, name, email, partner_id, session_id, db }
  POST /api/auth/logout             → {}
  POST /api/auth/google             → { status, data? }

Tasks:
  GET  /api/tasks                   → { tasks: Task[] }
  GET  /api/tasks/{id}              → Task
  POST /api/tasks                   → { id }
  PATCH /api/tasks/{id}             → {}
  DELETE /api/tasks/{id}            → {}

... and so on for projects, contacts, teams, profile, timesheets, dashboard
```

### Step 2: Implement Each Method

Example:

```js
// src/backend/CustomAdapter.js

async getTasks(domain = [], opts = {}) {
  const res = await httpClient.get('/api/tasks', {
    params: {
      limit: opts.limit || 100,
      offset: opts.offset || 0,
      order: opts.order,
    },
  });
  return res.data.tasks; // Must return Task[] with the normalised shape
}

async getMyTasks(userId, limit = 100) {
  const res = await httpClient.get(`/api/tasks/user/${userId}`, {
    params: { limit },
  });
  return res.data.tasks;
}

async createTask(vals) {
  const res = await httpClient.post('/api/tasks', vals);
  return res.data.id; // Must return the task ID
}

// ... implement all 32 methods in BackendInterface
```

### Step 3: Test It

Change `BACKEND_TYPE` to `'custom'` and run:

```bash
npm run android  # or npm run ios
```

If the API calls go through with 404s, you're hitting the right endpoints but the backend doesn't exist yet. That's expected.

---

## Deployment Timeline

**Phase 1 (Now):** Running on Odoo, architecture is future-proof
**Phase 2-4 (Months 1-3):** Build your custom backend incrementally
**Phase 5+ (Month 6+):** Migrate production traffic to custom backend

### Migration Strategy

Rather than a hard cutover, you can:

1. **Deploy CustomAdapter** alongside OdooAdapter
2. **A/B test** — route 10% of users to `'custom'`, monitor metrics
3. **Gradually increase traffic** — 25%, 50%, 100%
4. **Keep OdooAdapter as fallback** — if custom backend has issues, flip back to `'odoo'`

Once you're 100% on custom backend and confident, you can delete OdooAdapter.

---

## Key Design Decisions

✅ **No breaking changes** — Phase 2 is purely additive (4 new files)
✅ **Backward compatible** — All existing code continues to work
✅ **Testable** — Easy to mock either adapter for unit tests
✅ **Clear separation** — Backend quirks (Odoo RPC, REST details) are isolated to adapters
✅ **Type-safe** — BackendInterface documents every operation with JSDoc

---

## Next: Phase 3 (Service Cleanup)

Once Phase 2 is working, we'll:

1. Update domain services to use `BackendService` instead of direct `callOdoo()` calls
2. Move direct Odoo calls out of screens
3. Delete `src/services/api/tasks.js` (duplicate of projectService)
4. Create `DashboardService` to replace inline calls in DashboardScreen

Phase 3 makes the transition seamless and prepares for Phase 4 (React Hooks).
