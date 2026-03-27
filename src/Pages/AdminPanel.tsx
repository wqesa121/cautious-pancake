import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import CircleList from "../components/admin/CircleList";
import EnrollmentList from "../components/admin/EnrollmentList";
import LmsPanel from "../components/admin/LmsPanel";
import UserList from "../components/admin/UserList";
import Stats from "../components/admin/Stats";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<
    "circles" | "enrollments" | "users" | "stats" | "lms"
  >("circles");
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const user = localStorage.getItem("user");
    const storedToken = localStorage.getItem("token");

    if (!user || !storedToken) {
      navigate("/login");
      return;
    }

    try {
      const parsedUser = JSON.parse(user);
      if (parsedUser.role !== "admin") {
        navigate("/");
        return;
      }
      setToken(storedToken);
    } catch (err) {
      console.error("Ошибка при парсинге user:", err);
      navigate("/login");
    }
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <p className="text-red-600 font-medium text-center">Ошибка: {error}</p>
      </div>
    );
  }

  const tabs = [
    { id: "circles" as const, label: "Кружки" },
    { id: "enrollments" as const, label: "Записи" },
    { id: "lms" as const, label: "LMS" },
    { id: "users" as const, label: "Пользователи" },
    { id: "stats" as const, label: "Статистика" },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Панель администратора
          </h1>
          <p className="mt-2 text-slate-600">
            Управление кружками, записями и пользователями
          </p>
        </div>

        <div className="mb-8">
          <div className="flex flex-wrap gap-1 p-1 bg-white rounded-xl border border-slate-100 shadow-soft inline-flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-6 sm:p-8">
          {activeTab === "circles" && (
            <CircleList token={token} setError={setError} />
          )}
          {activeTab === "enrollments" && (
            <EnrollmentList token={token} setError={setError} />
          )}
          {activeTab === "lms" && (
            <LmsPanel token={token} setError={setError} />
          )}
          {activeTab === "users" && (
            <UserList token={token} setError={setError} />
          )}
          {activeTab === "stats" && (
            <Stats token={token} setError={setError} />
          )}
        </div>
      </div>
    </div>
  );
}
