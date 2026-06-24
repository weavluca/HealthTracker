import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import Meals from "./pages/Meals";
import Workouts from "./pages/Workouts";
import Habits from "./pages/Habits";
import MealPlan from "./pages/MealPlan";

export default function App() {
  return (
    <BrowserRouter>
      <Sidebar />
      <main className="main">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/meals" element={<Meals />} />
          <Route path="/meal-plan" element={<MealPlan />} />
          <Route path="/workouts" element={<Workouts />} />
          <Route path="/habits" element={<Habits />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}
