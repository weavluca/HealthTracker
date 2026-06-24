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

// ── Meal Plans ──

app.get("/api/meal-plans", (req, res) => {
  const { week } = req.query;
  if (week) {
    const plan = db.prepare("SELECT * FROM meal_plans WHERE week_start = ?").get(week);
    if (!plan) return res.json(null);
    const entries = db.prepare("SELECT * FROM meal_plan_entries WHERE plan_id = ? ORDER BY date, id").all(plan.id);
    const checkins = db.prepare(
      "SELECT mc.* FROM meal_checkins mc JOIN meal_plan_entries mpe ON mc.entry_id = mpe.id WHERE mpe.plan_id = ?"
    ).all(plan.id);
    const checkedEntryIds = new Set(checkins.map((c) => c.entry_id));
    const enriched = entries.map((e) => ({ ...e, items: JSON.parse(e.items), checked: checkedEntryIds.has(e.id) }));
    return res.json({ ...plan, entries: enriched });
  }
  res.json(db.prepare("SELECT * FROM meal_plans ORDER BY week_start DESC LIMIT 20").all());
});

app.post("/api/meal-plans", (req, res) => {
  const { week_start, days } = req.body;
  if (!week_start || !days || !Array.isArray(days)) return res.status(400).json({ error: "week_start and days[] are required" });

  const insertPlan = db.prepare("INSERT INTO meal_plans (week_start) VALUES (?)");
  const insertEntry = db.prepare(
    "INSERT INTO meal_plan_entries (plan_id, date, day_name, day_type, meal_name, items, kcal, protein, carbs, fat, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );

  const existing = db.prepare("SELECT id FROM meal_plans WHERE week_start = ?").get(week_start);
  if (existing) {
    db.prepare("DELETE FROM meal_plans WHERE id = ?").run(existing.id);
  }

  const txn = db.transaction(() => {
    const planId = insertPlan.run(week_start).lastInsertRowid;
    const startDate = new Date(week_start + "T12:00:00");
    for (let i = 0; i < days.length; i++) {
      const day = days[i];
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];
      for (const meal of day.meals) {
        insertEntry.run(
          planId, dateStr, day.day, day.type, meal.name,
          JSON.stringify(meal.items),
          meal.macros?.kcal || null, meal.macros?.protein || null,
          meal.macros?.carbs || null, meal.macros?.fat || null,
          meal.notes || null
        );
      }
    }
    return planId;
  });

  const planId = txn();
  res.status(201).json({ id: planId });
});

app.post("/api/meal-plans/checkin", (req, res) => {
  const { entry_id } = req.body;
  if (!entry_id) return res.status(400).json({ error: "entry_id is required" });

  const existing = db.prepare("SELECT id FROM meal_checkins WHERE entry_id = ?").get(entry_id);
  if (existing) {
    db.prepare("DELETE FROM meal_checkins WHERE entry_id = ?").run(entry_id);
    return res.json({ checked: false });
  }

  const now = new Date().toISOString();
  db.prepare("INSERT INTO meal_checkins (entry_id, checked_at) VALUES (?, ?)").run(entry_id, now);

  const entry = db.prepare("SELECT * FROM meal_plan_entries WHERE id = ?").get(entry_id);
  if (entry) {
    const time = new Date().toTimeString().slice(0, 5);
    db.prepare(
      "INSERT INTO meals (name, type, calories, protein, notes, time, date) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(entry.meal_name, "Planned", entry.kcal, entry.protein, entry.notes, time, entry.date);
  }

  res.json({ checked: true });
});

app.get("/api/meal-plans/today", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: "date is required" });
  const entries = db.prepare(
    "SELECT mpe.*, mp.week_start FROM meal_plan_entries mpe JOIN meal_plans mp ON mpe.plan_id = mp.id WHERE mpe.date = ? ORDER BY mpe.id"
  ).all(date);
  const checkins = db.prepare(
    "SELECT mc.* FROM meal_checkins mc JOIN meal_plan_entries mpe ON mc.entry_id = mpe.id WHERE mpe.date = ?"
  ).all(date);
  const checkedEntryIds = new Set(checkins.map((c) => c.entry_id));
  const enriched = entries.map((e) => ({ ...e, items: JSON.parse(e.items), checked: checkedEntryIds.has(e.id) }));
  res.json(enriched);
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
