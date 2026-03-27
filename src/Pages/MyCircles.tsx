import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Check, X, UserMinus } from "lucide-react";
import CircleChat from "../components/CircleChat";
import KickModal from "../components/KickModal";

interface Circle {
  _id: string;
  title: string;
  category?: string;
  schedule?: string;
  currentPlaces: number;
  maxPlaces: number;
}

interface User {
  _id: string;
  username: string;
  fullName?: string;
  email?: string;
  phone?: string;
}

interface Enrollment {
  _id: string;
  user: User;
  circle: { _id: string; title: string; category?: string };
  status: "pending" | "approved" | "rejected" | "cancelled";
  comment?: string;
  rejectionReason?: string;
  createdAt: string;
}

export default function MyCircles() {
  const [circles, setCircles] = useState<Circle[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>({});
  const [kickModalEnr, setKickModalEnr] = useState<Enrollment | null>(null);
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    if (user.role !== "teacher" && user.role !== "admin") {
      navigate("/");
      return;
    }

    const fetchCircles = async () => {
      try {
        const [circlesRes, enrollmentsRes] = await Promise.all([
          fetch("/api/teacher/circles", { headers: { Authorization: `Bearer ${token}` } }),
          fetch("/api/teacher/enrollments", { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (!circlesRes.ok) throw new Error("Ошибка загрузки кружков");
        const circlesData = await circlesRes.json();
        setCircles(circlesData);
        if (enrollmentsRes.ok) {
          const enrollmentsData = await enrollmentsRes.json();
          setEnrollments(enrollmentsData);
        }
      } catch (err) {
        toast.error("Не удалось загрузить кружки");
      } finally {
        setLoading(false);
      }
    };

    fetchCircles();
  }, [token, navigate, user.role]);

  const circleEnrollments = selectedCircle
    ? enrollments.filter((e) => e.circle._id === selectedCircle._id)
    : [];
  const pendingEnrollments = circleEnrollments.filter((e) => e.status === "pending");
  const approvedEnrollments = circleEnrollments.filter((e) => e.status === "approved");

  const changeStatus = async (
    id: string,
    status: "approved" | "rejected" | "cancelled",
    rejectionReason?: string,
    successMessage?: string
  ) => {
    setUpdatingId(id);
    try {
      const body: { status: string; rejectionReason?: string } = { status };
      if (status === "rejected" && rejectionReason) body.rejectionReason = rejectionReason;
      const res = await fetch(`/api/teacher/enrollments/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || "Ошибка изменения статуса");
        return;
      }
      setEnrollments((prev) =>
        prev.map((e) => (e._id === id ? { ...e, status, rejectionReason } : e))
      );
      setRejectReasons((prev) => ({ ...prev, [id]: "" }));
      const msg = successMessage ?? (status === "approved" ? "Заявка принята" : status === "rejected" ? "Заявка отклонена" : "Заявка отменена");
      toast.success(msg);
    } catch {
      toast.error("Ошибка изменения статуса");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleKickConfirm = async (reason: string) => {
    if (!kickModalEnr) return;
    await changeStatus(kickModalEnr._id, "rejected", reason || undefined, "Участник исключён из кружка");
    setKickModalEnr(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Мои кружки
          </h1>
          <p className="mt-2 text-slate-600">
            Чат с участниками кружка. Здесь вы можете писать объявления: о занятии, что принести, расписание и т.д.
          </p>
        </div>

        {circles.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-soft p-12 text-center">
            <p className="text-slate-600 text-lg font-medium">
              Вам пока не назначены кружки. Обратитесь к администратору.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <ul className="space-y-2">
              {circles.map((circle) => (
                <li key={circle._id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCircle(selectedCircle?._id === circle._id ? null : circle)}
                    className={`w-full text-left rounded-xl px-4 py-4 border transition-all ${
                      selectedCircle?._id === circle._id
                        ? "bg-slate-900 text-white border-slate-900"
                        : "bg-white border-slate-100 hover:border-slate-200 hover:shadow-soft"
                    }`}
                  >
                    <span className="font-semibold">{circle.title}</span>
                    {circle.category && (
                      <span className={`ml-2 text-sm ${selectedCircle?._id === circle._id ? "text-slate-300" : "text-slate-500"}`}>
                        · {circle.category}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>

            {selectedCircle && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
                {/* Слева: участники кружка + выгнать с причиной */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-soft p-4 h-fit">
                  <h3 className="text-base font-semibold text-slate-900 mb-3">
                    Участники
                  </h3>
                  {approvedEnrollments.length > 0 ? (
                    <ul className="space-y-2">
                      {approvedEnrollments.map((enr) => (
                        <li
                          key={enr._id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-100 px-3 py-2 hover:bg-slate-50"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-800 font-medium block truncate">
                              {enr.user.fullName || enr.user.username}
                            </span>
                            {enr.user.phone && (
                              <span className="text-slate-500 text-xs block truncate">
                                {enr.user.phone}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            disabled={updatingId === enr._id}
                            onClick={() => setKickModalEnr(enr)}
                            className="shrink-0 p-2 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50 transition-colors"
                            title="Исключить из кружка"
                          >
                            <UserMinus className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">
                      Пока нет участников.
                    </p>
                  )}
                </div>

                {/* По центру: только заявки, ожидающие решения */}
                <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-100 shadow-soft p-4 h-fit">
                  <h3 className="text-base font-semibold text-slate-900 mb-3">
                    Заявки
                  </h3>
                  {pendingEnrollments.length > 0 ? (
                    <ul className="space-y-2">
                      {pendingEnrollments.map((enr) => (
                        <li
                          key={enr._id}
                          className="flex flex-wrap items-center gap-2 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="text-slate-800 font-medium block truncate">
                              {enr.user.fullName || enr.user.username}
                            </span>
                            {enr.user.phone && (
                              <span className="text-slate-500 text-xs block truncate">
                                {enr.user.phone}
                              </span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={rejectReasons[enr._id] ?? ""}
                            onChange={(e) => setRejectReasons((prev) => ({ ...prev, [enr._id]: e.target.value }))}
                            placeholder="Причина отклонения (необязательно)"
                            className="flex-1 min-w-[120px] rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-sm placeholder:text-slate-400 focus:border-amber-400 focus:outline-none"
                          />
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              disabled={updatingId === enr._id}
                              onClick={() => changeStatus(enr._id, "approved")}
                              className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-50 transition-colors"
                              title="Принять"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={updatingId === enr._id}
                              onClick={() => changeStatus(enr._id, "rejected", rejectReasons[enr._id]?.trim() || undefined)}
                              className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                              title="Отклонить"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500 text-sm">
                      Нет заявок, ожидающих решения.
                    </p>
                  )}
                </div>

                {/* Справа: чат */}
                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 shadow-soft p-4 min-h-[420px]">
                  <CircleChat
                    circleId={selectedCircle._id}
                    circleTitle={selectedCircle.title}
                    canWrite={true}
                  />
                </div>
              </div>
            )}

            <KickModal
              open={!!kickModalEnr}
              onClose={() => setKickModalEnr(null)}
              title="Исключить из кружка"
              participantName={kickModalEnr ? (kickModalEnr.user.fullName || kickModalEnr.user.username) : undefined}
              confirmLabel="Подтвердить исключение"
              reasonPlaceholder="Причина исключения (необязательно)"
              onSubmit={handleKickConfirm}
              loading={kickModalEnr !== null && updatingId === kickModalEnr._id}
            />
          </div>
        )}
      </div>
    </div>
  );
}
