const BASE = "http://localhost:3001/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export const api = {
  getDashboard: (date) => request(`/dashboard?date=${date}`),

  getMeals: (date) => request(date ? `/meals?date=${date}` : "/meals"),
  addMeal: (meal) => request("/meals", { method: "POST", body: JSON.stringify(meal) }),
  deleteMeal: (id) => request(`/meals/${id}`, { method: "DELETE" }),

  getWorkouts: (date) => request(date ? `/workouts?date=${date}` : "/workouts"),
  addWorkout: (w) => request("/workouts", { method: "POST", body: JSON.stringify(w) }),
  deleteWorkout: (id) => request(`/workouts/${id}`, { method: "DELETE" }),

  getHabitDefs: () => request("/habit-defs"),
  addHabitDef: (h) => request("/habit-defs", { method: "POST", body: JSON.stringify(h) }),
  deleteHabitDef: (id) => request(`/habit-defs/${id}`, { method: "DELETE" }),

  getHabits: (from, to) => request(`/habits?from=${from}&to=${to}`),
  toggleHabit: (data) => request("/habits/toggle", { method: "POST", body: JSON.stringify(data) }),

  getMood: (date) => request(`/moods?date=${date}`),
  saveMood: (data) => request("/moods", { method: "POST", body: JSON.stringify(data) }),
};
