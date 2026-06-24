# HealthOS

A personal health tracking app for logging meals, workouts, habits, and mood — with a dashboard that summarizes your day and tracks streaks.

## Architecture

```
HealthTracker/
├── client/          React (Vite) SPA
│   └── src/
│       ├── pages/         Dashboard, Meals, Workouts, Habits & Mood
│       ├── components/    Sidebar, Modal
│       ├── api.js         API client (fetch wrapper)
│       └── index.css      HealthOS design system
├── server/          Express API + SQLite
│   ├── index.js           REST endpoints
│   └── db.js              Schema & connection (better-sqlite3)
```

**Frontend:** React 19 with React Router for client-side navigation. Vite dev server on port 5173.

**Backend:** Express.js REST API on port 3001. SQLite database (`better-sqlite3`) with 5 tables:

| Table | Purpose |
|-------|---------|
| `meals` | Meal logs (name, type, calories, protein, notes) |
| `workouts` | Workout logs (name, type, duration, feel, notes) |
| `habit_defs` | Habit definitions (name, category) |
| `habits` | Daily habit completions (links to habit_defs) |
| `moods` | Daily mood entries (mood, note) |

The dashboard aggregates all tables via a single `/api/dashboard` endpoint.

## How to Run

### Prerequisites

- Node.js 18+

### Start the API server

```bash
cd server
npm install
npm run dev
```

Runs on http://localhost:3001.

### Start the frontend

```bash
cd client
npm install
npm run dev
```

Runs on http://localhost:5173.

### API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard?date=YYYY-MM-DD` | Dashboard summary for a date |
| GET/POST/DELETE | `/api/meals` | Meal CRUD |
| GET/POST/DELETE | `/api/workouts` | Workout CRUD |
| GET/POST/DELETE | `/api/habit-defs` | Habit definition CRUD |
| GET | `/api/habits?from=&to=` | Habit completions in range |
| POST | `/api/habits/toggle` | Toggle a habit for a date |
| GET/POST | `/api/moods` | Mood entries |
