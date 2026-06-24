import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import Modal from "../components/Modal";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayKey = new Date().toISOString().split("T")[0];

function getWeekStart(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  const day = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - day);
  return d.toISOString().split("T")[0];
}

function MacroBar({ macros }) {
  const total = macros.protein * 4 + macros.carbs * 4 + macros.fat * 9;
  if (!total) return null;
  const pPct = Math.round((macros.protein * 4 / total) * 100);
  const cPct = Math.round((macros.carbs * 4 / total) * 100);
  const fPct = 100 - pPct - cPct;
  return (
    <div style={{ display: "flex", borderRadius: 4, overflow: "hidden", height: 6, marginTop: 6 }}>
      <div style={{ width: `${pPct}%`, background: "var(--accent)" }} />
      <div style={{ width: `${cPct}%`, background: "#f0c27f" }} />
      <div style={{ width: `${fPct}%`, background: "#e8a598" }} />
    </div>
  );
}

function MacroChips({ macros, large }) {
  const s = large ? { fontSize: ".95rem", fontWeight: 600 } : { fontSize: ".75rem" };
  return (
    <div style={{ display: "flex", gap: ".75rem", flexWrap: "wrap", fontFamily: "var(--font-mono)" }}>
      <span style={{ ...s, color: "var(--text)" }}>{macros.kcal} kcal</span>
      <span style={{ ...s, color: "var(--accent)" }}>{macros.protein}g P</span>
      <span style={{ ...s, color: "#f0c27f" }}>{macros.carbs}g C</span>
      <span style={{ ...s, color: "#e8a598" }}>{macros.fat}g F</span>
    </div>
  );
}

