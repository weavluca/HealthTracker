import { useState, useEffect } from "react";
import { api } from "../api";

const todayKey = new Date().toISOString().split("T")[0];
const todayLong = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
const moodEmoji = { great: "\u{1F604}", good: "\u{1F642}", okay: "\u{1F610}", tired: "\u{1F634}", bad: "\u{1F614}" };

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.getDashboard(todayKey).then(setData);
  }, []);

  if (!data) return <div className="main"><p>Loading...</p></div>;

  const { meals, workouts, mood, habitDefs, completedHabits, streak, weekData } = data;
  const habitPct = habitDefs.length ? Math.round((completedHabits.length / habitDefs.length) * 100) : 0;

  const allLogs = [
    ...meals.map((m) => ({ time: m.time, label: `\u{1F957} ${m.name}`, type: "meal" })),
    ...workouts.map((w) => ({ time: w.time, label: `\u{1F4AA} ${w.name}`, type: "workout" })),
    ...completedHabits.map((h) => ({ time: h.time, label: `✅ ${h.name}`, type: "habit" })),
  ].sort((a, b) => (a.time || "").localeCompare(b.time || ""));

  const maxWeek = Math.max(1, ...weekData.map((d) => d.meals + d.workouts));

  return (
    <>
      <header className="topbar">
        <h1 className="page-title">Dashboard</h1>
        <div className="topbar-actions">
          <span className="streak-badge">{"\u{1F525}"} {streak} day streak</span>
        </div>
      </header>

      <section className="dashboard-grid">
        <div className="card card--wide">
          <div className="card-header">
            <h2>Today at a Glance</h2>
            <span className="card-date">{todayLong}</span>
          </div>
          <div className="glance-stats">
            <div className="stat">
              <span className="stat-value">{meals.length}/3</span>
              <span className="stat-label">Meals Logged</span>
            </div>
            <div className="stat">
              <span className="stat-value">{workouts.length}</span>
              <span className="stat-label">Workouts Done</span>
            </div>
            <div className="stat">
              <span className="stat-value">{habitPct}%</span>
              <span className="stat-label">Habits Complete</span>
            </div>
            <div className="stat">
              <span className="stat-value">{mood ? moodEmoji[mood.mood] || mood.mood : "—"}</span>
              <span className="stat-label">Mood Today</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>Quick Log</h2></div>
          <div className="quick-log-list">
            {allLogs.length ? allLogs.map((l, i) => (
              <div key={i} className={`log-item log-item--${l.type}`}>
                <span className="log-time">{l.time || ""}</span>
                <span>{l.label}</span>
              </div>
            )) : <p className="empty-state">Nothing logged yet today.</p>}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h2>This Week</h2></div>
          <div className="week-bars">
            {weekData.map((d) => (
              <div key={d.day} className={`week-bar-col${d.date === todayKey ? " today" : ""}`}>
                <div className="week-bar-fill" style={{ height: `${Math.min(100, ((d.meals + d.workouts) / maxWeek) * 100)}%` }} />
                <span className="week-bar-label">{d.day}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
