import { useEffect, useState } from "react";

interface TopCircle {
  title: string;
  enrollmentsCount: number;
}

interface StatsData {
  circlesCount: number;
  enrollmentsCount: number;
  usersCount: number;
  topCircles: TopCircle[];
}

interface StatsProps {
  token: string | null;
  setError: (error: string | null) => void;
}

export default function Stats({ token, setError }: StatsProps) {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      try {
        const response = await fetch("/api/admin/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("auth");
          localStorage.removeItem("user");
          setError("Сессия истекла. Пожалуйста, войдите заново.");
          return;
        }

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Ошибка при загрузке статистики");
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token, setError]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-soft">
          <p className="text-sm font-semibold text-slate-500 mb-1">Кружков</p>
          <p className="text-3xl font-bold text-slate-900">{stats.circlesCount}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-soft">
          <p className="text-sm font-semibold text-slate-500 mb-1">Записей</p>
          <p className="text-3xl font-bold text-slate-900">{stats.enrollmentsCount}</p>
        </div>
        <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 shadow-soft">
          <p className="text-sm font-semibold text-slate-500 mb-1">Пользователей</p>
          <p className="text-3xl font-bold text-slate-900">{stats.usersCount}</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Топ кружков по записям</h2>
        {stats.topCircles.length === 0 ? (
          <p className="text-slate-600 font-medium">Записей пока нет</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full text-sm text-left text-slate-700">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold">
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Кружок</th>
                  <th className="py-3 px-4">Записей</th>
                </tr>
              </thead>
              <tbody>
                {stats.topCircles.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-500">{i + 1}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{row.title}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{row.enrollmentsCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
