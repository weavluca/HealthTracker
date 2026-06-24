import Database from "better-sqlite3";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const db = new Database(join(__dirname, "healthos.db"));

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS meals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    calories INTEGER,
    protein INTEGER,
    notes TEXT,
    time TEXT,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS workouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    duration INTEGER,
    notes TEXT,
    feel TEXT,
    time TEXT,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habit_defs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    habit_id INTEGER NOT NULL REFERENCES habit_defs(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT,
    UNIQUE(habit_id, date)
  );

  CREATE TABLE IF NOT EXISTS moods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    mood TEXT NOT NULL,
    note TEXT,
    date TEXT NOT NULL UNIQUE,
    time TEXT
  );

  CREATE TABLE IF NOT EXISTS meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS meal_plan_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    day_name TEXT NOT NULL,
    day_type TEXT NOT NULL,
    meal_name TEXT NOT NULL,
    items TEXT NOT NULL,
    kcal INTEGER,
    protein INTEGER,
    carbs INTEGER,
    fat INTEGER,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS meal_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id INTEGER NOT NULL REFERENCES meal_plan_entries(id) ON DELETE CASCADE,
    checked_at TEXT NOT NULL,
    UNIQUE(entry_id)
  );
`);

export default db;
