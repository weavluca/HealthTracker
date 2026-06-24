import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import Modal from "../components/Modal";

const todayKey = new Date().toISOString().split("T")[0];
const nowTime = new Date().toTimeString().slice(0, 5);

export default function Meals() {
  const [todayMeals, setTodayMeals] = useState([]);
  const [history, setHistory] = useState([]);
  const [filterDate, setFilterDate] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ name: "", type: "Breakfast", calories: "", protein: "", notes: "", time: nowTime });

  const load = useCallback(async () => {
    setTodayMeals(await api.getMeals(todayKey));
    setHistory(filterDate ? await api.getMeals(filterDate) : await api.getMeals());
  }, [filterDate]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!form.name.trim()) return alert("Please enter a meal name.");
    await api.addMeal({ ...form, date: todayKey });
    setForm({ name: "", type: "Breakfast", calories: "", protein: "", notes: "", time: nowTime });
    setModalOpen(false);
    load();
  }

  async function remove(id) {
    if (!confirm("Delete this meal?")) return;
    await api.deleteMeal(id);
    load();
  }

  function MealCard({ m, showDate }) {
    return (
      <div className="list-item">
        <div className="list-item-meta">
          <span className="tag tag--meal">{m.type}</span>
          {showDate && <span className="list-item-date">{m.date}</span>}
          <span className="list-item-time">{m.time || ""}</span>
        </div>
        <div className="list-item-main">
          <strong>{m.name}</strong>
          {m.calories ? <span className="macro">{m.calories} kcal</span> : null}
          {m.protein ? <span className="macro">{m.protein}g protein</span> : null}
        </div>
        {m.notes && <div className="list-item-notes">{m.notes}</div>}
        <button className="btn-delete" onClick={() => remove(m.id)}>&#10005;</button>
      </div>
    );
  }

  return (
    <>
      <header className="topbar">
        <h1 className="page-title">Meals</h1>
        <button className="btn btn--primary" onClick={() => setModalOpen(true)}>+ Log Meal</button>
      </header>

      <section className="dashboard-grid">
        <div className="card card--wide">
          <div className="card-header"><h2>Today's Meals</h2></div>
          {todayMeals.length
            ? todayMeals.map((m) => <MealCard key={m.id} m={m} />)
            : <p className="empty-state">No meals logged today. Hit "+ Log Meal" to start.</p>}
        </div>
        <div className="card card--wide">
          <div className="card-header">
            <h2>Meal History</h2>
            <input type="date" className="date-filter" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </div>
          {history.length
            ? history.map((m) => <MealCard key={m.id} m={m} showDate />)
            : <p className="empty-state">No meals found.</p>}
        </div>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log a Meal" onSave={save} saveLabel="Save Meal">
        <label>Meal Name<input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Grilled chicken & rice" /></label>
        <label>Meal Type
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option>
          </select>
        </label>
        <label>Calories (optional)<input type="number" value={form.calories} onChange={(e) => setForm({ ...form, calories: e.target.value })} placeholder="e.g. 450" /></label>
        <label>Protein g (optional)<input type="number" value={form.protein} onChange={(e) => setForm({ ...form, protein: e.target.value })} placeholder="e.g. 35" /></label>
        <label>Notes<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Ingredients, how you felt, etc." /></label>
        <label>Time<input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></label>
      </Modal>
    </>
  );
}
