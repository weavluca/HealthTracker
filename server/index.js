import express from "express";
import cors from "cors";
import db from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());

// ── Meals ──

app.get("/api/meals", (req, res) => {
  const { date } = req.query;
  const rows = date
    ? db.prepare("SELECT * FROM meals WHERE date = ? ORDER BY time").all(date)
    : db.prepare("SELECT * FROM meals ORDER BY date DESC, time DESC LIMIT 50").all();
  res.json(rows);
});

app.post("/api/meals", (req, res) => {
  const { name, type, calories, protein, notes, time, date } = req.body;
  if (!name || !type || !date) return res.status(400).json({ error: "name, type, and date are required" });
  const result = db.prepare(
    "INSERT INTO meals (name, type, calories, protein, notes, time, date) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(name, type, calories || null, protein || null, notes || null, time || null, date);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete("/api/meals/:id", (req, res) => {
  db.prepare("DELETE FROM meals WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Workouts ──

app.get("/api/workouts", (req, res) => {
  const { date } = req.query;
  const rows = date
    ? db.prepare("SELECT * FROM workouts WHERE date = ? ORDER BY time").all(date)
    : db.prepare("SELECT * FROM workouts ORDER BY date DESC, time DESC LIMIT 50").all();
  res.json(rows);
});

app.post("/api/workouts", (req, res) => {
  const { name, type, duration, notes, feel, time, date } = req.body;
  if (!name || !type || !date) return res.status(400).json({ error: "name, type, and date are required" });
  const result = db.prepare(
    "INSERT INTO workouts (name, type, duration, notes, feel, time, date) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).run(name, type, duration || null, notes || null, feel || null, time || null, date);
  res.status(201).json({ id: result.lastInsertRowid });
});

app.delete("/api/workouts/:id", (req, res) => {
  db.prepare("DELETE FROM workouts WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Habit Definitions ──

app.get("/api/habit-defs", (_req, res) => {
  res.json(db.prepare("SELECT * FROM habit_defs ORDER BY id").all());
});

app.post("/api/habit-defs", (req, res) => {
  const { name, category } = req.body;
  if (!name || !category) return res.status(400).json({ error: "name and category are required" });
  try {
    const result = db.prepare("INSERT INTO habit_defs (name, category) VALUES (?, ?)").run(name, category);
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    if (e.code === "SQLITE_CONSTRAINT_UNIQUE") return res.status(409).json({ error: "Habit already exists" });
    throw e;
  }
});

app.delete("/api/habit-defs/:id", (req, res) => {
  db.prepare("DELETE FROM habit_defs WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ── Habit Completions ──

app.get("/api/habits", (req, res) => {
  const { from, to } = req.query;
  if (from && to) {
    res.json(db.prepare("SELECT h.*, hd.name FROM habits h JOIN habit_defs hd ON h.habit_id = hd.id WHERE h.date BETWEEN ? AND ? ORDER BY h.date").all(from, to));
  } else {
    res.json(db.prepare("SELECT h.*, hd.name FROM habits h JOIN habit_defs hd ON h.habit_id = hd.id ORDER BY h.date DESC LIMIT 200").all());
  }
});

app.post("/api/habits/toggle", (req, res) => {
  const { habit_id, date, time } = req.body;
  if (!habit_id || !date) return res.status(400).json({ error: "habit_id and date are required" });
  const existing = db.prepare("SELECT id FROM habits WHERE habit_id = ? AND date = ?").get(habit_id, date);
  if (existing) {
    db.prepare("DELETE FROM habits WHERE id = ?").run(existing.id);
    res.json({ checked: false });
  } else {
    db.prepare("INSERT INTO habits (habit_id, date, time) VALUES (?, ?, ?)").run(habit_id, date, time || null);
    res.json({ checked: true });
  }
});

// ── Moods ──

app.get("/api/moods", (req, res) => {
  const { date } = req.query;
  if (date) {
    const row = db.prepare("SELECT * FROM moods WHERE date = ?").get(date);
    return res.json(row || null);
  }
  res.json(db.prepare("SELECT * FROM moods ORDER BY date DESC LIMIT 30").all());
});

app.post("/api/moods", (req, res) => {
  const { mood, note, date, time } = req.body;
  if (!mood || !date) return res.status(400).json({ error: "mood and date are required" });
  db.prepare(
    "INSERT INTO moods (mood, note, date, time) VALUES (?, ?, ?, ?) ON CONFLICT(date) DO UPDATE SET mood=excluded.mood, note=excluded.note, time=excluded.time"
  ).run(mood, note || null, date, time || null);
  res.json({ ok: true });
});

// ── Dashboard aggregation ──

app.get("/api/dashboard", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });

  const meals = db.prepare("SELECT * FROM meals WHERE date = ? ORDER BY time").all(date);
  const workouts = db.prepare("SELECT * FROM workouts WHERE date = ? ORDER BY time").all(date);
  const mood = db.prepare("SELECT * FROM moods WHERE date = ?").get(date);
  const habitDefs = db.prepare("SELECT * FROM habit_defs ORDER BY id").all();
  const completedHabits = db.prepare("SELECT h.*, hd.name FROM habits h JOIN habit_defs hd ON h.habit_id = hd.id WHERE h.date = ?").all(date);

  // Streak
  let streak = 0;
  const check = new Date(date);
  for (let i = 0; i < 30; i++) {
    const key = check.toISOString().split("T")[0];
    const hasMeal = db.prepare("SELECT 1 FROM meals WHERE date = ? LIMIT 1").get(key);
    const hasWorkout = db.prepare("SELECT 1 FROM workouts WHERE date = ? LIMIT 1").get(key);
    if (hasMeal || hasWorkout) { streak++; check.setDate(check.getDate() - 1); }
    else break;
  }

  // Week data
  const dayOfWeek = (check.getDay() + 6) % 7;
  const now = new Date(date);
  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - ((now.getDay() + 6) % 7) + i);
    const key = d.toISOString().split("T")[0];
    const mealCount = db.prepare("SELECT COUNT(*) as c FROM meals WHERE date = ?").get(key).c;
    const workoutCount = db.prepare("SELECT COUNT(*) as c FROM workouts WHERE date = ?").get(key).c;
    return { day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i], date: key, meals: mealCount, workouts: workoutCount };
  });

  res.json({ meals, workouts, mood, habitDefs, completedHabits, streak, weekData });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`HealthOS API running on http://localhost:${PORT}`));
