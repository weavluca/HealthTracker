import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import Modal from "../components/Modal";

const todayKey = new Date().toISOString().split("T")[0];
const nowTime = new Date().toTimeString().slice(0, 5);
const feelColors = { Easy: "#a3cfbb", Good: "#86c5a0", Hard: "#f0c27f", Exhausting: "#e8a598" };

export default function Workouts() {
  const [todayWorkouts, setTodayWorkouts] = useState([]);
  const [history, setHistory] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Strength", duration: "", notes: "", feel: "", time: nowTime });

  const load = useCallback(async () => {
    setTodayWorkouts(await api.getWorkouts(todayKey));
    setHistory(filterDate ? await api.getWorkouts(filterDate) : await api.getWorkouts());
  }, [filterDate]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.name.trim()) return alert("Please enter a workout name.");
    await api.addWorkout({ ...form, date: todayKey });
    setForm({ name: "", type: "Strength", duration: "", notes: "", feel: "", time: nowTime });
    setModalOpen(false);
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this workout?")) return;
    await api.deleteWorkout(id);
    load();
  }

  function WorkoutCard({ w, showDate }) {
    return (
      <div className="list-item">
        <div className="list-item-meta">
          <span className="tag tag--workout">{w.type}</span>
          {w.feel && <span className="tag" style={{ background: feelColors[w.feel] || "#eee" }}>{w.feel}</span>}
          {showDate && <span className="list-item-date">{w.date}</span>}
          <span className="list-item-time">{w.time || ""}</span>
        </div>
        <div className="list-item-main">
          <strong>{w.name}</strong>
          {w.duration ? <span className="macro">{w.duration} min</span> : null}
        </div>
        {w.notes && <div className="list-item-notes">{w.notes}</div>}
        <button className="btn-delete" onClick={() => remove(w.id)}>&#10005;</button>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <h1 className="page-title">Workouts</h1>
        <button className="btn btn--primary" onClick={() => setModalOpen(true)}>+ Log Workout</button>
      </header>

      <section className="dashboard-grid">
        <div className="card card--wide">
          <div className="card-header"><h2>Today's Workouts</h2></div>
          {todayWorkouts.length
            ? todayWorkouts.map((w) => <WorkoutCard key={w.id} w={w} />)
            : <p className="empty-state">No workouts logged today. Let's move! {"\u{1F4AA}"}</p>}
        </div>
        <div className="card card--wide">
          <div className="card-header">
            <h2>Workout History</h2>
            <input type="date" className="date-filter" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          {history.length
            ? history.map((w) => <WorkoutCard key={w.id} w={w} showDate />)
            : <p className="empty-state">No workouts found.</p>}
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log a Workout" onSave={save} saveLabel="Save Workout">
        <label>Workout Name<input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Upper Body — Push Day" /></label>
        <label>Type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Strength</option><option>Cardio</option><option>Flexibility</option><option>HIIT</option><option>Other</option>
          </select>
        </label>
        <label>Duration (minutes)<input type="number" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} placeholder="e.g. 45" /></label>
        <label>Exercises / Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="e.g. Bench 3x10, Rows 3x12..." /></label>
        <label>How did it feel?
          <select value={form.feel} onChange={(e) => setForm({ ...form, feel: e.target.value })}>
            <option value="">—</option><option>Easy</option><option>Good</option><option>Hard</option><option>Exhausting</option>
          </select>
        </label>
        <label>Time<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
      </Modal>
    </>
  );
}