function EntryCard({ entry, onCheckin }) {
  const [open, setOpen] = useState(false);
  const macros = { kcal: entry.kcal || 0, protein: entry.protein || 0, carbs: entry.carbs || 0, fat: entry.fat || 0 };

  return (
    <div className={`list-item${entry.checked ? " checked-entry" : ""}`} style={{ opacity: entry.checked ? 0.6 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: ".75rem", marginBottom: ".35rem" }}>
        <button
          className={`btn ${entry.checked ? "btn--ghost" : "btn--primary"}`}
          style={{ padding: ".3rem .7rem", fontSize: ".78rem", minWidth: 80 }}
          onClick={() => onCheckin(entry.id)}
        >
          {entry.checked ? "Undo" : "✓ Ate it"}
        </button>
        <strong style={{ fontSize: ".95rem", textDecoration: entry.checked ? "line-through" : "none" }}>{entry.meal_name}</strong>
        <span className="tag" style={{ marginLeft: "auto" }}>{entry.day_type}</span>
      </div>
      <MacroChips macros={macros} />
      <MacroBar macros={macros} />
      <button
        style={{ background: "none", border: "none", color: "var(--text-2)", fontSize: ".78rem", cursor: "pointer", marginTop: ".5rem", padding: 0 }}
        onClick={() => setOpen(!open)}
      >
        {open ? "▲ Hide items" : "▼ Show items"}
      </button>
      {open && (
        <div style={{ marginTop: ".5rem" }}>
          <table style={{ width: "100%", fontSize: ".82rem", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border)" }}>
                <th style={{ textAlign: "left", padding: ".25rem 0", color: "var(--text-2)", fontWeight: 500 }}>Food</th>
                <th style={{ textAlign: "right", padding: ".25rem 0", color: "var(--text-2)", fontWeight: 500 }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {entry.items.map((item, i) => (
                <tr key={i} style={{ borderBottom: "1px solid var(--surface-2)" }}>
                  <td style={{ padding: ".3rem 0", color: "var(--text)" }}>{item.food}</td>
                  <td style={{ textAlign: "right", padding: ".3rem 0", color: "var(--text-2)", fontFamily: "var(--font-mono)", fontSize: ".75rem" }}>{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {entry.notes && (
            <p style={{ marginTop: ".5rem", fontSize: ".78rem", color: "var(--text-2)", fontStyle: "italic", borderLeft: "2px solid var(--border)", paddingLeft: ".75rem" }}>
              {entry.notes}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MealPlan() {
  const [weekStart, setWeekStart] = useState(getWeekStart(todayKey));
  const [plan, setPlan] = useState(null);
  const [selectedDay, setSelectedDay] = useState(todayKey);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadDate, setUploadDate] = useState(getWeekStart(todayKey));

  const load = useCallback(async () => {
    const data = await api.getMealPlan(weekStart);
    setPlan(data);
  }, [weekStart]);

  useEffect(() => { load(); }, [load]);

  async function handleCheckin(entryId) {
    await api.checkinMeal(entryId);
    load();
  }

  function parsePlanFromTsx(text) {
    const match = text.match(/const\s+plan\s*=\s*\[/);
    if (!match) throw new Error("Could not find 'const plan = [' in file");
    const startIdx = match.index + match[0].length - 1;
    let depth = 0;
    let endIdx = -1;
    for (let i = startIdx; i < text.length; i++) {
      if (text[i] === "[" || text[i] === "{") depth++;
      else if (text[i] === "]" || text[i] === "}") { depth--; if (depth === 0) { endIdx = i + 1; break; } }
    }
    if (endIdx === -1) throw new Error("Could not find end of plan array");
    const arrayStr = text.slice(startIdx, endIdx);
    return new Function(`return ${arrayStr}`)();
  }

  async function handleUpload() {
    if (!uploadFile) return alert("Please select a .tsx or .jsx file.");
    const text = await uploadFile.text();
    let days;
    try {
      days = parsePlanFromTsx(text);
    } catch (e) {
      return alert(`Failed to parse file: ${e.message}`);
    }
    if (!Array.isArray(days)) return alert("Expected a plan array in the file.");
    await api.uploadMealPlan({ week_start: uploadDate, days });
    setWeekStart(uploadDate);
    setUploadOpen(false);
    setUploadFile(null);
    load();
  }

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart + "T12:00:00");
    d.setDate(d.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const todayEntries = plan?.entries?.filter((e) => e.date === selectedDay) || [];
  const dayTotals = todayEntries.reduce((acc, e) => ({
    kcal: acc.kcal + (e.kcal || 0), protein: acc.protein + (e.protein || 0),
    carbs: acc.carbs + (e.carbs || 0), fat: acc.fat + (e.fat || 0),
  }), { kcal: 0, protein: 0, carbs: 0, fat: 0 });
  const checkedCount = todayEntries.filter((e) => e.checked).length;
  const dayType = todayEntries[0]?.day_type || "";

  return (
    <>
      <header className="topbar">
        <h1 className="page-title">Meal Plan</h1>
        <div className="topbar-actions">
          <button className="btn btn--ghost" onClick={() => setWeekStart(getWeekStart(new Date(new Date(weekStart + "T12:00:00").getTime() - 7 * 86400000).toISOString().split("T")[0]))}>
            &larr;
          </button>
          <span style={{ fontFamily: "var(--font-mono)", fontSize: ".85rem", color: "var(--text-2)" }}>
            Week of {weekStart}
          </span>
          <button className="btn btn--ghost" onClick={() => setWeekStart(getWeekStart(new Date(new Date(weekStart + "T12:00:00").getTime() + 7 * 86400000).toISOString().split("T")[0]))}>
            &rarr;
          </button>
          <button className="btn btn--primary" onClick={() => setUploadOpen(true)}>Upload Plan</button>
        </div>
      </header>

      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.25rem", overflowX: "auto" }}>
        {weekDates.map((d, i) => {
          const isToday = d === todayKey;
          const isSelected = d === selectedDay;
          const dayEntries = plan?.entries?.filter((e) => e.date === d) || [];
          const allChecked = dayEntries.length > 0 && dayEntries.every((e) => e.checked);
          return (
            <button
              key={d}
              onClick={() => setSelectedDay(d)}
              style={{
                padding: ".5rem .85rem", borderRadius: 8, border: `1px solid ${isSelected ? "var(--accent)" : "var(--border)"}`,
                background: isSelected ? "var(--accent)" : "var(--surface)", color: isSelected ? "#fff" : "var(--text-2)",
                cursor: "pointer", fontSize: ".85rem", fontWeight: 500, display: "flex", flexDirection: "column", alignItems: "center", gap: ".2rem",
              }}
            >
              <span>{DAYS[i]}</span>
              <span style={{ fontSize: ".7rem", fontFamily: "var(--font-mono)" }}>{d.slice(5)}</span>
              {allChecked && dayEntries.length > 0 && <span style={{ fontSize: ".7rem" }}>{"✅"}</span>}
              {isToday && !isSelected && <span style={{ width: 4, height: 4, borderRadius: "50%", background: "var(--accent)" }} />}
            </button>
          );
        })}
      </div>

      {!plan ? (
        <div className="card card--wide">
          <p className="empty-state">No meal plan for this week. Upload one to get started.</p>
        </div>
      ) : (
        <section className="dashboard-grid">
          <div className="card card--wide">
            <div className="card-header">
              <h2>{new Date(selectedDay + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</h2>
              <div style={{ display: "flex", gap: ".75rem", alignItems: "center" }}>
                {dayType && <span className="tag">{dayType}</span>}
                <span style={{ fontFamily: "var(--font-mono)", fontSize: ".82rem", color: "var(--accent-2)" }}>
                  {checkedCount}/{todayEntries.length} eaten
                </span>
              </div>
            </div>
            <MacroChips macros={dayTotals} large />
            <MacroBar macros={dayTotals} />
          </div>

          <div className="card card--wide">
            <div className="card-header"><h2>Meals</h2></div>
            {todayEntries.length ? todayEntries.map((e) => (
              <EntryCard key={e.id} entry={e} onCheckin={handleCheckin} />
            )) : <p className="empty-state">No meals planned for this day.</p>}
          </div>

          <div className="card card--wide">
            <div className="card-header"><h2>Week Overview</h2></div>
            <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
              {DAYS.map((d, i) => {
                const date = weekDates[i];
                const dayEntries = plan?.entries?.filter((e) => e.date === date) || [];
                const total = dayEntries.reduce((s, e) => s + (e.kcal || 0), 0);
                const checked = dayEntries.filter((e) => e.checked).length;
                const dt = dayEntries[0]?.day_type || "";
                return (
                  <div key={d} style={{ flex: 1, minWidth: 80, background: "var(--surface-2)", borderRadius: 8, padding: ".6rem", border: "1px solid var(--border)", textAlign: "center" }}>
                    <div style={{ fontWeight: 600, fontSize: ".82rem", color: date === todayKey ? "var(--accent)" : "var(--text)" }}>{d}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: ".75rem", color: "var(--text-2)", marginTop: ".2rem" }}>{total} kcal</div>
                    <div style={{ fontSize: ".7rem", color: "var(--accent-2)", marginTop: ".15rem" }}>{checked}/{dayEntries.length}</div>
                    {dt && <div style={{ fontSize: ".65rem", color: "var(--text-2)", marginTop: ".15rem" }}>{dt}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Meal Plan" onSave={handleUpload} saveLabel="Upload">
        <label>
          Week starting (Monday)
          <input type="date" value={uploadDate} onChange={(e) => setUploadDate(e.target.value)} />
        </label>
        <label>
          Meal plan file (.tsx / .jsx)
          <input
            type="file"
            accept=".tsx,.jsx,.ts,.js"
            onChange={(e) => setUploadFile(e.target.files[0] || null)}
          />
        </label>
        {uploadFile && <p style={{ fontSize: ".82rem", color: "var(--accent)" }}>Selected: {uploadFile.name}</p>}
      </Modal>
    </>
  );
}
