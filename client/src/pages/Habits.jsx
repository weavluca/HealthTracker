import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import Modal from "../components/Modal";

const todayKey = new Date().toISOString().split("T")[0];
const moodEmoji = { great: "\u{1F604}", good: "\u{1F642}", okay: "\u{1F610}", tired: "\u{1F634}", bad: "\u{1F614}" };

function last7Days() {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });
}

export default function Habits() {
  const [defs, setDefs] = useState([]);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [allHabits, setAllHabits] = useState([]);
  const [mood, setMood] = useState(null);
  const [selectedMood, setSelectedMood] = useState(null);
  const [moodNote, setMoodNote] = useState("");
  const [moodSaved, setMoodSaved] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", category: "Health" });

  const days = last7Days();

  const load = useCallback(async () => {
    const [habitDefs, habits, moodData] = await Promise.all([
      api.getHabitDefs(),
      api.getHabits(days[0], days[6]),
      api.getMood(todayKey),
    ]);
    setDefs(habitDefs);
    setAllHabits(habits);
    setCompletedIds(new Set(habits.filter((h) => h.date === todayKey).map((h) => h.habit_id)));
    if (moodData) {
      setMood(moodData);
      setSelectedMood(moodData.mood);
      setMoodSaved(`✅ Logged: ${moodData.mood}${moodData.note ? ` — "${moodData.note}"` : ""}`);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addHabit() {
    if (!form.name.trim()) return alert("Please enter a habit name.");
    await api.addHabitDef(form);
    setForm({ name: "", category: "Health" });
    setModalOpen(false);
    load();
  }

  async function toggle(habitId) {
    const now = new Date().toTimeString().slice(0, 5);
    await api.toggleHabit({ habit_id: habitId, date: todayKey, time: now });
    load();
  }

  async function removeHabit(id) {
    if (!confirm("Remove this habit?")) return;
    await api.deleteHabitDef(id);
    load();
  }

  async function pickMood(m) {
    setSelectedMood(m);
    setShowNoteInput(true);
  }

  async function saveMoodNote() {
    if (!selectedMood) return;
    const now = new Date().toTimeString().slice(0, 5);
    await api.saveMood({ mood: selectedMood, note: moodNote, date: todayKey, time: now });
    setMoodSaved(`✅ Mood saved!`);
    setShowNoteInput(false);
  }

  return (
    <>
      <header className="topbar">
        <h1 className="page-title">Habits & Mood</h1>
        <button className="btn btn--primary" onClick={() => setModalOpen(true)}>+ Add Habit</button>
      </header>

      <section className="dashboard-grid">
        <div className="card">
          <div className="card-header"><h2>Today's Mood</h2></div>
          <div className="mood-grid">
            {["great", "good", "okay", "tired", "bad"].map((m) => (
              <button key={m} className={`mood-btn${selectedMood === m ? " selected" : ""}`} onClick={() => pickMood(m)}>
                <span>{moodEmoji[m]}</span>
                <span>{m === "bad" ? "Not great" : m.charAt(0).toUpperCase() + m.slice(1)}</span>
              </button>
            ))}
          </div>
          {showNoteInput && (
            <div style={{ marginTop: "1rem" }}>
              <textarea placeholder="How are you feeling? (optional)" value={moodNote} onChange={(e) => setMoodNote(e.target.value)} />
              <button className="btn btn--primary" onClick={saveMoodNote} style={{ marginTop: ".5rem" }}>Save Note</button>
            </div>
          )}
          {moodSaved && <div className="empty-state" style={{ marginTop: "1rem" }}>{moodSaved}</div>}
        </div>

        <div className="card">
          <div className="card-header"><h2>Today's Habits</h2></div>
          {defs.length ? defs.map((h) => (
            <div key={h.id} className={`habit-row${completedIds.has(h.id) ? " habit-row--done" : ""}`}>
              <label className="habit-check">
                <input type="checkbox" checked={completedIds.has(h.id)} onChange={() => toggle(h.id)} />
                <span className="habit-name">{h.name}</span>
                <span className="tag">{h.category}</span>
              </label>
              <button className="btn-delete" onClick={() => removeHabit(h.id)}>&#10005;</button>
            </div>
          )) : <p className="empty-state">No habits yet. Add one with the button above!</p>}
        </div>

        <div className="card card--wide">
          <div className="card-header"><h2>Recent Habit Log</h2></div>
          {defs.length ? (
            <table className="heatmap-table">
              <thead>
                <tr>
                  <th></th>
                  {days.map((d) => (
                    <th key={d}>{new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" })}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {defs.map((h) => (
                  <tr key={h.id}>
                    <td className="heatmap-label">{h.name}</td>
                    {days.map((day) => {
                      const done = allHabits.some((hh) => hh.habit_id === h.id && hh.date === day);
                      return <td key={day} className={`heatmap-cell${done ? " done" : ""}${day === todayKey ? " today" : ""}`} title={day}></td>;
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="empty-state">Add habits to see history.</p>}
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add a Habit" onSave={addHabit} saveLabel="Add Habit">
        <label>Habit Name<input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Drink 8 glasses of water" /></label>
        <label>Category
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            <option>Health</option><option>Nutrition</option><option>Mindfulness</option><option>Sleep</option><option>Other</option>
          </select>
        </label>
      </Modal>
    </>
  );
}
