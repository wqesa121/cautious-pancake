import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";

type GradeRow = {
  _id: string;
  attempt: number;
  status: string;
  autoScore?: number;
  manualScore?: number;
  finalScore?: number;
  submittedAt?: string;
  gradedAt?: string;
  assignment?: {
    title: string;
    type: string;
    deadline?: string;
    maxScore: number;
  };
};

export default function MyGrades() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const [rows, setRows] = useState<GradeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const average = useMemo(() => {
    if (rows.length === 0) return 0;
    return Math.round(rows.reduce((sum, row) => sum + (row.finalScore || 0), 0) / rows.length);
  }, [rows]);

  useEffect(() => {
    const fetchGrades = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const response = await fetch("/api/student/grades", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Ошибка загрузки оценок");
        setRows(data);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Ошибка загрузки оценок");
      } finally {
        setLoading(false);
      }
    };

    fetchGrades();
  }, [token]);

  if (!token) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-slate-600">Войдите, чтобы увидеть оценки.</p>
      </div>
    );
  }

  if (user.role !== "student") {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-slate-600">Раздел оценок доступен только студенту.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Мои оценки</h1>
            <p className="mt-2 text-slate-600">Все результаты по заданиям и тестам в вашей группе.</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-100 shadow-soft px-5 py-4 min-w-[180px]">
            <p className="text-sm text-slate-500">Средний балл</p>
            <p className="text-3xl font-bold text-slate-900">{average}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="card p-6">
            <p className="text-slate-600">У вас пока нет оценок.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <div key={row._id} className="card p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg font-bold text-slate-900">{row.assignment?.title || "Задание"}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">{row.assignment?.type || "-"}</span>
                  </div>
                  <p className="text-sm text-slate-600">Попытка {row.attempt} · Статус: {row.status}</p>
                  <p className="text-xs text-slate-500">Дедлайн: {row.assignment?.deadline ? new Date(row.assignment.deadline).toLocaleString("ru-RU") : "-"}</p>
                  <p className="text-xs text-slate-500">Отправлено: {row.submittedAt ? new Date(row.submittedAt).toLocaleString("ru-RU") : "-"}</p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 min-w-[120px]">
                    <p className="text-xs text-slate-500">Авто</p>
                    <p className="text-lg font-bold text-slate-900">{row.autoScore ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3 min-w-[120px]">
                    <p className="text-xs text-slate-500">Ручная</p>
                    <p className="text-lg font-bold text-slate-900">{row.manualScore ?? "-"}</p>
                  </div>
                  <div className="rounded-xl bg-primary-50 border border-primary-100 px-4 py-3 min-w-[140px]">
                    <p className="text-xs text-primary-700">Итог</p>
                    <p className="text-2xl font-bold text-primary-700">{row.finalScore ?? 0} / {row.assignment?.maxScore ?? 100}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
